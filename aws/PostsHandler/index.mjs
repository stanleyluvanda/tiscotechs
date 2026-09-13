// aws/PostsHandler/index.mjs
// Node.js 24 — DynamoDB-backed posts API (uses GSI1 for feed query)
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
  UpdateCommand,
  DeleteCommand,
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

/* ---------------- Notifications data model ----------------
NOTIF item:
  pk = NOTIF#{recipientUserId}
  sk = TS#{createdAt padded}#{notifId}
---------------------------------------------------------- */
const pkNotif = (recipientUserId) => `NOTIF#${String(recipientUserId)}`;
const skNotif = (createdAt, notifId) =>
  `TS#${pad13(createdAt)}#${String(notifId)}`;

/* ---------------- Notifications meta (per-user) ----------------
META item:
  pk = NOTIFMETA#{userId}
  sk = META
  clearedReadAt = number (ms)
--------------------------------------------------------------- */
const pkNotifMeta = (userId) => `NOTIFMETA#${String(userId)}`;
const skNotifMeta = () => "META";

/* ---------------- Saved posts data model ----------------
SAVED item:
  pk = SAVED#<userId>
  sk = POST#<postId>
---------------------------------------------------------- */
const pkSaved = (userId) => `SAVED#${String(userId)}`;
const skSavedPost = (postId) => `POST#${String(postId)}`;



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

  /* ---------- Saved posts routes ---------- */
const isPostSavePath =
path === "/api/posts/save" || path.endsWith("/posts/save");

const isPostSavedPath =
path === "/api/posts/saved" || path.endsWith("/posts/saved");

  const isCommentPath =
    path === "/api/posts/comment" || path.endsWith("/posts/comment");
  const isReplyPath =
    path === "/api/posts/reply" || path.endsWith("/posts/reply");
  const isThreadPath =
    path === "/api/posts/thread" || path.endsWith("/posts/thread");
  const isPostsPath = path === "/api/posts" || path.endsWith("/posts");

  const isNotifMinePath =
    path === "/api/notifications/mine" || path.endsWith("/notifications/mine");
  const isNotifMarkReadPath =
    path === "/api/notifications/markRead" ||
    path.endsWith("/notifications/markRead");
  const isNotifClearReadPath =
    path === "/api/notifications/clearRead" ||
    path.endsWith("/notifications/clearRead");

  /* ---------- GET /api/posts/thread?postId=... ---------- */
  if (isThreadPath && method === "GET") {
    try {
      const qs = event.queryStringParameters || {};

      const threadId = normalizeThreadId(qs);
      if (!threadId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: "postId is required" }),
        };
      }

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
          postId: threadId,
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

      const postItem = await ensurePostExists(threadId, legacyPostId);
      if (!postItem) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ ok: false, error: "Post not found" }),
        };
      }
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

      // ✅ FIX: generate commentId BEFORE notification
      const commentId = String(
        payload.id || payload.commentId || payload.clientId || uid("c")
      );

      // ✅ FIX: notification now stores actorAvatarUrl + real commentId
      try {
        const recipientUserId = String(
          postItem.authorId || postItem.authorUserId || ""
        ).trim();
        const actorId = String(payload.authorId || "").trim();

        if (recipientUserId && actorId && recipientUserId !== actorId) {
          const nowNotif = Date.now();
          const notifId = uid("n");

          const notifItem = {
            pk: pkNotif(recipientUserId),
            sk: skNotif(nowNotif, notifId),

            id: notifId,
            recipientUserId,

            actorId,
            actorName: payload.authorName || "",
            actorAvatarUrl: authorPhoto,

            postId: threadId,
            commentId: commentId,
            replyId: "",

            type: "comment",
            createdAt: nowNotif,
            read: false,
          };

          await ddb.send(new PutCommand({ TableName: TABLE, Item: notifItem }));
        }
      } catch (e) {
        console.error("[PostsHandlerDDB] notif(comment) failed:", e);
      }

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
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: pkPost(threadId), sk: skPost() },
          UpdateExpression:
            "SET updatedAt = :now ADD commentCount :one, threadItemCount :one",
          ExpressionAttributeValues: {
            ":one": 1,
            ":now": now,
          },
        })
      );

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

  /* ---------- GET /api/notifications/mine?userId=&limit=&cursor= ---------- */
  if (isNotifMinePath && method === "GET") {
    try {
      const qs = event.queryStringParameters || {};
      const userId = String(qs.userId || "").trim();

      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: "userId is required" }),
        };
      }

      // ✅ ADD THIS RIGHT HERE (after userId validation)
    let clearedReadAt = 0;
    try {
      const metaResp = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { pk: pkNotifMeta(userId), sk: skNotifMeta() },
        })
      );
      clearedReadAt = Number(metaResp?.Item?.clearedReadAt || 0);
      if (!Number.isFinite(clearedReadAt)) clearedReadAt = 0;
    } catch (e) {
      console.error("[PostsHandlerDDB] notif meta GET failed:", e);
    }

      const limit = clampInt(qs.limit, 30, 1, 50);
      const cursor = qs.cursor ? String(qs.cursor) : undefined;

      const resp = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "#pk = :pk",
          ExpressionAttributeNames: { "#pk": "pk" },
          ExpressionAttributeValues: { ":pk": pkNotif(userId) },
          ScanIndexForward: false,
          Limit: limit,
          ExclusiveStartKey: decodeCursor(cursor),
        })
      );

      const items = Array.isArray(resp.Items) ? resp.Items : [];

      const notifications = items.map((n) => {
        const out = { ...n };
        delete out.pk;
        delete out.sk;
        return out;
      });


      // ✅ ADD THIS FILTER RIGHT HERE (BEFORE return)
    const filtered = notifications.filter((n) => {
      // Hide only READ notifications that were created at/before the cutoff
      if (clearedReadAt > 0 && n?.read === true) {
        const t = Number(n?.createdAt || 0);
        if (Number.isFinite(t) && t > 0 && t <= clearedReadAt) return false;
      }
      return true;
    });


      /*return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          notifications,
          cursor: encodeCursor(resp.LastEvaluatedKey),
        }),
      };
    } catch (err) {
      console.error("[PostsHandlerDDB] notifications mine failed:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: "Failed to load notifications" }),
      };
    }
  }*/


  // ✅ Then return filtered (NOT notifications)
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      notifications: filtered,
      cursor: encodeCursor(resp.LastEvaluatedKey),
    }),
  };
} catch (err) {
  console.error("[PostsHandlerDDB] notifications mine failed:", err);
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ ok: false, error: "Failed to load notifications" }),
  };
}
}

  /* ---------- POST /api/notifications/markRead ---------- */
  if (isNotifMarkReadPath && method === "POST") {
    try {
      const payload = readJsonBody(event);
      if (!payload) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
        };
      }

      const userId = String(payload.userId || "").trim();
      const id = String(payload.id || "").trim();
      const createdAt = Number(payload.createdAt || 0);

      if (!userId || !id || !Number.isFinite(createdAt) || createdAt <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "userId, id, createdAt are required",
          }),
        };
      }

      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: pkNotif(userId), sk: skNotif(createdAt, id) },
          UpdateExpression: "SET #read = :t, readAt = :now",
          ExpressionAttributeNames: { "#read": "read" },
          ExpressionAttributeValues: { ":t": true, ":now": Date.now() },
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      };
    } catch (err) {
      console.error("[PostsHandlerDDB] notifications markRead failed:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: "Failed to mark read" }),
      };
    }
  }

  /* ---------- POST /api/notifications/clearRead ---------- */
