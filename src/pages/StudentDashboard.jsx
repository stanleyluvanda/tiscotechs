// src/pages/StudentDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPrograms, YEARS } from "../data/eduData.js";
import YouTubeEmbed from "../components/YouTubeEmbed";
import StudentAlertsCTA from "../components/StudentAlertsCTA";
import { computeUnreadForStudent } from "../lib/contactStore";
import AccountSecurityCard from "../components/account/AccountSecurityCard.jsx";


/* ================= Utils ================ */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "S") + (parts[1]?.[0] || "K")).toUpperCase();
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
  "Announcement",
  "Scholarships",
  "Academic Books",
  "Researches/Thesis",
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
function SidebarCard({ title, children }) {
  return (
    <div className="rounded-none overflow-hidden border border-slate-200 bg-white shadow-sm">
      <HeaderBar title={title} />
      <div className="p-3">{children}</div>
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
  const cls = `${sizeClass} relative rounded-full bg-slate-300 flex items-center justify-center overflow-hidden`;
  return (
    <div className={cls}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover rounded-full" /> : <div className="h-full w-full flex items-center justify-center text-white text-sm bg-gradient-to-tr from-blue-500 to-indigo-500">{initials(name)}</div>}
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Online" />}
    </div>
  );
}
function stripHtml(s=""){ const d=document.createElement("div"); d.innerHTML=s; return (d.textContent||d.innerText||"").trim(); }
function ExpandableText({ text, initialChars=180 }) {
  const [open,setOpen]=useState(false); if(!text) return null;
  const tooLong = text.length>initialChars, shown = open||!tooLong?text:text.slice(0,initialChars)+"…";
  return <div className="mt-1 text-slate-800"><span>{shown}</span>{tooLong&&<button onClick={()=>setOpen(v=>!v)} className="ml-2 text-blue-600 hover:underline"> {open?"Read less":"Read more"}</button>}</div>;
}
function ExpandableHtml({ html, initialChars=280 }) {
  const [open,setOpen]=useState(false); const plain=stripHtml(html); const tooLong=plain.length>initialChars; const shortHtml=plain.slice(0,initialChars)+(tooLong?"…":"");
  return <div className="mt-3 text-slate-800 prose-sm max-w-none">{open||!tooLong?<div dangerouslySetInnerHTML={{__html:html}}/>:<div>{shortHtml}</div>}{tooLong&&<button onClick={()=>setOpen(v=>!v)} className="mt-1 text-blue-600 text-sm hover:underline">{open?"Read less":"Read more"}</button>}</div>;
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
function useAttachmentUrl(att, preferFull=true) {
  const [url, setUrl] = useState(att?.dataUrl || (preferFull ? null : att?.thumb || null));
  useEffect(() => {
    let toRevoke = null;
    let cancelled = false;
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
  }, [att?.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
function AttachmentLink({ att }) {
  const url = useAttachmentUrl(att, true);
  if (!url) return <span className="text-slate-400">{att.name || "file"}</span>;
  return (
    <a href={url} download={att.name || "file"} target="_blank" rel="noopener noreferrer" className="underline">
      {att.name || "file"}
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
          <div className="font-medium text-slate-800">{comment.author}</div>
          <div className="text-xs text-slate-500 mb-1">{comment.authorProgram||""}</div>
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
  return replies.length > 0 ? (
    <div className="mt-2 pl-6 space-y-2">
      {replies.map((r) => (
        <div key={r?.id || Math.random().toString(36)} className="flex items-start gap-2">
          <Avatar size="sm" url={r?.authorPhoto} name={r?.author} />
          <div>
            <div className="font-medium text-slate-800">{r?.author}</div>
            <div className="text-xs text-slate-500 mb-1">{r?.authorProgram || ""}</div>
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
  ) : null;
})()}

          {/* reply composer */}
          <form
            onSubmit={(e)=>{e.preventDefault(); onAddReply(reply, replyImages, replyFiles); setReply(""); setReplyImages([]); setReplyFiles([]); }}
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
                placeholder="Write a reply…"
                rows={1}
                className="flex-1 border border-slate-100 rounded-lg px-3 py-2 bg-white resize-none leading-5"
                style={{ minHeight: 40, maxHeight: 220 }}
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

/* ====== Post card (with lightbox + prev/next) ====== */
function PostCard({
  post,
  onToggleLike,
  onAddComment,
  onAddReply,
  onDeletePost,     // NEW
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

  const images = post.images || [];

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
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
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
              className="w-full max-h-[88vh] object-contain rounded"
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
      {post.files?.length>0 && (
        <ul className="mt-2 text-sm text-slate-700 space-y-1">
          {post.files.map((f,i)=> (
            <li key={`${(f.id||f.name||"f")}-${i}`} className="flex items-center gap-2">
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
      </div>

      {showComments && (
        <div className="mt-3 space-y-3">
          {(Array.isArray(post.comments) ? post.comments : []).map((c) => (
  <CommentThread
    key={c?.id || Math.random().toString(36)}
    comment={c}
    onAddReply={(text, images, files) => onAddReply(c?.id, text, images, files)}
    onOpenLightbox={(items, idx) => openLightbox(items, idx)}
  />
))}

          {/* comment composer with attachments */}
          <form
            onSubmit={(e)=>{e.preventDefault(); onAddComment(cmt, cmtImages, cmtFiles); setCmt(""); setCmtImages([]); setCmtFiles([]);}}
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
                placeholder="Write a comment…"
                rows={1}
                className="flex-1 border border-slate-100 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-5"
                style={{ minHeight: 44, maxHeight: 220 }}
              />
              <label className="text-xs px-2 py-1 border border-slate-100 rounded cursor-pointer">📷
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPickCmtImages}/>
              </label>
              <label className="text-xs px-2 py-1 border border-slate-100 rounded cursor-pointer">📎
                <input type="file" multiple className="hidden" onChange={onPickCmtDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
              </label>
              <button type="submit" className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">Post</button>
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

/* ================== MAIN ================== */
export default function StudentDashboard() {
  const navigate = useNavigate();

  const [user,setUser] = useState(()=>{
    const raw = loadActiveUser();
    const merged = { ...initialUser, ...(raw||{}) };
    merged.country = normalizeCountry(merged.country || "");
    merged.countryCode = ensureCountryCode(merged.country, merged.countryCode);
    return merged;
  });

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
      const label = input.closest("label"); if (label) return label.textContent || label.innerText || "";
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

  // ===== Video posts saved by admin (right column)
  const [videoPosts, setVideoPosts] = useState(() => {
    const arr = safeParse(localStorage.getItem("videoPosts")) || [];
    return Array.isArray(arr) ? arr : [];
  });
  useEffect(() => {
  const sync = () => {
    const arr = safeParse(localStorage.getItem("lecturerPosts")) || [];
    setLecturerPosts(prev => {
      // Prevent ping-pong if nothing really changed
      try {
        const prevStr = JSON.stringify(prev ?? []);
        const nextStr = JSON.stringify(Array.isArray(arr) ? arr : []);
        if (prevStr === nextStr) return prev;   // no state change -> no re-render -> no loop
        return Array.isArray(arr) ? arr : [];
      } catch {
        return Array.isArray(arr) ? arr : [];
      }
    });
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
  const visibleVideos = useMemo(() => {
    const meCont = (user?.continent || "").trim().toLowerCase();
    return (videoPosts || [])
      .filter(p => p && p.type === "video")
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
  const latestVideo = visibleVideos[0] || null;

  const audKey = audienceKey(user);
  const baseFac = `FACULTY__${user.university}__${user.faculty}`;
  const facYearKey = `${baseFac}__${user.year}`;
  const ts = (v) => (typeof v === "number" ? v : Date.parse(v) || 0);

  // ===== Seeded posts
  const seeded = useMemo(()=>[
    {
      id:"p3",
      createdAt: Date.now()-60*60*1000,
      authorType:"lecturer",
      author:"Dr. A. Lecturer",
      authorPhoto:"",
      authorProgram:user.faculty,
      time:"1h",
      audience:audKey,
      type:"Notes",
      title:"Week 3 Lab Tutorial",
      html:"<p><strong>New tutorial</strong> uploaded for Week 3. Please review before the lab.</p>",
      images:[],
      files:[{name:"week3-tutorial.pdf"}],
      likes:5, liked:false,
      comments:[{id:"c1", author:user.name, authorPhoto:user.photoUrl, authorProgram:user.program, text:"Thanks doc! This helps a lot.", images:[], files:[], replies:[{id:"r1", author:"Dr. A. Lecturer", authorPhoto:"", authorProgram:user.faculty, text:"You're welcome. See you in lab.", images:[], files:[] }]}],
    },
    {
      id:"p2",
      createdAt: Date.now()-5*60*60*1000,
      authorType:"student",
      author:"Scholarships Bot",
      authorPhoto:"",
      authorProgram:"Global",
      time:"5h",
      audience:"GLOBAL",
      type:"Scholarships",
      title:"Women in Tech 2025",
      html:'<p>New scholarship: Women in Tech 2025 — closes Sept 30. <a href="/scholarship">See details</a>.</p>',
      images:[], files:[], likes:3, liked:false, comments:[]
    },
    {
      id:"p1",
      createdAt: Date.now()-24*60*60*1000,
      authorType:"student",
      author:"Course Admin",
      authorPhoto:"",
      authorProgram:user.program,
      time:"Yesterday",
      audience:baseFac,
      type:"Assignments",
      title:"Midterm Review Session",
      html:'<p>Midterm review session posted. Slides are available in <a href="/eduinfo">EduInfo</a>.</p>',
      images:[], files:[], likes:2, liked:false, comments:[]
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ],[]);

  const [posts,setPosts] = useState(()=>{
    const stored = safeParse(localStorage.getItem("posts"));
    return stored && Array.isArray(stored) ? stored : seeded;
  });

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
        images: (p.images || []).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
        files: (p.files || []).map(f => ({ id: f.id, name: f.name, mime: f.mime })),
        comments: (p.comments || []).map(c => ({
          ...c,
          images: (c.images || []).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
          files: (c.files || []).map(f => ({ id: f.id, name: f.name, mime: f.mime })),
          replies: (c.replies || []).map(r => ({
            ...r,
            images: (r.images || []).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
            files: (r.files || []).map(f => ({ id: f.id, name: f.name, mime: f.mime })),
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
        images: (p.images || []).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
        files:  (p.files  || []).map(f   => ({ id: f.id,  name: f.name,  mime: f.mime  })),
        comments: (p.comments || []).map(c => ({
          ...c,
          images: (c.images || []).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
          files:  (c.files  || []).map(f   => ({ id: f.id,  name: f.name,  mime: f.mime  })),
          replies: (c.replies || []).map(r => ({
            ...r,
            images: (r.images || []).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
            files:  (r.files  || []).map(f   => ({ id: f.id,  name: f.name,  mime: f.mime  })),
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
        const lean = posts.map(p => ({
          ...p,
          images: (p.images||[]).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
          files: (p.files||[]).map(f => ({ id: f.id, name: f.name, mime: f.mime })),
          comments: (p.comments||[]).map(c => ({
            ...c,
            images: (c.images||[]).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
            files: (c.files||[]).map(f => ({ id: f.id, name: f.name, mime: f.mime })),
            replies: (c.replies||[]).map(r => ({
              ...r,
              images: (r.images||[]).map(img => ({ id: img.id, name: img.name, mime: img.mime })),
              files: (r.files||[]).map(f => ({ id: f.id, name: f.name, mime: f.mime })),
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
  const [idleWarning,setIdleWarning] = useState(false);
  const [countdown,setCountdown] = useState(60);
  const idleTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const resetIdleTimer = ()=>{
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(()=>{
      setIdleWarning(true); setCountdown(60);
      countdownRef.current = setInterval(()=>{
        setCountdown(c=>{
          if (c<=1) { clearInterval(countdownRef.current); setIdleWarning(false); navigate("/login?role=student"); }
          return c-1;
        });
      },1000);
    }, 20*60*1000);
  };
  useEffect(()=>{
    const bump=()=>{ if (!idleWarning) resetIdleTimer(); };
    window.addEventListener("mousemove",bump);
    window.addEventListener("keydown",bump);
    window.addEventListener("click",bump);
    resetIdleTimer();
    return ()=>{
      window.removeEventListener("mousemove",bump);
      window.removeEventListener("keydown",bump);
      window.removeEventListener("click",bump);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[idleWarning]);

  /* ===== Banner/Avatar ===== */
  const onPickBanner = async (e)=>{
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const dataUrl = await fileToDownscaledDataURL(f, 1200, 320, 0.82, 460);
    setUser(u=>{ const next = { ...u, bannerUrl:dataUrl }; saveAndBroadcastUser(next); return next; });
  };
  const onPickAvatar = async (e)=>{
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const dataUrl = await fileToDownscaledDataURL(f, 320, 320, 0.86, 260);
    setUser(u=>{ const next = { ...u, photoUrl:dataUrl }; saveAndBroadcastUser(next); return next; });
  };

  /* ===== Composer ===== */
  const [composerOpen,setComposerOpen]=useState(false);
  const editorRef = useRef(null);
  const [composerType,setComposerType]=useState("Notes");
  const [composerTitle,setComposerTitle] = useState("");
  const [bookTitle, setBookTitle] = useState("");              // NEW: for Academic Books
  const [toFaculty,setToFaculty]=useState(false);
  const [imagePreviews,setImagePreviews]=useState([]); // [{name,dataUrl}]
  const [docFiles,setDocFiles]=useState([]);           // [{name,mime,dataUrl}]

  const exec = (cmd, value=null)=>{ document.execCommand(cmd,false,value); editorRef.current?.focus(); };
  const addLink = ()=>{ const url = prompt("Enter URL (include https://)"); if (url) exec("createLink", url); };
  const onPickImages = async (e)=>{
    const files = Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/"));
    const slots = Math.max(0, 6 - imagePreviews.length);
    const chosen = files.slice(0, slots);
    const dataUrls = await Promise.all(chosen.map(f=>fileToDownscaledDataURL(f, 1280, 1280, 0.82, 420)));
    const next = dataUrls.map((dataUrl,i)=>({ name: chosen[i].name, dataUrl }));
    setImagePreviews(arr=>[...arr, ...next]);
    e.target.value="";
  };

  const onPickDocs = async (e)=>{
  const files = Array.from(e.target.files||[]);
  const mapped = await Promise.all(files.map(async f=>({ name:f.name, mime:f.type||"application/octet-stream", dataUrl: await readFileAsDataURL(f) })));
  setDocFiles(arr=>[...arr, ...mapped]);
  e.target.value="";
};

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") || "";
    if (document.queryCommandSupported("insertText")) document.execCommand("insertText", false, text);
    else {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      sel.deleteFromDocument();
      sel.getRangeAt(0).insertNode(document.createTextNode(text));
    }
  };

  // Persist attachments to IDB and return lightweight descriptors
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

  // Create post
  const onPost = async (e)=>{
    e.preventDefault();
    const html = (editorRef.current?.innerHTML || "").trim();

    // Only lecturers can post Video (guard in student dashboard)
    if (composerType === "Video") {
      alert("Only lecturers can post videos to students.");
      return;
    }
    // Academic Books: recommend a cover + title
    if (composerType === "Academic Books" && imagePreviews.length === 0) {
      alert("Please add at least one image as the book cover.");
      return;
    }

    if (!html && imagePreviews.length===0 && docFiles.length===0 && composerType !== "Academic Books") return;

    const audience = toFaculty ? facultyYearAudienceKey({ university:user.university, faculty:user.faculty, year:user.year }) : audKey;
    const { imgDescs, fileDescs } = await persistAttachments(imagePreviews, docFiles);
    const now = Date.now();
    const newPost = {
      id:`p${now}`,
      createdAt: now,
      authorType:"student",
      author:user.name,
      authorPhoto:user.photoUrl,
      authorProgram: toFaculty ? `${user.faculty} • ${user.year}` : user.program,
      time:"Just now",
      audience,
      type:composerType,
      title: (composerType === "Academic Books" ? (bookTitle || composerTitle) : composerTitle || "").trim(),
      html,
      images: imgDescs,   // first image acts as cover for Academic Books
      files: fileDescs,
      likes:0, liked:false, comments:[]
    };
    setPosts(p=>[newPost, ...p]);

    if (editorRef.current) editorRef.current.innerHTML = "";
    setImagePreviews([]); setDocFiles([]);
    setComposerType("Notes"); setToFaculty(false);
    setComposerTitle(""); setBookTitle("");
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
  const addComment = async (postId, text, images = [], files = []) => {
  const t = (text || "").trim();
  if (!t && images.length === 0 && files.length === 0) return;

  const { imgDescs, fileDescs } = await persistAttachments(images, files);
  const now = Date.now();
  updatePostById(postId, (x) => {
    const comments = Array.isArray(x.comments) ? x.comments.slice() : [];
    comments.push({
      id: `c${now}`,
      author: user.name,
      authorPhoto: user.photoUrl,
      authorProgram: user.program,
      text: t,
      images: imgDescs,
      files: fileDescs,
      replies: [],
      createdAt: now,
    });
    return { ...x, comments };
  });
};

const addReply = async (postId, commentId, text, images = [], files = []) => {
  const t = (text || "").trim();
  if (!t && images.length === 0 && files.length === 0) return;

  const { imgDescs, fileDescs } = await persistAttachments(images, files);
  const now = Date.now();
  updatePostById(postId, (x) => {
    const base = Array.isArray(x.comments) ? x.comments.slice() : [];
    const nextComments = base.map((c) => {
      if (!c || c.id !== commentId) return c;
      const replies = Array.isArray(c.replies) ? c.replies.slice() : [];
      replies.push({
        id: `r${now}`,
        author: user.name,
        authorPhoto: user.photoUrl,
        authorProgram: user.program,
        text: t,
        images: imgDescs,
        files: fileDescs,
        createdAt: now,
      });
      return { ...c, replies };
    });
    return { ...x, comments: nextComments };
  });
};
  const deletePost = (postId)=>{
    if (!confirm("Delete this post?")) return;
    setPosts(p => p.filter(x => x.id !== postId));
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

  // Combine student + lecturer posts for FEED rendering (so scroll works)
  const feedCombined = useMemo(() => {
    const a = Array.isArray(posts) ? posts : [];
    const b = Array.isArray(lecturerPosts) ? lecturerPosts : [];
    const normalizedLect = b.map(p => (p.authorType ? p : { ...p, authorType: "lecturer" }));
    return [...a, ...normalizedLect];
  }, [posts, lecturerPosts]);

  /* ===== Filtering (add "View my posts") ===== */
  let filtered = feedCombined
    .filter(p => (showLecturerOnly ? p.authorType === "lecturer" : true))
    .filter(p => (showMineOnly ? (p.authorType==="student" && p.author===user.name) : true))
    .filter(p => (filterType === "All" ? true : p.type === filterType))
    //.filter(p => showFacultyOnly ? isForMyFaculty(p.audience) : (p.audience === "GLOBAL" || p.audience === audKey) )//

    .filter(p =>
  showFacultyOnly
    ? isForMyFaculty(p.audience)
    : (p.audience === "GLOBAL" || isMyAudience(p, user, baseFac, audKey))
)





    .filter(matchesSearch);
  if (showingTab === "Answered") filtered = filtered.filter(p => (p.comments?.length||0) > 0);
  if (showingTab === "Top") filtered = filtered.slice().sort((a,b)=> (b.likes||0) - (a.likes||0));
  else filtered = filtered.slice().sort((a,b)=> ts(b.createdAt||0) - ts(a.createdAt||0));

  /* ===== Manage profile ===== */
  const [meOpen,setMeOpen]=useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
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
      <main className="max-w-[1300px] mx-auto px-3 lg:px-5 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-5">
        {/* LEFT */}
        <aside className="space-y-4">
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

                    <Link to="/student-dashboard" className="block text-sm text-blue-600 underline text-center">View profile</Link>
                    <button
                      className="block w-full text-sm text-slate-600 underline text-center"
                      onClick={() => {
  // prevent any persistence/dispatch loops during logout
  window.__skSigningOut = true;
  try { sessionStorage.clear(); } catch {}
  try { localStorage.removeItem("currentUser"); } catch {}
  navigate("/login?role=student");
}}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Lecturer posts toggle */}
          <SidebarCard title="View Lecturers’ posts">
            <div className="mt-1 flex items-center justify-center gap-2">
              <NewBadge show={!showLecturerOnly && (hasNewLecturer)} />
              <button
                onClick={onToggleLecturerOnly}
                className={`px-4 py-1 rounded-full text-sm ${showLecturerOnly?"bg-blue-600 text-white":"border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
              >
                {showLecturerOnly?"On":"Off"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600 text-center">View Academic posts by your Lecturer.</p>
          </SidebarCard>

          {/* Faculty filter */}
          <SidebarCard title={`View ${facultyDisplay(user)} posts`}>
            <div className="mt-1 flex items-center justify-center gap-2">
              <NewBadge show={!showFacultyOnly && (hasNewFacultySignal || hasNewFacultyPosts)} />
              <button
                onClick={onToggleFacultyOnly}
                className={`px-4 py-1 rounded-full text-sm ${showFacultyOnly?"bg-blue-600 text-white":"border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
              >
                {showFacultyOnly?"On":"Off"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600 text-center">
              When ON, you’ll see only {facultyDisplay(user).toLowerCase()} posts for your year. When OFF, faculty posts are hidden.
            </p>
          </SidebarCard>

          {/* My posts */}
          <SidebarCard title="View my posts">
            <div className="mt-1 flex items-center justify-center">
              <button
                onClick={()=>setShowMineOnly(v=>!v)}
                className={`px-4 py-1 rounded-full text-sm ${showMineOnly?"bg-blue-600 text-white":"border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
              >
                {showMineOnly ? "On" : "Off"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600 text-center">Only show posts you (the student) created.</p>
          </SidebarCard>

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
        </aside>

        {/* CENTER */}
        <section className="space-y-4">
          <Card>
            {!composerOpen ? (
              <div className="flex items-center gap-3">
                <Avatar size="md" url={user.photoUrl} name={user.name} online />
                <button
                  onClick={()=>setComposerOpen(true)}
                  className="flex-1 text-left border border-slate-100 rounded-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-600"
                >
                  Start a post
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
                  <label className="ml-auto text-sm text-slate-600 cursor-pointer">📷 Images
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages}/>
                  </label>
                  <label className="text-sm text-slate-600 cursor-pointer">📎 Files
                    <input type="file" multiple className="hidden" onChange={onPickDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
                  </label>
                </div>

                {/* Title (and Book Title helper) */}
                <label className="block mt-3">
                  <span className="text-sm text-slate-600">Title</span>
                  <input
                    value={composerTitle}
                    onChange={(e)=>setComposerTitle(e.target.value)}
                    placeholder="Add a descriptive title…"
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

                {imagePreviews.length>0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {imagePreviews.map((img,idx)=>(
                      <div key={(img.dataUrl||img.name)+idx} className="relative">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-32 object-cover rounded"/>
                        <button type="button" onClick={()=>setImagePreviews(arr=>arr.filter((_,i)=>i!==idx))} className="absolute right-1 top-1 bg-white/80 text-xs px-1 rounded">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {docFiles.length>0 && (
                  <ul className="mt-2 text-sm text-slate-700 space-y-1">
                    {docFiles.map((d,i)=>(
                      <li key={i} className="flex items-center gap-2">
                        📎 <span className="font-medium">{d.name}</span>
                        <button type="button" className="text-xs underline" onClick={()=>setDocFiles(arr=>arr.filter((_,idx)=>idx!==i))}>remove</button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={()=>{ setComposerOpen(false); if (editorRef.current) editorRef.current.innerHTML=""; setImagePreviews([]); setDocFiles([]); setComposerType("Notes"); setToFaculty(false); setComposerTitle(""); setBookTitle(""); }}
                    className="rounded-full border border-slate-100 px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
                    Post
                  </button>
                </div>
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

          {filtered.map(p=>(
            <div key={p.id} ref={el => { if (el) postRefs.current[p.id] = el; }} data-post-id={p.id}>
              <PostCard
                post={p}
                onToggleLike={()=>toggleLike(p.id)}
                onAddComment={(text,images,files)=>addComment(p.id, text, images, files)}
                onAddReply={(commentId,text,images,files)=>addReply(p.id, commentId, text, images, files)}
                onDeletePost={deletePost}
                currentUser={user}
                isHighlighted={highlightPostId === p.id}
              />
            </div>
          ))}
        </section>

        {/* RIGHT */}
        <aside className="space-y-4">
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
                  Posted {new Date(latestVideo.createdAt).toLocaleString()}
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
          <div className="mt-3">
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
          </div>

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
  </ul>
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
                onClick={()=>{ setIdleWarning(false); if (countdownRef.current) clearInterval(countdownRef.current); navigate("/login?role=student"); }}
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
              {notifications.map(p=>(
                <button
                  key={p.id}
                  className="w-full text-left p-3 flex gap-3 items-start hover:bg-slate-50"
                  onClick={()=>{
                    setNotifOpen(false);
                    markAllSeen();
                    setTimeout(()=>scrollToPost(p.id), 50);
                  }}
                  title="Open this post"
                >
                  <Avatar size="sm" url={p.authorPhoto} name={p.author}/>
                  <div className="min-w-0">
                    <div className="text-sm">
                      <span className="font-semibold">{p.author}</span>
                      <span className="text-slate-600"> posted in </span>
                      <span className="font-medium">
                        {p.audience===audKey ? "your program" : p.audience?.startsWith("FACULTY__") ? "your faculty" : "group"}
                      </span>
                    </div>
                    {p.title && <div className="text-sm text-slate-900 truncate">{p.title}</div>}
                    <div className="text-xs text-slate-500">{p.type} • {new Date(p.createdAt).toLocaleString()}</div>
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
    </div>
  );
}