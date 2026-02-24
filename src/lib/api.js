// src/lib/api.js    

// =========================================
// Hot-fix: force API Gateway when on localhost
// =========================================
const DEV_FORCE_GATEWAY =
  typeof window !== "undefined" && /^localhost(:\d+)?$/.test(window.location.hostname);

// ---- Bases ----
const RAW_API_BASE = (
  DEV_FORCE_GATEWAY
    /*? "https://izhwiz3a17.execute-api.us-east-1.amazonaws.com"*/
    ? "https://eovdrymvq3.execute-api.us-east-1.amazonaws.com"
    : import.meta?.env?.VITE_API_BASE || "http://localhost:5001"
).replace(/\/+$/, "");

// NEW: if VITE_EMAIL_API_BASE is missing/blank, fall back to RAW_API_BASE
const EMAIL_API_BASE = String(
  import.meta?.env?.VITE_EMAIL_API_BASE || RAW_API_BASE
).replace(/\/+$/, "");



// NEW: Password reset API base (separate HTTP API)
// This MUST point to the PasswordReset-API that updates DynamoDB.
const RESET_API_BASE = String(
  import.meta?.env?.VITE_RESET_API_BASE ||
  "https://eovdrymvq3.execute-api.us-east-1.amazonaws.com"
).replace(/\/+$/, "");

// Optional overrides for reset endpoints
// Your real route in API Gateway is POST /api/auth/reset
const RESET_START_PATH =
  import.meta?.env?.VITE_RESET_START_PATH || "/api/auth/reset-start"; // (unused for now)
const RESET_COMPLETE_PATH =
  import.meta?.env?.VITE_RESET_COMPLETE_PATH || "/api/auth/reset";

function buildResetUrl(defaultPath, override) {
  const base = RESET_API_BASE.replace(/\/+$/, "");
  const path = String(override || defaultPath || "").trim();
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return base + (path.startsWith("/") ? path : `/${path}`);
}




// Serverless toggle (kept)
const SERVERLESS =
  String(import.meta?.env?.VITE_SERVERLESS_MODE ?? "true").toLowerCase() === "true";

// Final chosen API_BASE (for display/debug). We still try fallbacks at request time.
const API_BASE = RAW_API_BASE;

// Expose endpoints for quick inspection in DevTools
if (typeof window !== "undefined") {
  window.__SK_ENDPOINTS__ = { API_BASE, EMAIL_API_BASE, SERVERLESS };
  console.log("[endpoints]", window.__SK_ENDPOINTS__);
}

/** Build absolute URL from a base + path */
function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");
  if (!p) return b;
  return b + (p.startsWith("/") ? p : `/${p}`);
}

/** Accept full URLs or a relative API path */
function toUrl(path, base) {
  const p = String(path || "");
  if (/^https?:\/\//i.test(p)) return p;
  return joinUrl(base, p);
}

async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return {}; }
}

/* ----------------------------- */
/*        Fallback fetch         */
/* ----------------------------- */

/**
 * Try a list of candidate URLs in order until one succeeds (HTTP-level success).
 * - Never throws; returns a Response-like object from the first attempt that completes,
 *   or re-throws last error to be handled by caller’s try/catch (we catch there).
 */
async function fetchWithFallback(candidates, init, timeoutMs = 12000) {
  const errors = [];
  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error("TIMEOUT")), timeoutMs);

      const res = await fetch(url, { ...init, signal: controller.signal, mode: "cors", credentials: "include" });
      clearTimeout(timer);
      // Return even on non-2xx; caller will read res.ok, status, etc.
      return res;
    } catch (err) {
      errors.push({ url, err: String(err && err.message ? err.message : err) });
      // try the next candidate
    }
  }
  const last = errors[errors.length - 1];
  throw new Error(last ? last.err : "Unknown network error");
}

/** Build candidate bases for relative API paths */
function apiBaseCandidates() {
  const list = [];

  // 1) Configured base first (may be forced to API Gateway on localhost)
  if (API_BASE) list.push(API_BASE);

  // 2) Same-origin (useful if a reverse proxy exists; harmless otherwise)
  if (typeof window !== "undefined" && window.location?.origin) {
    list.push(window.location.origin);
  }

  // 3) Dev fallback (only useful when not forcing gateway)
  list.push("http://localhost:5001");

  // De-duplicate while preserving order
  return [...new Set(list.map(s => String(s).replace(/\/+$/, "")))];
}

/** Map low-level fetch errors to clearer labels */
function normalizeNetError(e) {
  const msg = String(e || "");
  if (/TIMEOUT/i.test(msg)) return "timeout";
  if (/Failed to fetch/i.test(msg)) return "network";
  if (/ERR_NAME_NOT_RESOLVED/i.test(msg)) return "dns";
  if (/ERR_CONNECTION_REFUSED/i.test(msg)) return "connection-refused";
  if (/NetworkError/i.test(msg)) return "network";
  return "network";
}

