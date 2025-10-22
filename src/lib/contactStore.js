// src/lib/contactStore.js
// Light client-side contact message store with threads + purge + unread counts.
// Conversation ID format: contact:conv:<studentId>__<lecturerId>

function safeParse(j) { try { return JSON.parse(j || ""); } catch { return null; } }
function trySet(k,v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }

const DAY = 24 * 60 * 60 * 1000;
const SEMESTER_MS = 5 * 30 * DAY; // ~5 months

/* ---------------- Emitter (one place) ---------------- */
function emitUpdate() {
  try { window.dispatchEvent(new Event("contact:updated")); } catch {}
}

/* ---------------- Keys ---------------- */
const convKey = (sid, lid) => `contact:conv:${String(sid)}__${String(lid)}`;
const studentThreadsKey = (sid) => `contact:threads:student:${sid}`;
const lecturerThreadsKey = (lid) => `contact:threads:lecturer:${lid}`;

/* ---------------- Helpers ---------------- */
function moveToFront(list = [], id) {
  const arr = Array.isArray(list) ? list.slice() : [];
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1);
  arr.unshift(id);
  return arr;
}

/* Keep legacy 'subject' -> 'title' */
function migrateTitleSubject(conv) {
  if (!conv) return conv;
  if (!conv.title && conv.subject) conv.title = conv.subject;
  return conv;
}

/* Normalize attachments for consistent shape on both sides */
function normImages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((img, i) => {
    const o = img || {};
    return {
      id: o.id || `img_${Date.now()}_${i}_${Math.random().toString(36).slice(2,6)}`,
      name: o.name || "image.jpg",
      // UI often keeps only thumb for download preview; dataUrl optional for inline preview
      thumb: o.thumb || o.dataUrl || null,
      dataUrl: o.dataUrl || null,
      mime: o.mime || "image/jpeg",
    };
  });
}
function normFiles(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((f, i) => {
    const o = f || {};
    return {
      id: o.id || `file_${Date.now()}_${i}_${Math.random().toString(36).slice(2,6)}`,
      name: o.name || "file",
      mime: o.mime || "application/octet-stream",
      // Data URL is optional; many UIs store the blob by id in IndexedDB
      dataUrl: o.dataUrl || null,
    };
  });
}

/* ---------------- Load / Save conversation ---------------- */
export function loadConversation(studentId, lecturerId) {
  const key = convKey(studentId, lecturerId);
  let raw = safeParse(localStorage.getItem(key));
  if (!raw) {
    const obj = {
      id: key,
      studentId,
      lecturerId,
      title: "",
      subject: "",
      messages: [],
      lastUpdated: 0,
      lastRead: { studentId: 0, lecturerId: 0 },
    };
    localStorage.setItem(key, JSON.stringify(obj));
    return obj;
  }
  raw = migrateTitleSubject(raw);
  raw.lastRead = raw.lastRead || { studentId: 0, lecturerId: 0 };
  raw.messages = Array.isArray(raw.messages) ? raw.messages : [];
  return raw;
}

export function saveConversation(conv, { silent = false } = {}) {
  const key = convKey(conv.studentId, conv.lecturerId);
  trySet(key, JSON.stringify(conv));
  if (!silent) emitUpdate();
  return conv;
}

/* ---------------- Thread membership ---------------- */
export function addToStudentThreads(studentId, convId) {
  const key = studentThreadsKey(studentId);
  const arr = safeParse(localStorage.getItem(key)) || [];
  const next = moveToFront(arr, convId);
  trySet(key, JSON.stringify(next));
  emitUpdate();
  return next;
}
export function addToLecturerThreads(lecturerId, convId) {
  const key = lecturerThreadsKey(lecturerId);
  const arr = safeParse(localStorage.getItem(key)) || [];
  const next = moveToFront(arr, convId);
  trySet(key, JSON.stringify(next));
  emitUpdate();
  return next;
}
export function removeFromStudentThreads(studentId, convId) {
  const key = studentThreadsKey(studentId);
  const arr = safeParse(localStorage.getItem(key)) || [];
  trySet(key, JSON.stringify(arr.filter(id => id !== convId)));
  emitUpdate();
}
export function removeFromLecturerThreads(lecturerId, convId) {
  const key = lecturerThreadsKey(lecturerId);
  const arr = safeParse(localStorage.getItem(key)) || [];
  trySet(key, JSON.stringify(arr.filter(id => id !== convId)));
  emitUpdate();
}

/* ---------------- Thread lists ---------------- */
export function loadStudentThreads(studentId) {
  const key = studentThreadsKey(studentId);
  const arr = safeParse(localStorage.getItem(key)) || [];
  return Array.isArray(arr) ? arr : [];
}
export function loadLecturerThreads(lecturerId) {
  const key = lecturerThreadsKey(lecturerId);
  const arr = safeParse(localStorage.getItem(key)) || [];
  return Array.isArray(arr) ? arr : [];
}

