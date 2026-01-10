// aws/PostsHandler/index.mjs
// Node.js 20 — DynamoDB-backed posts API (uses GSI1 for feed query)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
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
function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function readJsonBody(event) {
  try {
    let bodyStr = event?.body || "{}";
    if (event?.isBase64Encoded) bodyStr = Buffer.from(bodyStr, "base64").toString("utf8");
    return JSON.parse(bodyStr || "{}");
  } catch {
    return null;
  }
}
function pad13(n) {
  const x = Number(n || 0);
  return String(isFinite(x) ? x : 0).padStart(13, "0");
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

const skComment = (createdAt, commentId) => `CMT#${pad13(createdAt)}#${String(commentId)}`;
const skReply = (commentId, createdAt, replyId) =>
  `RPL#${String(commentId)}#${pad13(createdAt)}#${String(replyId)}`;

/* ---------------- Load comments + replies and nest them ---------------- */
async function loadThread(postId) {
  const pk = pkPost(postId);

  // Pull all comments
  const commentsResp = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :c)",
      ExpressionAttributeNames: { "#pk": "pk", "#sk": "sk" },
      ExpressionAttributeValues: { ":pk": pk, ":c": "CMT#" },
      ScanIndexForward: false, // newest comments first (matches typical UI)
      Limit: 500,
    })
  );

  const commentItems = Array.isArray(commentsResp.Items) ? commentsResp.Items : [];

  // For each comment, pull replies
  const out = [];
  for (const c of commentItems) {
    const commentId =
      String(c.commentId || c.id || "").trim() ||
      String(c.sk || "").split("#").slice(-1)[0] ||
      uid("c");

    const repliesResp = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :r)",
        ExpressionAttributeNames: { "#pk": "pk", "#sk": "sk" },
        ExpressionAttributeValues: { ":pk": pk, ":r": `RPL#${commentId}#` },
        ScanIndexForward: true,
        Limit: 500,
      })
    );

    const replyItems = Array.isArray(repliesResp.Items) ? repliesResp.Items : [];

    const comment = {
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
        // ✅ ADD THESE RIGHT HERE
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

    out.push(comment);
  }

  return out;
}