if (isNotifClearReadPath && method === "POST") {
  try {
    const payload = readJsonBody(event);
    if (!payload) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
      };
    }

    const userId = String(payload.userId || "").trim();
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "userId is required" }),
      };
    }

    const now = Date.now();

    // Upsert per-user cutoff
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: pkNotifMeta(userId), sk: skNotifMeta() },
        UpdateExpression: "SET clearedReadAt = :t, updatedAt = :now",
        ExpressionAttributeValues: { ":t": now, ":now": now },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, clearedReadAt: now }),
    };
  } catch (err) {
    console.error("[PostsHandlerDDB] notifications clearRead failed:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: "Failed to clear read notifications" }),
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

      const postItem = await ensurePostExists(threadId, legacyPostId);
      if (!postItem) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ ok: false, error: "Post not found" }),
        };
      }
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

      // ✅ FIX: generate replyId BEFORE notification
      const replyId = String(
        payload.id || payload.replyId || payload.clientId || uid("r")
      );

      // ✅ FIX: notification now stores actorAvatarUrl + real replyId
      try {
        const recipientUserId = String(
          postItem.authorId || postItem.authorUserId || ""
        ).trim();
        const actorId = String(payload.authorId || "").trim();

        if (recipientUserId && actorId && recipientUserId !== actorId) {
          const nowNotif = Date.now();
          const notifId = uid("n");

          const notifItem = {
            pk: pkNotif(recipientUserId),
            sk: skNotif(nowNotif, notifId),

            id: notifId,
            recipientUserId,

            actorId,
            actorName: payload.authorName || "",
            actorAvatarUrl: authorPhoto,

            postId: threadId,
            commentId: commentId,
            replyId: replyId,

            type: "reply",
            createdAt: nowNotif,
            read: false,
          };

          await ddb.send(new PutCommand({ TableName: TABLE, Item: notifItem }));
          
        }
      } catch (e) {
        console.error("[PostsHandlerDDB] notif(reply) failed:", e);
      }

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
        authorCountryCode: payload.authorCountryCode || payload.countryCode || "",

        html: payload.html || "",
        text,
        images: safeArr(payload.images),
        files: safeArr(payload.files),

        createdAt: now,
        updatedAt: now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: pkPost(threadId), sk: skPost() },
          UpdateExpression:
            "SET updatedAt = :now ADD replyCount :one, threadItemCount :one",
          ExpressionAttributeValues: {
            ":one": 1,
            ":now": now,
          },
        })
      );

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







  /* ---------- POST/DELETE /api/posts/save ---------- */
