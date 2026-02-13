// src/components/VerifyGate.jsx
import { useEffect, useState } from "react";
import {
  startVerify,
  confirmVerify,
  isVerified,
  clearVerified,
  getLocalVerifyToken, // kept in case you use later
  setLocalVerifyToken, // kept in case you use later
} from "../lib/verifyGate";

function toLower(x) {
  return String(x || "").trim().toLowerCase();
}

export default function VerifyGate({ email, role = "student", onVerified }) {
  const mail = toLower(email || "");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [initialSent, setInitialSent] = useState(false); // 🔹 NEW

  // Only show if NOT verified for this email.
  useEffect(() => {
    if (!mail) return;
    const need = !isVerified(mail);
    setOpen(need);
    if (!need) {
      setInitialSent(false);
      setCode("");
      setErr("");
      setOk(false);
    }
  }, [mail]);

  // If AccountSecurityCard emits auth:emailChanged, clear verification for the NEW email.
  useEffect(() => {
    const onEmailChanged = (e) => {
      const nextEmail = e?.detail?.email || e?.detail?.newEmail || "";
      if (!nextEmail) return;
      clearVerified(nextEmail);
      setLocalVerifyToken(nextEmail, "");
      if (toLower(nextEmail) === mail) {
        setOpen(true);
        setInitialSent(false);
        setCode("");
        setErr("");
        setOk(false);
      }
    };
    window.addEventListener("auth:emailChanged", onEmailChanged);
    return () => window.removeEventListener("auth:emailChanged", onEmailChanged);
  }, [mail]);

  // 🔹 Auto-send a code once when the gate opens
  useEffect(() => {
    if (!open || !mail || initialSent) return;

    let cancelled = false;
    const run = async () => {
      setSending(true);
      setErr("");
      try {
        await startVerify(mail);
        if (!cancelled) {
          setInitialSent(true);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Could not send code.");
        }
      } finally {
        if (!cancelled) {
          setSending(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, mail, initialSent]);

  async function sendCode() {
    if (!mail) return;
    setErr("");
    setSending(true);
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
      await confirmVerify(mail, code.trim());

      // ✅ Mark UI verified
      setOk(true);

      // ✅ NEW (backwards compatible): notify parent + global listeners
      try {
        onVerified?.({ email: mail, role });
      } catch {}
      try {
        window.dispatchEvent(
          new CustomEvent("sk:verified", { detail: { email: mail, role } })
        );
      } catch {}

      // Close the gate shortly after
      setTimeout(() => setOpen(false), 600);
    } catch (e) {
      setErr(e?.message || "Invalid code.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* ✅ UPDATED HEADER (UI only) */}
        <div className="text-center">
          {/*<div className="inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
            Welcome to ScholarsKnowledge
          </div>*/}
          <div className="-mx-6 -mt-6 rounded-t-2xl bg-blue-50 px-6 py-3 text-center text-sm font-semibold text-blue-800">
  Welcome to ScholarsKnowledge
</div>

          <h3 className="mt-3 text-xl font-extrabold text-slate-900">
            Verify your email
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Enter the 6-digit code we sent to <b>{email}</b>. You only need to
            verify once for this email in this device and browser.
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
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