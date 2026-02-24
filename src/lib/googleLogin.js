// src/lib/googleLogin.js
import { signInWithRedirect, signOut } from "aws-amplify/auth";

export async function loginWithGoogle() {
  try {
    // Normal path: just redirect
    return await signInWithRedirect({ provider: "Google" });
  } catch (e) {
    const msg = String(e?.name || e?.message || e || "");

    // Only if Cognito complains user is already authenticated, clear session then retry
    if (msg.includes("UserAlreadyAuthenticated") || msg.includes("already authenticated")) {
      try { await signOut({ global: true }); } catch {}
      return signInWithRedirect({ provider: "Google" });
    }

    // Any other error: rethrow so your UI can show it
    throw e;
  }
}