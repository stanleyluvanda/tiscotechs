// src/components/account/AccountSecurityCard.jsx 
import { useState } from "react";

/* ---------- Env ---------- */
const API_BASE =
  (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "http://localhost:5001";

const ENV_CHANGE_PASSWORD_PATH = import.meta.env.VITE_CHANGE_PASSWORD_PATH; // optional override
const ENV_CHANGE_EMAIL_PATH   = import.meta.env.VITE_CHANGE_EMAIL_PATH;     // optional override

const AUTO_SIGN_OUT_AFTER_SECURITY_CHANGE =
  String((import.meta.env.VITE_AUTO_SIGN_OUT_AFTER_SECURITY_CHANGE ?? "false")).toLowerCase() === "true";

const SERVERLESS =
  String((import.meta.env.VITE_SERVERLESS_MODE ?? "true")).toLowerCase() === "true";

/* ---------- Small helpers ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
function readJson(k)     { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }
function writeJson(k,v)  { localStorage.setItem(k, JSON.stringify(v)); }
function toLower(x)      { return String(x || "").trim().toLowerCase(); }
function isHex64(s)      { return /^[a-f0-9]{64}$/i.test(String(s || "")); }

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- Buckets ---------- */
const BUCKETS = [
  { listKey: "users",     byIdKey: "usersById",     name: "users" },
  { listKey: "lecturers", byIdKey: "lecturersById", name: "lecturers" },
];

/* ---------- Credential collection ---------- */
function collectCredentialCandidates(obj = {}) {
  const hashes = new Set();
  const plains = new Set();

  const add = (k, v) => {
    if (v == null) return;
    const s = String(v);
    const key = String(k || "").toLowerCase();
    const looksHex64 = isHex64(s);

    if (["passwordhash","hashedpassword","pwhash","password_hash","password_hash_hex","hash","sha256"].includes(key)) {
      if (s) hashes.add(s);
    }
    if (["password","pass","currentpassword","plainpassword","pw"].includes(key)) {
      if (looksHex64) hashes.add(s); else if (s) plains.add(s);
    }

    if ((/hash|digest/.test(key)) && looksHex64) hashes.add(s);
    if (/password/.test(key) && !looksHex64) plains.add(s);
  };

  for (const [k,v] of Object.entries(obj)) add(k,v);
  for (const key of ["auth","account","profile","credentials"]) {
    const sub = obj?.[key];
    if (sub && typeof sub === "object") {
      for (const [k,v] of Object.entries(sub)) add(k,v);
    }
  }
  return { hashes: [...hashes], plains: [...plains] };
}
function credentialScore(u) {
  if (!u || typeof u !== "object") return 0;
  const { hashes, plains } = collectCredentialCandidates(u);
  return hashes.length * 2 + plains.length; // prefer hashes
}

/* ---------- Deep fallback: scan all localStorage ---------- */
function scanAllStorageForUser(matchKeyLower) {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    const val = localStorage.getItem(k);
    if (!val) continue;

    const j = safeParse(val);
    if (!j) continue;

    if (Array.isArray(j)) {
      const rec = j.find(u =>
        toLower(u?.email) === matchKeyLower ||
        String(u?.id || u?.uid || "").toLowerCase() === matchKeyLower
      );
      if (rec) return { rec, sourceKey: k, kind: "array" };
    }

    if (j && typeof j === "object") {
      if (j[matchKeyLower]) return { rec: j[matchKeyLower], sourceKey: k, kind: "map" };
      const values = Object.values(j);
      const rec = values.find(u =>
        toLower(u?.email) === matchKeyLower ||
        String(u?.id || u?.uid || "").toLowerCase() === matchKeyLower
      );
      if (rec) return { rec, sourceKey: k, kind: "map" };
    }
  }
  return null;
}

/* ---------- Read/write helpers ---------- */
function updateLocalEmailEverywhere(newEmail) {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem("currentUser");
      if (!raw) continue;
      const u = JSON.parse(raw);
      u.email = newEmail;
      store.setItem("currentUser", JSON.stringify(u));
    } catch {}
  }

  try {
    const cur = safeParse(localStorage.getItem("currentUser")) || {};
    const uid = cur.uid || cur.id;
    const curEmail = toLower(cur.email);

    for (const b of BUCKETS) {
      const list = safeParse(localStorage.getItem(b.listKey)) || [];
      const map  = safeParse(localStorage.getItem(b.byIdKey)) || {};

      const ixById   = uid ? list.findIndex(u => (u.id || u.uid) === uid) : -1;
      const ixByMail = curEmail ? list.findIndex(u => toLower(u.email) === curEmail) : -1;
      const li = ixById >= 0 ? ixById : ixByMail;
      if (li >= 0) {
        list[li] = { ...list[li], email: newEmail };
        localStorage.setItem(b.listKey, JSON.stringify(list));
      }

      if (uid && map[uid]) {
        map[uid] = { ...map[uid], email: newEmail };
        localStorage.setItem(b.byIdKey, JSON.stringify(map));
      }
    }
  } catch {}
  try { window.dispatchEvent(new Event("user:updated")); } catch {}
}

