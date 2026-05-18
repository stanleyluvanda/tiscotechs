// src/pages/StudentDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
//import { Link, useNavigate } from "react-router-dom";
import { getPrograms, YEARS } from "../data/eduData.js";
import YouTubeEmbed from "../components/YouTubeEmbed";
import StudentAlertsCTA from "../components/StudentAlertsCTA";
import { computeUnreadForStudent } from "../lib/contactStore";
import AccountSecurityCard from "../components/account/AccountSecurityCard.jsx";
import VerifyGate from "../components/VerifyGate";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AttachmentUploader from "../components/upload/AttachmentUploader"; // ⬅️ NEW
//import { fetchPosts, createPost, deletePostOnServer } from "../lib/postsApi";
import SingleImageUploader from "../components/upload/SingleImageUploader.jsx";
import {fetchPosts, createPost, deletePostOnServer,createComment,createReply,} from "../lib/postsApi";
import { reportContent } from "../lib/moderationApi.js"; // adjust path
import { uploadFileToS3 } from "../lib/uploadLambda";
import useNoIndex from "../lib/useNoIndex";
//import {getConversation,listPeople,listThreads,markRead,sendMessage,} from "../lib/messagingApi";
import MessagingDock from "../components/MessagingDock";


/* ================= Utils ================ */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
const UPLOAD_LAMBDA =
  import.meta.env.VITE_UPLOAD_LAMBDA_URL ||
  "https://tepyhcsa6ttzmtbiqvuunj573u0jmuhj.lambda-url.us-east-1.on.aws";

function makeUniqueFilename(originalName = "image") {
  const name = String(originalName || "image");
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const safeBase = base.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 50) || "image";
  return `${safeBase}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext || ".jpg"}`;
}

async function uploadToCloudFront({ file, folder }) {
  const uniqueName = makeUniqueFilename(file.name);

  const meta = await fetch(UPLOAD_LAMBDA, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      folder,
      filename: uniqueName,
      contentType: file.type || "application/octet-stream",
    }),
  }).then((r) => r.json());

  if (!meta?.uploadUrl || !(meta.publicUrl || meta.cloudfrontUrl)) {
    throw new Error("Uploader did not return uploadUrl + CloudFront URL");
  }

  const put = await fetch(meta.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!put.ok) throw new Error(`PUT failed: ${put.status}`);

  return meta.publicUrl || meta.cloudfrontUrl; // ✅ CloudFront URL
}

// ✅ ADD THIS RIGHT HERE (directly under safeParse)
function isDataUrl(s = "") {
  return typeof s === "string" && s.startsWith("data:");
}
function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "S") + (parts[1]?.[0] || "K")).toUpperCase();
}

// ✅ Strong local-only post ID (never collides, never duplicates)
function makeLocalPostId() {
  return `local_${crypto.randomUUID()}`;
}


// ✅ ADD THESE TWO HELPERS (place right here)
function makeId(p, idx = 0) {
  // Prefer stable server id (if your backend ever provides it)
  const direct =
    p?.id || p?._id || p?.postId || p?.uuid || p?.key || p?.createdAt;

  if (direct) return String(direct);

  // Fallback: deterministic signature (prevents React duplicate keys)
  const created = p?.ts || p?.created || p?.time || p?.date || "";
  const author = p?.authorId || p?.userId || p?.email || p?.name || "";
  const title = p?.title || "";
  const text = p?.text || p?.content || "";

  return `${created}__${author}__${title}__${text}__${idx}`;
}

function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < (list || []).length; i++) {
    const p = list[i];
    const id = makeId(p, i);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ ...p, id }); // ensure downstream has p.id for keying
  }
  return out;
}




/* ✅ ADD THIS RIGHT HERE (below initials, before audience helpers / component code) */
function splitImagesAndFilesFromPost(post) {
  const normArr = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

  const looksLikeImage = (att) => {
    const mime = String(att?.mime || att?.type || "").toLowerCase();
    const name = String(att?.name || att?.fileName || "").toLowerCase();
    const url  = String(att?.url || att?.s3Url || att?.dataUrl || "").toLowerCase();

    if (mime.startsWith("image/")) return true;
    if (name.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/)) return true;
    if (url.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?|#|$)/)) return true;

    return false;
  };

  // Start with explicit images/files if present
  const rawImages = normArr(post?.images);
  const rawFiles  = normArr(post?.files);

  // Also consider "attachments" if some posts still use it
  const rawAtts = normArr(post?.attachments).map((a) => ({
    id: a.key || a.url,
    name: a.fileName || a.name || "file",
    mime: a.mime || "application/octet-stream",
    url: a.url || a.s3Url || null,
    type: a.type || "",
  }));

  const allImages = [];
  const allFiles = [];

  // 1) images[] always treated as images
  for (const it of rawImages) {
    if (!it) continue;
    allImages.push(it);
  }

  // 2) files[] might contain images (THIS is your bug case)
  for (const it of rawFiles) {
    if (!it) continue;
    if (looksLikeImage(it)) allImages.push(it);
    else allFiles.push(it);
  }

  // 3) attachments[] fallback classification
  for (const it of rawAtts) {
    if (!it) continue;
    if (looksLikeImage(it)) allImages.push(it);
    else allFiles.push(it);
  }

  // De-dupe by (id/url/name)
  const dedupe = (arr) => {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      const key = String(x?.id || x?.url || x?.name || Math.random());
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(x);
    }
    return out;
  };

  return {
    images: dedupe(allImages),
    files: dedupe(allFiles),
  };
}

// Auto-grow helper for textareas
function autosize(el, maxPx = 220) {
  if (!el) return;
  el.style.height = "auto";
  const next = Math.min(el.scrollHeight, maxPx);
  el.style.height = next + "px";
  el.style.overflowY = el.scrollHeight > maxPx ? "auto" : "hidden";
}

const RAW_NAME_TO_ISO = {
  Nigeria:"NG", Kenya:"KE", Tanzania:"TZ","United Republic of Tanzania":"TZ", Ghana:"GH", Uganda:"UG",
  "South Africa":"ZA", Ethiopia:"ET", Algeria:"DZ", Angola:"AO", Benin:"BJ", Botswana:"BW", "Burkina Faso":"BF",
  Burundi:"BI", Cameroon:"CM","Cape Verde":"CV","Central African Republic":"CF", Chad:"TD", Congo:"CG",
  "Republic of the Congo":"CG","Congo DR":"CD","DR Congo":"CD","Democratic Republic of the Congo":"CD",
  Djibouti:"DJ", Egypt:"EG","Equatorial Guinea":"GQ", Eritrea:"ER","Eswatini (Swaziland)":"SZ", Eswatini:"SZ",
  Swaziland:"SZ", Gabon:"GA", Gambia:"GM", Guinea:"GN","Ivory Coast":"CI","Cote d'Ivoire":"CI","Côte d’Ivoire":"CI",
  Lesotho:"LS", Liberia:"LR", Libya:"LY", Madagascar:"MG", Malawi:"MW", Mali:"ML", Mauritania:"MR",
  Mauritius:"MU", Morocco:"MA", Mozambique:"MZ", Namibia:"NA", Niger:"NE", Reunion:"RE", Rwanda:"RW",
  Senegal:"SN", Seychelles:"SC","Sierra Leone":"SL", Somalia:"SO","South Sudan":"SS", Sudan:"SD", Togo:"TG",
  Tunisia:"TN", Zambia:"ZM", Zimbabwe:"ZW",
};
const canon = (s="") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const NAME_TO_ISO_CANON = Object.fromEntries(Object.entries(RAW_NAME_TO_ISO).map(([k,v]) => [canon(k), v]));
const normalizeCountry = (s="") => s.replace(/\s+/g," ").trim();
const isoFromCountryName = (country="") => NAME_TO_ISO_CANON[canon(country)] || "";
const ensureCountryCode = (country, countryCode) => {
  const cc = String(countryCode || "").toUpperCase().trim();
  if (cc.length === 2) return cc;
  return isoFromCountryName(country) || "";
};

/** Flag (from FlagCDN) */
function FlagIcon({ country, countryCode, className = "w-6 h-4" }) {
  const cc = ensureCountryCode(country, countryCode);
  if (!cc) return <span className={`inline-block ${className}`}>🌍</span>;
  const lo = `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
  const hi = `https://flagcdn.com/w80/${cc.toLowerCase()}.png`;
  const svg = `https://flagcdn.com/${cc.toLowerCase()}.svg`;
  return (
    <img
      src={lo}
      srcSet={`${lo} 1x, ${hi} 2x`}
      alt={`${country} flag`}
      className={`inline-block align-[-2px] rounded-[2px] ${className}`}
      width={24}
      height={16}
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = svg; }}
      loading="lazy"
    />
  );
}

/* ---- Display helpers ---- */
const facultyDisplay = (u) =>
  (u?.faculty && u.faculty.trim()) || "College/School/Faculty/Department";

/* Audience helpers */
const audienceKey = ({ university, faculty, program, year }) =>
  `${university}__${faculty}__${program}__${year}`;
const facultyAudienceKey = ({ university, faculty }) =>
  `FACULTY__${university}__${faculty}`;
const facultyYearAudienceKey = ({ university, faculty, year }) =>
  `FACULTY__${university}__${faculty}__${year}`;

// Notifications helpers
const NOTIF_SEEN_KEY = (uid) => `notifSeen_${uid}`;
const LECT_LAST_NOTIFY_KEY = (uid) => `lectLastNotify_${uid}`; // last lecturer post we surfaced toasts for
const NOTIF_CLEARED_KEY = (uid) => `notifCleared_${uid}`; // hide old notifs after "Clear all"
const isMyAudience = (p, u, baseFac, audKey) => {
  if (p.audience === "GLOBAL") return false;
  if (p.audience === audKey) return true;
  if (p.audience === baseFac) return true;
  if (p.audience === `${baseFac}__${u.year}`) return true;
  return false;
};

/* ===== Attachments: IndexedDB (so large items persist) ===== */
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

/* Small thumbnails we can keep in localStorage safely */
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
    img.onerror = () => resolve(dataUrl); // fallback
    img.src = dataUrl;
  });
}

/* Image downscale & file readers for inputs */
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





//I added the below to optimize the image 04022026 in case it compromise the logic,it will be removed

async function convertImageFileToWebP(
  file,
  {
    maxW = 1600,
    maxH = 1600,
    quality = 0.8,
    fileName = "image",
  } = {}
) {
  const blobUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = blobUrl;
    });

    const ratio = Math.min(1, maxW / img.width, maxH / img.height);
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, w, h);

    const webpBlob = await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
    });

    if (!webpBlob) return file;

    const safeBase = String(fileName || file.name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .slice(0, 60) || "image";

    return new File([webpBlob], `${safeBase}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[StudentDashboard] WebP conversion skipped:", err);
    return file;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}











function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* Storage helpers */
const trySet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
const ID_KEYS = ["authUserId","activeUserId","currentUserId","loggedInUserId"];
function persistUser(user) {
  sessionStorage.setItem("currentUser", JSON.stringify(user));
  for (const k of ID_KEYS) sessionStorage.setItem(k, user.id);
  trySet("currentUser", JSON.stringify(user));
  for (const k of ID_KEYS) trySet(k, user.id);
  const users = safeParse(localStorage.getItem("users")) || [];
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user; else users.push(user);
  trySet("users", JSON.stringify(users));
  const map = safeParse(localStorage.getItem("usersById")) || {};
  map[user.id] = user; trySet("usersById", JSON.stringify(map));
}
function loadActiveUser() {
  for (const src of [sessionStorage, localStorage]) {
    for (const key of ID_KEYS) {
      const id = src.getItem(key);
      if (id) {
        const byId = safeParse(localStorage.getItem("usersById")) || {};
        if (byId[id]) return byId[id];
        const arr = safeParse(localStorage.getItem("users")) || [];
        const found = arr.find(u => u.id === id || u.uid === id || u.userId === id);
        if (found) return found;
      }
    }
  }
  const ss = safeParse(sessionStorage.getItem("currentUser"));
  if (ss) return ss;
  const ls = safeParse(localStorage.getItem("currentUser"));
  if (ls) return ls;
  return null;
}

// ---- Global user persistence + broadcast ----
function saveAndBroadcastUser(nextUser) {
  persistUser(nextUser);
  try { localStorage.setItem("currentUser", JSON.stringify(nextUser)); } catch {}
  try { sessionStorage.setItem("currentUser", JSON.stringify(nextUser)); } catch {}
  window.dispatchEvent(new Event("user:updated"));
}

/* ================= Consent wiring helpers (no duplicates) ================= */
function consentGetIdentity() {
  const currentUser = (function(){
    try { return JSON.parse(localStorage.getItem("currentUser") || ""); } catch { return {}; }
  })() || {};
  const id =
    currentUser.id ||
    localStorage.getItem("currentUserId") ||
    currentUser.uid ||
    currentUser.email ||
    currentUser.username ||
    "";
  const email = currentUser.email || currentUser.username || "";
  return { id, email };
}
function consentLoadFor(id, email) {
  const parse = (j) => { try { return JSON.parse(j || ""); } catch { return null; } };
  const primary   = parse(localStorage.getItem(`studentConsent:${id}`));
  const alt       = parse(localStorage.getItem(`studentConsent:${email}`));
  const byIdMap   = parse(localStorage.getItem("consentsByUserId")) || {};
  const fromMap   = byIdMap[id] || null;
  const raw = fromMap || primary || alt || {};
  return {
    scholarshipAlerts: !!raw.scholarshipAlerts,
    applicationTips: !!raw.applicationTips,
    programRecommendations: !!raw.programRecommendations,
    applicationInvitation: !!raw.applicationInvitation,
    updatedAt: raw.updatedAt || null,
  };
}
function consentPersistFor(id, email, consentObj) {
  const updated = { ...consentObj, updatedAt: new Date().toISOString() };
  // 1) per-student key
  const key = id ? `studentConsent:${id}` : `studentConsent:${email}`;
  localStorage.setItem(key, JSON.stringify(updated));
  // 2) map by id
  if (id) {
    const parse = (j) => { try { return JSON.parse(j || ""); } catch { return {}; } };
    const byIdMap = parse(localStorage.getItem("consentsByUserId")) || {};
    byIdMap[id] = updated;
    localStorage.setItem("consentsByUserId", JSON.stringify(byIdMap));
  }
  // 3) mirror into users[]
  try {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    let changed = false;
    const next = users.map(u => {
      if (!u) return u;
      if ((id && u.id === id) || (email && u.email === email)) {
        changed = true;
        return { ...u, consent: updated, updatedAt: updated.updatedAt };
      }
      return u;
    });
    if (changed) localStorage.setItem("users", JSON.stringify(next));
  } catch {}
  return updated;
}

/* ================= Post types ================= */
const POST_TYPES = [
  "Notes",
  "Assignments",
  "Internships",
  "Announcement",
  "Scholarships",
  "Academic Books",
  "Researches/Thesis",
  "Academic Essay",
  "Students' jokes",  // NEW
  "Video"             // visible in filter; only lecturers can create
];

/* ================= Sample base ================= */
const initialUser = {
  id:"u1", name:"Student Name", photoUrl:"", bannerUrl:"",
  continent:"Africa", country:"Nigeria", countryCode:"NG",
  university:"University", faculty:"Faculty", program:"Program", year:"1st Year",
};

/* ================= Reusable UI ================= */
function Card({ className="", children }) { return <div className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>{children}</div>; }
function DashLink({ to, label }) { return <Link to={to} className="block rounded px-2 py-2 hover:bg-slate-50 text-slate-700 text-center">{label}</Link>; }
/* NEW: Academic Platform style header bar + square sidebar card */
function HeaderBar({ title }) {
  return (
    <div className="px-4 py-2.5 bg-[#7bdad1]/90 text-slate-900 text-sm font-semibold text-center">
      {title}
    </div>
  );
}
/*function SidebarCard({ title, children }) {
  return (
    <div className="rounded-none overflow-hidden border border-slate-200 bg-white shadow-sm">
      <HeaderBar title={title} />
      <div className="p-3">{children}</div>
    </div>
  );
}*/
function SidebarCard({ title, children, headerOnly = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#8ad5cf] px-4 py-4 font-semibold text-slate-900">
        {title}
      </div>

      {!headerOnly ? (
        <div className="px-4 py-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function FilterPill({ label, active, onClick, activeClassName, showNew=false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-3 py-2 rounded-full text-sm flex items-center ${
        active ? (activeClassName || "bg-slate-900 text-white")
               : "border border-slate-100 hover:bg-slate-50 text-left"
      }`}
    >
      <span className="truncate">{label}</span>
      {!active && showNew && (
        <span className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold text-white bg-red-600 animate-pulse">
          NEW
        </span>
      )}
    </button>
  );
}
function ToolbarButton({ onClick, label, title }) {
  return <button type="button" onClick={onClick} title={title} className="rounded border border-slate-100 px-2 py-1 text-sm hover:bg-slate-50">{label}</button>;
}
function Avatar({ size="md", url, name, online=false }) {
  const sizeClass = size==="lg"?"h-16 w-16":size==="sm"?"h-8 w-8":"h-10 w-10";
  //const cls = `${sizeClass} relative rounded-full bg-slate-300 flex items-center justify-center overflow-hidden`;
  const cls = `${sizeClass} relative flex-shrink-0 rounded-full bg-slate-300 flex items-center justify-center overflow-hidden`;
  return (
    <div className={cls}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover rounded-full" /> : <div className="h-full w-full flex items-center justify-center text-white text-sm bg-gradient-to-tr from-blue-500 to-indigo-500">{initials(name)}</div>}
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Online" />}
    </div>
  );
}
function stripHtml(s=""){ const d=document.createElement("div"); d.innerHTML=s; return (d.textContent||d.innerText||"").trim(); }

