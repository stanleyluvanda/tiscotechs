// src/components/VerifyGate.jsx

import { useEffect, useState } from "react";
import {
  startVerify,
  confirmVerify,
  isVerified,
  markVerified,            // (not used directly here, confirmVerify already calls it)
  clearVerified,           // used when email changes
  getLocalVerifyToken,
  setLocalVerifyToken
} from "../lib/verifyGate";

function toLower(x){ return String(x||"").trim().toLowerCase(); }

export default function VerifyGate({ email }) {
  const mail = toLower(email || "");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  // Rule: show only if NOT verified for this email.
  useEffect(() => {
    if (!mail) return;
    const need = !isVerified(mail);
    setOpen(need);
  }, [mail]);

  // If the app emits an "auth:emailChanged" event (your AccountSecurityCard already does),
  // we clear verification for the NEW email and re-open the gate.
  useEffect(() => {
    function onEmailChanged(e){
      const nextEmail = e?.detail?.email || e?.detail?.newEmail || "";
      if (!nextEmail) return;
      // Require re-verification for the new email
      clearVerified(nextEmail);
      setLocalVerifyToken(nextEmail, "");
      if (toLower(nextEmail) === mail) {
        setOpen(true);
      }
    }
    window.addEventListener("auth:emailChanged", onEmailChanged);
    return () => window.removeEventListener("auth:emailChanged", onEmailChanged);
  }, [mail]);

  async function sendCode() {
    if (!mail) return;
    setErr(""); setSending(true);
    try {
      await startVerify(mail);
    } catch (e) {
      setErr(e?.message || "Could not send code.");
    } finally {
      setSending(false);
    }
  }

  async function submit() {
    if (!mail || !code) return;
    setErr("");
    try {
      const res = await confirmVerify(mail, code.trim());
      // confirmVerify already marks verified and stores token
      setOk(true);
      setTimeout(() => setOpen(false), 600);
    } catch (e) {
      setErr(e?.message || "Invalid code.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">Verify your email</h3>
        <p className="mt-1 text-sm text-slate-600">
          Enter the 6-digit code we sent to <b>{email}</b>. You need to verify once for this email.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0,6))}
            className="w-full rounded-xl border px-3 py-2 tracking-[0.4em] text-center text-lg"
            placeholder="••••••"
            inputMode="numeric"
          />
          <button
            onClick={submit}
            className="rounded-xl bg-slate-800 px-4 py-2 text-white disabled:opacity-60"
            disabled={!code || code.length < 6}
          >
            Verify
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={sendCode}
            className="text-sm text-blue-600 hover:underline disabled:opacity-60"
            disabled={sending}
          >
            {sending ? "Sending…" : "Resend code"}
          </button>
          {ok && <span className="text-sm text-green-700">Verified ✅</span>}
        </div>

        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}