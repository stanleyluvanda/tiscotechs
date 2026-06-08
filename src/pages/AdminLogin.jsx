// src/pages/AdminLogin.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import useNoIndex from "../lib/useNoIndex";
import { markActiveUser } from "../lib/authState.js";

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

/* ----------------- Support Admin token (NEW) ----------------- */
const SUPPORT_ADMIN_TOKEN =
  (import.meta.env.VITE_SUPPORT_ADMIN_TOKEN &&
    String(import.meta.env.VITE_SUPPORT_ADMIN_TOKEN).trim()) ||
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

function setSupportTokenSidecar() {
  // Keep Support token separate so we don't break existing adminAuth payload usage.
  if (!SUPPORT_ADMIN_TOKEN) return;

  try {
    localStorage.setItem(
      "supportAdminAuth",
      JSON.stringify({ token: SUPPORT_ADMIN_TOKEN })
    );
  } catch {
    // ignore
  }
}

export default function AdminLogin() {
  useNoIndex();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/admin/dashboard";

  // If already logged in, bounce to dashboard
  /*useEffect(() => {
    try {
      const existing = safeParse(localStorage.getItem("adminAuth"));
      if (existing) navigate(redirectTo, { replace: true });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);*/
  useEffect(() => {
  try {
    const existing = safeParse(localStorage.getItem("adminAuth"));

    if (existing?.role && String(existing.role).toLowerCase() === "admin") {
      const current =
        safeParse(sessionStorage.getItem("currentUser")) ||
        safeParse(localStorage.getItem("currentUser"));

      if (current?.role && String(current.role).toLowerCase() === "admin") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      localStorage.removeItem("adminAuth");
    }
  } catch {
    localStorage.removeItem("adminAuth");
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
            role: "admin",
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
            /*email: user.email || trimmedEmail,*/
            email: String(user.email || trimmedEmail || "").trim().toLowerCase(),
            role: user.role || "admin",
            name: profile.name || "Site Administrator",
            profile,
            loggedInAt: new Date().toISOString(),
          };

          // ✅ existing admin login storage (unchanged)
          /*localStorage.setItem("adminAuth", JSON.stringify(payload));*/
          // ✅ existing admin login storage (unchanged)
localStorage.setItem("adminAuth", JSON.stringify(payload));

// ✅ mirror admin into normal auth state so RequireRole can see role: "admin"
markActiveUser({
  ...payload,
  id: payload.email,
  uid: payload.email,
  role: "admin",
});

          // ✅ NEW: set support token for Support Inbox auth (sidecar key)
          setSupportTokenSidecar();

          // (optional) mirror into adminAuth for convenience, without changing structure used elsewhere
          if (SUPPORT_ADMIN_TOKEN) {
            try {
              const current = safeParse(localStorage.getItem("adminAuth")) || {};
              localStorage.setItem(
                "adminAuth",
                JSON.stringify({ ...current, supportToken: SUPPORT_ADMIN_TOKEN })
              );
            } catch {
              // ignore
            }
          }

          setLoading(false);
          navigate(redirectTo, { replace: true });
          return;
        }

        setLoading(false);
        setError("Invalid admin email or password.");
        return;
      } catch (err) {
        console.warn("[AdminLogin] backend error:", err);
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
      /*email: trimmedEmail,*/
      email: String(trimmedEmail || "").trim().toLowerCase(),
      role: "admin",
      name: "Site Administrator",
      loggedInAt: new Date().toISOString(),
      demo: true,
    };

    // ✅ existing admin login storage (unchanged)
    /*localStorage.setItem("adminAuth", JSON.stringify(payload));*/
localStorage.setItem("adminAuth", JSON.stringify(payload));

// ✅ mirror admin into normal auth state so RequireRole can see role: "admin"
markActiveUser({
  ...payload,
  id: payload.email,
  uid: payload.email,
  role: "admin",
});

    // ✅ NEW: set support token for Support Inbox auth (sidecar key)
    setSupportTokenSidecar();

    // (optional) mirror into adminAuth
    if (SUPPORT_ADMIN_TOKEN) {
      try {
        const current = safeParse(localStorage.getItem("adminAuth")) || {};
        localStorage.setItem(
          "adminAuth",
          JSON.stringify({ ...current, supportToken: SUPPORT_ADMIN_TOKEN })
        );
      } catch {
        // ignore
      }
    }

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