// src/pages/AdminLogin.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

/* ----------------- Demo / fallback creds ----------------- */
const DEMO_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL || "admin@scholarsknowledge.com";
const DEMO_PASS = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

/* ----------------- Auth API base ----------------- */
const AUTH_BASE =
  (import.meta.env.VITE_API_BASE &&
    String(import.meta.env.VITE_API_BASE).trim()) ||
  (import.meta.env.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  "";

/* ----------------- Admin Auth API base (NEW) ----------------- */
const ADMIN_AUTH_BASE =
  (import.meta.env.VITE_ADMIN_AUTH_API_BASE &&
    String(import.meta.env.VITE_ADMIN_AUTH_API_BASE).trim()) ||
  "";

/* Are we in “serverless only” mode? */
const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "true").toLowerCase() ===
  "true";

function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

function stripTrailingSlashes(url) {
  return String(url || "").replace(/\/+$/, "");
}

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/admin/dashboard";

  // If already logged in, bounce to dashboard
  useEffect(() => {
    try {
      const existing = safeParse(localStorage.getItem("adminAuth"));
      if (existing) navigate(redirectTo, { replace: true });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.trim();

    // ===============================
    // 1) BACKEND MODE (DynamoDB)
    // ===============================
    // Keep your existing SERVERLESS toggle behavior:
    // - If you set VITE_SERVERLESS_MODE=false (i.e., backend mode), we call the backend.
    if (AUTH_BASE && !SERVERLESS) {
      try {
        // Prefer the dedicated Admin API if configured, otherwise fall back to AUTH_BASE
        const base = stripTrailingSlashes(ADMIN_AUTH_BASE || AUTH_BASE);

        const resp = await fetch(`${base}/admin/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password: pass,
            role: "admin", // keeps compatibility with your backend role checks
          }),
        });

        const data = await resp.json().catch(() => ({}));

        if (resp.ok && data && data.ok) {
          const user = data.user || {};
          const profile =
            user.profile && typeof user.profile === "object"
              ? user.profile
              : safeParse(user.profile) || {};

          const payload = {
            email: user.email || trimmedEmail,
            role: user.role || "admin",
            name: profile.name || "Site Administrator",
            profile,
            loggedInAt: new Date().toISOString(),
          };

          localStorage.setItem("adminAuth", JSON.stringify(payload));
          setLoading(false);
          navigate(redirectTo, { replace: true });
          return;
        }

        // Backend reachable but rejected → DO NOT fall back to demo
        setLoading(false);
        setError("Invalid admin email or password.");
        return;
      } catch (err) {
        console.warn("[AdminLogin] backend error:", err);
        // If backend is configured but unreachable, we also do NOT silently
        // fall back for security reasons.
        setLoading(false);
        setError(
          "Could not reach admin auth service. Please try again or contact support."
        );
        return;
      }
    }

    // ==========================================
    // 2) DEMO / LOCAL MODE ONLY (no backend)
    // ==========================================
    await new Promise((r) => r(0)); // tiny noop delay

    const ok =
      trimmedEmail.toLowerCase() === DEMO_EMAIL.toLowerCase() &&
      pass === DEMO_PASS;

    if (!ok) {
      setLoading(false);
      setError(
        "Invalid admin credentials. In demo mode, use the configured admin email and password."
      );
      return;
    }

    const payload = {
      email: trimmedEmail,
      role: "admin",
      name: "Site Administrator",
      loggedInAt: new Date().toISOString(),
      demo: true,
    };
    localStorage.setItem("adminAuth", JSON.stringify(payload));

    setLoading(false);
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
          <p className="text-slate-600 mt-1">
            Sign in to access the admin console.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="admin@scholarsknowledge.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="text-sm text-slate-600 hover:underline"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-slate-900 text-white px-5 py-2.5 font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}