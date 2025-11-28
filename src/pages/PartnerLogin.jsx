// src/pages/PartnerLogin.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

/* ---------- Helpers (mirrors Login.jsx patterns) ---------- */
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
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function now() {
  return Date.now();
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
  } catch {
    // ignore
  }
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
  } catch {
    // ignore
  }
  if (!obj || obj.expiresAt < now()) return null;
  return obj; // { partnerId, email, expiresAt }
}

// Update partner password in localStorage (partners + partnersById)
async function setPartnerPassword(partnerId, newPlainPassword) {
  const newHash = await sha256Hex(newPlainPassword);
  const key = String(partnerId || "").toLowerCase();

  // Update "partners" array – match by id OR by email
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
    } catch {
      // ignore
    }
  }

  // Update optional "partnersById" map (only if key exists)
  const map = safeParse(localStorage.getItem("partnersById")) || {};
  if (map[partnerId]) {
    map[partnerId] = { ...map[partnerId], passwordHash: newHash, password: undefined };
    try {
      localStorage.setItem("partnersById", JSON.stringify(map));
    } catch {
      // ignore
    }
  }
}

/* ---------- API bases ---------- */
// For sending reset *emails* (PasswordReset-API: eovdrymvq3)
const RESET_API_BASE =
  (import.meta.env.VITE_PASSWORD_RESET_API_BASE &&
    String(import.meta.env.VITE_PASSWORD_RESET_API_BASE).trim()) ||
  (import.meta.env.VITE_API_BASE &&
    String(import.meta.env.VITE_API_BASE).trim()) ||
  (import.meta.env.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  "http://localhost:5001";

// For general auth (kept for future; not critical right now)
const AUTH_API_BASE =
  (import.meta.env.VITE_API_BASE &&
    String(import.meta.env.VITE_API_BASE).trim()) ||
  (import.meta.env.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  "http://localhost:5001";

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

  /* ====== Turnstile (same pattern as Login.jsx) ====== */
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [turnToken, setTurnToken] = useState("");
  const [turnReady, setTurnReady] = useState(false);
  const SITE_KEY = "0x4AAAAAAB2QBaumf-KRvBPY";

  // Global callback (debug-friendly)
  if (typeof window !== "undefined" && !window.onPartnerTurnstileSuccess) {
    window.onPartnerTurnstileSuccess = (token) => {
      try {
        console.log("✅ Partner Turnstile token:", token);
        sessionStorage.setItem("partnerTurnstileToken", token || "");
      } catch {}
    };
  }

  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled) return;
      if (!turnstileRef.current) return;
      if (!window.turnstile || typeof window.turnstile.render !== "function") {
        setTimeout(renderWidget, 200);
        return;
      }
      // Remove prior widget (hot reloads)
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
          setErr(""); // clear any prior error
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
  }, [SITE_KEY, mode]);

  /* ====== FORGOT STATE (real email link) ====== */
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  /* ====== RESET STATE (uses local reset token map) ====== */
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  /* ====== Handlers ====== */
  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    // Require a Turnstile token (state or session)
    const tokenFromSession =
      sessionStorage.getItem("partnerTurnstileToken") || "";
    if (!turnToken && !tokenFromSession) {
      setErr("Please complete the human verification.");
      return;
    }

    const em = (email || "").trim().toLowerCase();
    if (!em || !password) {
      setErr("Please enter email and password.");
      return;
    }

    const partners = safeParse(localStorage.getItem("partners")) || [];
    const user = partners.find((p) => (p?.email || "").toLowerCase() === em);

    if (!user) {
      setErr("Invalid email or password.");
      return;
    }

    // Verify password (hash or plain compatibility)
    let ok = true;
    if (user.passwordHash) {
      const entered = await sha256Hex(password);
      ok = entered === user.passwordHash;
    } else if (user.password) {
      ok = password === user.password;
    }
    if (!ok) {
      setErr("Invalid email or password.");
      return;
    }

    localStorage.setItem("partnerAuth", JSON.stringify(user));
    nav("/partner/welcome", { replace: true });
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

    // Try to find the partner in localStorage (if present)
    const partners = safeParse(localStorage.getItem("partners")) || [];
    const found = partners.find((p) => (p?.email || "").toLowerCase() === em);

    // Decide what to use as "partnerId" for the reset map:
    // - prefer existing id
    // - then partnerId field (if any)
    // - then the email itself
    const partnerIdForReset =
      (found && (found.id || found.partnerId || found.email)) || em;

    // Always create a local reset token so the email link matches localStorage
    const token = createPartnerResetToken(partnerIdForReset, em, 30);

    // Call backend to send the email (ForgotPasswordFn),
    // passing the SAME token so the reset URL matches our local map.
    try {
      await fetch(`${RESET_API_BASE}/api/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, role: "partner", token }),
      });
      // Do not reveal whether the email exists.
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
      setResetMsg(
        "This reset link is invalid or expired. Please request a new one."
      );
      return;
    }

    const info = consumePartnerResetToken(resetToken);
    if (!info || !info.partnerId) {
      setResetMsg(
        "This reset link is invalid or expired. Please request a new one."
      );
      return;
    }

    // 1) Update localStorage (partners + partnersById) so current session works
    await setPartnerPassword(info.partnerId, newPass);

    // 2) Also update DynamoDB via /api/auth/reset on the password-reset API,
    //    using the email we stored in the token (or partnerId as fallback).
    const emailForReset = (info.email || info.partnerId || "")
      .trim()
      .toLowerCase();
    if (emailForReset) {
      try {
        await fetch(`${RESET_API_BASE}/api/auth/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailForReset,
            newPassword: newPass,
            role: "partner",
          }),
        });
      } catch (err) {
        console.warn("[Partner reset] backend reset failed:", err);
        // We don't block the UI on this; local reset already succeeded.
      }
    }

    setResetMsg(
      "Your password has been reset. You can now log in with your new password."
    );
    setTimeout(() => nav("/partner/login"), 1200);
  };

  /* ====== UI ====== */
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
              {mode === "forgot"
                ? "Forgot Password"
                : mode === "reset"
                ? "Reset Password"
                : "Partner Login"}
            </h1>
            {mode === "login" && (
              <p className="mt-1 text-slate-600">Access your partner portal.</p>
            )}
          </div>

          {/* ====== LOGIN ====== */}
          {mode === "login" && (
            <form
              onSubmit={submit}
              className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border"
            >
              {err && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">
                  {err}
                </div>
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
                <span className="block text-sm text-slate-600 mb-1">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Your password"
                />
              </label>

              {/* Cloudflare Turnstile (rendered via ref) */}
              <div className="pt-1">
                <div ref={turnstileRef} />
                {!turnReady && (
                  <p className="mt-2 text-xs text-slate-500">
                    Human verification will appear here. If it doesn’t, refresh
                    the page.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90"
              >
                Log In
              </button>

              <div className="text-sm text-slate-600 text-center">
                New partner?{" "}
                <Link
                  to="/partner/signup"
                  className="text-[#1a73e8] underline"
                >
                  Create an account
                </Link>
              </div>

              <div className="text-center">
                <Link
                  className="inline-block mt-2 text-[#1a73e8] underline text-sm"
                  to="/partner/login?mode=forgot"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          {/* ====== FORGOT PASSWORD (email reset link) ====== */}
          {mode === "forgot" && (
            <form
              onSubmit={onSubmitForgot}
              className="mt-6 space-y-4 bg:white/70 bg-white/70 rounded-2xl p-6 border"
            >
              {forgotError && (
                <p
                  className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2"
                  role="alert"
                >
                  {forgotError}
                </p>
              )}

              {!forgotSent ? (
                <>
                  <p className="text-sm text-slate-700">
                    Enter your registered partner email. We’ll send a password
                    reset link.
                  </p>
                  <label className="block">
                    <span className="block text-sm text-slate-600 mb-1">
                      Email
                    </span>
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
                    <Link
                      className="inline-block mt-2 text-[#1a73e8] underline text-sm"
                      to="/partner/login"
                    >
                      Back to login
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-700">
                    If that email exists, we’ve sent a password reset link.{" "}
                    Check your inbox and follow the link to set a new password.
                  </p>
                  <div className="text-center">
                    <Link
                      className="inline-block mt-4 text-[#1a73e8] underline text-sm"
                      to="/partner/login"
                    >
                      Back to login
                    </Link>
                  </div>
                </>
              )}
            </form>
          )}

          {/* ====== RESET PASSWORD (from email link) ====== */}
          {mode === "reset" && (
            <form
              onSubmit={onSubmitReset}
              className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border"
            >
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

              <p className="text-sm text-slate-700">
                Choose a new password for your partner account.
              </p>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">
                  New password
                </span>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">
                  Confirm new password
                </span>
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
                <Link
                  className="inline-block mt-2 text-[#1a73e8] underline text-sm"
                  to="/partner/login"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="bg-blue-900 text-white py-6 text-center text-sm">
        © {new Date().getFullYear()} ScholarsKnowledge ·{" "}
        <a href="/login" className="underline">
          Contact Sales
        </a>
      </footer>
    </div>
  );
}