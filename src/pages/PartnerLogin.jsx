// src/pages/PartnerLogin.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

/* ---------- Helpers (mirrors Login.jsx patterns) ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function now() { return Date.now(); }

/* Partner-specific reset tokens (avoid collision with student/lecturer) */
function createPartnerResetToken(partnerId, ttlMinutes = 30) {
  const token = `p-${partnerId}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const data = { partnerId, expiresAt: now() + ttlMinutes * 60_000 };
  localStorage.setItem(`pwresetp:${token}`, JSON.stringify(data));
  return token;
}
function consumePartnerResetToken(token) {
  const raw = localStorage.getItem(`pwresetp:${token}`);
  if (!raw) return null;
  const obj = safeParse(raw);
  if (!obj || obj.expiresAt < now()) {
    localStorage.removeItem(`pwresetp:${token}`);
    return null;
  }
  localStorage.removeItem(`pwresetp:${token}`); // one-time use
  return obj.partnerId;
}

/* Update partner password across both "partners" array and optional "partnersById" */
async function setPartnerPassword(partnerId, newPlainPassword) {
  const newHash = await sha256Hex(newPlainPassword);

  const arr = safeParse(localStorage.getItem("partners")) || [];
  const i = arr.findIndex(p => p.id === partnerId);
  if (i >= 0) {
    arr[i] = { ...arr[i], passwordHash: newHash, password: undefined };
    localStorage.setItem("partners", JSON.stringify(arr));
  }

  const map = safeParse(localStorage.getItem("partnersById")) || {};
  if (map[partnerId]) {
    map[partnerId] = { ...map[partnerId], passwordHash: newHash, password: undefined };
    localStorage.setItem("partnersById", JSON.stringify(map));
  }
}

/* ---------- Page ---------- */
export default function PartnerLogin() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const mode = (sp.get("mode") || "login").toLowerCase(); // 'login' | 'forgot' | 'reset'

  /* ====== LOGIN STATE ====== */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  /* ====== Turnstile (same pattern as Login.jsx) ====== */
  const turnstileRef = useRef(null);
  const widgetIdRef   = useRef(null);
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
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
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
          try { window.onPartnerTurnstileSuccess?.(token); } catch {}
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

    if (mode === "login") renderWidget();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
      }
    };
  }, [SITE_KEY, mode]);

  /* ====== FORGOT/RESET STATE ====== */
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSentToken, setForgotSentToken] = useState("");
  const [forgotError, setForgotError] = useState("");
  const resetToken = sp.get("token") || "";
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  /* ====== Handlers ====== */
  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    // Require a Turnstile token (state or session)
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

    const partners = safeParse(localStorage.getItem("partners")) || [];
    const user = partners.find(
      (p) => (p?.email || "").toLowerCase() === em
    );

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

  const onSubmitForgot = (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSentToken("");

    const em = (forgotEmail || "").trim().toLowerCase();
    if (!em) { setForgotError("Please enter your registered email."); return; }

    const partners = safeParse(localStorage.getItem("partners")) || [];
    const found = partners.find(p => (p?.email || "").toLowerCase() === em);

    // Do not reveal existence — behave as if sent either way
    if (!found) {
      setForgotSentToken("dummy");
      return;
    }
    const tok = createPartnerResetToken(found.id, 30);
    setForgotSentToken(tok);
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

    const partnerId = consumePartnerResetToken(resetToken);
    if (!partnerId) {
      setResetMsg("This reset link is invalid or expired. Please request a new one.");
      return;
    }

    await setPartnerPassword(partnerId, newPass);
    setResetMsg("Your password has been reset. You can now log in with your new password.");
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
              {mode === "forgot" ? "Forgot Password" : mode === "reset" ? "Reset Password" : "Partner Login"}
            </h1>
            {mode === "login" && (
              <p className="mt-1 text-slate-600">Access your partner portal.</p>
            )}
          </div>

          {/* ====== LOGIN ====== */}
          {mode === "login" && (
            <form onSubmit={submit} className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border">
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
                <span className="block text-sm text-slate-600 mb-1">Password</span>
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
                    Human verification will appear here. If it doesn’t, refresh the page.
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
                    Enter your registered partner email. We’ll send a password reset link.
                  </p>
                  <label className="block">
                    <span className="block text-sm text-slate-600 mb-1">Email</span>
                    <input
                      type="email"
                      className="w-full border rounded px-3 py-2"
                      placeholder="you@company.com"
                      value={forgotEmail}
                      onChange={e=>setForgotEmail(e.target.value)}
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
                  <p className="text-sm text-slate-700">
                    If that email exists, we’ve sent a password reset link. (Dev mode: open it directly below.)
                  </p>
                  {forgotSentToken !== "dummy" && (
                    <div className="mt-3">
                      <Link
                        to={`/partner/login?mode=reset&token=${encodeURIComponent(forgotSentToken)}`}
                        className="inline-block text-[#1a73e8] underline text-sm"
                      >
                        Open reset link
                      </Link>
                    </div>
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

          {/* ====== RESET PASSWORD ====== */}
          {mode === "reset" && (
            <form onSubmit={onSubmitReset} className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border">
              {resetMsg && (
                <p className={`rounded px-3 py-2 ${resetMsg.includes("invalid or expired") ? "text-red-600 bg-red-50 border border-red-200" : "text-green-700 bg-green-50 border border-green-200"}`}>
                  {resetMsg}
                </p>
              )}

              <p className="text-sm text-slate-700">
                Choose a new password for your partner account.
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
                <Link className="inline-block mt-2 text-[#1a73e8] underline text-sm" to="/partner/login">
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