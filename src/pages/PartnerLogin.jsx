// src/pages/PartnerLogin.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

/* ---------- Helpers ---------- */
function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function now() {
  return Date.now();
}

function stripTrailingSlashes(x) {
  return String(x || "").trim().replace(/\/+$/, "");
}

/* ---------- Local reset-token helpers (partner only) ---------- */
// Store: localStorage["pwresetp:<token>"] = { partnerId, email, expiresAt }
function createPartnerResetToken(partnerId, email, ttlMinutes = 30) {
  const token =
    "p-" + partnerId + "-" + Math.random().toString(36).slice(2) + "-" + Date.now();
  const data = {
    partnerId,
    email: (email || "").trim().toLowerCase(),
    expiresAt: now() + ttlMinutes * 60_000,
  };
  try {
    localStorage.setItem(`pwresetp:${token}`, JSON.stringify(data));
  } catch {}
  return token;
}

function consumePartnerResetToken(token) {
  if (!token) return null;
  let raw = null;
  try {
    raw = localStorage.getItem(`pwresetp:${token}`);
  } catch {
    raw = null;
  }
  if (!raw) return null;
  const obj = safeParse(raw);
  try {
    localStorage.removeItem(`pwresetp:${token}`);
  } catch {}
  if (!obj || obj.expiresAt < now()) return null;
  return obj;
}

// Update partner password in localStorage (partners + partnersById)
async function setPartnerPassword(partnerId, newPlainPassword) {
  const newHash = await sha256Hex(newPlainPassword);
  const key = String(partnerId || "").toLowerCase();

  const arr = safeParse(localStorage.getItem("partners")) || [];
  const i = arr.findIndex(
    (p) =>
      String(p.id || "") === String(partnerId || "") ||
      (p.email && String(p.email).trim().toLowerCase() === key)
  );
  if (i >= 0) {
    arr[i] = { ...arr[i], passwordHash: newHash, password: undefined };
    try {
      localStorage.setItem("partners", JSON.stringify(arr));
    } catch {}
  }

  const map = safeParse(localStorage.getItem("partnersById")) || {};
  if (map[partnerId]) {
    map[partnerId] = { ...map[partnerId], passwordHash: newHash, password: undefined };
    try {
      localStorage.setItem("partnersById", JSON.stringify(map));
    } catch {}
  }
}

/* ---------- API bases ---------- */
const RESET_API_BASE = stripTrailingSlashes(
  (import.meta.env.VITE_PASSWORD_RESET_API_BASE &&
    String(import.meta.env.VITE_PASSWORD_RESET_API_BASE).trim()) ||
    (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim()) ||
    "http://localhost:5001"
);

const PARTNER_AUTH_API_BASE = stripTrailingSlashes(
  (import.meta.env.VITE_PARTNER_API_BASE &&
    String(import.meta.env.VITE_PARTNER_API_BASE).trim()) ||
    (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim()) ||
    "http://localhost:5001"
);

// If you later enable cookie sessions, set VITE_PARTNER_USE_COOKIES="1"
/*const USE_COOKIES = String(import.meta.env.VITE_PARTNER_USE_COOKIES || "").trim() === "1";*/
const USE_COOKIES = false;

/*const USE_SUPERTOKENS_TEST = false;*/
/*const USE_SUPERTOKENS_TEST =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";*/

  /* === SuperTokens controlled switch ======================= */
/*const USE_SUPERTOKENS_PROD = false;*/
const USE_SUPERTOKENS_PROD = true;

const USE_SUPERTOKENS_TEST =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  USE_SUPERTOKENS_PROD;

/*const SUPERTOKENS_TEST_API =*/
const SUPERTOKENS_TEST_API = import.meta.env.DEV

  /*"https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st";*/
  ? "/local-auth-st-prod"
  :"https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st-prod";

