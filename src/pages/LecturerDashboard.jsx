// src/pages/LecturerDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { YEARS as YEARS_DATA, getPrograms as rawGetPrograms } from "../data/eduData.js";
import { computeUnreadForLecturer } from "../lib/contactStore";
import AccountSecurityCard from "../components/account/AccountSecurityCard.jsx";

/* ---------------- Small utils ------------------ */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
function initials(name = "") {
  const [a = "", b = ""] = name.trim().split(/\s+/);
  return (a[0] || "L").toUpperCase() + (b[0] || "K").toUpperCase();
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
function AttachmentLink({ att }) {
  const url = useAttachmentUrl(att, true);
  if (!url) return <span className="text-slate-400">{att.name || "file"}</span>;
  return (
    <a href={url} download={att.name || "file"} target="_blank" rel="noopener noreferrer" className="underline">
      {att.name || "file"}
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
  for (const k of ID_KEYS) sessionStorage.setItem(k, user.id);
  trySet("currentUser", JSON.stringify(user));
  for (const k of ID_KEYS) trySet(k, user.id);
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
const POST_TYPES = ["Notes","Announcement", "Assignments", "Scholarships", "Academic Books", "Researches/Thesis","Video"];

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

/* ------------------------ Main Component ------------------------- */
export default function LecturerDashboard() {
  const navigate = useNavigate();

  /* Seed canonical lecturer profile URL so other pages (Academic Platform, etc.) route back here */
  useEffect(() => { setLecturerProfileHref("/lecturer-dashboard"); }, []);

  /* Load active user (lecturer) + normalize like student dashboard */
  const [user, setUser] = useState(() => {
    const s = safeParse(sessionStorage.getItem("currentUser")) || {};
    const l = safeParse(localStorage.getItem("currentUser")) || {};
    const raw = Object.keys(s).length ? s : l;
    const merged = {
      ...raw,
      role: raw.role || "lecturer",
      id: raw.id || `l_${Date.now()}`,
      name: raw.name || "Lecturer Name",
      title: raw.title || "",
      country: normalizeCountry(raw.country || ""),
      countryCode: ensureCountryCode(raw.country || "", raw.countryCode || ""),
      photoUrl: raw.photoUrl || "",
      bannerUrl: raw.bannerUrl || "",
      university: raw.university || "",
      faculty: raw.faculty || "",
      continent: raw.continent || "",
    };
    return merged;
  });

  useEffect(() => { 
    persistUserFull(user);
    saveAndBroadcastUser(user);
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
  const [posts, setPosts] = useState(() => {
    const stored = safeParse(localStorage.getItem("lecturerPosts"));
    return stored && Array.isArray(stored) ? stored : seeded;
  });
  useEffect(() => { 
   localStorage.setItem("lecturerPosts", JSON.stringify(posts));
    window.dispatchEvent(new Event("lecturerPosts:updated"));
  }, [posts]);






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
  const [imagePreviews, setImagePreviews] = useState([]); // [{name,dataUrl}]
  const [docFiles, setDocFiles] = useState([]); // [{name,mime,dataUrl}]
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
  const onPickBanner = async (e) => {
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
  };
  const onPickAvatar = async (e) => {
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
  const handlePaste = (e) => {
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

  /* Create post (supports all types including Video) */
  const onPost = async (e) => {
    e.preventDefault();

    const title = (composerTitle || "").trim();
    let html = (editorRef.current?.innerHTML || "").trim();

    // If Video, require a URL/ID
    let videoId = "";
    if (composerType === "Video") {
      const raw = (composerVideoUrl || "").trim();
      videoId = extractYouTubeId(raw);
      if (!videoId) { alert("Enter a valid YouTube URL or video ID."); return; }
    }

    // For non-video empty guard
    if (composerType !== "Video" && !title && !html && imagePreviews.length === 0 && docFiles.length === 0 && composerLinks.length === 0) return;

    // Append links at bottom
    if (composerLinks.length) {
      const linksHtml = composerLinks
        .map(u => `<div><a href="${u}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all" style="color:#2563eb;text-decoration:underline;">${u}</a></div>`)
        .join("");
      html = html ? `${html}<br/><div class="mt-2 space-y-1">${linksHtml}</div>` : `<div class="mt-2 space-y-1">${linksHtml}</div>`;
    }

    const { imgDescs, fileDescs } = await persistAttachments(imagePreviews, docFiles);

    const now = Date.now();
    const common = {
      authorId: user.id,
      authorType: "lecturer",
      author: `${user.title ? user.title + " " : ""}${user.name}`,
      authorPhoto: user.photoUrl,
      time: "Just now",
      createdAt: new Date().toISOString(),
      type: composerType,
      title,
      html,
      images: imgDescs,
      files: fileDescs,
      likes: 0, liked: false, comments: []
    };
    if (composerType === "Video") common.videoUrlOrId = videoId;

    if (toFaculty) {
      if (!targetYear) { alert(`Select "Year of Study" for ${facultyTerm.toLowerCase()} posts.`); return; }
      const audience = facultyYearAudienceKey({ university: user.university, faculty: user.faculty, year: targetYear });
      const newPost = {
        id: `lp${now}`,
        ...common,
        authorProgram: `${user.faculty} • ${targetYear}`,
        targetYear,
        audience
      };
      setPosts((p) => [newPost, ...p]);
      markNewSignal(audience, "lecturer");
    } else {
      if (selectedPrograms.length === 0 || !targetYear) {
        alert("Select one or more Academic Programs and a Year of Study.");
        return;
      }
      const multiGroupId = `mp_${now}_${Math.random().toString(36).slice(2,7)}`;
      const multiPrograms = selectedPrograms.slice();
      const newPosts = selectedPrograms.map((prog, idx) => {
        const audience = audienceKey({ university: user.university, faculty: user.faculty, program: prog, year: targetYear });
        markNewSignal(audience, "lecturer");
        return {
          id: `lp${now}_${idx}`,
          multiGroupId,
          multiPrograms,
          targetYear,
          ...common,
          authorProgram: prog,
          audience
        };
      });
      setPosts((p) => [...newPosts, ...p]);
    }

    // reset composer
    if (editorRef.current) editorRef.current.innerHTML = "";
    setComposerTitle("");
    setImagePreviews([]); setDocFiles([]);
    setComposerLinks([]);
    setComposerType("Notes");
    setToFaculty(false); setSelectedPrograms([]); setTargetYear("");
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

  const addComment = async (postId, text, images = [], files = []) => {
    if (!text.trim() && images.length === 0 && files.length === 0) return;
    const { imgDescs, fileDescs } = await persistAttachments(images, files);
    updatePostById(postId, (x) => ({
      ...x,
      comments: [
        ...(x.comments || []),
        {
          id: `c${Date.now()}`,
          author: `${user.title ? user.title + " " : ""}${user.name}`,
          authorPhoto: user.photoUrl,
          authorProgram: user.faculty,
          text: text.trim(),
          images: imgDescs,
          files: fileDescs,
          replies: [],
        },
      ],
    }));
  };

  const addReply = async (postId, commentId, text, images = [], files = []) => {
    if (!text.trim() && images.length === 0 && files.length === 0) return;
    const { imgDescs, fileDescs } = await persistAttachments(images, files);
    updatePostById(postId, (x) => ({
      ...x,
      comments: (x.comments || []).map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...(c.replies || []),
                {
                  id: `r${Date.now()}`,
                  author: `${user.title ? user.title + " " : ""}${user.name}`,
                  authorPhoto: user.photoUrl,
                  authorProgram: user.faculty,
                  text: text.trim(),
                  images: imgDescs,
                  files: fileDescs,
                },
              ],
            }
          : c
      ),
    }));
  };

  /* Delete post */
  const deletePost = (post) => {
    const ok = window.confirm("Delete this post for all students? This cannot be undone.");
    if (!ok) return;
    const key = post.multiGroupId || post.id;
    setPosts((p) =>
      post.multiGroupId ? p.filter(x => x.multiGroupId !== key) : p.filter(x => x.id !== key)
    );
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
    .filter(isMyPost)
    .filter((p) => (showFacultyOnly ? isFacultyAudienceForMe(p.audience) : true))
    .filter((p) => (filterType === "All" ? true : p.type === filterType));

  const filtered = mergeForLecturerView(filteredRaw);

  /* Latest lecturer video (from normal posts, not a separate store) */
  const latestLecturerVideo = useMemo(() => {
    const vids = posts.filter(p => isMyPost(p) && p.type === "Video" && p.videoUrlOrId);
    vids.sort((a,b) => (Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)));
    return vids[0] || null;
  }, [posts]); // eslint-disable-line

  /* UI helpers */
  const toggleProgram = (prog) =>
    setSelectedPrograms((arr) => (arr.includes(prog) ? arr.filter((p) => p !== prog) : [...arr, prog]));
  const selectAllPrograms = () => setSelectedPrograms(availablePrograms.slice(0, 200));
  const clearPrograms = () => setSelectedPrograms([]);

  /* ---- Layout ---- */
  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      {/* Keep total width tight and ensure equal margins on both sides */}
      <main className="max-w-[1280px] mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(720px,1fr)_280px] gap-6">
        {/* LEFT: Profile + filters */}
        <aside className="space-y-4">
          {/* Profile card */}
          <Card className="p-0 overflow-hidden">
            <div className="relative h-20 bg-slate-200">
              {user.bannerUrl ? (
                <img src={user.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-r from-indigo-200 to-purple-200" />
              )}
              <label className="absolute right-2 top-2 text-xs bg-white/80 px-2 py-1 rounded cursor-pointer border border-slate-100">
                Edit banner
                <input type="file" accept="image/*" className="hidden" onChange={onPickBanner} />
              </label>
            </div>

            <div className="px-4 pt-0 pb-4">
              <div className="-mt-8">
                <div className="inline-block relative">
                  <Avatar size="lg" url={user.photoUrl} name={user.name} online />
                  <label className="absolute -right-1 -bottom-1 bg-white text-[10px] px-1 py-0.5 rounded cursor-pointer border border-slate-100">
                    Edit
                    <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
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
                  <div className="mt-3 flex items-center gap-2">
                    <ToolbarButton onClick={() => exec("bold")} label="B" title="Bold" />
                    <ToolbarButton onClick={() => exec("italic")} label={<em>I</em>} title="Italic" />
                    <ToolbarButton onClick={addLink} label="🔗" title="Add link" />
                    <label className="ml-auto text-sm text-slate-600 cursor-pointer">
                      📷 Images
                      <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
                    </label>
                    <label className="text-sm text-slate-600 cursor-pointer">
                      📎 Files
                      <input type="file" multiple className="hidden" onChange={onPickDocs}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" />
                    </label>
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

                  {/* Image previews */}
                  {imagePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {imagePreviews.map((img, idx) => (
                        <div key={(img.dataUrl||img.name)+idx} className="relative">
                          <img src={img.dataUrl} alt={img.name} className="w-full h-32 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => setImagePreviews((arr) => arr.filter((_, i) => i !== idx))}
                            className="absolute right-1 top-1 bg-white/80 text-xs px-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Files list */}
                  {docFiles.length > 0 && (
                    <ul className="mt-2 text-sm text-slate-700 space-y-1">
                      {docFiles.map((d, i) => (
                        <li key={d.name + i} className="flex items-center gap-2">
                          📎 <span className="font-medium">{d.name}</span>
                          <button
                            type="button"
                            className="text-xs underline"
                            onClick={() => setDocFiles((arr) => arr.filter((_, idx) => idx !== i))}
                          >
                            remove
                          </button>
                        </li>
                      ))}
                    </ul>
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
            <p className="text-sm text-slate-600 mt-1 text-center">
              Weekly video: teaching resources and key deadlines.
            </p>
            <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-slate-100">
              {latestLecturerVideo?.videoUrlOrId ? (
                <YouTubeEmbed
                  idOrUrl={latestLecturerVideo.videoUrlOrId}
                  title={latestLecturerVideo.title || "Lecturer Updates"}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">
                  No video posted yet for lecturers.
                </div>
              )}
            </div>
            {latestLecturerVideo?.createdAt && (
              <div className="mt-2 text-xs text-slate-500 text-center">
                Posted {new Date(latestLecturerVideo.createdAt).toLocaleString()}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
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
          </Card>

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

/* ------------------- Post & Comments (with lightbox + attachments) ---------------------- */
function PostCard({ post, onToggleLike, onAddComment, onAddReply, onDelete, currentUser }) {
  const [showComments, setShowComments] = useState(true);
  const [cmt, setCmt] = useState("");
  const [cmtImages, setCmtImages] = useState([]); // [{name,dataUrl}]
  const [cmtFiles, setCmtFiles] = useState([]);   // [{name,mime,dataUrl}]

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
        <Avatar size="md" url={post.authorPhoto} name={post.author} />
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate">
            {displayWithTitle(post.author, currentUser?.title || "", currentUser?.name || "")}
          </div>
          <div className="text-xs text-slate-500">
            {programLabel || post.type} • {post.time} • {post.audience === "GLOBAL" ? "Public" : post.audience?.startsWith("FACULTY__") ? "Faculty" : (post.multiGroupId ? "Programs" : "Program")}
          </div>
        </div>
        <span className="ml-auto text-xs rounded-full border border-slate-100 px-2 py-0.5">{post.type}</span>
        {/* Delete button (author only) */}
        {currentUser?.id === post.authorId && (
          <button
            title="Delete post"
            onClick={onDelete}
            className="ml-2 text-slate-500 hover:text-red-600 rounded px-2 py-1"
          >
            🗑️
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
      {post.files?.length>0 && (
        <ul className="mt-2 text-sm text-slate-700 space-y-1">
          {post.files.map((f,i)=> (
            <li key={`${(f.id||f.name||"f")}-${i}`} className="flex items-center gap-2">
              📎 <AttachmentLink att={f} />
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
            onSubmit={(e)=>{ e.preventDefault(); 
              onAddComment(cmt, cmtImages, cmtFiles);
              setCmt(""); setCmtImages([]); setCmtFiles([]); }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-start gap-2">
              <Avatar size="sm" url={currentUser?.photoUrl} name={currentUser?.name || "Me"} online />
              <input
                value={cmt}
                onChange={(e) => setCmt(e.target.value)}
                placeholder="Write a comment…"
                className="flex-1 border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
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

function CommentThread({ comment, onAddReply }) {
  const [reply,setReply]=useState("");
  const [replyImages,setReplyImages]=useState([]); // [{name,dataUrl}]
  const [replyFiles,setReplyFiles]=useState([]);   // [{name,mime,dataUrl}]

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
          <div className="font-medium text-slate-800">{displayWithTitle(comment.author, "", "")}</div>
          <div className="text-xs text-slate-500 mb-1">{comment.authorProgram||""}</div>
          <ExpandableText text={comment.text}/>

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
      {replies.map((r) => (
        <div key={r.id} className="flex items-start gap-2">
          <Avatar size="sm" url={r.authorPhoto} name={r.author} />
          <div>
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
            onSubmit={(e)=>{ e.preventDefault(); onAddReply(reply, replyImages, replyFiles); setReply(""); setReplyImages([]); setReplyFiles([]); }}
            className="mt-2"
          >
            <div className="flex items-start gap-2">
              <input
                value={reply}
                onChange={(e)=>setReply(e.target.value)}
                placeholder="Write a reply…"
                className="flex-1 border border-slate-200 rounded-full px-3 py-1.5"
              />
              <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📷
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPickReplyImages}/>
              </label>
              <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📎
                <input type="file" multiple className="hidden" onChange={onPickReplyDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
              </label>
              {/* Reply button made visible with solid color distinct from Comment 'Post' */}
              <button className="rounded-full bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-emerald-700">
                Reply
              </button>
            </div>

            {(replyImages.length>0 || replyFiles.length>0) && (
              <div className="mt-2 space-y-2 pl-1">
                {replyImages.length>0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {replyImages.map((img,i)=>(
                      <div key={i} className="relative">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover rounded" />
                        <button
                          type="button"
                          className="absolute right-1 top-1 bg-white/90 rounded text-xs px-1"
                          onClick={()=> setReplyImages(prev => prev.filter((_,idx)=>idx!==i))}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {replyFiles.length>0 && (
                  <ul className="text-xs space-y-1">
                    {replyFiles.map((f,i)=>(
                      <li key={i} className="flex items-center gap-2">
                        📎<span>{f.name}</span>
                        <button type="button" className="text-xs underline" onClick={()=> setReplyFiles(prev => prev.filter((_,idx)=>idx!==i))}>remove</button>
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
function ExpandableText({ text, initialChars = 180 }) {
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