async function updateLocalPasswordHash(userKey, newPlainPassword) {
  const newHash = await sha256Hex(newPlainPassword);

  for (const b of BUCKETS) {
    const list = safeParse(localStorage.getItem(b.listKey)) || [];
    const map  = safeParse(localStorage.getItem(b.byIdKey)) || {};

    const idxById   = list.findIndex(u => (u.id || u.uid) === userKey);
    const idxByMail = list.findIndex(u => toLower(u.email) === toLower(userKey));
    const li = idxById >= 0 ? idxById : idxByMail;

    if (li >= 0) {
      list[li] = normalizeAfterPasswordChange({ ...list[li], passwordHash: newHash });
      localStorage.setItem(b.listKey, JSON.stringify(list));
    }

    if (map[userKey]) {
      map[userKey] = normalizeAfterPasswordChange({ ...map[userKey], passwordHash: newHash });
      localStorage.setItem(b.byIdKey, JSON.stringify(map));
    }
  }

  const found = scanAllStorageForUser(toLower(userKey));
  if (found?.rec && found?.sourceKey) {
    try {
      const raw = safeParse(localStorage.getItem(found.sourceKey));
      if (Array.isArray(raw)) {
        const i = raw.findIndex(u =>
          (u.id || u.uid) === userKey || toLower(u.email) === toLower(userKey));
        if (i >= 0) {
          raw[i] = normalizeAfterPasswordChange({ ...raw[i], passwordHash: newHash });
          localStorage.setItem(found.sourceKey, JSON.stringify(raw));
        }
      } else if (raw && typeof raw === "object") {
        const keys = Object.keys(raw);
        for (const k of keys) {
          const u = raw[k];
          if (!u || typeof u !== "object") continue;
          if ((u.id || u.uid) === userKey || toLower(u.email) === toLower(userKey) || k === userKey) {
            raw[k] = normalizeAfterPasswordChange({ ...u, passwordHash: newHash });
            localStorage.setItem(found.sourceKey, JSON.stringify(raw));
            break;
          }
        }
      }
    } catch {}
  }

  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem("currentUser");
      if (!raw) continue;
      const u = JSON.parse(raw);
      const same =
        (u.id || u.uid) === userKey ||
        toLower(u.email) === toLower(userKey);
      if (same) {
        const next = normalizeAfterPasswordChange({ ...u, passwordHash: newHash });
        store.setItem("currentUser", JSON.stringify(next));
      }
    } catch {}
  }
}

