// src/pages/LecturerDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { YEARS as YEARS_DATA, getPrograms as rawGetPrograms } from "../data/eduData.js";
import { computeUnreadForLecturer } from "../lib/contactStore";
import AccountSecurityCard from "../components/account/AccountSecurityCard.jsx";
import VerifyGate from "../components/VerifyGate";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";
// ⬇️ NEW import
import AttachmentUploader from "../components/upload/AttachmentUploader.jsx";
import SingleImageUploader from "../components/upload/SingleImageUploader.jsx";
//import { createPost as createPostOnServer } from "../lib/postsApi.js";  // ⬅️ ADD THIS
//import { createPost as createPostOnServer, postCommentToServer, postReplyToServer,} from "../lib/postsApi.js";//
import { createPost as createPostOnServer,deletePost as deletePostOnServer,postCommentToServer,postReplyToServer,} from "../lib/postsApi.js";


// ✅ ADD THIS HERE (top-level helper, before the component)

// 🔗 Simple backend helper for lecturer posts (same API as Student dashboard)
const POSTS_API_URL =
  "https://izhwiz3a17.execute-api.us-east-1.amazonaws.com/posts";
//const LECTURER_SCOPE = "lecturer-dashboard";
// IMPORTANT: use the SAME scope as StudentDashboard so both roles share one global posts JSON
// If your StudentDashboard uses a different scope name, put that exact same string here.


const LECTURER_SCOPE = "student-dashboard";

async function fetchLecturerProfileFromServer(email) {
  const r = await fetch(
    "https://eovdrymvq3.execute-api.us-east-1.amazonaws.com/api/auth/lecturer/get-profile",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = null; }
  return data;
}

/*async function updateLecturerProfileOnServer(patch) {
  const resp = await fetch(
    "https://eovdrymvq3.execute-api.us-east-1.amazonaws.com/api/auth/lecturer/update-profile",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  return resp.json();
}*/

const AUTH_BASE = "https://eovdrymvq3.execute-api.us-east-1.amazonaws.com";

async function updateLecturerProfile(patch, me) {
  // IMPORTANT: use the email from the loaded server profile, not localStorage
  const email = me?.email || me?.user?.email;
  const userId = me?.userId || me?.user?.userId; // include if your backend needs it

  if (!email) throw new Error("No email available for update-profile");

  const res = await fetch(`${AUTH_BASE}/api/auth/lecturer/update-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      userId,   // harmless if backend ignores
      ...patch, // e.g. { bannerUrl: "https://..." }
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}



// GET: load posts for this scope
async function fetchLecturerPostsFromServer() {
  try {
    const res = await fetch(
      `${POSTS_API_URL}?scope=${encodeURIComponent(LECTURER_SCOPE)}`
    );

    if (!res.ok) {
      console.warn("[LecturerDashboard] fetch posts status:", res.status);
      return null;
    }

    const data = await res.json();

    // ✅ Lambda returns { ok:true, scope, posts:[...] }
    const posts = Array.isArray(data?.posts) ? data.posts : [];

    return posts;
  } catch (err) {
    console.warn("[LecturerDashboard] failed to load posts from server", err);
    return null;
  }
}




// ✅ Admin video posts are stored on the server (S3/Lambda), not localStorage
const ADMIN_VIDEO_SCOPE = "admin-video-posts";

async function fetchAdminVideoPostsFromServer() {
  try {
    const res = await fetch(
      `${POSTS_API_URL}?scope=${encodeURIComponent(ADMIN_VIDEO_SCOPE)}`
    );
    if (!res.ok) {
      console.warn("[LecturerDashboard] fetch admin videos status:", res.status);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.posts) ? data.posts : [];
  } catch (err) {
    console.warn("[LecturerDashboard] failed to load admin videos", err);
    return [];
  }
}





// POST: save new posts – backend REQUIRES a non-empty "text" field
async function saveLecturerPostsToServer(list) {
  const items = Array.isArray(list) ? list : [list];
  if (!items.length) return;



  async function postCommentToServer(payload) {
  const url = `${POSTS_API_URL.replace(/\/+$/, "")}/comment`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Failed to save comment");
  return data; // { ok:true, postId, comment }
}


async function postCommentToServer(payload) {
  const res = await fetch(`${POSTS_API_URL}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const txt = await res.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { /* keep raw */ }

  if (!res.ok) throw new Error(data?.message || txt || `HTTP ${res.status}`);
  return data; // expect { ok:true, comment:{...} } or similar
}




async function postReplyToServer(payload) {
  const url = `${POSTS_API_URL.replace(/\/+$/, "")}/reply`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Failed to save reply");
  return data; // { ok:true, postId, commentId, reply }
}



  // 🔧 Normalize items to what the Lambda expects
  const wireItems = items.map((item) => {
    // Prefer existing text, otherwise derive from html or title/type
    const baseText =
      (item.text && String(item.text).trim()) ||
      stripHtml(item.html || "") ||
      (item.title ? String(item.title).trim() : "") ||
      (item.type ? String(item.type).trim() : "");

    const text = baseText || "Lecturer post";

    return {
      ...item,
      text, // ensure every item has a non-empty text
    };
  });

  // 👈 NEW: top-level text field for the Lambda
  const topLevelText =
    (wireItems[0] && String(wireItems[0].text || "").trim()) ||
    "Lecturer post";

  const payload = {
    scope: LECTURER_SCOPE,
    items: wireItems,
    text: topLevelText, // ✅ what the backend checks
  };

  try {
    const res = await fetch(POSTS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      console.warn(
        "[LecturerDashboard] save posts status:",
        res.status,
        bodyText
      );
      alert(
        "Could not save your post to the server. It may not be visible to other devices yet."
      );
    } else {
      console.log(
        "[LecturerDashboard] saved posts OK:",
        res.status,
        bodyText
      );
    }
  } catch (err) {
    console.warn("[LecturerDashboard] save posts failed", err);
    alert(
      "Could not save your post to the server. It may not be visible to other devices yet."
    );
  }
}





/* ---------------- Small utils ------------------ */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }

function stripAttachmentForStorage(a) {
  if (!a) return null;
  return {
    id: a.id || a.key || a.url,
    key: a.key,
    name: a.fileName || a.name || "file",
    fileName: a.fileName,
    mime: a.mime,
    type: a.type,
    size: a.size,
    // keep only URLs (global-safe). DO NOT keep base64 in localStorage.
    url: a.url || a.s3Url || null,
    s3Url: a.s3Url || null,
  };
}

function stripPostForStorage(p) {
  if (!p) return p;
  return {
    ...p,
    // remove huge fields if they exist
    image: undefined,
    dataUrl: undefined,

    // normalize attachments/files/images to only metadata
    attachments: Array.isArray(p.attachments)
      ? p.attachments.map(stripAttachmentForStorage).filter(Boolean)
      : [],
    images: Array.isArray(p.images)
      ? p.images.map(stripAttachmentForStorage).filter(Boolean)
      : [],
    files: Array.isArray(p.files)
      ? p.files.map(stripAttachmentForStorage).filter(Boolean)
      : [],

    comments: Array.isArray(p.comments)
      ? p.comments.map((c) => ({
          ...c,
          attachments: Array.isArray(c.attachments)
            ? c.attachments.map(stripAttachmentForStorage).filter(Boolean)
            : [],
          images: Array.isArray(c.images)
            ? c.images.map(stripAttachmentForStorage).filter(Boolean)
            : [],
          files: Array.isArray(c.files)
            ? c.files.map(stripAttachmentForStorage).filter(Boolean)
            : [],
          replies: Array.isArray(c.replies)
            ? c.replies.map((r) => ({
                ...r,
                attachments: Array.isArray(r.attachments)
                  ? r.attachments.map(stripAttachmentForStorage).filter(Boolean)
                  : [],
                images: Array.isArray(r.images)
                  ? r.images.map(stripAttachmentForStorage).filter(Boolean)
                  : [],
                files: Array.isArray(r.files)
                  ? r.files.map(stripAttachmentForStorage).filter(Boolean)
                  : [],
              }))
            : [],
        }))
      : [],
  };
}

function formatTimeAgo(input) {
  const t =
    typeof input === "number"
      ? input
      : Date.parse(input || "") || 0;

  if (!t) return "";

  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 60) return "Just now";
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;
  return new Date(t).toLocaleDateString();
}



function pickNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizePhoto(remote, fallback = "") {
  return pickNonEmpty(
    remote?.photoUrl,
    remote?.photoURL,
    remote?.avatarUrl,
    remote?.avatarURL,
    remote?.profilePhotoUrl,
    remote?.profilePhoto,
    fallback
  );
}

/*function safeSetLecturerPosts(nextPosts) {
  try {
    const slim = Array.isArray(nextPosts)
      ? nextPosts.map(stripPostForStorage)
      : nextPosts;
    localStorage.setItem("lecturerPosts", JSON.stringify(slim));
  } catch (e) {
    console.warn("[LecturerDashboard] Could not persist lecturerPosts:", e);
    // Optional: last resort — keep at least something small
    try {
      localStorage.setItem("lecturerPosts", "[]");
    } catch {}
  }
}*/



function safeSetLecturerPosts(nextPosts) {
  // ✅ backend is source of truth now — don't persist in localStorage
  // This helper is kept only so existing calls don't crash.
  return Array.isArray(nextPosts) ? nextPosts : [];
}




// ✅ PASTE HELPERS HERE
function getExt(name = "") {
  const n = String(name || "").trim();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i + 1).toLowerCase() : "";
}



