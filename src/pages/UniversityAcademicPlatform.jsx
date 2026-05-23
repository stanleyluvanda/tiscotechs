// src/pages/UniversityAcademicPlatform.jsx
import { useEffect, useMemo, useRef, useState, memo, forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";
import AttachmentUploader from "../components/upload/AttachmentUploader.jsx";
import { reportContent } from "../lib/moderationApi.js"; // adjust path
import { uploadFileToS3 } from "../lib/uploadLambda"; // adjust path if different
import {
  fetchPosts,
  createPost as createPostOnServer,
  deletePost as deletePostOnServer,
  postCommentToServer,
  postReplyToServer,
} from "../lib/postsApi.js";



async function addPastedImagesToUploadAtts(cb, setAskUploadAtts) {
  const items = cb?.items ? Array.from(cb.items) : [];
  const imageItems = items.filter((it) => it?.type && it.type.startsWith("image/"));
  if (imageItems.length === 0) return false;

  for (const it of imageItems) {
    const file = it.getAsFile();
    if (!file) continue;

    if (file.size > 8 * 1024 * 1024) {
      alert("Screenshot is too large. Please use an image under 8MB.");
      continue;
    }

    const uploaded = await uploadFileToS3(file);

    const att = {
      url: uploaded.url,
      key: uploaded.key,
      fileName: file.name || "screenshot.png",
      size: file.size,
      mime: file.type || "image/png",
      type: "image",
    };

    setAskUploadAtts((prev) => [...(Array.isArray(prev) ? prev : []), att]);
  }

  return true;
}


/* ============ Utils & Storage ============ */
function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}
const ID_KEYS = ["authUserId", "activeUserId", "currentUserId", "loggedInUserId"];
function loadActiveUser() {
  for (const src of [sessionStorage, localStorage]) {
    for (const key of ID_KEYS) {
      const id = src.getItem(key);
      if (id) {
        const byId = safeParse(localStorage.getItem("usersById")) || {};
        if (byId[id]) return byId[id];
        const arr = safeParse(localStorage.getItem("users")) || [];
        const found = arr.find((u) => u.id === id || u.uid === id || u.userId === id);
        if (found) return found;
      }
    }
  }
  return (
    safeParse(sessionStorage.getItem("currentUser")) ||
    safeParse(localStorage.getItem("currentUser"))
  );
}
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};
const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/* Presence (very lightweight) */
const PRESENCE_KEY = "presence__byUserId";
function touchPresence(userId) {
  if (!userId) return;
  const m = safeParse(localStorage.getItem(PRESENCE_KEY)) || {};
  m[userId] = Date.now();
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(m));
}
function isOnline(userId) {
  if (!userId) return false;
  const m = safeParse(localStorage.getItem(PRESENCE_KEY)) || {};
  return Date.now() - (m[userId] || 0) < 5 * 60 * 1000;
}

/* Notifications (per user) */
const NOTIF_KEY = (uidx) => `notif__${uidx}`;
function pushNotif(toUserId, notif) {
  if (!toUserId) return;
  const arr = safeParse(localStorage.getItem(NOTIF_KEY(toUserId))) || [];
  arr.unshift({ ...notif, _id: uid(), read: false, createdAt: Date.now() });
  localStorage.setItem(NOTIF_KEY(toUserId), JSON.stringify(arr));
}
function markNotifRead(toUserId, notifId) {
  const arr = safeParse(localStorage.getItem(NOTIF_KEY(toUserId))) || [];
  const upd = arr.map((n) => (n._id === notifId ? { ...n, read: true } : n));
  localStorage.setItem(NOTIF_KEY(toUserId), JSON.stringify(upd));
  return upd;
}
function clearNotifs(toUserId) {
  localStorage.setItem(NOTIF_KEY(toUserId), JSON.stringify([]));
  return [];
}

/* ============ Role helpers (IMPORTANT) ============ */
function normalizeRole(rawRole, rawTitle) {
  const r = String(rawRole ?? "").toLowerCase().trim();
  if (r.includes("lecturer")) return "lecturer";
  if (r.includes("student")) return "student";

  // Heuristic: if title looks academic, treat as lecturer (prevents "reply becomes student" after refresh)
  const t = String(rawTitle ?? "").toLowerCase().trim();
  if (t.includes("prof") || t.includes("dr") || t.includes("phd") || t.includes("ass") || t.includes("lect")) {
    return "lecturer";
  }
  return ""; // unknown
}

function normParentId(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return s;
}