/* ---------- Page ---------- */
export default function PartnerLogin() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const modeParam = (sp.get("mode") || "login").toLowerCase();
  const mode = ["forgot", "reset"].includes(modeParam) ? modeParam : "login";
  const resetToken = sp.get("token") || "";

  /* ====== LOGIN STATE ====== */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  /* ====== Turnstile ====== */
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [turnToken, setTurnToken] = useState("");
  const [turnReady, setTurnReady] = useState(false);
  const SITE_KEY = "0x4AAAAAAB2QBaumf-KRvBPY";

  if (typeof window !== "undefined" && !window.onPartnerTurnstileSuccess) {
    window.onPartnerTurnstileSuccess = (token) => {
      try {
        console.log("✅ Partner Turnstile token:", token);
        sessionStorage.setItem("partnerTurnstileToken", token || "");
      } catch {}
    };
  }

  {/*useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled) return;
      if (!turnstileRef.current) return;
      if (!window.turnstile || typeof window.turnstile.render !== "function") {
        setTimeout(renderWidget, 200);
        return;
      }

      if (widgetIdRef.current && window.turnstile.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: SITE_KEY,
        theme: "light",
        action: "partner-login",
        retry: "auto",
        "refresh-expired": "auto",
        callback: (token) => {
          setTurnToken(token || "");
          setTurnReady(!!token);
          setErr("");
          try {
            window.onPartnerTurnstileSuccess?.(token);
          } catch {}
        },
        "expired-callback": () => {
          setTurnToken("");
          setTurnReady(false);
        },
        "error-callback": () => {
          setTurnToken("");
          setTurnReady(false);
        },
      });
    }

    if (mode === "login") renderWidget();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [SITE_KEY, mode]);*/}

  useEffect(() => {
  if (mode !== "login") return;

  let cancelled = false;
  let pollId = null;

  function renderWidget() {
    if (cancelled) return;
    if (!turnstileRef.current) return;
    if (!window.turnstile || typeof window.turnstile.render !== "function") return;

    if (widgetIdRef.current && window.turnstile.remove) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }

    // clear stale markup before re-render
    try {
      turnstileRef.current.innerHTML = "";
    } catch {}

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: SITE_KEY,
      theme: "light",
      action: "partner-login",
      retry: "auto",
      "refresh-expired": "auto",
      callback: (token) => {
        setTurnToken(token || "");
        setTurnReady(!!token);
        setErr("");
        try {
          sessionStorage.setItem("partnerTurnstileToken", token || "");
        } catch {}
        try {
          window.onPartnerTurnstileSuccess?.(token);
        } catch {}
      },
      "expired-callback": () => {
        setTurnToken("");
        setTurnReady(false);
        try {
          sessionStorage.removeItem("partnerTurnstileToken");
        } catch {}
      },
      "error-callback": () => {
        setTurnToken("");
        setTurnReady(false);
        try {
          sessionStorage.removeItem("partnerTurnstileToken");
        } catch {}
      },
    });
  }

  function ensureScriptAndRender() {
    if (window.turnstile && typeof window.turnstile.render === "function") {
      renderWidget();
      return;
    }

    const existing = document.querySelector(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );

    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.onload = () => {
        if (!cancelled) renderWidget();
      };
      document.head.appendChild(s);
    }

    // also poll briefly in case script tag already exists but has not finished loading
    pollId = window.setInterval(() => {
      if (window.turnstile && typeof window.turnstile.render === "function") {
        window.clearInterval(pollId);
        pollId = null;
        renderWidget();
      }
    }, 250);
  }

  ensureScriptAndRender();

  return () => {
    cancelled = true;
    if (pollId) window.clearInterval(pollId);
    if (widgetIdRef.current && window.turnstile?.remove) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }
  };
}, [SITE_KEY, mode]);

  /* ====== FORGOT STATE ====== */
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [partnerResetLink, setPartnerResetLink] = useState("");

  /* ====== RESET STATE ====== */
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  /* ====== Handlers ====== */
  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    const tokenFromSession = sessionStorage.getItem("partnerTurnstileToken") || "";
    if (!turnToken && !tokenFromSession) {
      setErr("Please complete the human verification.");
      return;
    }

    const em = (email || "").trim().toLowerCase();
    if (!em || !password) {
      setErr("Please enter email and password.");
      return;
    }

    // ✅ API-first login (DynamoDB) — works across browsers/devices
    try {
      const passwordHash = await sha256Hex(password);

      const loginPayload = {
        email: em,
        password,
        passwordHash,
        role: "partner",
        turnstileToken: turnToken || tokenFromSession || "",
      };

      

      let res;
let data;

if (USE_SUPERTOKENS_TEST) {
  res = await fetch(`${SUPERTOKENS_TEST_API}/migrate-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: em, password, role: "partner" }),
  });

  data = await res.json().catch(() => ({}));

  if (!res.ok && data?.error === "INVALID_CREDENTIALS") {
    res = await fetch(`${SUPERTOKENS_TEST_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, password, role: "partner" }),
    });

    data = await res.json().catch(() => ({}));
  }
} else {
  res = await fetch(`${PARTNER_AUTH_API_BASE}/api/auth/login/partner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(USE_COOKIES ? { credentials: "include" } : {}),
    body: JSON.stringify(loginPayload),
  });

  data = await res.json().catch(() => ({}));
}

      /*if (res.ok && data?.ok) {
        const user = data.user || data.partner || { email: em, role: "partner" };
        localStorage.setItem("partnerAuth", JSON.stringify(user));
        if (data.token) localStorage.setItem("partnerToken", String(data.token));
        nav("/partner/welcome", { replace: true });
        return;
      }*/
      if (res.ok && data?.ok) {
  const user = data.user || data.partner || { email: em, role: "partner" };

  const partnerUser = {
    ...user,
    id: user.id || user.userId || user.email || em,
    uid: user.uid || user.id || user.userId || user.email || em,
    email: user.email || em,
    role: "partner",
  };

  localStorage.setItem("partnerAuth", JSON.stringify(partnerUser));

  // ✅ Mirror partner into normal auth state for App.jsx RequireRole
  localStorage.setItem("currentUser", JSON.stringify(partnerUser));
  sessionStorage.setItem("currentUser", JSON.stringify(partnerUser));
  localStorage.setItem("currentUserId", partnerUser.id);
  sessionStorage.setItem("currentUserId", partnerUser.id);

  if (data.token) localStorage.setItem("partnerToken", String(data.token));
  nav("/partner/welcome", { replace: true });
  return;
}

      // Clean error for invalid creds
      if (res.status === 401 || String(data?.error || "").toLowerCase().includes("invalid")) {
        setErr("Invalid email or password.");
        return;
      }

      // Otherwise show backend error if present
      if (!res.ok) {
        setErr(`Login failed. (${data?.error || res.status || "UNKNOWN"})`);
        return;
      }
    } catch (apiErr) {
      console.warn("[PartnerLogin] API login error:", apiErr?.message || apiErr);
      setErr("Login failed. Please try again.");
      return;
    }
  };

  const onSubmitForgot = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSent(false);

    const em = (forgotEmail || "").trim().toLowerCase();
    if (!em) {
      setForgotError("Please enter your registered email.");
      return;
    }

    /*const partners = safeParse(localStorage.getItem("partners")) || [];
    const found = partners.find((p) => (p?.email || "").toLowerCase() === em);
    const partnerIdForReset = (found && (found.id || found.partnerId || found.email)) || em;

    const token = createPartnerResetToken(partnerIdForReset, em, 30);

    try {
      await fetch(`${RESET_API_BASE}/api/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, role: "partner", token }),
      });
    } catch (err) {
      console.warn("[Partner forgot] network error:", err);
    }

    setForgotSent(true);
  };*/
  let devToken = "";