/* ---------------- Delete post + all children (comments/replies) ---------------- */
async function deleteWholePost(postId) {
  const pk = pkPost(postId);

  // Get all items under pk (POST + comments + replies)
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

  // Batch delete in chunks of 25
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
  const isCommentPath = path === "/api/posts/comment" || path.endsWith("/posts/comment");
  const isReplyPath = path === "/api/posts/reply" || path.endsWith("/posts/reply");
  const isPostsPath = path === "/api/posts" || path.endsWith("/posts");

  /* ---------- POST /api/posts/comment ---------- */
  if (isCommentPath && method === "POST") {
    try {
      const payload = readJsonBody(event);
      if (!payload) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
      }

      const postId = String(payload.postId || "").trim();
      const text = String(payload.text || "").trim();
      const hasImages = Array.isArray(payload.images) && payload.images.length > 0;
      const hasFiles = Array.isArray(payload.files) && payload.files.length > 0;

      if (!postId || (!text && !hasImages && !hasFiles)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: "postId and (text or images/files) are required" }),
        };
      }

      // Ensure post exists
      const postResp = await ddb.send(
        new GetCommand({ TableName: TABLE, Key: { pk: pkPost(postId), sk: skPost() } })
      );
      if (!postResp.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: "Post not found" }) };
      }

      const now = Date.now();
      const authorPhoto =
        payload.authorPhoto ||
        payload.authorAvatarUrl ||
        payload.avatarUrl ||
        payload.photoUrl ||
        payload.profileImageUrl ||
        "";

      const commentId = String(payload.id || payload.commentId || payload.clientId || uid("c"));

      const item = {
        pk: pkPost(postId),
        sk: skComment(now, commentId),

        type: "comment",
        postId,
        commentId,

        authorId: payload.authorId || "",
        authorName: payload.authorName || "",
        authorPhoto,
        authorProgram: payload.authorProgram || "",
        authorRole: payload.authorRole || payload.role || "",
        authorTitle: payload.authorTitle || payload.title || "",
         // ✅ ADD THESE (author meta)
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

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          ok: true,
          postId,
          comment: {
            id: commentId,
            postId,
            ...item,
            replies: [],
          },
        }),
      };
    } catch (err) {
      console.error("[PostsHandlerDDB] comment failed:", err);
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Failed to save comment" }) };
    }
  }

  /* ---------- POST /api/posts/reply ---------- */
  if (isReplyPath && method === "POST") {
    try {
      const payload = readJsonBody(event);
      if (!payload) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
      }

      const postId = String(payload.postId || "").trim();
      const commentId = String(payload.commentId || "").trim();
      const text = String(payload.text || "").trim();
      const hasImages = Array.isArray(payload.images) && payload.images.length > 0;
      const hasFiles = Array.isArray(payload.files) && payload.files.length > 0;

      if (!postId || !commentId || (!text && !hasImages && !hasFiles)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: "postId, commentId and (text or images/files) are required" }),
        };
      }

      // Ensure post exists
      const postResp = await ddb.send(
        new GetCommand({ TableName: TABLE, Key: { pk: pkPost(postId), sk: skPost() } })
      );
      if (!postResp.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: "Post not found" }) };
      }

      const now = Date.now();
      const authorPhoto =
        payload.authorPhoto ||
        payload.authorAvatarUrl ||
        payload.avatarUrl ||
        payload.photoUrl ||
        payload.profileImageUrl ||
        "";

      const replyId = String(payload.id || payload.replyId || payload.clientId || uid("r"));

      const item = {
        pk: pkPost(postId),
        sk: skReply(commentId, now, replyId),

        type: "reply",
        postId,
        commentId,
        replyId,

        authorId: payload.authorId || "",
        authorName: payload.authorName || "",
        authorPhoto,
        authorProgram: payload.authorProgram || "",
        authorRole: payload.authorRole || payload.role || "",
        authorTitle: payload.authorTitle || payload.title || "",
        // ✅ ADD THESE (author meta)
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

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          ok: true,
          postId,
          commentId,
          reply: { id: replyId, postId, commentId, ...item },
        }),
      };
    } catch (err) {
      console.error("[PostsHandlerDDB] reply failed:", err);
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Failed to save reply" }) };
    }
  }

  if (isPostsPath) {
    const scope =
      event.queryStringParameters && event.queryStringParameters.scope
        ? String(event.queryStringParameters.scope)
        : null;

    /* ---------- GET /api/posts?scope=... ---------- */
    if (method === "GET") {
      try {
        const sc = scope || "student-dashboard";

        // Query feed via GSI1 (newest first)
        const resp = await ddb.send(
          new QueryCommand({
            TableName: TABLE,
            IndexName: GSI_FEED,
            KeyConditionExpression: "#gpk = :gpk",
            ExpressionAttributeNames: { "#gpk": "gsi1pk" },
            ExpressionAttributeValues: { ":gpk": gsi1pk(sc) },
            ScanIndexForward: false,
            Limit: 200,
          })
        );

        const postMeta = Array.isArray(resp.Items) ? resp.Items : [];

        const posts = [];
        for (const p of postMeta) {
          const postId = String(p.postId || p.id || "").trim();
          const base = { ...p };
          delete base.pk;
          delete base.sk;

          base.id = base.id || postId;
          base.postId = postId;

          base.comments = postId ? await loadThread(postId) : [];

          posts.push(base);
        }

        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, scope: sc, posts }) };
      } catch (err) {
        console.error("[PostsHandlerDDB] GET failed:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Failed to load posts" }) };
      }
    }

    /* ---------- POST /api/posts ---------- */
    if (method === "POST") {
      try {
        const payload = readJsonBody(event);
        if (!payload) {
          return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
        }

        const hasText = typeof payload.text === "string" && payload.text.trim().length > 0;
        const hasAttachments =
          (Array.isArray(payload.attachments) && payload.attachments.length > 0) ||
          (Array.isArray(payload.images) && payload.images.length > 0) ||
          (Array.isArray(payload.files) && payload.files.length > 0);

        if (!hasText && !hasAttachments) {
          return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Either text or attachments are required" }) };
        }

        const now = Date.now();
        const createdAt = payload.createdAt || now;

        const postId = String(payload.id || payload.postId || `p_${now}_${Math.random().toString(36).slice(2, 8)}`);
        const scope = String(payload.scope || "student-dashboard");

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
          // Primary key
          pk: pkPost(postId),
          sk: skPost(),

          // GSI1 keys (feed)
          gsi1pk: gsi1pk(scope),
          gsi1sk: gsi1sk(createdAt, postId),

          // Your existing fields (kept broad to be drop-in)
          ...payload,

          id: postId,
          postId,

          scope,
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

          createdAt,
          updatedAt: now,
        };

        await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

        // return post as client expects (comments assembled on GET)
        const out = { ...item };
        delete out.pk;
        delete out.sk;

        return { statusCode: 201, headers, body: JSON.stringify({ ok: true, post: out }) };
      } catch (err) {
        console.error("[PostsHandlerDDB] POST failed:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Failed to save post" }) };
      }
    }

    /* ---------- DELETE /api/posts?id=... ---------- */
    if (method === "DELETE") {
      try {
        const qs = event.queryStringParameters || {};
        let id = (qs.id && String(qs.id)) || (qs.postId && String(qs.postId)) || "";

        if (!id && event.body) {
          const payload = readJsonBody(event);
          if (payload) id = (payload.id && String(payload.id)) || (payload.postId && String(payload.postId)) || "";
        }

        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "id or postId is required" }) };
        }

        const res = await deleteWholePost(id);

        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id, ...res }) };
      } catch (err) {
        console.error("[PostsHandlerDDB] DELETE failed:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Failed to delete post" }) };
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: "Not found" }) };
};