function dedupeAttachments(list = []) {
  const seen = new Set();
  const out = [];
  for (const a of Array.isArray(list) ? list : []) {
    if (!a) continue;
    const url = String(a.dataUrl || a.url || "").trim();
    const name = String(a.name || "").trim();
    const type = String(a.type || a.mime || "").trim();
    // url is the strongest identity for your current design
    const key = `${url}__${name}__${type}`;
    if (!url) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

/**
 * Normalize a flat comments array so:
 * - replies ALWAYS stay attached to their parent by parentId
 * - orphan replies don't "jump" to top-level on refresh
 */
function normalizeThreadComments(rawComments) {
  const input = Array.isArray(rawComments) ? rawComments : [];
  const byId = new Map();

  const stripHtml = (s = "") =>
    String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // ✅ NEW: flatten nested replies from server (replies/children)
  const flat = [];
  const pushOne = (c, forcedParentId = null) => {
    if (!c) return;

    // shallow copy so we can safely override parent linkage
    const base = { ...c };

    if (forcedParentId != null && base.parentId == null && base.parentCommentId == null) {
      base.parentId = forcedParentId;
      base.parentCommentId = forcedParentId;
      base.replyTo = forcedParentId;
    }

    flat.push(base);

    const kids =
      (Array.isArray(base.replies) && base.replies) ||
      (Array.isArray(base.children) && base.children) ||
      [];

    const parentId = String(base.id || base._id || "");
    for (const r of kids) pushOne(r, parentId || forcedParentId);
  };

  for (const c of input) pushOne(c, null);

  // pass 1: normalize each comment (now working on flattened list)
  const normalized = flat
    .filter(Boolean)
    .map((c) => {
      const parentRaw =
        c.parentId ??
        c.parentID ??
        c.parent_id ??
        c.parentCommentId ??
        c.parent_comment_id ??
        c.replyTo ??
        c.reply_to ??
        c.parent ??
        null;

      const titleVal = c.authorTitle ?? c.title ?? c.author_title ?? "";
      const roleVal = c.authorRole ?? c.role ?? c.author_role ?? c.postRole ?? "";
      const role = normalizeRole(roleVal, titleVal) || String(roleVal || "").trim() || "";

      const createdAt = Number(c.createdAt || Date.now());

      // if server provides only text, build html
      const rawText = String(c.text || "").trim();
      const rawHtml = String(c.html || "").trim();
      const html = rawHtml || (rawText ? rawText.replace(/\n/g, "<br/>") : "");

      /*const out = {
        ...c,
        id: String(c.id || c._id || uid()),
        parentId: normParentId(parentRaw),

        authorId: c.authorId ?? c.userId ?? "",
        author: c.author ?? c.authorName ?? c.name ?? "User",
        authorTitle: titleVal,
        authorRole: role || "",
        authorProgram: c.authorProgram ?? c.program ?? "Program",
        authorPhoto: c.authorPhoto ?? c.authorAvatarUrl ?? c.photoUrl ?? "",

        html,
        text: rawText,
        createdAt,

        attachments: Array.isArray(c.attachments) ? c.attachments : [],
        images: Array.isArray(c.images) ? c.images : [],
        files: Array.isArray(c.files) ? c.files : [],
      };*/

      const imagesArr = Array.isArray(c.images) ? c.images : [];
const filesArr = Array.isArray(c.files) ? c.files : [];
const attsArr = Array.isArray(c.attachments) ? c.attachments : [];

// ✅ unify server images/files into attachments so they don't disappear after server refresh
/*const mergedAtts = [
  ...attsArr,
  ...imagesArr.map((x) => ({
    id: String(x?.id || uid()),
    name: x?.name || "image",
    type: x?.mime || x?.type || "image/*",
    dataUrl: x?.dataUrl || x?.url || "",
    size: x?.size,
  })),
  ...filesArr.map((x) => ({
    id: String(x?.id || uid()),
    name: x?.name || "file",
    type: x?.mime || x?.type || "application/octet-stream",
    dataUrl: x?.dataUrl || x?.url || "",
    size: x?.size,
  })),
].filter((a) => a && a.dataUrl);*/

const mergedAtts = dedupeAttachments([
  ...attsArr,
  ...imagesArr.map((x) => ({
    id: String(x?.id || uid()),
    name: x?.name || "image",
    type: x?.mime || x?.type || "image/*",
    dataUrl: x?.dataUrl || x?.url || "",
    size: x?.size,
  })),
  ...filesArr.map((x) => ({
    id: String(x?.id || uid()),
    name: x?.name || "file",
    type: x?.mime || x?.type || "application/octet-stream",
    dataUrl: x?.dataUrl || x?.url || "",
    size: x?.size,
  })),
]).filter((a) => a && a.dataUrl);




const out = {
  ...c,
  id: String(c.id || c._id || uid()),
  parentId: normParentId(parentRaw),

  authorId: c.authorId ?? c.userId ?? "",
  author: c.author ?? c.authorName ?? c.name ?? "User",
  authorTitle: titleVal,
  authorRole: role || "",
  authorProgram: c.authorProgram ?? c.program ?? "Program",
  authorPhoto: c.authorPhoto ?? c.authorAvatarUrl ?? c.photoUrl ?? "",

  html,
  text: rawText,
  createdAt,

  attachments: mergedAtts, // ✅ always populated after server-truth merge
  images: imagesArr,
  files: filesArr,
};






      byId.set(out.id, out);
      return out;
    });

  // pass 2: orphan replies become top-level
  const fixedParents = normalized.map((c) => {
    if (c.parentId && !byId.has(c.parentId)) return { ...c, parentId: null };
    return c;
  });

  // pass 3: drop empty + de-dupe optimistic vs server copy
  const bestBySig = new Map();

  for (const c of fixedParents) {
    const plain = (c.text && String(c.text).trim()) || stripHtml(c.html || "");

    const hasAnyAtt =
      (Array.isArray(c.attachments) && c.attachments.length > 0) ||
      (Array.isArray(c.images) && c.images.length > 0) ||
      (Array.isArray(c.files) && c.files.length > 0);

    if (!plain && !hasAnyAtt) continue;

    const sig = `${c.parentId || "ROOT"}__${c.authorId || ""}__${plain}`;
    const prev = bestBySig.get(sig);

    if (!prev) {
      bestBySig.set(sig, { ...c, text: plain });
      continue;
    }

    const prevHasAtt =
      (prev.attachments?.length || 0) + (prev.images?.length || 0) + (prev.files?.length || 0) > 0;
    const nextHasAtt = hasAnyAtt;

    const prevLen = (prev.html || "").length + (prev.text || "").length;
    const nextLen = (c.html || "").length + plain.length;

    const prevTs = prev.createdAt || 0;
    const nextTs = c.createdAt || 0;

    const nextIsBetter =
      (nextHasAtt && !prevHasAtt) ||
      (nextHasAtt === prevHasAtt && nextLen > prevLen) ||
      (nextHasAtt === prevHasAtt && nextLen === prevLen && nextTs > prevTs);

    if (nextIsBetter) bestBySig.set(sig, { ...c, text: plain });
  }

  return Array.from(bestBySig.values());
}

/* ============ UI bits ============ */
const Card = forwardRef(function Card(
  { className = "", children, square = false, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={`${
        square ? "rounded-none" : "rounded-none sm:rounded-2xl"
      } border border-slate-200 bg-white shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});
function HeaderBar({ title, square = false }) {
  return (
    <div
      className={`${
        square ? "rounded-none" : "rounded-t-2xl"
      } px-4 py-2.5 bg-[#7bdad1]/90 text-slate-900 text-sm font-semibold text-center`}
    >
      {title}
    </div>
  );
}
function Avatar({ url, name, size = "md", online = false }) {
  const sz =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const initials =
    (name || "User")
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";
  return (
    <div
      className={`relative ${sz} rounded-full bg-slate-300 overflow-hidden flex items-center justify-center shrink-0`}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-white text-xs bg-gradient-to-tr from-blue-500 to-indigo-500 h-full w-full flex items-center justify-center">
          {initials}
        </span>
      )}
      <span
        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
          online ? "bg-green-500" : "bg-slate-300"
        }`}
      />
    </div>
  );
}

function formatDisplayName(name, title) {
  const n = (name || "User").trim();
  const t = (title || "").trim();
  return t ? `${t} ${n}`.trim() : n;
}

function RolePill({ role, title }) {
  const normalized = normalizeRole(role, title);
  const isLect = normalized === "lecturer";
  const isStud = normalized === "student";
  //const label = isLect ? "Lecturer" : isStud ? "Student" : "User";
  const label = isLect ? "Lecturer" : "Student"; // treat unknown/"user" as Student

  return (
    <span
      className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-[1px] text-[10px] font-semibold border ${
        isLect
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : isStud
          ? "border-violet-300 bg-violet-50 text-violet-700"
          : "border-slate-300 bg-slate-50 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

/* ReadMore (works without line-clamp plugin) */
function HTMLReadMore({ html = "", lines = 3 }) {
  const [open, setOpen] = useState(false);
  const [needs, setNeeds] = useState(false);
  const shellRef = useRef(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    el.style.maxHeight = "none";
    el.style.overflow = "visible";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20");
    const maxH = lineHeight * lines;
    el.style.maxHeight = `${maxH}px`;
    el.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const over = el.scrollHeight > el.clientHeight + 1;
      setNeeds(over);
      if (open) {
        el.style.maxHeight = "none";
        el.style.overflow = "visible";
      }
    });
  }, [html, lines, open]);

  if (!html) return null;

  return (
    <div className="text-sm text-slate-800">
      <div
        ref={shellRef}
        className="prose prose-sm max-w-none [&_*]:!my-0 [&_ul]:list-disc [&_ol]:list-decimal"
        style={open ? { maxHeight: "none", overflow: "visible" } : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {needs && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-blue-600 text-xs mt-1 underline"
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

/* ============ Attachments ============ */
function readFiles(files) {
  const arr = Array.from(files || []);
  return Promise.all(
    arr.map(async (f) => {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      return { id: uid(), name: f.name, type: f.type, size: f.size, dataUrl };
    })
  );
}

// ✅ ADD THESE HELPERS HERE (between readFiles and AttachmentStrip)
function isImageAtt(a) {
  const type = String(a?.type || a?.mime || "").toLowerCase();
  const name = String(a?.name || "").toLowerCase();
  const url = String(a?.dataUrl || a?.url || "").toLowerCase();

  if (type.startsWith("image/")) return true;
  if (url.startsWith("data:image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);
}

function fmtBytes(n) {
  const v = Number(n || 0);
  if (!v) return "";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function fileMeta(a) {
  const name = String(a?.name || "file");
  const lower = name.toLowerCase();
  const type = String(a?.type || a?.mime || "").toLowerCase();

  const ext =
    (lower.includes(".") ? lower.split(".").pop() : "") ||
    (type.includes("/") ? type.split("/").pop() : "");

  const kind =
    ext === "pdf" ? "PDF" :
    ["doc", "docx"].includes(ext) ? "WORD" :
    ["ppt", "pptx"].includes(ext) ? "PPT" :
    ["xls", "xlsx", "csv"].includes(ext) ? "XLS" :
    ["zip", "rar", "7z"].includes(ext) ? "ZIP" :
    ["mp4", "mov", "avi", "mkv"].includes(ext) ? "VIDEO" :
    ["mp3", "wav", "m4a"].includes(ext) ? "AUDIO" :
    ext ? ext.toUpperCase() : "FILE";

  const icon =
    kind === "PDF" ? "📕" :
    kind === "WORD" ? "📘" :
    kind === "PPT" ? "📙" :
    kind === "XLS" ? "📗" :
    kind === "ZIP" ? "🗜️" :
    kind === "VIDEO" ? "🎞️" :
    kind === "AUDIO" ? "🎵" :
    "📄";

  return { kind, icon };
}


function bytesFromDataUrl(dataUrl = "") {
  const s = String(dataUrl || "");
  const i = s.indexOf("base64,");
  if (i === -1) return 0;
  const b64 = s.slice(i + 7).trim();
  // base64 bytes ≈ 3/4 length minus padding
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function attachmentSize(att) {
  const n = Number(att?.size);
  if (Number.isFinite(n) && n > 0) return n;
  return bytesFromDataUrl(att?.dataUrl);
}

function formatBytes(bytes = 0) {
  const b = Number(bytes || 0);
  if (b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Small inline “like your screenshot” icons (no extra label text)
function fileIconDataUrl(filename = "") {
  const ext = String(filename).toLowerCase().split(".").pop();

  const svg = (bg, letter) => `
<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <rect x="6" y="6" width="44" height="44" rx="8" fill="${bg}"/>
  <text x="28" y="36" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#fff">${letter}</text>
</svg>`.trim();

  let bg = "#64748b"; // slate default
  let letter = "F";

  if (ext === "pdf") { bg = "#dc2626"; letter = "PDF"; }
  else if (ext === "doc" || ext === "docx") { bg = "#2563eb"; letter = "W"; }
  else if (ext === "ppt" || ext === "pptx") { bg = "#ea580c"; letter = "P"; }
  else if (ext === "xls" || ext === "xlsx") { bg = "#16a34a"; letter = "X"; }
  else if (ext === "zip" || ext === "rar") { bg = "#0f172a"; letter = "ZIP"; }

  // Encode safely
  const encoded = encodeURIComponent(svg(bg, letter)).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}




/*function AttachmentStrip({ atts = [], onPreview }) {
  if (!atts.length) return null;
  const images = atts.filter((a) => (a.type || "").startsWith("image/"));
  const files = atts.filter((a) => !(a.type || "").startsWith("image/"));
  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className={images.length === 1 ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 sm:grid-cols-3 gap-2"}>
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onPreview && onPreview(img)}
              className="relative group"
              title="Click to enlarge"
            >
              <img
                src={img.dataUrl}
                alt={img.name}
                className={images.length === 1 ? "w-full max-h-[70vh] object-contain bg-slate-100 rounded transition-transform group-active:scale-95" : "w-full h-40 object-cover rounded transition-transform group-active:scale-95"}
              />
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white rounded px-1">
                Zoom
              </span>
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className="text-sm list-disc pl-5">
          {files.map((f) => (
            <li key={f.id} className="break-all">
              <a href={f.dataUrl} download={f.name} className="text-blue-600 underline">
                {f.name}
              </a>
              <span className="text-slate-400 text-xs">
                {" "}
                ({Math.round((f.size || 0) / 1024)} KB)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}*/



/*function AttachmentStrip({ atts = [], onPreview }) {
  if (!atts.length) return null;

  const images = atts.filter((a) => isImageAtt(a));
  const files = atts.filter((a) => !isImageAtt(a));

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onPreview && onPreview(img)}
              className="relative group"
              title="Click to enlarge"
            >
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-full h-40 object-cover rounded transition-transform group-active:scale-95"
              />
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white rounded px-1">
                Zoom
              </span>
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <img
                src={fileIconDataUrl(f.name)}
                alt=""
                className="h-15 w-6 shrink-0"
              />

              <div className="min-w-0 flex items-center gap-2">
  <a
    href={f.dataUrl}
    download={f.name}
    className="text-sm text-blue-700 underline truncate max-w-[520px]"
    title={f.name}
  >
    {f.name}
  </a>

  <span className="text-xs text-slate-500 whitespace-nowrap">
    ({formatBytes(attachmentSize(f))})
  </span>
</div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}*/

function dedupeAtts(list = []) {
  const seen = new Set();
  const out = [];
  for (const a of list) {
    if (!a) continue;
    // Prefer stable id; fallback to a composite key
    const key =
      a.id ||
      `${a.name || ""}__${a.size || ""}__${a.type || ""}__${a.dataUrl || a.url || ""}`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}


function AttachmentStrip({ atts = [], onPreview }) {
  const uniqAtts = dedupeAtts(atts);
  if (!uniqAtts.length) return null;

  const images = uniqAtts.filter((a) => isImageAtt(a));
  const files  = uniqAtts.filter((a) => !isImageAtt(a));

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <button
              key={img.id || `${img.name}-${img.dataUrl}`}   // ✅ fallback key
              type="button"
              onClick={() => onPreview && onPreview(img)}
              className="relative group"
              title="Click to enlarge"
            >
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-full h-40 object-cover rounded transition-transform group-active:scale-95"
              />
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white rounded px-1">
                Zoom
              </span>
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id || `${f.name}-${f.dataUrl}`} className="flex items-center gap-3">
              <img src={fileIconDataUrl(f.name)} alt="" className="h-15 w-6 shrink-0" />
              <div className="min-w-0 flex items-center gap-2">
                <a
                  href={f.dataUrl}
                  download={f.name}
                  className="text-sm text-blue-700 underline truncate max-w-[520px]"
                  title={f.name}
                >
                  {f.name}
                </a>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  ({formatBytes(attachmentSize(f))})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}






















/*function AttachmentStripEditable({ atts = [], onRemove, onPreview }) {
  if (!atts.length) return null;
  const images = atts.filter((a) => (a.type || "").startsWith("image/"));
  const files = atts.filter((a) => !(a.type || "").startsWith("image/"));
  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative">
              <button
                type="button"
                onClick={() => onPreview && onPreview(img)}
                title="Click to enlarge"
                className="w-full"
              >
                <img src={img.dataUrl} alt={img.name} className="w-full h-40 object-cover rounded" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                className="absolute top-1 right-1 rounded-full bg-white/90 border border-slate-300 text-xs px-2 py-0.5 hover:bg-white"
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className="text-sm pl-0">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 border border-slate-200 rounded px-2 py-1">
              <a href={f.dataUrl} download={f.name} className="text-blue-600 underline truncate">
                {f.name}
              </a>
              <span className="text-slate-400 text-xs">({Math.round((f.size || 0) / 1024)} KB)</span>
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                className="ml-auto text-xs border border-slate-300 rounded px-2 py-0.5 hover:bg-slate-50"
                title="Remove file"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}*/

function AttachmentStripEditable({ atts = [], onRemove, onPreview }) {
  if (!atts.length) return null;

  const images = atts.filter((a) => isImageAtt(a));
  const files = atts.filter((a) => !isImageAtt(a));

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative">
              <button
                type="button"
                onClick={() => onPreview && onPreview(img)}
                title="Click to enlarge"
                className="w-full"
              >
                <img src={img.dataUrl} alt={img.name} className="w-full h-40 object-cover rounded" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                className="absolute top-1 right-1 rounded-full bg-white/90 border border-slate-300 text-xs px-2 py-0.5 hover:bg-white"
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

     {files.length > 0 && (
        <div className="mt-2 space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <img
                src={fileIconDataUrl(f.name)}
                alt=""
                className="h-8 w-8 shrink-0"
              />

              <div className="min-w-0 flex items-center gap-2">
                <a
                  href={f.dataUrl}
                  download={f.name}
                  className="text-sm text-blue-700 underline truncate max-w-[520px]"
                  title={f.name}
                >
                  {f.name}
                </a>

                <span className="text-xs text-slate-500 whitespace-nowrap">
                  ({formatBytes(attachmentSize(f))})
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemove(f.id)}
                className="ml-auto text-xs border border-slate-300 rounded px-2 py-0.5 hover:bg-slate-50"
                title="Remove file"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Lightbox for image preview */
function Lightbox({ img, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!img) return null;
  return (
    /*<div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>*/
      <div
  className="fixed left-0 right-0 bottom-0 top-[165px] z-[9999] bg-black/80 flex items-center justify-center p-4"
  onClick={onClose}
>
      {/*<img src={img.dataUrl} alt={img.name} className="max-h-full max-w-full rounded shadow-lg" />*/}
      <img
  src={img.dataUrl}
  alt={img.name}
  className="max-h-[calc(100vh-140px)] max-w-full rounded shadow-lg object-contain"
/>

    </div>
  );
}

/* ============ Categories & Topics ============ */
const TOPIC_MAP = {
  Law: [
    "Admiralty (Maritime) Law",
    "Business law",
    "Child Protection Laws",
    "Construction Law",
    "Corporate Law",
    "Criminal Law",
    "Cybersecurity Law",
    "Environmental Law",
    "Health Law",
    "Human Rights Law",
    "Intellectual Property Law",
    "International Law",
    "Marriage Law",
    "Tax Law",
  ],
  Engineering: [
    "Aeronautical Engineering",
    "Agricultural Engineering",
    "Architectural Engineering",
    "Architecture",
    "Aviation Engineering",
    "Biomedical Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer and IT Engineering",
    "Electrical Engineering",
    "Electronic Engineering",
    "Environmental Engineering",
    "General Engineering",
    "Geological Engineering",
    "Industrial Engineering",
    "Manufacturing Engineering",
    "Marine Engineering",
    "Mechanical Engineering",
    "Metallurgical Engineering",
    "Mining Engineering",
    "Textiles Engineering",
  ],

  Research_Topics: [
    "To add contents"
  ],

  "Natural sciences": ["Biochemistry", "Biology", "Chemistry", "Mathematics / Statistics", "Microbiology", "Physics", "Botany", "Zoology"],
  Sports: [
    "Physical Education",
    "Sport Science",
    "English Premier League",
    "Spanish La Liga",
    "German Bundesliga",
    "Italian Serie A",
    "French Ligue 1",
    "Cricket",
    "Field hockey",
    "Tennis",
    "Volleyball",
    "Table tennis",
    "Baseball",
    "Golf",
    "Basketball",
    "American football",
    "Athletics sports",
    "NBA",
  ],
  "Business Studies": [
    "Accounting",
    "Finance",
    "Marketing",
    "Management",
    "Human Resources",
    "Business Analytics",
    "Entrepreneurship",
    "Supply Chain Management",
    "Information Systems",
    "Project Management",
    "Tourism / Hospitality",
    "Crypto Currency",
    "Banking",
    "Insurance",
    "Mortgages",
    "Credit Cards",
    "Tax Studies",
    "Personal loans",
    "Autoloans",
  ],
  "Social Sciences": [
    "Anthropology",
    "Archaeology",
    "Criminology",
    "Geography",
    "History",
    "International relations",
    "Political Science",
    "Psychology",
    "Public Administration",
    "Social Policy",
    "Social work",
    "Sociology",
  ],
  Agriculture: [
    "Agribusiness and Agricultural Economics",
    "Agricultural engineering",
    "Agriculture",
    "Agronomy",
    "Animal Science",
    "Aquaculture Science",
    "Crop Science",
    "Environmental Sciences and Management",
    "Food science & Technology",
    "Forestry",
    "Horticulture",
    "Human Nutrition",
    "Irrigation and Water Resources Engineering",
    "Marine Science",
    "Natural resource management.",
    "Textiles and Fibre Science",
    "Veterinary Science & Medicine",
  ],
  Economics: [
    "Behavioral Economics",
    "Crypto Currency",
    "Development Economics",
    "Economic Sanctions",
    "Financial Economics",
    "Health Economics",
    "International Trade",
    "International Economics",
    "Labor Economics",
    "Macroeconomics",
    "Microeconomics",
    "Public Economics",
    "Real Estate",
    "Stock Markets",
    "Treasure Bonds",
    "Digital Economy",
    "Inequality and Poverty",
  ],
  "Arts & Humanities": ["Applied Arts", "Classics", "Design", "Education", "Fine Arts", "History", "Literature", "Museum Studies", "Performing Arts", "Philosophy", "Religion and Theology", "Visual Arts"],
  "Current & Trending Topics": [
    "Artificial Intelligence (AI)",
    "Climate Change",
    "Divorce",
    "Economic Inequality:",
    "Gender Equality",
    "Girl-Boy friends Relationship",
    "Healthcare Access",
    "Marriage Relationship",
    "Mental Health",
    "Pre-Marital Sexual relationship",
    "Privacy",
    "Racial and Ethnic Inequality",
    "Social Media Fatigue",
    "Trending fashions & Styles",
    "University Life",
    "University Students Relationship",
  ],
  "Medicine & Health": [
    "Anaesthesia",
    "Anatomy",
    "Biomedical Science",
    "Dentistry",
    "Dermatology",
    "Medicine / Surgery",
    "Natural / Alternative Medicine",
    "Nursing",
    "Obstetrics / Gynaecology",
    "Optometry / Ophthalmology",
    "Orthopaedics",
    "Otorhinolaryngology",
    "Pathology",
    "Pediatrics",
    "Podiatry",
    "Psychiatry",
    "Radiography",
    "Speech / Rehabilitation / Physio",
  ],
};
/* ✅ PASTE THIS WHOLE BLOCK RIGHT HERE (between TOPIC_MAP and CATEGORIES) */
const TOPIC_ICON_MAP = {
  Law: "⚖️",
  Engineering: "🛠️",
  Research_Topics: "🔬",
  "Natural sciences": "🧪",
  Sports: "🏅",
  "Business Studies": "💼 ",
  "Social Sciences": "🌍",
  Agriculture: "🌾",
  Economics: "📈",
  "Arts & Humanities": "🎭",
  "Current & Trending Topics": "🔥",
  "Medicine & Health": "🩺",
};

function getTopicIcon(category) {
  return TOPIC_ICON_MAP[String(category || "").trim()] || "📚";
}
/* ✅ END PASTE BLOCK */

/* ✅ ADD TopicChip RIGHT HERE (directly under getTopicIcon) */
function TopicChip({ category, onClick }) {
  if (!category) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
      title={`Filter by ${category}`}
    >
      <span aria-hidden="true">{getTopicIcon(category)}</span>
      <span>{category}</span>
    </button>
  );
}
/* ✅ END TopicChip */

const CATEGORIES = ["All", ...Object.keys(TOPIC_MAP)];








/* ============ Simple textarea-based HTML editor ============ */
function ToolbarButton({ onAction, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onAction && onAction();
      }}
      onClick={(e) => e.preventDefault()}
      className="border border-slate-200 rounded px-2 py-1 text-xs hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

const SimpleHTMLEditor = memo(
  function SimpleHTMLEditor({ html, onChange, placeholder = "Write here…" }) {
    const ref = useRef(null);
    const value = html || "";

    const wrapSel = (before, after) => {
      const ta = ref.current;
      if (!ta) return;
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      const selected = value.slice(start, end);
      const next = value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.focus();
        const s = start + before.length;
        const e = s + selected.length;
        ta.setSelectionRange(s, e);
      });
    };

    const makeList = (ordered = false) => {
      const ta = ref.current;
      if (!ta) return;
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      const before = value.lastIndexOf("\n", start - 1) + 1;
      const after = value.indexOf("\n", end);
      const to = after === -1 ? value.length : after;
      const block = value.slice(before, to);
      const lines = block
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (!lines.length) return;
      const items = lines.map((s) => `<li>${s}</li>`).join("");
      const wrapped = ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      const next = value.slice(0, before) + wrapped + value.slice(to);
      onChange(next);
      requestAnimationFrame(() => {
        ta.focus();
      });
    };

    const createLink = () => {
      const sel = ref.current;
      if (!sel) return;
      const url = prompt("Enter link URL:");
      if (!url) return;
      wrapSel(`<a href="${url}" target="_blank" rel="noopener">`, "</a>");
    };

    const clearFormatting = () => {
      const stripped = value.replace(/<\/?[^>]+>/g, "");
      onChange(stripped);
      requestAnimationFrame(() => ref.current?.focus());
    };

    return (
      /*<div className="border border-slate-200 rounded">*/
      <div className="w-full max-w-full overflow-hidden border border-slate-200 rounded-xl">
        {/*</div><div className="flex flex-wrap gap-1 p-1 border-b border-slate-200 bg-slate-50">*/}
          <div className="flex flex-wrap gap-1.5 p-1.5 border-b border-slate-200 bg-slate-50 overflow-hidden">
          <ToolbarButton onAction={() => wrapSel("<strong>", "</strong>")} title="Bold">
            B
          </ToolbarButton>
          <ToolbarButton onAction={() => wrapSel("<em>", "</em>")} title="Italic">
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton onAction={() => wrapSel("<u>", "</u>")} title="Underline">
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton onAction={() => makeList(false)} title="Bulleted list">
            • List
          </ToolbarButton>
          <ToolbarButton onAction={() => makeList(true)} title="Numbered list">
            1. List
          </ToolbarButton>
          <ToolbarButton onAction={createLink} title="Insert link">
            Link
          </ToolbarButton>
          <ToolbarButton onAction={clearFormatting} title="Clear formatting">
            Clear
          </ToolbarButton>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          /*className="min-h-[96px] max-h-[45vh] w-full overflow-auto px-3 py-2 text-sm outline-none"*/
          className="min-h-[190px] sm:min-h-[96px] max-h-[45vh] w-full max-w-full overflow-auto px-3 py-3 text-sm outline-none"
          dir="ltr"
          style={{
            direction: "ltr",
            unicodeBidi: "normal",
            textAlign: "left",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            resize: "vertical",
          }}
        />
        <div className="px-3 py-1 border-t border-slate-100 text-[11px] text-slate-500">
          Tip: toolbar inserts simple HTML tags. New lines will be preserved.
        </div>
      </div>
    );
  },
  (p, n) => p.html === n.html && p.onChange === n.onChange
);

/* Notifications tray (isolated so it doesn't re-render the whole page) */
function NotificationTray({ userId, onOpenPost }) {
  const [notifs, setNotifs] = useState(() => safeParse(localStorage.getItem(NOTIF_KEY(userId))) || []);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = NOTIF_KEY(userId);
    const sync = () => setNotifs(safeParse(localStorage.getItem(key)) || []);
    const i = setInterval(sync, 1500);
    return () => clearInterval(i);
  }, [userId]);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full shadow border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
          title="Notifications"
        >
          🔔
          {notifs.filter((n) => !n.read).length > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 text-xs rounded-full bg-red-500 text-white px-1">
              {notifs.filter((n) => !n.read).length}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 bottom-10 w-[320px] max-h-[50vh] overflow-auto bg-white border border-slate-200 rounded-xl shadow">
            <div className="px-3 py-2 border-b border-slate-200 flex items-center">
              <div className="font-semibold text-sm">Notifications</div>
              <button
                onClick={() => {
                  setNotifs(clearNotifs(userId));
                }}
                className="ml-auto text-xs border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-50"
              >
                Clear all
              </button>
            </div>
            <div className="p-2 space-y-2">
              {notifs.length === 0 && <div className="text-sm text-slate-500 px-2 py-3">No notifications yet.</div>}
              {notifs.map((n) => (
                <div
                  key={n._id}
                  className={`p-2 rounded border ${
                    n.read ? "border-slate-100 bg-slate-50" : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-slate-600">
                    by {n.by} • {timeAgo(n.createdAt)} ago
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      className="text-xs border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-100"
                      onClick={() => {
                        setNotifs(markNotifRead(userId, n._id));
                        onOpenPost?.(n.postId);
                      }}
                    >
                      Open
                    </button>
                    {!n.read && (
                      <button
                        className="text-xs border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-100"
                        onClick={() => {
                          setNotifs(markNotifRead(userId, n._id));
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ Page ============ */
export default function UniversityAcademicPlatform() {
  const navigate = useNavigate();
  const [user] = useState(() => loadActiveUser());
  const uni = user?.university || "";
  const STORE_KEY = `quora_uni_posts__${uni}`;
  const FOL_KEY = `quora_uni_follows__${user?.id || "anon"}__${uni}`;
  const isLecturer = typeof user?.role === "string" && /lecturer/i.test(user.role || "");

  useEffect(() => {
    if (!user) navigate("/login?role=student", { replace: true });
    touchPresence(user?.id);
    const interval = setInterval(() => touchPresence(user?.id), 60_000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  /*const seeded = useMemo(() => {
    const now = Date.now();
    return [
      {
        id: uid(),
        title: "Welcome! Ask or share thoughts about your courses here.",
        bodyHtml:
          "Click the prompt above to open the editor. Attach images/files when helpful. Be respectful and cite sources.",
        category: "Arts & Humanities",
        topic: "Education",
        views: 12,
        likes: 2,
        saved: false,
        author: {
          id: user?.id,
          name: user?.name || "Student",
          program: user?.program || "Program",
          title: user?.title || "",
          photoUrl: user?.photoUrl || "",
        },
        university: uni,
        createdAt: now - 3600_000,
        attachments: [],
        comments: [],
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uni]);

  const [posts, setPosts] = useState(() => seeded);*/
  
  // ✅ Seeded posts DISABLED for UniversityAcademicPlatform
const seeded = useMemo(() => [], [uni]);

// ✅ Start empty (not seeded)
const [posts, setPosts] = useState(() => []);

  const postsRef = useRef([]);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const [follows, setFollows] = useState(() => safeParse(localStorage.getItem(FOL_KEY)) || {});
  const [toast, setToast] = useState("");

  const PLATFORM_SCOPE = "uni-academic-platform";

  function uploaderAttToUiAtt(a) {
  if (!a) return null;
  const url = String(a.url || "").trim();
  if (!url) return null;

  return {
    id: String(a.key || uid()),
    key: a.key,
    name: a.fileName || "file",
    type: a.mime || "application/octet-stream",
    mime: a.mime || "application/octet-stream",
    size: Number(a.size || 0),
    dataUrl: url,  // ✅ keep your UI compatible (it uses dataUrl)
    url,           // ✅ also keep url for dedupeAttachments()
  };
}









  function mergePostsKeepThreads(localList, remoteList) {
    const local = Array.isArray(localList) ? localList : [];
    const remote = Array.isArray(remoteList) ? remoteList : [];

    const byId = new Map();

    const asId = (v) => (v == null ? "" : String(v));
    const ts = (p) => Number(p?.updatedAt || p?.createdAt || 0);

    // 1) Start with remote (server truth)
    for (const rp of remote) {
      if (!rp?.id) continue;
      byId.set(asId(rp.id), rp);
    }

    // 2) Merge/choose local when it has richer thread or is newer
    for (const lp of local) {
      if (!lp?.id) continue;

      const id = asId(lp.id);
      const rp = byId.get(id);

      if (!rp) {
        byId.set(id, lp);
        continue;
      }

      const rpTs = ts(rp);
      const lpTs = ts(lp);

      const rpComments = Array.isArray(rp.comments) ? rp.comments : [];
      const lpComments = Array.isArray(lp.comments) ? lp.comments : [];

      const rpReplies = rpComments.filter((c) => c && c.parentId != null).length;
      const lpReplies = lpComments.filter((c) => c && c.parentId != null).length;

      const localHasMoreThread = lpReplies > rpReplies;

      // Merge comments by id, preserving parentId if either side has it
      const cMap = new Map();
      for (const c of rpComments) {
        const cid = asId(c?.id);
        if (cid) cMap.set(cid, c);
      }
      for (const c of lpComments) {
        const cid = asId(c?.id);
        if (!cid) continue;
        const existing = cMap.get(cid);
        if (!existing) {
          cMap.set(cid, c);
        } else {
          cMap.set(cid, {
            ...existing,
            ...c,
            parentId: (c.parentId ?? existing.parentId) ?? null,
          });
        }
      }

      /*const mergedComments = Array.from(cMap.values());
      const preferLocal = localHasMoreThread || mergedComments.length > rpComments.length || lpTs > rpTs;

      byId.set(id, preferLocal ? { ...lp, comments: mergedComments } : { ...rp, comments: mergedComments });*/

      const mergedCommentsRaw = Array.from(cMap.values());

// ✅ IMPORTANT: re-normalize merged comments to collapse optimistic + server duplicates
const mergedComments = normalizeThreadComments(mergedCommentsRaw);

const preferLocal =
  localHasMoreThread ||
  mergedComments.length > rpComments.length ||
  lpTs > rpTs;

byId.set(
  id,
  preferLocal
    ? { ...lp, comments: mergedComments }
    : { ...rp, comments: mergedComments }
);
    }

    /*return Array.from(byId.values());*/

    const out = Array.from(byId.values());

// ✅ stable ordering prevents UI jumps
out.sort((a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0));

return out;





  }

  /* ✅ ADD THIS RIGHT HERE (inside UniversityAcademicPlatform) */
function postsSig(arr) {
  return (arr || [])
    .map((p) => {
      const pid = String(p?.id || "");
      const pTs = Number(p?.updatedAt || p?.createdAt || 0);

      const cs = Array.isArray(p?.comments) ? p.comments : [];
      const cSig = cs
        .map((c) => {
          const cid = String(c?.id || "");
          const cTs = Number(c?.createdAt || 0);
          const parent = c?.parentId == null ? "ROOT" : String(c.parentId);
          return `${cid}:${parent}:${cTs}`;
        })
        .join(",");

      return `${pid}:${pTs}:${cs.length}:${cSig}`;
    })
    .join("|");
}

function setPostsIfChanged(makeNext) {
  setPosts((prev) => {
    const next = makeNext(prev);
    return postsSig(next) === postsSig(prev) ? prev : next;
  });
}
/* ✅ END ADD */





  /* ================= NORMALIZER ================= */
  function normalizeServerPost(p) {
    if (!p) return null;

    const bodyHtml = p.bodyHtml ?? p.html ?? p.text ?? "";

    const authorObj = p.author && typeof p.author === "object" ? p.author : null;

    const author = {
      id: authorObj?.id ?? p.authorId ?? "",
      name: authorObj?.name ?? p.authorName ?? p.author ?? "User",
      program: authorObj?.program ?? p.authorProgram ?? p.program ?? "Program",
      title: authorObj?.title ?? p.authorTitle ?? "",
      photoUrl: authorObj?.photoUrl ?? p.authorAvatarUrl ?? p.authorPhoto ?? "",
      country: authorObj?.country ?? p.authorCountry ?? "",
      countryFlag: authorObj?.countryFlag ?? p.authorCountryFlag ?? "",
    };

    const postRole = normalizeRole(p.role ?? p.authorRole ?? authorObj?.role ?? "", author.title);

    const normalizedComments = normalizeThreadComments(p.comments);

    return {
      ...p,
      id: String(p.id),
      scope: p.scope || PLATFORM_SCOPE,
      university: p.university || "",
      role: postRole || String(p.role ?? p.authorRole ?? authorObj?.role ?? "").trim() || "",
      title: p.title ?? "(No title)",
      bodyHtml,
      author,
      createdAt: Number(p.createdAt || Date.now()),
      updatedAt: Number(p.updatedAt || p.createdAt || Date.now()),
      //attachments: Array.isArray(p.attachments) ? p.attachments : [],
    /*attachments: normalizeThreadComments([
     {
    id: "tmp",
    html: "",
    text: "",
    createdAt: Date.now(),
    attachments: Array.isArray(p.attachments) ? p.attachments : [],
    images: Array.isArray(p.images) ? p.images : [],
    files: Array.isArray(p.files) ? p.files : [],
  },
])[0]?.attachments || [],*/

attachments: dedupeAttachments([
  ...(Array.isArray(p.attachments) ? p.attachments : []),
  ...(Array.isArray(p.images) ? p.images : []),
  ...(Array.isArray(p.files) ? p.files : []),
].map((x) => ({
  id: String(x?.id || uid()),
  name: x?.name || "file",
  type: x?.mime || x?.type || "application/octet-stream",
  dataUrl: x?.dataUrl || x?.url || "",
  size: x?.size,
}))).filter((a) => a && a.dataUrl),


      comments: normalizedComments,
    };
  }
  /* ========================================================= */

/* ==================REMOVING DUPLICATE COMMENT OR REPLY HELHER======================================= */
  function applyServerTruth(prevPosts, normalizedRemotePosts) {
  const prev = Array.isArray(prevPosts) ? prevPosts : [];
  const remote = Array.isArray(normalizedRemotePosts) ? normalizedRemotePosts : [];

  const byId = new Map(remote.map((p) => [String(p.id || ""), p]));

  return prev.map((lp) => {
    const rp = byId.get(String(lp?.id || ""));
    if (!rp) return lp;

    // ✅ server wins for thread/comments (prevents optimistic + server duplicates)
    // keep a couple of UI-only local flags if you want
    return {
      ...rp,
      _liked: lp?._liked ?? rp?._liked,
      saved: lp?.saved ?? rp?.saved,
    };
  });
}





  useEffect(() => {
    let cancelled = false;

    async function loadFromServer() {
      try {
        const remote = await fetchPosts({ scope: PLATFORM_SCOPE });

        const remoteUni = Array.isArray(remote)
          ? remote.filter((p) => (p?.university || "") === uni)
          : [];

        if (cancelled) return;

        const normalized = remoteUni.map(normalizeServerPost).filter(Boolean);

        /*setPosts((prev) => {
          const base = prev?.length ? prev : seeded;
          return mergePostsKeepThreads(base, normalized);
        });*/

        setPostsIfChanged((prev) => {
  const base = prev?.length ? prev : seeded;
  return mergePostsKeepThreads(base, normalized);
});


      } catch (e) {
        console.warn("[UniversityAcademicPlatform] fetchPosts failed:", e);
      }
    }

    loadFromServer();
    const id = setInterval(loadFromServer, 30000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [uni, seeded]);

  useEffect(() => {
    localStorage.setItem(FOL_KEY, JSON.stringify(follows));
  }, [follows, FOL_KEY]);

  const postRefs = useRef({});

  /* Filters & UI state */
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("Top");
  const [myOnly, setMyOnly] = useState(false);

  useEffect(() => {
    if (!myOnly) return;
    const mine = posts.filter((p) => p.university === uni && p.author?.id === user?.id);
    if (mine.length) {
      const latest = mine.reduce((a, b) => ((a.createdAt || 0) > (b.createdAt || 0) ? a : b));
      setTimeout(() => scrollToPost(latest.id), 120);
    }
  }, [myOnly, posts, user?.id, uni]);

  /* Composer (collapsed by default) */
  const [editorOpen, setEditorOpen] = useState(false);
  const [askTitle, setAskTitle] = useState("");
  const [askBodyHtml, setAskBodyHtml] = useState("");
  /*const [askAtts, setAskAtts] = useState([]);*/
  const [askUploadAtts, setAskUploadAtts] = useState([]); // AttachmentUploader shape
  const askAtts = useMemo(
  () => (askUploadAtts || []).map(uploaderAttToUiAtt).filter(Boolean),
  [askUploadAtts]
    );
  const [preview, setPreview] = useState(null);

  /*const onPickAskFiles = async (e) => {
    const chosen = await readFiles(e.target.files);
    setAskAtts((prev) => [...prev, ...chosen]);
    e.target.value = "";
  };*/
  /*const removeAskAttachment = (id) => setAskAtts((prev) => prev.filter((a) => a.id !== id));*/
  const removeAskAttachment = (id) =>
  setAskUploadAtts((prev) => (prev || []).filter((a) => String(a.key || "") !== String(id)));

  // ✅ Add onReport HERE (inside the component)
/*async function onReport({ itemType, itemId, postId, commentId = "", replyId = "" }) {
  const reason = prompt(
    "Report reason? (harassment, spam, sexual, hate, misinformation, copyright, other)",
    "spam"
  );
  if (!reason) return;

  const details = prompt("Optional details (what happened?)", "") || "";

  const me = user || currentUser || {};
  const reportedByEmail = String(me.email || "").trim().toLowerCase();

  try {
    await reportContent({
      itemType,
      itemId,
      postId,
      commentId,
      replyId,
      scope: PLATFORM_SCOPE, // ✅ use this page’s scope
      reportedByUserId: me.id || "",
      reportedByEmail,
      reportedByRole: me.role || "",
      reason,
      details,
    });
    alert("Report submitted. Thank you.");
  } catch (e) {
    console.error("report failed", e);
    alert(`Report failed: ${e.message}`);
  }
}*/

async function onReport({ itemType, itemId, postId, commentId = "", replyId = "" }) {
  const reason = prompt(
    "ScholarsKnowledge is committed to keeping our community safe and supportive by protecting users from misuse of the platform.\n\n" +
    "Report reason? (Scam,harassment,Extremism,Racism,sexual, hate, misinformation, copyright, other)",
    "spam"
  );
  if (!reason) return;

  const details = prompt("Optional details (what happened?)", "") || "";

  const me = user || currentUser || {}; // use whatever variable your page uses
  const reportedByEmail = String(me.email || "").trim().toLowerCase();

  try {
    await reportContent({
      itemType,
      itemId,
      postId,
      commentId,
      replyId,
      scope: "student-dashboard", // or your page scope variable
      reportedByUserId: me.id || "",
      reportedByEmail,
      reportedByRole: me.role || "",
      reason,
      details,
    });
    alert("Report submitted. Thank you.");
  } catch (e) {
    console.error("report failed", e);
    alert(`Report failed: ${e.message}`);
  }
}







  const postQuestion = async (e) => {
    e.preventDefault();

    const plain = (askBodyHtml || "").replace(/<[^>]+>/g, "").trim();
    if (!askTitle.trim() && !plain && askAtts.length === 0) return;

    const images = (askAtts || [])
      .filter((a) => (a.type || "").startsWith("image/"))
      .map((a) => ({ id: a.id, name: a.name, mime: a.type, dataUrl: a.dataUrl || "" }));

    const files = (askAtts || [])
      .filter((a) => !(a.type || "").startsWith("image/"))
      .map((a) => ({ id: a.id, name: a.name, mime: a.type, dataUrl: a.dataUrl || "" }));

    const payload = {
      scope: PLATFORM_SCOPE,
      role: isLecturer ? "lecturer" : "student",
      type: "UniversityAcademicPlatform",

      title: askTitle.trim() || "(No title)",
      text: plain,
      html: (askBodyHtml || "").replace(/\n/g, "<br/>"),

      category: selectedCategory === "All" ? "Current & Trending Topics" : selectedCategory,
      topic: selectedTopic === "All" ? "General" : selectedTopic,

      university: uni,

      authorId: user?.id || "",
      authorName: user?.name || "Student",
      authorProgram: user?.program || "Program",
      authorTitle: user?.title || "",
      authorAvatarUrl: user?.photoUrl || "",

      /*attachments: askAtts,   // ✅ include BOTH images + files in one unified array
      images,
      files,*/

      attachments: askAtts,
images: [],
files: [],
    };

    try {
      await createPostOnServer(payload);

      const remote = await fetchPosts({ scope: PLATFORM_SCOPE });
      const remoteUni = Array.isArray(remote)
        ? remote.filter((p) => (p?.university || "") === uni)
        : [];
      const normalized = remoteUni.map(normalizeServerPost).filter(Boolean);

      /*setPosts((prev) => {
        const base = prev?.length ? prev : seeded;
        return mergePostsKeepThreads(base, normalized);
      });*/

      setPostsIfChanged((prev) => {
  const base = prev?.length ? prev : seeded;
  return mergePostsKeepThreads(base, normalized);
});





      setAskTitle("");
      setAskBodyHtml("");
      /*setAskAtts([]);*/
      setAskUploadAtts([]);
      setEditorOpen(false);
    } catch (err) {
      console.error("[UniversityAcademicPlatform] createPost failed:", err);
      setToast("Failed to save post to server.");
      setTimeout(() => setToast(""), 4000);
    }
  };

  /* Post interactions */
  const toggleLike = (id) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, likes: p._liked ? p.likes - 1 : p.likes + 1, _liked: !p._liked } : p
      )
    );
  const toggleSave = (id) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));

  const deletePost = async (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePostOnServer(id);
    } catch (e) {
      console.warn("[UniversityAcademicPlatform] deletePost failed:", e);
    }
  };

  /**
   * IMPORTANT FIX:
   * Replies must stay replies across refresh:
   * - send parentCommentId in addition to parentId/replyTo/etc.
   * - never default authorRole to "student" if missing (server may drop it)
   */
  function toServerUpsertPayloadFromUiPost(uiPost, { scope, university }) {
    const p = uiPost || {};
    const author = p.author || {};

    const attachments = Array.isArray(p.attachments) ? p.attachments : [];

    const images = attachments
      .filter((a) => (a.type || "").startsWith("image/"))
      .map((a) => ({ id: a.id, name: a.name, mime: a.type, dataUrl: a.dataUrl || "" }));

    const files = attachments
      .filter((a) => !(a.type || "").startsWith("image/"))
      .map((a) => ({ id: a.id, name: a.name, mime: a.type, dataUrl: a.dataUrl || "" }));

    const comments = (Array.isArray(p.comments) ? p.comments : []).map((c) => {
      const pid = c.parentId == null ? null : String(c.parentId);

      const titleVal = String(c.authorTitle ?? c.title ?? "");
      const roleVal = String(c.authorRole ?? c.role ?? "");

      return {
        id: String(c.id || c._id || uid()),

        // ✅ parent linkage (send multiple keys to match any backend parser)
        parentId: pid,
        parentCommentId: pid,
        replyTo: pid,
        parent: pid,
        parent_id: pid,
        parentID: pid,

        html: c.html || "",
        text: (c.html || "").replace(/<[^>]+>/g, "").trim(),

        authorId: c.authorId ?? "",
        author: c.author ?? "User",
        authorProgram: c.authorProgram ?? "Program",
        authorPhoto: c.authorPhoto ?? "",

        // ✅ send BOTH styles (backend-safe + UI-safe)
        authorTitle: titleVal,
        authorRole: roleVal,

        // insurance for refresh
        title: titleVal,
        role: roleVal,

        createdAt: Number(c.createdAt || Date.now()),
        attachments: Array.isArray(c.attachments) ? c.attachments : [],
      };
    });

    return {
      id: String(p.id),
      scope,
      university,

      role: String(p.role || ""),
      type: "UniversityAcademicPlatform",

      title: p.title || "(No title)",
      html: p.bodyHtml || "",
      text: (p.bodyHtml || "").replace(/<[^>]+>/g, "").trim(),

      category: p.category || "Current & Trending Topics",
      topic: p.topic || "General",

      authorId: author.id ?? "",
      authorName: author.name ?? "User",
      authorProgram: author.program ?? "Program",
      authorTitle: author.title ?? "",
      authorAvatarUrl: author.photoUrl ?? "",

      images,
      files,

      comments,
      updatedAt: Date.now(),
    };
  }

  // ✅ DROP-IN: addAnswer persists via /posts/comment (postCommentToServer)
  const addAnswer = async (postId, textHtml, atts = []) => {
    const plain = (textHtml || "").replace(/<[^>]+>/g, "").trim();
    if (!plain && atts.length === 0) return;

    const now = Date.now();
    const role = isLecturer ? "lecturer" : "student";

    // optimistic UI (keep your current behavior)
    const ans = {
      id: uid(),
      parentId: null,
      html: (textHtml || "").replace(/\n/g, "<br/>"),
      authorId: user?.id,
      author: user?.name,
      authorProgram: user?.program,
      authorTitle: user?.title || "",
      authorRole: role,
      title: user?.title || "",
      role,
      authorPhoto: user?.photoUrl,
      createdAt: now,
      attachments: atts,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;

        if (p.author?.id && p.author.id !== user?.id) {
          pushNotif(p.author.id, {
            type: "comment",
            postId: p.id,
            title: `New comment on: ${p.title}`,
            by: user?.name || "Student",
          });
        }

        return {
          ...p,
          comments: normalizeThreadComments([...(p.comments || []), ans]),
          updatedAt: Date.now(),
        };
      })
    );

    try {
      const images = (atts || [])
        .filter((a) => (a.type || "").startsWith("image/"))
        .map((a) => ({
          id: a.id,
          name: a.name,
          mime: a.type,
          dataUrl: a.dataUrl || "",
        }));

      const files = (atts || [])
        .filter((a) => !(a.type || "").startsWith("image/"))
        .map((a) => ({
          id: a.id,
          name: a.name,
          mime: a.type || "application/octet-stream",
          dataUrl: a.dataUrl || "",
        }));

      await postCommentToServer({
        postId,
        id: ans.id,          // ✅ send client comment id so server stores same id
        text: plain,
        html: ans.html,

        authorId: user?.id || "",
        authorName: user?.name || "User",
        authorProgram: user?.program || "Program",
        authorPhoto: user?.photoUrl || "",
        authorRole: role,
        authorTitle: user?.title || "",

        images,
        files,
      });

      // Pull server truth so refresh/browser/device stays stable
      const remote = await fetchPosts({ scope: PLATFORM_SCOPE });
      const remoteUni = Array.isArray(remote)
        ? remote.filter((p) => (p?.university || "") === uni)
        : [];
      const normalized = remoteUni.map(normalizeServerPost).filter(Boolean);

      /*setPosts((prev) => {
        const base = prev?.length ? prev : seeded;
        return mergePostsKeepThreads(base, normalized);
      });*/

      /*setPostsIfChanged((prev) => {
  const base = prev?.length ? prev : seeded;
  return mergePostsKeepThreads(base, normalized);
});*/

setPostsIfChanged((prev) => {
  const base = prev?.length ? prev : seeded;
  return applyServerTruth(base, normalized);
});





    } catch (e) {
      console.error("[UniversityAcademicPlatform] persist comment failed:", e);
      setToast("Failed to save comment to server.");
      setTimeout(() => setToast(""), 4000);
    }
  };

  // ✅ DROP-IN: addReply persists via /posts/reply (postReplyToServer)
  const addReply = async (postId, parentId, textHtml, atts = []) => {
    const plain = (textHtml || "").replace(/<[^>]+>/g, "").trim();
    if (!plain && atts.length === 0) return;

    const now = Date.now();
    const role = isLecturer ? "lecturer" : "student";

    const r = {
      id: uid(),
      parentId: String(parentId),
      html: (textHtml || "").replace(/\n/g, "<br/>"),
      authorId: user?.id,
      author: user?.name,
      authorProgram: user?.program,
      authorTitle: user?.title || "",
      authorRole: role,
      title: user?.title || "",
      role,
      authorPhoto: user?.photoUrl,
      createdAt: now,
      attachments: atts,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;

        if (p.author?.id && p.author.id !== user?.id) {
          pushNotif(p.author.id, {
            type: "reply",
            postId: p.id,
            title: `New reply on: ${p.title}`,
            by: user?.name || "Student",
          });
        }

        return {
          ...p,
          comments: normalizeThreadComments([...(p.comments || []), r]),
          updatedAt: Date.now(),
        };
      })
    );

    try {
      const images = (atts || [])
        .filter((a) => (a.type || "").startsWith("image/"))
        .map((a) => ({
          id: a.id,
          name: a.name,
          mime: a.type,
          dataUrl: a.dataUrl || "",
        }));

      const files = (atts || [])
        .filter((a) => !(a.type || "").startsWith("image/"))
        .map((a) => ({
          id: a.id,
          name: a.name,
          mime: a.type || "application/octet-stream",
          dataUrl: a.dataUrl || "",
        }));

      await postReplyToServer({
        postId,
        id: r.id,                 // ✅ send client reply id so server stores same id
        commentId: String(parentId),
        text: plain,
        html: r.html,

        authorId: user?.id || "",
        authorName: user?.name || "User",
        authorProgram: user?.program || "Program",
        authorPhoto: user?.photoUrl || "",
        authorRole: role,
        authorTitle: user?.title || "",

        images,
        files,
      });

      const remote = await fetchPosts({ scope: PLATFORM_SCOPE });
      const remoteUni = Array.isArray(remote)
        ? remote.filter((p) => (p?.university || "") === uni)
        : [];
      const normalized = remoteUni.map(normalizeServerPost).filter(Boolean);

      /*setPosts((prev) => {
        const base = prev?.length ? prev : seeded;
        return mergePostsKeepThreads(base, normalized);
      });*/

      /*setPostsIfChanged((prev) => {
  const base = prev?.length ? prev : seeded;
  return mergePostsKeepThreads(base, normalized);
});*/

setPostsIfChanged((prev) => {
  const base = prev?.length ? prev : seeded;
  return applyServerTruth(base, normalized);
});




    } catch (e) {
      console.error("[UniversityAcademicPlatform] persist reply failed:", e);
      setToast("Failed to save reply to server.");
      setTimeout(() => setToast(""), 4000);
    }
  };

  const followKey = (cat, topic) => `${cat}::${topic}`;
  const isFollowed = (cat, topic) => !!follows[followKey(cat, topic)];
  const toggleFollow = (cat, topic) =>
    setFollows((prev) => ({ ...prev, [followKey(cat, topic)]: !prev[followKey(cat, topic)] }));

  /* Derived lists */
  const visibleBase = posts.filter((p) => p.university === uni);

  const visible = visibleBase
    .filter((p) => (myOnly ? p.author?.id === user?.id : true))
    .filter((p) => (!myOnly && selectedCategory !== "All" ? p.category === selectedCategory : true))
    .filter((p) => (!myOnly && selectedTopic !== "All" ? p.topic === selectedTopic : true))
    .filter((p) =>
      q
        ? (p.title || "").toLowerCase().includes(q.toLowerCase()) ||
          (p.bodyHtml || "").toLowerCase().includes(q.toLowerCase())
        : true
    );

  const withCounts = visible.map((p) => {
    const answers = (p.comments || []).filter((c) => c.parentId == null).length;
    return { ...p, _answers: answers };
  });

  let sorted = [...withCounts];
  if (sort === "Top") sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  if (sort === "Newest") sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (sort === "Answered")
    sorted.sort((a, b) => b._answers - a._answers || (b.createdAt || 0) - (a.createdAt || 0));

  /* Collapsible inline composer for comments/replies (controlled) */
function InlineComposer({ placeholder = "Write a comment…", onSubmit, isOpen, setIsOpen }) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = typeof isOpen === "boolean" ? isOpen : openInternal;
  const setOpen = setIsOpen || setOpenInternal;

  const [html, setHtml] = useState("");

  // ✅ CloudFront/S3 uploader attachments (AttachmentUploader shape)
  const [uploadAtts, setUploadAtts] = useState([]);

  // ✅ Convert uploader shape -> your UI shape (dataUrl=url)
  const atts = useMemo(
    () => (uploadAtts || []).map(uploaderAttToUiAtt).filter(Boolean),
    [uploadAtts]
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left border border-slate-200 rounded-full px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
      >
        {placeholder}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(html, atts);
        setHtml("");
        setUploadAtts([]);
        setOpen(false);
      }}
      className="mt-2"
    >
      {/* Optional preview of selected files */}
      <AttachmentStripEditable
        atts={atts}
        onRemove={(id) =>
          setUploadAtts((prev) => (prev || []).filter((a) => String(a.key || "") !== String(id)))
        }
        onPreview={setPreview}
      />

      {/*<div className="mt-2">
        <SimpleHTMLEditor html={html} onChange={setHtml} placeholder={placeholder} />
      </div>*/}

      <div
  className="mt-2"
  onPasteCapture={async (e) => {
    const cb = e.clipboardData || window.clipboardData;

    // Screenshot/image paste → upload + persist via AttachmentUploader state (uploadAtts)
    const handled = await addPastedImagesToUploadAtts(cb, setUploadAtts);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }}
>
  <SimpleHTMLEditor html={html} onChange={setHtml} placeholder={placeholder} />
</div>



      {/* ✅ Use uploader (CloudFront URLs) instead of <input type="file"> */}
      <div className="mt-2 max-w-[520px]">
        <AttachmentUploader
          value={uploadAtts}
          onChange={setUploadAtts}
          folder={`uni/${uni || "unknown"}/comments`}
          maxFiles={5}
          role={isLecturer ? "lecturer" : "student"}
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
          <button className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
            Post
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setHtml("");
              setUploadAtts([]);
            }}
            className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
  function AnswerThread({ post }) {
    const [open, setOpen] = useState(true);
    const [commentOpen, setCommentOpen] = useState(false);
    const [replyOpenById, setReplyOpenById] = useState({});

    // ✅ Always normalize before rendering (prevents "reply becomes comment" on refresh)
    const allComments = normalizeThreadComments(post.comments);

    const answers = allComments
      .filter((c) => c.parentId == null)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const byParent = allComments.reduce((acc, c) => {
      if (c.parentId != null) (acc[c.parentId] ||= []).push(c);
      return acc;
    }, {});

    for (const k of Object.keys(byParent)) {
      byParent[k].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    const setReplyOpen = (id, val) => setReplyOpenById((s) => ({ ...s, [id]: val }));

    return (
      <div className="mt-3">
        <button onClick={() => setOpen((o) => !o)} className="text-sm text-blue-700 underline">
          Comments ({answers.length}) {open ? "▾" : "▸"}
        </button>
        {open && (
          <div className="mt-2">
            {answers.map((a) => (
              <div key={a.id} className="mt-3">
  <div className="flex items-start gap-2">
    <Avatar url={a.authorPhoto} name={a.author} size="sm" online={isOnline(a.authorId)} />

    <div className="min-w-0 flex-1">
      {/* ✅ meta next to avatar */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-slate-900 text-sm">
          {formatDisplayName(a.author, a.authorTitle)}
        </span>
        <RolePill role={a.authorRole} title={a.authorTitle} />
        <span className="text-slate-300">•</span>
        <span className="text-xs text-slate-600">{a.authorProgram || "Program"}</span>
        <span className="text-slate-300">•</span>
        <span className="text-xs text-slate-600">{timeAgo(a.createdAt)} ago</span>
      </div>

      {/* bubble is now ONLY the content */}
      <div className="mt-1 bg-slate-50 rounded-2xl px-3 py-2">
        <HTMLReadMore html={a.html} lines={3} />
        <AttachmentStrip atts={a.attachments} onPreview={setPreview} />
      </div>

      {/* replies */}
      {(byParent[a.id] || []).map((r) => (
        <div key={r.id} className="mt-3 pl-4 border-l border-slate-200">
          <div className="flex items-start gap-2">
            <Avatar url={r.authorPhoto} name={r.author} size="sm" online={isOnline(r.authorId)} />

            <div className="min-w-0 flex-1">
              {/* ✅ meta next to avatar */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-slate-900 text-sm">
                  {formatDisplayName(r.author, r.authorTitle)}
                </span>
                <RolePill role={r.authorRole} title={r.authorTitle} />
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600">{r.authorProgram || "Program"}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600">{timeAgo(r.createdAt)} ago</span>
              </div>

              {/* bubble content only */}
              <div className="mt-1 bg-white rounded-2xl px-3 py-2 border border-slate-100">
                <HTMLReadMore html={r.html} lines={3} />
                <AttachmentStrip atts={r.attachments} onPreview={setPreview} />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Reply composer */}
      <div className="mt-2 pl-8 flex items-start gap-2">
        <Avatar url={user?.photoUrl} name={user?.name} size="sm" online />
        <div className="flex-1">
          <InlineComposer
            placeholder="Reply…"
            onSubmit={(v, ra) => addReply(post.id, a.id, v, ra)}
            isOpen={!!replyOpenById[a.id]}
            setIsOpen={(v) => setReplyOpen(a.id, v)}
          />
        </div>
      </div>
    </div>
  </div>
</div>
            ))}

            {/* New top-level comment */}
            <div className="mt-3 flex items-start gap-2">
              <Avatar url={user?.photoUrl} name={user?.name} size="sm" online />
              <div className="flex-1">
                <InlineComposer
                  placeholder="Write a comment…"
                  onSubmit={(v, atts) => addAnswer(post.id, v, atts)}
                  isOpen={commentOpen}
                  setIsOpen={setCommentOpen}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const scrollToPost = (postId) => {
    const el = postRefs.current[postId];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-yellow-300");
      setTimeout(() => el.classList.remove("ring-2", "ring-yellow-300"), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      {/* Top-left back arrow for lecturers */}
      <div className="relative max-w-[1300px] mx-auto">
        {isLecturer && (
          <>
            <button
              type="button"
              onClick={() => navigate("/lecturer/dashboard")}
              title="Back to Lecturer Dashboard"
              className="hidden lg:flex items-center justify-center absolute -left-6 top-6 h-9 w-9 rounded-full border border-slate-200 bg-white shadow hover:bg-slate-50"
              aria-label="Back to Lecturer Dashboard"
            >
              ←
            </button>
            <div className="lg:hidden px-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/lecturer/dashboard")}
                className="inline-flex items-center gap-1 text-sm text-blue-700 underline"
              >
                ← Back to Lecturer Dashboard
              </button>
            </div>
          </>
        )}
      </div>

      {/*<main className="max-w-[1300px] mx-auto px-3 lg:px-5 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-5">*/}
      {/*<main className="max-w-[1360px] mx-auto px-0 sm:px-3 lg:px-5 py-3 lg:py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-3 lg:gap-5">*/}
      <main className="max-w-[1360px] mx-auto px-0 sm:px-3 lg:px-5 pt-[115px] pb-3 sm:pt-3 lg:py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-3 lg:gap-5">
      
      {/* LEFT rail */}
        <aside className="hidden lg:block space-y-4 pb-24">
          <Card square>
            <HeaderBar title="University Academic Platform" square />
            <div className="p-3 sm:p-4">
              <p className="text-xs text-slate-700 text-center">Only for {uni || "your university"}.</p>
            </div>
          </Card>

          <Card square>
            <HeaderBar title="My Posts" square />
            <div className="p-3">
              <button
                onClick={() => setMyOnly((v) => !v)}
                className={`w-full rounded px-3 py-1.5 text-sm ${
                  myOnly ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {myOnly ? "On" : "Off"}
              </button>
            </div>
          </Card>

          <Card square>
            <HeaderBar title="Topics" square />
            <div className="p-3 space-y-2">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const c = e.target.value;
                  setSelectedCategory(c);
                  setSelectedTopic("All");
                }}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="max-h-[48vh] overflow-auto pr-1">
                {(selectedCategory === "All" ? ["All"] : TOPIC_MAP[selectedCategory]).map((t) => {
                  const topicVal = selectedCategory === "All" ? "All" : t;
                  const active = topicVal === selectedTopic;
                  const canFollow = selectedCategory !== "All" && topicVal !== "All";
                  const f = canFollow ? isFollowed(selectedCategory, topicVal) : false;

                  return (
                    <div
                      key={topicVal}
                      className={`flex items-center gap-2 rounded px-2 py-1 ${
                        active ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <button
                        className="text-left text-sm flex-1 truncate"
                        onClick={() => setSelectedTopic(topicVal)}
                        title={topicVal}
                      >
                        {topicVal}
                      </button>
                      {canFollow && (
                        <button
                          onClick={() => toggleFollow(selectedCategory, topicVal)}
                          className={`text-xs rounded-full px-2 py-0.5 border ${
                            f ? "border-blue-600 text-blue-600" : "border-slate-300 text-slate-600"
                          } hover:bg-slate-50`}
                        >
                          {f ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
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

        {/* CENTER */}
        <section className="min-w-0 space-y-3 lg:space-y-4">
          {/*</section><Card>
            <div className="p-4">*/}
              <Card className="mx-3 sm:mx-0 overflow-hidden">
              <div className="p-3 sm:p-4">
              {!editorOpen ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar url={user?.photoUrl} name={user?.name} size="md" online={true} />
                  <button
                    onClick={() => setEditorOpen(true)}
                    className="flex-1 min-w-0 text-left border border-slate-200 rounded-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white hover:bg-slate-50 text-slate-600 text-sm sm:text-base"
                  >
                    What do you want to post, ask or share?
                  </button>
                </div>
              ) : (
                /*<form onSubmit={postQuestion}>*/
                <form onSubmit={postQuestion} className="w-full max-w-full overflow-hidden">
                  <div className="flex items-start gap-3">
                    <Avatar url={user?.photoUrl} name={user?.name} size="md" online={true} />
                    <div className="flex-1 min-w-0">
                      <input
                        value={askTitle}
                        onChange={(e) => setAskTitle(e.target.value)}
                        placeholder="Add a title"
                        /*className="w-full border border-slate-200 rounded px-3 py-2 text-sm"*/
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                      />
                      {/*<div className="mt-2">
                        
                    <SimpleHTMLEditor html={askBodyHtml} onChange={setAskBodyHtml} placeholder="Write your post…" />
                      </div>
                      <AttachmentStripEditable atts={askAtts} onRemove={removeAskAttachment} onPreview={setPreview} />*/}
                     

{/* Optional: show selected attachments preview (remove if you don’t want it) */}
{/*<AttachmentStripEditable atts={askAtts} onRemove={removeAskAttachment} onPreview={setPreview} />*/}

{/*<div className="mt-2">
  <SimpleHTMLEditor html={askBodyHtml} onChange={setAskBodyHtml} placeholder="Write your post…" />
</div>*/}

<div
  className="mt-2"
  onPasteCapture={async (e) => {
    const cb = e.clipboardData || window.clipboardData;

    // Screenshot/image paste → upload + persist via AttachmentUploader flow
    const handled = await addPastedImagesToUploadAtts(cb, setAskUploadAtts);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }}
>
  <SimpleHTMLEditor
    html={askBodyHtml}
    onChange={setAskBodyHtml}
    placeholder="Write your post…"
  />
</div>





 <div className="mt-2">
  <AttachmentUploader
    value={askUploadAtts}
    onChange={setAskUploadAtts}
    folder={`uni/${uni || "unknown"}/posts`}
    maxFiles={5}
    role={isLecturer ? "lecturer" : "student"}
  />
</div>
                 
                      /*</div><div className="mt-2 flex items-center gap-2">*/
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        {/*<label className="text-xs border border-slate-200 rounded-full px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                          📎 Attach images/files
                          <input type="file" className="hidden" multiple onChange={onPickAskFiles} />
                        </label>*/}
                        {/*<div className="mt-2">*/}
  




                        /*</div><div className="ml-auto flex items-center gap-2">*/
                        <div className="contents sm:ml-auto sm:flex sm:items-center sm:gap-2">
                          <select
                            value={selectedCategory}
                            onChange={(e) => {
                              const c = e.target.value;
                              setSelectedCategory(c);
                              setSelectedTopic("All");
                            }}
                            /*className="min-w-0 flex-1 sm:flex-none border border-slate-200 rounded px-2 py-1.5 text-xs"*/
                            className="min-w-0 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            /*className="border border-slate-200 rounded px-2 py-1 text-xs"*/
                            className="min-w-0 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                          >
                            {["All", ...(selectedCategory === "All" ? [] : TOPIC_MAP[selectedCategory] || [])].map(
                              (t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              )
                            )}
                          </select>
                          {/*<button className="rounded-full bg-blue-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-blue-700">*/}
                            <button className="w-full sm:w-auto rounded-full bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold shadow-sm">
                            Post
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditorOpen(false);
                              setAskTitle("");
                              setAskBodyHtml("");
                              /*setAskAtts([]);*/
                              setAskUploadAtts([]);
                            }}
                            /*className="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"*/
                            className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </Card>

          {/* Sort + Search */}
          <Card>
            <div className="p-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
              <div className="text-sm">Showing:</div>
              <div className="flex items-center gap-1">
                {["Top", "Newest", "Answered"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`text-xs rounded-full px-3 py-1 border ${
                      sort === s ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="w-full sm:w-auto sm:ml-auto">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search posts…"
                  className="w-full sm:w-72 sm:max-w-[60vw] border border-slate-200 rounded px-3 py-2 sm:py-1.5 text-sm"
                />
              </div>
            </div>
          </Card>

          {sorted.map((post) => (
            <Card
              key={post.id}
              className="p-0"
              ref={(el) => {
                if (el) postRefs.current[post.id] = el;
              }}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
  <Avatar
    url={post.author?.photoUrl}
    name={post.author?.name}
    online={isOnline(post.author?.id)}
  />

  {/* ✅ Header info sits next to avatar */}
  <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-semibold text-slate-900 text-sm">
        {formatDisplayName(post.author?.name, post.author?.title)}
      </span>

      <RolePill role={post.role} title={post.author?.title} />

      <span className="text-slate-300">•</span>

      {/*<span className="text-xs text-slate-600">
        {timeAgo(post.createdAt)} ago
      </span>*/}
      

<span className="text-xs text-slate-600">
  {timeAgo(post.createdAt)} ago
</span>

<span className="text-slate-300">•</span>

<TopicChip
  category={post.category}
  onClick={() => {
    setSelectedCategory(post.category || "All");
    setSelectedTopic("All");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
/>
  </div>

    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
      <span>{post.author?.program || "Program"}</span>
      <span className="text-slate-300">•</span>
      <span>
        {post.category} • {post.topic}
      </span>
    </div>
  </div>

  {/* Delete stays on the right */}
  {(
    String(post.author?.id || post.authorId || "") &&
    [user?.id, user?.uid, user?.userId]
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .includes(String(post.author?.id || post.authorId || "").trim())
  ) && (
    <button
      onClick={() => {
        if (confirm("Delete this post?")) deletePost(post.id);
      }}
      className="ml-auto text-xs border border-red-200 text-red-600 rounded px-2 py-1 hover:bg-red-50"
      title="Delete post"
    >
      Delete
    </button>
  )}
</div>

                <div className="mt-2">
                  <div className="text-lg font-semibold text-slate-900">{post.title}</div>
                  {post.bodyHtml && <HTMLReadMore html={post.bodyHtml} lines={3} />}
                  <AttachmentStrip atts={post.attachments} onPreview={setPreview} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600">
                  <button onClick={() => toggleLike(post.id)} className="rounded px-2 py-1 hover:bg-slate-50">
                    👍 Upvote{" "}
                    {post.likes > 0 && <span className="text-slate-500">({post.likes})</span>}
                  </button>
                  <span className="hidden sm:inline text-slate-400">•</span>
                  <span className="text-slate-700">
                    {/*{(post.comments || []).filter((c) => c.parentId == null).length} Comments*/}
                    {normalizeThreadComments(post.comments).filter((c) => c.parentId == null).length} Comments
                    </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-700">{post.views || 0} Views</span>
                  
  <button
    type="button"
    onClick={() => onReport({ itemType: "post", itemId: post.id, postId: post.id })}
    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
    title="Report"
  >
    🚩 Report
  </button>

                  <button onClick={() => toggleSave(post.id)} className="sm:ml-auto rounded px-2 py-1 hover:bg-slate-50">
                    {post.saved ? "★ Saved" : "☆ Save"}
                  </button>
                </div>

                <div className="mt-2">
                  <AnswerThread key={`answers-${post.id}`} post={post} />
                </div>
              </div>
            </Card>
          ))}
        </section>

        {/* RIGHT rail */}
        <aside className="hidden lg:block space-y-4 pb-24">
          <Card square>
            <HeaderBar title="Your Topics" square />
            <div className="p-3 space-y-1 text-sm max-h-[180px] overflow-auto">
              {Object.entries(follows)
                .filter(([_, v]) => v)
                .map(([k]) => {
                  const [cat, topic] = k.split("::");
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedTopic(topic);
                      }}
                      className="w-full text-left rounded px-2 py-1 hover:bg-slate-50"
                      title={`${cat} • ${topic}`}
                    >
                      {topic} <span className="text-slate-400">• {cat}</span>
                    </button>
                  );
                })}
              {Object.values(follows).filter(Boolean).length === 0 && (
                <div className="text-slate-500">Follow topics from the left panel.</div>
              )}
            </div>
          </Card>

          <Card square>
            <HeaderBar title="Community rules" square />
            <div className="p-4 text-sm text-slate-700">
              Be respectful. No harassment, plagiarism, or sharing of exam content. Cite sources when possible.
            </div>
          </Card>

          <Card square>
            <HeaderBar title="Academic Platforms' links" square />
            <div className="p-3 text-sm space-y-2 text-center">
              <Link
                to="/platform/global"
                className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50"
              >
                Global Academic Platform
              </Link>

              {!isLecturer && (
                <>
                  <Link
                    to="/marketplace"
                    className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50"
                  >
                    Student Market Place
                  </Link>
                  <Link
                    to="/student-dashboard?tab=profile"
                    className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50"
                  >
                    View My Profile
                  </Link>
                </>
              )}
            </div>
          </Card>

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

      <NotificationTray userId={user?.id} onOpenPost={scrollToPost} />

      <Lightbox img={preview} onClose={() => setPreview(null)} />
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-black/80 text-white text-sm px-4 py-2 rounded-full">
          {toast}
        </div>
      )}
    </div>
  );
}