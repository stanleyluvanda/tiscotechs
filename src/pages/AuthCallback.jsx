// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

function apiBase() {
  const pick = (...vals) => {
    for (const v of vals) {
      const s = String(v || "").trim();
      if (s) return s;
    }
    return "";
  };

  const raw = pick(
    import.meta.env.VITE_AUTH_API_BASE,
    import.meta.env.VITE_API_BASE,
    import.meta.env.VITE_API_URL
  );

  return raw ? raw.replace(/\/+$/, "") : "";
}

async function getMyNameFromAmplify() {
  const session = await fetchAuthSession().catch(() => null);
  const p = session?.tokens?.idToken?.payload || {};
  const attrs = await fetchUserAttributes().catch(() => null);

  const name =
    (attrs && (attrs.name || attrs.given_name || attrs["custom:name"])) ||
    p.name ||
    p.given_name ||
    p.family_name ||
    "";

  return String(name || "").trim();
}

async function getMyEmailFromAmplify() {
  const deadline = Date.now() + 8000;
  let last = {};

  while (Date.now() < deadline) {
    // 1) Try token payload
    const session = await fetchAuthSession().catch(() => null);
    const idToken = session?.tokens?.idToken;

    if (idToken?.payload) {
      last.tokenKeys = Object.keys(idToken.payload || {});
      const emailFromToken =
        idToken.payload.email ||
        idToken.payload["custom:email"] ||
        idToken.payload["cognito:username"] ||
        idToken.payload.username ||
        "";

      // NOTE: only return if it looks like an email
      if (String(emailFromToken).includes("@")) {
        return String(emailFromToken).trim().toLowerCase();
      }
    }

    // 2) Try attributes
    const attrs = await fetchUserAttributes().catch(() => null);
    if (attrs) {
      last.attrKeys = Object.keys(attrs || {});
      const emailFromAttrs = attrs.email || attrs["custom:email"] || "";
      if (emailFromAttrs) return String(emailFromAttrs).trim().toLowerCase();
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  console.warn("[AuthCallback] Missing email. Last seen:", last);
  throw new Error("MISSING_EMAIL_FROM_GOOGLE");
}

async function fetchProfileByEmail(email) {
  const base = apiBase();
  const url = `${base}/api/auth/profile?email=${encodeURIComponent(email)}`;

  const res = await fetch(url, { method: "GET", credentials: "include" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    const err = data?.error || res.statusText || "PROFILE_LOOKUP_FAILED";
    throw new Error(err);
  }
  return data; // { ok, userId, role, profile, user }
}

function routeForRole(role) {
  const r = String(role || "").toLowerCase();
  if (r === "lecturer") return "/lecturer/dashboard";
  if (r === "partner") return "/partner-welcome"; // keep/change to your actual partner route
  return "/student/dashboard";
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Signing you in...");

  useEffect(() => {
    (async () => {
      let email = "";
      try {
        // 1) Ensure Amplify finishes the Hosted UI redirect session
        email = await getMyEmailFromAmplify();
        if (!email) throw new Error("MISSING_EMAIL_FROM_GOOGLE");

        setMsg("Loading your profile...");

        // 2) Resolve role/profile from DynamoDB via your AuthHandler endpoint
        const out = await fetchProfileByEmail(email);

        // 3) Keep your current app logic working (dashboards expect currentUser)
        const user = out.user || { email, role: out.role, ...(out.profile || {}) };

        // Store in both (your app uses sessionStorage + localStorage fallback)
        sessionStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("currentUser", JSON.stringify(user));

        // 4) Go to correct dashboard
        navigate(routeForRole(out.role), { replace: true });
      } catch (e) {
        const errMsg = String(e?.message || e);
        console.error("AuthCallback error:", e);

        // ✅ If they authenticated with Google but do NOT have a profile yet:
        if (errMsg === "NO_ACCOUNT") {
          const oauthRole =
            (sessionStorage.getItem("oauthRole") || "student").toLowerCase() ===
            "lecturer"
              ? "lecturer"
              : "student";

          // optional: prefill name on signup page too
          let fullName = "";
          try {
            fullName = await getMyNameFromAmplify();
          } catch {}

          const qs =
            `?oauth=1` +
            (email ? `&email=${encodeURIComponent(email)}` : "") +
            (fullName ? `&name=${encodeURIComponent(fullName)}` : "");

          navigate(
            oauthRole === "lecturer"
              ? `/lecturer-sign-up${qs}`
              : `/student-sign-up${qs}`,
            { replace: true }
          );
          return;
        }

        setMsg(`Login failed: ${errMsg}`);

        // optional: send them back to login after a moment
        setTimeout(() => navigate("/login", { replace: true }), 1200);
      }
    })();
  }, [navigate]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>Auth Callback</div>
      <div style={{ marginTop: 10 }}>{msg}</div>
    </div>
  );
}