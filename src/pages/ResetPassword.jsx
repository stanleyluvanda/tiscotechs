// src/pages/ForgotReset.jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { postJSON } from "../lib/api";
import {
  normalizeEmail,
  verifyResetPin,
  consumeResetPin,
  findLocalUserByEmail,
  markActiveUser,
} from "../lib/authState";

/* ---------- Env ---------- */
const API_BASE =
  (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "http://localhost:5001";

const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "true").toLowerCase() === "true";

/* ---------- Small utils (mirror AccountSecurityCard) ---------- */
function safeParse(j) { try { return JSON.parse(j || ""); } catch { return null; } }
function toLower(x)   { return String(x || "").trim().toLowerCase(); }

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Update password hash in both buckets + currentUser (same logic family as AccountSecurityCard). */
async function setPasswordEverywhereByEmail(email, newPlain) {
  const emailLower = toLower(email);
  const newHash    = await sha256Hex(newPlain);

  const BUCKETS = [
    { listKey: "users",     byIdKey: "usersById" },
    { listKey: "lecturers", byIdKey: "lecturersById" },
  ];

  for (const b of BUCKETS) {
    const list = safeParse(localStorage.getItem(b.listKey)) || [];
    const map  = safeParse(localStorage.getItem(b.byIdKey)) || {};

    // array list
    const ix = list.findIndex(u => toLower(u?.email) === emailLower);
    if (ix >= 0) {
      list[ix] = { ...list[ix], passwordHash: newHash };
      localStorage.setItem(b.listKey, JSON.stringify(list));
    }

    // id map
    for (const k of Object.keys(map)) {
      const u = map[k];
      if (u && toLower(u?.email) === emailLower) {
        map[k] = { ...u, passwordHash: newHash };
      }
    }
    localStorage.setItem(b.byIdKey, JSON.stringify(map));
  }

  // currentUser/session
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem("currentUser");
      if (!raw) continue;
      const u = JSON.parse(raw);
      if (toLower(u?.email) === emailLower) {
        store.setItem("currentUser", JSON.stringify({ ...u, passwordHash: newHash }));
      }
    } catch {}
  }
}

/* ---------- Component ---------- */
export default function ForgotReset() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const email = normalizeEmail(sp.get("email") || "");
  const pin   = sp.get("pin") || ""; // provided by your Verify step

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [ok,  setOk]  = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setOk("");

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

    // 1) Try server path (Amplify/Lambda) unless in SERVERLESS dev mode
    if (!SERVERLESS) {
      try {
        const r = await fetch(`${API_BASE.replace(/\/+$/, "")}/confirm-email-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email,
            reason: "reset",
            code: String(pin || "").trim(),
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Invalid code");

        // Keep local stores consistent with AccountSecurityCard flows
        await setPasswordEverywhereByEmail(email, p1);

        setOk("Password updated.");
        const u = j.user || findLocalUserByEmail(email);
        if (u) {
          markActiveUser(u);
          navigate(u.role === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard");
        } else {
          navigate("/login");
        }
        setLoading(false);
        return;
      } catch (ex) {
        // fall through to local/dev flow
        // eslint-disable-next-line no-console
        console.warn("[ForgotReset] Backend confirm failed; using local flow:", ex?.message);
      }
    }

    // 2) Local/dev fallback: verify PIN and update locally
    if (!verifyResetPin(email, pin)) {
      setErr("Invalid or expired code.");
      setLoading(false);
      return;
    }

    await setPasswordEverywhereByEmail(email, p1);
    consumeResetPin(email);

    setOk("Password updated.");
    const u = findLocalUserByEmail(email);
    if (u) {
      markActiveUser(u);
      navigate(u.role === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard");
    } else {
      navigate("/login");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Set new password</h1>

      {err && <p className="mt-3 text-red-600">{err}</p>}
      {ok  && <p className="mt-3 text-emerald-700">{ok}</p>}

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