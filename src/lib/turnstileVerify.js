// src/lib/turnstileVerify.js
const VERIFY_URL = (import.meta.env.VITE_TURNSTILE_VERIFY_URL || "").trim();

export async function verifyTurnstileToken(token) {
  // bypass locally unless you set VITE_ENFORCE_TURNSTILE="true"
  const enforce = String(import.meta.env.VITE_ENFORCE_TURNSTILE || "").toLowerCase() === "true";
  if (import.meta.env.MODE !== "production" && !enforce) return { ok: true };

  if (!VERIFY_URL) return { ok: false };

  try {
    const r = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turnstileToken: token }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: !!(data?.ok ?? data?.success) };
  } catch {
    return { ok: false, offline: true };
  }
}