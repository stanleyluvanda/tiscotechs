// UsersHandler (Lambda)
// Stores a global users list in S3: s3://USERS_BUCKET/USERS_KEY
// Supports:
//   GET  /api/users                  -> list users
//   POST /api/users/upsert           -> add/update one user
//   POST /api/users/batchUpsert      -> add/update many users (optional)
//   OPTIONS *                        -> CORS preflight

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.USERS_BUCKET;
const KEY = process.env.USERS_KEY || "users/users.json";

const s3 = new S3Client({ region: REGION });

function cors(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    ...extra,
  };
}

function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: cors({ "content-type": "application/json; charset=utf-8" }),
    body: JSON.stringify(bodyObj ?? {}),
  };
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function readUsersFile() {
  if (!BUCKET) return { users: [], meta: { missingBucket: true } };

  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
    const text = await streamToString(out.Body);
    const parsed = JSON.parse(text || "{}");

    // Allow either:
    // 1) { users: [...] }
    // 2) [ ... ]
    const users = Array.isArray(parsed) ? parsed : Array.isArray(parsed.users) ? parsed.users : [];
    return { users, meta: { ok: true } };
  } catch (e) {
    // If file doesn't exist yet, return empty (don’t crash)
    const msg = String(e?.name || e?.Code || e?.message || "");
    if (msg.includes("NoSuchKey") || msg.includes("NotFound")) {
      return { users: [], meta: { empty: true } };
    }
    throw e;
  }
}

async function writeUsersFile(users) {
  if (!BUCKET) throw new Error("USERS_BUCKET is not set");

  const payload = {
    updatedAt: new Date().toISOString(),
    count: Array.isArray(users) ? users.length : 0,
    users: Array.isArray(users) ? users : [],
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: KEY,
      Body: JSON.stringify(payload, null, 2),
      ContentType: "application/json",
      CacheControl: "no-cache",
    })
  );

  return payload;
}

function safeParseBody(event) {
  const raw = event?.body;
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

// Stable identity key (so the same person updates instead of duplicating)
function stableId(u) {
  const uid = (u?.uid || u?.id || "").toString().trim();
  const email = (u?.email || "").toString().trim().toLowerCase();
  return uid || (email ? `email:${email}` : "");
}

function mergeUser(oldU, newU) {
  // “newU wins” but keep any fields that newU omitted
  return {
    ...oldU,
    ...newU,
    email: newU?.email ?? oldU?.email,
    uid: newU?.uid ?? oldU?.uid,
    id: newU?.id ?? oldU?.id,
    role: newU?.role ?? oldU?.role,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeUser(u) {
  const o = u || {};
  return {
    ...o,
    // normalize a few common fields
    email: o.email ? String(o.email).trim() : "",
    role: o.role ? String(o.role).trim() : "",
    name: o.name ? String(o.name).trim() : (o.fullName ? String(o.fullName).trim() : ""),
    university: o.university ? String(o.university).trim() : "",
    faculty: o.faculty ? String(o.faculty).trim() : "",
    school: o.school ? String(o.school).trim() : "",
    college: o.college ? String(o.college).trim() : "",
    department: o.department ? String(o.department).trim() : "",
  };
}

function pickRoute(event) {
  const method = (event?.requestContext?.http?.method || event?.httpMethod || "GET").toUpperCase();
  const path = event?.rawPath || event?.path || "/";
  return { method, path };
}

export const handler = async (event) => {
  try {
    const { method, path } = pickRoute(event);

    // CORS preflight
    if (method === "OPTIONS") {
      return { statusCode: 204, headers: cors(), body: "" };
    }

    // GET /api/users
    if (method === "GET" && path.endsWith("/api/users")) {
      const { users } = await readUsersFile();
      return json(200, { ok: true, users });
    }

    // POST /api/users/upsert
    if (method === "POST" && path.endsWith("/api/users/upsert")) {
      const body = safeParseBody(event);
      const incoming = normalizeUser(body?.user || body);

      const sid = stableId(incoming);
      if (!sid) return json(400, { ok: false, error: "User must include uid/id or email" });

      const { users } = await readUsersFile();

      // find existing by uid/id/email
      const idx = users.findIndex((u) => stableId(u) === sid);
      let next = users.slice();

      if (idx >= 0) {
        next[idx] = mergeUser(next[idx], incoming);
      } else {
        next.unshift({ ...incoming, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }

      const saved = await writeUsersFile(next);
      return json(200, { ok: true, count: saved.count });
    }

    // POST /api/users/batchUpsert (optional helper)
    if (method === "POST" && path.endsWith("/api/users/batchUpsert")) {
      const body = safeParseBody(event);
      const arr = Array.isArray(body?.users) ? body.users : [];

      const { users } = await readUsersFile();
      const map = new Map();

      // seed existing
      for (const u of users) {
        const k = stableId(u);
        if (k) map.set(k, u);
      }

      // apply incoming
      for (const raw of arr) {
        const incoming = normalizeUser(raw);
        const k = stableId(incoming);
        if (!k) continue;
        const prev = map.get(k);
        map.set(
          k,
          prev
            ? mergeUser(prev, incoming)
            : { ...incoming, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        );
      }

      const next = Array.from(map.values());
      const saved = await writeUsersFile(next);
      return json(200, { ok: true, count: saved.count });
    }

    return json(404, { ok: false, error: `No route: ${method} ${path}` });
  } catch (e) {
    console.error("[UsersHandler] error", e);
    return json(500, { ok: false, error: e?.message || String(e) });
  }
};