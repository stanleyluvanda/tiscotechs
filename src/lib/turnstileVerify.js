// src/lib/turnstileVerify.js

const VERIFY_URL = (
  import.meta.env.VITE_TURNSTILE_VERIFY_URL || ""
).trim();

// Existing Turnstile verification.
// Preserved for compatibility with existing callers.
export async function verifyTurnstileToken(token) {
  // Bypass locally unless VITE_ENFORCE_TURNSTILE="true".
  const enforce =
    String(import.meta.env.VITE_ENFORCE_TURNSTILE || "").toLowerCase() ===
    "true";

  if (import.meta.env.MODE !== "production" && !enforce) {
    return { ok: true };
  }

  if (!VERIFY_URL) {
    return { ok: false };
  }

  try {
    const r = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        turnstileToken: token,
      }),
    });

    const data = await r.json().catch(() => ({}));

    return {
      ok: !!(data?.ok ?? data?.success),
    };
  } catch {
    return {
      ok: false,
      offline: true,
    };
  }
}

// New: Request a single-use Turnstile proof for SuperTokens login.
// The TurnstileVerify Lambda verifies the Cloudflare token,
// creates a short-lived proof in DynamoDB, and returns its proofId.
export async function requestTurnstileProof(token) {
  if (!VERIFY_URL || !token) {
    return { ok: false };
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        turnstileToken: token,
        proofPurpose: "supertokens-login",
      }),
    });

    const data = await response.json().catch(() => ({}));

    // Require successful verification and a valid proof ID.
    if (
      !response.ok ||
      data?.ok !== true ||
      !/^[a-f0-9]{64}$/.test(String(data?.proofId || ""))
    ) {
      return { ok: false };
    }

    return {
      ok: true,
      proofId: data.proofId,
    };
  } catch {
    return {
      ok: false,
      offline: true,
    };
  }
}
