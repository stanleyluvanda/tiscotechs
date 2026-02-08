// aws/PostsHandler/index.mjs
// Node.js 20 — DynamoDB-backed posts API (uses GSI1 for feed query)
//
// ✅ Universal + scalable:
// - GET /api/posts supports pagination: ?scope=&limit=&cursor=&withThread=1|0
// - GET /api/posts default keeps compatibility (withThread=1) BUT now thread loading is fast
// - GET /api/posts/thread?postId=&limit=&cursor= for per-post thread loading (optional for UIs)
// - Comments/replies keep FULL author snapshot fields so names never disappear
// - Rejects base64 dataUrl attachments (prevents DynamoDB item size blowups)
//
// ✅ FIX (multi-program posts / disappearing replies):
// - Canonical threadId resolver (multiGroupId/threadId preferred)
// - Thread GET + comment/reply writes use canonical thread PK
// - Compatibility fallback for "post exists" check during transition
//
// ✅ NEW (moderation visibility):
// - Feed queries SKIP posts where moderationStatus is "hidden"/"removed" (or removedAt is set)
// - Thread endpoint returns 404 for hidden/removed posts

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.POSTS_TABLE; // required
const GSI_FEED = "gsi1"; // your GSI name

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

/* ---------------- CORS helper (keep your existing behavior) ---------------- */
function buildHeaders(origin) {
  const allowOrigins = new Set([
    "https://www.scholarsknowledge.com",
    "https://scholarsknowledge.com",
    "https://tiscotechs.com",
    "http://localhost:5176",
    "http://localhost:5173",
  ]);

  const ACAO = allowOrigins.has(origin) ? origin : "http://localhost:5176";

  return {
    "Access-Control-Allow-Origin": ACAO,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

/* ---------------- Utilities ---------------- */
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function hasBase64DataUrl(arr) {
  return (
    Array.isArray(arr) &&
    arr.some(
      (x) => x && typeof x.dataUrl === "string" && x.dataUrl.startsWith("data:")
    )
  );
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readJsonBody(event) {
  try {
    let bodyStr = event?.body || "{}";
    if (event?.isBase64Encoded)
      bodyStr = Buffer.from(bodyStr, "base64").toString("utf8");
    return JSON.parse(bodyStr || "{}");
  } catch {
    return null;
  }
}

function pad13(n) {
  const x = Number(n || 0);
  return String(isFinite(x) ? x : 0).padStart(13, "0");
}

function clampInt(v, def, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/**
 * Canonical thread id resolver.
 * Prefer: multiGroupId/threadId, fallback: postId/id.
 * Works for querystring objects and JSON payloads.
 */
function normalizeThreadId(obj) {
  const o = obj || {};
  return String(o.multiGroupId || o.threadId || o.postId || o.id || "").trim();
}

/* Cursor helpers: base64(json(lastEvaluatedKey)) */
function encodeCursor(lastKey) {
  if (!lastKey) return null;
  try {
    const s = JSON.stringify(lastKey);
    return Buffer.from(s, "utf8").toString("base64url");
  } catch {
    return null;
  }
}

function decodeCursor(cursor) {
  if (!cursor) return undefined;
  try {
    const s = Buffer.from(String(cursor), "base64url").toString("utf8");
    const obj = JSON.parse(s);
    return obj && typeof obj === "object" ? obj : undefined;
  } catch {
    return undefined;
  }
}

/* ---------------- Moderation visibility helper ----------------
   We treat these as "not visible in feeds/threads":
   - moderationStatus: "hidden" | "removed"
   - removedAt: any truthy value
--------------------------------------------------------------- */
function isHiddenOrRemovedPost(item) {
  const ms = String(item?.moderationStatus || "published").trim().toLowerCase();
  if (ms === "hidden" || ms === "removed") return true;
  if (item?.removedAt) return true;
  return false;
}

/* ---------------- Data model ----------------
POST (one item):
  pk = POST#{postId}
  sk = POST
  gsi1pk = FEED#{scope}
  gsi1sk = {createdAt padded}#{postId}

COMMENT items:
  pk = POST#{postId}
  sk = CMT#{createdAt padded}#{commentId}

REPLY items:
  pk = POST#{postId}
  sk = RPL#{commentId}#{createdAt padded}#{replyId}
------------------------------------------------ */
const pkPost = (postId) => `POST#${String(postId)}`;
const skPost = () => "POST";
const gsi1pk = (scope) => `FEED#${String(scope || "student-dashboard")}`;
const gsi1sk = (createdAt, postId) => `${pad13(createdAt)}#${String(postId)}`;

const skComment = (createdAt, commentId) =>
  `CMT#${pad13(createdAt)}#${String(commentId)}`;
const skReply = (commentId, createdAt, replyId) =>
  `RPL#${String(commentId)}#${pad13(createdAt)}#${String(replyId)}`;

/* ---------------- FAST thread loader (1 query per post) ----------------
   This replaces the old "query comments then query replies per comment".
   Now we query ALL items under pk in one go, then assemble.
----------------------------------------------------------------------- */
async function loadThreadFast(postId, { limit = 500, cursor } = {}) {
  const pk = pkPost(postId);

  const resp = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": "pk" },
      ExpressionAttributeValues: { ":pk": pk },
      ExclusiveStartKey: decodeCursor(cursor),
      Limit: clampInt(limit, 500, 1, 2000),
      ScanIndexForward: false, // newest items first overall (fine; we re-sort for nesting)
    })
  );

  const items = Array.isArray(resp.Items) ? resp.Items : [];

  const comments = [];
  const replies = [];

  for (const it of items) {
    const sk = String(it.sk || "");
    if (sk === "POST") continue;
    if (sk.startsWith("CMT#")) comments.push(it);
    else if (sk.startsWith("RPL#")) replies.push(it);
  }

  // Map replies by commentId
  const repliesByComment = new Map();
  for (const r of replies) {
    const commentId =
      String(r.commentId || "").trim() || String(r.sk || "").split("#")[1] || "";
    if (!commentId) continue;
    if (!repliesByComment.has(commentId)) repliesByComment.set(commentId, []);
    repliesByComment.get(commentId).push(r);
  }

  // Sort replies oldest->newest within each comment for stable UI
  for (const arr of repliesByComment.values()) {
    arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  // Build nested comment objects
  const out = comments
    .map((c) => {
      const commentId =
        String(c.commentId || c.id || "").trim() ||
        String(c.sk || "").split("#").slice(-1)[0] ||
        uid("c");

      const replyItems = repliesByComment.get(commentId) || [];

      return {
        id: commentId,
        postId: String(c.postId || postId),

        authorId: c.authorId || "",
        authorName: c.authorName || "",
        authorPhoto: c.authorPhoto || "",
        authorProgram: c.authorProgram || "",
        authorRole: c.authorRole || "",
        authorTitle: c.authorTitle || "",
        authorUniversity: c.authorUniversity || "",
        authorFaculty: c.authorFaculty || "",
        authorCountry: c.authorCountry || "",
        authorCountryCode: c.authorCountryCode || "",

        html: c.html || "",
        text: c.text || "",
        images: safeArr(c.images),
        files: safeArr(c.files),

        createdAt: c.createdAt || 0,
        updatedAt: c.updatedAt || 0,

        replies: replyItems.map((r) => ({
          id: r.replyId || r.id || uid("r"),
          postId: String(r.postId || postId),
          commentId,

          authorId: r.authorId || "",
          authorName: r.authorName || "",
          authorPhoto: r.authorPhoto || "",
          authorProgram: r.authorProgram || "",
          authorRole: r.authorRole || "",
          authorTitle: r.authorTitle || "",
          authorUniversity: r.authorUniversity || "",
          authorFaculty: r.authorFaculty || "",
          authorCountry: r.authorCountry || "",
          authorCountryCode: r.authorCountryCode || "",

          html: r.html || "",
          text: r.text || "",
          images: safeArr(r.images),
          files: safeArr(r.files),

          createdAt: r.createdAt || 0,
          updatedAt: r.updatedAt || 0,
        })),
      };
    })
    // newest comments first (matches your current UI)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return { comments: out, cursor: encodeCursor(resp.LastEvaluatedKey) };
}

/* ---------------- Delete post + all children (comments/replies) ---------------- */
async function deleteWholePost(postId) {
  const pk = pkPost(postId);

  let items = [];
  let lastKey = undefined;

  do {
    const resp = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: { ":pk": pk },
        ExclusiveStartKey: lastKey,
      })
    );

    items = items.concat(Array.isArray(resp.Items) ? resp.Items : []);
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);

  if (!items.length) return { deleted: false, count: 0 };

  let deletedCount = 0;
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const req = {
      RequestItems: {
        [TABLE]: batch.map((it) => ({
          DeleteRequest: { Key: { pk: it.pk, sk: it.sk } },
        })),
      },
    };
    await ddb.send(new BatchWriteCommand(req));
    deletedCount += batch.length;
  }

  return { deleted: true, count: deletedCount };
}

