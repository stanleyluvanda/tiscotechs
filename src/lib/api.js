// src/lib/api.js

// ---- Bases ----
const API_BASE = String(import.meta?.env?.VITE_API_BASE || "http://localhost:5001").replace(/\/+$/, "");
const EMAIL_API_BASE = String(import.meta?.env?.VITE_EMAIL_API_BASE || "").replace(/\/+$/, "");

// ---- DEBUG: expose the endpoints the bundle is actually using ----
if (typeof window !== "undefined") {
  window.__SK_ENDPOINTS__ = { API_BASE, EMAIL_API_BASE };
  console.log("[endpoints]", window.__SK_ENDPOINTS__);
}

/** Build an absolute URL from a path or accept full URLs */
function toUrl(path) {
  if (/^https?:\/\//i.test(path)) return String(path);
  const p = String(path || "");
  return API_BASE + (p.startsWith("/") ? p : `/${p}`);
}

async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return {}; }
}

/** POST JSON — returns { ok, status, ...json } and NEVER throws */
export async function postJSON(path, body, init = {}) {
  try {
    const res = await fetch(toUrl(path), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      body: JSON.stringify(body ?? {}),
      ...init,
    });
    const json = await parseJsonSafe(res);
    return { ok: res.ok, status: res.status, ...json };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

/** GET JSON — returns { ok, status, ...json } and NEVER throws */
export async function getJSON(path, init = {}) {
  try {
    const res = await fetch(toUrl(path), {
      method: "GET",
      credentials: "include",
      ...(init || {}),
    });
    const json = await parseJsonSafe(res);
    return { ok: res.ok, status: res.status, ...json };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

/* =========================================================
   Email-code helpers (AWS API Gateway / Lambda)
   NOTE: We pass FULL URLs to postJSON; toUrl() detects them
   and DOES NOT prepend API_BASE.
   ========================================================= */

/** Start email code (verify | reset) via Lambda */
export function sendEmailCode(email, reason = "verify") {
  const url = `${EMAIL_API_BASE}/start-email-code`;
  return postJSON(url, { email, reason });
}

/** Confirm email code (verify | reset) via Lambda */
export function confirmEmailCode(email, code, reason = "verify") {
  const url = `${EMAIL_API_BASE}/confirm-email-code`;
  return postJSON(url, { email, code, reason });
}

/* ==========================
   Auth helpers (Express API)
   ========================== */

/** Login against your Express backend */
export function login(payload) {
  // Uses relative path; toUrl() will prefix API_BASE
  return postJSON("/api/auth/login", payload);
}

// (Optional) export bases for quick debugging
export const __endpoints__ = { API_BASE, EMAIL_API_BASE };

export default {
  postJSON,
  getJSON,
  sendEmailCode,
  confirmEmailCode,
  login,
  __endpoints__,
};