try {
  const res = await fetch(
    USE_SUPERTOKENS_TEST
      ? `${SUPERTOKENS_TEST_API}/forgot`
      : `${RESET_API_BASE}/api/auth/forgot`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: em, role: "partner" }),
      /*body: JSON.stringify({
  email: em,
  role: "partner",
  token: em,
}),*/
    }
  );

  const data = await res.json().catch(() => ({}));

  const resetLink = data.devLink || data.resetUrl || "";

  if (resetLink) {
    try {
      const u = new URL(resetLink);
      devToken = u.searchParams.get("token") || "";
    } catch {}
  }

  if (!devToken && data.token) {
    devToken = String(data.token);
  }


  if (USE_SUPERTOKENS_TEST && devToken) {
  try {
    await fetch(`${RESET_API_BASE}/api/auth/forgot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: em,
        role: "partner",
        token: devToken,
      }),
    });
  } catch (err) {
    console.warn("[Partner SuperTokens forgot] Resend email send failed:", err);
  }
}

  if (devToken) {
    setPartnerResetLink(`/partner/login?mode=reset&token=${encodeURIComponent(devToken)}`);
  }
} catch (err) {
  console.warn("[Partner forgot] network error:", err);
}

setForgotSent(true);
};


  const onSubmitReset = async (e) => {
    e.preventDefault();
    setResetMsg("");

    if (!newPass || newPass.length < 6) {
      setResetMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPass !== newPass2) {
      setResetMsg("Passwords do not match.");
      return;
    }
    if (!resetToken) {
      setResetMsg("This reset link is invalid or expired. Please request a new one.");
      return;
    }

    /*const info = consumePartnerResetToken(resetToken);
    if (!info || !info.partnerId) {
      setResetMsg("This reset link is invalid or expired. Please request a new one.");
      return;
    }

    await setPartnerPassword(info.partnerId, newPass);

    const emailForReset = (info.email || info.partnerId || "").trim().toLowerCase();
    if (emailForReset) {
      try {
        await fetch(`${RESET_API_BASE}/api/auth/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailForReset, newPassword: newPass, role: "partner" }),
        });
      } catch (err) {
        console.warn("[Partner reset] backend reset failed:", err);
      }
    }*/

    try {
  const res = await fetch(
    USE_SUPERTOKENS_TEST
      ? `${SUPERTOKENS_TEST_API}/reset`
      : `${RESET_API_BASE}/api/auth/reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
     /*body: JSON.stringify({
  email: resetToken,
  newPassword: newPass,
  role: "partner",*/
  body: JSON.stringify({
  token: resetToken,
  newPassword: newPass,
  role: "partner",
}),
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    setResetMsg(data?.error || "Password reset failed.");
    return;
  }
} catch (err) {
  console.warn("[Partner reset] backend reset failed:", err);
  setResetMsg("Password reset failed. Please try again.");
  return;
}

    setResetMsg("Your password has been reset. You can now log in with your new password.");
    setTimeout(() => nav("/partner/login"), 4000);
  };

  /* ====== UI ====== */
  
  

  return (
  <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-50">
    {/* Cognito-like soft background blobs */}
    <div
      className="pointer-events-none absolute -left-[420px] -top-[260px] h-[900px] w-[900px] rounded-full blur-[55px] opacity-80"
      style={{
        background:
          "radial-gradient(circle at 35% 35%, rgba(190,214,255,.95), rgba(214,196,255,.55), rgba(214,196,255,0))",
      }}
    />
    <div
      className="pointer-events-none absolute -right-[380px] -top-[420px] h-[900px] w-[900px] rounded-full blur-[55px] opacity-80"
      style={{
        background:
          "radial-gradient(circle at 30% 30%, rgba(255,233,126,.95), rgba(255,206,120,.55), rgba(255,206,120,0))",
      }}
    />
    <div
      className="pointer-events-none absolute right-[-140px] top-[-80px] h-[780px] w-[780px] rounded-full blur-[70px] opacity-50"
      style={{
        background:
          "radial-gradient(circle at 40% 40%, rgba(223,196,255,.9), rgba(223,196,255,0))",
      }}
    />

    {/* Keep your existing layout above the background */}
    <main className="relative z-10 flex-1">
      <section className="max-w-md mx-auto px-4 py-12">            

          <div className="text-center">
            <img
              src="/images/1754280544595.jpeg"
              alt="ScholarsKnowledge Logo"
              className="mx-auto h-14 w-14 rounded-full object-cover"
            />
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">
              {mode === "forgot" ? "Forgot Password" : mode === "reset" ? "Reset Password" : "Partner Login"}
            </h1>
            {mode === "login" && <p className="mt-1 text-slate-600">Access your partner portal.</p>}
          </div>

          {mode === "login" && (
            <form onSubmit={submit} className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border">
              {err && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">{err}</div>
              )}

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="you@company.com"
                />
              </label>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Your password"
                />
              </label>

              {/*<div className="pt-1">
                <div ref={turnstileRef} />
                {!turnReady && (
                  <p className="mt-2 text-xs text-slate-500">
                    Human verification will appear here. If it doesn’t, refresh the page.
                  </p>
                )}
              </div>*/}

              <div className="pt-1">
               <div ref={turnstileRef} />
                {!turnReady && (
                 <p className="mt-2 text-xs text-slate-500">
                   Human verification is loading…
                 </p>
               )}
              </div>

              <button type="submit" className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90">
                Log In
              </button>

              <div className="text-sm text-slate-600 text-center">
                New partner?{" "}
                <Link to="/partner/signup" className="text-[#1a73e8] underline">
                  Create an account
                </Link>
              </div>

              <div className="text-center">
                <Link className="inline-block mt-2 text-[#1a73e8] underline text-sm" to="/partner/login?mode=forgot">
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={onSubmitForgot} className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border">
              {forgotError && (
                <p className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">
                  {forgotError}
                </p>
              )}

              {!forgotSent ? (
                <>
                  <p className="text-sm text-slate-700">
                    Enter your registered partner email. We’ll send a password reset link.
                  </p>
                  <label className="block">
                    <span className="block text-sm text-slate-600 mb-1">Email</span>
                    <input
                      type="email"
                      className="w-full border rounded px-3 py-2"
                      placeholder="you@company.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </label>
                  <button className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90">
                    Send reset link
                  </button>
                  <div className="text-center">
                    <Link className="inline-block mt-2 text-[#1a73e8] underline text-sm" to="/partner/login">
                      Back to login
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {/*<p className="text-sm text-slate-700">
                    If that email exists, we’ve sent a password reset link. Check your inbox and follow the link.
                  </p>*/}
                  <p className="text-sm text-slate-700">
  If that email exists, we’ve sent a password reset link.
</p>

{partnerResetLink && (
  <Link className="inline-block text-[#1a73e8] underline text-sm" to={partnerResetLink}>
    Open reset link
  </Link>
)}
                  <div className="text-center">
                    <Link className="inline-block mt-4 text-[#1a73e8] underline text-sm" to="/partner/login">
                      Back to login
                    </Link>
                  </div>
                </>
              )}
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={onSubmitReset} className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border">
              {resetMsg && (
                <p
                  className={`rounded px-3 py-2 ${
                    resetMsg.includes("invalid or expired")
                      ? "text-red-600 bg-red-50 border border-red-200"
                      : "text-green-700 bg-green-50 border border-green-200"
                  }`}
                >
                  {resetMsg}
                </p>
              )}

              <p className="text-sm text-slate-700">Choose a new password for your partner account.</p>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">New password</span>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">Confirm new password</span>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={newPass2}
                  onChange={(e) => setNewPass2(e.target.value)}
                  placeholder="Re-enter password"
                />
              </label>

              <button className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90">
                Set new password
              </button>

              <div className="text-center">
                <Link className="inline-block mt-2 text-[#1a73e8] underline text-sm" to="/partner/login">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </section>
      </main>

      {/*<footer className="bg-blue-900 text-white py-6 text-center text-sm">*/}
      <footer className="relative z-10 bg-blue-900 text-white py-6 text-center text-sm">
        © {new Date().getFullYear()} ScholarsKnowledge ·{" "}
        <a href="/login" className="underline">
          Contact Sales
        </a>
      </footer>
    </div>
  );
}