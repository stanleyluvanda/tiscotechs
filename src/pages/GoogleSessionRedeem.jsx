import { useEffect, useRef, useState } from "react";
import Session from "supertokens-web-js/recipe/session";
import { markActiveUser } from "../lib/authState.js";

const REDEEM_URL =
  "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/auth-st-google-test/google-redeem";

const DASHBOARDS = {
  student: "/student/dashboard",
  lecturer: "/lecturer/dashboard",
  partner: "/partner/dashboard",
};

export default function GoogleSessionRedeem() {
  const [message, setMessage] = useState(
    "Completing Google sign-in..."
  );

  const startedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate redemption in React StrictMode.
    if (startedRef.current) return;
    startedRef.current = true;

    async function redeem() {
      const params = new URLSearchParams(
  window.location.hash.substring(1)
);
const ticket = params.get("ticket");

      // Remove the ticket immediately from the address bar.
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname
      );

      if (!ticket || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) {
        setMessage("Invalid or missing Google login ticket.");
        return;
      }

      try {
        const response = await fetch(REDEEM_URL, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "st-auth-mode": "header",
          },
          body: JSON.stringify({ ticket }),
          cache: "no-store",
        });

        const result = await response.json();
        console.log("Google redemption response fields:", Object.keys(result));

        if (
          !response.ok ||
          result.ok !== true ||
          result.sessionCreated !== true
        ) {
          throw new Error(
            result.error || "Google session creation failed."
          );
        }

        const role = String(result.role || "").toLowerCase();

        if (!DASHBOARDS[role]) {
          throw new Error("Unsupported account role.");
        }

        // Do not mark the account authenticated until the
        // SuperTokens session is verified by the frontend SDK.
        // Verify that SuperTokens recognizes the new session.
const sessionExists = await Session.doesSessionExist();

if (!sessionExists) {
  throw new Error(
    "Google authentication succeeded, but the SuperTokens session was not established in this browser."
  );
}

// Verify the authenticated session's role.
const payload = await Session.getAccessTokenPayloadSecurely();

if (
  String(payload.role || "").toLowerCase() !== role ||
  payload.authProvider !== "supertokens-google"
) {
  throw new Error("Google session verification failed.");
}

// The SuperTokens session and its claims have been verified.
const userId = String(payload.sub || "");

if (!userId) {
  throw new Error("Verified Google session has no user ID.");
}

// Synchronize the existing frontend user state.
// This does not create or replace a SuperTokens session.
// Use the email returned by the verified Google ticket redemption.
const verifiedEmail = String(result.email || "")
  .trim()
  .toLowerCase();

if (!verifiedEmail || !verifiedEmail.includes("@")) {
  throw new Error("Verified Google account email is missing.");
}

// Synchronize the verified Google identity with frontend state.
markActiveUser({
  id: userId,
  uid: userId,
  email: verifiedEmail,
  role,
  authProvider: "supertokens-google",
});

window.dispatchEvent(new Event("auth:changed"));
window.dispatchEvent(new Event("user:updated"));

setMessage("Google session verified successfully.");

window.location.replace(DASHBOARDS[role]);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Google sign-in failed."
        );
      }
    }

    redeem();
  }, []);

  return (
    <main className="max-w-xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold mb-4">
        Google Authentication
      </h1>
      <p>{message}</p>
    </main>
  );
}