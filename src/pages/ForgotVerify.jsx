
// src/pages/ForgotVerify.jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { normalizeEmail, verifyResetPin } from "../lib/authState";

/* --- env --- */
const API_BASE =
  (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "http://localhost:5001";

const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "true").toLowerCase() === "true";

export default function ForgotVerify() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const email = normalizeEmail(sp.get("email") || "");

  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const code = String(pin || "").trim();
    if (!code) {
      setErr("Enter the 6-digit code.");
      return;
    }

    setLoading(true);

    // 1) Try backend (Amplify/Lambda) unless we're in serverless-dev mode
    if (!SERVERLESS) {
      try {
        const r = await fetch(`${API_BASE.replace(/\/+$/, "")}/confirm-email-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            reason: "reset",
            code,
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Invalid or expired code");

        setLoading(false);
        navigate(`/forgot/reset?email=${encodeURIComponent(email)}&pin=${encodeURIComponent(code)}`);
        return;
      } catch (ex) {
        // fall through to local dev flow
        // console.warn("[ForgotVerify] Backend verify failed; using local flow:", ex?.message);
      }
    }

    // 2) Local dev: check against locally stored PIN
    if (!verifyResetPin(email, code)) {
      setLoading(false);
      setErr("Invalid or expired code.");
      return;
    }

    setLoading(false);
    navigate(`/forgot/reset?email=${encodeURIComponent(email)}&pin=${encodeURIComponent(code)}`);
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Enter code</h1>
      <p className="mt-2 text-sm text-slate-600">
        We sent a 6-digit code to {email || "your email"}.
      </p>

      {err && <p className="mt-3 text-red-600">{err}</p>}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="123456"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\s+/g, ""))}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded px-3 py-2 font-medium disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>
    </div>
  );
}