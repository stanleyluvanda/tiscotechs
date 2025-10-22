
// src/pages/ForgotVerify.jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { postJSON } from "../lib/api";
import { normalizeEmail, verifyResetPin } from "../lib/authState";

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

    // 1) Try server if available (optional)
    try {
      const res = await postJSON?.("/auth/password/verify", { email, code });
      if (res?.ok) {
        setLoading(false);
        navigate(`/forgot/reset?email=${encodeURIComponent(email)}&pin=${encodeURIComponent(code)}`);
        return;
      }
    } catch {
      // fall through to local dev flow
    }

    // 2) Local dev: verify from local store
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