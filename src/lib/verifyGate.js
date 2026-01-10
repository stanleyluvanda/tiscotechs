// src/lib/verifyGate.js

// ✅ Hard-wire the email verification API to the Auth / EmailCode HTTP API.
// We intentionally do NOT use VITE_API_BASE or VITE_POSTS_API_BASE here.
const API_BASE = "https://izhwiz3a17.execute-api.us-east-1.amazonaws.com";

const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "true").toLowerCase() === "true";

const ENABLE_EMAIL_DEV =
  String(import.meta.env.VITE_ENABLE_EMAIL_DEV ?? "false").toLowerCase() === "true";

function toLower(x) {
  return String(x || "").trim().toLowerCase();
}

/* ---------------- Persistent verified map ----------------
   We track "verified emails" in a single object:
   localStorage["verify:map"] = { "user@school.edu": 1730923830000, ... }
----------------------------------------------------------- */
function readVerifyMap() {
  try {
    return JSON.parse(localStorage.getItem("verify:map") || "{}");
  } catch {
    return {};
  }
}

function writeVerifyMap(m) {
  localStorage.setItem("verify:map", JSON.stringify(m || {}));
}

export function isVerified(email) {
  const mail = toLower(email);
  if (!mail) return false;
  const map = readVerifyMap();
  return !!map[mail];
}

export function markVerified(email) {
  const mail = toLower(email);
  if (!mail) return;
  const map = readVerifyMap();
  map[mail] = Date.now();
  writeVerifyMap(map);
}

export function clearVerified(email) {
  const mail = toLower(email);
  if (!mail) return;
  const map = readVerifyMap();
  if (map[mail]) {
    delete map[mail];
    writeVerifyMap(map);
  }
}

/* ---------------- Token helpers (optional) ----------------
   If you use a backend token to prove verification, we also
   store it locally. Not required for client gating logic.
----------------------------------------------------------- */
export function getLocalVerifyToken(email) {
  return localStorage.getItem(`verify:token:${toLower(email)}`) || "";
}

export function setLocalVerifyToken(email, token) {
  const key = `verify:token:${toLower(email)}`;
  if (token) localStorage.setItem(key, token);
  else localStorage.removeItem(key);
}

/* ---------------- API: start / confirm ---------------- */

/**
 * startVerify(email)
 * - PURE local mock when:
 *     SERVERLESS === true AND ENABLE_EMAIL_DEV === false
 *   (no emails; always code "111111")
 *
 * - REAL email when:
 *     !SERVERLESS  OR  ENABLE_EMAIL_DEV === true
 *   (calls /start-email-code)
 */
export async function startVerify(email) {
  const mail = toLower(email);
  if (!mail) throw new Error("Email required.");

  // 🔹 Pure local / no-email dev mode
  if (SERVERLESS && !ENABLE_EMAIL_DEV) {
    const code = "111111";
    localStorage.setItem(`verify:code:${mail}`, code);
    return { ok: true, mock: true, code };
  }

  // 🔹 Email dev OR real backend mode: hit API
  try {
    const r = await fetch(`${API_BASE}/start-email-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: mail, reason: "verify" }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.ok) {
      throw new Error(data?.error || `HTTP ${r.status}`);
    }

    // Optional: backend may include debug info; we just return it
    return data;
  } catch (err) {
    console.warn("[verifyGate.startVerify] backend error:", err);

    // In dev, fall back to local code so you’re never blocked
    if (SERVERLESS) {
      const code = "111111";
      localStorage.setItem(`verify:code:${mail}`, code);
      return { ok: true, mock: true, code, fallback: true };
    }

    throw err;
  }
}

/**
 * confirmVerify(email, code)
 * - PURE local check when:
 *     SERVERLESS === true AND ENABLE_EMAIL_DEV === false
 *
 * - Otherwise tries backend /confirm-email-code.
 *   On success, marks verified and stores token.
 */
export async function confirmVerify(email, code) {
  const mail = toLower(email);
  const c = String(code || "").trim();

  if (!c) {
    throw new Error("Code required.");
  }

  // 🔹 Pure local / no-email dev mode
  if (SERVERLESS && !ENABLE_EMAIL_DEV) {
    const exp = localStorage.getItem(`verify:code:${mail}`) || "";
    if (c === exp) {
      const token = btoa(
        JSON.stringify({ email: mail, purpose: "verified", ts: Date.now() })
      );
      setLocalVerifyToken(mail, token);
      markVerified(mail);
      return { ok: true, token, local: true };
    }
    throw new Error("Invalid code.");
  }

  // 🔹 Email dev or real backend: hit API
  try {
    const r = await fetch(`${API_BASE}/confirm-email-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: mail, reason: "verify", code: c }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.ok) {
      throw new Error(data?.error || `HTTP ${r.status}`);
    }

    // Backend success ⇒ mark verified client-side as well
    markVerified(mail);
    if (data?.token) setLocalVerifyToken(mail, data.token);
    return data;
  } catch (err) {
    console.warn("[verifyGate.confirmVerify] backend error:", err);

    // Optional fallback in dev if we had a mock code stored
    if (SERVERLESS) {
      const exp = localStorage.getItem(`verify:code:${mail}`) || "";
      if (exp && c === exp) {
        const token = btoa(
          JSON.stringify({ email: mail, purpose: "verified", ts: Date.now() })
        );
        setLocalVerifyToken(mail, token);
        markVerified(mail);
        return { ok: true, token, fallback: true };
      }
    }

    throw err;
  }
}

/* --------- Helper you can call after sign-up ---------- */
/** Call after a new account is created to ensure verification is required. */
export function requireVerificationFor(email) {
  clearVerified(email);
  setLocalVerifyToken(email, "");
}