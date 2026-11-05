//src/pages/SuperTokensGoogleCallback.jsx//
import { useEffect, useRef, useState } from "react";

// Verification-only SuperTokens test endpoint.
// This must point to AuthHandlerSuperTokensTest.
const API =
  /*"https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/api/auth-st";*/
   "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st";

export default function SuperTokensGoogleCallback() {
  const [status, setStatus] = useState(
    "Processing Google authentication..."
  );

  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const fragment = window.location.hash;

    // Remove the completion proof from the browser address bar.
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search
    );

    const params = new URLSearchParams(
      fragment.startsWith("#") ? fragment.slice(1) : fragment
    );

    const proof = params.get("googleCompletionProof");

    // Retrieve and consume the browser verifier.
    const browserVerifier = sessionStorage.getItem(
      "sk_google_test_browser_verifier"
    );

    sessionStorage.removeItem(
      "sk_google_test_browser_verifier"
    );

    if (!proof || !browserVerifier) {
      setStatus("Google authentication could not be completed.");
      return;
    }

    async function verifyCompletion() {
      try {
        setStatus("Verifying Google authentication...");

        const response = await fetch(
          `${API}/google-verify-test`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              proof,
              browserVerifier,
            }),
          }
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok && data?.ok === true) {
          setStatus(
            "Google authentication verified successfully. " +
            "SuperTokens session creation remains disabled " +
            "in this isolated test."
          );
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setStatus(
            "Google authentication verification failed."
          );
          return;
        }

        if (response.status === 503) {
          setStatus(
            "Google authentication verification is currently unavailable."
          );
          return;
        }

        setStatus(
          "Google authentication could not be completed."
        );
      } catch {
        setStatus(
          "Unable to contact the Google authentication test service."
        );
      }
    }

    verifyCompletion();
  }, []);

  return (
    <main className="max-w-xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">
        Google Sign-In
      </h1>

      <p className="mt-4 text-slate-600" role="status">
        {status}
      </p>
    </main>
  );
}