/** Core POST JSON with fallback candidates; returns { ok, status, ...json } */
async function corePostJSON(pathOrUrl, body, init = {}) {
  try {
    let candidates = [];
    if (/^https?:\/\//i.test(String(pathOrUrl))) {
      // Full URL (e.g., serverless email endpoints) → try exactly as given
      candidates = [String(pathOrUrl)];
    } else {
      // Relative API path → try configured base, same-origin, then localhost
      candidates = apiBaseCandidates().map(b => toUrl(pathOrUrl, b));
    }

    const res = await fetchWithFallback(
      candidates,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(init.headers || {}) },
        body: JSON.stringify(body ?? {}),
        ...init,
        credentials: "include",
      }
    );

    const json = await parseJsonSafe(res);
    return { ok: res.ok, status: res.status, ...json };
  } catch (e) {
    return { ok: false, status: 0, error: normalizeNetError(e) };
  }
}

/** Core GET JSON with fallback candidates; returns { ok, status, ...json } */
async function coreGetJSON(pathOrUrl, init = {}) {
  try {
    let candidates = [];
    if (/^https?:\/\//i.test(String(pathOrUrl))) {
      candidates = [String(pathOrUrl)];
    } else {
      candidates = apiBaseCandidates().map(b => toUrl(pathOrUrl, b));
    }

    const res = await fetchWithFallback(
      candidates,
      { method: "GET", ...(init || {}), credentials: "include" }
    );

    const json = await parseJsonSafe(res);
    return { ok: res.ok, status: res.status, ...json };
  } catch (e) {
    return { ok: false, status: 0, error: normalizeNetError(e) };
  }
}

/* =========================================================
   Public helpers (non-throwing)
   ========================================================= */

export async function postJSON(pathOrUrl, body, init = {}) {
  return corePostJSON(pathOrUrl, body, init);
}

export async function getJSON(pathOrUrl, init = {}) {
  return coreGetJSON(pathOrUrl, init);
}

/* =========================================================
   Email-code helpers (AWS API Gateway / Lambda)
   NOTE: We pass FULL URLs to postJSON; toUrl/fallback won’t
   prepend API_BASE for full URLs, and we’ll hit Lambda directly.
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
   Auth helpers (Express/Lambda)
   ========================== */

/**
 * Register a student against your real backend (Lambda / API Gateway).
 * Expects payload to already contain:
 *   - email
 *   - passwordHash  (NOT plain password)
 *   - role          (e.g. "student")
 *   - profile       (object with name, country, etc.)
 */
export async function apiRegisterStudent(payload) {
  return corePostJSON("/api/auth/register/student", payload);
}

/**
 * Register a lecturer (same backend, different route).
 * Payload shape mirrors student: { email, passwordHash, role, profile }
 */
export async function apiRegisterLecturer(payload) {
  return corePostJSON("/api/auth/register/lecturer", payload);
}

/** Login against your API (Express or serverless proxy) — STRICT */
export async function login(payload) {
  const r = await corePostJSON("/api/auth/login", payload);

  // Only succeed when:
  // - HTTP 2xx
  // - server says success (success:true or ok:true)
  // - and a real user object with an email is present
  const strictOk =
    !!r &&
    r.status >= 200 &&
    r.status < 300 &&
    ((r.success === true) || (r.ok === true)) &&
    r.user &&
    typeof r.user.email === "string" &&
    r.user.email.length > 3;

  return {
    ...r,
    ok: strictOk,
    error: strictOk ? null : (r?.error || r?.message || "Invalid credentials"),
  };
}

/**
 * Change email (backend AuthHandler /api/auth/change-email)
 * payload example:
 * {
 *   oldEmail,
 *   newEmail,
 *   role: "student" | "lecturer",
 *   password: "plainOrHash"
 * }
 */
export async function apiChangeEmail(payload) {
  return corePostJSON("/api/auth/change-email", payload);
}

/**
 * Change password (backend AuthHandler /api/auth/change-password)
 * payload example:
 * {
 *   email,
 *   role: "student" | "lecturer",
 *   oldPassword: "plainOrHash",
 *   newPassword: "plain"
 * }
 */
export async function apiChangePassword(payload) {
  return corePostJSON("/api/auth/change-password", payload);
}

/**
 * Reset password after VerifyGate (forgot password)
 * payload example:
 * {
 *   email,
 *   newPassword: "plain"
 * }
 */
export async function apiResetPassword(payload) {
  return corePostJSON("/api/auth/reset-password", payload);
}






/* =========================================================
   Password reset API helpers (PasswordReset-API)
   ========================================================= */

/**
 * Step 1: request a reset for the given email.
 * This is called when the user submits the "Send reset link" form.
 */
export async function apiStartPasswordReset(email) {
  const url = buildResetUrl("/start-password-reset", RESET_START_PATH);
  return postJSON(url, { email });
}

/**
 * Step 2: complete reset after VerifyGate succeeds.
 * Call this when the user has:
 *  - confirmed the 6-digit code (VerifyGate)
 *  - entered a new password
 */
export async function apiCompletePasswordReset({ email, code, newPassword }) {
  const url = buildResetUrl(
    "/complete-password-reset",
    RESET_COMPLETE_PATH
  );
  return postJSON(url, { email, code, newPassword });
}



// Export bases for quick debugging
export const __endpoints__ = { API_BASE, EMAIL_API_BASE, SERVERLESS };

export default {
  postJSON,
  getJSON,
  sendEmailCode,
  confirmEmailCode,
  login,
  apiRegisterStudent,
  apiRegisterLecturer,
  apiChangeEmail,
  apiChangePassword,
  apiResetPassword,

  apiStartPasswordReset,
  apiCompletePasswordReset,

  __endpoints__,
};