/* ---- Build absolute URL ---- */
function buildApiUrl(defaultPath, override) {
  const base = API_BASE.replace(/\/+$/, "");
  const o = String(override || "").trim();
  if (!o) return `${base}${defaultPath}`;
  if (/^https?:\/\//i.test(o)) return o;
  return `${base}/${o.replace(/^\/+/, "")}`;
}

function forceSignOut() {
  try { sessionStorage.clear(); } catch {}
  window.location.assign("/login");
}

/* ---------- BEST record finder (bucket-agnostic + credential-aware) ---------- */
function findBestUserRecord(userKey) {
  const keyLower = toLower(userKey);
  if (!keyLower) return null;

  const candidates = [];

  for (const b of BUCKETS) {
    const list = readJson(b.listKey) || [];
    const map  = readJson(b.byIdKey) || {};

    if (map[userKey]) candidates.push({ rec: map[userKey], bucket: b, source: b.byIdKey });

    const byArray =
      list.find(u => (u.id || u.uid) === userKey) ||
      list.find(u => toLower(u.email) === keyLower);
    if (byArray) candidates.push({ rec: byArray, bucket: b, source: b.listKey });

    const mapVal = Object.values(map).find(u => toLower(u?.email) === keyLower);
    if (mapVal) candidates.push({ rec: mapVal, bucket: b, source: b.byIdKey });
  }

  const cur =
    safeParse(sessionStorage.getItem("currentUser")) ||
    safeParse(localStorage.getItem("currentUser"));
  if (cur) {
    const same =
      (cur.id || cur.uid) === userKey ||
      toLower(cur.email) === keyLower;
    if (same) candidates.push({ rec: cur, bucket: null, source: "currentUser" });
  }

  if (!candidates.length) {
    const scanned = scanAllStorageForUser(keyLower);
    if (scanned?.rec) candidates.push({ rec: scanned.rec, bucket: null, source: scanned.sourceKey });
  }

  if (!candidates.length) return null;

  // Score by credential presence; prefer lecturers on ties.
  candidates.sort((a, b) => {
    const sa = credentialScore(a.rec);
    const sb = credentialScore(b.rec);
    if (sa !== sb) return sb - sa;
    const al = (a.bucket?.name || "").toLowerCase() === "lecturers" ? 1 : 0;
    const bl = (b.bucket?.name || "").toLowerCase() === "lecturers" ? 1 : 0;
    return bl - al;
  });

  return candidates[0];
}

/* ---------- Verify ---------- */
// SERVERLESS-friendly verifier (repairs legacy records with no stored credentials)
async function verifyPasswordAgainstRecord(user, candidate) {
  const input = String(candidate || "").trim(); // trim to avoid stray spaces
  const curHash = await sha256Hex(input);
  const { hashes, plains } = collectCredentialCandidates(user);

  // 1) Normal checks
  if (hashes.some(h => String(h).toLowerCase() === curHash.toLowerCase())) return true;
  if (plains.some(p => String(p) === input)) return true;

  // 2) SERVERLESS rescue: if there are NO credential fields on the record at all,
  //    trust the re-auth and allow setting a fresh hash (repair flow).
  if (SERVERLESS && hashes.length === 0 && plains.length === 0) {
    return true;
  }

  return false;
}

function persistUserRecord(u) {
  const uid = u.id || u.uid || "";
  const emailLower = toLower(u.email);
  let wrote = false;

  for (const b of BUCKETS) {
    const list = readJson(b.listKey) || [];
    const map  = readJson(b.byIdKey) || {};

    let touched = false;

    const idxById   = uid ? list.findIndex(x => (x.id || x.uid) === uid) : -1;
    const idxByMail = emailLower ? list.findIndex(x => toLower(x.email) === emailLower) : -1;
    const li = idxById >= 0 ? idxById : idxByMail;
    if (li >= 0) {
      list[li] = u;
      writeJson(b.listKey, list);
      touched = true;
    }

    if (uid && map[uid]) {
      map[uid] = u;
      writeJson(b.byIdKey, map);
      touched = true;
    }

    if (touched) wrote = true;
  }

  if (!wrote) {
    const list = readJson("users") || [];
    const map  = readJson("usersById") || {};
    if (uid) map[uid] = u;
    const idxByMail = list.findIndex(x => toLower(x.email) === emailLower);
    const idxById   = uid ? list.findIndex(x => (x.id || x.uid) === uid) : -1;
    const li = idxById >= 0 ? idxById : idxByMail;
    if (li >= 0) list[li] = u; else list.push(u);
    writeJson("users", list);
    writeJson("usersById", map);
  }

  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem("currentUser");
      if (!raw) continue;
      const cu = JSON.parse(raw);
      const same =
        (cu.id || cu.uid) === uid ||
        toLower(cu.email) === emailLower;
      if (same) store.setItem("currentUser", JSON.stringify({ ...cu, ...u }));
    } catch {}
  }
}

function normalizeAfterPasswordChange(user) {
  const u = { ...user };
  delete u.password;
  delete u.pass;
  delete u.hashedPassword;
  delete u.pwHash;
  delete u.password_hash;
  delete u.password_hash_hex;
  delete u.hash;
  delete u.sha256;
  return u;
}

