// aws/ContactsHandler/index.mjs
// Node.js 20 — DynamoDB-backed contacts API
// ✅ Conversations + messages in DynamoDB
// ✅ Attachments still stored in S3 (same behavior)
// ✅ Lecturers directory stays in S3 (same routes)

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";

// DynamoDB
const TABLE = process.env.CONTACTS_TABLE; // ✅ required

// S3 for attachments + lecturers directory (keep your current envs)
const BUCKET = process.env.CONTACTS_BUCKET || process.env.POSTS_BUCKET;
const ATT_PREFIX = process.env.CONTACTS_ATTACH_PREFIX || "contacts/attachments/";
const USERS_KEY = process.env.CONTACTS_USERS_KEY || "users/lecturers.json";

const s3 = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify(body),
  };
}

async function streamToString(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

/* ===================== Lecturers Directory (S3) - unchanged ===================== */
async function readLecturersFile() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: USERS_KEY }));
    const parsed = JSON.parse(await streamToString(res.Body));
    const lecturers = Array.isArray(parsed?.lecturers) ? parsed.lecturers : [];
    return { version: parsed?.version || 1, updatedAt: parsed?.updatedAt || 0, lecturers };
  } catch {
    return { version: 1, updatedAt: 0, lecturers: [] };
  }
}

async function writeLecturersFile(data) {
  const payload = {
    version: 1,
    updatedAt: Date.now(),
    lecturers: Array.isArray(data?.lecturers) ? data.lecturers : [],
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: USERS_KEY,
      Body: JSON.stringify(payload),
      ContentType: "application/json",
      CacheControl: "no-store",
    })
  );

  return payload;
}