function ExpandableText({ text, initialChars = 180, className = "" }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  const raw = String(text || "");
  const tooLong = raw.length > initialChars;
  const shown = open || !tooLong ? raw : raw.slice(0, initialChars) + "…";

  // ✅ Only apply heading/bold heuristics when the content "looks pasted"
  // (multiple paragraphs / bullets / lots of line breaks)
  const looksPasted =
    /\n{2,}/.test(raw) || /[•·▪–—]\s/.test(raw) || raw.split("\n").length >= 4;

  const renderTextWithHeadingsSafe = (t = "") => {
    const lines = String(t).replace(/\r\n/g, "\n").split("\n");
    return (
      <div className="whitespace-pre-wrap break-words leading-6">
        {lines.map((line, i) => {
          const trimmed = line.trim();

          // keep blank lines (paragraph spacing)
          if (!trimmed) return <div key={i} className="h-3" />;

          // Bold "Label:" lines ONLY when pasted-like
          if (looksPasted) {
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

            // Bold standalone heading lines like "Key Aspects" / "Benefits" (pasted-like only)
            const common =
              /^(key aspects|benefits|challenges|challenges & criticisms|limitations|overview|summary|modern trends|policy issues|trade imbalances|governance & regulation)$/i;

            if (common.test(trimmed)) {
              return (
                <div key={i} className="font-semibold mt-2">
                  {trimmed}
                </div>
              );
            }
          }

          // normal line
          return <div key={i}>{line}</div>;
        })}
      </div>
    );
  };

  return (
    <div className={`mt-1 text-slate-800 ${className}`}>
      {renderTextWithHeadingsSafe(shown)}
      {tooLong && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-blue-600 hover:underline"
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function ExpandableHtml({ html, initialChars = 280 }) {
  const [open, setOpen] = useState(false);
  const plain = stripHtml(html);
  const tooLong = plain.length > initialChars;
  const shortHtml = plain.slice(0, initialChars) + (tooLong ? "…" : "");

  return (
    <div className="mt-3 text-slate-800 max-w-none [&_p]:my-2 [&_strong]:font-semibold [&_br]:leading-6">
      {open || !tooLong ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div>{shortHtml}</div>
      )}

      {tooLong && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-blue-600 text-sm hover:underline"
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

/* Bright, pulsing NEW badge */
function NewBadge({ show }) {
  if (!show) return null;
  return (
    <span
      className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold
                 text-white bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-pulse"
    >
      NEW
    </span>
  );
}

/* Helper to stop default + propagation */
const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

/* ---------- Attachment resolvers (IDB -> object URL) ---------- */
function useAttachmentUrl(att, preferFull = true) {
  // NEW: prefer direct URLs from S3 (or any HTTP URL) if present
  const directUrl = att?.url || att?.s3Url || null;

  const [url, setUrl] = useState(
    att?.dataUrl ||              // legacy in-memory/base64
    directUrl ||                 // new S3 / HTTP-style
    (preferFull ? null : att?.thumb || null)
  );

  useEffect(() => {
    let toRevoke = null;
    let cancelled = false;

    // If we already have a direct URL or dataUrl, do nothing.
    if (directUrl || att?.dataUrl) {
      return () => {};
    }

    // Fallback: old behaviour — try IndexedDB by id, then thumb
    if (!url && att?.id) {
      (async () => {
        const blob = await idbGet(att.id);
        if (cancelled) return;
        if (blob) {
          const obj = URL.createObjectURL(blob);
          toRevoke = obj;
          setUrl(obj);
        } else if (att?.thumb) {
          setUrl(att.thumb);
        }
      })();
    }

    return () => {
      cancelled = true;
      if (toRevoke) URL.revokeObjectURL(toRevoke);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [att?.id, directUrl]);

  return url;
}

function AttachmentImage({ att, className="", onClick, enlarge=false }) {
  const url = useAttachmentUrl(att, enlarge); // enlarge -> fetch full
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

function getExt(name = "") {
  const n = String(name || "").trim();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i + 1).toLowerCase() : "";
}

function guessNameFromUrl(u = "") {
  try {
    const url = String(u || "");
    const clean = url.split("?")[0].split("#")[0];
    const last = clean.split("/").pop() || "";
    return decodeURIComponent(last) || "";
  } catch {
    return "";
  }
}

// ✅ Always try to get a real filename (even if backend didn’t send one)
function attachmentDisplayName(att = {}) {
  const direct =
    att.fileName ||
    att.filename ||
    att.originalName ||
    att.originalFilename ||
    att.name;

  const fromUrl = guessNameFromUrl(att.url || att.s3Url || "");
  const fromKey = guessNameFromUrl(att.key || "");

  const picked = String(direct || fromUrl || fromKey || "").trim();
  return picked || "file";
}

function fileKind(att = {}) {
  const name = attachmentDisplayName(att);
  const mime = String(att.mime || att.contentType || "").toLowerCase();
  const ext = getExt(name);

  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.includes("word") || ["doc", "docx"].includes(ext)) return "word";
  if (mime.includes("powerpoint") || ["ppt", "pptx"].includes(ext)) return "ppt";
  if (mime.includes("excel") || ["xls", "xlsx", "csv"].includes(ext)) return "xls";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "img";
  return "file";
}

// ✅ Badge text you wanted: PDF / W / P / XLS / IMG / FILE
function kindBadge(kind) {
  const cfg =
    kind === "pdf"
      ? { label: "PDF", cls: "bg-red-600 text-white border-red-700" }
      : kind === "word"
      ? { label: "W", cls: "bg-blue-600 text-white border-blue-700" }
      : kind === "ppt"
      ? { label: "P", cls: "bg-orange-500 text-white border-orange-600" }
      : kind === "xls"
      ? { label: "XLS", cls: "bg-green-600 text-white border-green-700" }
      : kind === "img"
      ? { label: "IMG", cls: "bg-slate-800 text-white border-slate-900" }
      : { label: "FILE", cls: "bg-slate-200 text-slate-800 border-slate-300" };

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[26px] h-4 px-1.5 rounded-md border text-[10px] font-bold ${cfg.cls}`}
      title={cfg.label}
    >
      {cfg.label}
    </span>
  );
}

function AttachmentLink({ att }) {
  const url = useAttachmentUrl(att, true);
  const name = attachmentDisplayName(att);
  const kind = fileKind(att);

  if (!url) {
    return (
      <span className="text-slate-400 inline-flex items-center gap-2">
        {kindBadge(kind)}
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
      {kindBadge(kind)}
      <span className="break-all">{name}</span>
    </a>
  );
}

/* ---------- Reusable grid (with prev/next arrows) ---------- */
function ImageGrid({
  images=[],
  onOpen,
  max=3,
  tileClass="h-40",
  cols="grid-cols-2 md:grid-cols-3",
  className="",
  withArrows=true,
}) {
  const len = images.length || 0;
  const [offset, setOffset] = useState(0);
  useEffect(()=>{ setOffset(0); }, [len]); // reset when new images set arrives

  if (len === 0) return null;

  const count = Math.min(max, len);
  const indices = Array.from({length: count}, (_,i)=> (offset + i) % len);
  const showArrows = withArrows && len > max;

  const next = () => setOffset(o => (o + 1) % len);
  const prev = () => setOffset(o => (o - 1 + len) % len);

  return (
    <div className={`relative ${className}`}>
      {/* grid */}
      <div className={`grid ${cols} gap-2`}>
        {indices.map((gi, idx) => {
          const img = images[gi];
          const isLast = idx === indices.length - 1 && len > max;
          return (
            <div key={(img.id||img.dataUrl||img.name||"img")+gi} className="relative">
              <AttachmentImage
                att={img}
                className={`w-full ${tileClass} object-cover rounded cursor-zoom-in`}
                onClick={() => onOpen(gi)}
              />
              {isLast && (
                <button
                  type="button"
                  onClick={() => onOpen(gi)}
                  className="absolute inset-0 rounded bg-black/50 text-white font-semibold text-sm md:text-base flex items-center justify-center"
                  title="View more photos"
                >
                  +{len - max} more
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* mini-carousel arrows over the grid */}
      {showArrows && (
        <>
          <button
            type="button"
            onClick={(e)=>{ stop(e); prev(); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-2 py-1 text-lg shadow"
            aria-label="Previous"
            title="Previous"
          >‹</button>
          <button
            type="button"
            onClick={(e)=>{ stop(e); next(); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-2 py-1 text-lg shadow"
            aria-label="Next"
            title="Next"
          >›</button>
        </>
      )}
    </div>
  );
}

/* ====== Comment thread with attachments (LinkedIn-style) ====== */
function CommentThread({ comment, onAddReply, onOpenLightbox }) {
  const [reply,setReply]=useState("");
  const [replyImages,setReplyImages]=useState([]); // [{name,dataUrl}]
  const [replyFiles,setReplyFiles]=useState([]);   // [{name,mime,dataUrl}]

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

  return (
    <div className="text-sm">
      <div className="flex items-start gap-2">
        <Avatar size="sm" url={comment.authorPhoto} name={comment.author}/>
        <div className="flex-1">
          {/*<div className="font-medium text-slate-800">{comment.author}</div>
          <div className="text-xs text-slate-500 mb-1">{comment.authorProgram||""}</div>*/}
          <div className="font-bold text-slate-900">{comment.author}</div>

{(comment?.authorProgram || comment?.createdAt) ? (
  <div className="text-xs font-bold text-blue-800 mb-1">
    {(comment?.authorProgram || "").trim()}
    {comment?.createdAt ? (
      <>
        {" "}•{" "}
        {formatTimeAgo(comment.createdAt)}
      </>
    ) : null}
  </div>
) : null}

          <ExpandableText text={comment.text}/>

          {/* comment images */}
          {comment.images?.length>0 && (
            <div className="mt-2">
              <ImageGrid
                images={comment.images}
                onOpen={(idx)=>onOpenLightbox(comment.images, idx)}
                max={3}
                tileClass="h-28"
                withArrows
              />
            </div>
          )}
          {/* comment files */}
          {comment.files?.length>0 && (
            <ul className="mt-2 space-y-1">
              {comment.files.map((f, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  📎 <AttachmentLink att={f} />
                </li>
              ))}
            </ul>
          )}

          {/* replies */}
          {/* replies */}
{(() => {

const replies = Array.isArray(comment.replies) ? comment.replies : [];
  if (!replies.length) return null;

  return (
    <div className="mt-2 pl-6 space-y-2">
      {replies.map((r, index) => (
        <div
          key={r?.id || `${comment.id || "comment"}-reply-${index}`}
          className="flex items-start gap-2"
        >
          <Avatar size="sm" url={r?.authorPhoto} name={r?.author} />
          <div>
            {/*<div className="font-medium text-slate-800">{r?.author}</div>
            <div className="text-xs text-slate-500 mb-1">
              {r?.authorProgram || ""}
            </div>*/}
            <div className="font-bold text-slate-900">{r?.author}</div>

{(r?.authorProgram || r?.createdAt) ? (
  <div className="text-xs font-bold text-blue-800 mb-1">
    {(r?.authorProgram || "").trim()}
    {r?.createdAt ? (
      <>
        {" "}•{" "}
        {formatTimeAgo(r.createdAt)}
      </>
    ) : null}
  </div>
) : null}

            <ExpandableText text={r?.text || ""} />

            {Array.isArray(r?.images) && r.images.length > 0 && (
              <div className="mt-2">
                <ImageGrid
                  images={r.images}
                  onOpen={(idx) => onOpenLightbox(r.images, idx)}
                  max={3}
                  tileClass="h-24"
                  withArrows
                />
              </div>
            )}

            {Array.isArray(r?.files) && r.files.length > 0 && (
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
  );
})()}
          {/* reply composer */}
          <form
            /*onSubmit={(e)=>{e.preventDefault(); onAddReply(reply, replyImages, replyFiles); setReply(""); setReplyImages([]); setReplyFiles([]); }}*/
            onSubmit={(e) => {
  e.preventDefault();
  const text = (reply || "").replace(/\r\n/g, "\n"); // ✅ keep newlines
  onAddReply(text, replyImages, replyFiles);
  setReply("");
  setReplyImages([]);
  setReplyFiles([]);
}}
            className="mt-2"
          >
            <div className="flex items-start gap-2">
              <textarea
  ref={(el) => el && autosize(el)}
  value={reply}
  onChange={(e) => {
    setReply(e.target.value);
    autosize(e.target);
  }}
  onPaste={async (e) => {
    try {
      const did = await pasteClipboardImagesToState(e, {
        setImages: setReplyImages,
        max: 5,
      });
      if (did) return; // image paste handled
      // if not an image paste, let the browser do normal text paste
    } catch (err) {
      console.error("[reply paste] failed:", err);
    }
  }}
  placeholder="Write a reply…"
  rows={1}
  className="flex-1 border border-slate-100 rounded-lg px-3 py-2 bg-white resize-none leading-5"
  style={{ minHeight: 40, maxHeight: 150 }}
/>

              <label className="text-xs px-2 py-1 border border-slate-100 rounded cursor-pointer">📷
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPickReplyImages}/>
              </label>
              <label className="text-xs px-2 py-1 border border-slate-100 rounded cursor-pointer">📎
                <input type="file" multiple className="hidden" onChange={onPickReplyDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
              </label>
              {/* NEW: make reply button prominent */}
              <button type="submit" className="rounded-full bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">
                Reply
              </button>
            </div>

            {(replyImages.length>0 || replyFiles.length>0) && (
              <div className="mt-2 space-y-2 pl-1">
                {replyImages.length>0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {replyImages.map((img,i)=>(<img key={i} src={img.dataUrl} alt={img.name} className="w-full h-20 object-cover rounded" />))}
                  </div>
                )}
                {replyFiles.length>0 && (
                  <ul className="text-xs space-y-1">
                    {replyFiles.map((f,i)=>(<li key={i} className="flex items-center gap-2">📎<span>{f.name}</span></li>))}
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



async function pasteClipboardImagesToState(e, { setImages, max = 5 }) {
  const cb = e.clipboardData || window.clipboardData;
  const items = Array.from(cb?.items || []);

  // Only handle image pastes; otherwise do nothing (so normal text paste still works)
  const imgItems = items.filter((it) => it?.type && it.type.startsWith("image/"));
  if (imgItems.length === 0) return false;

  e.preventDefault();

  // Convert each clipboard image to your existing [{name, dataUrl}] shape
  for (const it of imgItems) {
    const file = it.getAsFile();
    if (!file) continue;

    // Optional: limit how many images can be added from paste
    let added = false;
    await new Promise((r) =>
      setImages((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (arr.length >= max) return prev;
        added = true;
        return prev; // we only check capacity here
      }) || r()
    );

    if (!added) break;

    // Downscale (matches your existing logic used in onPickCmtImages)
    const dataUrl = await fileToDownscaledDataURL(file, 1280, 1280, 0.82, 420);
    const mapped = { name: file.name || "pasted-image.png", dataUrl };

    setImages((prev) => [...(Array.isArray(prev) ? prev : []), mapped]);
  }

  return true;
}

/* ====== Post card (with lightbox + prev/next) ====== */
function PostCard({
  post,
  onToggleLike,
  onAddComment,
  onAddReply,
  onDeletePost,     // NEW
  onReport,
  currentUser,
  isHighlighted,
}) {
  const [showComments,setShowComments]=useState(true);
  const [cmt,setCmt]=useState("");
  const [cmtImages,setCmtImages]=useState([]); // [{name,dataUrl}]
  const [cmtFiles,setCmtFiles]=useState([]);   // [{name,mime,dataUrl}]
  const [lightbox, setLightbox] = useState({ open:false, items:[], index:0 });

  const onPickCmtImages = async (e)=>{
    const files = Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"));
    const dataUrls = await Promise.all(files.map(f=>fileToDownscaledDataURL(f, 1280, 1280, 0.82, 420)));
    const mapped = dataUrls.map((dataUrl,i)=>({name:files[i].name, dataUrl}));
    setCmtImages(arr=>[...arr, ...mapped]); e.target.value="";
  };
  const onPickCmtDocs = async (e)=>{
    const files = Array.from(e.target.files||[]);
    const mapped = await Promise.all(files.map(async f=>({ name:f.name, mime:f.type||"application/octet-stream", dataUrl: await readFileAsDataURL(f)})));
    setCmtFiles(arr=>[...arr, ...mapped]); e.target.value="";
  };

  // Lightbox controls
  const openLightbox = (items = [], index = 0) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setLightbox({
      open: true,
      items: items.slice(),
      index: Math.max(0, Math.min(index, items.length - 1)),
    });
  };
  const closeLightbox = () => setLightbox(l => ({ ...l, open:false }));
  const step = (dir) =>
    setLightbox(l => {
      const len = l.items?.length || 0;
      if (len <= 1) return l;
      return { ...l, index: (l.index + dir + len) % len };
    });

  useEffect(()=>{
    if (!lightbox.open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open]);

  //const images = post.images || [];
  //const { images, files } = splitImagesAndFilesFromPost(post);

  const parsed = splitImagesAndFilesFromPost(post);

const isImg = (a) => String(a?.mime || a?.type || "").toLowerCase().startsWith("image/");

// ✅ Only true images go to ImageGrid
const images = (parsed.images || []).filter(isImg);

// ✅ Anything non-image must go to files (but dedupe so it doesn't show twice)
const mergedFiles = [
  ...(parsed.files || []),
  ...(parsed.images || []).filter((a) => !isImg(a)),
];

const seen = new Set();
const files = mergedFiles.filter((a) => {
  const key = String(
    a?.url || a?.s3Url || a?.key || a?.id || `${a?.name || a?.fileName || ""}`
  );
  if (!key) return true;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});


  // show a delete button ONLY for student-authored posts by me
  const canDelete = post.authorType === "student" && post.author === (currentUser?.name || "");

  return (
    <div className={`rounded-2xl border bg-white p-4 ${isHighlighted ? "border-amber-400 ring-2 ring-amber-300" : "border-slate-100"}`}>
      <div className="flex items-center gap-3">
        <Avatar size="md" url={post.authorPhoto} name={post.author}/>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold text-slate-900 truncate">{post.author}</div>
            {post.authorType === "lecturer" && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold
                           rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200"
                title="Post by a lecturer"
              >
                🎓 Lecturer
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {(post.authorProgram||post.type)} • {post.time || ""} • {post.audience==="GLOBAL"?"Public":post.audience?.startsWith("FACULTY__")?"Faculty":"Program"}
          </div>
        </div>

        <span className="ml-auto text-xs rounded-full border border-slate-100 px-2 py-0.5">{post.type}</span>

        {/* NEW: delete control (student can delete own posts) */}
        {canDelete && (
          <button
            onClick={() => onDeletePost?.(post.id)}
            className="ml-2 text-xs rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 hover:bg-red-100"
            title="Delete this post"
          >
            Delete
          </button>
        )}
      </div>

      {post.title && (
        <h3 className="mt-3 text-base md:text-lg font-semibold text-slate-900">
          {post.title}
        </h3>
      )}

      {/* Body (notes/announcement/etc.) */}
      {post.html && <ExpandableHtml html={post.html}/>}

      {/* NEW: Video post from lecturer (render like LinkedIn embed) */}
      {post.type === "Video" && post.videoUrlOrId && (
        <div className="mt-3">
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-100">
            <YouTubeEmbed idOrUrl={post.videoUrlOrId} title={post.title || "Video"} />
          </div>
        </div>
      )}

      {/* Academic Books: show small cover that enlarges on click (cover carried in images[0]) */}
      {post.type === "Academic Books" && images.length > 0 && (
        <div className="mt-3">
          <ImageGrid
            images={images}
            onOpen={(idx)=>openLightbox(images, idx)}
            max={1}
            tileClass="h-48"
            withArrows={false}
          />
        </div>
      )}

      {/* post images (general) */}
      {post.type !== "Academic Books" && images.length>0 && (
        <div className="mt-3">
          <ImageGrid
            images={images}
            onOpen={(idx)=>openLightbox(images, idx)}
            max={3}
            tileClass="h-40"
            withArrows
          />
        </div>
      )}

      {/* Lightbox */}
      {lightbox.open && (
        <div
          /*className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"*/
          className="fixed left-0 right-0 bottom-0 top-[145px] z-[9999] bg-black/70 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-6xl w-full pointer-events-auto"
            onClick={stop}
            onMouseDown={stop}
          >
            <AttachmentImage
              key={lightbox.items[lightbox.index]?.id || lightbox.index}
              att={lightbox.items[lightbox.index]}
              enlarge
              /*className="w-full max-h-[88vh] object-contain rounded"*/
              className="w-full max-h-[calc(100vh-165px)] object-contain rounded"
            />

            {/* Close */}
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white rounded-full px-2 py-1 text-sm shadow z-10"
              onClick={(e)=>{ stop(e); closeLightbox(); }}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Prev/Next */}
            {lightbox.items.length>1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10"
                  onClick={(e)=>{ stop(e); step(-1); }}
                  aria-label="Previous"
                  title="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10"
                  onClick={(e)=>{ stop(e); step(1); }}
                  aria-label="Next"
                  title="Next"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Files (downloadable) */}
{files.length > 0 && (
  <ul className="mt-2 text-sm text-slate-700 space-y-1">
    {files.map((f, i) => (
      <li key={`${(f.id || f.name || "f")}-${i}`} className="flex items-center gap-2">
        📎 <AttachmentLink att={f} />
      </li>
    ))}
  </ul>
)}

     <div className="mt-3 flex items-center gap-6 text-sm text-slate-600">
        <button onClick={onToggleLike} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill={post.liked?"currentColor":"none"} stroke="currentColor"><path d="M10 17l-1.45-1.32C4.4 11.36 2 9.28 2 6.5 2 4.5 3.5 3 5.5 3c1.54 0 2.99.99 3.57 2.36h1.86C11.51 3.99 12.96 3 14.5 3 16.5 3 18 4.5 18 6.5c0 2.78-2.4 4.86-6.55 9.18L10 17z"/></svg>
          Like {post.likes>0 && <span className="text-slate-500">({post.likes})</span>}
        </button>
        <button onClick={()=>setShowComments(s=>!s)} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
          💬 Comment {post.comments?.length>0 && <span className="text-slate-500">({post.comments.length})</span>}
        </button>
        <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">↗ Share</button>
        {/* ✅ ADD THIS */}
  <button
    type="button"
    onClick={onReport}
    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
    title="Report this post"
  >
    🚩 Report
  </button>

      </div>

      {showComments && (
        <div className="mt-3 space-y-3">
          {(Array.isArray(post.comments) ? post.comments : []).map((c, index) => (
  <CommentThread
    key={c?.id || `${post.id}-comment-${index}`}
    comment={c}
    onAddReply={(text, images, files) => onAddReply(c?.id, text, images, files)}
    onOpenLightbox={(items, idx) => openLightbox(items, idx)}
  />
))}

          {/* comment composer with attachments */}
          <form
            /*onSubmit={(e)=>{e.preventDefault(); onAddComment(cmt, cmtImages, cmtFiles); setCmt(""); setCmtImages([]); setCmtFiles([]);}}*/
            onSubmit={(e)=>{ 
  e.preventDefault(); 
  const text = (cmt || "").replace(/\r\n/g, "\n"); // keep newlines
  onAddComment(text, cmtImages, cmtFiles);
  setCmt(""); setCmtImages([]); setCmtFiles([]); 
}}
            className="flex flex-col gap-2"
          >
            <div className="flex items-start gap-2">
              <Avatar size="sm" url={currentUser?.photoUrl} name={currentUser?.name || "Me"} online />
              


              <textarea
  ref={(el) => el && autosize(el)}
  value={cmt}
  onChange={(e) => {
    setCmt(e.target.value);
    autosize(e.target);
  }}
  onPaste={async (e) => {
    try {
      const did = await pasteClipboardImagesToState(e, {
        setImages: setCmtImages,
        max: 5,
      });
      if (did) return;
    } catch (err) {
      console.error("[comment paste] failed:", err);
    }
  }}
  placeholder="Write a comment/feedback…"
  rows={1}
  className="flex-1 border border-slate-100 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-5 whitespace-pre-wrap break-words"
  style={{ minHeight: 40, maxHeight: 150 }}
/>


              <label className="text-xs px-2 py-1 border border-slate-100 rounded cursor-pointer">📷
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPickCmtImages}/>
              </label>
              <label className="text-xs px-2 py-1 border border-slate-100 rounded cursor-pointer">📎
                <input type="file" multiple className="hidden" onChange={onPickCmtDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
              </label>
              <button type="submit" className="rounded-full bg-purple-600 text-white px-4 py-1 text-sm font-semibold hover:bg-purple-700">Post</button>
            </div>

            {(cmtImages.length>0 || cmtFiles.length>0) && (
              <div className="pl-10 space-y-2">
                {cmtImages.length>0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {cmtImages.map((img,i)=>(<img key={i} src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover rounded" />))}
                  </div>
                )}
                {cmtFiles.length>0 && (
                  <ul className="text-sm space-y-1">
                    {cmtFiles.map((f,i)=>(<li key={i} className="flex items-center gap-2">📎 <span>{f.name}</span></li>))}
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

/* ================= Presence (safe shim) ================= */
function startPresenceHeartbeat(me, intervalMs = 60000) {
  // If you already have a real heartbeat elsewhere, this harmless shim will be replaced.
  const id = setInterval(() => {}, intervalMs);
  return () => clearInterval(id);
}

/* ================= Auth store shim ======================
   One canonical place for email/password so Change Password,
   Change Email, and Forgot Password all stay in sync. */
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
// Expose a helper so AccountSecurityCard / Forgot screen can update canonically
window.setAuthRecordForStudent = ({ userId, email, password }) => {
  const updated = setAuthRecord(userId, { ...(email ? { email } : {}), ...(password ? { password } : {}) });
  if (email) {
    window.dispatchEvent(new CustomEvent("auth:emailChanged", { detail: { userId, email: updated.email } }));
  }
  if (password) {
    window.dispatchEvent(new CustomEvent("auth:passwordChanged", { detail: { userId } }));
  }
};

/* ================= Programs loader adapter (split data safe) ================= */
function getProgramsSafe(continent, country, university, faculty, fallbackProgram) {
  try {
    const arr = getPrograms?.(continent, country, university, faculty);
    if (Array.isArray(arr) && arr.length) return arr;
  } catch {}
  // Fallback: try a cached per-continent dataset you may have loaded at login
  const cache = safeParse(localStorage.getItem("eduDataByContinent")) || {};
  const cont = (continent || "").trim();
  const cn = (country || "").trim();
  const uni = (university || "").trim();
  const fac = (faculty || "").trim();
  const list =
    cache?.[cont]?.[cn]?.[uni]?.[fac]?.programs ||
    cache?.[cont]?.[cn]?.[uni]?.programs ||
    cache?.[cont]?.[cn]?.programs ||
    [];
  if (Array.isArray(list) && list.length) return list;
  return [fallbackProgram].filter(Boolean);
}



/* ================= make comment/reply attachments URL-based (CloudFront), never base64 ================= */
function guessMime(name = "", fallback = "application/octet-stream") {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".ppt") || n.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (n.endsWith(".doc") || n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return fallback;
}

/*function dataUrlToFile(dataUrl, fileName, mimeFallback) {
  const blob = dataURLtoBlob(dataUrl);
  const mime = blob.type || mimeFallback || "application/octet-stream";
  return new File([blob], fileName || "file", { type: mime });
}*/
async function dataUrlToFile(dataUrl, fileName, mimeFallback) {
  const blob = dataURLtoBlob(dataUrl);
  const mime = blob.type || mimeFallback || "application/octet-stream";

  if (mime.startsWith("image/")) {
    const originalFile = new File([blob], fileName || "image", { type: mime });

    return await convertImageFileToWebP(originalFile, {
      maxW: 1600,
      maxH: 1600,
      quality: 0.8,
      fileName: fileName || "image",
    });
  }

  return new File([blob], fileName || "file", { type: mime });
}


async function uploadDescsToCloudFront(imgDescs = [], fileDescs = []) {
  const upImgs = [];
  const upFiles = [];

  // images
  for (const img of (imgDescs || [])) {
    if (!img) continue;

    // already url-based
    if (img.url || img.s3Url) {
      upImgs.push({
        ...img,
        url: img.url || img.s3Url,
        dataUrl: undefined,
      });
      continue;
    }

    if (img.dataUrl) {
      const file = await dataUrlToFile(
        img.dataUrl,
        img.name || "image.jpg",
        img.mime || "image/jpeg"
      );

      const url = await uploadToCloudFront({
        file,
        folder: "comment-images",
      });

      upImgs.push({
        id: img.id || url,
        name: file.name || img.name || "image.webp",
        mime: file.type || "image/webp",
        url,
      });
    }
  }

  // files
  for (const f of (fileDescs || [])) {
    if (!f) continue;

    // already url-based
    if (f.url || f.s3Url) {
      upFiles.push({
        ...f,
        url: f.url || f.s3Url,
        dataUrl: undefined,
      });
      continue;
    }

    if (f.dataUrl) {
      const mime = f.mime || guessMime(f.name);
      const file = await dataUrlToFile(
        f.dataUrl,
        f.name || "file",
        mime
      );

      const url = await uploadToCloudFront({
        file,
        folder: "comment-files",
      });

      upFiles.push({
        id: f.id || url,
        name: file.name || f.name || "file",
        mime: file.type || mime,
        url,
      });
    }
  }

  return { upImgs, upFiles };
}













// ✅ put helper here (top-level)
function formatTimeAgo(input) {
  const t = typeof input === "number" ? input : Date.parse(input || "") || Date.now();
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 60) return "Just now";
  if (min < 60) return `${min}m`;
  if (hr  < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;
  return new Date(t).toLocaleDateString();
}


/* ================== AI-BLOCK ================== */
const AI_BASE = (import.meta.env.VITE_AI_API_BASE || "").replace(/\/+$/, "");

async function callAssistAI(action, text) {
  const res = await fetch(`${AI_BASE}/api/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, text }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "AI request failed");
  }

  return String(data?.result || "");
}

function sanitizeSimpleAiHtml(html = "") {
  return String(html || "")
    .replace(/<(?!\/?(p|strong|br|ul|li)\b)[^>]*>/gi, "")
    .trim();
}

function splitTextIntoChunks(text = "", maxChars = 3500) {
  const clean = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;

    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = para;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}

async function callAssistAIChunked(action, text) {
  const source = String(text || "").trim();
  if (!source) return "";

  const chunks = splitTextIntoChunks(source, 3500);

  if (chunks.length <= 1) {
    return await callAssistAI(action, source);
  }

  const results = [];
  for (const chunk of chunks) {
    const part = await callAssistAI(action, chunk);
    results.push(String(part || "").trim());
  }

  return results.join("\n\n");
}


/* ================== MAIN ================== */
export default function StudentDashboard() {
  const navigate = useNavigate();
  useNoIndex();


  // ✅ Read ?editProfile=1 from the URL on every render (no extra state)
  const [searchParams] = useSearchParams();
  const editProfile = searchParams.get("editProfile") === "1";

  const current = JSON.parse(
    sessionStorage.getItem("currentUser") ||
    localStorage.getItem("currentUser") ||
    "{}"
  );

  // ✅ ADD IT HERE (with other useState/useMemo)
  const REPORT_REASONS = [
    "Scam",
    "Harassment",
    "Sexual content",
    "Hate",
    "Misinformation",
    "Copyright",
    "Other",
  ];

  const [reportModal, setReportModal] = useState({
    open: false,
    payload: null, // { itemType, itemId, postId, commentId, replyId }
    reason: "Scam",
    details: "",
  });

  

  // ===================== Profile sync (banner/avatar) =====================
  // Uses the same API host you already use for auth/users.
  // If you have a dedicated base for auth, put it in VITE_POSTS_API_BASE or VITE_CONTACTS_API_BASE.
  const RAW_API_BASE =
    (import.meta.env.VITE_POSTS_API_BASE && String(import.meta.env.VITE_POSTS_API_BASE).trim()) ||
    (import.meta.env.VITE_CONTACTS_API_BASE && String(import.meta.env.VITE_CONTACTS_API_BASE).trim()) ||
    "";

  const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
  // DEBUG (safe): confirm env base + final base
console.log("[StudentDashboard] RAW_API_BASE =", RAW_API_BASE);
console.log("[StudentDashboard] API_BASE =", API_BASE);

  // Update ONLY bannerUrl/photoUrl for the logged-in user on the server
  async function patchMyProfileOnServer(patch) {
  const email = (current?.email || user?.email || "").trim();

  // Step A: prove we have what we need
  console.log("[StudentDashboard] patchMyProfileOnServer() called", {
    hasAPIBase: !!API_BASE,
    API_BASE,
    email,
    patchKeys: patch ? Object.keys(patch) : [],
  });

  if (!API_BASE || !email) {
    console.warn("[StudentDashboard] patchMyProfileOnServer() aborted (missing API_BASE or email)", {
      API_BASE,
      email,
    });
    return null;
  }

  const url = `${API_BASE}/api/auth/student/update-profile`;
  console.log("[StudentDashboard] update-profile URL:", url);
  console.log("[StudentDashboard] update-profile payload preview:", {
    email,
    ...patch,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ...patch }),
  });

  // Step A: log raw response (helps catch HTML error pages, 502s, CORS, etc.)
  const rawText = await res.text().catch(() => "");
  console.log("[StudentDashboard] update-profile response:", {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    rawTextPreview: String(rawText || "").slice(0, 300),
  });

  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch (e) {
    console.warn("[StudentDashboard] update-profile non-JSON response (this is important):", e);
  }

  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || "update-profile failed");
  }

  return (data && (data.user || data)) || null;
}

  // Pull the latest profile from server when dashboard loads (for cross-device sync)
 async function fetchMyProfileFromServer() {
  const email = (current?.email || user?.email || "").trim();

  console.log("[StudentDashboard] get-profile email =", email);
  console.log("[StudentDashboard] get-profile url =", `${API_BASE}/api/auth/student/get-profile`);

  if (!API_BASE || !email) return null;

  const res = await fetch(`${API_BASE}/api/auth/student/get-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  console.log("[StudentDashboard] get-profile status =", res.status);

  const data = await res.json().catch(() => ({}));
  console.log("[StudentDashboard] get-profile response =", data);

  // keep your existing return line exactly as you have it
  return data?.user || data?.data?.user || null;
}

  const [user,setUser] = useState(()=>{
    const raw = loadActiveUser();
    const merged = { ...initialUser, ...(raw||{}) };
    merged.country = normalizeCountry(merged.country || "");
    merged.countryCode = ensureCountryCode(merged.country, merged.countryCode);
    return merged;
  });

   // ✅ ADD THIS RIGHT HERE (after user exists)
  const scopeKey =
  `${user?.university || ""}#${user?.faculty || ""}`.toLowerCase();


  // Presence heartbeat
  useEffect(() => {
    const raw = localStorage.getItem("currentUser");
    const me = raw ? JSON.parse(raw) : null;
    if (!me?.uid && !me?.id) return;
    const stop = startPresenceHeartbeat(me, 60000);
    return () => stop();
  }, []);

  // react to cross-tab changes
  useEffect(()=>{
    const onStorage = ()=>{
      const raw = loadActiveUser();
      if (!raw) return;
      const merged = { ...initialUser, ...raw };
      merged.country = normalizeCountry(merged.country || "");
      merged.countryCode = ensureCountryCode(merged.country, merged.countryCode);
      setUser(merged);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  },[]);

  // react to intra-tab user updates
  useEffect(()=>{
    const onUserUpdated = ()=>{
      const raw = loadActiveUser();
      if (!raw) return;
      const merged = { ...initialUser, ...raw };
      merged.country = normalizeCountry(merged.country || "");
      merged.countryCode = ensureCountryCode(merged.country, merged.countryCode);
      setUser(merged);
    };
    window.addEventListener("user:updated", onUserUpdated);
    return () => window.removeEventListener("user:updated", onUserUpdated);
  },[]);

  // Keep user email/password consistent when AccountSecurityCard / Forgot flow updates them
  useEffect(() => {
    const syncEmail = (e) => {
      const { userId, email } = e.detail || {};
      if (!userId || !email) return;
      // mirror into currentUser + users/+usersById
      const next = { ...user, email };
      // persist and broadcast (keeps flag derivation stable)
      next.country = normalizeCountry(next.country || "");
      next.countryCode = ensureCountryCode(next.country, next.countryCode);
      setUser(next);
      saveAndBroadcastUser(next);
    };
    const syncPassword = (_e) => {
      // no UI change needed; password lives in auth store
    };
    window.addEventListener("auth:emailChanged", syncEmail);
    window.addEventListener("auth:passwordChanged", syncPassword);
    window.addEventListener("auth:passwordReset", syncPassword);
    return () => {
      window.removeEventListener("auth:emailChanged", syncEmail);
      window.removeEventListener("auth:passwordChanged", syncPassword);
      window.removeEventListener("auth:passwordReset", syncPassword);
    };
  }, [user]);



  // ✅ On first load, refresh profile from server (makes banner/avatar global across devices)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchMyProfileFromServer();
        if (cancelled || !remote) return;

        // Only merge profile fields we care about (avoid disturbing other local logic)
        const merged = {
          ...user,
          bannerUrl: remote.bannerUrl ?? user.bannerUrl,
          photoUrl: remote.photoUrl ?? user.photoUrl,
        };

        setUser(merged);
        saveAndBroadcastUser(merged);
      } catch (e) {
        // Don’t break the page if server is unavailable
        console.warn("[StudentDashboard] fetchMyProfileFromServer failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Unread responses from lecturers (for the Contact card badge)
  const [unreadLecturerResponses, setUnreadLecturerResponses] = useState(0);
  useEffect(() => {
    const meRaw = localStorage.getItem("currentUser");
    const me = meRaw ? JSON.parse(meRaw) : null;
    if (!me?.id) return;
    const recompute = () => {
      try { setUnreadLecturerResponses(computeUnreadForStudent(me.id)); } catch {}
    };
    const onFocus = () => recompute();
    const onVisibility = () => { if (document.visibilityState === "visible") recompute(); };
    recompute();
    window.addEventListener("storage", recompute);
    window.addEventListener("contact:updated", recompute);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", recompute);
      window.removeEventListener("contact:updated", recompute);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // ===== Consent wiring (hooks)
  const { id: consentStudentId, email: consentEmail } = consentGetIdentity();
  const [consentState, setConsentState] = useState(() => consentLoadFor(consentStudentId, consentEmail) );
  useEffect(() => { setConsentState(consentLoadFor(consentStudentId, consentEmail)); }, [consentStudentId, consentEmail]);
  useEffect(() => {
    const keyFromLabelText = (text) => {
      const s = (text || "").toLowerCase();
      if (s.includes("scholarship")) return "scholarshipAlerts";
      if (s.includes("application tips") || s.includes("tips")) return "applicationTips";
      if (s.includes("program recommendation") || s.includes("recommendation")) return "programRecommendations";
      if (s.includes("invitation")) return "applicationInvitation";
      return null;
    };
    const findLabelText = (input) => {
      const
       label = input.closest("label"); if (label) return label.textContent || label.innerText || "";
      const id = input.getAttribute("id");
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) return lbl.textContent || lbl.innerText || "";
      }
      return "";
    };
    const onChange = (e) => {
      const t = e.target;
      if (!(t && t.matches && t.matches('input[type="checkbox"]'))) return;
      const explicitKey = t.getAttribute("data-consent-key");
      const labelText = findLabelText(t);
      const inferredKey = explicitKey || keyFromLabelText(labelText);
      if (!inferredKey) return;
      const next = { ...consentState, [inferredKey]: !!t.checked };
      const saved = consentPersistFor(consentStudentId, consentEmail, next);
      setConsentState(saved);
    };
    document.addEventListener("change", onChange, true);
    return () => document.removeEventListener("change", onChange, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentStudentId, consentEmail, consentState]);

// ===== Video posts saved by admin (right column) — load from backend ONLY
const [videoPosts, setVideoPosts] = useState([]);

useEffect(() => {
  let cancelled = false;

  async function loadAdminVideos() {
    try {
      const remote = await fetchPosts({
        scope: "admin-video-posts",
        role: "student",
      });

      if (cancelled) return;

      const vids = (remote || [])
        .filter(
          (p) =>
            p &&
            (p.type === "Video" || String(p.type || "").toLowerCase() === "video")
        )
        .map((p) => ({
          ...p,
          createdAt: p.createdAt ?? p.created_at ?? p.timestamp ?? 0,
        }))
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

      setVideoPosts(vids);
    } catch (e) {
      console.warn("[StudentDashboard] loadAdminVideos failed", e);
      setVideoPosts([]);
    }
  }

  loadAdminVideos();

  // optional refresh
  const t = setInterval(loadAdminVideos, 60_000);

  return () => {
    cancelled = true;
    clearInterval(t);
  };
}, []);

  const visibleVideos = useMemo(() => {
  const meCont = (user?.continent || "").trim().toLowerCase();
  return (videoPosts || [])
    /*.filter(p => p && p.type === "video")*/
    .filter(p => p && String(p.type || "").toLowerCase() === "video")
    .filter(p => {
      const audience = (p.audience || "students").toLowerCase();
      const includesStudents = audience === "students" || audience === "both";
      if (!includesStudents) return false;
      const va = p.videoAudience || { scope: "all" };
      if (va.scope === "continent") {
        const list = Array.isArray(va.continents) ? va.continents : [];
        const hasMe = list.some(c => (c || "").trim().toLowerCase() === meCont);
        return hasMe;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}, [videoPosts, user?.continent]);

// ✅ ADD THIS: state for latestVideo
const latestVideo = visibleVideos[0] || null;
  const audKey = audienceKey(user);
  const baseFac = `FACULTY__${user.university}__${user.faculty}`;
  const facYearKey = `${baseFac}__${user.year}`;
  const ts = (v) => (typeof v === "number" ? v : Date.parse(v) || 0);

  // Human-readable "time ago" label for posts
  // ===== Seeded posts (DISABLED)
// Keep this variable so nothing else breaks, but it returns an empty array.
const seeded = useMemo(() => [], []);

// Posts state: prefer localStorage if present, otherwise start empty (NOT seeded)
const [posts, setPosts] = useState(() => {
  const stored = safeParse(localStorage.getItem("posts"));
  return stored && Array.isArray(stored) ? stored : [];
});


  /* ⬇️⬇️ PASTE THIS BLOCK RIGHT HERE ⬇️⬇️ */

// Normalize reply objects coming from backend into the shape the UI expects
function findUserByIdentity({ authorId, author, email }) {
  const safe = (j) => { try { return JSON.parse(j || ""); } catch { return null; } };

  const byId = safe(localStorage.getItem("usersById")) || {};
  if (authorId && byId[authorId]) return byId[authorId];

  const arr = safe(localStorage.getItem("users")) || [];
  const nameNorm = (author || "").trim().toLowerCase();
  const emailNorm = (email || "").trim().toLowerCase();

  for (const u of arr) {
    if (!u) continue;

    const ids = [u.id, u.uid, u.userId, u.studentId].filter(Boolean);
    if (authorId && ids.includes(authorId)) return u;

    const uName = String(u.name || u.fullName || "").trim().toLowerCase();
    if (nameNorm && uName === nameNorm) return u;

    const uEmail = String(u.email || u.username || "").trim().toLowerCase();
    if (emailNorm && uEmail === emailNorm) return u;
  }
  return null;
}

// Normalize reply objects coming from backend into the shape the UI expects
function normalizeReplyFromBackend(r) {
  if (!r) return null;

  const authorId =
    r.authorId || r.userId || r.uid || r.studentId || "";

  const author =
    r.author ||
    r.authorName ||
    r.name ||
    "";

  const email =
    r.email ||
    r.authorEmail ||
    "";

  // Try to recover extra info from local user store
  const fallbackUser = findUserByIdentity({ authorId, author, email }) || {};

  const authorProgram =
    r.authorProgram ||
    r.programName ||
    r.program ||
    fallbackUser.program ||
    fallbackUser.faculty ||
    "";

  const authorPhoto =
    r.authorPhoto ||
    r.authorAvatarUrl ||
    r.avatarUrl ||
    r.photoUrl ||
    r.profilePhotoUrl ||
    fallbackUser.photoUrl ||
    fallbackUser.avatarUrl ||
    fallbackUser.profileImageUrl ||
    "";

  // 🔹 Attachments on the reply/comment itself
  const atts = Array.isArray(r.attachments) ? r.attachments : [];

  const imagesFromAtts = atts
    .filter(a => (a.type || "").toLowerCase() === "image")
    .map(a => ({
      id: a.key || a.url,
      name: a.fileName || a.name || "image",
      mime: a.mime || "image/*",
      url: a.url || a.s3Url || null,
    }));

  const filesFromAtts = atts
    .filter(a => (a.type || "").toLowerCase() !== "image")
    .map(a => ({
      id: a.key || a.url,
      name: a.fileName || a.name || "file",
      mime: a.mime || "application/octet-stream",
      url: a.url || a.s3Url || null,
    }));

  // Prefer explicit images/files arrays if backend already provided them,
  // otherwise derive them from attachments.
  const images =
    Array.isArray(r.images) && r.images.length ? r.images : imagesFromAtts;

  const files =
    Array.isArray(r.files) && r.files.length ? r.files : filesFromAtts;

  return {
    ...r,
    authorId,
    author,
    authorProgram,
    authorPhoto,
    images,
    files,
  };
}

// Normalize comments (which can contain replies)
function normalizeCommentFromBackend(c) {
  if (!c) return null;

  const base = normalizeReplyFromBackend(c);
  const replies = Array.isArray(c.replies)
    ? c.replies.map(normalizeReplyFromBackend).filter(Boolean)
    : [];

  return { ...base, replies };
}

  // 🔄 Load posts from backend API (global feed for student dashboard)
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  // ✅ Show sidebar ads only when the feed has enough real content
const showSidebarAds = !feedLoading && ((posts?.length || 0) >= 3);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;

    // silent = false → show spinner/error
    // silent = true  → background refresh (no spinner)
    async function loadFromApi({ silent = false } = {}) {
      if (!silent) {
        setFeedLoading(true);
        setFeedError("");
      }

      try {
        // Only posts for this dashboard
        const remote = await fetchPosts({
          scope: "student-dashboard",
          role: "student",
        });

        if (cancelled) return;

        //const mapped = (remote || []).map((r) => {
          //if (!r || typeof r !== "object") return r;



          const mapped = dedupeById(
  (remote || [])
    .filter((r) => r && typeof r === "object")
    .map((r) => {
      // ✅ Normalize ID first (prevents duplicate keys / missing ids)
      const id = r.id || r.postId || r._id || r.key || r.pk || r.sk;

      // ✅ Normalize timestamps (IMPORTANT: never Date.now() for remote posts)
      const createdAt =
        r.createdAt ??
        r.created_at ??
        r.timestamp ??
        (typeof r.time === "number" ? r.time : undefined) ??
        0;

      // ✅ Normalize post attachments (merge, do NOT overwrite r.files)
      const atts = Array.isArray(r.attachments) ? r.attachments : [];

      const attImages = atts
        .filter((a) => (a.type || "").toLowerCase() === "image")
        .map((a) => ({
          id: a.key || a.url,
          name: a.fileName || a.name || "image",
          mime: a.mime || "image/*",
          url: a.url || a.s3Url || null,
        }));

      const attFiles = atts
        .filter((a) => (a.type || "").toLowerCase() !== "image")
        .map((a) => ({
          id: a.key || a.url,
          name: a.fileName || a.name || "file",
          mime: a.mime || "application/octet-stream",
          url: a.url || a.s3Url || null,
        }));

      const rawImages = Array.isArray(r.images) ? r.images : [];
      const rawFiles = Array.isArray(r.files) ? r.files : [];

      const normImages = rawImages.map((img) => ({
        id: img.id || img.key || img.url,
        name: img.name || img.fileName || "image",
        mime: img.mime || "image/*",
        url: img.url || img.s3Url || null,
      }));

      const normFiles = rawFiles.map((f) => ({
        id: f.id || f.key || f.url,
        name: f.name || f.fileName || "file",
        mime: f.mime || "application/octet-stream",
        url: f.url || f.s3Url || null,
      }));

      const dedupeAtts = (arr) => {
        const seen = new Set();
        const out = [];
        for (const x of arr) {
          const k = x?.id || x?.url || `${x?.name}-${x?.mime}`;
          if (!k || seen.has(k)) continue;
          seen.add(k);
          out.push(x);
        }
        return out;
      };

      const images = dedupeAtts([...attImages, ...normImages]);
      const files = dedupeAtts([...attFiles, ...normFiles]);

      // ✅ Normalize comments + replies using YOUR helpers you pasted above
      const comments = dedupeById(
        (Array.isArray(r.comments) ? r.comments : [])
          .map(normalizeCommentFromBackend)
          .filter(Boolean)
          .map((c) => ({
            ...c,
            replies: dedupeById(Array.isArray(c.replies) ? c.replies : []),
          }))
      );

      return {
        ...r,
        id,                      // ✅ ensure id exists + consistent
        createdAt,
        time: r.time || (createdAt ? formatTimeAgo(createdAt) : ""), // stable label
        images,
        files,
        comments,
        fromBackend: true,
      };
    })
);

        // Merge backend posts + any local `seeded`/existing posts (dedupe by id)
        setPosts((prev) => {
  const prevArr = Array.isArray(prev) ? prev : [];

  // quick lookup of what server returned this round
  const remoteIds = new Set(
    (mapped || [])
      .map((p) => p && p.id)
      .filter(Boolean)
  );

  // previous posts by id (to preserve local like state, etc.)
  const prevById = new Map();
  for (const p of prevArr) {
    if (p && p.id) prevById.set(p.id, p);
  }

  const byId = new Map();

  // helper: stable fallback id for posts that somehow have no id
  const stableFallbackId = (p) => {
    const a = String(p?.authorId || p?.author || "");
    const t = String(p?.title || "");
    const c = String(p?.createdAt || p?.time || "");
    return `noid_${a}_${c}_${t}`.slice(0, 180);
  };

  const now = Date.now();
  const GRACE_MS = 90_000; // 90s grace for server propagation

  // 1) Server posts (authoritative)
  for (const p of mapped || []) {
    if (!p) continue;

    const id = p.id || stableFallbackId(p);
    const existing = prevById.get(id) || null;

    const backendComments = Array.isArray(p.comments) ? p.comments : null;
    const existingComments =
      existing && Array.isArray(existing.comments) ? existing.comments : null;

    const merged = {
      ...existing,     // keep any local-only fields we already had
      ...p,            // then overwrite with server truth
      id,
      fromBackend: true,

      // keep local like state if present
      likes:
        typeof existing?.likes === "number"
          ? existing.likes
          : (p.likes || 0),
      liked:
        typeof existing?.liked === "boolean"
          ? existing.liked
          : !!p.liked,

      // comments/replies prefer backend when present
      comments: backendComments ?? existingComments ?? [],
    };

    byId.set(id, merged);
  }

  // 2) Keep local-only posts AND keep "pending" backend posts that aren't returned yet
  for (const p of prevArr) {
    if (!p) continue;

    const id = p.id || stableFallbackId(p);
    if (byId.has(id)) continue; // already have server version

    const isBackend = !!p.fromBackend;

    if (!isBackend) {
      // purely local post → keep
      byId.set(id, p);
      continue;
    }

    // If it WAS a backend post but server didn't return it this round:
    // keep it for a short grace window (prevents "appears then disappears").
    const createdAt = Number(p.createdAt || 0);
    const stillInGrace = createdAt && (now - createdAt) < GRACE_MS;

    // optional explicit flag if you set it on create success
    const pendingUntil = Number(p.pendingServerUntil || 0);
    const explicitlyPending = pendingUntil > now;

    if (explicitlyPending || stillInGrace) {
      byId.set(id, p);
      continue;
    }

    // otherwise, treat as deleted / no longer valid → do not re-add
  }

  // newest-first
  return Array.from(byId.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
});

      } catch (err) {
        console.error("[StudentDashboard] fetchPosts failed", err);
        if (!silent && !cancelled) {
          setFeedError("Could not load posts from server.");
        }
      } finally {
        if (!silent && !cancelled) {
          setFeedLoading(false);
        }
      }
    }

    // Initial load with spinner
    loadFromApi({ silent: false });

    // Poll every 30 seconds in the background
    pollTimer = setInterval(() => {
      if (!cancelled) {
        loadFromApi({ silent: true });
      }
    }, 30000); // adjust if you want

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []); // run once on mount



  // READ-ONLY: lecturer posts from lecturer portal (if present)
  const [lecturerPosts, setLecturerPosts] = useState(() => {
    const arr = safeParse(localStorage.getItem("lecturerPosts")) || [];
    return Array.isArray(arr) ? arr : [];
  });
  const allPostsForSignals = useMemo(() => {
    const a = Array.isArray(posts) ? posts : [];
    const b = Array.isArray(lecturerPosts) ? lecturerPosts : [];
    const normalizedLect = b.map(p => p.authorType ? p : { ...p, authorType: "lecturer" });
    return [...a, ...normalizedLect].sort((x,y) => (y.createdAt||0) - (x.createdAt||0));
  }, [posts, lecturerPosts]);

  


  useEffect(() => {
    const sync = () => {
      const arr = safeParse(localStorage.getItem("lecturerPosts")) || [];
      setLecturerPosts(Array.isArray(arr) ? arr : []);
    };
    const onStorage = (e) => { if (!e || e.key === "lecturerPosts") sync(); };
    const onUpdated = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("lecturerPosts:updated", onUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("lecturerPosts:updated", onUpdated);
    };
  }, []);

  /* ---- Force-persist helper so lecturer side sees updates immediately ---- */
function persistLecturerPostsNow(arr) {
  try {
    localStorage.setItem("lecturerPosts", JSON.stringify(arr));
    // let other tabs (incl. LecturerDashboard) react instantly
    window.dispatchEvent(new Event("lecturerPosts:updated"));
  } catch (e) {
    // Fallback to lean copy if quota is tight
    try {
      const lean = (arr || []).map(p => ({
  ...p,
  images: (p.images || []).map(img => ({
    id: img.id,
    name: img.name,
    mime: img.mime,
    url: img.url || null,
    thumb: img.thumb || null,
    dataUrl: img.dataUrl || null,
  })),
  files: (p.files || []).map(f => ({
    id: f.id,
    name: f.name,
    mime: f.mime,
    url: f.url || null,
    dataUrl: f.dataUrl || null,
  })),
  comments: (p.comments || []).map(c => ({
    ...c,
    images: (c.images || []).map(img => ({
      id: img.id,
      name: img.name,
      mime: img.mime,
      url: img.url || null,
      thumb: img.thumb || null,
      dataUrl: img.dataUrl || null,
    })),
    files: (c.files || []).map(f => ({
      id: f.id,
      name: f.name,
      mime: f.mime,
      url: f.url || null,
      dataUrl: f.dataUrl || null,
    })),
    replies: (c.replies || []).map(r => ({
      ...r,
      images: (r.images || []).map(img => ({
        id: img.id,
        name: img.name,
        mime: img.mime,
        url: img.url || null,
        thumb: img.thumb || null,
        dataUrl: img.dataUrl || null,
      })),
      files: (r.files || []).map(f => ({
        id: f.id,
        name: f.name,
        mime: f.mime,
        url: f.url || null,
        dataUrl: f.dataUrl || null,
      })),
    })),
  })),
}));
      localStorage.setItem("lecturerPosts", JSON.stringify(lean));
      window.dispatchEvent(new Event("lecturerPosts:updated"));
    } catch {}
  }
}

  // Persist lecturer posts only if they actually changed.
// Also avoid broadcasting an event unless we wrote new data.
useEffect(() => {
  if (window.__skSigningOut) return;
  if (!Array.isArray(lecturerPosts)) return;

  try {
    const nextStr = JSON.stringify(lecturerPosts ?? []);
    const prevStr = localStorage.getItem("lecturerPosts") || "";

    // 🚫 If nothing changed, bail — prevents loops.
    if (prevStr === nextStr) return;

    localStorage.setItem("lecturerPosts", nextStr);
    // Let other tabs/pages know ONLY when we wrote new data
    window.dispatchEvent(new Event("lecturerPosts:updated"));
  } catch (e) {
    // Fallback to a lean copy if quota is tight
    try {
      const lean = (lecturerPosts || []).map(p => ({
        ...p,
        images: (p.images || []).map(img => ({
          id: img.id,
          name: img.name,
          mime: img.mime,
          url: img.url || null,
          thumb: img.thumb || null,
          dataUrl: img.dataUrl || null,
        })),
        files: (p.files || []).map(f => ({
          id: f.id,
          name: f.name,
          mime: f.mime,
          url: f.url || null,
          dataUrl: f.dataUrl || null,
        })),
        comments: (p.comments || []).map(c => ({
          ...c,
          images: (c.images || []).map(img => ({
            id: img.id,
            name: img.name,
            mime: img.mime,
            url: img.url || null,
            thumb: img.thumb || null,
            dataUrl: img.dataUrl || null,
          })),
          files: (c.files || []).map(f => ({
            id: f.id,
            name: f.name,
            mime: f.mime,
            url: f.url || null,
            dataUrl: f.dataUrl || null,
          })),
          replies: (c.replies || []).map(r => ({
            ...r,
            images: (r.images || []).map(img => ({
              id: img.id,
              name: img.name,
              mime: img.mime,
              url: img.url || null,
              thumb: img.thumb || null,
              dataUrl: img.dataUrl || null,
            })),
            files: (r.files || []).map(f => ({
              id: f.id,
              name: f.name,
              mime: f.mime,
              url: f.url || null,
              dataUrl: f.dataUrl || null,
            })),
          })),
        })),
      }));
      const nextLeanStr = JSON.stringify(lean);
      const prevStr = localStorage.getItem("lecturerPosts") || "";
      if (prevStr === nextLeanStr) return;  // still no real change
      localStorage.setItem("lecturerPosts", nextLeanStr);
      window.dispatchEvent(new Event("lecturerPosts:updated"));
    } catch {
      /* ignore */
    }
  }
}, [lecturerPosts]);





  const [showLecturerOnly,setShowLecturerOnly]=useState(false);
  const [showFacultyOnly,setShowFacultyOnly]=useState(false);
  const [showMineOnly,setShowMineOnly]=useState(false);
  const [filterType,setFilterType]=useState("All");

  // ====== "New" per type tracking (for left sidebar pills)
  const TYPES_SEEN_KEY = `lastSeenTypes_${user.id}`;
  const [lastSeenByType, setLastSeenByType] = useState(()=> safeParse(localStorage.getItem(TYPES_SEEN_KEY)) || {});
  useEffect(()=>{ localStorage.setItem(TYPES_SEEN_KEY, JSON.stringify(lastSeenByType)); },[lastSeenByType]);
  const latestByType = useMemo(()=>{
    const map = {};
    for (const p of posts) {
      const t = p.type || "Notes";
      const when = p.createdAt || 0;
      map[t] = Math.max(map[t] || 0, when);
    }
    return map;
  }, [posts]);
  const markTypeSeen = (t) => setLastSeenByType(prev => ({ ...prev, [t]: latestByType[t] || Date.now() }));

  // persist posts safely
  useEffect(()=>{
    try {
      localStorage.setItem("posts", JSON.stringify(posts));
    } catch (e) {
      try {
        const lean = (posts || []).map(p => ({
        ...p,
        images: (p.images || []).map(img => ({
          id: img.id,
          name: img.name,
          mime: img.mime,
          url: img.url || null,
          thumb: img.thumb || null,
          dataUrl: img.dataUrl || null,
        })),
        files: (p.files || []).map(f => ({
          id: f.id,
          name: f.name,
          mime: f.mime,
          url: f.url || null,
          dataUrl: f.dataUrl || null,
        })),
        comments: (p.comments || []).map(c => ({
          ...c,
          images: (c.images || []).map(img => ({
            id: img.id,
            name: img.name,
            mime: img.mime,
            url: img.url || null,
            thumb: img.thumb || null,
            dataUrl: img.dataUrl || null,
          })),
          files: (c.files || []).map(f => ({
            id: f.id,
            name: f.name,
            mime: f.mime,
            url: f.url || null,
            dataUrl: f.dataUrl || null,
          })),
          replies: (c.replies || []).map(r => ({
            ...r,
            images: (r.images || []).map(img => ({
              id: img.id,
              name: img.name,
              mime: img.mime,
              url: img.url || null,
              thumb: img.thumb || null,
              dataUrl: img.dataUrl || null,
            })),
            files: (r.files || []).map(f => ({
              id: f.id,
              name: f.name,
              mime: f.mime,
              url: f.url || null,
              dataUrl: f.dataUrl || null,
            })),
          })),
        })),
      }));
        localStorage.setItem("posts", JSON.stringify(lean));
      } catch {}
    }
    window.dispatchEvent(new Event("posts:updated"));
  },[posts]);

  // ===== "New" indicators (lecturer/faculty)
  const isForMyFaculty = (aud) => aud === baseFac || aud === `${baseFac}__${user.year}`;
  const latestFacTs = useMemo(()=>{
    let max = 0;
    posts.forEach(p=>{ if (isForMyFaculty(p.audience)) max = Math.max(max, p.createdAt || 0); });
    return max;
  },[posts, user.university, user.faculty, user.year]);

  const FAC_NEW_KEY = `lastSeenFaculty_${user.id}`;
  const [lastSeenFacTs, setLastSeenFacTs] = useState(()=> Number(localStorage.getItem(FAC_NEW_KEY) || 0));
  useEffect(()=>{ localStorage.setItem(FAC_NEW_KEY, String(lastSeenFacTs||0)); },[lastSeenFacTs]);

  const hasNewFacultyPosts = latestFacTs > lastSeenFacTs;
  const [hasNewLecturer, setHasNewLecturer] = useState(false);
  const [hasNewFacultySignal, setHasNewFacultySignal] = useState(false);
  const computeNewFlags = () => {
    const ns = safeParse(localStorage.getItem("newSignals")) || {};
    const progLect = (ns[audKey]?.lecturer || 0) > 0;
    const facLect = (ns[`${baseFac}__${user.year}`]?.lecturer || 0) > 0 || (ns[baseFac]?.lecturer || 0) > 0;
    setHasNewLecturer(progLect || facLect);
    setHasNewFacultySignal(facLect);
  };
  useEffect(() => {
    computeNewFlags();
    const onStorage = (e) => { if (!e || e.key === "newSignals" || e.key === "posts") computeNewFlags(); };
    const onUpdated = () => computeNewFlags();
    window.addEventListener("storage", onStorage);
    window.addEventListener("posts:updated", onUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("posts:updated", onUpdated);
    };
  }, [audKey, user.year, baseFac]);

  const onToggleLecturerOnly = () => {
    setShowLecturerOnly(v => {
      const next = !v;
      if (next) {
        const ns = safeParse(localStorage.getItem("newSignals")) || {};
        if (ns[audKey]) ns[audKey].lecturer = 0;
        if (ns[`${baseFac}__${user.year}`]) ns[`${baseFac}__${user.year}`].lecturer = 0;
        if (ns[baseFac]) ns[baseFac].lecturer = 0;
        localStorage.setItem("newSignals", JSON.stringify(ns));
        setHasNewLecturer(false);
      }
      return next;
    });
  };
  const onToggleFacultyOnly = () => {
    setShowFacultyOnly(v => {
      const next = !v;
      if (next) {
        setLastSeenFacTs(latestFacTs || Date.now());
        const ns = safeParse(localStorage.getItem("newSignals")) || {};
        if (ns[`${baseFac}__${user.year}`]) ns[`${baseFac}__${user.year}`].lecturer = 0;
        if (ns[baseFac]) ns[baseFac].lecturer = 0;
        localStorage.setItem("newSignals", JSON.stringify(ns));
        setHasNewFacultySignal(false);
      }
      return next;
    });
  };

  // ===== Idle timer
const [idleWarning, setIdleWarning] = useState(false);
const [countdown, setCountdown] = useState(60);
const idleTimerRef = useRef(null);
const countdownRef = useRef(null);

const logoutEverywhereClientOnly = async () => {
  try {
    [
      "currentUser",
      "authUserId",
      "activeUserId",
      "currentUserId",
      "loggedInUserId",
      "partnerAuth",
      "adminAuth",
    ].forEach((k) => {
      try { sessionStorage.removeItem(k); } catch {}
      try { localStorage.removeItem(k); } catch {}
    });
  } catch {}
  try { window.dispatchEvent(new Event("auth:changed")); } catch {}
};

const handleStudentSignOut = async () => {
  window.__skSigningOut = true;
  try {
    await logoutEverywhereClientOnly();
  } finally {
    navigate("/login?role=student");
  }
};

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

          logoutEverywhereClientOnly()
            .catch(() => {})
            .finally(() => {
              navigate("/login?role=student");
            });

          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, 20 * 60 * 1000);
};

useEffect(() => {
  const bump = () => {
    if (!idleWarning) resetIdleTimer();
  };
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

  /* ===== Banner/Avatar ===== */
  const onPickBanner = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  try {
    const cloudUrl = await uploadToCloudFront({ file, folder: "banners" });

    // ✅ IMPORTANT: persist to server so it's global
    /*await updateMyProfileOnServer({ bannerUrl: cloudUrl });*/
    await patchMyProfileOnServer({ bannerUrl: cloudUrl });

    // update UI
    setUser((u) => ({ ...u, bannerUrl: cloudUrl }));
  } catch (err) {
    console.error(err);
    alert("Banner upload failed. See console.");
  }
};

  const onPickAvatar = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = ""; // so selecting same file again triggers change
  if (!file) return;

  try {
    const cloudUrl = await uploadToCloudFront({ file, folder: "profiles" });

    // ✅ IMPORTANT: persist to server so it's global
    /*await updateMyProfileOnServer({ photoUrl: cloudUrl });*/
    await patchMyProfileOnServer({ photoUrl: cloudUrl });

    // update UI
    setUser((u) => ({ ...u, photoUrl: cloudUrl }));
  } catch (err) {
    console.error(err);
    alert("Avatar upload failed. See console.");
  }
};

  /* ===== Composer ===== */
  const [composerOpen,setComposerOpen]=useState(false);
  const editorRef = useRef(null);
  const [composerType,setComposerType]=useState("Notes");
  const [composerTitle,setComposerTitle] = useState("");
  const [bookTitle, setBookTitle] = useState("");              // NEW: for Academic Books
  const [toFaculty,setToFaculty]=useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState("text"); // "text" | "html"
  // ⬇️ NEW: S3-backed attachments from AttachmentUploader
  // Shape: [{ url, key, fileName, size, mime, type }]
  const [attachments, setAttachments] = useState([]);


  const exec = (cmd, value=null)=>{ document.execCommand(cmd,false,value); editorRef.current?.focus(); };
  const addLink = ()=>{ const url = prompt("Enter URL (include https://)"); if (url) exec("createLink", url); };


const handlePaste = async (e) => {
  try {
    const cb = e.clipboardData || window.clipboardData;

    // 1) If clipboard contains image(s), upload them and add to attachments
    const items = cb?.items ? Array.from(cb.items) : [];
    const imageItems = items.filter((it) => it?.type && it.type.startsWith("image/"));

    if (imageItems.length > 0) {
      e.preventDefault(); // prevent blob/image being inserted into the editor

      for (const it of imageItems) {
        const file = it.getAsFile();
        if (!file) continue;

        // Optional size guard (8MB)
        if (file.size > 8 * 1024 * 1024) {
          alert("Screenshot is too large. Please use an image under 8MB.");
          continue;
        }

        // ✅ Upload using your existing flow (same as AttachmentUploader)
        /*const uploaded = await uploadFileToS3(file);

        const att = {
          url: uploaded.url,
          key: uploaded.key,
          fileName: file.name || "screenshot.png",
          size: file.size,
          mime: file.type,
          type: "image",
        };*/
        const webpFile = await convertImageFileToWebP(file, {
  maxW: 1600,
  maxH: 1600,
  quality: 0.8,
  fileName: file.name || "screenshot",
});

const uploaded = await uploadFileToS3(webpFile);

const att = {
  url: uploaded.url,
  key: uploaded.key,
  fileName: uploaded.fileName || webpFile.name || "screenshot.webp",
  size: typeof uploaded.size === "number" ? uploaded.size : webpFile.size,
  mime: uploaded.contentType || webpFile.type || "image/webp",
  type: "image",
};

        // ✅ This is the SAME attachments state you already submit to the backend
        setAttachments((prev) => [...(Array.isArray(prev) ? prev : []), att]);
      }

      return; // done handling image paste
    }

    // 2) Otherwise: keep your current text paste behavior (paragraph formatting)
    e.preventDefault();

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
  } catch (err) {
    console.error("handlePaste failed:", err);
    // If anything fails, don't break typing/paste entirely
  }
};


function onReport({ itemType, itemId, postId, commentId = "", replyId = "" }) {
  setReportModal({
    open: true,
    payload: { itemType, itemId, postId, commentId, replyId },
    reason: "Scam",
    details: "",
  });
}

async function submitReport() {
  const p = reportModal.payload;
  if (!p) return;

  const me = user || currentUser || {}; // ✅ StudentDashboard variables
  const reportedByEmail = String(me.email || "").trim().toLowerCase();

  try {
    await reportContent({
      itemType: p.itemType,
      itemId: p.itemId,
      postId: p.postId,
      commentId: p.commentId || "",
      replyId: p.replyId || "",
      scope: "student-dashboard", // ✅ StudentDashboard scope
      reportedByUserId: me.id || "",
      reportedByEmail,
      reportedByRole: me.role || "",
      reason: reportModal.reason,
      details: reportModal.details || "",
    });

    setReportModal({ open: false, payload: null, reason: "Scam", details: "" });
    alert("Report submitted. Thank you.");
  } catch (e) {
    console.error("report failed", e);
    alert(`Report failed: ${e.message}`);
  }
}

  // Persist attachments to IDB and return lightweight descriptors
  async function persistAttachments(images=[], files=[]) {
    const imgDescs = [];
    for (let i=0;i<images.length;i++) {
      const src = images[i];
      const id = `att_img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const blob = dataURLtoBlob(src.dataUrl);
      await idbSet(id, blob);
      const thumb = await makeThumb(src.dataUrl, 360, 360, 0.72);
      /*imgDescs.push({ id, name: src.name || "image.jpg", mime: blob.type || "image/jpeg", 
        thumb,
        dataUrl: src.dataUrl,               // ⬅️ NEW
      });*/
      imgDescs.push({
  id,
  name: src.name || "image.jpg",
  mime: blob.type || "image/jpeg",
  thumb,
  dataUrl: src.dataUrl,
});
    }
    const fileDescs = [];
    for (let i=0;i<files.length;i++) {
      const src = files[i];
      const id = `att_file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const blob = dataURLtoBlob(src.dataUrl);
      await idbSet(id, blob);
      /*fileDescs.push({ id, name: src.name || "file", mime: blob.type || src.mime || "application/octet-stream",
        dataUrl: src.dataUrl,  });*/             // ⬅️ NEW });
   fileDescs.push({
  id,
  name: src.name || "file",
  mime: blob.type || src.mime || "application/octet-stream",
  dataUrl: src.dataUrl,
});
    }
    return { imgDescs, fileDescs };
  }

  
  // Create post
  // Create post (and send to backend API)
  const onPost = async (e) => {
    e.preventDefault();
    /*const html = (editorRef.current?.innerHTML || "").trim();*/
    const html = String(editorRef.current?.innerHTML || "")
  .replace(/\u00A0/g, " ")
  .trim();

    // Only lecturers can post Video (guard in student dashboard)
    if (composerType === "Video") {
      alert("Only lecturers can post videos to students.");
      return;
    }

    const attachmentList = Array.isArray(attachments) ? attachments : [];

    // Academic Books: require at least one image as a cover
    if (
      composerType === "Academic Books" &&
      attachmentList.filter((a) => a.type === "image").length === 0
    ) {
      alert("Please add at least one image as the book cover.");
      return;
    }

    // If no text and no attachments (for non-Book posts), do nothing
    if (!html && attachmentList.length === 0 && composerType !== "Academic Books") {
      return;
    }

    const audience = toFaculty
      ? facultyYearAudienceKey({
          university: user.university,
          faculty: user.faculty,
          year: user.year,
        })
      : audKey;

    // Map S3 attachments into the existing images/files shape for the UI
    const imgDescs = attachmentList
      .filter((a) => a.type === "image")
      .map((a) => ({
        id: a.key || a.url,
        name: a.fileName || "image",
        mime: a.mime || "image/*",
        url: a.url,
      }));

    const fileDescs = attachmentList
      .filter((a) => a.type !== "image")
      .map((a) => ({
        id: a.key || a.url,
        name: a.fileName || "file",
        mime: a.mime || "application/octet-stream",
        url: a.url,
      }));

    const now = Date.now();
    const localPost = {
      //id: `p${now}`,//
      //id: makeId("p"),
      id: makeLocalPostId(),
      createdAt: now,
      authorType: "student",
      author: user.name,
      authorPhoto: user.photoUrl,
      authorProgram: toFaculty ? `${user.faculty} • ${user.year}` : user.program,
      time: formatTimeAgo(now),// ⬅️ instead of hard-coded "Just now"
      audience,
      type: composerType,
      title:
        (composerType === "Academic Books"
          ? bookTitle || composerTitle
          : composerTitle || ""
        ).trim(),
      html,
      images: imgDescs,
      files: fileDescs,
      likes: 0,
      liked: false,
      comments: [],
    };

    // 🔼 Send to backend
    try {
      // Canonical avatar pulled from the current user
      const avatar =
        user.photoUrl ||
        user.avatarUrl ||
        user.profilePhotoUrl ||
        user.profileImageUrl ||
        "";

      const payload = {
        role: "student",
        scope: "student-dashboard",
        text: stripHtml(html),
        html,
        title: localPost.title,
        type: composerType,

        authorId: user.id,
        authorName: user.name,

        // ⭐ Send avatar under multiple common keys so the backend
        // can store any of them and our fetch mapper can still find it.
        authorAvatarUrl: avatar,
        authorPhotoUrl: avatar,
        avatarUrl: avatar,
        photoUrl: avatar,

        // 🔹 send the same header text we show locally
        authorProgram: localPost.authorProgram,

        programCode: user.programCode || "",
        programName: user.program,
        year: user.year,
        audience,

        // Raw S3 descriptors from AttachmentUploader
        attachments: attachmentList,
      };

      const saved = await createPost(payload);

      // Prefer id/createdAt from server if returned
      const merged = {
        ...localPost,
        id: saved?.id || localPost.id,
        createdAt: saved?.createdAt || localPost.createdAt,
        updatedAt: saved?.updatedAt || localPost.createdAt,
        fromBackend: true,
      };

      //setPosts((p) => [merged, ...(p || [])]);//Is replaced by the below code block

      setPosts((p) => {
  const prev = Array.isArray(p) ? p : [];
  // remove any existing copy by id, then add newest on top
  return [merged, ...prev.filter(x => x?.id !== merged.id)];
});

    } catch (err) {
      console.error("[StudentDashboard] createPost failed", err);
      alert(
        "Could not save your post to the server. It may not be visible to other devices yet."
      );
      // Still show locally so student doesn’t lose work
      //setPosts((p) => [localPost, ...(p || [])]);// Tis line is replaced by the below code block to guarantees your feed array never contains duplicates with the same key.

      setPosts((p) => {
  const prev = Array.isArray(p) ? p : [];
  return [localPost, ...prev.filter(x => x?.id !== localPost.id)];
});

    }

    // Reset composer
    if (editorRef.current) editorRef.current.innerHTML = "";
    setAttachments([]);
    setComposerType("Notes");
    setToFaculty(false);
    setComposerTitle("");
    setBookTitle("");
    setComposerOpen(false);
  };

  // Route actions to the right source (student posts vs lecturer posts),
// update exactly one store, and write-through lecturerPosts immediately.
function updatePostById(postId, updater) {
  // 1) Try student-created posts
  let foundInStudents = false;
  setPosts(prev => {
    const idx = Array.isArray(prev) ? prev.findIndex(p => p?.id === postId) : -1;
    if (idx === -1) return prev;
    const next = prev.slice();
    const updated = updater({ ...next[idx] });      // never mutate original
    next[idx] = updated && typeof updated === "object" ? updated : next[idx];
    foundInStudents = true;
    return next;
  });

  // 2) If not found, update lecturer-created posts
  if (!foundInStudents) {
    setLecturerPosts(prev => {
      const idx = Array.isArray(prev) ? prev.findIndex(p => p?.id === postId) : -1;
      if (idx === -1) return prev;
      const next = prev.slice();
      const updated = updater({ ...next[idx] });
      next[idx] = updated && typeof updated === "object" ? updated : next[idx];

      // Persist synchronously so lecturer sees the change immediately
      persistLecturerPostsNow(next);
      return next;
    });
  }
}

  /* ===== Likes/Comments/Replies/Delete ===== */

const toggleLike = (postId) => {
  updatePostById(postId, (x) => ({
    ...x,
    liked: !x.liked,
    likes: x.liked ? Math.max(0, (x.likes || 0) - 1) : (x.likes || 0) + 1,
  }));
};

// ✅ NEW: sync updated post (with comments/replies) to the global posts API
const syncPostToServer = async (updatedPost) => {
  if (!updatedPost?.id) return;
  try {
    await createPost({
      ...updatedPost,
      scope: "student-dashboard",
      updatedAt: Date.now(),
      // ensure server sees a non-empty text field
      text:
        (updatedPost.text && String(updatedPost.text).trim()) ||
        stripHtml(updatedPost.html || "").trim() ||
        updatedPost.title ||
        "Post",
    });
  } catch (e) {
    console.warn("[StudentDashboard] syncPostToServer failed", e);
  }
};

const addComment = async (postId, text, images = [], files = []) => {
  const t = (text || "").trim();
  if (!t && images.length === 0 && files.length === 0) return;

  // Downscale + persist attachments (same behaviour as before)
  const { imgDescs, fileDescs } = await persistAttachments(images, files);
  
  // ✅ Upload comment attachments to CloudFront so DynamoDB stores only URLs
let upImgs = imgDescs;
let upFiles = fileDescs;
try {
  const up = await uploadDescsToCloudFront(imgDescs, fileDescs);
  upImgs = up.upImgs;
  upFiles = up.upFiles;
} catch (e) {
  console.error("[addComment] CloudFront upload failed:", e);
  // If upload fails, better to stop than save base64 that will break persistence
  return;
}

  const now = Date.now();

  const me = user || {};
  const authorId =
    me.id || me.uid || me.userId || me.studentId || "";
  const authorName =
    me.name || me.fullName || me.studentName || "";
  const authorProgram = me.program || "";
  const authorPhoto =
    me.photoUrl || me.avatarUrl || me.profileImageUrl || "";

  // Call backend so we get the REAL saved comment (incl. id)
  let serverComment = null;
  try {
    const res = await createComment({
      postId,
      text: t,
      authorId,
      authorName,
      authorProgram,
      authorPhoto,
      //images: imgDescs,
      //files: fileDescs,
       images: upImgs,   // ✅ USE UPLOADED URL DESCS
      files: upFiles,   // ✅ USE UPLOADED URL DESCS
    });
    console.log("[postsApi] createComment response:", res);
    serverComment = res && (res.comment || res.data?.comment) || null;
    
    // ✅ NEW: notify post owner (lecturer) about this comment
    try {
      await notifyPostOwner({
        type: "comment",
        postId,
        commentId: serverComment?.id,
        actorId: authorId,
        actorName: authorName,
      });
    } catch (e) {
      console.warn("notifyPostOwner failed", e);
    }


  } catch (err) {
    console.error("[StudentDashboard] createComment failed:", err);
  }
  // ✅ ADD THIS RIGHT HERE ⬇️⬇️⬇️
if (!serverComment?.id) {
  alert("Comment failed to save. Attachment upload too large or incomplete.");
  return;
}

  const finalComment =
    serverComment && serverComment.id
      ? {
          ...serverComment,
          authorPhoto: serverComment.authorPhoto || authorPhoto,
          authorProgram:
            serverComment.authorProgram || authorProgram,
          images: Array.isArray(serverComment.images)
            ? serverComment.images
            : imgDescs,
          //files: Array.isArray(serverComment.files)
            //? serverComment.files
            //: fileDescs,
            images:
          Array.isArray(serverComment.images) &&
          serverComment.images.length > 0
            ? serverComment.images
            //: imgDescs,
            : upImgs,   // ✅ ALWAYS URLs
        files:
          Array.isArray(serverComment.files) &&
          serverComment.files.length > 0
            ? serverComment.files
            : upFiles,  // ✅ ALWAYS URLs


        }
      : {
          id: `c_${now}_${Math.random().toString(36).slice(2, 8)}`,
          postId,
          authorId,
          authorName,
          author: authorName,
          authorPhoto,
          authorProgram,
          text: t,
          images: imgDescs,
          files: fileDescs,
          replies: [],
          createdAt: now,
          updatedAt: now,
        };

updatePostById(postId, (x) => {
  const comments = Array.isArray(x.comments) ? x.comments.slice() : [];
  comments.push(finalComment);

  const updated = { ...x, comments, updatedAt: Date.now() };

  // ✅ NEW: push the updated post to server so lecturers can see the thread
  queueMicrotask(() => syncPostToServer(updated));

  return updated;
});
};


const addReply = async (postId, commentId, text, images = [], files = []) => {
  const t = (text || "").trim();
  if (!t && images.length === 0 && files.length === 0) return;

  const { imgDescs, fileDescs } = await persistAttachments(images, files);
  // ✅ Upload reply attachments to CloudFront so DynamoDB stores only URLs
let upImgs = imgDescs;
let upFiles = fileDescs;
try {
  const up = await uploadDescsToCloudFront(imgDescs, fileDescs);
  upImgs = up.upImgs;
  upFiles = up.upFiles;
} catch (e) {
  console.error("[addComment] CloudFront upload failed:", e);
  // If upload fails, better to stop than save base64 that will break persistence
  return;
}
  const now = Date.now();

  const me = user || {};
  const authorId =
    me.id || me.uid || me.userId || me.studentId || "";
  const authorName =
    me.name || me.fullName || me.studentName || "";
  const authorProgram = me.program || "";
  const authorPhoto =
    me.photoUrl || me.avatarUrl || me.profileImageUrl || "";

  let serverReply = null;
  try {
    const res = await createReply({
      postId,
      commentId,
      text: t,
      authorId,
      authorName,
      authorProgram,
      authorPhoto,
      //images: imgDescs,
      //files: fileDescs,
      images: upImgs,   // ✅ NOT imgDescs
      files: upFiles,   // ✅ NOT fileDescs
    });
    console.log("[postsApi] createReply response:", res);
    serverReply = res && (res.reply || res.data?.reply) || null;

    // ✅ NEW: notify post owner (lecturer) about this comment
    try {
      await notifyPostOwner({
        type: "reply",
        postId,
        commentId: serverComment?.id,
        actorId: authorId,
        actorName: authorName,
      });
    } catch (e) {
      console.warn("notifyPostOwner failed", e);
    }






  } catch (err) {
    console.error("[StudentDashboard] createReply failed:", err);
  }
  // ✅ ADD THIS RIGHT HERE ⬇️⬇️⬇️
if (!serverReply?.id) {
  alert("Reply failed to save. Attachment upload too large or incomplete.");
  return;
}

  const finalReply =
    serverReply && serverReply.id
      ? {
          ...serverReply,
          authorPhoto: serverReply.authorPhoto || authorPhoto,
          authorProgram:
            serverReply.authorProgram || authorProgram,
          //images: Array.isArray(serverReply.images)
            //? serverReply.images
            //: imgDescs,
          //files: Array.isArray(serverReply.files)
            //? serverReply.files
            //: fileDescs,

            // ✅ only use server images/files if they’re non-empty
        images:
          Array.isArray(serverReply.images) &&
          serverReply.images.length > 0
            ? serverReply.images
            : upImgs,   // ✅ ALWAYS URLs
        files:
          Array.isArray(serverReply.files) &&
          serverReply.files.length > 0
            ? serverReply.files
            //: fileDescs,
            : upFiles,  // ✅ ALWAYS URLs

        }
      : {
          id: `r_${now}_${Math.random().toString(36).slice(2, 8)}`,
          postId,
          commentId,
          authorId,
          authorName,
          author: authorName,
          authorPhoto,
          authorProgram,
          text: t,
          images: imgDescs,
          files: fileDescs,
          createdAt: now,
          updatedAt: now,
        };


updatePostById(postId, (x) => {
  const base = Array.isArray(x.comments) ? x.comments.slice() : [];
  const nextComments = base.map((c) => {
    if (!c || c.id !== commentId) return c;
    const replies = Array.isArray(c.replies) ? c.replies.slice() : [];
    replies.push(finalReply);
    return { ...c, replies };
  });

  const updated = { ...x, comments: nextComments, updatedAt: Date.now() };

  // ✅ NEW: push the updated post to server so lecturers can see the thread
  queueMicrotask(() => syncPostToServer(updated));

  return updated;
});
};


  

  
    // 2️⃣ Persist to backend

  const deletePost = async (postId) => {
  if (!confirm("Delete this post?")) return;

  // Optimistic UI: remove immediately from this tab
  setPosts((p) => (Array.isArray(p) ? p.filter((x) => x.id !== postId) : p));

  try {
    await deletePostOnServer(postId);
  } catch (err) {
    console.error("[StudentDashboard] deletePostOnServer failed", err);
    // Optional: you could re-add the post or show a toast; for now just log.
    alert("Could not delete the post on the server. It may still appear on other devices.");
  }
};

  /* ===== Post refs for scroll-to from notifications ===== */
  const postRefs = useRef({}); // id -> element
  const [highlightPostId, setHighlightPostId] = useState(null);
  const scrollToPost = (postId) => {
    const el = postRefs.current[postId];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightPostId(postId);
      setTimeout(()=> setHighlightPostId(null), 2500);
    }
  };

  /* ===== Showing bar + Search ===== */
  const [showingTab, setShowingTab] = useState("Newest"); // "Top" | "Newest" | "Answered"
  const [search, setSearch] = useState("");
  const matchesSearch = (p) => {
    const q = search.trim().toLowerCase(); if (!q) return true;
    const plain = stripHtml(p.html||"").toLowerCase();
    const title = (p.title||"").toLowerCase();
    const author = (p.author||"").toLowerCase();
    const type = (p.type||"").toLowerCase();
    const files = (p.files||[]).map(f=> (f.name||"").toLowerCase()).join(" ");
    const commentText = (p.comments||[]).map(c=> [c.author?.toLowerCase()||"", (c.text||"").toLowerCase()]).flat().join(" ");
    return [plain,title,author,type,files,commentText].some(s => s.includes(q));
  };

  // Combine student + lecturer posts for FEED rendering (dedupe by id so PDFs don't render twice)
const feedCombined = useMemo(() => {
  const a = Array.isArray(posts) ? posts : [];
  const b = Array.isArray(lecturerPosts) ? lecturerPosts : [];

  const normalizedLect = b.map((p) =>
    p?.authorType ? p : { ...p, authorType: "lecturer" }
  );

  // Dedupe by id (prefer the version that has S3 urls / richer fields)
  const byId = new Map();
  const add = (p) => {
    if (!p || !p.id) return;
    const prev = byId.get(p.id);
    if (!prev) {
      byId.set(p.id, p);
      return;
    }
    // keep the "better" copy: more attachments or newer timestamps
    const prevScore =
      (prev.images?.length || 0) + (prev.files?.length || 0) + (prev.attachments?.length || 0);
    const nextScore =
      (p.images?.length || 0) + (p.files?.length || 0) + (p.attachments?.length || 0);

    const prevTs = prev.updatedAt || prev.createdAt || 0;
    const nextTs = p.updatedAt || p.createdAt || 0;

    if (nextScore > prevScore || nextTs > prevTs) byId.set(p.id, p);
  };

  // add both sources; duplicates collapse to one
  a.forEach(add);
  normalizedLect.forEach(add);

  return Array.from(byId.values());
}, [posts, lecturerPosts]);


  /* ===== Filtering (add "View my posts") ===== */
  let filtered = feedCombined
  .filter(p => (showLecturerOnly ? p.authorType === "lecturer" : true))
  .filter(p => (showMineOnly ? (p.authorType==="student" && p.author===user.name) : true))
  .filter(p => {
    if (filterType === "All") return true;
    const postType = (p.type || "Notes").trim().toLowerCase();
    const wanted   = filterType.trim().toLowerCase();
    return postType === wanted;
  })
  .filter(p =>
    showFacultyOnly
      ? isForMyFaculty(p.audience)
      : (p.audience === "GLOBAL" || p.audience === audKey)
  )
  .filter(matchesSearch);
  if (showingTab === "Answered") filtered = filtered.filter(p => (p.comments?.length||0) > 0);
  if (showingTab === "Top") filtered = filtered.slice().sort((a,b)=> (b.likes||0) - (a.likes||0));
  else filtered = filtered.slice().sort((a,b)=> ts(b.createdAt||0) - ts(a.createdAt||0));

  /* ===== Manage profile ===== */
  //const [meOpen,setMeOpen]=useState(false);
  const [meOpen, setMeOpen] = useState(() => editProfile);
  //const [securityOpen, setSecurityOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(() => editProfile);
  const [editName,setEditName]=useState(user.name);
  const availablePrograms = getProgramsSafe(user.continent, user.country, user.university, user.faculty, user.program);
  const [editProgram,setEditProgram]=useState(user.program);
  const [editYear,setEditYear]=useState(user.year);
  const applyMeUpdates = ()=>{
    const next = { ...user, name: editName.trim() || user.name, program: editProgram, year: editYear };
    next.country = normalizeCountry(next.country||"");
    next.countryCode = ensureCountryCode(next.country, next.countryCode);
    setUser(next);
    saveAndBroadcastUser(next);

  };

  useEffect(() => {
  if (editProfile) {
    setMeOpen(true);
    // (optional) you could also scroll into view here if you want
  }
}, [editProfile]);

  /* ===== Notifications (bell + lecturer toast) ===== */
  const [lecturerToast, setLecturerToast] = useState(null); // { id, author, title, createdAt }
  useEffect(() => {
    const lastNotified = Number(localStorage.getItem(LECT_LAST_NOTIFY_KEY(user.id)) || 0);
    const newestLecturer = allPostsForSignals
      .filter(p => p.authorType === "lecturer" && p.author !== user.name && isMyAudience(p, user, baseFac, audKey))
      .sort((a,b) => (b.createdAt||0) - (a.createdAt||0))[0];
    if (!newestLecturer) return;
    if ((newestLecturer.createdAt || 0) > lastNotified) {
      setLecturerToast({
        id: newestLecturer.id,
        author: newestLecturer.author,
        title: newestLecturer.title || stripHtml(newestLecturer.html || "").slice(0, 80),
        createdAt: newestLecturer.createdAt
      });
      localStorage.setItem(LECT_LAST_NOTIFY_KEY(user.id), String(newestLecturer.createdAt || Date.now()));
    }
  }, [posts, lecturerPosts, user.id, user.name, baseFac, audKey, allPostsForSignals]);

  const [notifOpen,setNotifOpen] = useState(false);
  const [unseenCount,setUnseenCount] = useState(0);
  const [clearedAt, setClearedAt] = useState(()=> Number(localStorage.getItem(NOTIF_CLEARED_KEY(user.id)) || 0));
  const recomputeUnseen = useMemo(() => () => {
    const lastSeen = Number(localStorage.getItem(NOTIF_SEEN_KEY(user.id)) || 0);
    const cnt = allPostsForSignals.filter(p =>
      ts(p.createdAt) > lastSeen &&
      p.author !== user.name &&
      isMyAudience(p, user, baseFac, audKey)
    ).length;
    setUnseenCount(cnt); return cnt;
  }, [allPostsForSignals, user.id, user.name, user.year, audKey, baseFac]);
  useEffect(() => {
    recomputeUnseen();
    const onAnyPosts = () => recomputeUnseen();
    window.addEventListener("storage", onAnyPosts);
    window.addEventListener("posts:updated", onAnyPosts);
    window.addEventListener("lecturerPosts:updated", onAnyPosts);
    return () => {
      window.removeEventListener("storage", onAnyPosts);
      window.removeEventListener("posts:updated", onAnyPosts);
      window.removeEventListener("lecturerPosts:updated", onAnyPosts);
    };
  }, [recomputeUnseen]);
  const openBell = ()=>{ setNotifOpen(true); localStorage.setItem(NOTIF_SEEN_KEY(user.id), String(Date.now())); setUnseenCount(0); };
  const markAllSeen = ()=>{ localStorage.setItem(NOTIF_SEEN_KEY(user.id), String(Date.now())); setUnseenCount(0); };
  const clearAllNotifications = ()=>{ const now = Date.now(); localStorage.setItem(NOTIF_CLEARED_KEY(user.id), String(now)); setClearedAt(now); markAllSeen(); };
  const notifications = allPostsForSignals
    .filter(p => p.author !== user.name && isMyAudience(p, user, baseFac, audKey))
    .filter(p => ts(p.createdAt || 0) > (clearedAt || 0))
    .sort((a,b)=> ts(b.createdAt||0)-ts(a.createdAt||0))
    .slice(0, 50);

  /* ===== Layout ===== */
 

     return (
    <div className="min-h-screen bg-[#f3f6fb]">
      
      {/* ⬇️ Add VerifyGate at the very top-level of the page */}
    <VerifyGate email={current?.email} />
    
      {/*<main className="max-w-[1300px] mx-auto px-3 lg:px-5 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-5">*/}
      <main className="max-w-[1360px] mx-auto px-2 sm:px-3 lg:px-5 py-3 lg:py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-3 lg:gap-5">
        {/* LEFT */}
        {/* LEFT - DESKTOP ONLY */}
       <aside className="hidden lg:block space-y-4 pb-24">
          <Card className="p-0 overflow-hidden">
            <div className="relative h-20 bg-slate-200">
              {user.bannerUrl ? <img src={user.bannerUrl} alt="Banner" className="h-full w-full object-cover"/> : <div className="h-full w-full bg-gradient-to-r from-blue-200 to-indigo-200" />}
              <label className="absolute right-2 top-2 text-xs bg-white/80 px-2 py-1 rounded cursor-pointer border border-slate-100">
                Edit banner
                <input type="file" accept="image/*" className="hidden" onChange={onPickBanner}/>
              </label>
            </div>
            <div className="px-4 pt-0 pb-4">
              <div className="-mt-8">
                <div className="inline-block relative">
                  <Avatar size="lg" url={user.photoUrl} name={user.name} online />
                  <label className="absolute -right-1 -bottom-1 bg-white text-[10px] px-1 py-0.5 rounded cursor-pointer border border-slate-100">
                    Edit
                    <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar}/>
                  </label>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-semibold text-slate-900 text-lg">{user.name}</div>
                <div className="text-sm text-slate-700">{user.program}</div>
                <div className="text-sm text-slate-700">{user.faculty}</div>
                <div className="text-sm text-slate-700">{user.year}</div>
                <div className="text-xs text-slate-500 mt-1">{user.university}</div>

                <div className="mt-1 text-sm text-slate-700 flex items-center gap-2">
                  <FlagIcon country={user.country} countryCode={user.countryCode} className="w-6 h-4 rounded-[2px]" />
                  <span>{user.country}</span>
                </div>
              </div>

              <div className="mt-4">
                <button onClick={()=>setMeOpen(v=>!v)} className="text-sm rounded-full border border-slate-100 px-3 py-1 hover:bg-slate-50">Me ▾</button>
                {meOpen && (
                  <div className="mt-2 border border-slate-100 rounded-lg p-3 bg-white space-y-3">
                    <div className="text-sm font-medium text-center">Manage profile</div>

                    <label className="block text-sm">
                      Name
                      <input className="mt-1 w-full border border-slate-100 rounded px-2 py-1" value={editName} onChange={(e)=>setEditName(e.target.value)} />
                    </label>
                    <label className="block text-sm">
                      Academic Program
                      <select className="mt-1 w-full border border-slate-100 rounded px-2 py-1" value={editProgram} onChange={(e)=>setEditProgram(e.target.value)}>
                        {availablePrograms.map((p) => (<option key={p} value={p}>{p}</option>))}
                      </select>
                      </label>
                                 <label className="block text-sm">
                      Year of Study
                      <select className="mt-1 w-full border border-slate-100 rounded px-2 py-1" value={editYear} onChange={(e)=>setEditYear(e.target.value)}>
                        {YEARS.map((y) => (<option key={y} value={y}>{y}</option>))}
                      </select>
                    </label>
                    <div className="flex justify-end gap-2">
                      <button className="text-sm rounded border border-slate-100 px-3 py-1" onClick={()=>setMeOpen(false)}>Cancel</button>
                      <button className="text-sm rounded bg-blue-600 text-white px-3 py-1" onClick={()=>{ applyMeUpdates(); setMeOpen(false); }}>Save</button>
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
                    <div id="account-security-panel" className={`${securityOpen ? "mt-2 block" : "hidden"}`} >
                      <div className="mt-2">
                        {/* This card should read/write via the auth store shim */}
                        <AccountSecurityCard user={user} />
                      </div>
                    </div>

                   
  <Link to="/student-dashboard" className="block text-sm text-blue-600 underline text-center">
  View profile
</Link>
<button
  type="button"
  className="block w-full text-sm text-slate-600 underline text-center"
  onClick={handleStudentSignOut}
>
  Sign out
</button>
                  </div>
                )}
              </div>
            </div>
          </Card>

        

          {/* Lecturer posts toggle */}
<SidebarCard
  headerOnly
  title={
    /*<div className="flex items-center justify-between gap-3">*/
      <div className="flex items-center justify-between gap-3 min-w-0">
      {/*<span>View Lecturers’ posts</span>*/}
      <span className="min-w-0 flex-1 truncate text-[13px] sm:text-sm font-medium leading-none whitespace-nowrap">
  View Lecturers’ posts
</span>
      <div className="flex items-center gap-2">
        <NewBadge show={!showLecturerOnly && hasNewLecturer} />
        <button
          onClick={onToggleLecturerOnly}
          className={`px-4 py-1 rounded-full text-sm ${
            showLecturerOnly
              ? "bg-blue-600 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {showLecturerOnly ? "On" : "Off"}
        </button>
      </div>
    </div>
  }
/>

{/* Faculty filter */}
<SidebarCard
  headerOnly
  title={
    /*<div className="flex items-center justify-between gap-3">*/
    <div className="flex items-center justify-between gap-3 min-w-0">
      {/*<span>{`View ${facultyDisplay(user)} posts`}</span>*/}
      <span className="min-w-0 flex-1 text-[12px] sm:text-[13px] font-medium leading-5 pr-2 break-words whitespace-normal">
  {`View ${facultyDisplay(user)} posts`}
</span>


      <div className="flex items-center gap-2">
        <NewBadge show={!showFacultyOnly && (hasNewFacultySignal || hasNewFacultyPosts)} />
        <button
          onClick={onToggleFacultyOnly}
          className={`px-4 py-1 rounded-full text-sm ${
            showFacultyOnly
              ? "bg-blue-600 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {showFacultyOnly ? "On" : "Off"}
        </button>
      </div>
    </div>
  }
/>

{/* My posts */}
<SidebarCard
  headerOnly
  title={
    /*<div className="flex items-center justify-between gap-3">*/
      <div className="flex items-center justify-between gap-3 min-w-0">
      {/*<span>View my posts</span>*/}
      <span className="min-w-0 flex-1 truncate text-[13px] sm:text-sm font-medium leading-none whitespace-nowrap">
  View my posts
</span>


      <button
        onClick={() => setShowMineOnly((v) => !v)}
        className={`px-4 py-1 rounded-full text-sm ${
          showMineOnly
            ? "bg-blue-600 text-white"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {showMineOnly ? "On" : "Off"}
      </button>
    </div>
  }
/>



          {/* Academic posts filters */}
          <SidebarCard title="Academic posts">
            <div className="space-y-2 text-sm">
              <FilterPill label="All" active={filterType==="All"} onClick={()=>setFilterType("All")} activeClassName="bg-[#6B3363] text-white" />
              {POST_TYPES.map(t=> (
                <FilterPill
                  key={t}
                  label={t}
                  active={filterType===t}
                  onClick={()=>{ setFilterType(t); markTypeSeen(t); }}
                  showNew={(latestByType[t]||0) > (lastSeenByType[t]||0)}
                />
              ))}
            </div>
          </SidebarCard>
           {/* Normal Google Ad card */}
                    {showSidebarAds ? <GoogleSidebarAd /> : null}

            
                 {/* Sticky Google Ad card (stays visible while scrolling) */}
          <div className="sticky top-[160px] pt-2">
            {/* "safe" height: viewport minus top offset minus bottom gap */}
            <div className="max-h-[calc(100vh-160px-80px)] overflow-hidden">
              {showSidebarAds ? <GoogleSidebarAd /> : null}
            </div>
          </div>
        </aside>

      


        {/* CENTER */}
        {/*<section className="space-y-4">*/}
          {/*<section className="space-y-3 lg:space-y-4 min-w-0">*/}
          <section className="space-y-3 lg:space-y-4 min-w-0 mt-[70px] lg:mt-0">
          <Card>
            {!composerOpen ? (
              <div className="flex items-center gap-3">
                <Avatar size="md" url={user.photoUrl} name={user.name} online />
                <button
                  onClick={()=>setComposerOpen(true)}
                  className="flex-1 text-left border border-slate-100 rounded-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-600"
                >
                  Start a post (Post academics ,e.g., FN 101-Introduction to Finance)
                </button>
              </div>
            ) : (
              <form onSubmit={onPost}>
                <div className="flex items-center gap-3">
                  <Avatar size="md" url={user.photoUrl} name={user.name} online />
                  <div>
                    <div className="font-semibold text-slate-900">{user.name}</div>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={toFaculty} onChange={(e)=>setToFaculty(e.target.checked)}/>
                      <span>Check this to post to <strong>College/School/Faculty/Department</strong>. (Your <strong>Year</strong> will be used.)</span>
                    </label>
                  </div>
                  <div className="ml-auto">
                    {/* For students, include everything EXCEPT Video */}
                    <select
                      value={composerType}
                      onChange={e=>setComposerType(e.target.value)}
                      className="border border-slate-100 rounded px-2 py-1 text-sm"
                      title="Select academic post type"
                    >
                      {POST_TYPES.filter(t => t !== "Video").map(t=> <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <ToolbarButton onClick={()=>exec("bold")} label="B" title="Bold"/>
                  <ToolbarButton onClick={()=>exec("italic")} label={<em>I</em>} title="Italic"/>
                  <ToolbarButton onClick={addLink} label="🔗" title="Add link"/>
                </div>

                {/* Title (and Book Title helper) */}
                <label className="block mt-3">
                  <span className="text-sm text-slate-600">Title</span>
                  <input
                    value={composerTitle}
                    onChange={(e)=>setComposerTitle(e.target.value)}
                    placeholder="Add a descriptive title…e.g,FN 101-Introduction to Finance,etc"
                    className="mt-1 w-full border border-slate-100 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={140}
                  />
                </label>
                {composerType === "Academic Books" && (
                  <label className="block mt-2">
                    <span className="text-sm text-slate-600">Academic Book — Name/Title</span>
                    <input
                      value={bookTitle}
                      onChange={(e)=>setBookTitle(e.target.value)}
                      placeholder="e.g., Introduction to Linear Algebra (5th ed.)"
                      className="mt-1 w-full border border-slate-100 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={160}
                    />
                  </label>
                )}

                <div
                  ref={editorRef}
                  contentEditable
                  onPaste={handlePaste}
                  className="mt-3 min-h-[110px] max-h-56 overflow-auto whitespace-pre-wrap break-words border border-slate-100 rounded-lg bg-white px-3 py-2 focus:outline-none"
                  suppressContentEditableWarning
                />

                     {/* AI-BLOCK IN COMPOSER */}
<div className="mt-3 flex flex-wrap items-center gap-2">
  <button
    type="button"
    onClick={async () => {
      try {
        const sourceText = String(editorRef.current?.innerText || "").trim();
        if (!sourceText) return;

        setAiBusy(true);
        setAiResult("");
        setAiMode("html");

        /*const improved = await callAssistAI("improve-writing", sourceText);*/
        const improved = await callAssistAIChunked("improve-writing", sourceText);

        setAiResult(sanitizeSimpleAiHtml(improved));
        setAiOpen(true);
      } catch (e) {
        setAiResult(`AI error: ${e.message || "Unable to improve writing."}`);
        setAiOpen(true);
      } finally {
        setAiBusy(false);
      }
    }}
    className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
    disabled={aiBusy}
  >
    {aiBusy ? "Working..." : "Improve writing"}
  </button>

  <button
    type="button"
    onClick={async () => {
      try {
        const sourceText = String(editorRef.current?.innerText || "").trim();
        if (!sourceText) return;

        setAiBusy(true);
        setAiResult("");
        setAiMode("html");

        /*const summary = await callAssistAI("summarize", sourceText);*/
        const summary = await callAssistAIChunked("summarize", sourceText);

        /*setAiResult(summary);*/
        setAiResult(sanitizeSimpleAiHtml(summary));
        setAiOpen(true);
      } catch (e) {
        setAiResult(`AI error: ${e.message || "Unable to summarize."}`);
        setAiOpen(true);
      } finally {
        setAiBusy(false);
      }
    }}
    className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
    disabled={aiBusy}
  >
    Summarize
  </button>

  <button
    type="button"
    onClick={async () => {
      try {
        const sourceText = String(editorRef.current?.innerText || "").trim();
        if (!sourceText) return;

        setAiBusy(true);
        setAiResult("");
        setAiMode("html");

        /*const formatted = await callAssistAI("format-subheadings", sourceText);*/
        const formatted = await callAssistAIChunked("format-subheadings", sourceText);

        setAiResult(sanitizeSimpleAiHtml(formatted));
        setAiOpen(true);
      } catch (e) {
        setAiMode("text");
        setAiResult(`AI error: ${e.message || "Unable to format subheadings."}`);
        setAiOpen(true);
      } finally {
        setAiBusy(false);
      }
    }}
    className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
    disabled={aiBusy}
  >
    Format subheadings
  </button>

  {/* S3-backed attachments (images + documents) */}
  <div className="shrink-0">
    <AttachmentUploader
      role="student"
      folder="student-posts"
      maxFiles={5}
      value={attachments}
      onChange={setAttachments}
      compactOnly
    />
  </div>

  <div className="ml-auto flex items-center gap-2">
    <button
      type="button"
      onClick={() => {
        setComposerOpen(false);
        if (editorRef.current) editorRef.current.innerHTML = "";
        setAttachments([]);
        setComposerType("Notes");
        setToFaculty(false);
        setComposerTitle("");
        setBookTitle("");
        setAiOpen(false);
        setAiResult("");
      }}
      className="rounded-full border border-slate-100 px-4 py-2 text-sm hover:bg-slate-50"
    >
      Cancel
    </button>

    <button
      type="submit"
      className="rounded-full bg-blue-600 text-white px-4 py-1 text-sm font-semibold hover:bg-blue-700"
    >
      Post
    </button>
  </div>
</div>

{/* ✅ ADD THE PREVIEW BLOCK RIGHT HERE */}
{attachments?.length > 0 ? (
  <div className="mt-2">
    <AttachmentUploader
      role="student"
      folder="student-posts"
      maxFiles={5}
      value={attachments}
      onChange={setAttachments}
      previewOnly
    />
  </div>
) : null}

{aiOpen && aiResult ? (
  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
    <div className="mb-2 flex items-center justify-between">
      <div className="font-semibold">AI suggestion</div>
      <button
        type="button"
        onClick={() => {
          setAiOpen(false);
          setAiResult("");
        }}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
      >
        Close
      </button>
    </div>

    {aiMode === "html" ? (
      <div
        /*className="prose prose-sm max-w-none"*/
        className="max-w-none [&_p]:my-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:my-1"
        dangerouslySetInnerHTML={{ __html: sanitizeSimpleAiHtml(aiResult) }}
      />
    ) : (
      <div className="whitespace-pre-wrap">{aiResult}</div>
    )}

    <button
      type="button"
      onClick={() => {
        if (!editorRef.current) return;

        if (aiMode === "html") {
          editorRef.current.innerHTML =
            sanitizeSimpleAiHtml(aiResult) || "<p><br/></p>";
          return;
        }

        const esc = (s) =>
          String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const html = String(aiResult || "")
          .replace(/\r\n/g, "\n")
          .split(/\n{2,}/)
          .map((para) => `<p>${para.split("\n").map(esc).join("<br/>")}</p>`)
          .join("");

        editorRef.current.innerHTML = html || "<p><br/></p>";
      }}
      className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
    >
      Use this text
    </button>
  </div>
) : null}
              </form>
            )}
          </Card>

          {/* Showing bar + Search under the composer */}
          <Card className="py-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Showing:</span>
                {["Top","Newest","Answered"].map(tab => (
                  <button
                    key={tab}
                    onClick={()=>setShowingTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-sm ${showingTab===tab ? "bg-slate-900 text-white" : "border border-slate-200 hover:bg-slate-50"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="md:ml-auto w-full md:w-[420px]">
                <input
                  value={search}
                  onChange={(e)=>setSearch(e.target.value)}
                  placeholder="Search by student name, lecturer name, course code, keywords…"
                  className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Small loading hint above the feed */}
          {feedLoading && (filtered?.length || 0) === 0 && (
  <div className="text-sm text-slate-500 px-1 mb-1">
    Loading posts…
  </div>
)}

  {filtered.map((p, idx) => (
  <div
    key={`${p?.id || "noid"}__${p?.createdAt || 0}__${idx}`}
    ref={(el) => {
      //if (el) postRefs.current[p.id] = el;
      if (el && p?.id) postRefs.current[p.id] = el;
    }}
    data-post-id={p.id}
  >
    <PostCard
      post={p}
      onToggleLike={() => toggleLike(p.id)}
      onAddComment={(text, images, files) => addComment(p.id, text, images, files)}
      onAddReply={(commentId, text, images, files) =>
        addReply(p.id, commentId, text, images, files)
      }
      onDeletePost={deletePost}
      onReport={() => onReport({ itemType: "post", itemId: p.id, postId: p.id })}   // ✅ ADD THIS LINE
      currentUser={user}
      isHighlighted={highlightPostId === p.id}
    />
  </div>
))}
  </section>

        {/* RIGHT */}
          {/* RIGHT - DESKTOP ONLY */}
        <aside className="hidden lg:block space-y-4 pb-24">
          <Card>
            {latestVideo ? (
              <>
                {latestVideo.title ? (
                  <div className="font-semibold text-slate-900 text-center">
                    {latestVideo.title}
                  </div>
                ) : (
                  <div className="font-semibold text-slate-900 text-center">
                    Updates from ScholarsKnowledge
                  </div>
                )}
                <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-slate-100">
                  <YouTubeEmbed idOrUrl={latestVideo.videoUrlOrId} title={latestVideo.title || "ScholarsKnowledge Updates"} />
                </div>
                

                <div className="mt-2 text-xs text-slate-500 text-center">
                     {latestVideo?.createdAt
                      ? `Posted ${new Date(latestVideo.createdAt).toLocaleString()}`
                    : null}
                </div>

              </>
            ) : (
              <>
                <div className="font-semibold text-slate-900 text-center">Updates from ScholarsKnowledge</div>
                <p className="text-sm text-slate-600 mt-1 text-center">
                  No video yet. When your admin posts a video for Students (or Both), it will appear here.
                </p>
              </>
            )}
          </Card>

          <StudentAlertsCTA />
        
          {/* Contact Lecturer card */}
          {/*<div className="mt-3">
            <div className="w-full border border-slate-200 bg-white rounded-2xl p-4">
              <div className="font-semibold text-slate-900">Contact a Lecturer</div>
              <p className="text-sm text-slate-600 mt-1">
                Send a message (with file or image) to any lecturer in your {user.faculty || "Faculty/School/College"}.
              </p>
              <div className="mt-2 flex items-center justify-between">
                <Link
                  to="/contact-lecturer"
                  className="inline-block rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Open Contact Page
                </Link>
                {unreadLecturerResponses > 0 ? (
                  <span
                    className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-emerald-600 text-white text-xs font-bold"
                    title="Unread replies from lecturers"
                    aria-label={`Unread replies (${unreadLecturerResponses})`}
                  >
                    ({unreadLecturerResponses})
                  </span>
                ) : (
                  <span className="inline-block min-w-[28px] h-7" />
                )}
              </div>
            </div>
          </div>*/}

          {/* Students' links: quick links under Contact a Lecturer */}
<div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
  <h3 className="text-base font-semibold text-slate-900 text-center rounded-lg px-3 py-2 bg-sky-100">
    Students' links
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
    <li>
      <Link
        to="/marketplace"
        className="block text-center rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800"
      >
        Student Market Place
      </Link>
    </li>
    <li>
      <Link
        to="/student/video-tips"
        className="block text-center rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800"
      >
        Video Tips
      </Link>
    </li>
  </ul>
</div>
 {/* Normal Google Ad card */}
          {showSidebarAds ? <GoogleSidebarAd /> : null}
  
       {/* Sticky Google Ad card (stays visible while scrolling) */}
<div className="sticky top-[160px] pt-2">
  {/* "safe" height: viewport minus top offset minus bottom gap */}
  <div className="max-h-[calc(100vh-160px-80px)] overflow-hidden">
  {showSidebarAds ? <GoogleSidebarAd /> : null}
  </div>
</div>
        </aside>
      </main>



      {/* Idle warning modal */}
      {idleWarning && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
            <h3 className="text-lg font-semibold text-slate-900">You have been inactive</h3>
            <p className="mt-2 text-slate-700">Log out in <span className="font-semibold">{countdown}</span> seconds?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded border border-slate-100 px-4 py-2 text-sm hover:bg-slate-50"
                onClick={()=>{ setIdleWarning(false); if (countdownRef.current) clearInterval(countdownRef.current); resetIdleTimer(); }}
              >
                Stay Logged In
              </button>
              <button
                className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
                /*onClick={()=>{ setIdleWarning(false); if (countdownRef.current) clearInterval(countdownRef.current); navigate("/login?role=student"); }}
              >
                Log out
              </button>*/
              onClick={() => {
    setIdleWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);

    logoutEverywhereClientOnly()
      .catch(() => {})
      .finally(() => {
        navigate("/login?role=student");
      });
  }}
>
  Log out
</button>


            </div>
          </div>
        </div>
      )}

      {/* Lecturer post toast */}
      {lecturerToast && (
        <div className="fixed z-[71] left-1/2 -translate-x-1/2 bottom-20 md:bottom-24 max-w-md w-[92vw] md:w-auto bg-white border border-amber-300 shadow-xl rounded-xl p-3 flex items-start gap-3">
          <div className="text-2xl leading-none">📢</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              New post from {lecturerToast.author}
            </div>
            {lecturerToast.title && (
              <div className="text-sm text-slate-700 truncate">{lecturerToast.title}</div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <button
                className="rounded-full bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-blue-700"
                onClick={() => {
                  const id = lecturerToast.id;
                  setLecturerToast(null);
                  setTimeout(() => scrollToPost(id), 50);
                }}
              >
                View
              </button>
              <button
                className="rounded-full border border-slate-200 text-xs px-3 py-1.5 hover:bg-slate-50"
                onClick={() => setLecturerToast(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notification Bell */}
      <button
        type="button"
        onClick={openBell}
        className="fixed z-[70] right-4 bottom-4 h-12 w-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center"
        title="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
            {unseenCount}
          </span>
        )}
      </button>


      {/* Notification Tray */}
      {notifOpen && (
        <div className="fixed inset-0 z-[69]" onClick={()=>setNotifOpen(false)}>
          <div
            className="absolute right-4 bottom-20 w-[92vw] max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200"
            onClick={(e)=>e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="font-semibold text-slate-900">Notifications</div>
              <div className="flex items-center gap-3">
                <button className="text-sm text-blue-600 hover:underline" onClick={markAllSeen}>Mark all read</button>
                <button className="text-sm text-slate-600 hover:underline" onClick={clearAllNotifications}>Clear all</button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto divide-y divide-slate-100">
              
                {notifications.map((n, idx) => (
  <button
    key={n?.id || n?.postId || `${n?.type || "notif"}__${n?.createdAt || 0}__${idx}`}
    className="w-full text-left p-3 flex gap-3 items-start hover:bg-slate-50"
    onClick={() => {
      setNotifOpen(false);
      markAllSeen();
      const targetId = n?.id || n?.postId;
      if (targetId) setTimeout(() => scrollToPost(targetId), 50);
    }}
    title="Open this post"
  >
    <Avatar size="sm" url={n?.authorPhoto} name={n?.author} />
    <div className="min-w-0">
      <div className="text-sm">
        <span className="font-semibold">{n?.author}</span>
        <span className="text-slate-600"> posted in </span>
        <span className="font-medium">
          {n?.audience === audKey
            ? "your program"
            : n?.audience?.startsWith("FACULTY__")
            ? "your faculty"
            : "group"}
        </span>
      </div>

      {n?.title && <div className="text-sm text-slate-900 truncate">{n.title}</div>}

      <div className="text-xs text-slate-500">
        {n?.type} • {n?.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
      </div>
    </div>
  </button>
))}
              {notifications.length === 0 && (
                <div className="p-4 text-sm text-slate-500">No notifications.</div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ✅ REPORT MODAL (PASTE HERE) */}
      {reportModal.open && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReportModal((m) => ({ ...m, open: false }));
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow p-4">
            <div className="text-sm font-semibold text-slate-900">Report content</div>
            <div className="mt-1 text-xs text-slate-600">
              ScholarsKnowledge is committed to keeping our community safe and supportive.
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Reason</label>
              <select
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                value={reportModal.reason}
                onChange={(e) => setReportModal((m) => ({ ...m, reason: e.target.value }))}
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Details (optional)</label>
              <textarea
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                rows={4}
                value={reportModal.details}
                onChange={(e) => setReportModal((m) => ({ ...m, details: e.target.value }))}
                placeholder="What happened?"
              />
            </div>

            <div className="mt-4 flex items-center gap-2 justify-end">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                onClick={() => setReportModal({ open: false, payload: null, reason: "Scam", details: "" })}
              >
                Cancel
              </button>

              <button
                type="button"
                className="rounded-full bg-blue-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-blue-700"
                onClick={submitReport}
              >
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ADD MessagingDock HERE (right before the final closing div) */}
      
<MessagingDock
  me={{
    userId: user.id,
    email: user?.email || user?.profile?.email || "",   // ✅ add this
    role: "student",
    fullName: user.name,
    avatarUrl: user.photoUrl || "",
    scopeKey,
  }}
/>
    </div>
  );
}