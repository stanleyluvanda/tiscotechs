// src/lib/googleLogin.js
import { signInWithRedirect, signOut } from "aws-amplify/auth";

export async function loginWithGoogle() {
  // Keep current behavior (Hosted UI redirect), but request account chooser.
  // This does NOT change your oauthRole flow (you already store oauthRole in Login.jsx).
  const redirectArgs = {
    provider: "Google",
    // Amplify supports passing OAuth options; we keep it minimal.
    // If your Cognito UI is “classic hosted UI”, Amplify may still append this param,
    // and Google will show the account picker instead of auto-selecting a cached session.
    options: {
      prompt: "select_account",
    },
  };

  try {
    // Normal path: just redirect
    return await signInWithRedirect(redirectArgs);
  } catch (e) {
    const msg = String(e?.name || e?.message || e || "");

    // Only if Cognito complains user is already authenticated, clear session then retry
    if (
      msg.includes("UserAlreadyAuthenticated") ||
      msg.includes("already authenticated")
    ) {
      try {
        await signOut({ global: true });
      } catch {}
      return signInWithRedirect(redirectArgs);
    }

    // Any other error: rethrow so your UI can show it
    throw e;
  }
}