if (isPostSavePath && (method === "POST" || method === "DELETE")) {
  try {
    const payload = readJsonBody(event);
    if (!payload) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
      };
    }

    const userId = String(payload.userId || "").trim();
    const postId = String(payload.postId || payload.id || "").trim();
    const scope = String(payload.scope || "student-dashboard").trim();

    if (!userId || !postId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "userId and postId are required" }),
      };
    }

    if (method === "POST") {
      const now = Date.now();

      await ddb.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            pk: pkSaved(userId),
            sk: skSavedPost(postId),
            type: "saved_post",
            userId,
            postId,
            scope,
            createdAt: now,
            updatedAt: now,
          },
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, saved: true, userId, postId, scope }),
      };
    }

    await ddb.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: {
          pk: pkSaved(userId),
          sk: skSavedPost(postId),
        },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, saved: false, userId, postId, scope }),
    };
  } catch (err) {
    console.error("[PostsHandlerDDB] save/unsave post failed:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: "Failed to update saved post" }),
    };
  }
}

/* ---------- GET /api/posts/saved?userId=&scope= ---------- */
if (isPostSavedPath && method === "GET") {
  try {
    const qs = event.queryStringParameters || {};
    const userId = String(qs.userId || "").trim();
    const scope = String(qs.scope || "").trim();

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "userId is required" }),
      };
    }

    const resp = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: { ":pk": pkSaved(userId) },
        ScanIndexForward: false,
      })
    );

    const items = Array.isArray(resp.Items) ? resp.Items : [];

    const saved = items
      .filter((x) => !scope || String(x.scope || "") === scope)
      .map((x) => ({
        postId: x.postId,
        scope: x.scope || "",
        createdAt: x.createdAt || 0,
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        userId,
        saved,
        savedPostIds: saved.map((x) => x.postId),
      }),
    };
  } catch (err) {
    console.error("[PostsHandlerDDB] saved posts GET failed:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: "Failed to load saved posts" }),
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

// Optional feed view.
// Existing callers that omit "view" keep the current behavior.
const view = String(qs.view || "").trim().toLowerCase();
const isRecentView = view === "recent";
const isOlderView = view === "older";

// The GSI sort key begins with the padded createdAt timestamp.
// Calculate this once per request, not once per DynamoDB page.
const recentCutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
const recentCutoffKey = `${pad13(recentCutoffMs)}#`;


const isDateFilteredView = isRecentView || isOlderView;

const keyConditionExpression = isRecentView
  ? "#gpk = :gpk AND #gsk >= :cutoff"
  : isOlderView
  ? "#gpk = :gpk AND #gsk < :cutoff"
  : "#gpk = :gpk";

const expressionAttributeNames = isDateFilteredView
  ? { "#gpk": "gsi1pk", "#gsk": "gsi1sk" }
  : { "#gpk": "gsi1pk" };

const expressionAttributeValues = isDateFilteredView
  ? {
      ":gpk": gsi1pk(sc),
      ":cutoff": recentCutoffKey,
    }
  : {
      ":gpk": gsi1pk(sc),
    };

const withThread =
  qs.withThread == null ? "1" : String(qs.withThread).trim();


        const wantThread =
          withThread === "1" || withThread.toLowerCase() === "true";

        const limit = clampInt(qs.limit, 30, 1, 200);
        const cursor = qs.cursor ? String(qs.cursor) : undefined;

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
              KeyConditionExpression: keyConditionExpression,
              ExpressionAttributeNames: expressionAttributeNames,
               ExpressionAttributeValues: expressionAttributeValues,
              ScanIndexForward: false,
              /*Limit: Math.min(200, Math.max(30, limit * 2)),*/
              Limit: limit,
              ExclusiveStartKey: lastKey,
            })
          );

          const pageItems = Array.isArray(resp.Items) ? resp.Items : [];

          for (const p of pageItems) {
            if (posts.length >= limit) break;

            if (isHiddenOrRemovedPost(p)) continue;

            const postId = String(p.postId || p.id || "").trim();
            const base = { ...p };
            delete base.pk;
            delete base.sk;

            base.id = base.id || postId;
            base.postId = postId;

            
            if (wantThread && postId) {
              const thr = await loadThreadFast(postId, { limit: 500 });
              base.comments = thr.comments;
            } else {
              base.comments = [];
            }

            posts.push(base);
          }

          lastKey = resp.LastEvaluatedKey;
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