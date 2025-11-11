// src/lib/verifyGate.js

const EMAIL_API_BASE = String(
  import.meta.env.VITE_EMAIL_API_BASE || ""
).replace(/\/+$/, "");

const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "true").toLowerCase() === "true";

// ✅ Debug beacon: proves the deployed bundle sees the right values
if (typeof window !== "undefined") {
  window.__VG__ = { EMAIL_API_BASE, SERVERLESS };
  console.log("[verifyGate]", window.__VG__);
}

function toLower(x){ return String(x||"").trim().toLowerCase(); }

/* ----- local "verified" bookkeeping (unchanged) ----- */
function readMap(){ try { return JSON.parse(localStorage.getItem("verify:map")||"{}"); } catch { return {}; } }
function writeMap(m){ localStorage.setItem("verify:map", JSON.stringify(m||{})); }
export function isVerified(email){ return !!readMap()[toLower(email)]; }
export function markVerified(email){ const m=readMap(); m[toLower(email)] = Date.now(); writeMap(m); }
export function clearVerified(email){ const m=readMap(); delete m[toLower(email)]; writeMap(m); }
export function getLocalVerifyToken(email){ return localStorage.getItem(`verify:token:${toLower(email)}`)||""; }
export function setLocalVerifyToken(email,t){ const k=`verify:token:${toLower(email)}`; t?localStorage.setItem(k,t):localStorage.removeItem(k); }

/* ----- REQUIRED: email API base must exist in real mode ----- */
function emailApi(path){
  if (!EMAIL_API_BASE) {
    // Make the mistake obvious in the console and UI
    throw new Error("EMAIL API BASE missing. Set VITE_EMAIL_API_BASE in Amplify.");
  }
  return `${EMAIL_API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

/* ---------------- API: start / confirm ---------------- */
export async function startVerify(email){
  const mail = toLower(email);
  if (!mail) throw new Error("Email required.");

  if (SERVERLESS) {
    localStorage.setItem(`verify:code:${mail}`, "111111");
    return { ok:true, mock:true, code:"111111" };
  }

  const r = await fetch(emailApi("/start-email-code"), {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ email: mail, reason: "verify" }),
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

export async function confirmVerify(email, code){
  const mail = toLower(email);
  const c = String(code||"").trim();

  if (SERVERLESS) {
    const exp = localStorage.getItem(`verify:code:${mail}`)||"";
    if (c === exp) {
      const token = btoa(JSON.stringify({ email: mail, purpose:"verified", ts: Date.now() }));
      setLocalVerifyToken(mail, token);
      markVerified(mail);
      return { ok:true, token };
    }
    throw new Error("Invalid code.");
  }

  const r = await fetch(emailApi("/confirm-email-code"), {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ email: mail, reason: "verify", code: c }),
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

  markVerified(mail);
  if (data?.token) setLocalVerifyToken(mail, data.token);
  return data;
}

export function requireVerificationFor(email){
  clearVerified(email);
  setLocalVerifyToken(email, "");
}