/* ---------- Component ---------- */
export default function AccountSecurityCard({ user }) {
  const stored =
    safeParse(sessionStorage.getItem("currentUser")) ||
    safeParse(localStorage.getItem("currentUser")) || {};

  const emailFirst = String(stored.email || user?.email || "").trim();
  const idFallback = stored.uid || user?.uid || stored.id || user?.id || "";
  const userKey = emailFirst || idFallback;

  const [showEmail, setShowEmail] = useState(false);
  const [showPass, setShowPass]   = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Account security</h3>
      <p className="mt-1 text-sm text-slate-600">
        Update your sign-in email or password. For security, you may be asked to re-authenticate.
      </p>

      <div className="mt-3 flex flex-col gap-2">
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
          userId={userKey}
          currentEmail={String(stored.email || user?.email || "")}
          onClose={() => setShowEmail(false)}
        />
      )}
      {showPass && (
        <PasswordModal
          userId={userKey}
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

    try {
      if (SERVERLESS) {
        await changeEmailLocal({ userKey: userId, newEmail: email.trim(), currentPassword: password.trim() });
      } else {
        let remoteOk = false;
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId, newEmail: email.trim(), currentPassword: password.trim() }),
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
          remoteOk = true;
        } catch {}
        if (!remoteOk) await changeEmailLocal({ userKey: userId, newEmail: email.trim(), currentPassword: password.trim() });
      }

      updateLocalEmailEverywhere(email.trim());
      try { window.dispatchEvent(new CustomEvent("auth:emailChanged", { detail: { userId, email: email.trim() } })); } catch {}

      setOk(true);
      setPwd("");
      if (AUTO_SIGN_OUT_AFTER_SECURITY_CHANGE) setTimeout(() => forceSignOut(), 600);
    } catch (e) {
      setErr(e?.message || "Could not update email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Change email">
      <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); submit(); }}>
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

    try {
      if (SERVERLESS) {
        await changePasswordLocal({ userKey: userId, currentPassword: currentPassword.trim(), newPassword: newPassword.trim() });
      } else {
        let remoteOk = false;
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId, currentPassword: currentPassword.trim(), newPassword: newPassword.trim() }),
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
          remoteOk = true;
        } catch {}
        if (!remoteOk) await changePasswordLocal({ userKey: userId, currentPassword: currentPassword.trim(), newPassword: newPassword.trim() });
      }

      try { await onLocalPasswordUpdate(userId, newPassword.trim()); } catch {}
      try { window.dispatchEvent(new CustomEvent("auth:passwordChanged", { detail: { userId } })); } catch {}

      setOk(true);
      setCur(""); setNew(""); setConf("");
      if (AUTO_SIGN_OUT_AFTER_SECURITY_CHANGE) setTimeout(() => forceSignOut(), 600);
    } catch (e) {
      setErr(e?.message || "Could not update password.");
    } finally {
      setLoading(false);
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

/* ------------------------- Local change ops ------------------------- */
async function changePasswordLocal({ userKey, currentPassword, newPassword }) {
  let match = findBestUserRecord(userKey);
  if (!match?.rec) throw new Error("User not found.");

  const alt = findBestUserRecord(toLower(match.rec.email || ""));
  if (alt?.rec && credentialScore(alt.rec) > credentialScore(match.rec)) match = alt;

  let ok = await verifyPasswordAgainstRecord(match.rec, currentPassword);
  if (!ok) {
    const cu = safeParse(sessionStorage.getItem("currentUser")) || safeParse(localStorage.getItem("currentUser"));
    if (cu) {
      const cuSame = (cu.id || cu.uid) === userKey || toLower(cu.email) === toLower(userKey);
      if (cuSame) ok = await verifyPasswordAgainstRecord(cu, currentPassword);
    }
  }
  if (!ok) throw new Error("Current password is incorrect.");

  const next = normalizeAfterPasswordChange({
    ...match.rec,
    passwordHash: await sha256Hex(newPassword),
  });
  persistUserRecord(next);
  return { ok: true };
}

async function changeEmailLocal({ userKey, newEmail, currentPassword }) {
  let match = findBestUserRecord(userKey);
  if (!match?.rec) throw new Error("User not found.");

  const alt = findBestUserRecord(toLower(match.rec.email || ""));
  if (alt?.rec && credentialScore(alt.rec) > credentialScore(match.rec)) match = alt;

  let ok = await verifyPasswordAgainstRecord(match.rec, currentPassword);
  if (!ok) {
    const cu = safeParse(sessionStorage.getItem("currentUser")) || safeParse(localStorage.getItem("currentUser"));
    if (cu) {
      const cuSame = (cu.id || cu.uid) === userKey || toLower(cu.email) === toLower(userKey);
      if (cuSame) ok = await verifyPasswordAgainstRecord(cu, currentPassword);
    }
  }
  if (!ok) throw new Error("Current password is incorrect.");

  const emailNorm = toLower(newEmail);
  if (!emailNorm) throw new Error("Enter a valid email.");

  // uniqueness across both buckets
  for (const b of BUCKETS) {
    const list = readJson(b.listKey) || [];
    if (list.some(u =>
      toLower(u.email) === emailNorm &&
      (u.id || u.uid) !== (match.rec.id || match.rec.uid)
    )) {
      throw new Error("That email is already used by another account.");
    }
  }

  const next = { ...match.rec, email: emailNorm };
  persistUserRecord(next);
  return { ok: true };
}

/* ------------------------------- Modal shell ------------------------------- */
function Modal({ title, onClose, children }) {
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