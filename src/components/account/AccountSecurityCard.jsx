// src/components/account/AccountSecurityCard.jsx
import { useState } from "react";

/* ---------- Env ---------- */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "http://localhost:5001";

const ENV_CHANGE_PASSWORD_PATH = import.meta?.env?.VITE_CHANGE_PASSWORD_PATH; // optional override
const ENV_CHANGE_EMAIL_PATH   = import.meta?.env?.VITE_CHANGE_EMAIL_PATH;     // optional override

// If true, sign out after a successful change (default: false).
const AUTO_SIGN_OUT_AFTER_SECURITY_CHANGE =
  String(import.meta?.env?.VITE_AUTO_SIGN_OUT_AFTER_SECURITY_CHANGE ?? "false").toLowerCase() === "true";

/* ---------- Small helpers ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function updateLocalEmailEverywhere(newEmail) {
  // Update currentUser in both storages
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem("currentUser");
      if (!raw) continue;
      const u = JSON.parse(raw);
      u.email = newEmail;
      store.setItem("currentUser", JSON.stringify(u));
    } catch {}
  }
  // Update users[] and usersById maps if present
  try {
    const users = safeParse(localStorage.getItem("users")) || [];
    const byId  = safeParse(localStorage.getItem("usersById")) || {};
    const cur   = safeParse(localStorage.getItem("currentUser")) || {};
    const uid   = cur.uid || cur.id;

    if (uid) {
      // users[]
      const i = users.findIndex(u => (u.id || u.uid) === uid);
      if (i >= 0) {
        users[i] = { ...users[i], email: newEmail };
        localStorage.setItem("users", JSON.stringify(users));
      }
      // usersById
      if (byId[uid]) {
        byId[uid] = { ...byId[uid], email: newEmail };
        localStorage.setItem("usersById", JSON.stringify(byId));
      }
    }
  } catch {}
  try { window.dispatchEvent(new Event("user:updated")); } catch {}
}

async function updateLocalPasswordHash(userId, newPlainPassword) {
  const newHash = await sha256Hex(newPlainPassword);

  // users[]
  const users = safeParse(localStorage.getItem("users")) || [];
  const idx   = users.findIndex(u => (u.id || u.uid) === userId);
  if (idx >= 0) {
    users[idx] = { ...users[idx], passwordHash: newHash };
    delete users[idx].password; // scrub legacy plain text if present
    localStorage.setItem("users", JSON.stringify(users));
  }

  // usersById
  const map = safeParse(localStorage.getItem("usersById")) || {};
  if (map[userId]) {
    map[userId] = { ...map[userId], passwordHash: newHash };
    delete map[userId].password;
    localStorage.setItem("usersById", JSON.stringify(map));
  }

  // currentUser mirrors
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem("currentUser");
      if (!raw) continue;
      const u = JSON.parse(raw);
      if ((u.id || u.uid) === userId) {
        u.passwordHash = newHash;
        delete u.password;
        store.setItem("currentUser", JSON.stringify(u));
      }
    } catch {}
  }
}

/* ---- Build absolute URL from API_BASE + optional override ---- */
function buildApiUrl(defaultPath, override) {
  const base = API_BASE.replace(/\/+$/, "");
  const o = String(override || "").trim();
  if (!o) return `${base}${defaultPath}`;       // no override → use API_BASE
  if (/^https?:\/\//i.test(o)) return o;        // absolute override → use as-is
  return `${base}/${o.replace(/^\/+/, "")}`;    // relative override → join with API_BASE
}

function forceSignOut() {
  try { sessionStorage.clear(); } catch {}
  window.location.assign("/login");
}

/* ---------- Component ---------- */
export default function AccountSecurityCard({ user }) {
  // Prefer server UID; fallback to email for dev
  const stored =
    safeParse(sessionStorage.getItem("currentUser")) ||
    safeParse(localStorage.getItem("currentUser")) || {};
  const userId = stored.uid || user?.uid || stored.id || user?.id || stored.email || user?.email || "";

  const [showEmail, setShowEmail] = useState(false);
  const [showPass, setShowPass]   = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Account security</h3>
      <p className="mt-1 text-sm text-slate-600">
        Update your sign-in email or password. For security, you may be asked to re-authenticate.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {/* Keep the original palette: password (dark slate), email (blue) */}
        <button
          onClick={() => setShowPass(true)}
          className="w-full rounded-xl bg-slate-700 px-3 py-2 text-white"
        >
          Change password
        </button>
        <button
          onClick={() => setShowEmail(true)}
          className="w-full rounded-xl bg-blue-600 px-3 py-2 text-white"
        >
          Change email
        </button>
      </div>

      {showEmail && (
        <EmailModal
          userId={userId}
          currentEmail={String(stored.email || user?.email || "")}
          onClose={() => setShowEmail(false)}
        />
      )}
      {showPass && (
        <PasswordModal
          userId={userId}
          onLocalPasswordUpdate={updateLocalPasswordHash}
          onClose={() => setShowPass(false)}
        />
      )}
    </div>
  );
}