function prettyBytes(bytes) {
  const n = Number(bytes);
  if (!isFinite(n) || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 10 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

// Best-effort filename from whatever we have (name/fileName/key/url)
function bestFileName(att = {}) {
  const raw =
    att.fileName ||
    att.name ||
    (att.key ? String(att.key).split("/").pop() : "") ||
    (att.url ? String(att.url).split("?")[0].split("#")[0].split("/").pop() : "") ||
    "file";

  let n = "";
  try { n = decodeURIComponent(String(raw)); } catch { n = String(raw); }
  n = n.trim() || "file";

  // optional: remove common UUID-ish prefixes: "c1764..._" or "uuid-...__"
  n = n.replace(/^[a-f0-9]{8,}[-_]{1,2}/i, "");      // hex-ish prefix_
  n = n.replace(/^att_(img|file)_\d+_[a-z0-9]+_/i, ""); // your local ids prefix
  return n || "file";
}

// Dedupe attachments in composer (no backend impact)
function dedupeAttachments(list = []) {
  const seen = new Set();
  const out = [];
  for (const a of list) {
    if (!a) continue;
    const name = bestFileName(a);
    const url = a.url || a.s3Url || a.dataUrl || "";
    const size = a.size || a.bytes || 0;
    const mime = a.mime || a.type || "";
    const key = `${name}__${url}__${size}__${mime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...a, name, fileName: name });
  }
  return out;
}



























function fileKind(att = {}) {
  const name = att.fileName || att.name || "file";
  const mime = String(att.mime || "").toLowerCase();
  const ext = getExt(name);

  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.includes("word") || ["doc", "docx"].includes(ext)) return "word";
  if (mime.includes("powerpoint") || ["ppt", "pptx"].includes(ext)) return "ppt";
  if (mime.includes("excel") || ["xls", "xlsx", "csv"].includes(ext)) return "xls";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "img";
  return "file";
}

function kindBadge(kind) {
  const map = {
    pdf: { label: "PDF", cls: "bg-red-600 text-white border-red-700" },
    word:{ label: "W",   cls: "bg-blue-600 text-white border-blue-700" },
    ppt: { label: "P",   cls: "bg-orange-600 text-white border-orange-700" },
    xls: { label: "X",   cls: "bg-emerald-600 text-white border-emerald-700" },
    img: { label: "IMG", cls: "bg-slate-700 text-white border-slate-800" },
    file:{ label: "FILE",cls: "bg-slate-200 text-slate-800 border-slate-300" },
  };
  const cfg = map[kind] || map.file;

  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] h-5 px-1.5 rounded-md border text-[10px] font-bold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}




// read only the admin-created video posts (raw read helper)
/*function readVideoPosts() {
  const arr = safeParse(localStorage.getItem("videoPosts")) || [];
  return Array.isArray(arr) ? arr : [];
}*/



function initials(name = "") {
  const [a = "", b = ""] = name.trim().split(/\s+/);
  return (a[0] || "L").toUpperCase() + (b[0] || "K").toUpperCase();
}

// ✅ Avatar/photo fallback (handles different property names)
function userPhoto(u = {}) {
  return (
    u.photoUrl ||
    u.photoURL ||
    u.photo ||
    u.avatarUrl ||
    u.avatarURL ||
    u.profilePhoto ||
    u.profilePhotoUrl ||
    u.profile?.photoUrl ||
    u.profile?.photoURL ||
    u.profile?.photo ||
    ""
  );
}

// ✅ Stable id fallback (prefer email-based id so it matches across pages/devices)
function userStableId(u = {}) {
  const direct = u.id || u.uid || u.userId || u.currentUserId || u.authUserId;
  if (direct) return String(direct);
  const email = (u.email || u.mail || "").trim().toLowerCase();
  return email ? `email:${email}` : "";
}


const YEARS_SAFE = Array.isArray(YEARS_DATA) && YEARS_DATA.length
  ? YEARS_DATA
  : ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

function safeGetPrograms(continent, country, university, faculty) {
  try {
    if (typeof rawGetPrograms === "function") {
      const arr = rawGetPrograms(continent, country, university, faculty);
      return Array.isArray(arr) ? arr : [];
    }
  } catch {}
  return [];
}
const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

/* Canonical lecturer profile href (also seeds it so other pages pick it up) */
function setLecturerProfileHref(path = "/lecturer-dashboard") {
  const KEYS = [
    "meProfileLinkLecturer",
    "lecturerProfileHref",
    // Some pages use a generic key; seed it too so it doesn't point to student dash
    "meProfileLink",
  ];
  try {
    KEYS.forEach(k => {
      sessionStorage.setItem(k, path);
      localStorage.setItem(k, path);
    });
  } catch {}
}
function getLecturerProfileHref() {
  return (
    sessionStorage.getItem("meProfileLinkLecturer") ||
    sessionStorage.getItem("lecturerProfileHref") ||
    sessionStorage.getItem("meProfileLink") ||
    localStorage.getItem("meProfileLinkLecturer") ||
    localStorage.getItem("lecturerProfileHref") ||
    localStorage.getItem("meProfileLink") ||
    "/lecturer-dashboard"
  );
}

/* For consistently showing title + name in UI */
function displayWithTitle(author, fallbackTitle, fallbackName) {
  if (author && /^(Mr\.|Miss|Madam|Dr\.|Ass\. Prof|Prof\.)\s/i.test(author)) return author;
  const t = (fallbackTitle || "").trim();
  const n = (fallbackName || "").trim();
  const base = author || n;
  return `${t ? t + " " : ""}${base}`;
}

/* -------- Audience helpers ---------- */
function audienceKey({ university, faculty, program, year }) {
  return `${university}__${faculty}__${program}__${year}`;
}
function facultyAudienceKey({ university, faculty }) {
  return `FACULTY__${university}__${faculty}`;
}
function facultyYearAudienceKey({ university, faculty, year }) {
  return `FACULTY__${university}__${faculty}__${year}`;
}

/* --- Attachments persisted to IndexedDB --- */
const DB_NAME = "sk_attachments";
const STORE = "files";
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, blob) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}
function dataURLtoBlob(dataUrl) {
  const [hdr, b64] = dataUrl.split(",");
  const mime = (hdr.match(/data:(.*?);base64/) || [, "application/octet-stream"])[1];
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
async function makeThumb(dataUrl, maxW = 360, maxH = 360, quality = 0.72) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.max(1, Math.round(img.width * r));
      const h = Math.max(1, Math.round(img.height * r));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
async function fileToDownscaledDataURL(file, maxW, maxH, quality = 0.84, targetKB = 480) {
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = blobUrl; });
    const ratio = Math.min(1, maxW / img.width, maxH / img.height);
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, w, h);
    let q = quality, dataURL = canvas.toDataURL("image/jpeg", q), TARGET = targetKB * 1024;
    while (dataURL.length * 0.75 > TARGET && q > 0.5) { q -= 0.06; dataURL = canvas.toDataURL("image/jpeg", q); }
    return dataURL;
  } finally { URL.revokeObjectURL(blobUrl); }
}
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ---- Attachment resolvers ---- */
function useAttachmentUrl(att, preferFull = true) {
  const [url, setUrl] = useState(
    att?.url || att?.dataUrl || (preferFull ? null : att?.thumb || null)
  );

  useEffect(() => {
    let toRevoke = null;
    let cancelled = false;

    // If we already have an S3 URL, just use it
    if (att?.url) return;

    if (!url && att?.id) {
      (async () => {
        const blob = await idbGet(att.id);
        if (cancelled) return;
        if (blob) {
          const obj = URL.createObjectURL(blob);
          toRevoke = obj; setUrl(obj);
        } else if (att.thumb) {
          setUrl(att.thumb);
        }
      })();
    }
    return () => { cancelled = true; if (toRevoke) URL.revokeObjectURL(toRevoke); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [att?.id]);
  return url;
}
function AttachmentImage({ att, className="", onClick, enlarge=false }) {
  const url = useAttachmentUrl(att, enlarge);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={att.name || "image"}
      className={className}
      onClick={onClick}
      loading="lazy"
    />
  );
}
/*function AttachmentLink({ att }) {
  const url = useAttachmentUrl(att, true);

  // ✅ show real name for both backend shapes
  const name = att?.fileName || att?.name || "file";
  const badge = kindBadge(fileKind(att));

  if (!url) {
    return (
      <span className="inline-flex items-center gap-2 text-slate-500">
        {badge}
        <span className="break-all">{name}</span>
      </span>
    );
  }

  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noopener noreferrer"
      className="underline inline-flex items-center gap-2"
      title={name}
    >
      {badge}
      <span className="break-all">{name}</span>
    </a>
  );
}*/


function AttachmentLink({ att }) {
  const url = useAttachmentUrl(att, true);

  const name = bestFileName(att);
  const kind = fileKind({ ...att, name, fileName: name });

  // only show size if you already have it (no HEAD request; no backend change)
  const sizeText = prettyBytes(att?.size || att?.bytes || att?.contentLength);

  const DownloadIcon = () => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  const content = (
    <span className="inline-flex items-center gap-2 min-w-0">
      {kindBadge(kind)}
      <span className="min-w-0">
        {/* truncate nicely but keep full name on hover */}
        <span className="block truncate max-w-[420px]" title={name}>
          {name}
        </span>
        {sizeText && (
          <span className="block text-[11px] text-slate-500 leading-4">
            {sizeText}
          </span>
        )}
      </span>
      <span className="ml-1 text-slate-500">
        <DownloadIcon />
      </span>
    </span>
  );

  if (!url) {
    return (
      <span className="group inline-flex items-center gap-2 text-slate-500">
        {content}
      </span>
    );
  }

  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noopener noreferrer"
      className="group underline inline-flex items-center gap-2 min-w-0"
      title={name}
    >
      {content}
    </a>
  );
}


















/* ImageGrid with paging */
function ImageGrid({
  images = [],
  onOpen,
  max = 3,
  tileClass = "h-40",
  cols = "grid-cols-2 md:grid-cols-3",
  className = "",
}) {
  const [start, setStart] = useState(0);
  const total = images.length;
  useEffect(() => { setStart(0); }, [total, max]);
  const canPrev = start > 0;
  const canNext = start + max < total;
  const visible = images.slice(start, Math.min(total, start + max));
  const openAt = (idx) => { if (typeof onOpen === "function") onOpen(start + idx); };

  return (
    <div className={`relative ${className}`}>
      <div className={`grid ${cols} gap-2`}>
        {visible.map((img, idx) => {
          const isLastTile = idx === visible.length - 1 && total > max && start === 0;
          return (
            <div key={`${(img.id || img.dataUrl || img.name || "img")}-${start}-${idx}`} className="relative">
              <AttachmentImage
                att={img}
                className={`w-full ${tileClass} object-cover rounded cursor-zoom-in`}
                onClick={() => openAt(idx)}
              />
              {isLastTile && (
                <button
                  type="button"
                  onClick={() => openAt(idx)}
                  className="absolute inset-0 rounded bg-black/50 text-white font-semibold text-sm md:text-base flex items-center justify-center"
                  title={`View ${total - max} more photos`}
                >
                  +{total - max} more
                </button>
              )}
            </div>
          );
        })}
      </div>
      {total > max && (
        <>
          <button
            type="button"
            aria-label="Previous images"
            onClick={(e) => { stop(e); setStart((s) => Math.max(0, s - max)); }}
            onMouseDown={stop}
            className={`absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 rounded-full shadow px-2 py-2 z-10 ${
              !canPrev ? "opacity-40 pointer-events-none" : ""
            }`}
            title="Previous"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next images"
            onClick={(e) => { stop(e); setStart((s) => Math.min(total - max, s + max)); }}
            onMouseDown={stop}
            className={`absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 rounded-full shadow px-2 py-2 z-10 ${
              !canNext ? "opacity-40 pointer-events-none" : ""
            }`}
            title="Next"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

/* Persist images/files for posts/comments/replies */
async function persistAttachments(images=[], files=[]) {
  const imgDescs = [];
  for (let i=0;i<images.length;i++) {
    const src = images[i];
    const id = `att_img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const blob = dataURLtoBlob(src.dataUrl);
    await idbSet(id, blob);
    const thumb = await makeThumb(src.dataUrl, 360, 360, 0.72);
    imgDescs.push({ id, name: src.name || "image.jpg", mime: blob.type || "image/jpeg", thumb });
  }
  const fileDescs = [];
  for (let i=0;i<files.length;i++) {
    const src = files[i];
    const id = `att_file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const blob = dataURLtoBlob(src.dataUrl);
    await idbSet(id, blob);
    fileDescs.push({ id, name: src.name || "file", mime: blob.type || src.mime || "application/octet-stream" });
  }
  return { imgDescs, fileDescs };
}

/* ---------- Persist active user ---------- */
function trySet(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
const ID_KEYS = ["authUserId", "activeUserId", "currentUserId", "loggedInUserId"];
function persistUserFull(user) {
  sessionStorage.setItem("currentUser", JSON.stringify(user));
  /*for (const k of ID_KEYS) sessionStorage.setItem(k, user.id);*/
  const stableId = userStableId(user) || user.id;
  for (const k of ID_KEYS) sessionStorage.setItem(k, stableId);

  trySet("currentUser", JSON.stringify(user));
  /*for (const k of ID_KEYS) trySet(k, user.id);*/
  for (const k of ID_KEYS) trySet(k, stableId);

  const users = safeParse(localStorage.getItem("users")) || [];
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = { ...users[idx], ...user };
  else users.push(user);
  trySet("users", JSON.stringify(users));
  const map = safeParse(localStorage.getItem("usersById")) || {};
  map[user.id] = { ...(map[user.id] || {}), ...user };
  trySet("usersById", JSON.stringify(map));
  window.dispatchEvent(new Event("auth:changed"));
}

/* ---------- Real flag image with fallback ---------- */
function countryToFlagEmoji(code = "") {
  if (!code || code.length !== 2) return "";
  const base = 127397;
  return code.toUpperCase().split("").map((c) => String.fromCodePoint(base + c.charCodeAt(0))).join("");
}
function FlagImage({ code = "", country = "", size = 20 }) {
  const lower = (code || "").toLowerCase();
  const src = lower ? `https://flagcdn.com/w40/${lower}.png` : "";
  const [err, setErr] = useState(false);
  const w = size * 1.6, h = size * 1.1;

  if (!lower || err) {
    const emoji = countryToFlagEmoji(code) || "🌍";
    return (
      <span
        className="inline-flex items-center justify-center rounded-[3px] bg-white/90 border border-slate-200 shadow-sm"
        style={{ width: w, height: h, fontSize: size * 0.9, lineHeight: `${h}px` }}
        title={country || code}
      >
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={src}
      width={w}
      height={h}
      className="inline-block rounded-[3px] border border-slate-200 shadow-sm object-cover"
      alt={`${country || code} flag`}
      title={country || code}
      onError={() => setErr(true)}
    />
  );
}
function facultyTermFromValue(v = "") {
  const s = (v || "").toLowerCase();
  if (s.includes("department")) return "Department";
  if (s.includes("college")) return "College";
  if (s.includes("school")) return "School";
  if (s.includes("faculty")) return "Faculty";
  return "Faculty";
}

/* Titles dropdown */
const TITLE_OPTIONS = ["Mr.", "Miss", "Madam", "Dr.", "Ass. Prof", "Prof."];

/* Post types (added "Video") */
const POST_TYPES = ["Notes","Announcement", "Assignments", "Scholarships", "Academic Books", "Researches/Thesis","Academic Essay","Video"];

/* --- Notify students: bump "new" signals for audience scopes --- */
function markNewSignal(audience, who = "lecturer") {
  const key = "newSignals";
  const map = safeParse(localStorage.getItem(key)) || {};
  const prev = map[audience] || { lecturer: 0, student: 0 };
  prev[who] = (prev[who] || 0) + 1;
  map[audience] = prev;
  localStorage.setItem(key, JSON.stringify(map));
  window.dispatchEvent(new Event("posts:updated"));
}

/* -------- YouTube helpers & embed ---------- */
function extractYouTubeId(input = "") {
  if (!input) return "";
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(s)) return s;            // bare ID
  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);   // youtu.be
  if (short?.[1]) return short[1];
  const watch = s.match(/[?&]v=([a-zA-Z0-9_-]{6,})/i);        // watch?v=
  if (watch?.[1]) return watch[1];
  const embed = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/i); // /embed/
  if (embed?.[1]) return embed[1];
  const shorts = s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i); // /shorts/
  if (shorts?.[1]) return shorts[1];
  return s; // fallback
}
function YouTubeEmbed({ idOrUrl, title = "YouTube video" }) {
  const vid = extractYouTubeId(idOrUrl || "");
  const src = `https://www.youtube.com/embed/${vid}`;
  return (
    <iframe
      className="block h-full w-full"
      src={src}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

/* -------- Error Boundary ------- */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error("Composer crashed:", err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <div className="text-sm text-red-700">
            The editor failed to load. Please reload the page. If this persists, check <code>eduData.js</code> exports.
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}

/* ======== Country normalization + broadcast (align with Student dashboard) ======== */
const RAW_NAME_TO_ISO = {
  "United States": "US","United Kingdom":"GB","Tanzania":"TZ","Kenya":"KE","Uganda":"UG","Rwanda":"RW","Burundi":"BI",
  "Ghana":"GH","Nigeria":"NG","South Africa":"ZA","Ethiopia":"ET","India":"IN","Canada":"CA","Australia":"AU","Germany":"DE",
  "France":"FR","Italy":"IT","Spain":"ES","China":"CN","Japan":"JP","Brazil":"BR","Mexico":"MX"
};
const canon = (s="") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const NAME_TO_ISO_CANON = Object.fromEntries(Object.entries(RAW_NAME_TO_ISO).map(([k,v]) => [canon(k), v]));
const normalizeCountry = (s="") => s.replace(/\s+/g," ").trim();
const isoFromCountryName = (country="") => NAME_TO_ISO_CANON[canon(country)] || "";
const ensureCountryCode = (country, countryCode) => {
  const cc = String(countryCode || "").toUpperCase().trim();
  if (cc.length === 2) return cc;
  return isoFromCountryName(country) || "";
};
function saveAndBroadcastUser(next) {
  try { localStorage.setItem("currentUser", JSON.stringify(next)); } catch {}
  try { sessionStorage.setItem("currentUser", JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event("user:updated"));
}


function TrashIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}





/* ------------------------ Main Component ------------------------- */
export default function LecturerDashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  const current =
    JSON.parse(
      sessionStorage.getItem("currentUser") ||
      localStorage.getItem("currentUser") ||
      "{}"
    );

    

  /* Seed canonical lecturer profile URL so other pages (Academic Platform, etc.) route back here */
  useEffect(() => { setLecturerProfileHref("/lecturer-dashboard"); }, []);

  /* Load active user (lecturer) + normalize like student dashboard */
  const [user, setUser] = useState(() => {
    const s = safeParse(sessionStorage.getItem("currentUser")) || {};
    const l = safeParse(localStorage.getItem("currentUser")) || {};
    const raw = Object.keys(s).length ? s : l;








  // 👇 If email isn't in currentUser yet, try authUsersById
const rawId = raw.id || raw.uid || raw.userId || raw.currentUserId || raw.authUserId || "";
const auth = rawId ? (safeParse(localStorage.getItem("authUsersById")) || {})[rawId] : null;
const email = (raw.email || auth?.email || "").trim().toLowerCase();





    const merged = {
      ...raw,
      role: raw.role || "lecturer",
      /*id: raw.id || `l_${Date.now()}`,*/
      /*id: userStableId(raw) || `l_${Date.now()}`,*/

      email,
      id: userStableId({ ...raw, email }) || String(rawId || `l_${Date.now()}`),

      name: raw.name || "Lecturer Name",
      title: raw.title || "",
      country: normalizeCountry(raw.country || ""),
      countryCode: ensureCountryCode(raw.country || "", raw.countryCode || ""),
      /*photoUrl: raw.photoUrl || "",*/
      photoUrl: userPhoto(raw) || "",
      /*photoUrl: userPhoto(raw),*/
      bannerUrl: raw.bannerUrl || "",
      university: raw.university || "",
      faculty: raw.faculty || "",
      continent: raw.continent || "",
    };
    return merged;
  });
  



  //useEffect(() => { 
    //persistUserFull(user);
    //saveAndBroadcastUser(user);
  //}, [user]);//

  
  // ✅ Hydrate lecturer photo/banner from server on mount (and if email changes)

useEffect(() => {
  let cancelled = false;

  (async () => {
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email) return;

    try {
      const data = await fetchLecturerProfileFromServer(email);
      if (cancelled) return;

      const remote = data?.user || data?.me || null; // tolerate different shapes
      if (!data?.ok || !remote) return;

      setMe(remote);

      // ✅ IMPORTANT: accept photo under any alias
      const remotePhoto = userPhoto(remote); // uses your helper (photoUrl/photo/avatarUrl/etc.)
      const remoteBanner =
        remote.bannerUrl ||
        remote.bannerURL ||
        remote.profile?.bannerUrl ||
        remote.profile?.bannerURL ||
        "";

      setUser((u) => {
        const next = {
          ...u,
          ...remote,

          // ✅ single canonical fields used by your UI
          photoUrl: remotePhoto || u.photoUrl || "",
          bannerUrl: remoteBanner || u.bannerUrl || "",

          // keep avatarUrl as alias, but always mirror to photoUrl
          avatarUrl: remotePhoto || remote.avatarUrl || u.avatarUrl || "",
        };

        // ensure normalized country fields stay consistent
        next.country = normalizeCountry(next.country || "");
        next.countryCode = ensureCountryCode(next.country, next.countryCode);

        return next;
      });
    } catch (e) {
      console.error("[lecturer] get-profile hydrate failed:", e);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [user?.email]);



/*useEffect(() => { persistUserFull(user); }, [user]);*/
// ✅ Persist + broadcast whenever user changes (manual edits OR server hydration)
useEffect(() => {
  if (!user) return;              // prevents writing null on initial mount
  persistUserFull(user);          // your existing local persistence
  saveAndBroadcastUser(user);     // the new cross-tab sync trigger
}, [user]);



  // ===== Unread messages coming from Students (badge for "Students’ Messages")
  const [unreadStudentMsgs, setUnreadStudentMsgs] = useState(0);
  useEffect(() => {
    const raw = localStorage.getItem("currentUser");
    const me = raw ? JSON.parse(raw) : null;
    if (!me?.id) return;
    const recalc = () => setUnreadStudentMsgs(computeUnreadForLecturer(me.id));
    recalc();
    window.addEventListener("storage", recalc);
    window.addEventListener("contact:updated", recalc);
    return () => {
      window.removeEventListener("storage", recalc);
      window.removeEventListener("contact:updated", recalc);
    };
  }, []);

  /* Audience labels */
  const facKey = facultyAudienceKey(user);
  const facultyTerm = facultyTermFromValue(user.faculty);
  const facultyLabel = user.faculty || facultyTerm;

  /* Available programs */
  const availablePrograms = useMemo(() => {
    if (!user.continent || !user.country || !user.university || !user.faculty) return [];
    return safeGetPrograms(user.continent, user.country, user.university, user.faculty);
  }, [user.continent, user.country, user.university, user.faculty]);

  /* Seed posts once */
  const seeded = useMemo(() => {
    const exampleProgram = availablePrograms[0] || "Academic Program";
    return [
      {
        id: "lp1",
        authorId: user.id,
        authorType: "lecturer",
        author: `${user.title ? user.title + " " : ""}${user.name}`,
        authorPhoto: user.photoUrl,
        authorProgram: user.faculty,
        time: "Yesterday",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        audience: facKey,
        type: "Notes",
        title: "Welcome to the Semester",
        html: `<p>Welcome to the semester! Please review the <em>faculty-wide</em> guidelines posted in EduInfo.</p>`,
        images: [],
        files: [],
        likes: 0,
        liked: false,
        comments: [],
      },
      {
        id: "lp2",
        authorId: user.id,
        authorType: "lecturer",
        author: `${user.title ? user.title + " " : ""}${user.name}`,
        authorPhoto: user.photoUrl,
        authorProgram: exampleProgram,
        time: "2d",
        createdAt: new Date(Date.now() - 2*86400000).toISOString(),
        audience: audienceKey({
          university: user.university,
          faculty: user.faculty,
          program: exampleProgram,
          year: YEARS_SAFE[0],
        }),
        type: "Assignments",
        title: "Assignment 1 Released",
        html: `<p>Assignment 1 is out for ${exampleProgram}. Submit by Friday 5pm.</p>`,
        images: [],
        files: [{ id: "demo_file", name: "assignment-1.pdf", mime: "application/pdf" }],
        likes: 0,
        liked: false,
        comments: [],
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);






  /* Posts state — use 'lecturerPosts' to honor StudentDashboard reader */
  /*const [posts, setPosts] = useState(() => {
    const stored = safeParse(localStorage.getItem("lecturerPosts"));
    return stored && Array.isArray(stored) ? stored : seeded;
  });
  useEffect(() => { 
   //localStorage.setItem("lecturerPosts", JSON.stringify(posts));
   safeSetLecturerPosts(posts);
    window.dispatchEvent(new Event("lecturerPosts:updated"));
  }, [posts]);*/


  /* Posts state — backend is source of truth now */
const [posts, setPosts] = useState(() => seeded);

/**
 * If StudentDashboard is still listening for this event, keep it.
 * But DO NOT write full posts to localStorage anymore.
 */
useEffect(() => {
  window.dispatchEvent(new Event("lecturerPosts:updated"));
}, [posts]);








  // ✅ Merge remote posts into local without losing local-only threads (comments/replies)
function mergeRemoteIntoLocal(localPosts = [], remotePosts = []) {
  const localById = new Map((Array.isArray(localPosts) ? localPosts : []).map(p => [p?.id, p]));
  const remote = Array.isArray(remotePosts) ? remotePosts : [];

  // Merge comments (and replies) by id; keep union of both
  const mergeReplies = (localReplies = [], remoteReplies = []) => {
    const map = new Map();
    (Array.isArray(localReplies) ? localReplies : []).forEach(r => r?.id && map.set(r.id, r));
    (Array.isArray(remoteReplies) ? remoteReplies : []).forEach(r => r?.id && map.set(r.id, r));
    return Array.from(map.values());
  };

  const mergeComments = (localComments = [], remoteComments = []) => {
    const map = new Map();
    (Array.isArray(localComments) ? localComments : []).forEach(c => c?.id && map.set(c.id, c));

    (Array.isArray(remoteComments) ? remoteComments : []).forEach(c => {
      if (!c?.id) return;
      const prev = map.get(c.id);
      map.set(c.id, prev ? { ...prev, ...c, replies: mergeReplies(prev.replies, c.replies) } : c);
    });

    // ensure any local-only comments also stay (and merge their replies)
    return Array.from(map.values()).map(c => ({
      ...c,
      replies: mergeReplies(c?.replies, c?.replies),
    }));
  };

  // Build merged list in remote order (so feed ordering stays consistent)
  const merged = remote.map(rp => {
    const lp = localById.get(rp?.id);
    if (!lp) return rp;

    return {
      ...lp,
      ...rp,
      // 👇 key fix: preserve union of threads
      comments: mergeComments(lp.comments, rp.comments),
    };
  });

  // Keep any local posts that remote doesn't have yet (e.g., just-created / lagging)
  const remoteIds = new Set(remote.map(p => p?.id).filter(Boolean));
  const localOnly = (Array.isArray(localPosts) ? localPosts : []).filter(p => p?.id && !remoteIds.has(p.id));

  return [...merged, ...localOnly];
}



  // 🔄 Load latest lecturer posts from backend (global store, with polling)
  useEffect(() => {
    let cancelled = false;

    async function loadFromServer() {
      const remote = await fetchLecturerPostsFromServer();
      if (!remote || cancelled) return;

      // If server has posts, prefer those; otherwise keep local seeded examples
      if (remote.length) {
        //setPosts(remote);
        setPosts(prev => mergeRemoteIntoLocal(prev, remote));
      }
    }

    // Initial load
    loadFromServer();

    // Poll every 30 seconds so posts from other devices show up
    const id = setInterval(loadFromServer, 30000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);


  // RIGHT-CARD: Admin videos for lecturers only (not lecturers' own posts)
/*const [adminLecturerVideos, setAdminLecturerVideos] = useState([]);

useEffect(() => {
  const sync = () => {
    const all = readVideoPosts();
    const filtered = all
      .filter(
        (p) =>
          p &&
          p.type === "video" &&
          p.createdByRole === "admin" &&
          (p.audience === "lecturers" || p.audience === "both")
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setAdminLecturerVideos(filtered);
  };

  sync();
  const onStorage = (e) => { if (!e || e.key === "videoPosts") sync(); };
  const onUpdated = () => sync();
  window.addEventListener("storage", onStorage);
  window.addEventListener("videoPosts:updated", onUpdated);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("videoPosts:updated", onUpdated);
  };
}, []);*/

// RIGHT-CARD: Admin videos for lecturers (SERVER-backed, cross-browser)
const [adminLecturerVideos, setAdminLecturerVideos] = useState([]);

useEffect(() => {
  let cancelled = false;

  const normalizeAndSet = (arr) => {
    const list = (Array.isArray(arr) ? arr : [])
      .filter(Boolean)
      .filter((p) => {
  const type = String(p?.type || "").toLowerCase().trim();
  const audience = String(p?.audience || p?.targetAudience || "").toLowerCase().trim();

  return (
    type === "video" &&
    (audience === "lecturers" || audience === "both")
  );
})
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    setAdminLecturerVideos(list);
  };

  async function load() {
    const remote = await fetchAdminVideoPostsFromServer(); // ✅ server (S3/Lambda)
    if (cancelled) return;
    normalizeAndSet(remote);
  }

  load();
  const id = setInterval(load, 30000); // ✅ keep it fresh cross-device

  return () => {
    cancelled = true;
    clearInterval(id);
  };
}, []);

const latestAdminLecturerVideo = adminLecturerVideos[0] || null;   // ← INSERT HERE




  /* Filters + composer state */
  const [showFacultyOnly, setShowFacultyOnly] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState("Notes");

  /* NEW: Title for post / video */
  const [composerTitle, setComposerTitle] = useState("");

  /* NEW for video field (embedded in normal posting flow) */
  const [composerVideoUrl, setComposerVideoUrl] = useState("");

  /* Targeting (for all academic posts incl. Video) */
  const [toFaculty, setToFaculty] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState([]);  // multi-programs
  const [targetYear, setTargetYear] = useState("");

  /* Attachments (composer) */
  const [imagePreviews, setImagePreviews] = useState([]); // legacy local images (kept for backwards compat)
  const [docFiles, setDocFiles] = useState([]);           // legacy local files (kept for backwards compat)

  // NEW: attachments coming from S3 via <AttachmentUploader />
  // shape: [{ id, name, mime, url, kind }]
  const [composerAttachments, setComposerAttachments] = useState([]);

  const editorRef = useRef(null);
  const [composerLinks, setComposerLinks] = useState([]); // [url, url, ...]

  /* Manage profile (name/title) */
  const [meOpen, setMeOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editTitle, setEditTitle] = useState(user.title || "");

  /* Idle timer (20 min) */
  const [idleWarning, setIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const idleTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIdleWarning(true);
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current);
            setIdleWarning(false);
            navigate("/login?role=lecturer");
          }
          return c - 1;
        });
      }, 1000);
    }, 20 * 60 * 1000);
  };
  useEffect(() => {
    const bump = () => { if (!idleWarning) resetIdleTimer(); };
    window.addEventListener("mousemove", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("click", bump);
    resetIdleTimer();
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("click", bump);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleWarning]);

  /* Banner/Avatar upload (compressed & normalized + broadcast) */
  /*const onPickBanner = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const dataUrl = await fileToDownscaledDataURL(f, 1200, 320, 0.82, 460);
    setUser((u) => {
      const next = { ...u, bannerUrl: dataUrl };
      next.country = normalizeCountry(next.country || "");
      next.countryCode = ensureCountryCode(next.country, next.countryCode);
      saveAndBroadcastUser(next);
      return next;
    });
  };*/

  /* Banner/Avatar upload (compressed & normalized + broadcast + server persist) */
/*const onPickBanner = async (e) => {
  const f = e.target.files?.[0];
  if (!f || !f.type.startsWith("image/")) return;

  const bannerUrl = await fileToDownscaledDataURL(f, 1200, 320, 0.82, 460);

  try {
    // ONLY set UI after server accepts
    await updateLecturerProfile({ bannerUrl }, me);

    // re-fetch profile to confirm it persisted
    const email = String(me?.email || "").trim().toLowerCase();
    const fresh = email ? await fetchLecturerProfileFromServer(email) : null;
    const remote = fresh?.user || fresh;

    if (remote) {
      setMe(remote);
      setUser((u) => {
        const next = {
          ...u,
          ...remote,
          bannerUrl: remote.bannerUrl ?? bannerUrl,
          photoUrl: remote.photoUrl ?? u.photoUrl,
          avatarUrl: remote.photoUrl ?? remote.avatarUrl ?? u.avatarUrl,
        };
        saveAndBroadcastUser(next);
        return next;
      });
    }
  } catch (e2) {
    console.error("update-profile failed:", e2);
    alert("Banner failed to save. Check console/network.");
  } finally {
    e.target.value = "";
  }
};*/
/*const onPickBanner = async (e) => {
  const f = e.target.files?.[0];
  if (!f || !f.type.startsWith("image/")) return;

  const bannerUrl = await fileToDownscaledDataURL(f, 1200, 320, 0.82, 460);

  try {
    // ✅ Use user (always has email) as identity source
    await updateLecturerProfile({ bannerUrl }, user);

    // ✅ Always refetch using user.email (not me.email)
    const email = String(user?.email || "").trim().toLowerCase();
    const fresh = email ? await fetchLecturerProfileFromServer(email) : null;
    const remote = fresh?.user || fresh;

    if (remote) {
      setMe(remote);
      setUser((u) => {
        const next = {
          ...u,
          ...remote,

          // ✅ normalize what your UI renders
          bannerUrl: remote.bannerUrl ?? bannerUrl,
          photoUrl: remote.photoUrl ?? remote.avatarUrl ?? u.photoUrl,
          avatarUrl: remote.photoUrl ?? remote.avatarUrl ?? u.avatarUrl,
        };
        saveAndBroadcastUser(next);
        return next;
      });
    }
  } catch (e2) {
    console.error("update-profile failed:", e2);
    alert("Banner failed to save. Check console/network.");
  } finally {
    e.target.value = "";
  }
};*/
// ============================================================
  // CloudFront upload helper (Banner/Avatar) — LecturerDashboard
  // ============================================================
  const CLOUDFRONT_BASE = "https://d3d7m2wzxdf6rh.cloudfront.net";
  const UPLOAD_URL_API =
    "https://rui5pw3qu0.execute-api.us-east-1.amazonaws.com/api/marketplace/upload-url";

  function dataURLtoBlobSafe(dataUrl) {
    const [hdr, b64] = String(dataUrl || "").split(",");
    const mime =
      (hdr.match(/data:(.*?);base64/) || [null, "application/octet-stream"])[1];
    const bin = atob(b64 || "");
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function getUploadTicket({ fileName, contentType, folder }) {
    const payload = {
      fileName,
      contentType,
      ...(folder ? { folder } : {}),
    };

    const r = await fetch(UPLOAD_URL_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const txt = await r.text();
    let j = null;
    try { j = JSON.parse(txt); } catch { j = null; }

    if (!r.ok) {
      throw new Error(j?.error || j?.message || txt || `HTTP ${r.status}`);
    }
    return j;
  }

  async function uploadBlobToCloudFront({ blob, fileName, contentType, folder }) {
    const ticket = await getUploadTicket({ fileName, contentType, folder });

    const uploadUrl =
      ticket?.uploadUrl ||
      ticket?.url ||
      ticket?.putUrl ||
      ticket?.signedUrl ||
      "";

    const key =
      ticket?.key ||
      ticket?.s3Key ||
      ticket?.objectKey ||
      ticket?.path ||
      "";

    const publicUrl =
      ticket?.cloudFrontUrl ||
      ticket?.cloudfrontUrl ||
      ticket?.publicUrl ||
      ticket?.fileUrl ||
      (key ? `${CLOUDFRONT_BASE}/${String(key).replace(/^\/+/, "")}` : "");

    if (!uploadUrl) throw new Error("upload-url API did not return uploadUrl");
    if (!publicUrl) throw new Error("upload-url API did not return a public URL or key");

    // PUT upload to S3 via presigned URL
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": contentType || blob.type || "application/octet-stream" },
      body: blob,
    });

    if (!put.ok) {
      const t = await put.text().catch(() => "");
      throw new Error(t || `PUT failed: HTTP ${put.status}`);
    }

    return { publicUrl, key };
  }

  /* ✅✅✅ PASTE Comment/Reply attachment upload (CloudFront) — cross-device RIGHT HERE
   (between uploadBlobToCloudFront() and onPickBanner)
*/

/* ============================================================
   Comment/Reply attachment upload (CloudFront) — cross-device
   ============================================================ */

function safeName(name = "file") {
  const n = String(name || "file").trim() || "file";
  return n.replace(/[/\\]+/g, "_");
}

/*async function uploadDataUrlToCloudFront({ dataUrl, name, mime, folder }) {
  const blob = dataURLtoBlobSafe(dataUrl);
  const contentType = mime || blob.type || "application/octet-stream";
  const fileName = safeName(name || `file_${Date.now()}`);

  const { publicUrl, key } = await uploadBlobToCloudFront({
    blob,
    fileName,
    contentType,
    folder,
  });

  return {
    id: key || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: fileName,
    fileName,
    mime: contentType,
    url: publicUrl,     // ✅ students can click/download
    s3Url: publicUrl,   // optional alias
    key,
    size: blob.size || 0,
  };
}*/



async function uploadItemToCloudFront({ item, fallbackName, fallbackMime, folder }) {
  if (item?.url && /^https?:\/\//i.test(item.url)) {
    return {
      id: item.id || item.key || `cf_${Date.now()}`,
      name: item.name || item.fileName || fallbackName || "file",
      fileName: item.fileName || item.name || fallbackName || "file",
      mime: item.mime || item.type || fallbackMime || "application/octet-stream",
      url: item.url,
      s3Url: item.url,
      key: item.key || item.id || "",
      size: item.size || 0,
    };
  }

  let blob = null;
  let name = item?.name || item?.fileName || fallbackName || "file";
  let mime = item?.mime || item?.type || fallbackMime || "application/octet-stream";

  if (item?.dataUrl) {
    blob = dataURLtoBlobSafe(item.dataUrl);
    mime = mime || blob.type;
  }

  if (!blob && item?.id) {
    const rec = await idbGet(item.id);
    if (rec instanceof Blob) {
      blob = rec;
    } else {
      blob = rec?.blob || rec?.file || rec?.data || null;
      name = rec?.name || name;
      mime = rec?.type || rec?.mime || mime;
    }
  }

  if (!blob) return null;

  const fileName = safeName(name || "file");
  const { publicUrl, key } = await uploadBlobToCloudFront({
    blob,
    fileName,
    contentType: mime || blob.type || "application/octet-stream",
    folder,
  });

  return {
    id: key || item?.id || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: fileName,
    fileName,
    mime: mime || blob.type || "application/octet-stream",
    url: publicUrl,
    s3Url: publicUrl,
    key,
    size: blob.size || 0,
  };
}

















async function uploadCommentReplyAttachments(images = [], files = [], folderBase = "lecturer/comments") {
  const imgUploads = (Array.isArray(images) ? images : []).map(async (img) => {
    const out = await uploadItemToCloudFront({
      item: img,
      fallbackName: img?.name || `image_${Date.now()}.jpg`,
      fallbackMime: "image/jpeg",
      folder: `${folderBase}/images`,
    });
    return out ? { ...out, kind: "image", thumb: img?.dataUrl || img?.thumb || "" } : null;
  });

  const fileUploads = (Array.isArray(files) ? files : []).map(async (f) => {
    const out = await uploadItemToCloudFront({
      item: f,
      fallbackName: f?.name || `file_${Date.now()}`,
      fallbackMime: f?.mime || "application/octet-stream",
      folder: `${folderBase}/files`,
    });
    return out ? { ...out, kind: "file" } : null;
  });

  const [uploadedImages, uploadedFiles] = await Promise.all([
    Promise.all(imgUploads),
    Promise.all(fileUploads),
  ]);

  return {
    uploadedImages: uploadedImages.filter(Boolean),
    uploadedFiles: uploadedFiles.filter(Boolean),
  };
}


const onPickBanner = async (e) => {
  const f = e.target.files?.[0];
  if (!f || !f.type.startsWith("image/")) return;

  try {
    // 1) Downscale (keeps your current behavior)
    const bannerDataUrl = await fileToDownscaledDataURL(f, 1200, 320, 0.82, 460);

    // 2) Upload to CloudFront via presigned PUT
    const blob = dataURLtoBlobSafe(bannerDataUrl);
    const fileName = `lecturer_banner_${Date.now()}.jpg`;
    const { publicUrl } = await uploadBlobToCloudFront({
      blob,
      fileName,
      contentType: "image/jpeg",
      folder: "lecturer/banner",
    });

    // 3) Persist ONLY the CloudFront URL to your lecturer profile (global across devices)
    await updateLecturerProfile({ bannerUrl: publicUrl }, user);

    // 4) Re-fetch profile and hydrate UI
    const email = String(user?.email || "").trim().toLowerCase();
    const fresh = email ? await fetchLecturerProfileFromServer(email) : null;
    const remote = fresh?.user || fresh?.me || fresh || null;

    if (remote) {
      setMe(remote);

      const remotePhoto = userPhoto(remote) || user.photoUrl || "";
      const remoteBanner =
        remote.bannerUrl ||
        remote.bannerURL ||
        remote.profile?.bannerUrl ||
        remote.profile?.bannerURL ||
        publicUrl;

      setUser((u) => {
        const next = {
          ...u,
          ...remote,
          photoUrl: remotePhoto,
          avatarUrl: remotePhoto,
          bannerUrl: remoteBanner,
        };
        saveAndBroadcastUser(next);
        return next;
      });
    } else {
      // fallback: at least set locally if profile refetch shape changes
      setUser((u) => {
        const next = { ...u, bannerUrl: publicUrl };
        saveAndBroadcastUser(next);
        return next;
      });
    }
  } catch (err) {
    console.error("[LecturerDashboard] banner upload failed:", err);
    alert("Banner failed to save. Check console/network.");
  } finally {
    e.target.value = "";
  }
};


  /*const onPickAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const dataUrl = await fileToDownscaledDataURL(f, 320, 320, 0.86, 260);
    setUser((u) => {
      const next = { ...u, photoUrl: dataUrl };
      next.country = normalizeCountry(next.country || "");
      next.countryCode = ensureCountryCode(next.country, next.countryCode);
      saveAndBroadcastUser(next);
      return next;
    });
  };*/

  /*const onPickAvatar = async (e) => {
  const f = e.target.files?.[0];
  if (!f || !f.type.startsWith("image/")) return;

  const photoUrl = await fileToDownscaledDataURL(f, 320, 320, 0.86, 260);

  try {
    await updateLecturerProfile({ photoUrl }, me);

    const email = String(me?.email || "").trim().toLowerCase();
    const fresh = email ? await fetchLecturerProfileFromServer(email) : null;
    const remote = fresh?.user || fresh;

    if (remote) {
      setMe(remote);
      setUser((u) => {
        const next = {
          ...u,
          ...remote,
          photoUrl: remote.photoUrl ?? photoUrl,
          avatarUrl: remote.photoUrl ?? remote.avatarUrl ?? u.avatarUrl,
          bannerUrl: remote.bannerUrl ?? u.bannerUrl,
        };
        saveAndBroadcastUser(next);
        return next;
      });
    }
  } catch (e2) {
    console.error("update-profile failed:", e2);
    alert("Avatar failed to save. Check console/network.");
  } finally {
    e.target.value = "";
  }
};*/
/*const onPickAvatar = async (e) => {
  const f = e.target.files?.[0];
  if (!f || !f.type.startsWith("image/")) return;

  const photoUrl = await fileToDownscaledDataURL(f, 320, 320, 0.86, 260);

  try {
    // ✅ Use user (always has email) as identity source
    await updateLecturerProfile({ photoUrl }, user);

    // ✅ Always refetch using user.email (not me.email)
    const email = String(user?.email || "").trim().toLowerCase();
    const fresh = email ? await fetchLecturerProfileFromServer(email) : null;
    const remote = fresh?.user || fresh;

    if (remote) {
      setMe(remote);

      const remotePhoto = userPhoto(remote) || photoUrl; // accept aliases
      const remoteBanner =
        remote.bannerUrl ||
        remote.bannerURL ||
        remote.profile?.bannerUrl ||
        remote.profile?.bannerURL ||
        "";

      setUser((u) => {
        const next = {
          ...u,
          ...remote,
          photoUrl: remotePhoto,
          avatarUrl: remotePhoto,
          bannerUrl: remoteBanner || u.bannerUrl,
        };
        saveAndBroadcastUser(next);
        return next;
      });
    }
  } catch (e2) {
    console.error("update-profile failed:", e2);
    alert("Avatar failed to save. Check console/network.");
  } finally {
    e.target.value = "";
  }
};*/
const onPickAvatar = async (e) => {
  const f = e.target.files?.[0];
  if (!f || !f.type.startsWith("image/")) return;

  try {
    // 1) Downscale
    const avatarDataUrl = await fileToDownscaledDataURL(f, 320, 320, 0.86, 260);

    // 2) Upload to CloudFront via presigned PUT
    const blob = dataURLtoBlobSafe(avatarDataUrl);
    const fileName = `lecturer_avatar_${Date.now()}.jpg`;
    const { publicUrl } = await uploadBlobToCloudFront({
      blob,
      fileName,
      contentType: "image/jpeg",
      folder: "lecturer/avatar",
    });

    // 3) Persist CloudFront URL
    await updateLecturerProfile({ photoUrl: publicUrl }, user);

    // 4) Re-fetch profile and hydrate UI
    const email = String(user?.email || "").trim().toLowerCase();
    const fresh = email ? await fetchLecturerProfileFromServer(email) : null;
    const remote = fresh?.user || fresh?.me || fresh || null;

    if (remote) {
      setMe(remote);

      const remotePhoto = userPhoto(remote) || publicUrl;
      const remoteBanner =
        remote.bannerUrl ||
        remote.bannerURL ||
        remote.profile?.bannerUrl ||
        remote.profile?.bannerURL ||
        "";

      setUser((u) => {
        const next = {
          ...u,
          ...remote,
          photoUrl: remotePhoto,
          avatarUrl: remotePhoto,
          bannerUrl: remoteBanner || u.bannerUrl,
        };
        saveAndBroadcastUser(next);
        return next;
      });
    } else {
      // fallback: at least set locally if profile refetch shape changes
      setUser((u) => {
        const next = { ...u, photoUrl: publicUrl, avatarUrl: publicUrl };
        saveAndBroadcastUser(next);
        return next;
      });
    }
  } catch (err) {
    console.error("[LecturerDashboard] avatar upload failed:", err);
    alert("Avatar failed to save. Check console/network.");
  } finally {
    e.target.value = "";
  }
};

  /* Composer toolbar & pickers */
  const exec = (cmd, value = null) => {
    try { document.execCommand(cmd, false, value); editorRef.current?.focus(); } catch {}
  };

  const addLink = () => {
    const input = prompt("Enter URL (include https://)");
    if (!input) return;
    let url = input.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { new URL(url); } catch { alert("That doesn’t look like a valid URL."); return; }
    setComposerLinks(prev => Array.from(new Set([...prev, url])));
  };

  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    const slots = Math.max(0, 6 - imagePreviews.length);
    const chosen = files.slice(0, slots);
    const dataUrls = await Promise.all(chosen.map((f) => fileToDownscaledDataURL(f, 1280, 1280, 0.82, 420)));
    const next = dataUrls.map((dataUrl, i) => ({ name: chosen[i].name, dataUrl }));
    setImagePreviews((arr) => [...arr, ...next]);
    e.target.value = "";
  };
  const onPickDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = await Promise.all(files.map(async (f) => ({
      name: f.name, mime: f.type || "application/octet-stream", dataUrl: await readFileAsDataURL(f)
    })));
    setDocFiles((arr) => [...arr, ...mapped]);
    e.target.value = "";
  };
  /*const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") || "";
    if (document.queryCommandSupported("insertText")) {
      document.execCommand("insertText", false, text);
    } else {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      sel.deleteFromDocument();
      sel.getRangeAt(0).insertNode(document.createTextNode(text));
    }
  };*/

  const handlePaste = (e) => {
  e.preventDefault();

  const cb = e.clipboardData || window.clipboardData;
  const text = cb?.getData("text/plain") || "";

  // Normalize line endings
  const normalized = String(text).replace(/\r\n/g, "\n");

  // Escape HTML special chars
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Convert:
  // - blank lines => paragraph breaks
  // - single newline => <br/>
  const html = normalized
    .split(/\n{2,}/g)
    .map((para) => para.split("\n").map(esc).join("<br/>"))
    .map((p) => `<p>${p || "<br/>"}</p>`)
    .join("");

  // Insert HTML at cursor (keeps paragraphs)
  if (document.queryCommandSupported?.("insertHTML")) {
    document.execCommand("insertHTML", false, html);
    return;
  }

  // Fallback: manual range insert
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  sel.deleteFromDocument();

  const range = sel.getRangeAt(0);
  const container = document.createElement("div");
  container.innerHTML = html;

  const frag = document.createDocumentFragment();
  while (container.firstChild) frag.appendChild(container.firstChild);

  range.insertNode(frag);
  range.collapse(false);
};

  /* ---- Auth store shim (align with StudentDashboard) ---- */
  function getAuthRecord(userId) {
    const map = safeParse(localStorage.getItem("authUsersById")) || {};
    return map[userId] || null;
  }
  function setAuthRecord(userId, patch) {
    const map = safeParse(localStorage.getItem("authUsersById")) || {};
    const prev = map[userId] || {};
    const next = { ...prev, ...patch };
    map[userId] = next;
    localStorage.setItem("authUsersById", JSON.stringify(map));
    return next;
  }
     window.setAuthRecordForLecturer = ({ userId, email, password }) => {
     const updated = setAuthRecord(userId, { ...(email ? { email } : {}), ...(password ? { password } : {}) });
     if (email) window.dispatchEvent(new CustomEvent("auth:emailChanged", { detail: { userId, email: updated.email } }));
     if (password) window.dispatchEvent(new CustomEvent("auth:passwordChanged", { detail: { userId } }));
    };



  useEffect(() => {
    const syncEmail = (e) => {
      const { userId, email } = e.detail || {};
      if (!userId || !email || user.id !== userId) return;
      const next = { ...user, email };
      next.country = normalizeCountry(next.country || "");
      next.countryCode = ensureCountryCode(next.country, next.countryCode);
      setUser(next);
      saveAndBroadcastUser(next);
    };
    const noop = () => {};
    window.addEventListener("auth:emailChanged", syncEmail);
    window.addEventListener("auth:passwordChanged", noop);
    window.addEventListener("auth:passwordReset", noop);
    return () => {
      window.removeEventListener("auth:emailChanged", syncEmail);
      window.removeEventListener("auth:passwordChanged", noop);
      window.removeEventListener("auth:passwordReset", noop);
    };
  }, [user]);



  // Helper: take AttachmentUploader items and split into images vs other files
/*function splitS3Attachments(list = []) {
  const imgs = [];
  const files = [];

  list.forEach((att) => {
    if (!att) return;

    const mime = att.mime || att.type || "";
    const isImage = att.kind === "image" || mime.startsWith("image/");

    const base = {
      id:
        att.id ||
        att.key ||
        `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: att.name || "file",
      mime: mime || "application/octet-stream",
      url: att.url,
    };

    if (isImage) {
      // 👈 make sure images have kind:"image" and a thumb
      imgs.push({
        ...base,
        kind: "image",
        // StudentDashboard treats attachments with a thumb as images
        thumb: att.thumb || att.previewUrl || att.url,
      });
    } else {
      files.push({
        ...base,
        kind: "file",
      });
    }
  });

  return { imgs, files };
}*/




// Helper: take AttachmentUploader items and split into images vs other files
function pickBestFileName(att) {
  // Try common filename fields first
  const direct =
    att?.fileName ||
    att?.filename ||
    att?.originalName ||
    att?.name;

  if (direct && String(direct).trim()) return String(direct).trim();

  // Fallback: derive from S3 key or URL
  const raw = String(att?.key || att?.s3Key || att?.url || "")
    .split("?")[0];
  const last = raw.split("/").pop() || "";

  try {
    const decoded = decodeURIComponent(last);
    if (decoded) return decoded;
  } catch {
    if (last) return last;
  }

  return "file";
}

function splitS3Attachments(list = []) {
  const imgs = [];
  const files = [];

  list.forEach((att) => {
    if (!att) return;

    const mime = att.mime || att.type || "";
    const isImage =
      att.kind === "image" || String(mime).startsWith("image/");

    const fileName = pickBestFileName(att);

    /*const base = {
      id:
        att.id ||
        att.key ||
        `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: fileName,          // ✅ UI uses this
      fileName: fileName,      // ✅ Student + Lecturer dashboards
      mime: mime || "application/octet-stream",
      url: att.url,
      key: att.key,
    };*/


  const base = {
  id: att.id || 
  att.key || 
  `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: bestFileName(att),      // ✅ normalized real name
  fileName: bestFileName(att),  // ✅ also store as fileName (your UI prefers this)
  mime: mime || "application/octet-stream",
  url: att.url,
  key: att.key,
  size: att.size || att.bytes || att.contentLength || 0, // ✅ optional if present
};


    if (isImage) {
      imgs.push({
        ...base,
        kind: "image",
        thumb: att.thumb || att.previewUrl || att.url,
      });
    } else {
      files.push({
        ...base,
        kind: "file",
      });
    }
  });

  return { imgs, files };
}







   /* Create post (supports all types including Video)-ADDED */
  const onPost = async (e) => {
    e.preventDefault();

    const title = (composerTitle || "").trim();
    let html = (editorRef.current?.innerHTML || "").trim();

    // If Video, require a URL/ID
    let videoId = "";
    if (composerType === "Video") {
      const raw = (composerVideoUrl || "").trim();
      videoId = extractYouTubeId(raw);
      if (!videoId) {
        alert("Enter a valid YouTube URL or video ID.");
        return;
      }
    }

    // For non-video: guard against completely empty posts
    if (
      composerType !== "Video" &&
      !title &&
      !html &&
      imagePreviews.length === 0 &&
      docFiles.length === 0 &&
      composerLinks.length === 0 &&
      composerAttachments.length === 0
    ) {
      return;
    }

    // Append links at bottom of the HTML
    if (composerLinks.length) {
      const linksHtml = composerLinks
        .map(
          (u) =>
            `<div><a href="${u}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all" style="color:#2563eb;text-decoration:underline;">${u}</a></div>`
        )
        .join("");
      html = html
        ? `${html}<br/><div class="mt-2 space-y-1">${linksHtml}</div>`
        : `<div class="mt-2 space-y-1">${linksHtml}</div>`;
    }

    // Plain text version required by backend ("text" field)
    let plainText =
      stripHtml(html || "").trim() ||
      (composerTitle || "").trim() ||
      composerType;

    // For pure Video posts with almost no description, ensure text is not empty
    if (composerType === "Video" && !plainText) {
      plainText = composerTitle.trim() || "Video post";
    }

    const { imgDescs, fileDescs } = await persistAttachments(
      imagePreviews,
      docFiles
    );

    // 2) NEW: S3-backed attachments from <AttachmentUploader />
    const { imgs: s3Imgs, files: s3Files } =
      splitS3Attachments(composerAttachments);

    // 🔧 Safety fix:
    // No matter what AttachmentUploader / splitS3Attachments says,
    // anything whose MIME is image/* should live in post.images,
    // and everything else in post.files. This is what the student
    // dashboard expects.
    const s3All = [...(s3Imgs || []), ...(s3Files || [])];

    const fixedS3Images = s3All.filter((att) =>
      String(att.mime || "").toLowerCase().startsWith("image/")
    );
    const fixedS3Files = s3All.filter(
      (att) =>
        !String(att.mime || "").toLowerCase().startsWith("image/")
    );

    const allImages = [...fixedS3Images, ...imgDescs];
    const allFiles = [...fixedS3Files, ...fileDescs];

    const now = Date.now();
    const displayName = `${user.title ? user.title + " " : ""}${user.name}`;

    // 🔑 Common payload fields so StudentDashboard can show correct
    // avatar, full lecturer name, and audience labels.
    const baseCommon = {
      authorId: user.id,
      authorType: "lecturer",
      author: displayName,
      authorName: displayName, // alias used by student feed
      authorRole: "lecturer",
      authorPhoto: user.photoUrl || "",
      photoUrl: user.photoUrl || "",

      continent: user.continent,
      country: user.country,
      countryCode: user.countryCode,
      university: user.university,
      faculty: user.faculty,

      /*time: "Just now",
      createdAt: new Date().toISOString(),*/
      createdAt: Date.now(),          // number timestamp (best for sorting + time ago)
      updatedAt: Date.now(),
         // time: formatTimeAgo(Date.now()), // optional: only if you use it locally; don't persist it

      type: composerType,
      title,
      text: plainText,
      html,
      images: allImages,
      files: allFiles,
      likes: 0,
      liked: false,
      comments: [],
    };

    if (composerType === "Video") {
      baseCommon.videoUrlOrId = videoId;
    }

    // 🔁 Collect what we send to backend (one post per audience)
    let newPostsForState = [];
    let postsForServer = [];

    // ===================== FACULTY + YEAR =====================
    if (toFaculty) {
      if (!targetYear) {
        alert(`Select "Year of Study" for ${facultyTerm.toLowerCase()} posts.`);
        return;
      }

      const audience = facultyYearAudienceKey({
        university: user.university,
        faculty: user.faculty,
        year: targetYear,
      });

      const newPost = {
        id: `lp${now}`,
        ...baseCommon,
        targetYear,
        authorProgram: `${user.faculty} • ${targetYear}`,
        program: user.faculty,
        year: targetYear,

        // 🔑 audience fields used by student filtering / labels
        audience,
        audienceKey: audience,
        scope: LECTURER_SCOPE,
      };

      newPostsForState = [newPost];
      postsForServer = [newPost];
      markNewSignal(audience, "lecturer");
    } else {
      // ===================== PROGRAM(S) + YEAR =====================
      if (selectedPrograms.length === 0 || !targetYear) {
        alert("Select one or more Academic Programs and a Year of Study.");
        return;
      }

      const multiGroupId = `mp_${now}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const multiPrograms = selectedPrograms.slice();

      const newPosts = selectedPrograms.map((prog, idx) => {
        const audience = audienceKey({
          university: user.university,
          faculty: user.faculty,
          program: prog,
          year: targetYear,
        });

        markNewSignal(audience, "lecturer");

        return {
          id: `lp${now}_${idx}`,
          multiGroupId,
          multiPrograms,
          targetYear,
          ...baseCommon,

          authorProgram: prog,
          program: prog,
          year: targetYear,

          // 🔑 audience fields used by student filtering / labels
          audience,
          audienceKey: audience,
          scope: LECTURER_SCOPE,
        };
      });

      newPostsForState = newPosts;
      postsForServer = newPosts;
    }

    // 👉 Update local feed immediately
    setPosts((p) => [...newPostsForState, ...p]);

    // 🌍 Save each post to the global posts API so all devices/browsers see it
    try {
      for (const post of postsForServer) {
        await createPostOnServer(post);
      }
    } catch (err) {
      console.error("[LecturerDashboard] createPost failed", err);
      alert(
        "Your post was added locally but could not be saved to the server. It may not be visible on other devices yet."
      );
    }

    // reset composer
    if (editorRef.current) editorRef.current.innerHTML = "";
    setComposerTitle("");
    setImagePreviews([]);
    setDocFiles([]);
    setComposerAttachments([]);
    setComposerLinks([]);
    setComposerType("Notes");
    setToFaculty(false);
    setSelectedPrograms([]);
    setTargetYear("");
    setComposerVideoUrl("");
    setComposerOpen(false);
  };

  // --- Route updates to the correct source (this file's "posts" == lecturerPosts) ---
function updatePostById(postId, updater) {
  setPosts(prev => prev.map(p => (p.id === postId ? updater(p) : p)));
}






  /* Like/Comment/Reply — sync across multi-program siblings */
  const toggleLikeBy = (postOrId) => {
    setPosts((p) => {
      const target = p.find(x => x.id === (typeof postOrId === "string" ? postOrId : postOrId.id));
      if (!target) return p;
      const key = target.multiGroupId || target.id;
      return p.map((x) => {
        const match = target.multiGroupId ? x.multiGroupId === key : x.id === key;
        if (!match) return x;
        const liked = !x.liked;
        return { ...x, liked, likes: liked ? (x.likes || 0) + 1 : Math.max(0, (x.likes || 0) - 1) };
      });
    });
  };

  /*const addComment = async (postId, text, images = [], files = []) => {
  const trimmed = String(text || "").trim();
  if (!trimmed && images.length === 0 && files.length === 0) return;

  const { imgDescs, fileDescs } = await persistAttachments(images, files);

  // If postId is missing for any reason, just do local-only
  if (!postId) {
    updatePostById(postId, (x) => ({
      ...x,
      comments: [
        ...(x.comments || []),
        {
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          postId,
          authorId: user.id,
          authorName: `${user.title ? user.title + " " : ""}${user.name}`,
          authorPhoto: user.photoUrl,
          authorProgram: user.faculty,
          text: trimmed,
          images: imgDescs,
          files: fileDescs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          replies: [],
        },
      ],
    }));
    return;
  }

  try {
    const resp = await postCommentToServer({
      postId,
      text: trimmed,
      images: imgDescs,
      files: fileDescs,
      authorId: user.id,
      authorName: `${user.title ? user.title + " " : ""}${user.name}`,
      authorPhoto: user.photoUrl,
      authorProgram: user.faculty,
    });

    const serverComment = resp?.comment;

    updatePostById(postId, (x) => ({
      ...x,
      comments: [serverComment, ...(x.comments || [])],
    }));
  } catch (err) {
    console.error("[LecturerDashboard] addComment failed:", err);

    // fallback local-only
    updatePostById(postId, (x) => ({
      ...x,
      comments: [
        ...(x.comments || []),
        {
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          postId,
          authorId: user.id,
          authorName: `${user.title ? user.title + " " : ""}${user.name}`,
          authorPhoto: user.photoUrl,
          authorProgram: user.faculty,
          text: trimmed,
          images: imgDescs,
          files: fileDescs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          replies: [],
        },
      ],
    }));
  }
};*/



/*const addComment = async (postId, text, images = [], files = []) => {
  const trimmed = String(text || "").trim();
  if (!trimmed && images.length === 0 && files.length === 0) return;

  const { imgDescs, fileDescs } = await persistAttachments(images, files);

  // optimistic local id (so it shows instantly)
  const optimisticId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1) optimistic local update (won’t vanish if we also do merge in step 2)
  updatePostById(postId, (x) => ({
    ...x,
    updatedAt: Date.now(),
    comments: [
      {
        id: optimisticId,
        __pending: true,
        postId,
        authorId: user.id,
        authorName: `${user.title ? user.title + " " : ""}${user.name}`,
        author: `${user.title ? user.title + " " : ""}${user.name}`,
        authorPhoto: user.photoUrl,
        authorProgram: user.faculty,
        text: trimmed,
        images: imgDescs,
        files: fileDescs,
        replies: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...(x.comments || []),
    ],
  }));

  // 2) persist to backend
  try {
    const resp = await postCommentToServer({
      postId,
      text: trimmed,
      images: imgDescs,
      files: fileDescs,
      authorId: user.id,
      authorName: `${user.title ? user.title + " " : ""}${user.name}`,
      authorPhoto: user.photoUrl,
      authorProgram: user.faculty,
    });

    const serverComment = resp?.comment;

    // 3) replace the optimistic comment with the server comment
    if (serverComment?.id) {
      updatePostById(postId, (x) => ({
        ...x,
        updatedAt: Date.now(),
        comments: (x.comments || []).map((c) =>
          c.id === optimisticId ? serverComment : c
        ),
      }));
    } else {
      // if backend doesn't return a comment object, at least clear pending flag
      updatePostById(postId, (x) => ({
        ...x,
        comments: (x.comments || []).map((c) =>
          c.id === optimisticId ? { ...c, __pending: false } : c
        ),
      }));
    }
   } catch (err) {
    console.error("[LecturerDashboard] addComment failed:", err);
    // leave it visible, but mark as not pending
    updatePostById(postId, (x) => ({
      ...x,
      comments: (x.comments || []).map((c) =>
        c.id === optimisticId ? { ...c, __pending: false } : c
      ),
    }));
  }
};*/


   const addComment = async (postId, text, images = [], files = []) => {
  const trimmed = String(text || "").trim();
  if (!trimmed && images.length === 0 && files.length === 0) return;

  // ✅ Upload attachments to CloudFront so students can download
  let cfImages = [];
  let cfFiles = [];
  try {
    const up = await uploadCommentReplyAttachments(images, files, "lecturer/comments");
    cfImages = up.uploadedImages || [];
    cfFiles = up.uploadedFiles || [];
  } catch (e) {
    console.error("[LecturerDashboard] comment attachment upload failed:", e);
    // If upload fails, still allow comment text to post (attachments omitted)
    cfImages = [];
    cfFiles = [];
  }

  const optimisticId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1) optimistic local update (uses CloudFront urls if available)
  updatePostById(postId, (x) => ({
    ...x,
    updatedAt: Date.now(),
    comments: [
      {
        id: optimisticId,
        __pending: true,
        postId,
        authorId: user.id,
        authorName: `${user.title ? user.title + " " : ""}${user.name}`,
        author: `${user.title ? user.title + " " : ""}${user.name}`,
        authorPhoto: user.photoUrl,
        authorProgram: user.faculty,
        text: trimmed,
        images: cfImages,
        files: cfFiles,
        replies: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...(x.comments || []),
    ],
  }));

  // 2) persist to backend
  try {
    const resp = await postCommentToServer({
      postId,
      text: trimmed,
      images: cfImages,  // ✅ now CloudFront-backed
      files: cfFiles,    // ✅ now CloudFront-backed
      authorId: user.id,
      authorName: `${user.title ? user.title + " " : ""}${user.name}`,
      authorPhoto: user.photoUrl,
      authorProgram: user.faculty,
    });

    const serverComment = resp?.comment;

    // 3) replace optimistic with server comment
    if (serverComment?.id) {
      updatePostById(postId, (x) => ({
        ...x,
        updatedAt: Date.now(),
        comments: (x.comments || []).map((c) => (c.id === optimisticId ? serverComment : c)),
      }));
    } else {
      updatePostById(postId, (x) => ({
        ...x,
        comments: (x.comments || []).map((c) => (c.id === optimisticId ? { ...c, __pending: false } : c)),
      }));
    }
  } catch (err) {
    console.error("[LecturerDashboard] addComment failed:", err);
    updatePostById(postId, (x) => ({
      ...x,
      comments: (x.comments || []).map((c) => (c.id === optimisticId ? { ...c, __pending: false } : c)),
    }));
  }
};

  




  /*const addReply = async (postId, commentId, text, images = [], files = []) => {
  const trimmed = String(text || "").trim();
  if (!trimmed && images.length === 0 && files.length === 0) return;

  const { imgDescs, fileDescs } = await persistAttachments(images, files);

  if (!postId || !commentId) {
    // fallback local-only
    updatePostById(postId, (x) => ({
      ...x,
      comments: (x.comments || []).map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...(c.replies || []),
                {
                  id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  postId,
                  commentId,
                  authorId: user.id,
                  authorName: `${user.title ? user.title + " " : ""}${user.name}`,
                  authorPhoto: user.photoUrl,
                  authorProgram: user.faculty,
                  text: trimmed,
                  images: imgDescs,
                  files: fileDescs,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              ],
            }
          : c
      ),
    }));
    return;
  }

  try {
    const resp = await postReplyToServer({
      postId,
      commentId,
      text: trimmed,
      images: imgDescs,
      files: fileDescs,
      authorId: user.id,
      authorName: `${user.title ? user.title + " " : ""}${user.name}`,
      authorPhoto: user.photoUrl,
      authorProgram: user.faculty,
    });

    const serverReply = resp?.reply;

    updatePostById(postId, (x) => ({
      ...x,
      comments: (x.comments || []).map((c) =>
        c.id === commentId
          ? { ...c, replies: [serverReply, ...(c.replies || [])] }
          : c
      ),
    }));
  } catch (err) {
    console.error("[LecturerDashboard] addReply failed:", err);

    // fallback local-only
    updatePostById(postId, (x) => ({
      ...x,
      comments: (x.comments || []).map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...(c.replies || []),
                {
                  id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  postId,
                  commentId,
                  authorId: user.id,
                  authorName: `${user.title ? user.title + " " : ""}${user.name}`,
                  authorPhoto: user.photoUrl,
                  authorProgram: user.faculty,
                  text: trimmed,
                  images: imgDescs,
                  files: fileDescs,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              ],
            }
          : c
      ),
    }));
  }
};*/


const addReply = async (postId, commentId, text, images = [], files = []) => {
  const trimmed = String(text || "").trim();
  if (!trimmed && images.length === 0 && files.length === 0) return;

  // ✅ Upload attachments to CloudFront so students can download
  let cfImages = [];
  let cfFiles = [];
  try {
    const up = await uploadCommentReplyAttachments(images, files, "lecturer/replies");
    cfImages = up.uploadedImages || [];
    cfFiles = up.uploadedFiles || [];
  } catch (e) {
    console.error("[LecturerDashboard] reply attachment upload failed:", e);
    cfImages = [];
    cfFiles = [];
  }

  const optimisticId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // optimistic local update
  updatePostById(postId, (x) => ({
    ...x,
    comments: (x.comments || []).map((c) =>
      c.id === commentId
        ? {
            ...c,
            replies: [
              {
                id: optimisticId,
                __pending: true,
                postId,
                commentId,
                authorId: user.id,
                authorName: `${user.title ? user.title + " " : ""}${user.name}`,
                authorPhoto: user.photoUrl,
                authorProgram: user.faculty,
                text: trimmed,
                images: cfImages,
                files: cfFiles,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              ...(c.replies || []),
            ],
          }
        : c
    ),
  }));

  try {
    const resp = await postReplyToServer({
      postId,
      commentId,
      text: trimmed,
      images: cfImages, // ✅ CloudFront-backed
      files: cfFiles,   // ✅ CloudFront-backed
      authorId: user.id,
      authorName: `${user.title ? user.title + " " : ""}${user.name}`,
      authorPhoto: user.photoUrl,
      authorProgram: user.faculty,
    });

    const serverReply = resp?.reply;

    if (serverReply?.id) {
      updatePostById(postId, (x) => ({
        ...x,
        comments: (x.comments || []).map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: (c.replies || []).map((r) => (r.id === optimisticId ? serverReply : r)),
              }
            : c
        ),
      }));
    } else {
      updatePostById(postId, (x) => ({
        ...x,
        comments: (x.comments || []).map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: (c.replies || []).map((r) => (r.id === optimisticId ? { ...r, __pending: false } : r)),
              }
            : c
        ),
      }));
    }
  } catch (err) {
    console.error("[LecturerDashboard] addReply failed:", err);
    updatePostById(postId, (x) => ({
      ...x,
      comments: (x.comments || []).map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: (c.replies || []).map((r) => (r.id === optimisticId ? { ...r, __pending: false } : r)),
            }
          : c
      ),
    }));
  }
};




  /* Delete post */
  /*const deletePost = (post) => {
    const ok = window.confirm("Delete this post for all students? This cannot be undone.");
    if (!ok) return;
    const key = post.multiGroupId || post.id;
    setPosts((p) =>
      post.multiGroupId ? p.filter(x => x.multiGroupId !== key) : p.filter(x => x.id !== key)
    );
  };*/

  /* Delete post (server + UI) */
