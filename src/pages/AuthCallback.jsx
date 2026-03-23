// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

async function getMyNameFromAmplify() {
  let session = null;
  try {
    session = await fetchAuthSession();
    console.log("[AuthCallback] getMyNameFromAmplify session OK:", session);
  } catch (err) {
    console.error("[AuthCallback] getMyNameFromAmplify fetchAuthSession FAILED:", err);
  }

  const p = session?.tokens?.idToken?.payload || {};

  let attrs = null;
  try {
    attrs = await fetchUserAttributes();
    console.log("[AuthCallback] getMyNameFromAmplify attrs OK:", attrs);
  } catch (err) {
    console.error("[AuthCallback] getMyNameFromAmplify fetchUserAttributes FAILED:", err);
  }

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
    let session = null;
    try {
      session = await fetchAuthSession();
      console.log("[AuthCallback] fetchAuthSession OK:", session);
    } catch (err) {
      console.error("[AuthCallback] fetchAuthSession FAILED:", err);
      throw err; // ✅ do not swallow the real error
    }

    const idToken = session?.tokens?.idToken;

    if (idToken?.payload) {
      last.tokenKeys = Object.keys(idToken.payload || {});
      const emailFromToken =
        idToken.payload.email ||
        idToken.payload["custom:email"] ||
        idToken.payload["cognito:username"] ||
        idToken.payload.username ||
        "";

      console.log("[AuthCallback] token payload keys:", last.tokenKeys);
      console.log("[AuthCallback] emailFromToken:", emailFromToken);

      if (String(emailFromToken).includes("@")) {
        return String(emailFromToken).trim().toLowerCase();
      }
    }

    // 2) Try attributes
    let attrs = null;
    try {
      attrs = await fetchUserAttributes();
      console.log("[AuthCallback] fetchUserAttributes OK:", attrs);
    } catch (err) {
      console.error("[AuthCallback] fetchUserAttributes FAILED:", err);
      throw err; // ✅ do not swallow the real error
    }

    if (attrs) {
      last.attrKeys = Object.keys(attrs || {});
      const emailFromAttrs = attrs.email || attrs["custom:email"] || "";

      console.log("[AuthCallback] attribute keys:", last.attrKeys);
      console.log("[AuthCallback] emailFromAttrs:", emailFromAttrs);

      if (emailFromAttrs) return String(emailFromAttrs).trim().toLowerCase();
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  console.warn("[AuthCallback] Missing email. Last seen:", last);
  throw new Error("MISSING_EMAIL_FROM_GOOGLE");
}

async function fetchProfileByEmail(email) {
  const pick = (...vals) => {
    for (const v of vals) {
      const s = String(v || "").trim();
      if (s) return s;
    }
    return "";
  };

  const raw = pick(
    import.meta.env.VITE_PROFILE_API_BASE,
    import.meta.env.VITE_RESET_API_BASE,
    import.meta.env.VITE_POSTS_API_BASE
  );

  const base = raw ? raw.replace(/\/+$/, "") : "";
  const url = `${base}/api/auth/profile?email=${encodeURIComponent(email)}`;

  console.log("[AuthCallback] fetchProfileByEmail URL:", url);

  const res = await fetch(url, { method: "GET", credentials: "include" });
  const data = await res.json().catch(() => ({}));

  console.log("[AuthCallback] fetchProfileByEmail status:", res.status);
  console.log("[AuthCallback] fetchProfileByEmail data:", data);

  if (!res.ok || !data?.ok) {
    const err = data?.error || res.statusText || "PROFILE_LOOKUP_FAILED";
    throw new Error(err);
  }

  return data;
}

function routeForRole(role) {
  const r = String(role || "").toLowerCase();
  if (r === "lecturer") return "/lecturer/dashboard";
  if (r === "partner") return "/partner/welcome"; // ✅ fixed route
  return "/student/dashboard";
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Signing you in...");

  useEffect(() => {
    (async () => {
      let email = "";
      try {
        console.log("[AuthCallback] callback started");
        console.log("[AuthCallback] current URL:", window.location.href);

        email = await getMyEmailFromAmplify();
        console.log("[AuthCallback] resolved email:", email);

        if (!email) throw new Error("MISSING_EMAIL_FROM_GOOGLE");

        setMsg("Loading your profile...");

        const out = await fetchProfileByEmail(email);
        console.log("[AuthCallback] profile lookup result:", out);

        const user = out.user || { email, role: out.role, ...(out.profile || {}) };

        sessionStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("currentUser", JSON.stringify(user));

        console.log("[AuthCallback] navigating to:", routeForRole(out.role));
        navigate(routeForRole(out.role), { replace: true });
      } catch (e) {
        const errMsg = String(e?.message || e);
        console.error("[AuthCallback] FINAL ERROR:", e);

        if (errMsg === "NO_ACCOUNT") {
          const oauthRole =
            (sessionStorage.getItem("oauthRole") || "student").toLowerCase() ===
            "lecturer"
              ? "lecturer"
              : "student";

          let fullName = "";
          try {
            fullName = await getMyNameFromAmplify();
          } catch (nameErr) {
            console.error("[AuthCallback] getMyNameFromAmplify FAILED:", nameErr);
          }

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
        setTimeout(() => navigate("/login", { replace: true }), 2000);
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