/* ===================== Email modal ===================== */
function EmailModal({ userId, currentEmail, onClose }) {
  const [email, setEmail]     = useState(currentEmail);
  const [password, setPwd]    = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [ok, setOk]           = useState(false);

  async function submit() {
    if (!email || !password) return;
    setErr(""); setOk(false); setLoading(true);

    const url = buildApiUrl("/api/auth/change-email", ENV_CHANGE_EMAIL_PATH);

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId, newEmail: email.trim(), currentPassword: password }),
    });

    const res = { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };

    if (!res.ok || res.json?.error) {
      setErr(res.json?.error || `Request failed (${res.status})`);
      setLoading(false);
      return;
    }

    // Mirror to local storage so login fallback matches server
    updateLocalEmailEverywhere(email.trim());

    // Notify dashboards immediately
    try {
      window.dispatchEvent(new CustomEvent("auth:emailChanged", { detail: { userId, email: email.trim() } }));
    } catch {}

    setOk(true);
    setLoading(false);
    setPwd(""); // clear secret field

    // KEEP MODAL OPEN; optionally sign out if env flag is true
    if (AUTO_SIGN_OUT_AFTER_SECURITY_CHANGE) {
      setTimeout(() => forceSignOut(), 600);
    }
  }

  return (
    <Modal onClose={onClose} title="Change email">
      <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {/* hidden decoys to reduce password-manager auto-fill */}
        <div style={{ position: "absolute", left: "-9999px", width: 0, height: 0, overflow: "hidden" }}>
          <input type="text" name="username" autoComplete="username" />
          <input type="password" name="password" autoComplete="current-password" />
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-700">New email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="you@school.edu"
              autoComplete="email"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Current password</span>
            <div className="mt-1 relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPwd(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                title={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {err && <p className="text-sm text-red-600 whitespace-pre-wrap">{err}</p>}
          {ok  && <p className="text-sm text-green-700">Email updated.</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-3 py-2">Close</button>
            <button type="submit" disabled={loading || !email || !password}
              className="rounded-xl bg-blue-600 px-3 py-2 text-white disabled:opacity-60">
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ===================== Password modal ===================== */
function PasswordModal({ userId, onClose, onLocalPasswordUpdate }) {
  const [currentPassword, setCur] = useState("");
  const [newPassword, setNew]     = useState("");
  const [confirm, setConf]        = useState("");
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState("");
  const [ok, setOk]               = useState(false);

  async function submit() {
    if (!currentPassword || !newPassword || !confirm) return;
    if (newPassword.length < 8 || newPassword !== confirm) {
      setErr("Passwords must match and be at least 8 characters."); return;
    }
    setErr(""); setOk(false); setLoading(true);

    const url = buildApiUrl("/api/auth/change-password", ENV_CHANGE_PASSWORD_PATH);

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });

    const res = { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };

    if (!res.ok || res.json?.error) {
      setErr(res.json?.error || `Request failed (${res.status})`);
      setLoading(false);
      return;
    }

    // Mirror to local storage so legacy login stays in sync
    try { await onLocalPasswordUpdate(userId, newPassword); } catch {}

    // Notify dashboards immediately
    try {
      window.dispatchEvent(new CustomEvent("auth:passwordChanged", { detail: { userId } }));
    } catch {}

    setOk(true);
    setLoading(false);
    setCur(""); setNew(""); setConf(""); // clear secrets

    // KEEP MODAL OPEN; optionally sign out if env flag is true
    if (AUTO_SIGN_OUT_AFTER_SECURITY_CHANGE) {
      setTimeout(() => forceSignOut(), 600);
    }
  }

  return (
    <Modal onClose={onClose} title="Change password">
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-slate-700">Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCur(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-700">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNew(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-700">Confirm new password</span>
          <input
            type="password"
            value={confirm}
            onChange={e => setConf(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </label>

        {err && <p className="text-sm text-red-600 whitespace-pre-wrap">{err}</p>}
        {ok  && <p className="text-sm text-green-700">Password updated.</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-xl px-3 py-2">Close</button>
          <button
            onClick={submit}
            disabled={loading || !currentPassword || !newPassword || !confirm}
            className="rounded-xl bg-slate-700 px-3 py-2 text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------- Modal shell ------------------------------- */
function Modal({ title, onClose, children }) {
  // Same compact width; not full-bleed
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}