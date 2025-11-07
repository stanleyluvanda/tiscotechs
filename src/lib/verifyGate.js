// src/lib/verifyGate.js
const API_BASE =
  (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "http://localhost:5001";

const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "true").toLowerCase() === "true";

function toLower(x){ return String(x||"").trim().toLowerCase(); }

/* ---------------- Persistent verified map ----------------
   We track "verified emails" in a single object:
   localStorage["verify:map"] = { "user@school.edu": 1730923830000, ... }
----------------------------------------------------------- */
function readVerifyMap(){
  try { return JSON.parse(localStorage.getItem("verify:map") || "{}"); } catch { return {}; }
}
function writeVerifyMap(m){ localStorage.setItem("verify:map", JSON.stringify(m || {})); }

export function isVerified(email){
  const mail = toLower(email);
  if (!mail) return false;
  const map = readVerifyMap();
  return !!map[mail];
}
export function markVerified(email){
  const mail = toLower(email);
  if (!mail) return;
  const map = readVerifyMap();
  map[mail] = Date.now();
  writeVerifyMap(map);
}
export function clearVerified(email){
  const mail = toLower(email);
  if (!mail) return;
  const map = readVerifyMap();
  if (map[mail]) { delete map[mail]; writeVerifyMap(map); }
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
export async function startVerify(email) {
  const mail = toLower(email);
  if (!mail) throw new Error("Email required.");
  if (SERVERLESS) {
    // Dev mock: set code "111111" locally so you can test without email.
    localStorage.setItem(`verify:code:${mail}`, "111111");
    return { ok: true, mock: true, code: "111111" };
  }
  const r = await fetch(`${API_BASE}/api/verify/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: mail })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

export async function confirmVerify(email, code) {
  const mail = toLower(email);
  const c = String(code || "").trim();
  if (SERVERLESS) {
    const exp = localStorage.getItem(`verify:code:${mail}`) || "";
    if (c === exp) {
      const token = btoa(JSON.stringify({ email: mail, purpose: "verified", ts: Date.now() }));
      setLocalVerifyToken(mail, token);
      // The real gate: mark this email as verified so we never show VerifyGate again (until email changes).
      markVerified(mail);
      return { ok: true, token };
    }
    throw new Error("Invalid code.");
  }
  const r = await fetch(`${API_BASE}/api/verify/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: mail, code: c })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  // Backend success ⇒ mark verified client-side as well (UX optimization)
  markVerified(mail);
  if (data?.token) setLocalVerifyToken(mail, data.token);
  return data;
}

/* --------- Helper you can call after sign-up ---------- */
/** Call after a new account is created to ensure verification is required. */
export function requireVerificationFor(email){
  // simply clear any verified mark and token for this email
  clearVerified(email);
  setLocalVerifyToken(email, "");
}