// src/lib/googleLogin.js
import { signInWithRedirect, signOut } from "aws-amplify/auth";

/*const SUPERTOKENS_API =
  "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st-prod";*/
const SUPERTOKENS_API = import.meta.env.DEV
  ? "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st"
  : "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st-prod";

/*export async function loginWithGoogle({ useSuperTokens = false } = {}) {*/
export async function loginWithGoogle({useSuperTokens = false,role = "student",} = {}) {

  /*if (useSuperTokens) {
    const res = await fetch(
      `${SUPERTOKENS_API}/authorisationurl?thirdPartyId=google`
    );*/
if (useSuperTokens) {
const selectedRole = String(role || "student").toLowerCase();

if (!["student", "lecturer", "partner"].includes(selectedRole)) {
  throw new Error("Invalid account role.");
}

/*const params = new URLSearchParams({
  thirdPartyId: "google",
  role: selectedRole,
  frontendOrigin: window.location.origin,
});*/
// Generate a random verifier for this browser's Google login attempt.
const verifierBytes = new Uint8Array(32);
window.crypto.getRandomValues(verifierBytes);

const oauthVerifier = Array.from(verifierBytes, (byte) =>
  byte.toString(16).padStart(2, "0")
).join("");

// Keep the verifier in the browser, not in the Google redirect URL.
sessionStorage.setItem(
  "scholarsknowledge_google_oauth_verifier",
  oauthVerifier
);

// Create a SHA-256 challenge to send to the authentication backend.
const verifierHash = await window.crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode(oauthVerifier)
);

const oauthChallenge = Array.from(
  new Uint8Array(verifierHash),
  (byte) => byte.toString(16).padStart(2, "0")
).join("");

const params = new URLSearchParams({
  thirdPartyId: "google",
  role: selectedRole,
  frontendOrigin: window.location.origin,
  oauthChallenge,
});


const res = await fetch(
  `${SUPERTOKENS_API}/authorisationurl?${params.toString()}`
);

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.url) {
      throw new Error(data?.error || "Could not start Google login.");
    }

    window.location.href = data.url;
    return;
  }

  const redirectArgs = {
    provider: "Google",
    options: {
      prompt: "select_account",
    },
  };

  try {
    return await signInWithRedirect(redirectArgs);
  } catch (e) {
    const msg = String(e?.name || e?.message || e || "");

    if (
      msg.includes("UserAlreadyAuthenticated") ||
      msg.includes("already authenticated")
    ) {
      try {
        await signOut({ global: true });
      } catch {}
      return signInWithRedirect(redirectArgs);
    }

    throw e;
  }
}