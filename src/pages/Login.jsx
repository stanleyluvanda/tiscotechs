// src/pages/Login.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  normalizeEmail,
  sha256Hex,
  markActiveUser
  } from "../lib/authState"; // single source of truth for auth rules

/* ---------- Local helpers kept from your file ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
function trySetItem(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
function now() { return Date.now(); }

/* Dev-aware Turnstile verification (bypass in dev; call Lambda in prod) */
const VERIFY_URL = (import.meta.env.VITE_TURNSTILE_VERIFY_URL || "").trim();
async function verifyTurnstileDevAware(token) {
  // Bypass in local dev or when explicitly allowed
  if (import.meta.env.MODE !== "production" || import.meta.env.VITE_SKIP_TURNSTILE === "true") {
    return { ok: true };
  }
  if (!VERIFY_URL) {
    console.warn("[turnstile] Missing VITE_TURNSTILE_VERIFY_URL at build time");
    return { ok: false };
  }
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Lambda expects { turnstileToken: "<token>" }
      body: JSON.stringify({ turnstileToken: token }),
    });
    const data = await res.json().catch(() => ({}));
    // accept either { ok: true } or { success: true }
    return { ok: !!(data?.ok ?? data?.success) };
  } catch (err) {
    console.error("[turnstile] verify error", err);
    return { ok: false, offline: true };
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const mode = (sp.get("mode") || "login").toLowerCase(); // 'login' | 'forgot' | 'reset'
  const initialRole = (sp.get("role") || "student").toLowerCase() === "lecturer" ? "lecturer" : "student";
  const [role, setRole] = useState(initialRole);

  useEffect(() => {
    const r = (sp.get("role") || "student").toLowerCase();
    setRole(r === "lecturer" ? "lecturer" : "student");
  }, [sp]);

  /* ====== LOGIN STATE ====== */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /* ====== Turnstile ====== */
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [turnToken, setTurnToken] = useState("");     // require a non-empty token
  const [turnReady, setTurnReady] = useState(false);  // optional UI state

  // Use .env site key, fall back to Cloudflare's always-pass test key
  const SITE_KEY = import.meta?.env?.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

  // Backend API base for verification / auth (use VITE_API_BASE if set)
  const API_BASE =
    (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
    "http://localhost:5001";

  // Ensure Turnstile API script is loaded exactly once
  useEffect(() => {
    const id = "cf-turnstile-api";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  // Make a global callback (handy for debugging & consistency)
  if (typeof window !== "undefined" && !window.onTurnstileSuccess) {
    window.onTurnstileSuccess = (token) => {
      try {
        console.log("✅ Turnstile token:", token);
        sessionStorage.setItem("turnstileToken", token || "");
      } catch {}
    };
  }

  // Render Turnstile once the script is available
  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled) return;
      if (!turnstileRef.current) return;
      if (!window.turnstile || typeof window.turnstile.render !== "function") {
        // try again shortly
        setTimeout(renderWidget, 200);
        return;
      }

      // If a widget exists (hot reloads), remove then re-render
      if (widgetIdRef.current && window.turnstile.remove) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: SITE_KEY,
        theme: "light",
        action: "login",
        retry: "auto",
        "refresh-expired": "auto",
        callback: (token) => {
          setTurnToken(token || "");
          setTurnReady(!!token);
          setError(""); // clear previous “complete verification” error
          try { window.onTurnstileSuccess?.(token); } catch {}
        },
        "expired-callback": () => {
          setTurnToken("");
          setTurnReady(false);
        },
        "error-callback": () => {
          setTurnToken("");
          setTurnReady(false);
        }
      });
    }

    // Only render on the login view
    if (mode === "login") {
      renderWidget();
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
      }
    };
  }, [SITE_KEY, mode]);

  // Optional: when role changes, reset the widget so each attempt solves afresh
  useEffect(() => {
    if (window.turnstile?.reset && widgetIdRef.current) {
      try { window.turnstile.reset(widgetIdRef.current); } catch {}
      setTurnToken("");
      setTurnReady(false);
    }
  }, [role]);

  /* ====== FORGOT STATE ====== */
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSentToken, setForgotSentToken] = useState("");
  const [forgotError, setForgotError] = useState("");

  /* ====== RESET STATE ====== */
  const token = sp.get("token") || "";
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  /* ====== Handlers ====== */
  const onSubmitLogin = async (e) => {
    e.preventDefault();
    setError("");

    // 1) Require a Turnstile token
    const tsToken = sessionStorage.getItem("turnstileToken") || turnToken;
    if (!tsToken) {
      setError("Please complete the human verification.");
      return;
    }

    // 2) Verify token (dev-bypass; server in prod)
    const v = await verifyTurnstileDevAware(tsToken);
    if (!v.ok) {
      setError(
        v.offline
          ? "Cannot reach verification service. Please try again."
          : "Human verification failed. Please try again."
      );
      try {
        if (window.turnstile?.reset && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
        }
      } catch {}
      setTurnToken("");
      setTurnReady(false);
      return;
    }

    // 3) Basic form checks
    const em = normalizeEmail(email); // ✅ single-source canonicalization
    if (!em || !password) {
      setError("Please enter email and password.");
      return;
    }

    /* ------------------------------------------------------------------ *
     * 4) SERVER-BASED LOGIN (preferred)
     * ------------------------------------------------------------------ */
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: em, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        // success — persist minimal identity (NO password)
        const { uid, email: serverEmail, role: serverRole } = data;

        // Store UID-first identity (your app looks for these keys)
        sessionStorage.setItem("authUserId", uid);
        sessionStorage.setItem("activeUserId", uid);
        sessionStorage.setItem("currentUserId", uid);
        sessionStorage.setItem("loggedInUserId", uid);

        // keep a minimal currentUser stub if you don't already have a full profile
        const stubUser = {
          uid,
          id: uid,
          email: serverEmail,
          role: (serverRole || role),
        };
        sessionStorage.setItem("currentUser", JSON.stringify(stubUser));
        localStorage.setItem("currentUser", JSON.stringify(stubUser));

        // Inform navbar in this tab
        window.dispatchEvent(new Event("auth:changed"));

        // scrub password from memory
        setPassword("");

        // ✅ route by role (matches your router paths)
        const finalRole = (serverRole || role || "student").toLowerCase();
        navigate(finalRole === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard");
        return;
      }

      // If server rejected, show friendly error and attempt legacy fallback below
      if (data?.error === "invalid_credentials") {
        // we'll fall through to legacy local auth check (for older local users)
      } else {
        // Other server errors
        setError(data?.error || "Login failed.");
        return;
      }
    } catch (err) {
      console.error("[login] network error:", err);
      // fall through to the legacy local auth flow
    }

    /* ------------------------------------------------------------------ *
     * 5) LEGACY FALLBACK (your existing localStorage auth)
     *     - keeps old behavior for pre-migration users
     * ------------------------------------------------------------------ */
    const users = safeParse(localStorage.getItem("users")) || [];
    const user = users.find(u =>
      (u?.role || "student") === role &&
      (u?.email || "").toLowerCase() === em
    );

    if (!user) { setError(`No ${role} account found for that email.`); return; }

    let ok = true;
    if (user.passwordHash) {
      const entered = await sha256Hex(password);
      ok = entered === user.passwordHash;
    } else if (user.password) {
      ok = password === user.password;
    }
    if (!ok) { setError("Incorrect password."); return; }

    // Mark ACTIVE (legacy)
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    for (const k of ["authUserId","activeUserId","currentUserId","loggedInUserId"]) {
      sessionStorage.setItem(k, user.id);
      trySetItem(k, user.id);
    }
    trySetItem("currentUser", JSON.stringify(user));

    // Inform navbar in this tab
    window.dispatchEvent(new Event("auth:changed"));

    // scrub password from memory
    setPassword("");

    // ✅ route by role (matches your router paths)
    navigate(role === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard");
  };

  // server-backed forgot handler
  const onSubmitForgot = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSentToken("");

    const em = normalizeEmail(forgotEmail); // ✅ single-source canonicalization
    if (!em) {
      setForgotError("Please enter your registered email.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: em }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setForgotError(data?.error || "Could not send reset link. Please try again.");
        return;
      }

      // DEV mode: server may return a devLink so you can click "Open reset link"
      if (data.devLink) {
        try {
          const u = new URL(data.devLink);
          const t = u.searchParams.get("token") || "";
          if (t) {
            setForgotSentToken(t);
            return;
          }
        } catch {}
      }

      // Fallback (prod or no devLink): show generic success
      setForgotSentToken("dummy");
    } catch (err) {
      console.error("[forgot] network error:", err);
      setForgotError("Network error. Please try again.");
    }
  };

  // server-verified reset handler
  const onSubmitReset = async (e) => {
    e.preventDefault();
    setResetMsg("");

    // client-side checks
    if (!newPass || newPass.length < 6) {
      setResetMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPass !== newPass2) {
      setResetMsg("Passwords do not match.");
      return;
    }
    const resetToken = (token || "").trim();
    if (!resetToken) {
      setResetMsg("This reset link is missing or invalid.");
      return;
    }

    try {
      // 1) Ask the server to verify the token and finalize the reset
      const res = await fetch(`${API_BASE}/api/auth/reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: newPass }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setResetMsg(data?.error || "This reset link is invalid or expired. Please request a new one.");
        return;
      }

      // 2) OPTIONAL (since your users live in localStorage): update local user password hash
      const users = safeParse(localStorage.getItem("users")) || [];
      let idx = -1;

      if (data.userId) {
        idx = users.findIndex(u => u.id === data.userId);
      }
      if (idx < 0 && data.email) {
        const em = normalizeEmail(data.email);
        idx = users.findIndex(u => normalizeEmail(u.email) === em);
      }

      if (idx >= 0) {
        const newHash = await sha256Hex(newPass);
        const updated = { ...users[idx], passwordHash: newHash, password: undefined };
        users[idx] = updated;
        localStorage.setItem("users", JSON.stringify(users));

        const byId = safeParse(localStorage.getItem("usersById")) || {};
        const uid = updated.id;
        if (uid && byId[uid]) {
          byId[uid] = { ...byId[uid], passwordHash: newHash, password: undefined };
          localStorage.setItem("usersById", JSON.stringify(byId));
        }
      }

      // 3) UX: success message then HARD logout + HARD redirect to login (immediate)
      setResetMsg("Your password has been reset. You can now log in with your new password.");

      try {
        const AUTH_KEYS = [
          "currentUser","users","usersById",
          "authUserId","activeUserId","currentUserId","loggedInUserId",
          "partnerAuth","adminAuth"
        ];
        AUTH_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
        AUTH_KEYS.forEach(k => { try { sessionStorage.removeItem(k); } catch {} });

        // also clear any trusted-device flags
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith("sk_trusted:") || k === "sk_device_id") {
            try { localStorage.removeItem(k); } catch {}
          }
        });
      } catch {}

      // Hard, full reload to login so no component from the dashboard ever mounts
      window.location.href = "/login";
    } catch (err) {
      console.error("[reset] network error:", err);
      setResetMsg("Network error. Please try again.");
    }
  };

  /* ====== Views ====== */
  const RoleTabs = (
    <div className="mt-6 grid grid-cols-2 rounded-lg overflow-hidden border border-slate-200">
      <button
        onClick={() => setRole("student")}
        className={`py-2 font-medium ${role==="student" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
        type="button"
      >
        Student
      </button>
      <button
        onClick={() => setRole("lecturer")}
        className={`py-2 font-medium ${role==="lecturer" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
        type="button"
      >
        Lecturer
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f0f6ff] via-white to-[#eef2ff]">
      <main className="flex-1">
        <section className="max-w-md mx-auto px-4 py-12">
          <div className="text-center">
            <img
              src="/images/1754280544595.jpeg"
              alt="ScholarsKnowledge Logo"
              className="mx-auto h-14 w-14 rounded-full object-cover"
            />
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">
              {mode === "forgot" ? "Forgot Password" : mode === "reset" ? "Reset Password" : "Log in"}
            </h1>
          </div>

          {/* ====== LOGIN ====== */}
          {mode === "login" && (
            <>
              {RoleTabs}

              <form onSubmit={onSubmitLogin} className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border">
                {error && (
                  <p className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">
                    {error}
                  </p>
                )}

                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">Email</span>
                  <input
                    type="email"
                    className="w-full border rounded px-3 py-2"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">Password</span>
                  <input
                    type="password"
                    className="w-full border rounded px-3 py-2"
                    placeholder="Your password"
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                  />
                </label>

                {/* Cloudflare Turnstile widget container */}
                <div className="pt-1">
                  <div ref={turnstileRef} />
                  {!turnReady && (
                    <p className="mt-2 text-xs text-slate-500">
                      Human verification will appear here. If it doesn’t, refresh the page.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90"
                >
                  Log in
                </button>

                <div className="text-sm text-slate-600 text-center">
                  Don’t have an account?{" "}
                  {role === "lecturer" ? (
                    <Link className="text-[#1a73e8] underline" to="/lecturer-sign-up">Create Lecturer account</Link>
                  ) : (
                    <Link className="text-[#1a73e8] underline" to="/student-sign-up">Create Student account</Link>
                  )}
                </div>

                <div className="text-center">
                  <Link className="inline-block mt-2 text-[#1a73e8] underline text-sm" to="/login?mode=forgot">
                    Forgot password?
                  </Link>
                </div>
              </form>
            </>
          )}

          {/* ====== FORGOT PASSWORD ====== */}
          {mode === "forgot" && (
            <form onSubmit={onSubmitForgot} className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border">
              {forgotError && (
                <p className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">
                  {forgotError}
                </p>
              )}

              {!forgotSentToken ? (
                <>
                  <p className="text-sm text-slate-700">
                    Enter your registered email. We’ll send a password reset link.
                  </p>
                  <label className="block">
                    <span className="block text-sm text-slate-600 mb-1">Email</span>
                    <input
                      type="email"
                      className="w-full border rounded px-3 py-2"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e=>setForgotEmail(e.target.value)}
                    />
                  </label>
                  <button className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90">
                    Send reset link
                  </button>
                  <div className="text-center">
                    <Link className="inline-block mt-2 text-[#1a73e8] underline text-sm" to="/login">
                      Back to login
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-700">
                    If that email exists, we’ve sent a password reset link. (Dev mode: open it directly below.)
                  </p>
                  {forgotSentToken !== "dummy" && (
                    <div className="mt-3">
                      <Link
                        to={`/login?mode=reset&token=${encodeURIComponent(forgotSentToken)}`}
                        className="inline-block text-[#1a73e8] underline text-sm"
                      >
                        Open reset link
                      </Link>
                    </div>
                  )}
                  <div className="text-center">
                    <Link className="inline-block mt-4 text-[#1a73e8] underline text-sm" to="/login">
                      Back to login
                    </Link>
                  </div>
                </>
              )}
            </form>
          )}

          {/* ====== RESET PASSWORD ====== */}
          {mode === "reset" && (
            <form onSubmit={onSubmitReset} className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border">
              {resetMsg && (
                <p className={`rounded px-3 py-2 ${resetMsg.includes("reset link is invalid") ? "text-red-600 bg-red-50 border border-red-200" : "text-green-700 bg-green-50 border border-green-200"}`}>
                  {resetMsg}
                </p>
              )}

              <p className="text-sm text-slate-700">
                Choose a new password for your account.
              </p>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">New password</span>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={newPass}
                  onChange={e=>setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">Confirm new password</span>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={newPass2}
                  onChange={e=>setNewPass2(e.target.value)}
                  placeholder="Re-enter password"
                />
              </label>

              <button className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90">
                Set new password
              </button>

              <div className="text-center">
                <Link className="inline-block mt-2 text-[#1a73e8] underline text-sm" to="/login">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="bg-blue-900 text-white py-6 text-center text-sm">
        © {new Date().getFullYear()} ScholarsKnowledge · <a href="/login" className="underline">Contact Sales</a>
      </footer>
    </div>
  );
}