/**
 * Ensure there is a POST item.
 * For transition safety:
 * - first check canonical threadId
 * - if missing, check legacyPostId (payload.postId) if different
 */
async function ensurePostExists(threadId, legacyPostId) {
  if (!threadId) return null;

  let postResp = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { pk: pkPost(threadId), sk: skPost() },
    })
  );

  if (!postResp.Item && legacyPostId && legacyPostId !== threadId) {
    postResp = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { pk: pkPost(legacyPostId), sk: skPost() },
      })
    );
  }

  return postResp.Item || null;
}

/* ---------------- Main handler ---------------- */
export const handler = async (event) => {
  const origin =
    event?.headers?.origin ||
    event?.headers?.Origin ||
    event?.headers?.ORIGIN ||
    "http://localhost:5176";

  const headers = buildHeaders(origin);

  const rawPath = event.rawPath || event.path || "";
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";

  if (!TABLE) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: "Missing POSTS_TABLE" }),
    };
  }

  if (method === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const path = rawPath || "";

  const isCommentPath =
    path === "/api/posts/comment" || path.endsWith("/posts/comment");
  const isReplyPath =
    path === "/api/posts/reply" || path.endsWith("/posts/reply");
  const isThreadPath =
    path === "/api/posts/thread" || path.endsWith("/posts/thread");
  const isPostsPath = path === "/api/posts" || path.endsWith("/posts");

  /* ---------- GET /api/posts/thread?postId=... ---------- */
  if (isThreadPath && method === "GET") {
    try {
      const qs = event.queryStringParameters || {};

      // Canonical threadId (supports postId=..., threadId=..., multiGroupId=...)
      const threadId = normalizeThreadId(qs);
      if (!threadId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: "postId is required" }),
        };
      }

      // ✅ moderation gate for thread
      const postItem = await ensurePostExists(threadId, null);
      if (!postItem) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ ok: false, error: "Post not found" }),
        };
      }
      if (isHiddenOrRemovedPost(postItem)) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ ok: false, error: "Post not available" }),
        };
      }

      const limit = clampInt(qs.limit, 500, 1, 2000);
      const cursor = qs.cursor ? String(qs.cursor) : undefined;

      const res = await loadThreadFast(threadId, { limit, cursor });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          postId: threadId, // keep response field name for compatibility
          comments: res.comments,
          cursor: res.cursor,
        }),
      };
    } catch (err) {
      console.error("[PostsHandlerDDB] thread GET failed:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: "Failed to load thread" }),
      };
    }
  }

  /* ---------- POST /api/posts/comment ---------- */
  if (isCommentPath && method === "POST") {
    try {
      const payload = readJsonBody(event);
      if (!payload) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
        };
      }

      if (hasBase64DataUrl(payload.images) || hasBase64DataUrl(payload.files)) {
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "Attachments must be uploaded first (url required).",
          }),
        };
      }

      // Canonical thread id, but keep legacyPostId for existence-check fallback
      const legacyPostId = String(payload.postId || "").trim();
      const threadId = normalizeThreadId(payload);

      const text = String(payload.text || "").trim();
      const hasImages =
        Array.isArray(payload.images) && payload.images.length > 0;
      const hasFiles =
        Array.isArray(payload.files) && payload.files.length > 0;

      if (!threadId || (!text && !hasImages && !hasFiles)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "postId and (text or images/files) are required",
          }),
        };
      }

      // Ensure post exists (canonical first, then legacy as fallback)
      const postItem = await ensurePostExists(threadId, legacyPostId);
      if (!postItem) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ ok: false, error: "Post not found" }),
        };
      }
      // ✅ don't allow new comments on hidden/removed posts
      if (isHiddenOrRemovedPost(postItem)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ ok: false, error: "Post not available" }),
        };
      }

      const now = Date.now();
      const authorPhoto =
        payload.authorPhoto ||
        payload.authorAvatarUrl ||
        payload.avatarUrl ||
        payload.photoUrl ||
        payload.profileImageUrl ||
        "";

      const commentId = String(
        payload.id || payload.commentId || payload.clientId || uid("c")
      );

      const item = {
        pk: pkPost(threadId),
        sk: skComment(now, commentId),

        type: "comment",
        postId: threadId,
        commentId,

        authorId: payload.authorId || "",
        authorName: payload.authorName || "",
        authorPhoto,
        authorProgram: payload.authorProgram || "",
        authorRole: payload.authorRole || payload.role || "",
        authorTitle: payload.authorTitle || payload.title || "",

        authorUniversity: payload.authorUniversity || payload.university || "",
        authorFaculty: payload.authorFaculty || payload.faculty || "",
        authorCountry: payload.authorCountry || payload.country || "",
        authorCountryCode:
          payload.authorCountryCode || payload.countryCode || "",

        html: payload.html || "",
        text,
        images: safeArr(payload.images),
        files: safeArr(payload.files),

        createdAt: now,
        updatedAt: now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          ok: true,
          postId: threadId,
          comment: {
            id: commentId,
            postId: threadId,
            ...item,
            replies: [],
          },
        }),
      };
    } catch (err) {
      console.error("[PostsHandlerDDB] comment failed:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: "Failed to save comment" }),
      };
    }
  }

  /* ---------- POST /api/posts/reply ---------- */
  if (isReplyPath && method === "POST") {
    try {
      const payload = readJsonBody(event);
      if (!payload) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
        };
      }

      if (hasBase64DataUrl(payload.images) || hasBase64DataUrl(payload.files)) {
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "Attachments must be uploaded first (url required).",
          }),
        };
      }

      const legacyPostId = String(payload.postId || "").trim();
      const threadId = normalizeThreadId(payload);

      const commentId = String(payload.commentId || "").trim();
      const text = String(payload.text || "").trim();
      const hasImages =
        Array.isArray(payload.images) && payload.images.length > 0;
      const hasFiles =
        Array.isArray(payload.files) && payload.files.length > 0;

      if (!threadId || !commentId || (!text && !hasImages && !hasFiles)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "postId, commentId and (text or images/files) are required",
          }),
        };
      }

      // Ensure post exists (canonical first, then legacy as fallback)
      const postItem = await ensurePostExists(threadId, legacyPostId);
      if (!postItem) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ ok: false, error: "Post not found" }),
        };
      }
      // ✅ don't allow new replies on hidden/removed posts
      if (isHiddenOrRemovedPost(postItem)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ ok: false, error: "Post not available" }),
        };
      }

      const now = Date.now();
      const authorPhoto =
        payload.authorPhoto ||
        payload.authorAvatarUrl ||
        payload.avatarUrl ||
        payload.photoUrl ||
        payload.profileImageUrl ||
        "";

      const replyId = String(
        payload.id || payload.replyId || payload.clientId || uid("r")
      );

      const item = {
        pk: pkPost(threadId),
        sk: skReply(commentId, now, replyId),

        type: "reply",
        postId: threadId,
        commentId,
        replyId,

        authorId: payload.authorId || "",
        authorName: payload.authorName || "",
        authorPhoto,
        authorProgram: payload.authorProgram || "",
        authorRole: payload.authorRole || payload.role || "",
        authorTitle: payload.authorTitle || payload.title || "",

        authorUniversity: payload.authorUniversity || payload.university || "",
        authorFaculty: payload.authorFaculty || payload.faculty || "",
        authorCountry: payload.authorCountry || payload.country || "",
        authorCountryCode:
          payload.authorCountryCode || payload.countryCode || "",

        html: payload.html || "",
        text,
        images: safeArr(payload.images),
        files: safeArr(payload.files),

        createdAt: now,
        updatedAt: now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          ok: true,
          postId: threadId,
          commentId,
          reply: { id: replyId, postId: threadId, commentId, ...item },
        }),
      };
    } catch (err) {
      console.error("[PostsHandlerDDB] reply failed:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: "Failed to save reply" }),
      };
    }
  }

  /* ---------- /api/posts ---------- */
  if (isPostsPath) {
    const qs = event.queryStringParameters || {};
    const scope = qs.scope ? String(qs.scope) : null;

    /* ---------- GET /api/posts?scope=...&limit=&cursor=&withThread= ---------- */
    if (method === "GET") {
      try {
        const sc = scope || "student-dashboard";

        // Keep compatibility by default (withThread=1)
        const withThread =
          qs.withThread == null ? "1" : String(qs.withThread).trim();
        const wantThread =
          withThread === "1" || withThread.toLowerCase() === "true";

        // IMPORTANT: smaller default keeps UI snappy; still "unlimited" via cursor
        const limit = clampInt(qs.limit, 30, 1, 200);
        const cursor = qs.cursor ? String(qs.cursor) : undefined;

        // ✅ We may need to fetch more than one page to fill `limit`
        // after filtering out hidden/removed posts.
        const posts = [];
        let lastKey = decodeCursor(cursor);
        let safetyPages = 0;
        const MAX_PAGES = 6;

        while (posts.length < limit && safetyPages < MAX_PAGES) {
          safetyPages += 1;

          const resp = await ddb.send(
            new QueryCommand({
              TableName: TABLE,
              IndexName: GSI_FEED,
              KeyConditionExpression: "#gpk = :gpk",
              ExpressionAttributeNames: { "#gpk": "gsi1pk" },
              ExpressionAttributeValues: { ":gpk": gsi1pk(sc) },
              ScanIndexForward: false,
              // fetch a bit more to reduce extra round-trips when many are hidden
              Limit: Math.min(200, Math.max(30, limit * 2)),
              ExclusiveStartKey: lastKey,
            })
          );

          const pageItems = Array.isArray(resp.Items) ? resp.Items : [];

          for (const p of pageItems) {
            if (posts.length >= limit) break;

            // ✅ Skip hidden/removed posts universally
            if (isHiddenOrRemovedPost(p)) continue;

            const postId = String(p.postId || p.id || "").trim();
            const base = { ...p };
            delete base.pk;
            delete base.sk;

            base.id = base.id || postId;
            base.postId = postId;

            // ✅ FAST: 1 query per post (and only if requested)
            if (wantThread && postId) {
              const thr = await loadThreadFast(postId, { limit: 500 });
              base.comments = thr.comments;
            } else {
              // ✅ FORCE empty comments when withThread=0
              base.comments = [];
            }

            posts.push(base);
          }

          lastKey = resp.LastEvaluatedKey;

          // No more items
          if (!lastKey) break;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            scope: sc,
            posts,
            cursor: encodeCursor(lastKey),
          }),
        };
      } catch (err) {
        console.error("[PostsHandlerDDB] GET failed:", err);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ ok: false, error: "Failed to load posts" }),
        };
      }
    }

    /* ---------- POST /api/posts ---------- */
    if (method === "POST") {
      try {
        const payload = readJsonBody(event);
        if (!payload) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
          };
        }

        const hasText =
          typeof payload.text === "string" && payload.text.trim().length > 0;
        const hasAttachments =
          (Array.isArray(payload.attachments) && payload.attachments.length > 0) ||
          (Array.isArray(payload.images) && payload.images.length > 0) ||
          (Array.isArray(payload.files) && payload.files.length > 0);

        if (!hasText && !hasAttachments) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: "Either text or attachments are required",
            }),
          };
        }

        const now = Date.now();
        const createdAt = payload.createdAt || now;

        const postId = String(
          payload.id ||
            payload.postId ||
            `p_${now}_${Math.random().toString(36).slice(2, 10)}`
        );
        const sc = String(payload.scope || "student-dashboard");

        const photoUrl =
          payload.authorAvatarUrl ||
          payload.avatarUrl ||
          payload.photoUrl ||
          payload.profileImageUrl ||
          payload.profilePhotoUrl ||
          "";

        const attachments =
          Array.isArray(payload.attachments) && payload.attachments.length
            ? payload.attachments
            : Array.isArray(payload.images)
            ? payload.images
            : [];

        const textRaw =
          typeof payload.text === "string" && payload.text.trim().length
            ? String(payload.text)
            : typeof payload.description === "string"
            ? String(payload.description)
            : "";

        const item = {
          pk: pkPost(postId),
          sk: skPost(),

          gsi1pk: gsi1pk(sc),
          gsi1sk: gsi1sk(createdAt, postId),

          ...payload,

          id: postId,
          postId,

          scope: sc,
          role: payload.role || "student",
          type: payload.type || "Notes",

          authorAvatarUrl: photoUrl,
          avatarUrl: photoUrl,
          photoUrl,

          title: payload.title || "",
          text: textRaw,
          html: payload.html || payload.text || "",

          attachments,
          images: Array.isArray(payload.images) ? payload.images : attachments,
          files: Array.isArray(payload.files) ? payload.files : [],

          // ✅ default visible state (moderation can later change it)
          moderationStatus: payload.moderationStatus || "published",

          createdAt,
          updatedAt: now,
        };

        await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

        const out = { ...item };
        delete out.pk;
        delete out.sk;

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ ok: true, post: out }),
        };
      } catch (err) {
        console.error("[PostsHandlerDDB] POST failed:", err);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ ok: false, error: "Failed to save post" }),
        };
      }
    }

    /* ---------- DELETE /api/posts?id=... ---------- */
    if (method === "DELETE") {
      try {
        const qs = event.queryStringParameters || {};
        let id =
          (qs.id && String(qs.id)) || (qs.postId && String(qs.postId)) || "";

        if (!id && event.body) {
          const payload = readJsonBody(event);
          if (payload)
            id =
              (payload.id && String(payload.id)) ||
              (payload.postId && String(payload.postId)) ||
              "";
        }

        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ ok: false, error: "id or postId is required" }),
          };
        }

        const res = await deleteWholePost(id);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, id, ...res }),
        };
      } catch (err) {
        console.error("[PostsHandlerDDB] DELETE failed:", err);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ ok: false, error: "Failed to delete post" }),
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ ok: false, error: "Not found" }),
  };
};