function norm(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickOrg(u) {
  return u?.faculty || u?.school || u?.college || u?.department || "";
}

function stableUserKey(u) {
  return String(u?.id || u?.uid || "").trim() || String(u?.email || "").trim().toLowerCase() || "";
}

/* ===================== Contacts DynamoDB key patterns ===================== */
/**
 * Conversation META item:
 *   pk = CONV#{convId}
 *   sk = META
 *   gsi1pk = USER#{studentId}  (and also a second META copy for lecturer)
 *   gsi1sk = LAST#{lastUpdated}#CONV#{convId}
 *
 * We store TWO META items for indexing:
 *   1) META#STUDENT (for student inbox)
 *   2) META#LECTURER (for lecturer inbox)
 *
 * Pair index for "latest thread":
 *   gsi2pk = PAIR#{studentId}__{lecturerId}
 *   gsi2sk = LAST#{lastUpdated}#CONV#{convId}
 *
 * Messages:
 *   pk = CONV#{convId}
 *   sk = MSG#{createdAt}#{msgId}
 */

function convId(studentId, lecturerId, threadId) {
  return threadId ? `contact:${studentId}__${lecturerId}__${threadId}` : `contact:${studentId}__${lecturerId}`;
}
function pairKey(studentId, lecturerId) {
  return `PAIR#${String(studentId)}__${String(lecturerId)}`;
}
function pkConv(id) {
  return `CONV#${id}`;
}
function skMetaStudent() {
  return "META#STUDENT";
}
function skMetaLecturer() {
  return "META#LECTURER";
}
function skMsg(createdAt, msgId) {
  return `MSG#${Number(createdAt || 0)}#${String(msgId)}`;
}
function now() {
  return Date.now();
}

function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "";
}
function getPath(event) {
  return String(event?.rawPath || event?.requestContext?.http?.path || event?.path || "");
}
function parseBody(event) {
  try {
    if (!event?.body) return {};
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function parseDataUrl(dataUrl, fallback = "application/octet-stream") {
  const m = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  if (!m) return null;
  return { mime: m[1] || fallback, b64: m[2] };
}

function s3UrlEncoded(key) {
  const encoded = String(key)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encoded}`;
}

async function loadMessages(convIdValue) {
  let items = [];
  let lastKey = undefined;

  do {
    const resp = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :pref)",
        ExpressionAttributeNames: { "#pk": "pk", "#sk": "sk" },
        ExpressionAttributeValues: { ":pk": pkConv(convIdValue), ":pref": "MSG#" },
        ExclusiveStartKey: lastKey,
        ScanIndexForward: true,
      })
    );

    items = items.concat(Array.isArray(resp.Items) ? resp.Items : []);
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);

  return items.map((m) => ({
    id: m.msgId || m.id || "",
    authorRole: String(m.authorRole || ""),
    text: String(m.text || ""),
    createdAt: m.createdAt || 0,
    images: Array.isArray(m.images) ? m.images : [],
    files: Array.isArray(m.files) ? m.files : [],
  }));
}

async function loadConversation(studentId, lecturerId, threadId) {
  const id = convId(studentId, lecturerId, threadId || "");
  const pk = pkConv(id);

  // read student meta (either one works, but we choose student)
  const metaResp = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { pk, sk: skMetaStudent() },
    })
  );

  if (!metaResp.Item) return null;

  const meta = metaResp.Item;
  const messages = await loadMessages(id);

  return {
    id: meta.convId,
    threadId: meta.threadId || "",
    studentId: meta.studentId,
    lecturerId: meta.lecturerId,
    title: meta.title || "",
    messages,
    lastUpdated: meta.lastUpdated || 0,
    lastRead: meta.lastRead || { studentId: 0, lecturerId: 0 },

    // snapshots
    studentName: meta.studentName || "",
    studentProgram: meta.studentProgram || "",
    studentPhotoUrl: meta.studentPhotoUrl || "",
    studentProfile: meta.studentProfile || null,
  };
}

async function pickLatestThread(studentId, lecturerId) {
  // Query GSI2 (pair index), newest first
  const resp = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "gsi2",
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": "gsi2pk" },
      ExpressionAttributeValues: { ":pk": pairKey(studentId, lecturerId) },
      ScanIndexForward: false,
      Limit: 1,
    })
  );

  const top = (resp.Items || [])[0];
  if (!top) return null;

  return loadConversation(studentId, lecturerId, top.threadId || "");
}

async function upsertMetaCopies(meta) {
  // Write two META items so threads list is fast for both parties
  const base = {
    pk: pkConv(meta.convId),
    convId: meta.convId,
    studentId: meta.studentId,
    lecturerId: meta.lecturerId,
    threadId: meta.threadId || "",
    title: meta.title || "",
    lastUpdated: meta.lastUpdated || 0,
    lastRead: meta.lastRead || { studentId: 0, lecturerId: 0 },

    studentName: meta.studentName || "",
    studentProgram: meta.studentProgram || "",
    studentPhotoUrl: meta.studentPhotoUrl || "",
    studentProfile: meta.studentProfile || null,

    // pair index
    gsi2pk: pairKey(meta.studentId, meta.lecturerId),
    gsi2sk: `LAST#${meta.lastUpdated || 0}#CONV#${meta.convId}`,
  };

  // student meta
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...base,
        sk: skMetaStudent(),
        gsi1pk: `USER#${meta.studentId}`,
        gsi1sk: `LAST#${meta.lastUpdated || 0}#CONV#${meta.convId}`,
      },
    })
  );

  // lecturer meta
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...base,
        sk: skMetaLecturer(),
        gsi1pk: `USER#${meta.lecturerId}`,
        gsi1sk: `LAST#${meta.lastUpdated || 0}#CONV#${meta.convId}`,
      },
    })
  );
}

