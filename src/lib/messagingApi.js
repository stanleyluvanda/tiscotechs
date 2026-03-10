// src/lib/messagingApi.js

function pickBase() {
  const raw = import.meta.env.VITE_MESSAGING_API_BASE || "";
  return String(raw).trim().replace(/\/+$/, "");
}

// Optional helper (keeps behavior same, just avoids repeating the trim logic elsewhere)
function pickStr(x) {
  return String(x || "").trim();
}

async function http(method, path, body) {
  const base = pickBase();
  const url = `${base}${path}`;

  // ✅ Keep existing behavior: JSON requests, same endpoints, same payloads.
  // Small hardening: only send JSON body for non-GET/HEAD.
  const upper = String(method || "").toUpperCase();
  const hasBody = body != null && upper !== "GET" && upper !== "HEAD";

  const res = await fetch(url, {
    method: upper,
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP_${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * People search for Messaging.
 * IMPORTANT:
 * - role must be the TARGET role you want returned by the API (e.g., "lecturer" when viewer is student).
 * - This helper intentionally does NOT infer/override role; caller controls it deterministically.
 */
export async function listPeople({ scopeKey, role, q = "" }) {
  const sk = pickStr(scopeKey);
  const r = pickStr(role).toLowerCase();
  const query = pickStr(q);

  // ✅ Non-breaking guardrails: clearer errors if caller forgets fields.
  // Does not change backend/DynamoDB behavior; only prevents malformed requests.
  if (!sk) throw new Error("MISSING_SCOPEKEY");
  if (!r) throw new Error("MISSING_ROLE");

  const qs =
    `?scopeKey=${encodeURIComponent(sk)}` +
    `&role=${encodeURIComponent(r)}` +
    (query ? `&q=${encodeURIComponent(query)}` : "");

  return http("GET", `/api/messaging/people${qs}`);
}

export async function listThreads({ userId }) {
  const uid = pickStr(userId);
  if (!uid) throw new Error("MISSING_USERID");
  return http("GET", `/api/messaging/threads?userId=${encodeURIComponent(uid)}`);
}

export async function getConversation({ threadId, limit = 50, cursor = "" }) {
  const tid = pickStr(threadId);
  if (!tid) throw new Error("MISSING_THREADID");

  const lim = Number.isFinite(Number(limit)) ? Number(limit) : 50;
  const cur = pickStr(cursor);

  const qs =
    `?threadId=${encodeURIComponent(tid)}` +
    `&limit=${encodeURIComponent(lim)}` +
    (cur ? `&cursor=${encodeURIComponent(cur)}` : "");

  return http("GET", `/api/messaging/conversation${qs}`);
}

export async function sendMessage(payload) {
  // Keep same route + payload
  return http("POST", `/api/messaging/message`, payload);
}

export async function markRead(payload) {
  // Keep same route + payload
  return http("POST", `/api/messaging/markRead`, payload);
}

export async function heartbeatPresence({ userId, scopeKey = "" }) {
  const uid = pickStr(userId);
  if (!uid) throw new Error("MISSING_USERID");

  return http("POST", `/api/messaging/presence/heartbeat`, {
    userId: uid,
    scopeKey: pickStr(scopeKey),
  });
}

export async function getPresence({ userIds = [] }) {
  const ids = Array.isArray(userIds)
    ? userIds.map((x) => pickStr(x)).filter(Boolean)
    : [];

  if (!ids.length) return { ok: true, presence: {} };

  const qs = `?userIds=${encodeURIComponent(ids.join(","))}`;
  return http("GET", `/api/messaging/presence${qs}`);
}