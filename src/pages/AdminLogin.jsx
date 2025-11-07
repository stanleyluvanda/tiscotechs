// src/pages/AdminLogin.jsx 
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const DEMO_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@scholarsknowledge.com";
const DEMO_PASS  = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/admin/dashboard";

  useEffect(() => {
    // If already logged in, bounce to dashboard
    try {
      const existing = JSON.parse(localStorage.getItem("adminAuth") || "null");
      if (existing) navigate(redirectTo, { replace: true });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Very basic demo validation (replace with real API later)
    await new Promise(r => setTimeout(r, 400));
    const ok = email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase() && pass === DEMO_PASS;

    if (!ok) {
      setLoading(false);
      setError("Invalid admin credentials. Tip: use the demo email and password or set VITE_ADMIN_EMAIL / VITE_ADMIN_PASSWORD.");
      return;
    }

    const payload = {
      email: email.trim(),
      role: "admin",
      name: "Site Administrator",
      loggedInAt: new Date().toISOString(),
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
          <p className="text-slate-600 mt-1">Sign in to access the admin console.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="admin@scholarsknowledge.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="flex items-center gap-2">
              <input
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={e=>setPass(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={()=>setShowPass(s=>!s)}
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

        <div className="mt-4 text-xs text-slate-500 space-y-1">
          <div><b>Demo email:</b> {DEMO_EMAIL}</div>
          <div><b>Demo password:</b> {DEMO_PASS}</div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-blue-600 hover:underline">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}