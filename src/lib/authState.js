// src/lib/authState.js
function safeParse(j) { try { return JSON.parse(j || ""); } catch { return null; } }

/* ================================
   Storage keys (single source)
================================= */
export const STORAGE = {
  CURRENT_USER: "currentUser",
  CURRENT_USER_ID: "currentUserId",
  ACTIVE_USER_ID: "activeUserId",
  AUTH_USER_ID: "authUserId",
  LOGGED_IN_USER_ID: "loggedInUserId", // legacy
  USERS: "users",
  USERS_BY_ID: "usersById",
  PIN_STORE: "passwordResetPins",      // { [email]: { pin, exp } }
};

/* ================================
   Canonical email + hashing (dev)
================================= */
export function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

export async function sha256Hex(str) {
  const enc = new TextEncoder().encode(String(str ?? ""));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ================================
   Logged-in user (YOUR ORIGINAL)
================================= */
// Read the "currentUser" first; fall back to the 4 id keys in either storage.
export function getLoggedInUser() {
  let u =
    safeParse(sessionStorage.getItem("currentUser")) ||
    safeParse(localStorage.getItem("currentUser")) ||
    null;

  if (u && (u.uid || u.id || u.email)) {
    // normalize
    return { ...u, uid: u.uid || u.id || u.email, role: (u.role || "student").toLowerCase() };
  }

  // legacy fallback by ids only
  const ids = [
    sessionStorage.getItem("authUserId"),
    sessionStorage.getItem("activeUserId"),
    sessionStorage.getItem("currentUserId"),
    sessionStorage.getItem("loggedInUserId"),
    localStorage.getItem("authUserId"),
    localStorage.getItem("activeUserId"),
    localStorage.getItem("currentUserId"),
    localStorage.getItem("loggedInUserId"),
  ].filter(Boolean);

  if (ids.length) {
    return {
      uid: ids[0],
      id: ids[0],
      role: (safeParse(localStorage.getItem("currentUser"))?.role ||
             safeParse(sessionStorage.getItem("currentUser"))?.role ||
             "student").toLowerCase()
    };
  }
  return null;
}

export function isAuthed() {
  return !!getLoggedInUser();
}

/* ================================
   “Active user” mirror (used on login/signup/reset)
================================= */
export function markActiveUser(user) {
  const stub = { ...user }; // never store raw password
  try {
    sessionStorage.setItem(STORAGE.CURRENT_USER, JSON.stringify(stub));
    localStorage.setItem(STORAGE.CURRENT_USER, JSON.stringify(stub));
    const id = user.id || user.uid || user.email;
    for (const k of [
      STORAGE.CURRENT_USER_ID,
      STORAGE.ACTIVE_USER_ID,
      STORAGE.AUTH_USER_ID,
      STORAGE.LOGGED_IN_USER_ID, // legacy
    ]) {
      sessionStorage.setItem(k, id);
      localStorage.setItem(k, id);
    }
  } catch {}
}

/* ================================
   Local users (dev fallback store)
================================= */
export function getLocalUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE.USERS) || "[]"); } catch { return []; }
}
export function getLocalUsersById() {
  try { return JSON.parse(localStorage.getItem(STORAGE.USERS_BY_ID) || "{}"); } catch { return {}; }
}
export function saveLocalUsers(users, byId) {
  try {
    localStorage.setItem(STORAGE.USERS, JSON.stringify(users || []));
    localStorage.setItem(STORAGE.USERS_BY_ID, JSON.stringify(byId || {}));
  } catch {}
}

export function findLocalUserByEmail(email) {
  const e = normalizeEmail(email);
  return getLocalUsers().find(u => normalizeEmail(u.email) === e) || null;
}

export async function verifyLocalPassword(user, plain) {
  if (!user?.passwordHash) return false;
  const h = await sha256Hex(plain);
  return h === user.passwordHash;
}

export async function setLocalPassword(email, newPassword) {
  const users = getLocalUsers();
  const byId = getLocalUsersById();
  const e = normalizeEmail(email);
  const idx = users.findIndex(u => normalizeEmail(u.email) === e);
  if (idx === -1) return false;
  const h = await sha256Hex(newPassword);
  users[idx].passwordHash = h;
  const id = users[idx].id;
  if (id && byId[id]) byId[id].passwordHash = h;
  saveLocalUsers(users, byId);
  return true;
}

export function persistLocalUser(user, passwordHash) {
  try {
    const users = getLocalUsers();
    const byId = getLocalUsersById();
    const u = { ...user, passwordHash };
    users.push(u);
    if (u.id) byId[u.id] = u;
    saveLocalUsers(users, byId);
  } catch {}
}

/* ================================
   PIN-based Forgot Password (dev)
================================= */
function getPinStore() {
  try { return JSON.parse(localStorage.getItem(STORAGE.PIN_STORE) || "{}"); } catch { return {}; }
}
function setPinStore(obj) {
  try { localStorage.setItem(STORAGE.PIN_STORE, JSON.stringify(obj || {})); } catch {}
}

export function createResetPin(email, ttlMs = 10 * 60 * 1000) {
  const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const exp = Date.now() + ttlMs;
  const store = getPinStore();
  store[normalizeEmail(email)] = { pin, exp };
  setPinStore(store);
  return { pin, exp };
}

export function verifyResetPin(email, pin) {
  const entry = getPinStore()[normalizeEmail(email)];
  if (!entry) return false;
  if (Date.now() > entry.exp) return false;
  return String(pin) === String(entry.pin);
}

export function consumeResetPin(email) {
  const store = getPinStore();
  delete store[normalizeEmail(email)];
  setPinStore(store);
}

/* ================================
   Convenience: stable per-device id
================================= */
export function getDeviceId() {
  try {
    let id = localStorage.getItem("sk_device_id");
    if (id) return id;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("sk_device_id", id);
    return id;
  } catch {
    return "dev_" + Math.random().toString(16).slice(2);
  }
}