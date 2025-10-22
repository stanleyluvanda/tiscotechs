// src/pages/ForgotStart.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { postJSON } from "../lib/api";
import { normalizeEmail, createResetPin } from "../lib/authState";

export default function ForgotStart() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(sp.get("email") || "");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setErr(""), [email]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    const eCanon = normalizeEmail(email);
    if (!eCanon) {
      setErr("Enter your email.");
      return;
    }
    setLoading(true);

    // 1) Try server endpoint if available
    try {
      const res = await postJSON?.("/auth/password/forgot", { email: eCanon });
      if (res?.ok) {
        setSent(true);
        setLoading(false);
        navigate(`/forgot/verify?email=${encodeURIComponent(eCanon)}`);
        return;
      }
    } catch {
      // fall through to local dev flow
    }

    // 2) Local dev flow: create PIN and proceed
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