export async function handler(event) {
  const method = String(getMethod(event) || "").toUpperCase();
  const path = String(getPath(event) || "").toLowerCase();
  const qs = event?.queryStringParameters || {};

  if (!TABLE) return json(500, { ok: false, error: "Missing CONTACTS_TABLE" });
  if (!BUCKET) return json(500, { ok: false, error: "Missing CONTACTS_BUCKET/POSTS_BUCKET for attachments" });

  if (method === "OPTIONS") return json(200, { ok: true });

  try {
    /* ===== Health ===== */
    if (path.endsWith("/api/contacts") && method === "GET") return json(200, { ok: true });

    /* ===================== Lecturers Directory Routes (unchanged) ===================== */

    // GET /api/users/lecturers?university=...&org=...
    if (path.endsWith("/api/users/lecturers") && method === "GET") {
      const uniQ = qs.university ? String(qs.university).trim() : "";
      const orgQ = qs.org ? String(qs.org).trim() : "";

      const store = await readLecturersFile();
      let list = store.lecturers || [];

      list = list.filter((u) => norm(u?.role) === "lecturer" || norm(u?.role).includes("lecturer"));

      const uniKey = norm(uniQ);
      const orgKey = norm(orgQ);

      if (uniKey) {
        list = list.filter((u) => norm(u?.university).includes(uniKey) || uniKey.includes(norm(u?.university)));
      }
      if (orgKey) {
        list = list.filter((u) => {
          const org = norm(pickOrg(u));
          return org.includes(orgKey) || orgKey.includes(org);
        });
      }

      list.sort(
        (a, b) =>
          String(a?.title || "").localeCompare(String(b?.title || "")) ||
          String(a?.name || "").localeCompare(String(b?.name || ""))
      );

      return json(200, { ok: true, updatedAt: store.updatedAt || 0, lecturers: list });
    }

    // POST /api/users/lecturers/upsert
    if (path.endsWith("/api/users/lecturers/upsert") && method === "POST") {
      const body = parseBody(event) || {};
      const lecturer = body.lecturer || body;

      const role = norm(lecturer?.role);
      if (!role || !role.includes("lecturer")) return json(400, { ok: false, error: "lecturer.role must include 'lecturer'" });

      const key = stableUserKey(lecturer);
      if (!key) return json(400, { ok: false, error: "lecturer must include id/uid or email" });

      const store = await readLecturersFile();
      const list = Array.isArray(store.lecturers) ? store.lecturers.slice() : [];

      const idx = list.findIndex((u) => stableUserKey(u) === key);
      const cleaned = { ...lecturer, role: "lecturer", name: lecturer?.name || lecturer?.fullName || lecturer?.displayName || "" };

      if (idx >= 0) list[idx] = { ...list[idx], ...cleaned };
      else list.unshift(cleaned);

      const saved = await writeLecturersFile({ lecturers: list });
      return json(200, { ok: true, updatedAt: saved.updatedAt, count: saved.lecturers.length });
    }

    /* ===================== Contacts API (DynamoDB) ===================== */

    // GET /api/contacts/threads?studentId=... OR ?lecturerId=...
    if (path.endsWith("/api/contacts/threads") && method === "GET") {
      const studentId = qs.studentId ? String(qs.studentId).trim() : "";
      const lecturerId = qs.lecturerId ? String(qs.lecturerId).trim() : "";

      if (!studentId && !lecturerId) return json(400, { ok: false, error: "studentId or lecturerId required" });

      const userId = studentId || lecturerId;

      const resp = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: "gsi1",
          KeyConditionExpression: "#pk = :pk",
          ExpressionAttributeNames: { "#pk": "gsi1pk" },
          ExpressionAttributeValues: { ":pk": `USER#${userId}` },
          ScanIndexForward: false,
          Limit: 50,
        })
      );

      const metas = Array.isArray(resp.Items) ? resp.Items : [];

      // Return threads array similar to old (include snapshots)
      const threads = metas.map((m) => ({
        id: m.convId,
        threadId: m.threadId || "",
        studentId: m.studentId,
        lecturerId: m.lecturerId,
        title: m.title || "",
        messages: [], // old S3 stored messages here; we keep empty for list (lighter)
        lastUpdated: m.lastUpdated || 0,
        lastRead: m.lastRead || { studentId: 0, lecturerId: 0 },

        studentName: m.studentName || "",
        studentProgram: m.studentProgram || "",
        studentPhotoUrl: m.studentPhotoUrl || "",
        studentProfile: m.studentProfile || null,
      }));

      return json(200, { ok: true, threads });
    }

    // GET /api/contacts/conversation?studentId=...&lecturerId=...&threadId=...
    if (path.endsWith("/api/contacts/conversation") && method === "GET") {
      const studentId = qs.studentId ? String(qs.studentId).trim() : "";
      const lecturerId = qs.lecturerId ? String(qs.lecturerId).trim() : "";
      const threadId = qs.threadId ? String(qs.threadId).trim() : "";

      if (!studentId || !lecturerId) return json(400, { ok: false, error: "studentId and lecturerId required" });

      // If no threadId provided, open latest for that pair (backward compatible)
      if (!threadId) {
        const latest = await pickLatestThread(studentId, lecturerId);
        if (latest) return json(200, { ok: true, conversation: latest });

        // If none exists yet, create a brand new base conversation (no threadId)
        const id = convId(studentId, lecturerId, "");
        const meta = {
          convId: id,
          studentId,
          lecturerId,
          threadId: "",
          title: "",
          lastUpdated: 0,
          lastRead: { studentId: 0, lecturerId: 0 },
        };
        await upsertMetaCopies(meta);
        const conv = await loadConversation(studentId, lecturerId, "");
        return json(200, { ok: true, conversation: conv });
      }

      // Thread specified: must exist or be created
      const existing = await loadConversation(studentId, lecturerId, threadId);
      if (existing) return json(200, { ok: true, conversation: existing });

      const id = convId(studentId, lecturerId, threadId);
      const meta = {
        convId: id,
        studentId,
        lecturerId,
        threadId,
        title: "",
        lastUpdated: 0,
        lastRead: { studentId: 0, lecturerId: 0 },
      };
      await upsertMetaCopies(meta);

      const conv = await loadConversation(studentId, lecturerId, threadId);
      return json(200, { ok: true, conversation: conv });
    }

    // POST /api/contacts/message
    if (path.endsWith("/api/contacts/message") && method === "POST") {
      const body = parseBody(event) || {};

      const {
        studentId,
        lecturerId,
        threadId,
        authorRole,
        text,
        title,

        studentName,
        studentProgram,
        studentPhotoUrl,
        studentProfile,

        images = [],
        files = [],
        attachments = [],
        atts = [],
      } = body;

      if (!studentId || !lecturerId) return json(400, { ok: false, error: "studentId and lecturerId required" });

      const convKey = convId(studentId, lecturerId, threadId || "");
      const createdAt = now();
      const msgId = `cm_${createdAt}_${Math.random().toString(36).slice(2, 8)}`;

      // Enforce: lecturer cannot initiate first message
      // (If convo has no messages and authorRole is lecturer => reject)
      const currentConv = await loadConversation(studentId, lecturerId, threadId || "");
      const existingCount = currentConv ? (currentConv.messages || []).length : 0;
      if (existingCount === 0 && String(authorRole || "").toLowerCase().includes("lecturer")) {
        return json(400, { ok: false, error: "Lecturer cannot initiate the first message." });
      }

      // Fill snapshots (same logic you had)
      const thenNonEmpty = (v) => String(v || "").trim().length > 0;

      const snapName = String(studentName || studentProfile?.name || "").trim();
      const snapProgram = String(studentProgram || studentProfile?.program || "").trim();
      const snapPhoto = String(studentPhotoUrl || studentProfile?.photoUrl || studentProfile?.photo || studentProfile?.photoURL || "").trim();

      // Normalize incoming attachment lists
      const normalizeList = (arr) =>
        (Array.isArray(arr) ? arr : [])
          .map((x) => {
            if (!x) return null;
            const dataUrl = x.dataUrl || x.dataURL || x.dataURI || "";
            const url = x.url || x.href || x.link || "";
            const name = x.name || x.filename || "";
            const mime = x.mime || x.type || "";
            const thumb = x.thumb || x.thumbnail || "";
            const id = x.id || "";
            return { id, name, mime, url, dataUrl, thumb };
          })
          .filter(Boolean);

      const incomingImages = normalizeList(images);
      const incomingFiles = normalizeList(files);

      const mixed = normalizeList(attachments).concat(normalizeList(atts));
      for (const a of mixed) {
        const m = String(a.mime || "").toLowerCase();
        if (m.startsWith("image/")) incomingImages.push(a);
        else incomingFiles.push(a);
      }

      // Upload attachments to S3 (same behavior)
      const upload = async (list, type, convKey2, msgKey) =>
        Promise.all(
          (Array.isArray(list) ? list : []).map(async (f, i) => {
            if (f?.url && String(f.url).startsWith("http")) {
              return {
                id: f?.id || `${type}_${i}`,
                name: f?.name || `${type}_${i}`,
                mime: f?.mime || "application/octet-stream",
                url: String(f.url),
                ...(type === "img" && f?.thumb ? { thumb: f.thumb } : {}),
              };
            }

            const parsed = parseDataUrl(f?.dataUrl, f?.mime);
            if (!parsed) return null;

            const safeName = String(f?.name || `${type}_${i}`)
              .replace(/\s+/g, "_")
              .replace(/[/\\]/g, "_");

            const key = `${ATT_PREFIX}${convKey2}/${msgKey}/${type}_${i}_${safeName}`;

            await s3.send(
              new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: Buffer.from(parsed.b64, "base64"),
                ContentType: parsed.mime,
                CacheControl: "public, max-age=31536000",
                ...(String(process.env.CONTACTS_PUBLIC_READ || "").toLowerCase() === "true" ? { ACL: "public-read" } : {}),
                ...(type === "img"
                  ? { ContentDisposition: `inline; filename="${safeName}"` }
                  : { ContentDisposition: `attachment; filename="${safeName}"` }),
              })
            );

            return {
              id: f?.id || `${type}_${i}`,
              name: f?.name || safeName,
              mime: parsed.mime,
              url: s3UrlEncoded(key),
              ...(type === "img" && f?.thumb ? { thumb: f.thumb } : {}),
            };
          })
        );

      const upImages = (await upload(incomingImages, "img", convKey, msgId)).filter(Boolean);
      const upFiles = (await upload(incomingFiles, "file", convKey, msgId)).filter(Boolean);

      // Write message item
      await ddb.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            pk: pkConv(convKey),
            sk: skMsg(createdAt, msgId),

            convId: convKey,
            msgId,
            authorRole: String(authorRole || ""),
            text: String(text || ""),
            createdAt,

            images: upImages,
            files: upFiles,
          },
        })
      );

      // Update META copies (upsert with lastUpdated + title + snapshots)
      const meta = {
        convId: convKey,
        studentId,
        lecturerId,
        threadId: threadId || "",
        title: String(title || (currentConv?.title || "") || ""),
        lastUpdated: createdAt,
        lastRead: currentConv?.lastRead || { studentId: 0, lecturerId: 0 },

        studentName: (currentConv?.studentName || "") || (thenNonEmpty(snapName) ? snapName : ""),
        studentProgram: (currentConv?.studentProgram || "") || (thenNonEmpty(snapProgram) ? snapProgram : ""),
        studentPhotoUrl: (currentConv?.studentPhotoUrl || "") || (thenNonEmpty(snapPhoto) ? snapPhoto : ""),
        studentProfile:
          currentConv?.studentProfile ||
          (thenNonEmpty(snapName) || thenNonEmpty(snapProgram) || thenNonEmpty(snapPhoto)
            ? { name: snapName || "", program: snapProgram || "", photoUrl: snapPhoto || "" }
            : null),
      };

      await upsertMetaCopies(meta);

      const conv = await loadConversation(studentId, lecturerId, threadId || "");
      return json(200, { ok: true, conversation: conv });
    }

    return json(404, { ok: false });
  } catch (err) {
    console.error("ContactsHandlerDDB error:", err);
    return json(500, { ok: false, error: err?.message || "Unknown error" });
  }
}