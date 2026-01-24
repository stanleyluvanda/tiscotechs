// src/lib/consentsApi.js
// Cross-device student consent API helper (HTTP API Gateway /api/consents*)
// ✅ Preferred: API Gateway base via VITE_CONSENTS_API_BASE
// ✅ Student: GET /api/consents?userId=...
// ✅ Student: PUT /api/consents
// ✅ Admin view (PUBLIC): GET /api/consents?limit=&cursor=  (NO admin=1)

const RAW_BASE =
  (import.meta.env.VITE_CONSENTS_API_BASE &&
    String(import.meta.env.VITE_CONSENTS_API_BASE).trim()) ||
  ""; // if empty, we use same-origin relative routes

const BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

/** Debug helper */
export function __getConsentsBase() {
  return BASE || "(same-origin)";
}

/** Build a full URL from a path. If BASE is empty, returns a relative path. */
function buildUrl(path) {
  const rel = String(path || "");
  if (!BASE) return rel.startsWith("/") ? rel : `/${rel}`;
  return `${BASE}${rel.startsWith("/") ? rel : `/${rel}`}`;
}

async function readJson(res) {
  const text = await res.text().catch(() => "");
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/** Try URLs in order; return first successful JSON. */
async function tryGet(urls, fetchOpts) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, fetchOpts);
      return await readJson(res);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Request failed");
}

/** -------------------------
 *  STUDENT: GET consents
 *  -------------------------
 * Returns: { ok:true, item: {...} }
 */
export async function getMyConsents(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("MISSING_USERID");

  const urls = [
    buildUrl(`/api/consents?userId=${encodeURIComponent(uid)}`),
    buildUrl(`/consents/me?userId=${encodeURIComponent(uid)}`), // legacy fallback
  ];

  return tryGet(urls, { method: "GET", credentials: "include" });
}

/** -------------------------
 *  STUDENT: PUT consents
 *  -------------------------
 * Returns: { ok:true, item:{...} }
 */
export async function putMyConsents({
  userId,
  consents,
  consent,
  profile,
  visibleAcrossDevices,
} = {}) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("MISSING_USERID");

  const payloadConsents = consents ?? consent ?? {};
  const p = profile && typeof profile === "object" ? profile : null;

  const body = {
    userId: uid,
    consents: payloadConsents,
    consent: payloadConsents,
    ...(p ? { profile: p } : {}),
    ...(typeof visibleAcrossDevices === "boolean" ? { visibleAcrossDevices } : {}),
  };

  const urls = [buildUrl(`/api/consents`), buildUrl(`/consents/me`)];

  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      return await readJson(res);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("PUT failed");
}

/** -------------------------
 *  PUBLIC LIST: list all consents (for Admin view)
 *  -------------------------
 * ✅ NO admin=1
 * ✅ Uses GET /api/consents?limit=&cursor=
 */
export async function listConsentsPublic({ limit = 200, cursor = null } = {}) {
  const qs = new URLSearchParams();
  qs.set("limit", String(Math.max(1, Math.min(200, Number(limit || 200)))));
  if (cursor) qs.set("cursor", String(cursor));

  const urls = [
    buildUrl(`/api/consents?${qs.toString()}`),
    buildUrl(`/consents/list?${qs.toString()}`), // legacy fallback if you ever had it
  ];

  return tryGet(urls, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
}

/** -------------------------
 *  LEGACY ADMIN LIST (kept for compatibility)
 *  -------------------------
 * If you no longer want admin=1 anywhere, stop importing this.
 */
export async function adminListConsents({ limit = 200, cursor = null } = {}) {
  const qs = new URLSearchParams();
  qs.set("admin", "1");
  qs.set("limit", String(Math.max(1, Math.min(200, Number(limit || 200)))));
  if (cursor) qs.set("cursor", String(cursor));

  const urls = [buildUrl(`/api/consents?${qs.toString()}`)];

  return tryGet(urls, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
}