// src/lib/googleLogin.js
import { signInWithRedirect, signOut } from "aws-amplify/auth";

const SUPERTOKENS_API =
  "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st-prod";

export async function loginWithGoogle({ useSuperTokens = false } = {}) {
  if (useSuperTokens) {
    const res = await fetch(
      `${SUPERTOKENS_API}/authorisationurl?thirdPartyId=google`
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