const deletePost = async (post) => {
  const ok = window.confirm("Delete this post for all students? This cannot be undone.");
  if (!ok) return;

  // Optimistic UI remove (so it disappears instantly)
  const key = post.multiGroupId || post.id;
  const before = posts; // snapshot for rollback

  setPosts((p) =>
    post.multiGroupId ? p.filter((x) => x.multiGroupId !== key) : p.filter((x) => x.id !== key)
  );

  try {
    // IMPORTANT: backend needs scope + postId
    // If this is a multi-program post, delete each underlying post id that exists on server
    if (post.multiGroupId) {
      const siblings = (posts || []).filter((x) => x.multiGroupId === post.multiGroupId);
      const ids = siblings.map((x) => x.id).filter(Boolean);

      for (const id of ids) {
        await deletePostOnServer({ postId: id, scope: LECTURER_SCOPE });
      }
    } else {
      await deletePostOnServer({ postId: post.id, scope: LECTURER_SCOPE });
    }

    // Optional: pull fresh server truth so you see the same thing across devices immediately
    const remote = await fetchLecturerPostsFromServer();
    if (Array.isArray(remote)) {
      setPosts((prev) => mergeRemoteIntoLocal(prev, remote));
    }
  } catch (err) {
    console.error("[LecturerDashboard] deletePost failed:", err);

    // rollback UI if server delete fails
    setPosts(before);

    alert(
      "Delete failed on the server, so the post may still appear after refresh. Please try again."
    );
  }
};

 


  /* See ONLY my posts, optionally only faculty-scope */
  const isMyPost = (p) =>
    (p.authorId && p.authorId === user.id) ||
    (p.authorType === "lecturer" && p.author === `${user.title ? user.title + " " : ""}${user.name}`);
  const isFacultyAudienceForMe = (aud = "") => {
    const base = `FACULTY__${user.university}__${user.faculty}`;
    return aud === base || aud.startsWith(base + "__");
  };

  /* ---- Merge multi-program duplicates into a single row in lecturer view ---- */
  function mergeForLecturerView(list=[]) {
    const indexMap = new Map();
    list.forEach((p,i)=> indexMap.set(p.id, i));
    const groups = new Map();
    list.forEach((p) => {
      const key = p.multiGroupId || p.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    const result = [];
    groups.forEach((arr, key) => {
      if (arr.length === 1) {
        result.push(arr[0]);
      } else {
        const base = arr[0];
        const multiPrograms = Array.from(new Set(arr.map(a => a.authorProgram))).sort();
        const allC = [];
        arr.forEach(a => (a.comments||[]).forEach(c => allC.push(c)));
        const cMap = new Map();
        allC.forEach(c=> { if(!cMap.has(c.id)) cMap.set(c.id, c); });
        const rep = {
          ...base,
          multiGroupId: key,
          multiPrograms,
          displayProgramLabel: `Multiple programs (${multiPrograms.length})${base.targetYear ? ` • ${base.targetYear}` : ""}`,
          comments: Array.from(cMap.values()),
        };
        result.push(rep);
      }
    });
    result.sort((a,b)=>{
      const ia = Math.min(...( (a.multiGroupId ? (list.filter(x=>x.multiGroupId===a.multiGroupId).map(x=>indexMap.get(x.id))) : [indexMap.get(a.id)]) ));
      const ib = Math.min(...( (b.multiGroupId ? (list.filter(x=>x.multiGroupId===b.multiGroupId).map(x=>indexMap.get(x.id))) : [indexMap.get(b.id)]) ));
      return ia - ib;
    });
    return result;
  }

  const filteredRaw = posts
  .filter((p) => !["lp1", "lp2"].includes(String(p?.id || ""))) // ✅ hide seeded posts
    .filter(isMyPost)
    .filter((p) => (showFacultyOnly ? isFacultyAudienceForMe(p.audience) : true))
    .filter((p) => (filterType === "All" ? true : p.type === filterType));

  const filtered = mergeForLecturerView(filteredRaw);



  /* UI helpers */
  const toggleProgram = (prog) =>
    setSelectedPrograms((arr) => (arr.includes(prog) ? arr.filter((p) => p !== prog) : [...arr, prog]));
  const selectAllPrograms = () => setSelectedPrograms(availablePrograms.slice(0, 200));
  const clearPrograms = () => setSelectedPrograms([]);

  /* ---- Layout ---- */
  return (
    <div className="min-h-screen bg-[#f3f6fb]">
    

    {/* 🔒 Email verification gate — shown on first sign-in or after email change */}
    <VerifyGate email={current?.email} />





      {/* Keep total width tight and ensure equal margins on both sides */}
      <main className="max-w-[1280px] mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(720px,1fr)_280px] gap-6">
        {/* LEFT: Profile + filters */}
        <aside className="space-y-4 pb-24">
          {/* Profile card */}
          <Card className="p-0 overflow-hidden">
            <div className="relative h-20 bg-slate-200">
              {user.bannerUrl ? (
                <img src={user.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-r from-indigo-200 to-purple-200" />
              )}
              {/*<label className="absolute right-2 top-2 text-xs bg-white/80 px-2 py-1 rounded cursor-pointer border border-slate-100">
                Edit banner
                <input type="file" accept="image/*" className="hidden" onChange={onPickBanner} />
              </label>*/}
              <label className="absolute right-2 top-2 text-xs bg-white/80 px-2 py-1 rounded cursor-pointer border border-slate-100">
  Edit banner
  <input
    type="file"
    accept="image/*"
    className="hidden"
    onChange={onPickBanner}
  />
</label>
            </div>          

            <div className="px-4 pt-0 pb-4">
              <div className="-mt-8">
                <div className="inline-block relative">
                  <Avatar size="lg" url={user.photoUrl} name={user.name} online />
                  {/*<label className="absolute -right-1 -bottom-1 bg-white text-[10px] px-1 py-0.5 rounded cursor-pointer border border-slate-100">
                    Edit
                    <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
                  </label>*/}
                  <label className="absolute -right-1 -bottom-1 bg-white text-[10px] px-1 py-0.5 rounded cursor-pointer border border-slate-100">
  Edit
  <input
    type="file"
    accept="image/*"
    className="hidden"
    onChange={onPickAvatar}
  />
</label>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-semibold text-slate-900 text-lg">
                  {user.title ? `${user.title} ` : ""}{user.name}
                </div>
                <div className="text-sm text-slate-700">{user.university}</div>
                <div className="text-sm text-slate-700">{user.faculty}</div>
                <div className="text-sm text-slate-700 flex items-center gap-2 mt-1">
                  <FlagImage code={user.countryCode} country={user.country} size={22} />
                  <span>{user.country}</span>
                </div>
              </div>




              <div className="mt-4">
                <button
                  onClick={() => setMeOpen((v) => !v)}
                  className="text-sm rounded-full border border-slate-100 px-3 py-1 hover:bg-slate-50"
                >
                  Me ▾
                </button>
                {meOpen && (
                  <div className="mt-2 border border-slate-100 rounded-lg p-3 bg-white space-y-3">
                    <div className="text-sm font-medium text-center">Manage profile</div>

                    <label className="block text-sm">
                      Full name
                      <input
                        className="mt-1 w-full border border-slate-100 rounded px-2 py-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </label>

                    <label className="block text-sm">
                      Title
                      <select
                        className="mt-1 w-full border border-slate-100 rounded px-2 py-1"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      >
                        <option value="">Select Title</option>
                        {TITLE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>

                    <div className="flex justify-end gap-2">
                      <button className="text-sm rounded border border-slate-100 px-3 py-1" onClick={() => setMeOpen(false)}>
                        Cancel
                      </button>
                      <button
                        className="text-sm rounded bg-blue-600 text-white px-3 py-1"
                        onClick={() => {
                          setUser((u) => ({ ...u, name: editName.trim() || u.name, title: editTitle }));
                          setMeOpen(false);
                        }}
                        
                      >
                        Save
                      </button>
                    </div>

                    <hr className="my-3" />

                    <button
                      type="button"
                      onClick={() => setSecurityOpen((v) => !v)}
                      className="w-full flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                      aria-expanded={securityOpen}
                      aria-controls="account-security-panel"
                    >
                      <span className="font-medium text-slate-900">Account security</span>
                      <span className="text-slate-600">{securityOpen ? "▾" : "▸"}</span>
                    </button>

                    <div
                      id="account-security-panel"
                      className={`${securityOpen ? "mt-2 block" : "hidden"} `}
                    >
                      <div className="mt-2">
                        <AccountSecurityCard user={user} />
                      </div>
                    </div>

                    <Link to={getLecturerProfileHref()} className="block text-sm text-blue-600 underline text-center">
                      View profile
                    </Link>
                    <button
                      className="block w-full text-sm text-slate-600 underline text-center"
                      onClick={() => {
                        sessionStorage.clear();
                        navigate("/login?role=lecturer");
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Faculty-only filter */}
          <SidebarCard title={`View ${facultyLabel} posts`}>
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => setShowFacultyOnly((v) => !v)}
                className={`px-4 py-1 rounded-full text-sm ${
                  showFacultyOnly ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {showFacultyOnly ? "On" : "Off"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600 text-center">
              When on, you’ll only see {facultyLabel.toLowerCase()} posts you created (including year-specific).
            </p>
          </SidebarCard>

          {/* Academic posts filter */}
          <SidebarCard title="Academic posts">
            <div className="mt-2 space-y-2 text-sm">
              <FilterPill label="All" active={filterType === "All"} onClick={() => setFilterType("All")} />
              {POST_TYPES.map((t) => (
                <FilterPill key={t} label={t} active={filterType === t} onClick={() => setFilterType(t)} />
              ))}
            </div>
          </SidebarCard>
           {/* Normal Google Ad card */}
           <GoogleSidebarAd />
           
           {/* Sticky Google Ad card */}
           <div
             className="sticky top-[160px] pt-2 overflow-hidden"
             style={{ maxHeight: "calc(100vh - 160px - 24px)" }} // 24px bottom gap
           >
             <GoogleSidebarAd />
           </div>

        </aside>

        {/* CENTER: Composer + Feed */}
        <section className="space-y-4 min-w-0">
          <ErrorBoundary>
            <Card>
              {!composerOpen ? (
                <div className="flex items-center gap-3">
                  <Avatar size="md" url={user.photoUrl} name={user.name} online />
                  <button
                    onClick={() => setComposerOpen(true)}
                    className="flex-1 text-left border border-slate-100 rounded-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-600"
                  >
                    Start a post
                  </button>
                </div>
              ) : (
                <form onSubmit={onPost}>
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <Avatar size="md" url={user.photoUrl} name={user.name} online />
                    <div>
                      <div className="font-semibold text-slate-900">
                        {user.title ? `${user.title} ` : ""}{user.name}
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={toFaculty}
                          onChange={(e) => { setToFaculty(e.target.checked); if (e.target.checked) setSelectedPrograms([]); }}
                        />
                        <span>
                          Check this to post to <strong>{facultyTerm}</strong>. You’ll still choose a <strong>Year of Study</strong>.
                        </span>
                      </label>
                    </div>
                    <div className="ml-auto">
                      <select
                        value={composerType}
                        onChange={(e) => setComposerType(e.target.value)}
                        className="border border-slate-100 rounded px-2 py-1 text-sm"
                        title="Select post type"
                      >
                        {POST_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Title (used for all post types) */}
                  <label className="block mt-3 text-xs text-slate-600">
                    Add Title
                    <input
                      value={composerTitle}
                      onChange={(e) => setComposerTitle(e.target.value)}
                      placeholder={composerType === "Video" ? "e.g., Week 3 Lecturer Update" : "e.g., Midterm Review Session"}
                      className="mt-1 w-full border border-slate-200 rounded px-3 py-2 bg-white"
                    />
                  </label>

                  {/* Video field (only shown when type=Video, but posts follow same audience logic) */}
                  {composerType === "Video" && (
                    <label className="block mt-3 text-xs text-slate-600">
                      YouTube URL or Video ID
                      <input
                        value={composerVideoUrl}
                        onChange={(e) => setComposerVideoUrl(e.target.value)}
                        placeholder="https://youtu.be/abcdEFGhijk or abcdEFGhijk"
                        className="mt-1 w-full border border-slate-200 rounded px-3 py-2 bg-white"
                      />
                    </label>
                  )}

                  {/* Target selectors */}
                  {toFaculty ? (
                    <div className="mt-3 grid sm:grid-cols-2 gap-2">
                      <label className="text-xs text-slate-600">
                        Year of Study
                        <select
                          className="mt-1 w-full border border-slate-200 rounded px-2 py-1"
                          value={targetYear}
                          onChange={(e) => setTargetYear(e.target.value)}
                        >
                          <option value="">Select Year</option>
                          {YEARS_SAFE.map((y) => (<option key={y} value={y}>{y}</option>))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="mt-3 grid sm:grid-cols-2 gap-2">
                      <div className="text-xs text-slate-600">
                        <div className="mb-1">Academic Programs (select multiple)</div>
                        <div className="max-h-44 overflow-auto border border-slate-200 rounded p-2 space-y-1 bg-white">
                          {availablePrograms.length === 0 && <div className="text-slate-500 text-xs">No programs found.</div>}
                          {availablePrograms.map((p) => (
                            <label key={p} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedPrograms.includes(p)}
                                onChange={() => toggleProgram(p)}
                              />
                              <span className="truncate">{p}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-1 flex gap-2">
                          <button type="button" className="text-xs underline" onClick={selectAllPrograms}>Select all</button>
                          <button type="button" className="text-xs underline" onClick={clearPrograms}>Clear</button>
                        </div>
                      </div>
                      <label className="text-xs text-slate-600">
                        Year of Study
                        <select
                          className="mt-1 w-full border border-slate-200 rounded px-2 py-1"
                          value={targetYear}
                          onChange={(e) => setTargetYear(e.target.value)}
                        >
                          <option value="">Select Year</option>
                          {YEARS_SAFE.map((y) => (<option key={y} value={y}>{y}</option>))}
                        </select>
                      </label>
                    </div>
                  )}

                  {/* Toolbar */}
                  {/* Toolbar (text formatting + links) */}
                  <div className="mt-3 flex items-center gap-2">
                    <ToolbarButton onClick={() => exec("bold")} label="B" title="Bold" />
                    <ToolbarButton onClick={() => exec("italic")} label={<em>I</em>} title="Italic" />
                    <ToolbarButton onClick={addLink} label="🔗" title="Add link" />
                  </div>

                  {/* NEW: S3-backed attachments */}
                  <div className="mt-3">
                    <AttachmentUploader
                      value={composerAttachments}
                      //onChange={setComposerAttachments}
                      onChange={(next) => setComposerAttachments(dedupeAttachments(next))}
                      maxFiles={5}
                      maxSizeMB={10}
                      folder="lecturer-posts"
                      label="Images & files"
                      helperText="Up to 5 items • max 10 MB each. Images, PDFs, docs, slides."
                    />
                  </div>

                  {/* Editor (also used for video description if needed) */}
                  <div
                    ref={editorRef}
                    contentEditable
                    onPaste={handlePaste}
                    className="mt-3 min-h-[110px] max-h-[50vh] overflow-auto border border-slate-200 rounded-lg bg-white px-3 py-2 focus:outline-none whitespace-pre-wrap break-words"
                    suppressContentEditableWarning
                  ></div>

                  {/* Links list */}
                  {composerLinks.length > 0 && (
                    <div className="mt-2 text-sm">
                      <div className="text-xs text-slate-600 mb-1">Links</div>
                      <ul className="space-y-1">
                        {composerLinks.map((u) => (
                          <li key={u} className="flex items-center gap-2">
                            <a href={u} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                              {u}
                            </a>
                            <button
                              type="button"
                              className="text-xs underline"
                              onClick={() => setComposerLinks((links) => links.filter((x) => x !== u))}
                            >
                              remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  
                  {/* Actions */}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setComposerOpen(false);
                        if (editorRef.current) editorRef.current.innerHTML = "";
                        setComposerTitle("");
                        setImagePreviews([]); setDocFiles([]);
                        setComposerAttachments([]);
                        setComposerLinks([]);
                        setComposerType("Notes");
                        setToFaculty(false); setSelectedPrograms([]); setTargetYear("");
                        setComposerVideoUrl("");
                      }}

                      className="rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                    >
                      Post
                    </button>
                  </div>
                </form>
              )}
            </Card>
          </ErrorBoundary>

          {/* Feed (deduped multi-program posts) */}
          {filtered.map((p) => (
            <PostCard
              key={p.multiGroupId || p.id}
              post={p}
              onToggleLike={() => toggleLikeBy(p)}
              onAddComment={(text, images, files) => addComment(p.id, text, images, files)}
              onAddReply={(commentId, text, images, files) => addReply(p.id, commentId, text, images, files)}
              onDelete={() => deletePost(p)}
              currentUser={user}
            />
          ))}
          
    </section>

        {/* RIGHT: Updates*/}
        <aside className="space-y-4 min-w-0 w-full max-w-full">
          <Card className="overflow-hidden">
  <div className="font-semibold text-slate-900 text-center">Updates for Lecturers</div>

  {/* Dynamic title from the latest Admin video post; falls back to the old sentence */}
  <p className="text-sm text-slate-600 mt-1 text-center">
    {(latestAdminLecturerVideo?.title?.trim?.() || "Weekly video: teaching resources and key deadlines.")}
  </p>

  <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-slate-100">
  {(
    latestAdminLecturerVideo?.videoUrlOrId ||
    latestAdminLecturerVideo?.videoId ||
    latestAdminLecturerVideo?.videoUrl
  ) ? (
    <YouTubeEmbed
      idOrUrl={
        latestAdminLecturerVideo.videoUrlOrId ||
        latestAdminLecturerVideo.videoId ||
        latestAdminLecturerVideo.videoUrl
      }
      title={latestAdminLecturerVideo.title || "Lecturer Updates"}
    />
  ) : (
    <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">
      No video posted yet for lecturers.
    </div>
  )}
</div>

{latestAdminLecturerVideo?.createdAt && (
  <div className="mt-2 text-xs text-slate-500 text-center">
    Posted {new Date(latestAdminLecturerVideo.createdAt).toLocaleString()}
  </div>
)}
</Card>


          {/*<Card className="overflow-hidden">
            <div className="font-semibold text-slate-900 text-center">Students’ Messages</div>
            <p className="text-sm text-slate-600 mt-1 text-center">
              Read and respond to students’ questions.
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <Link
                to="/lecturer/messages"
                className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Open Messages
              </Link>
              {unreadStudentMsgs > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs rounded-full bg-red-600 text-white">
                  ({unreadStudentMsgs})
                </span>
              )}
            </div>
          </Card>*/}

          {/* Students' links: quick links under Students’ Messages */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-semibold text-slate-900 text-center rounded-lg px-3 py-2 bg-sky-100">
               Academic platforms
              </h3>

              <ul className="mt-3 space-y-2 text-sm">
              <li>
               <Link
                 to="/platform/university"
                   className="block text-center rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800"
                 >
                    University Academic Platform
                  </Link>
                 </li>
                <li>
                <Link
                     to="/platform/global"
                    className="block text-center rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800"
                  >
                   Global Academic Platform
                </Link>
             </li>
           </ul>
          </div> 
           {/* Normal Google Ad card */}
           <GoogleSidebarAd />
           
           {/* Sticky Google Ad card */}
           <div
             className="sticky top-[160px] pt-2 overflow-hidden"
             style={{ maxHeight: "calc(100vh - 160px - 24px)" }} // 24px bottom gap
           >
             <GoogleSidebarAd />
           </div>
        </aside>
      </main>

      {/* Idle warning modal */}
      {idleWarning && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
            <h3 className="text-lg font-semibold text-slate-900">You have been inactive</h3>
            <p className="mt-2 text-slate-700">
              Log out in <span className="font-semibold">{countdown}</span> seconds?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded border border-slate-100 px-4 py-2 text-sm hover:bg-slate-50"
                onClick={() => { setIdleWarning(false); if (countdownRef.current) clearInterval(countdownRef.current); resetIdleTimer(); }}
              >
                Stay Logged In
              </button>
              <button
                className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
                onClick={() => { setIdleWarning(false); if (countdownRef.current) clearInterval(countdownRef.current); navigate("/login?role=lecturer"); }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------- Reusable UI ---------------------- */
function Card({ className = "", children }) {
  return (
    <div className={`w-full max-w-full box-border rounded-2xl border border-slate-100 bg-white p-4 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/* SidebarCard with square corners + centered header */
function SidebarCard({ title, children }) {
  return (
    <div className="w-full max-w-full box-border border border-slate-200 bg-white rounded-none shadow-sm overflow-hidden">
      <div className="w-full bg-indigo-50 text-slate-800 font-semibold px-3 py-2 border-b border-slate-200 text-center">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}



function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-full text-sm ${
        active ? "bg-[rgb(102,0,102)] text-white" : "border border-slate-200 hover:bg-slate-50"
      }`}
      title={label}
    >
      {label}
    </button>
  );
}
function ToolbarButton({ onClick, label, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
/* Avatar with optional online dot */
function Avatar({ size = "md", url, name, online=false }) {
  const sizeClass = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const container = `${sizeClass} relative rounded-full bg-slate-300 flex items-center justify-center overflow-hidden`;
  return (
    <div className={container}>
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover rounded-full" />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-white text-sm bg-gradient-to-tr from-indigo-500 to-purple-500">
          {initials(name)}
        </div>
      )}
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Online" />}
    </div>
  );
}

function sanitizePastedHtml(html = "") {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // remove dangerous tags
  doc.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach(n => n.remove());

  // remove attributes that make it depend on external CSS (and remove inline styles)
  doc.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("class");
    el.removeAttribute("style");

    // remove event handlers + javascript: URLs
    [...el.attributes].forEach((a) => {
      const name = a.name.toLowerCase();
      const val = String(a.value || "").trim().toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(a.name);
      if ((name === "href" || name === "src") && val.startsWith("javascript:")) {
        el.removeAttribute(a.name);
      }
    });
  });

  return doc.body.innerHTML;
}

/* ------------------- Post & Comments (with lightbox + attachments) ---------------------- */
//function PostCard({ post, onToggleLike, onAddComment, onAddReply, onDelete, currentUser }) {
function PostCard({ post, onToggleLike, onAddComment, onAddReply, onDelete, currentUser, currentUserId }) {
  const [showComments, setShowComments] = useState(true);
  const [cmt, setCmt] = useState("");
  const [cmtHtml, setCmtHtml] = useState(""); // ✅ ADD THIS LINE HERE
  const [cmtImages, setCmtImages] = useState([]); // [{name,dataUrl}]
  const [cmtFiles, setCmtFiles] = useState([]);   // [{name,mime,dataUrl}]
  // ✅ ADD THESE TWO HERE (right after the state)
  const cmtRef = useRef(null);

  useEffect(() => {
    const el = cmtRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  }, [cmt]);


  

  const [lightbox, setLightbox] = useState({ open:false, items:[], index:0 });
  const openLightbox = (items = [], index = 0) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setLightbox({ open:true, items:items.slice(), index: Math.max(0, Math.min(index, items.length - 1)) });
  };
  const closeLightbox = () => setLightbox(l => ({ ...l, open:false }));
  const step = (dir) => setLightbox(l => {
    const len = l.items?.length || 0;
    if (len <= 1) return l;
    return { ...l, index: (l.index + dir + len) % len };
  });
  useEffect(()=> {
    if (!lightbox.open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open]); // eslint-disable-line

  const onPickCmtImages = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    const dataUrls = await Promise.all(files.map(f => fileToDownscaledDataURL(f, 1280, 1280, 0.82, 420)));
    const mapped = dataUrls.map((dataUrl,i)=>({name:files[i].name, dataUrl}));
    setCmtImages(arr => [...arr, ...mapped]);
    e.target.value = "";
  };
  const onPickCmtDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = await Promise.all(files.map(async f=>({ name:f.name, mime:f.type||"application/octet-stream", dataUrl: await readFileAsDataURL(f)})));
    setCmtFiles(arr => [...arr, ...mapped]);
    e.target.value = "";
  };

  const images = post.images || [];
  const programLabel = post.displayProgramLabel || post.authorProgram;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">



      {/* Header */}
<div className="flex items-center gap-3">
  <Avatar
    size="md"
    url={post.authorPhoto || post.authorAvatarUrl || post.authorAvatar || post.avatarUrl}
    name={post.authorName || post.author || post.name}
  />

  <div className="min-w-0">
    <div className="font-semibold text-slate-900 truncate">
      {displayWithTitle(
        post.authorName || post.author || "",
        post.authorTitle || post.title || "",
        post.authorName || post.author || ""
      )}
    </div>

    <div className="text-xs text-slate-500">
      {programLabel || post.type} • {formatTimeAgo(post.createdAt || post.updatedAt)} •{" "}
      {post.audience === "GLOBAL"
        ? "Public"
        : post.audience?.startsWith("FACULTY__")
        ? "Faculty"
        : post.multiGroupId
        ? "Programs"
        : "Program"}
    </div>
  </div>

  <span className="ml-auto text-xs rounded-full border border-slate-100 px-2 py-0.5">
    {post.type}
  </span>

  
  {currentUser?.id === post.authorId && (
    <button
      title="Delete post"
      onClick={onDelete}
      className="ml-2 text-slate-500 hover:text-red-600 rounded px-2 py-1"
    >
      <TrashIcon className="w-4 h-4" />
    </button>
  )}

</div>


      {/* NEW: Title */}
      {post.title && (
        <div className="mt-2 text-slate-900 font-semibold text-base">{post.title}</div>
      )}

      {/* Body */}
      <ExpandableHtml html={post.html} />

      {/* If video post, embed video */}
      {post.type === "Video" && post.videoUrlOrId && (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black/5">
          <YouTubeEmbed idOrUrl={post.videoUrlOrId} title={post.title || "Video"} />
        </div>
      )}

      {/* Images */}
      {images.length>0 && (
        <div className="mt-3">
          <ImageGrid images={images} onOpen={(idx)=>openLightbox(images, idx)} max={3} tileClass="h-40" />
        </div>
      )}

      {/* Lightbox */}
      {lightbox.open && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
        >
          <div
            className="relative max-w-6xl w-full pointer-events-auto"
            onClick={stop}
            onPointerDown={stop}
          >
            <AttachmentImage
              att={lightbox.items[lightbox.index]}
              enlarge
              className="w-full max-h-[88vh] object-contain rounded"
            />
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white rounded-full px-2 py-1 text-sm shadow z-10"
              aria-label="Close"
              onPointerDown={(e) => { stop(e); closeLightbox(); }}
            >
              ✕
            </button>
            {lightbox.items.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous"
                  title="Previous"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full shadow px-3 py-2 text-xl z-10"
                  onPointerDown={(e) => { stop(e); step(-1); }}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  title="Next"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full shadow px-3 py-2 text-xl z-10"
                  onPointerDown={(e) => { stop(e); step(1); }}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

     

      {/* Files */} 
   {post.files?.length > 0 && (
  <ul className="mt-2 text-sm text-slate-700 space-y-1">
    {post.files.map((f, i) => (
      <li key={`${(f.id || f.name || "f")}-${i}`} className="flex items-center gap-2">
        <AttachmentLink att={f} />
      </li>
    ))}
  </ul>
     )}

      {/* actions */}
      <div className="mt-3 flex items-center gap-6 text-sm text-slate-600">
        <button onClick={onToggleLike} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill={post.liked ? "currentColor" : "none"} stroke="currentColor">
            <path d="M10 17l-1.45-1.32C4.4 11.36 2 9.28 2 6.5 2 4.5 3.5 3 5.5 3c1.54 0 2.99.99 3.57 2.36h1.86C11.51 3.99 12.96 3 14.5 3 16.5 3 18 4.5 18 6.5c0 2.78-2.4 4.86-6.55 9.18L10 17z"/>
          </svg>
          Like {post.likes>0 && <span className="text-slate-500">({post.likes})</span>}
        </button>
        <button onClick={()=>setShowComments(s=>!s)} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
          💬 Comment {post.comments?.length>0 && <span className="text-slate-500">({post.comments.length})</span>}
        </button>
        <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">↗ Share</button>
      </div>

      {/* comments */}
      {showComments && (
        <div className="mt-3 space-y-3">
          {(Array.isArray(post.comments) ? post.comments : []).map(c => (
            <CommentThread
              key={c.id}
              comment={c}
              onAddReply={(text, images, files) => onAddReply(c.id, text, images, files)}  // ✅ pass just (commentId, text…)
            />
          ))}
{/* add comment */}
      <form
  onSubmit={(e) => {
    e.preventDefault();

    const text = (cmt || "").replace(/\r\n/g, "\n");
    onAddComment(text, cmtImages, cmtFiles);

    setCmt("");
    setCmtHtml("");
    setCmtImages([]);
    setCmtFiles([]);
  }}
  
    
  className="flex flex-col gap-2"
  >


            {/*<div className="flex items-start gap-2">
  <Avatar size="sm" url={currentUser?.photoUrl} name={currentUser?.name || "Me"} online />

  <div className="flex-1">*/}

    <div className="flex items-start gap-2">
  <div className="shrink-0">
    <Avatar size="sm" url={currentUser?.photoUrl} name={currentUser?.name || "Me"} online />
  </div>

  <div className="flex-1 min-w-0">


    <textarea
      ref={cmtRef}
      value={cmt}
      onChange={(e) => setCmt(e.target.value)}
      onPaste={(e) => {
  const html = e.clipboardData?.getData("text/html") || "";
  setCmtHtml(sanitizePastedHtml(html));
}}
      placeholder="Write a comment on a post…"
      rows={1}
      onInput={(e) => {
        e.currentTarget.style.height = "0px";
        e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
      }}
      className="w-full border border-slate-200 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none overflow-hidden whitespace-pre-wrap break-words leading-6"
    />
  </div>

  <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📷
    <input type="file" accept="image/*" multiple className="hidden" onChange={onPickCmtImages}/>
  </label>
  <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📎
    <input type="file" multiple className="hidden" onChange={onPickCmtDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
  </label>

  <button className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
    Post
  </button>
</div>
{/* ✅ Preview (only shows formatting when paste provided HTML) */}
{/*{(cmtHtml || cmt)?.trim?.() && (
  <div className="pl-10">
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="text-xs text-slate-500 mb-2">Preview</div>   

      {cmtHtml ? ( 
        <div className="prose prose-sm max-w-none prose-headings:font-bold prose-strong:font-bold">
          <div dangerouslySetInnerHTML={{ __html: cmtHtml }} />
        </div>
        
      ) : (
        renderTextWithHeadings((cmt || "").replace(/\r\n/g, "\n"))
      )}
    </div>
  </div>
)}*/}


            
              {/*<label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📷
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPickCmtImages}/>
              </label>
              <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📎
                <input type="file" multiple className="hidden" onChange={onPickCmtDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
              </label>
              <button className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
                Post
              </button>
            </div>*/}

            {(cmtImages.length>0 || cmtFiles.length>0) && (
              <div className="pl-10 space-y-2">
                {cmtImages.length>0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {cmtImages.map((img,i)=>(
                      <div key={i} className="relative">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover rounded" />
                        <button
                          type="button"
                          className="absolute right-1 top-1 bg-white/90 rounded text-xs px-1"
                          onClick={()=> setCmtImages(prev => prev.filter((_,idx)=>idx!==i))}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {cmtFiles.length>0 && (
                  <ul className="text-sm space-y-1">
                    {cmtFiles.map((f,i)=>(
                      <li key={i} className="flex items-center gap-2">
                        📎 <span>{f.name}</span>
                        <button type="button" className="text-xs underline" onClick={()=> setCmtFiles(prev => prev.filter((_,idx)=>idx!==i))}>remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}





/*function CommentThread({ comment, onAddReply }) {
  const [reply,setReply]=useState("");
  const [replyImages,setReplyImages]=useState([]); // [{name,dataUrl}]
  const [replyFiles,setReplyFiles]=useState([]);   // [{name,mime,dataUrl}]

  const [replyHtml, setReplyHtml] = useState("");   // ✅ add
   const replyRef = useRef(null);                   // ✅ add

  const [lightbox, setLightbox] = useState({ open:false, items:[], index:0 });
  const openLightbox = (items = [], index = 0) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setLightbox({ open:true, items:items.slice(), index: Math.max(0, Math.min(index, items.length - 1)) });
  };
  const closeLightbox = () => setLightbox(l => ({ ...l, open:false }));
  const step = (dir) => setLightbox(l => {
    const len = l.items?.length || 0;
    if (len <= 1) return l;
    return { ...l, index: (l.index + dir + len) % len };
  });
  useEffect(()=> {
    if (!lightbox.open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open]); // eslint-disable-line


  useEffect(() => {
  const el = replyRef.current;
  if (!el) return;
  el.style.height = "0px";
  el.style.height = el.scrollHeight + "px";
}, [reply]);*/


function CommentThread({ comment, onAddReply }) {
  const [reply, setReply] = useState("");
  const [replyImages, setReplyImages] = useState([]); // [{name,dataUrl}]
  const [replyFiles, setReplyFiles] = useState([]);   // [{name,mime,dataUrl}]

  const [replyHtml, setReplyHtml] = useState("");     // ✅ add
  const replyRef = useRef(null);                      // ✅ add

  const [lightbox, setLightbox] = useState({ open: false, items: [], index: 0 });

  const openLightbox = (items = [], index = 0) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setLightbox({
      open: true,
      items: items.slice(),
      index: Math.max(0, Math.min(index, items.length - 1)),
    });
  };

  const closeLightbox = () => setLightbox((l) => ({ ...l, open: false }));

  const step = (dir) =>
    setLightbox((l) => {
      const len = l.items?.length || 0;
      if (len <= 1) return l;
      return { ...l, index: (l.index + dir + len) % len };
    });

  useEffect(() => {
    if (!lightbox.open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open]); // eslint-disable-line

  // ✅ auto-grow + retract
  useEffect(() => {
    const el = replyRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  }, [reply]);





  const onPickReplyImages = async (e)=>{
    const files = Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"));
    const dataUrls = await Promise.all(files.map(f=>fileToDownscaledDataURL(f, 1280, 1280, 0.82, 420)));
    const mapped = dataUrls.map((dataUrl,i)=>({name:files[i].name, dataUrl}));
    setReplyImages(arr=>[...arr, ...mapped]);
    e.target.value="";
  };
  const onPickReplyDocs = async (e)=>{
    const files = Array.from(e.target.files||[]);
    const mapped = await Promise.all(files.map(async f=>({ name:f.name, mime:f.type||"application/octet-stream", dataUrl: await readFileAsDataURL(f) })));
    setReplyFiles(arr=>[...arr, ...mapped]);
    e.target.value="";
  };

  const commentAuthorName =
    comment.authorName ||
    comment.author ||
    comment.studentName ||
    comment.lecturerName ||
    comment.name ||
    comment.displayName ||
    "Student";

  return (
  <div className="text-sm">
    <div className="flex items-start gap-2">
      <Avatar size="sm" url={comment.authorPhoto} name={commentAuthorName} />
      <div className="flex-1">
        {/*<div className="font-medium text-slate-800">
          {displayWithTitle(commentAuthorName, "", commentAuthorName)}
        </div>
        <div className="text-xs text-slate-500 mb-1">{comment.authorProgram || ""}</div>*/}
        <div className="font-bold text-slate-900">
  {displayWithTitle(commentAuthorName, "", commentAuthorName)}
</div>

{comment.authorProgram ? (
  <div className="text-xs font-bold text-blue-800 mb-1">
    {comment.authorProgram}
  </div>
) : null}

        <ExpandableText
          text={comment.text}
          className="whitespace-pre-wrap break-words leading-6"
        

/>

          {/* comment images */}
          {comment.images?.length>0 && (
            <div className="mt-2">
              <ImageGrid
                images={comment.images}
                onOpen={(idx)=>openLightbox(comment.images, idx)}
                max={3}
                tileClass="h-24"
                cols="grid-cols-2 md:grid-cols-3"
              />
            </div>
          )}
          {/* comment files */}
          {comment.files?.length>0 && (
            <ul className="mt-2 space-y-1">
              {comment.files.map((f,idx)=>(<li key={idx} className="flex items-center gap-2">📎 <AttachmentLink att={f} /></li>))}
            </ul>
          )}

          {/* replies (guarded) */}
{(() => {
  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  return replies.length > 0 ? (
    <div className="mt-2 pl-6 space-y-2">
      {/*{replies.map((r) => (
        <div key={r.id} className="flex items-start gap-2">
          <Avatar size="sm" url={r.authorPhoto} name={r.author} />
          <div>*/}

            {/*{replies.map((r) => (
  <div key={r.id} className="flex items-start gap-2">
    <div className="shrink-0">
      <Avatar size="sm" url={r.authorPhoto} name={r.author} />
    </div>

    <div className="min-w-0 flex-1">
            <div className="font-medium text-slate-800">
              {displayWithTitle(r.author, "", "")}
            </div>
            <div className="text-xs text-slate-500 mb-1">{r.authorProgram || ""}</div>
            <ExpandableText text={r.text} />

            {r.images?.length > 0 && (
              <div className="mt-2">
                <ImageGrid
                  images={r.images}
                  onOpen={(idx) => openLightbox(r.images, idx)}
                  max={3}
                  tileClass="h-24"
                  cols="grid-cols-2 md:grid-cols-3"
                />
              </div>
            )}

            {r.files?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {r.files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    📎 <AttachmentLink att={f} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : null;
})()}*/}


{replies.map((r) => {
  const replyAuthorName =
    r.authorName ||
    r.author ||
    r.studentName ||
    r.lecturerName ||
    r.name ||
    r.displayName ||
    "Student";

  return (
    <div key={r.id} className="flex items-start gap-2">
      <div className="shrink-0">
        <Avatar size="sm" url={r.authorPhoto} name={replyAuthorName} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-900">
          {displayWithTitle(replyAuthorName, "", replyAuthorName)}
        </div>
        {/*<div className="text-xs text-slate-500 mb-1">{r.authorProgram || ""}</div>*/}
        {r.authorProgram ? (
  <div className="text-xs font-bold text-blue-800 mb-1">
    {r.authorProgram}
  </div>
) : null}
        <ExpandableText text={r.text} />

        {r.images?.length > 0 && (
          <div className="mt-2">
            <ImageGrid
              images={r.images}
              onOpen={(idx) => openLightbox(r.images, idx)}
              max={3}
              tileClass="h-24"
              cols="grid-cols-2 md:grid-cols-3"
            />
          </div>
        )}

        {r.files?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {r.files.map((f, i) => (
              <li key={i} className="flex items-center gap-2">
                📎 <AttachmentLink att={f} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
})}
</div>
  ) : null;
})()}

          {/* Lightbox for comment/replies */}
          {lightbox.open && (
            <div
              className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
              onPointerDown={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
            >
              <div
                className="relative max-w-6xl w-full pointer-events-auto"
                onClick={stop}
                onPointerDown={stop}
              >
                <AttachmentImage
                  att={lightbox.items[lightbox.index]}
                  enlarge
                  className="w-full max-h-[88vh] object-contain rounded"
                />
                <button
                  type="button"
                  className="absolute -top-3 -right-3 bg-white rounded-full px-2 py-1 text-sm shadow z-10"
                  aria-label="Close"
                  onPointerDown={(e) => { stop(e); closeLightbox(); }}
                >
                  ✕
                </button>
                {lightbox.items.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous"
                      title="Previous"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full shadow px-3 py-2 text-xl z-10"
                      onPointerDown={(e) => { stop(e); step(-1); }}
                    >
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Next"
                      title="Next"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full shadow px-3 py-2 text-xl z-10"
                      onPointerDown={(e) => { stop(e); step(1); }}
                    >
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* add reply */}
          
<form
   onSubmit={(e) => {
    e.preventDefault();

    const text = (reply || "").replace(/\r\n/g, "\n");
    /*onAddReply(text, replyImages, replyFiles);*/
    onAddReply(text, replyImages, replyFiles, replyHtml);

    setReply("");
    setReplyHtml("");
    setReplyImages([]);
    setReplyFiles([]);
  }}
  className="mt-2 flex flex-col gap-2"

>
  



  <div className="flex items-start gap-2">
    {/* ✅ wrap textarea in flex-1, textarea uses w-full */}
    <div className="flex-1">
      <textarea
        ref={replyRef}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        onPaste={(e) => {
          const html = e.clipboardData?.getData("text/html") || "";
          setReplyHtml(sanitizePastedHtml(html));
        }}
        placeholder="Write a reply…"
        rows={1}
        onInput={(e) => {
          e.currentTarget.style.height = "0px";
          e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
        }}
        className="w-full border border-slate-200 rounded-2xl px-3 py-2 resize-none overflow-hidden whitespace-pre-wrap break-words leading-6"
      />
    </div>

    <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📷
      <input type="file" accept="image/*" multiple className="hidden" onChange={onPickReplyImages}/>
    </label>

    <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📎
      <input type="file" multiple className="hidden" onChange={onPickReplyDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
    </label>

    <button className="rounded-full bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-emerald-700">
      Reply
    </button>
  </div>
  

  
  {(replyImages.length > 0 || replyFiles.length > 0) && (
    <div className="mt-2 space-y-2 pl-1">
      {replyImages.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {replyImages.map((img, i) => (
            <div key={i} className="relative">
              <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover rounded" />
              <button
                type="button"
                className="absolute right-1 top-1 bg-white/90 rounded text-xs px-1"
                onClick={() => setReplyImages((prev) => prev.filter((_, idx) => idx !== i))}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {replyFiles.length > 0 && (
        <ul className="text-xs space-y-1">
          {replyFiles.map((f, i) => (
            <li key={i} className="flex items-center gap-2">
              📎<span>{f.name}</span>
              <button type="button" className="text-xs underline" onClick={() => setReplyFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )}
</form>
        </div>
      </div>
    </div>
  );
}

/* ---------- Expandable text/html ---------- */
function stripHtml(s = "") { const div = document.createElement("div"); div.innerHTML = s; return (div.textContent || div.innerText || "").trim(); }
/*function ExpandableText({ text, initialChars = 180 }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const tooLong = text.length > initialChars;
  const shown = open || !tooLong ? text : text.slice(0, initialChars) + "…";
  return (
    <div className="mt-1 text-slate-800">
      <span>{shown}</span>
      {tooLong && (
        <button onClick={() => setOpen((v) => !v)} className="ml-2 text-blue-600 hover:underline">
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}*/
/* ---------- Expandable text/html ---------- */

function renderTextWithHeadings(text = "") {
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");

  const isHeadingLine = (s) => {
    const t = s.trim();
    if (!t) return false;

    // Only bold known headings (safe) or ALL CAPS headings
    const common =
      /^(key aspects|benefits|challenges|challenges & criticisms|limitations|overview|summary|modern trends|policy issues|trade imbalances|governance & regulation|types of trade)$/i;

    const allCaps = /^[A-Z0-9\s]{6,}$/.test(t);

    return common.test(t) || allCaps;
  };

  return (
    <div className="whitespace-pre-wrap break-words leading-6">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // keep blank lines (paragraph spacing)
        if (!trimmed) return <div key={i} className="h-3" />;

        // Bold "Label:" at start of line, e.g. "Definition: ...."
        const m = trimmed.match(/^([A-Za-z][A-Za-z\s]{1,30}):\s*(.*)$/);
        if (m) {
          const label = m[1];
          const rest = m[2] || "";
          return (
            <div key={i}>
              <strong>{label}:</strong> {rest}
            </div>
          );
        }

        // Bold heading lines like "Key Aspects" / "Benefits"
        if (isHeadingLine(trimmed)) {
          return (
            <div key={i} className="font-semibold mt-2">
              {trimmed}
            </div>
          );
        }

        // normal line (bullets like • stay visible as characters)
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

function ExpandableText({ text, initialChars = 180, className = "" }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  const tooLong = text.length > initialChars;
  const shown = open || !tooLong ? text : text.slice(0, initialChars) + "…";

  return (
    <div className="mt-1 text-slate-800">
      {/*<div className={`whitespace-pre-wrap break-words ${className || ""}`}>
        {shown}
      </div>*/}
      <div className={className}>
  {renderTextWithHeadings(shown)}
</div>

      {tooLong && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-2 text-blue-600 hover:underline"
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function ExpandableHtml({ html, initialChars = 280 }) {
  const [open, setOpen] = useState(false);
  const plain = stripHtml(html || "");
  const tooLong = plain.length > initialChars;
  const shortHtml = plain.slice(0, initialChars) + (tooLong ? "…" : "");
  return (
    <div className="mt-3 text-slate-800 prose-sm max-w-none">
      {open || !tooLong ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <div>{shortHtml}</div>}
      {tooLong && (
        <button onClick={() => setOpen((v) => !v)} className="mt-1 text-blue-600 text-sm hover:underline">
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}