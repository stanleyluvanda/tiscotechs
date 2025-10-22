// Tiny client-only token store using localStorage

const RT_KEY = "resetTokens_v1";

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(RT_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeStore(obj) {
  try { localStorage.setItem(RT_KEY, JSON.stringify(obj)); } catch {}
}
function randToken(n = 32) {
  // 32 bytes → 64 hex chars (good enough for client-only demo)
  const a = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
}

/** Create/overwrite a token for an email, default TTL 15 minutes */
export function issueResetToken(email, ttlMs = 15 * 60 * 1000) {
  const store = readStore();
  const token = randToken(32);
  store[email.toLowerCase()] = { token, exp: Date.now() + ttlMs };
  writeStore(store);
  return token;
}

/** Validate but DO NOT consume */
export function validateResetToken(email, token) {
  const store = readStore();
  const rec = store[email.toLowerCase()];
  if (!rec) return { ok: false, reason: "no_token" };
  if (rec.token !== token) return { ok: false, reason: "bad_token" };
  if (Date.now() > (rec.exp || 0)) return { ok: false, reason: "expired" };
  return { ok: true };
}

/** Consume (delete) token after successful reset */
export function consumeResetToken(email) {
  const store = readStore();
  delete store[email.toLowerCase()];
  writeStore(store);
}