/* ---------------- Unread counts ---------------- */
export function computeUnreadForStudent(studentId) {
  const threadIds = loadStudentThreads(studentId);
  let total = 0;
  for (const convId of threadIds) {
    const c = safeParse(localStorage.getItem(convId));
    if (!c) continue;
    const lastRead = c.lastRead?.studentId || 0;
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    total += msgs.filter(m => m.authorRole === "lecturer" && m.createdAt > lastRead).length;
  }
  return total;
}
export function computeUnreadForLecturer(lecturerId) {
  const threadIds = loadLecturerThreads(lecturerId);
  let total = 0;
  for (const convId of threadIds) {
    const c = safeParse(localStorage.getItem(convId));
    if (!c) continue;
    const lastRead = c.lastRead?.lecturerId || 0;
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    total += msgs.filter(m => m.authorRole === "student" && m.createdAt > lastRead).length;
  }
  return total;
}

/* ---------------- Mark read ---------------- */
export function markStudentRead(studentId, lecturerId) {
  const conv = loadConversation(studentId, lecturerId);
  conv.lastRead = { ...(conv.lastRead || {}), studentId: Date.now() };
  saveConversation(conv);
}
export function markLecturerRead(studentId, lecturerId) {
  const conv = loadConversation(studentId, lecturerId);
  conv.lastRead = { ...(conv.lastRead || {}), lecturerId: Date.now() };
  saveConversation(conv);
}

/* ✅ New: mark all threads read for a student (optional helper) */
export function markAllReadForStudent(studentId) {
  const ids = loadStudentThreads(studentId);
  const nowTs = Date.now();
  for (const convId of ids) {
    const c = safeParse(localStorage.getItem(convId));
    if (!c) continue;
    c.lastRead = { ...(c.lastRead || {}), studentId: nowTs };
    trySet(convId, JSON.stringify(c));
  }
  emitUpdate();
}

/* ✅ New: unread count for a single conversation for a student (optional helper) */
export function computeUnreadInThreadForStudent(studentId, lecturerId) {
  const c = loadConversation(studentId, lecturerId);
  const lastRead = c.lastRead?.studentId || 0;
  const msgs = Array.isArray(c.messages) ? c.messages : [];
  return msgs.filter(m => m.authorRole === "lecturer" && m.createdAt > lastRead).length;
}

/* ---------------- Title helpers ---------------- */
export function setConversationTitle(studentId, lecturerId, title) {
  const t = (title || "").trim();
  const conv = loadConversation(studentId, lecturerId);
  conv.title = t;
  conv.subject = conv.subject || t;
  saveConversation(conv);
  return conv;
}
export function ensureConversationTitle(studentId, lecturerId, title) {
  const t = (title || "").trim();
  const conv = loadConversation(studentId, lecturerId);
  if (!conv.title && t) {
    conv.title = t;
    conv.subject = conv.subject || t; // legacy mirror
    saveConversation(conv);
  } else {
    saveConversation(conv, { silent: true });
  }
  return conv;
}

/* ---------------- Post message ---------------- */
export function postMessage({ studentId, lecturerId, authorRole, text, images = [], files = [], title, subject }) {
  const conv = loadConversation(studentId, lecturerId);

  // Optional title/subject
  const incomingTitle = (title || subject || "").trim();
  if (incomingTitle) {
    if (!conv.title) conv.title = incomingTitle;
    if (!conv.subject) conv.subject = incomingTitle; // legacy mirror
  }

  // Normalize attachments so both sides agree on shape
  const msg = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    authorRole, // "student" | "lecturer"
    text: (text || "").trim(),
    images: normImages(images),
    files: normFiles(files),
    createdAt: Date.now(),
  };

  conv.messages.push(msg);
  conv.lastUpdated = msg.createdAt;

  // Persist
  saveConversation(conv, { silent: true });

  const convId = convKey(studentId, lecturerId);
  addToStudentThreads(studentId, convId);
  addToLecturerThreads(lecturerId, convId);

  emitUpdate();
  return msg;
}

/* ---------------- Delete / Purge ---------------- */
export function deleteConversation(studentId, lecturerId) {
  const key = convKey(studentId, lecturerId);
  localStorage.removeItem(key);
  removeFromStudentThreads(studentId, key);
  removeFromLecturerThreads(lecturerId, key);
  emitUpdate();
}

export function purgeOldConversations() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith("contact:conv:"));
  const cutoff = Date.now() - SEMESTER_MS;
  for (const k of keys) {
    const c = safeParse(localStorage.getItem(k));
    if (!c) continue;
    if ((c.lastUpdated || 0) < cutoff) {
      const parts = k.replace("contact:conv:", "").split("__");
      const sid = parts[0] || "";
      const lid = parts[1] || "";
      localStorage.removeItem(k);
      if (sid) removeFromStudentThreads(sid, k);
      if (lid) removeFromLecturerThreads(lid, k);
    }
  }
  emitUpdate();
}

/* ---------------- Users helpers ---------------- */
export function getUserById(id) {
  const byId = safeParse(localStorage.getItem("usersById")) || {};
  return byId[id] || null;
}
export function listLecturersFor(university, faculty) {
  const users = safeParse(localStorage.getItem("users")) || [];
  return users.filter(u =>
    (u.role || "").toLowerCase() === "lecturer" &&
    (u.university || "") === (university || "") &&
    (u.faculty || "") === (faculty || "")
  );
}

/* Optional: manual nudge when UI wants to force-refresh */
export function touchContactStore() {
  emitUpdate();
}