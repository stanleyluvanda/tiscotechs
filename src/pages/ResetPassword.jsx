// src/pages/ForgotReset.jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { postJSON } from "../lib/api";
import {
  normalizeEmail,
  verifyResetPin,
  consumeResetPin,
  setLocalPassword,
  findLocalUserByEmail,
  markActiveUser,
} from "../lib/authState";

export default function ForgotReset() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const email = normalizeEmail(sp.get("email") || "");
  const pin = sp.get("pin") || "";

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!email || !pin) {
      setErr("Missing email or verification code.");
      return;
    }
    if (!p1 || p1 !== p2) {
      setErr("Passwords do not match.");
      return;
    }
    if (p1.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    // 1) Try server endpoint if available
    try {
      const res = await postJSON?.("/auth/password/reset", {
        email,
        code: pin,
        newPassword: p1,
      });

      if (res?.ok) {
        setOk("Password updated.");
        const u = res.user || findLocalUserByEmail(email);
        if (u) {
          markActiveUser(u);
          navigate(u.role === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard");
        }
        setLoading(false);
        return;
      }
    } catch {
      // fall back to local dev flow
    }

    // 2) Local dev fallback: verify PIN and set local password
    if (!verifyResetPin(email, pin)) {
      setErr("Invalid or expired code.");
      setLoading(false);
      return;
    }

    const changed = await setLocalPassword(email, p1);
    if (!changed) {
      setErr("Account not found locally.");
      setLoading(false);
      return;
    }

    consumeResetPin(email);
    setOk("Password updated.");
    const u = findLocalUserByEmail(email);
    if (u) {
      markActiveUser(u);
      navigate(u.role === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Set new password</h1>

      {err && <p className="mt-3 text-red-600">{err}</p>}
      {ok && <p className="mt-3 text-emerald-700">{ok}</p>}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="New password"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          autoComplete="new-password"
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="Confirm new password"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded px-3 py-2 font-medium disabled:opacity-60"
        >
          {loading ? "Updating…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}