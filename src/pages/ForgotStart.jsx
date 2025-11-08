// src/pages/ForgotStart.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { normalizeEmail, createResetPin } from "../lib/authState";

/* ---------- Env ---------- */
const API_BASE =
  (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "http://localhost:5001";

const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "true").toLowerCase() === "true";

/* ---------- Component ---------- */
export default function ForgotStart() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(sp.get("email") || "");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear error on email change
  useEffect(() => setErr(""), [email]);

  // Optional: prefill from currentUser if empty
  useEffect(() => {
    if (email) return;
    try {
      const cur = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (cur?.email) setEmail(cur.email);
    } catch {}
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const eCanon = normalizeEmail(email);
    if (!eCanon) {
      setErr("Enter your email.");
      return;
    }

    setLoading(true);

    // 1) Production path: call Amplify/Lambda API to send a 6-digit code via Resend
    //    We use reason: "reset" so the same endpoint can also serve "verify" logic.
    if (!SERVERLESS) {
      try {
        const r = await fetch(`${API_BASE.replace(/\/+$/, "")}/start-email-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: eCanon, reason: "reset" }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        setSent(true);
        setLoading(false);
        navigate(`/forgot/verify?email=${encodeURIComponent(eCanon)}`);
        return;
      } catch (ex) {
        // Fall through to local dev flow
        // eslint-disable-next-line no-console
        console.warn("[ForgotStart] API send failed; using local dev flow:", ex?.message);
      }
    }

    // 2) Local dev flow (SERVERLESS=true): generate a PIN locally and continue
    const { pin } = createResetPin(eCanon);
    // eslint-disable-next-line no-console
    console.log("[DEV] Password reset PIN for", eCanon, "=>", pin);

    setSent(true);
    setLoading(false);
    navigate(`/forgot/verify?email=${encodeURIComponent(eCanon)}`);
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Forgot password</h1>

      {err && <p className="mt-3 text-red-600">{err}</p>}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded px-3 py-2 font-medium disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send code"}
        </button>
      </form>

      {sent && (
        <p className="mt-3 text-sm text-slate-600">
          If the email exists, we’ve sent a 6-digit code.
        </p>
      )}
    </div>
  );
}