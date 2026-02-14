// src/pages/GlobalAcademicPlatform.jsx
import { useEffect, useMemo, useRef, useState, memo, forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";
import AttachmentUploader from "../components/upload/AttachmentUploader.jsx";
import { reportContent } from "../lib/moderationApi.js"; // adjust path
import { uploadFileToS3 } from "../lib/uploadLambda";
/*import {
  fetchPosts,
  createPost as createPostOnServer,
  deletePost as deletePostOnServer,
} from "../lib/postsApi.js";*/
import {
  fetchPosts,
  createPost as createPostOnServer,
  deletePost as deletePostOnServer,
  postCommentToServer,
  postReplyToServer,
} from "../lib/postsApi.js";



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
  return safeParse(sessionStorage.getItem("currentUser")) || safeParse(localStorage.getItem("currentUser"));
}

const timeAgo = (ts) => {
  const t = typeof ts === "number" ? ts : Date.parse(ts || "") || 0;
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const hashString = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(36);
};

/* ✅ ADD THESE HELPERS HERE (normalize + merge) */
function getUserByIdLocal(id) {
  if (!id) return null;
  const byId = safeParse(localStorage.getItem("usersById")) || {};
  if (byId[id]) return byId[id];
  const arr = safeParse(localStorage.getItem("users")) || [];
  return arr.find((u) => u.id === id || u.uid === id || u.userId === id) || null;
}
function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}
function normalizeAuthorSnapshot(p) {
  const authorId = pickFirst(p?.author?.id, p?.authorId, p?.author_id, p?.createdBy, p?.userId);

  const u = getUserByIdLocal(authorId);

  const name = pickFirst(p?.author?.name, p?.authorName, p?.author, u?.name);
  const title = pickFirst(p?.author?.title, p?.authorTitle, u?.title, u?.honorific, u?.prefix);
  const program = pickFirst(p?.author?.program, p?.authorProgram, u?.program);
  const university = pickFirst(p?.author?.university, p?.authorUniversity, u?.university);
  const faculty = pickFirst(p?.author?.faculty, p?.authorFaculty, u?.faculty, u?.college, u?.school, u?.department);
  const country = pickFirst(p?.author?.country, p?.authorCountry, u?.countryName, u?.country);
  const countryCode = pickFirst(p?.author?.countryCode, p?.authorCountryCode, u?.countryCode, u?.country_code);
  const photoUrl = pickFirst(
    p?.author?.photoUrl,
    p?.authorPhotoUrl,
    p?.authorAvatarUrl,
    p?.authorPhoto,
    p?.authorAvatar,
    u?.photoUrl
  );

  return {
    id: authorId || "",
    name: name || "User",
    title: title || "",
    program: program || "",
    university: university || "",
    faculty: faculty || "",
    country: country || "",
    countryCode: countryCode || "",
    photoUrl: photoUrl || "",
  };
}

function normalizePostShape(p) {
  const author = normalizeAuthorSnapshot(p);
  const postRole = String(p?.role ?? p?.authorRole ?? author?.role ?? "").toLowerCase().trim();

  const normalizeAtt = (a) => ({
    id: pickFirst(a?.id, a?._id, uid()),
    name: pickFirst(a?.name, a?.fileName, "file"),
    type: pickFirst(a?.type, a?.mime, ""),
    size: a?.size || 0,
    dataUrl: pickFirst(a?.dataUrl, a?.url, a?.href, ""),
    url: a?.url,
    href: a?.href,
  });

  // ✅ posts can come back as attachments OR images/files depending on backend shape
  const pAtts = Array.isArray(p?.attachments) ? p.attachments : [];
  const pImages = Array.isArray(p?.images) ? p.images : [];
  const pFiles = Array.isArray(p?.files) ? p.files : [];

  const mergedPostAtts = [
    ...pAtts.map(normalizeAtt),
    ...pImages.map((x) =>
      normalizeAtt({
        id: x?.id,
        name: x?.name,
        type: x?.mime || x?.type || "image/*",
        size: x?.size || 0,
        dataUrl: x?.dataUrl || x?.url || x?.href || "",
        url: x?.url,
        href: x?.href,
      })
    ),
    ...pFiles.map((x) =>
      normalizeAtt({
        id: x?.id,
        name: x?.name,
        type: x?.mime || x?.type || "application/octet-stream",
        size: x?.size || 0,
        dataUrl: x?.dataUrl || x?.url || x?.href || "",
        url: x?.url,
        href: x?.href,
      })
    ),
  ].filter((a) => a && (a.dataUrl || a.url || a.href));

  const keyAtt = (a) => String(a?.id || a?.dataUrl || a?.url || a?.href || a?.name || "");
  {
    const seen = new Set();
    // de-dupe post atts
    // (scoped block to avoid name collisions below)
    var attachments = mergedPostAtts.filter((a) => {
      const k = keyAtt(a);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // ✅ Change 1: rebuild comment attachments from attachments OR images/files
  const comments = Array.isArray(p?.comments)
    ? p.comments.map((c) => {
        const authorId = pickFirst(c?.authorId, c?.author_id, c?.userId, "");
        const html = pickFirst(c?.html, c?.bodyHtml, c?.textHtml, c?.text, "");
        const commentRole = String(c?.role ?? c?.authorRole ?? "").toLowerCase().trim();


        // ✅ stable fallback id (prevents reply editor closing + flicker)
        const stableFallbackId = `c_${hashString(
          `${pickFirst(c?.createdAt, "")}__${authorId}__${pickFirst(c?.parentId, "")}__${html}`
        )}`;

        // ✅ attachments may come back as attachments OR images/files depending on backend shape
        const cAtts = Array.isArray(c?.attachments) ? c.attachments : [];
        const cImages = Array.isArray(c?.images) ? c.images : [];
        const cFiles = Array.isArray(c?.files) ? c.files : [];

        const mergedCommentAtts = [
          ...cAtts.map(normalizeAtt),
          ...cImages.map((x) =>
            normalizeAtt({
              id: x?.id,
              name: x?.name,
              type: x?.mime || x?.type || "image/*",
              size: x?.size || 0,
              dataUrl: x?.dataUrl || x?.url || x?.href || "",
              url: x?.url,
              href: x?.href,
            })
          ),
          ...cFiles.map((x) =>
            normalizeAtt({
              id: x?.id,
              name: x?.name,
              type: x?.mime || x?.type || "application/octet-stream",
              size: x?.size || 0,
              dataUrl: x?.dataUrl || x?.url || x?.href || "",
              url: x?.url,
              href: x?.href,
            })
          ),
        ].filter((a) => a && (a.dataUrl || a.url || a.href));

        // ✅ de-dupe
        const seen = new Set();
        const dedupedCommentAtts = mergedCommentAtts.filter((a) => {
          const k = keyAtt(a);
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        return {
          ...c,
          id: pickFirst(c?.id, c?._id, stableFallbackId),
          parentId: c?.parentId ?? null,
          html,
          // ✅ ADD THIS FIELD INSIDE RETURN ✅
        role: commentRole,

          authorId,
          author: pickFirst(c?.author, c?.authorName, c?.author?.name, "User"),
          authorTitle: pickFirst(c?.authorTitle, c?.author?.title, ""),

          authorProgram: pickFirst(c?.authorProgram, c?.author?.program, ""),
          authorUniversity: pickFirst(c?.authorUniversity, c?.author?.university, c?.university, ""),
          authorFaculty: pickFirst(
            c?.authorFaculty,
            c?.author?.faculty,
            c?.faculty,
            c?.college,
            c?.school,
            c?.department,
            ""
          ),

          authorCountry: pickFirst(c?.authorCountry, c?.author?.country, c?.country, ""),
          authorCountryCode: pickFirst(c?.authorCountryCode, c?.author?.countryCode, c?.countryCode, c?.country_code, ""),
          authorPhoto: pickFirst(c?.authorPhoto, c?.authorAvatarUrl, c?.authorPhotoUrl, c?.author?.photoUrl, ""),

          createdAt: c?.createdAt || Date.now(),

          // ✅ normalized attachment list always available for UI
          attachments: dedupedCommentAtts,
        };
      })
    : [];

  return {
    ...p,
    id: pickFirst(p?.id, p?._id, uid()),
    createdAt: p?.createdAt || Date.now(),
    // ✅ IMPORTANT: server uses "html"; UI uses "bodyHtml"
    bodyHtml: pickFirst(p?.bodyHtml, p?.html, p?.body, ""),
    title: pickFirst(p?.title, "(No title)"),
    author,
    attachments,
    comments,
  };
}

function mergePreferRich(localP, remoteP) {
  const la = localP?.author || {};
  const ra = remoteP?.author || {};

  const mergedAuthor = {
    ...ra,
    name: ra.name?.trim() ? ra.name : la.name,
    title: ra.title?.trim() ? ra.title : la.title,
    program: ra.program?.trim() ? ra.program : la.program,
    university: ra.university?.trim() ? ra.university : la.university,
    faculty: ra.faculty?.trim() ? ra.faculty : la.faculty,
    country: ra.country?.trim() ? ra.country : la.country,
    countryCode: ra.countryCode?.trim() ? ra.countryCode : la.countryCode,
    photoUrl: ra.photoUrl?.trim() ? ra.photoUrl : la.photoUrl,
  };

  // --- merge comments: keep the richer snapshot (local wins when remote is missing fields)
  const lc = Array.isArray(localP?.comments) ? localP.comments : [];
  const rc = Array.isArray(remoteP?.comments) ? remoteP.comments : [];

  const keyOf = (c) => String(c?.id || c?._id || "");
  const byId = new Map();

  // start with remote
  for (const c of rc) {
    const k = keyOf(c);
    if (k) byId.set(k, { ...c, id: k });
  }

  // merge local on top (prefer fields that exist locally when remote is blank)
  for (const c of lc) {
    const k = keyOf(c);
    if (!k) continue;
    const existing = byId.get(k) || {};
    byId.set(k, {
      ...existing,
      ...c,
      id: k,
      // ✅ FIX: preserve role correctly
  role: c.role || existing.role || c.authorRole || existing.authorRole || "",


      // ✅ prefer the richer value (local wins when remote is blank)
      author: c.author?.trim() ? c.author : existing.author,
      authorTitle: c.authorTitle?.trim() ? c.authorTitle : existing.authorTitle,
      authorProgram: c.authorProgram?.trim() ? c.authorProgram : existing.authorProgram,
      authorUniversity: c.authorUniversity?.trim() ? c.authorUniversity : existing.authorUniversity,
      authorFaculty: c.authorFaculty?.trim() ? c.authorFaculty : existing.authorFaculty,
      authorCountry: c.authorCountry?.trim() ? c.authorCountry : existing.authorCountry,
      authorCountryCode: c.authorCountryCode?.trim() ? c.authorCountryCode : existing.authorCountryCode,
      authorPhoto: c.authorPhoto?.trim() ? c.authorPhoto : existing.authorPhoto,
    });
  }

  const mergedComments = Array.from(byId.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  return { ...remoteP, author: mergedAuthor, comments: mergedComments };
}

/* === Titles / Names (ensure lecturer titles show up) === */
const normalizeTitle = (t = "") => {
  const raw = String(t || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/\.$/, "");
  const map = { dr: "Dr.", prof: "Prof.", mr: "Mr.", mrs: "Mrs.", ms: "Ms.", engr: "Engr.", rev: "Rev." };
  return map[key] || raw; // keep custom titles as-is
};
const getUserTitle = (u) => u?.title || u?.honorific || u?.prefix || u?.designation || u?.roleTitle || u?.salutation || "";
const nameWithTitle = (name = "", title = "") => {
  const t = normalizeTitle(title);
  return t ? `${t} ${name || "User"}` : name || "User";
};

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

/* Notifications (per user) — with de-dupe (still local, but harmless) */
const NOTIF_KEY = (uidx) => `notif__${uidx}`;
function pushNotif(toUserId, notif) {
  if (!toUserId) return;
  const arr = safeParse(localStorage.getItem(NOTIF_KEY(toUserId))) || [];
  const key = notif.dedupeKey;
  if (key && arr.some((n) => n.dedupeKey === key)) return; // prevent duplicates
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

/* ============ UI bits ============ */
const Card = forwardRef(function Card({ className = "", children, square = false, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={`${square ? "rounded-none" : "rounded-2xl"} border border-slate-200 bg-white shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});

/* Minimal HeaderBar to match University page */
function HeaderBar({ title, square = false }) {
  return (
    <div
      className={`${square ? "rounded-none" : "rounded-t-2xl"} px-4 py-2.5 bg-[#7bdad1]/90 text-slate-900 text-sm font-semibold text-center`}
    >
      {title}
    </div>
  );
}

function Avatar({ url, name, size = "md", online = false }) {
  const sz = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const initials =
    (name || "User")
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";
  return (
    <div className={`relative ${sz} rounded-full bg-slate-300 overflow-hidden flex items-center justify-center shrink-0`}>
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-white text-xs bg-gradient-to-tr from-blue-500 to-indigo-500 h-full w-full flex items-center justify-center">
          {initials}
        </span>
      )}
      <span
        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${online ? "bg-green-500" : "bg-slate-300"}`}
      />
    </div>
  );
}

/* ===== Flag + AuthorMeta (flag image with emoji fallback) ===== */
function flagEmoji(cc) {
  if (!cc || typeof cc !== "string" || cc.length !== 2) return "";
  const code = cc.toUpperCase();
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}
function Flag({ code, label = "", size = 14, className = "" }) {
  const [err, setErr] = useState(false);
  const cc = (code || "").toLowerCase();
  if (!code || code.length !== 2) return null;
  if (err) {
    return (
      <span aria-label={`${label} flag`} title={label} className={className}>
        {flagEmoji(code)}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/w20/${cc}.png`}
      alt={`${label} flag`}
      width={Math.round(size * 1.33)}
      height={size}
      className={`inline-block align-[-2px] rounded-[2px] ${className}`}
      onError={() => setErr(true)}
      loading="lazy"
      decoding="async"
    />
  );
}

/*function AuthorMeta({ program, university, faculty, country, countryCode, createdAt }) {
  return (
    <span className="text-slate-500">
      {program && <> • {program}</>}
      {university && <> • {university}</>}
      {faculty && <> • {faculty}</>}

      {(country || countryCode) && (
        <>
          {" "}
          •{" "}
          <span className="inline-flex items-center gap-1">
            <Flag code={countryCode} label={country || countryCode} />
            <span>{country || countryCode}</span>
          </span>
        </>
      )}
      {createdAt && <> • {timeAgo(createdAt)} ago</>}
    </span>
  );
}*/
function AuthorMeta({ program, university, faculty, country, countryCode, createdAt }) {
  return (
    <span className="text-slate-500">
      {/* Program — make it stand out */}
      {/*{program && (
        <>
          {" "}
          •{" "}
          <span className="font-medium text-slate-700">
            {program}
          </span>
        </>
      )}*/}

      {/* University — dark blue, prominent */}
      {university && (
        <>
          {" "}
          •{" "}
          <span className="font-semibold text-blue-900">
            {university}
          </span>
        </>
      )}

      {/* Faculty / College / School — slightly softer dark blue */}
      {faculty && (
        <>
          {" "}
          •{" "}
          <span className="font-medium text-blue-800">
            {faculty}
          </span>
        </>
      )}

      {/* Country + flag — green, visually distinct */}
      {(country || countryCode) && (
        <>
          {" "}
          •{" "}
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <Flag code={countryCode} label={country || countryCode} />
            <span>{country || countryCode}</span>
          </span>
        </>
      )}

      {/* Time — more visible but still secondary */}
      {createdAt && (
        <>
          {" "}
          •{" "}
          <span className="text-slate-600">
            {timeAgo(createdAt)} ago
          </span>
        </>
      )}
    </span>
  );
}

/* ReadMore (sanitized display) */
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
    <div
      className="text-sm text-slate-800 force-ltr"
      dir="ltr"
      style={{ direction: "ltr", unicodeBidi: "plaintext", textAlign: "left", writingMode: "horizontal-tb" }}
    >
      <div
        ref={shellRef}
        className="prose prose-sm max-w-none [&_*]:!my-0 [&_ul]:list-disc [&_ol]:list-decimal"
        style={open ? { maxHeight: "none", overflow: "visible" } : undefined}
        dangerouslySetInnerHTML={{ __html: html || "" }}
      />
      {needs && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-blue-600 text-xs mt-1 underline">
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

/* ============ Attachments (support dataUrl OR url) ============ */
function attHref(a) {
  return a?.dataUrl || a?.url || a?.href || "";
}
function isImageAtt(a) {
  const t = String(a?.type || "");
  return t.startsWith("image/");
}


function extFromName(name = "") {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

function humanSize(bytes = 0) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
function fileKind(att) {
  const t = String(att?.type || "").toLowerCase();
  const ext = extFromName(att?.name || "");

  const isPdf = t.includes("pdf") || ext === "pdf";
  const isWord = t.includes("word") || ["doc", "docx"].includes(ext);
  const isExcel = t.includes("excel") || ["xls", "xlsx", "csv"].includes(ext);
  const isPpt = t.includes("powerpoint") || ["ppt", "pptx"].includes(ext);
  const isZip = t.includes("zip") || ["zip", "rar", "7z"].includes(ext);

  if (isPdf) return "pdf";
  if (isWord) return "word";
  if (isExcel) return "excel";
  if (isPpt) return "ppt";
  if (isZip) return "zip";
  return "file";
}

function FileIcon({ att }) {
  const k = fileKind(att);

  const base =
    "w-10 h-10 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shrink-0";
  const cls =
    k === "pdf"
      ? "bg-red-500"
      : k === "word"
      ? "bg-blue-600"
      : k === "ppt"
      ? "bg-orange-500"
      : k === "excel"
      ? "bg-emerald-600"
      : k === "zip"
      ? "bg-slate-600"
      : "bg-slate-400";

  const label =
    k === "pdf"
      ? "PDF"
      : k === "word"
      ? "W"
      : k === "ppt"
      ? "P"
      : k === "excel"
      ? "X"
      : k === "zip"
      ? "ZIP"
      : "FILE";

  return <div className={`${base} ${cls}`}>{label}</div>;
}




function AttachmentStrip({ atts = [], onPreview }) {
  if (!atts.length) return null;

  const images = atts.filter((a) => isImageAtt(a));
  const files = atts.filter((a) => !isImageAtt(a));

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <button
              key={img.id || attHref(img) || uid()}
              type="button"
              onClick={() => onPreview && onPreview(img)}
              className="relative group"
              title="Click to enlarge"
            >
              <img
                src={attHref(img)}
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
  <div className="mt-2 space-y-2">
    {files.map((f) => (
      <div key={f.id || attHref(f) || uid()} className="flex items-center gap-2">
        {/* smaller icon */}
        <div className="shrink-0 scale-[0.55] origin-left">
          <FileIcon att={f} />
        </div>

        {/* name + size close together */}
        <a
          href={attHref(f)}
          download={f.name}
          className="text-sm text-blue-700 underline truncate max-w-[55ch]"
          title={f.name}
        >
          {f.name}
        </a>

        <span className="text-xs text-slate-500">
          ({humanSize(f.size || 0)})
        </span>

        {/* download button (optional but nice) */}
        <a
          href={attHref(f)}
          download={f.name}
          className="ml-auto text-xs border border-slate-200 rounded-full px-2 py-1 hover:bg-slate-50"
          title="Download"
        >
          Download
        </a>
      </div>
    ))}
  </div>
)}
    </div>
  );
}



function AttachmentStripEditable({ atts = [], onRemove, onPreview }) {
  if (!atts.length) return null;

  const images = atts.filter((a) => isImageAtt(a));
  const files = atts.filter((a) => !isImageAtt(a));

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id || attHref(img) || uid()} className="relative">
              <button
                type="button"
                onClick={() => onPreview && onPreview(img)}
                title="Click to enlarge"
                className="w-full"
              >
                <img
                  src={attHref(img)}
                  alt={img.name}
                  className="w-full h-40 object-cover rounded"
                />
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
  <div className="space-y-2">
    {files.map((f) => (
      <div
        key={f.id || attHref(f) || uid()}
        className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2 bg-white"
      >
        <FileIcon att={f} />

        <a
          href={attHref(f)}
          download={f.name}
          className="text-sm text-blue-700 underline truncate flex-1 min-w-0"
          title={f.name}
        >
          {f.name}
        </a>

        <span className="text-xs text-slate-500 whitespace-nowrap">{humanSize(f.size || 0)}</span>

        <button
          type="button"
          onClick={() => onRemove(f.id)}
          className="ml-2 text-xs border border-slate-300 rounded px-2 py-0.5 hover:bg-slate-50"
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
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <img src={attHref(img)} alt={img.name} className="max-h-full max-w-full rounded shadow-lg" />
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
    "Internal Trade",
    "International Economics",
    "Labor Economics",
    "Macroeconomics",
    "Microeconomics",
    "Demad & Supply",
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
// ✅ Category → icon (no deps, safe)
const TOPIC_ICON_MAP = {
  Law: "⚖️",
  Engineering: "🛠️",
  Research_Topics: "🔬",
  "Natural sciences": "🧪",
  Sports: "🏅",
  "Business Studies": "💼",
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

function TopicChip({ category, onClick }) {
  if (!category) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      /*className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"*/
      /*className="inline-flex items-center gap-1 text-xs font-semibold text-purple-800 hover:text-purple-900 hover:underline"*/
      className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800 hover:bg-purple-100 hover:underline"
      title={`Filter by ${category}`}
    >
      <span aria-hidden="true">{getTopicIcon(category)}</span>
      <span>{category}</span>
    </button>
  );
}


const CATEGORIES = ["All", ...Object.keys(TOPIC_MAP)];

/* ============ LTR-SAFE PLAIN TEXT EDITOR (Markdown-lite) ============ */
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

/* helpers */
const escapeHtml = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function mdToSafeHtml(src = "") {
  let t = escapeHtml(src);

  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, a, b) => `<a href="${b}" target="_blank" rel="noopener">${a}</a>`);

  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/__(.+?)__/g, "<u>$1</u>");
  t = t.replace(/(^|[^\*])\*(?!\s)([^\*]+?)\*(?=[^\*]|$)/g, "$1<em>$2</em>");

  const lines = t.split("\n");
  let out = "";
  let inUl = false,
    inOl = false;
  const flushLists = () => {
    if (inUl) {
      out += "</ul>";
      inUl = false;
    }
    if (inOl) {
      out += "</ol>";
      inOl = false;
    }
  };
  for (const line of lines) {
    const ul = /^(\s*)([-*])\s+(.+)$/.exec(line);
    const ol = /^(\s*)(\d+)\.\s+(.+)$/.exec(line);
    if (ul) {
      if (!inUl) {
        flushLists();
        out += "<ul>";
        inUl = true;
      }
      out += `<li>${ul[3]}</li>`;
    } else if (ol) {
      if (!inOl) {
        flushLists();
        out += "<ol>";
        inOl = true;
      }
      out += `<li>${ol[3]}</li>`;
    } else {
      flushLists();
      out += line + "<br/>";
    }
  }
  flushLists();
  return out.replace(/(<br\/>)+$/, "");
}

function htmlToPlain(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll("a").forEach((a) => {
    a.replaceWith(a.textContent || "");
  });
  div.querySelectorAll("li").forEach((li) => {
    li.textContent = `- ${li.textContent}`;
  });
  const text = div.textContent || "";
  return text.replace(/\u00A0/g, " ");
}

const SafeTextEditor = memo(
  function SafeTextEditor({ html, onChange }) {
    const ref = useRef(null);
    const [text, setText] = useState(() => htmlToPlain(html || ""));

    useEffect(() => {
      const id = "safe-editor-ltr";
      if (!document.getElementById(id)) {
        const style = document.createElement("style");
        style.id = id;
        style.textContent = `
        .force-ltr, .force-ltr * {
          direction: ltr !important;
          unicode-bidi: plaintext !important;
          text-align: left !important;
          writing-mode: horizontal-tb !important;
        }
      `;
        document.head.appendChild(style);
      }
    }, []);

    useEffect(() => {
      onChange(mdToSafeHtml(text));
    }, [text, onChange]);

    const wrap = (pre, post = pre) => {
      const ta = ref.current;
      if (!ta) return;
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const before = value.slice(0, s);
      const sel = value.slice(s, e);
      const after = value.slice(e);
      const next = before + pre + sel + post + after;
      setText(next);
      requestAnimationFrame(() => {
        const pos = s + pre.length;
        ta.focus();
        ta.setSelectionRange(pos, pos + sel.length);
      });
    };

    const makeLink = () => {
      const url = prompt("Enter link URL (https://…):");
      if (!url) return;
      const ta = ref.current;
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const sel = value.slice(s, e) || url;
      const before = value.slice(0, s),
        after = value.slice(e);
      const next = `${before}[${sel}](${url})${after}`;
      setText(next);
      requestAnimationFrame(() => {
        const pos = before.length + 1;
        ta.focus();
        ta.setSelectionRange(pos, pos + sel.length);
      });
    };

    const toggleList = (ordered = false) => {
      const ta = ref.current;
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const startLine = value.lastIndexOf("\n", s - 1) + 1;
      const endLine = value.indexOf("\n", e);
      const end = endLine === -1 ? value.length : endLine;
      const block = value.slice(startLine, end);
      const marker = ordered ? "1. " : "- ";
      const lines = block
        .split("\n")
        .map((l) => (l.startsWith(marker) ? l : marker + l))
        .join("\n");
      const next = value.slice(0, startLine) + lines + value.slice(end);
      setText(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(startLine, startLine + lines.length);
      });
    };

    return (
      <div className="border border-slate-200 rounded">
        <div className="flex flex-wrap gap-1 p-1 border-b border-slate-200 bg-slate-50">
          <ToolbarButton onAction={() => wrap("**")} title="Bold">
            B
          </ToolbarButton>
          <ToolbarButton onAction={() => wrap("*")} title="Italic">
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton onAction={() => wrap("__")} title="Underline">
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton onAction={makeLink} title="Insert link">
            Link
          </ToolbarButton>
          <ToolbarButton onAction={() => toggleList(false)} title="Bulleted list">
            • List
          </ToolbarButton>
          <ToolbarButton onAction={() => toggleList(true)} title="Numbered list">
            1. List
          </ToolbarButton>
          <ToolbarButton onAction={() => setText("")} title="Clear formatting">
            Clear
          </ToolbarButton>
        </div>
        <textarea
          ref={ref}
          className="force-ltr min-h-[96px] max-h-[45vh] w-full resize-y px-3 py-2 text-sm outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type here…  (**bold**, *italic*, __underline__, [text](https://url), lists)"
          dir="ltr"
          spellCheck
          style={{
            direction: "ltr",
            unicodeBidi: "plaintext",
            textAlign: "left",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            writingMode: "horizontal-tb",
          }}
        />
      </div>
    );
  },
  (a, b) => a.html === b.html && a.onChange === b.onChange
);

/* Notifications tray */
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
                  className={`p-2 rounded border ${n.read ? "border-slate-100 bg-slate-50" : "border-blue-200 bg-blue-50"}`}
                >
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-slate-600">
                    by {n.by} • {timeAgo(n.createdAt)} ago
                  </div>
                  <div className="mt-2 flex items-center gap-2">
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

/* ================== “Golden” merge: prevent duplicates + preserve replies ================== */
function normalizePost(p) {
  const id = p?.id || p?._id || p?.postId || "";
  const createdAt = typeof p?.createdAt === "number" ? p.createdAt : Date.parse(p?.createdAt || "") || 0;
  const authorId = p?.author?.id || p?.authorId || "";
  const title = p?.title || "";
  const fallback = `p_${hashString(`${createdAt}__${authorId}__${title}`)}`;
  return {
    ...p,
    id: id || fallback,
    createdAt,
    comments: Array.isArray(p?.comments) ? p.comments : [],
    attachments: Array.isArray(p?.attachments) ? p.attachments : [],
  };
}
function mergeThreads(localList, remoteList) {
  const L = (Array.isArray(localList) ? localList : []).map(normalizePost);
  const R = (Array.isArray(remoteList) ? remoteList : []).map(normalizePost);

  const byId = new Map();
  for (const p of L) byId.set(p.id, p);

  for (const rp of R) {
    const lp = byId.get(rp.id);
    if (!lp) {
      byId.set(rp.id, rp);
      continue;
    }

    // Keep newest top-level fields, but preserve local-only flags
    const merged = {
      ...lp,
      ...rp,
      _liked: lp._liked ?? rp._liked,
      saved: lp.saved ?? rp.saved,
    };

    // Merge attachments by id/url/name
    const keyAtt = (a) => String(a?.id || a?.url || a?.href || a?.dataUrl || a?.name || "");
    const attMap = new Map();
    [...(rp.attachments || []), ...(lp.attachments || [])].forEach((a) => {
      const k = keyAtt(a);
      if (!k) return;
      if (!attMap.has(k)) attMap.set(k, a);
    });
    merged.attachments = Array.from(attMap.values());

    // Merge comments/replies by id
    const cMap = new Map();
    const addC = (c) => {
      if (!c) return;
      const cid = c.id || c._id || `c_${hashString(JSON.stringify(c))}`;
      if (!cMap.has(cid)) cMap.set(cid, { ...c, id: cid });
    };
    (rp.comments || []).forEach(addC);
    (lp.comments || []).forEach(addC);

    merged.comments = Array.from(cMap.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    byId.set(rp.id, merged);
  }

  const all = Array.from(byId.values());
  all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return all;
}








/* ✅ ADD THIS RIGHT HERE: flatten DynamoDB (comments + nested replies) into flat parentId list */
function flattenDdbThreadShape(comments = []) {
  const list = Array.isArray(comments) ? comments : [];
  if (!list.length) return [];

  const out = [];
  for (const c of list) {
    if (!c) continue;

    // push comment itself (strip nested replies to keep flat)
    out.push({ ...c, replies: [] });

    // if DynamoDB returns replies nested under comment.replies, flatten them
    const kids = Array.isArray(c.replies) ? c.replies : [];
    for (const r of kids) {
      if (!r) continue;
      out.push({
        ...r,
        parentId: r.parentId ?? c.id, // ✅ ensure parentId exists
        replies: [],
      });
    }
  }
  return out;
}



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

































function RolePill({ role }) {
  const r = String(role || "").toLowerCase();
  const isLect = r.includes("lecturer");
  const label = isLect ? "Lecturer" : "Student";
  const cls = isLect
    ? "bg-purple-50 text-purple-700 border-purple-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      {label}
    </span>
  );
}


/* ============ Page (GLOBAL) ============ */
export default function GlobalAcademicPlatform() {
  const navigate = useNavigate();
  const [user] = useState(() => loadActiveUser());
  const isLecturer = typeof user?.role === "string" && /lecturer/i.test(user.role || "");
  const userTitle = getUserTitle(user);
  const userDisplayName = nameWithTitle(user?.name, userTitle);

  // ✅ Global scope
  const SCOPE = "global-academic-platform";

  const [posts, setPosts] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);




  useEffect(() => {
    if (!user) navigate("/login?role=student", { replace: true });
    touchPresence(user?.id);
    const interval = setInterval(() => touchPresence(user?.id), 60_000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  // initial seed if server empty
  // initial seed if server empty  ✅ DISABLED (returns no posts)
const seeded = useMemo(() => {
  return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  // Fetch loop (prevents “local only” + reduces flicker by merging)
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const remote = await fetchPosts({ scope: SCOPE });
        if (!alive) return;

        const list = Array.isArray(remote) ? remote : remote?.posts || [];

        if (!list.length) {
          setPosts((prev) => (prev.length ? prev : seeded));
        } else {
        const remoteNorm = (list || []).map(normalizePostShape);
          
          setPosts((prev) => {
            const prevMap = new Map((prev || []).map((p) => [p.id, p]));
            const out = [];

            for (const rp of remoteNorm) {
              const lp = prevMap.get(rp.id);
              out.push(lp ? mergePreferRich(lp, rp) : rp);
              prevMap.delete(rp.id);
            }

            // keep purely-local posts that aren’t on server yet (optional)
            for (const leftover of prevMap.values()) out.push(leftover);

            // newest first
            out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const sig = (arr) =>
              (arr || [])
                .map((p) => `${p.id}:${p.createdAt}:${(p.comments || []).length}:${(p.attachments || []).length}`)
                .join("|");

            if (sig(out) === sig(prev)) return prev;

            return out;
          });
        }
      } catch (e) {
        // keep existing UI stable
        setPosts((prev) => (prev.length ? prev : seeded));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [SCOPE, seeded]);

  const postRefs = useRef({});

  /* Filters & UI state */
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("Top");
  const [myOnly, setMyOnly] = useState(false);

  /* Composer */
  const [editorOpen, setEditorOpen] = useState(false);
  const [askTitle, setAskTitle] = useState("");
  const [askBodyHtml, setAskBodyHtml] = useState("");
  /*const [askAtts, setAskAtts] = useState([]);*/
  const [askUploadAtts, setAskUploadAtts] = useState([]); // AttachmentUploader shape
  const askAtts = useMemo(
  () => (askUploadAtts || []).map(uploaderAttToUiAtt).filter(Boolean),
  [askUploadAtts]
);

  // local file read (keeps your existing behavior; backend can store URLs if you already upload elsewhere)
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




  // ✅ Paste screenshot into S3-backed attachments (same persistence as AttachmentUploader)
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


// Uses the SAME upload flow as AttachmentUploader
async function addPastedImagesToInlineUploadAtts(cb, setUploadAtts) {
  const items = cb?.items ? Array.from(cb.items) : [];
  const imageItems = items.filter((it) => it?.type && it.type.startsWith("image/"));
  if (imageItems.length === 0) return false;

  for (const it of imageItems) {
    const file = it.getAsFile();
    if (!file) continue;

    // Optional size guard (8MB)
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

    setUploadAtts((prev) => [...(Array.isArray(prev) ? prev : []), att]);
  }

  return true;
}



















  /*const onPickAskFiles = async (e) => {
    const chosen = await readFiles(e.target.files);
    setAskAtts((prev) => [...prev, ...chosen]);
    e.target.value = "";
  };*/
  /*onst removeAskAttachment = (id) => setAskAtts((prev) => prev.filter((a) => a.id !== id));*/
  const removeAskAttachment = (id) =>
  setAskUploadAtts((prev) => (prev || []).filter((a) => String(a.key || "") !== String(id)));

  // ✅ Change 2 helpers: send images + files to server (while keeping attachments)
  const isImageType = (t) => String(t || "").toLowerCase().startsWith("image/");
  const normServerAtt = (a) => ({
    id: pickFirst(a?.id, a?._id, uid()),
    name: pickFirst(a?.name, a?.fileName, "file"),
    type: pickFirst(a?.type, a?.mime, ""),
    mime: pickFirst(a?.mime, a?.type, ""),
    size: a?.size || 0,
    dataUrl: pickFirst(a?.dataUrl, a?.url, a?.href, ""),
    url: a?.url,
    href: a?.href,
  });
  const splitToImagesFiles = (atts = []) => {
    const arr = Array.isArray(atts) ? atts : [];
    const images = arr
      .filter((x) => isImageType(x?.type || x?.mime))
      .map((x) => ({
        id: x?.id,
        name: x?.name,
        mime: x?.type || x?.mime || "image/*",
        type: x?.type || x?.mime || "image/*",
        size: x?.size || 0,
        dataUrl: x?.dataUrl || x?.url || x?.href || "",
        url: x?.url,
        href: x?.href,
      }));
    const files = arr
      .filter((x) => !isImageType(x?.type || x?.mime))
      .map((x) => ({
        id: x?.id,
        name: x?.name,
        mime: x?.type || x?.mime || "application/octet-stream",
        type: x?.type || x?.mime || "application/octet-stream",
        size: x?.size || 0,
        dataUrl: x?.dataUrl || x?.url || x?.href || "",
        url: x?.url,
        href: x?.href,
      }));
    return { images, files };
  };




  function toServerComment(c) {
    const html = c?.html || "";

    // ✅ send attachments + images/files (some backends persist these separately)
    const baseAtts = Array.isArray(c?.attachments) ? c.attachments : [];
    const normAtts = baseAtts.map(normServerAtt);
    const { images, files } = splitToImagesFiles(normAtts);

    return {
      // ✅ identity/threading (MUST persist or replies vanish)
      id: c?.id,
      parentId: c?.parentId ?? null,
      createdAt: c?.createdAt || Date.now(),

      // ✅ content
      html,
      text: htmlToPlain(html),
      role: c?.role || "",
      authorRole: c?.authorRole || c?.role || "",

      // ✅ author identity
      authorId: c?.authorId || c?.author_id || c?.userId || "",
      authorName: c?.author || c?.authorName || "",
      author: c?.author || c?.authorName || "", // alias

      // ✅ author meta (keep + aliases)
      authorTitle: c?.authorTitle || "",
      authorProgram: c?.authorProgram || "",
      authorUniversity: c?.authorUniversity || "",
      authorFaculty: c?.authorFaculty || "",
      authorCountry: c?.authorCountry || "",
      authorCountryCode: c?.authorCountryCode || "",

      // ✅ photo (keep + aliases)
      authorPhoto: c?.authorPhoto || "",
      authorPhotoUrl: c?.authorPhoto || "", // alias
      authorAvatarUrl: c?.authorPhoto || "", // alias

      // ✅ attachments (both shapes)
      attachments: normAtts,
      images,
      files,
    };
  }

  function toServerPost(p) {
    const a = p?.author || {};
    const html = p?.bodyHtml || p?.html || "";

    const baseAtts = Array.isArray(p?.attachments) ? p.attachments : [];
    const normAtts = baseAtts.map(normServerAtt);
    const { images, files } = splitToImagesFiles(normAtts);

    return {
      scope: SCOPE,
      id: p?.id,
      title: p?.title || "(No title)",
      html,
      text: htmlToPlain(html),

      role: isLecturer ? "lecturer" : "student",
      category: p?.category,
      topic: p?.topic,
      createdAt: p?.createdAt || Date.now(),

      // ✅ attachments + images/files (safe extra fields; keeps old shape too)
      attachments: normAtts,
      images,
      files,

      comments: Array.isArray(p?.comments) ? p.comments.map(toServerComment) : [],

      // ✅ flat author snapshot (keep + aliases)
      authorId: a?.id || p?.authorId || "",
      authorName: a?.name || p?.authorName || "",
      authorTitle: a?.title || p?.authorTitle || "",
      authorProgram: a?.program || p?.authorProgram || "",

      authorPhoto: a?.photoUrl || p?.authorPhoto || "",
      authorPhotoUrl: a?.photoUrl || p?.authorPhoto || "", // alias
      authorAvatarUrl: a?.photoUrl || p?.authorPhoto || "", // alias

      authorCountry: a?.country || p?.authorCountry || "",
      authorCountryCode: a?.countryCode || p?.authorCountryCode || "",

      authorUniversity: a?.university || p?.authorUniversity || "",
      authorFaculty: a?.faculty || p?.authorFaculty || "",
    };
  }

  async function upsertPostToServer(postObj) {
    await createPostOnServer(toServerPost(postObj));
  }

  const postQuestion = async (e) => {
    e.preventDefault();
    const plain = (askBodyHtml || "").replace(/<[^>]+>/g, "").trim();
    if (!askTitle.trim() && !plain && askAtts.length === 0) return;

    const now = Date.now();
    const p = {
      id: uid(),
      title: askTitle.trim() || "(No title)",
      bodyHtml: askBodyHtml || "",
      category: selectedCategory === "All" ? "Current & Trending Topics" : selectedCategory,
      topic: selectedTopic === "All" ? "General" : selectedTopic,
      views: 0,
      likes: 0,
      saved: false,
      author: {
        id: user?.id,
        name: user?.name || "Student",
        title: userTitle || "",
        program: user?.program || "Program",
        photoUrl: user?.photoUrl || "",
        university: user?.university || user?.universityName || "",
        faculty: user?.faculty || user?.college || user?.school || "",
        country: user?.countryName || user?.country || "",
        countryCode: user?.countryCode || user?.country_code || "",
      },
      createdAt: now,
      attachments: askAtts,
      comments: [],
      scope: SCOPE,
    };

    // optimistic add (no flicker)
    setPosts((prev) => mergeThreads([p], prev));

    setAskTitle("");
    setAskBodyHtml("");
    /*setAskAtts([]);*/
    setAskUploadAtts([]);
    setEditorOpen(false);

    try {
      // keep your existing create payload, but include images/files too (harmless)
      const normAtts = (p.attachments || []).map((a) => ({
        id: a?.id,
        name: a?.name,
        type: a?.type,
        size: a?.size || 0,
        dataUrl: a?.dataUrl || a?.url || a?.href || "",
        url: a?.url,
        href: a?.href,
      }));
      const { images, files } = splitToImagesFiles(normAtts);

      await createPostOnServer({
        scope: SCOPE,
        id: p.id,
        title: p.title,
        text: htmlToPlain(p.bodyHtml || ""),
        html: p.bodyHtml || "",
        role: isLecturer ? "lecturer" : "student",
        category: p.category,
        topic: p.topic,
        authorId: p.author.id,
        authorName: p.author.name,
        authorTitle: p.author.title,
        authorProgram: p.author.program,
        authorPhoto: p.author.photoUrl,
        authorCountry: p.author.country,
        authorCountryCode: p.author.countryCode,
        authorUniversity: p.author.university,
        authorFaculty: p.author.faculty,
        attachments: normAtts,
        images,
        files,
        comments: p.comments,
        createdAt: p.createdAt,
      });
    } catch (err) {
      setToast("Post saved locally, but server sync failed. Check API/CORS.");
      setTimeout(() => setToast(""), 4000);
    }
  };






/*async function onReport({ itemType, itemId, postId, commentId="", replyId="" }) {
  const reason = prompt("Report reason? (harassment, spam, sexual, hate, misinformation, copyright, other)", "spam");
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
}*/

async function onReport({ itemType, itemId, postId, commentId = "", replyId = "" }) {
  const reason = prompt(
    "ScholarsKnowledge is committed to keeping our community safe and supportive by protecting users from misuse of the platform.\n\n" +
    "Report reason? (Scam,harassment,Extremism,sexual, hate, misinformation, copyright, other)",
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





  /* Interactions */
  const toggleLike = (id) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, likes: p._liked ? (p.likes || 0) - 1 : (p.likes || 0) + 1, _liked: !p._liked } : p
      )
    );
  const toggleSave = (id) => setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));

  const deletePost = async (id) => {
    // optimistic
    const before = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePostOnServer(id, { scope: SCOPE });
    } catch {
      // rollback if needed
      setPosts(before);
      setToast("Delete failed to sync. Check API/CORS.");
      setTimeout(() => setToast(""), 4000);
    }
  };

  function snapshotFromUser(u) {
    return {
      id: pickFirst(u?.id, u?.uid, u?.userId),
      name: pickFirst(u?.name, u?.fullName, u?.displayName),
      title: pickFirst(u?.title, u?.honorific, u?.prefix, u?.designation, u?.roleTitle, u?.salutation),
      program: pickFirst(u?.program, u?.programName, u?.academicProgram),
      university: pickFirst(u?.university, u?.universityName, u?.schoolUniversity),
      faculty: pickFirst(u?.faculty, u?.college, u?.school, u?.department, u?.facultyName),
      country: pickFirst(u?.countryName, u?.country, u?.nationality),
      countryCode: pickFirst(u?.countryCode, u?.country_code, u?.countryISO, u?.countryIso2),
      photo: pickFirst(u?.photoUrl, u?.profileImageUrl, u?.profilePhotoUrl, u?.avatarUrl, u?.authorAvatarUrl),
    };
  }

  const addAnswer = async (postId, textHtml, atts = []) => {
    const plain = (textHtml || "").replace(/<[^>]+>/g, "").trim();
    if (!plain && atts.length === 0) return;

    const snap = snapshotFromUser(user);

    const newComment = {
      id: uid(),
      parentId: null,
      html: textHtml || "",
      role: isLecturer ? "lecturer" : "student",
      authorRole: isLecturer ? "lecturer" : "student",

      authorId: snap.id || "",
      author: snap.name || "User",
      authorTitle: snap.title || "",
      authorProgram: snap.program || "",
      authorPhoto: snap.photo || "",

      authorUniversity: snap.university || "",
      authorFaculty: snap.faculty || "",
      authorCountry: snap.country || "",
      authorCountryCode: snap.countryCode || "",

      createdAt: Date.now(),
      attachments: atts,
    };

    let notifyTo = null;
    let postTitle = "";

    // optimistic update
    let updatedPost = null;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        if (p.author?.id && p.author.id !== user?.id) {
          notifyTo = p.author.id;
          postTitle = p.title;
        }
        const next = { ...p, comments: [...(p.comments || []), newComment] };
        updatedPost = next;
        return next;
      })
    );

    if (notifyTo) {
      const dedupeKey = `comment:${postId}:${user?.id}:${hashString(plain)}`;
      pushNotif(notifyTo, {
        dedupeKey,
        type: "comment",
        postId,
        title: `New comment on: ${postTitle}`,
        by: nameWithTitle(user?.name || "Student", userTitle),
        byUserId: user?.id,
      });
    }

    // persist whole post to server to avoid reply loss on refresh
    /*try {
      const p = updatedPost || posts.find((x) => x.id === postId);
      if (p) {
        await upsertPostToServer(p);

        // ✅ force a refresh so UI uses what server actually stored
        const remote = await fetchPosts({ scope: SCOPE });
        const list = Array.isArray(remote) ? remote : remote?.posts || [];
        const remoteNorm = (list || []).map(normalizePostShape);

        setPosts((prev) => {
          const prevMap = new Map((prev || []).map((x) => [x.id, x]));
          const out = [];

          for (const rp of remoteNorm) {
            const lp = prevMap.get(rp.id);
            out.push(lp ? mergePreferRich(lp, rp) : rp);
            prevMap.delete(rp.id);
          }
          for (const leftover of prevMap.values()) out.push(leftover);
          out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          return out;
        });
      }
    } catch {
      setToast("Comment saved locally, but server sync failed.");
      setTimeout(() => setToast(""), 4000);
    }*/

    // ✅ Persist comment to DynamoDB via dedicated endpoint
try {
  // normalize attachments to the shapes your API may store
  const normAtts = (newComment.attachments || []).map(normServerAtt);
  const { images, files } = splitToImagesFiles(normAtts);

  await postCommentToServer({
    postId,
    text: htmlToPlain(newComment.html || ""),
    html: newComment.html || "",

    authorId: newComment.authorId,
    authorName: newComment.author,
    authorProgram: newComment.authorProgram,
    authorPhoto: newComment.authorPhoto,
    authorRole: newComment.role,
    authorTitle: newComment.authorTitle,

    authorUniversity: newComment.authorUniversity,
    authorFaculty: newComment.authorFaculty,
    authorCountry: newComment.authorCountry,
    authorCountryCode: newComment.authorCountryCode,

    attachments: normAtts,
    images,
    files,
  });

  

  // ✅ refresh from server (source of truth)
  /*const remote = await fetchPosts({ scope: SCOPE });
  const list = Array.isArray(remote) ? remote : remote?.posts || [];
  const remoteNorm = (list || []).map(normalizePostShape);

  setPosts((prev) => {
    const prevMap = new Map((prev || []).map((x) => [x.id, x]));
    const out = [];

    for (const rp of remoteNorm) {
      const lp = prevMap.get(rp.id);
      out.push(lp ? mergePreferRich(lp, rp) : rp);
      prevMap.delete(rp.id);
    }
    for (const leftover of prevMap.values()) out.push(leftover);

    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  });
} catch (e) {
  console.error(e);
  setToast("Comment saved locally, but server sync failed.");
  setTimeout(() => setToast(""), 4000);
}*/

// ✅ refresh from server (source of truth)
const remote = await fetchPosts({ scope: SCOPE });
const list = Array.isArray(remote) ? remote : remote?.posts || [];
const remoteNorm = (list || []).map(normalizePostShape);

// ✅ IMPORTANT: do NOT merge with prev here; replace with server version
remoteNorm.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
setPosts(remoteNorm);
} catch (e) {
  console.error(e);
  setToast("Comment saved locally, but server sync failed.");
  setTimeout(() => setToast(""), 4000);
}
  };


  const addReply = async (postId, parentId, textHtml, atts = []) => {
    const plain = (textHtml || "").replace(/<[^>]+>/g, "").trim();
    if (!plain && atts.length === 0) return;

    const snap = snapshotFromUser(user);

    const newReply = {
      id: uid(),
      parentId,
      html: textHtml || "",
      role: isLecturer ? "lecturer" : "student",
      authorRole: isLecturer ? "lecturer" : "student",

      authorId: snap.id || "",
      author: snap.name || "User",
      authorTitle: snap.title || "",
      authorProgram: snap.program || "",
      authorPhoto: snap.photo || "",

      authorUniversity: snap.university || "",
      authorFaculty: snap.faculty || "",
      authorCountry: snap.country || "",
      authorCountryCode: snap.countryCode || "",

      createdAt: Date.now(),
      attachments: atts,
    };

    let notifyTo = null;
    let postTitle = "";

    let updatedPost = null;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        if (p.author?.id && p.author.id !== user?.id) {
          notifyTo = p.author.id;
          postTitle = p.title;
        }
        const next = { ...p, comments: [...(p.comments || []), newReply] };
        updatedPost = next;
        return next;
      })
    );

    if (notifyTo) {
      const dedupeKey = `reply:${postId}:${parentId}:${user?.id}:${hashString(plain)}`;
      pushNotif(notifyTo, {
        dedupeKey,
        type: "reply",
        postId,
        title: `New reply on: ${postTitle}`,
        by: nameWithTitle(user?.name || "Student", userTitle),
        byUserId: user?.id,
      });
    }

    /*try {
      const p = updatedPost || posts.find((x) => x.id === postId);

      if (p) {
        await upsertPostToServer(p);

        // ✅ force a refresh so UI uses what server actually stored
        const remote = await fetchPosts({ scope: SCOPE });
        const list = Array.isArray(remote) ? remote : remote?.posts || [];
        const remoteNorm = (list || []).map(normalizePostShape);

        setPosts((prev) => {
          const prevMap = new Map((prev || []).map((x) => [x.id, x]));
          const out = [];

          for (const rp of remoteNorm) {
            const lp = prevMap.get(rp.id);
            out.push(lp ? mergePreferRich(lp, rp) : rp);
            prevMap.delete(rp.id);
          }
          for (const leftover of prevMap.values()) out.push(leftover);
          out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          return out;
        });
      }
    } catch {
      setToast("Reply saved locally, but server sync failed.");
      setTimeout(() => setToast(""), 4000);
    }*/


    // ✅ Persist reply to DynamoDB via dedicated endpoint
try {
  const normAtts = (newReply.attachments || []).map(normServerAtt);
  const { images, files } = splitToImagesFiles(normAtts);

  await postReplyToServer({
    postId,
    commentId: parentId, // ✅ IMPORTANT: server needs the parent comment id
    text: htmlToPlain(newReply.html || ""),
    html: newReply.html || "",

    authorId: newReply.authorId,
    authorName: newReply.author,
    authorProgram: newReply.authorProgram,
    authorPhoto: newReply.authorPhoto,
    authorRole: newReply.role,
    authorTitle: newReply.authorTitle,

    authorUniversity: newReply.authorUniversity,
    authorFaculty: newReply.authorFaculty,
    authorCountry: newReply.authorCountry,
    authorCountryCode: newReply.authorCountryCode,

    attachments: normAtts,
    images,
    files,
  });

  

  // ✅ refresh from server (source of truth)
  /*const remote = await fetchPosts({ scope: SCOPE });
  const list = Array.isArray(remote) ? remote : remote?.posts || [];
  const remoteNorm = (list || []).map(normalizePostShape);

  setPosts((prev) => {
    const prevMap = new Map((prev || []).map((x) => [x.id, x]));
    const out = [];

    for (const rp of remoteNorm) {
      const lp = prevMap.get(rp.id);
      out.push(lp ? mergePreferRich(lp, rp) : rp);
      prevMap.delete(rp.id);
    }
    for (const leftover of prevMap.values()) out.push(leftover);

    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  });
} catch (e) {
  console.error(e);
  setToast("Reply saved locally, but server sync failed.");
  setTimeout(() => setToast(""), 4000);
}*/

const remote = await fetchPosts({ scope: SCOPE });
const list = Array.isArray(remote) ? remote : remote?.posts || [];
const remoteNorm = (list || []).map(normalizePostShape);

// ✅ Clean fix: replace state with server truth (prevents duplicate comment/reply flicker)
remoteNorm.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
setPosts(remoteNorm);
} catch (e) {
  console.error(e);
  setToast("Reply saved locally, but server sync failed.");
  setTimeout(() => setToast(""), 4000);
}


  };

  const FOL_KEY = `quora_global_follows__${user?.id || "anon"}`;
  const [follows, setFollows] = useState(() => safeParse(localStorage.getItem(FOL_KEY)) || {});
  useEffect(() => {
    localStorage.setItem(FOL_KEY, JSON.stringify(follows));
  }, [follows, FOL_KEY]);
  const followKey = (cat, topic) => `${cat}::${topic}`;
  const isFollowed = (cat, topic) => !!follows[followKey(cat, topic)];
  const toggleFollow = (cat, topic) => setFollows((prev) => ({ ...prev, [followKey(cat, topic)]: !prev[followKey(cat, topic)] }));

  /* Derived lists (GLOBAL — no university filter) */
  const visibleBase = posts;

  const visible = visibleBase
    .filter((p) => (myOnly ? p.author?.id === user?.id : true))
    .filter((p) => (!myOnly && selectedCategory !== "All" ? p.category === selectedCategory : true))
    .filter((p) => (!myOnly && selectedTopic !== "All" ? p.topic === selectedTopic : true))
    .filter((p) =>
      q
        ? String(p.title || "").toLowerCase().includes(q.toLowerCase()) || String(p.bodyHtml || "").toLowerCase().includes(q.toLowerCase())
        : true
    );

  const withCounts = visible.map((p) => {
    const answers = (p.comments || []).filter((c) => !c.parentId).length;
    return { ...p, _answers: answers };
  });

  let sorted = [...withCounts];
  if (sort === "Top") sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  if (sort === "Newest") sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (sort === "Answered") sorted.sort((a, b) => b._answers - a._answers || (b.createdAt || 0) - (a.createdAt || 0));

  /* Collapsible inline composer for comments/replies */
function InlineComposer({ placeholder = "Write a comment…", onSubmit, isOpen, setIsOpen }) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = typeof isOpen === "boolean" ? isOpen : openInternal;
  const setOpen = setIsOpen || setOpenInternal;

  const [html, setHtml] = useState("");

  // Attachments for THIS composer (comment/reply)
  const [uploadAtts, setUploadAtts] = useState([]);

  const atts = useMemo(
    () => (uploadAtts || []).map(uploaderAttToUiAtt).filter(Boolean),
    [uploadAtts]
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left border border-slate-200 rounded-full px-3 py-1.5 text-sm bg-white hover:bg-slate-50 force-ltr"
        dir="ltr"
        style={{ direction: "ltr", unicodeBidi: "plaintext", textAlign: "left", writingMode: "horizontal-tb" }}
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
      <AttachmentStripEditable
        atts={atts}
        onRemove={(id) =>
          setUploadAtts((prev) => (prev || []).filter((a) => String(a.key || "") !== String(id)))
        }
        onPreview={setPreview}
      />

      {/*<div className="mt-2">
        <SafeTextEditor html={html} onChange={setHtml} />
      </div>*/}

      <div
  className="mt-2"
  onPasteCapture={async (e) => {
    const cb = e.clipboardData || window.clipboardData;

    // Screenshot/image paste → upload + append to uploadAtts (persists after refresh)
    const handled = await addPastedImagesToInlineUploadAtts(cb, setUploadAtts);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }}
>
  <SafeTextEditor html={html} onChange={setHtml} />
</div>










      <div className="flex items-center gap-2 mt-2">
        <div className="mt-2">
          <AttachmentUploader
            value={uploadAtts}
            onChange={setUploadAtts}
            folder="global/posts"
            maxFiles={5}
            role={isLecturer ? "lecturer" : "student"}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50">Post</button>

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

  const answers = (post.comments || []).filter((c) => !c.parentId);
  const byParent = (post.comments || []).reduce((acc, c) => {
    if (c.parentId) (acc[c.parentId] ||= []).push(c);
    return acc;
  }, {});

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
                <Avatar
                  url={a.authorPhoto}
                  name={nameWithTitle(a.author, a.authorTitle)}
                  size="sm"
                  online={isOnline(a.authorId)}
                />

                {/* ✅ Header next to avatar; bubble is content only */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-slate-900">
                      {nameWithTitle(a.author, a.authorTitle)}
                    </span>
                    <RolePill role={a.role} />

                    <span className="text-[11px] text-slate-500">
                      <AuthorMeta
                        program={a.authorProgram}
                        university={a.authorUniversity}
                        faculty={a.authorFaculty}
                        country={a.authorCountry}
                        countryCode={a.authorCountryCode}
                        createdAt={a.createdAt}
                      />
                      <span className="text-slate-300">•</span>

                       <TopicChip
                      category={post.category}
                      onClick={() => {
                       setMyOnly(false);
                      setSelectedCategory(post.category || "All");
                       setSelectedTopic("All");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                     />
                    </span>
                  </div>

                  <div className="mt-1 bg-slate-50 rounded-2xl px-3 py-2 w-full">
                    <HTMLReadMore html={a.html} lines={3} />
                    <AttachmentStrip atts={a.attachments} onPreview={setPreview} />
                  </div>

                  {/* Replies */}
                  {(byParent[a.id] || []).map((r) => (
                    <div key={r.id} className="mt-3 pl-4 border-l border-slate-200">
                      <div className="flex items-start gap-2">
                        <Avatar
                          url={r.authorPhoto}
                          name={nameWithTitle(r.author, r.authorTitle)}
                          size="sm"
                          online={isOnline(r.authorId)}
                        />

                        {/* ✅ Reply header next to avatar; bubble is content only */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {nameWithTitle(r.author, r.authorTitle)}
                            </span>
                            <RolePill role={r.role} />

                            <span className="text-[11px] text-slate-500">
                              <AuthorMeta
                                program={r.authorProgram}
                                university={r.authorUniversity}
                                faculty={r.authorFaculty}
                                country={r.authorCountry}
                                countryCode={r.authorCountryCode}
                                createdAt={r.createdAt}
                              />
                            </span>
                          </div>

                          <div className="mt-1 bg-white rounded-2xl px-3 py-2 border border-slate-100 w-full">
                            <HTMLReadMore html={r.html} lines={3} />
                            <AttachmentStrip atts={r.attachments} onPreview={setPreview} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Reply composer */}
                  <div className="mt-2 pl-8 flex items-start gap-2">
                    <Avatar url={user?.photoUrl} name={userDisplayName} size="sm" online />
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
            <Avatar url={user?.photoUrl} name={userDisplayName} size="sm" online />
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

  const goBackToLecturer = () => {
    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/lecturer-dashboard");
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
              onClick={goBackToLecturer}
              title="Back to Lecturer Dashboard"
              className="hidden lg:flex items-center justify-center absolute left-2 top-6 h-9 w-9 rounded-full border border-slate-200 bg-white shadow hover:bg-slate-50 z-50"
              aria-label="Back to Lecturer Dashboard"
            >
              ←
            </button>
            <div className="lg:hidden px-3 pt-4">
              <button type="button" onClick={goBackToLecturer} className="inline-flex items-center gap-1 text-sm text-blue-700 underline">
                ← Back to Lecturer Dashboard
              </button>
            </div>
          </>
        )}
      </div>

      <div className="relative">
        {/*<main className="max-w-[1300px] mx-auto px-3 lg:px-5 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-5">*/}
        <main className="max-w-[1360px] mx-auto px-3 lg:px-5 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-5">
          {/* LEFT rail */}
          <aside className="space-y-4 pb-24">
            <Card square>
              <HeaderBar title="Global Academic Platform" square />
              <div className="p-4">
                <p className="text-xs text-slate-700 text-center">Accessible to all registered students and lecturers worldwide.</p>
              </div>
            </Card>

            <Card square>
              <HeaderBar title="My Posts" square />
              <div className="p-3">
                <button
                  onClick={() => setMyOnly((v) => !v)}
                  className={`w-full rounded px-3 py-1.5 text-sm ${myOnly ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-50"}`}
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
                      <div key={topicVal} className={`flex items-center gap-2 rounded px-2 py-1 ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                        <button className="text-left text-sm flex-1 truncate" onClick={() => setSelectedTopic(topicVal)} title={topicVal}>
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
          <section className="space-y-4">
            <Card>
              <div className="p-4">
                {!editorOpen ? (
                  <div className="flex items-center gap-3">
                    <Avatar url={user?.photoUrl} name={userDisplayName} size="md" online={true} />
                    <button
                      onClick={() => setEditorOpen(true)}
                      className="flex-1 text-left border border-slate-200 rounded-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-600 force-ltr"
                      dir="ltr"
                      style={{ direction: "ltr", unicodeBidi: "plaintext", textAlign: "left", writingMode: "horizontal-tb" }}
                    >
                      What do you want to post, ask or share?
                    </button>
                  </div>
                ) : (
                  <form onSubmit={postQuestion}>
                    <div className="flex items-start gap-3">
                      <Avatar url={user?.photoUrl} name={userDisplayName} size="md" online={true} />
                      <div className="flex-1 min-w-0">
                        <input
                          value={askTitle}
                          onChange={(e) => setAskTitle(e.target.value)}
                          placeholder="Add a title"
                          className="w-full border border-slate-200 rounded px-3 py-2 text-sm force-ltr"
                          dir="ltr"
                          style={{ direction: "ltr", unicodeBidi: "plaintext", textAlign: "left", writingMode: "horizontal-tb" }}
                        />
                        {/*<div className="mt-2">
                          <SafeTextEditor html={askBodyHtml} onChange={setAskBodyHtml}/>
                        </div>*/}

                          <div
  className="mt-2"
  onPasteCapture={async (e) => {
    const cb = e.clipboardData || window.clipboardData;

    // If screenshot/image is in clipboard → upload + append to askUploadAtts (persistent)
    const handled = await addPastedImagesToUploadAtts(cb, setAskUploadAtts);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }}
>
  <SafeTextEditor html={askBodyHtml} onChange={setAskBodyHtml} />


             
                        </div>
                        <AttachmentStripEditable atts={askAtts} onRemove={removeAskAttachment} onPreview={setPreview} />
                        <div className="mt-1">
                            <AttachmentUploader
    value={askUploadAtts}
    onChange={setAskUploadAtts}
    folder="global/posts"
    maxFiles={5}
    role={isLecturer ? "lecturer" : "student"}
  />
</div>
                        

                        <div className="mt-2 flex items-center gap-2">
                          {/*<label className="text-xs border border-slate-200 rounded-full px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                            📎 Attach images/files
                            <input type="file" className="hidden" multiple onChange={onPickAskFiles} />
                          </label>*/}
                          
  


                          <div className="ml-auto flex items-center gap-2">
                            <select
                              value={selectedCategory}
                              onChange={(e) => {
                                const c = e.target.value;
                                setSelectedCategory(c);
                                setSelectedTopic("All");
                              }}
                              className="border border-slate-200 rounded px-2 py-1 text-xs"
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
                              className="border border-slate-200 rounded px-2 py-1 text-xs"
                            >
                              {["All", ...(selectedCategory === "All" ? [] : TOPIC_MAP[selectedCategory] || [])].map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <button className="rounded-full bg-blue-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-blue-700">Post</button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditorOpen(false);
                                setAskTitle("");
                                setAskBodyHtml("");
                                /*setAskAtts([]);*/
                                setAskUploadAtts([]);
                              }}
                              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
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
              <div className="p-3 flex flex-wrap items-center gap-2">
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
                <div className="ml-auto">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search posts…"
                    className="w-72 max-w-[60vw] border border-slate-200 rounded px-3 py-1.5 text-sm force-ltr"
                    dir="ltr"
                    style={{ direction: "ltr", unicodeBidi: "plaintext", textAlign: "left", writingMode: "horizontal-tb" }}
                  />
                </div>
              </div>
            </Card>

            {loading && (
              <Card>
                <div className="p-4 text-sm text-slate-600">Loading posts…</div>
              </Card>
            )}

            {sorted.map((post) => (
              <Card key={post.id} className="p-0" ref={(el) => el && (postRefs.current[post.id] = el)}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar url={post.author?.photoUrl} name={nameWithTitle(post.author?.name, post.author?.title)} online={isOnline(post.author?.id)} />
                    <div className="min-w-0">
                      <div className="text-sm text-slate-500">
                        {/*<span className="font-semibold text-slate-900">{nameWithTitle(post.author?.name, post.author?.title)}</span>*/}
                        <span className="font-semibold text-slate-900">{nameWithTitle(post.author?.name, post.author?.title)}<RolePill role={post.role} /></span>
                        <AuthorMeta
                          program={post.author?.program}
                          university={post.author?.university}
                          faculty={post.author?.faculty}
                          country={post.author?.country}
                          countryCode={post.author?.countryCode}
                          createdAt={post.createdAt}
                        />
                      </div>
                      {/*<div className="text-xs text-slate-500">
                        {post.category} • {post.topic}
                      </div>*/}

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
  <span>{post.category}</span>
  <span className="text-slate-300">•</span>
  <span>{post.topic}</span>

  <span className="text-slate-300">•</span>

  <TopicChip
    category={post.category}
    onClick={() => {
      setMyOnly(false);
      setSelectedCategory(post.category || "All");
      setSelectedTopic("All");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
  />
</div>




                    </div>
                    {/*{post.author?.id === user?.id && (*/}
                      {(
  String(post.author?.id || post.authorId || "") &&
  [
    user?.id,
    user?.uid,
    user?.userId,
  ]
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
                    <div
                      className="text-lg font-semibold text-slate-900 force-ltr"
                      dir="ltr"
                      style={{ direction: "ltr", unicodeBidi: "plaintext", textAlign: "left", writingMode: "horizontal-tb" }}
                    >
                      {post.title}
                    </div>
                    {post.bodyHtml && <HTMLReadMore html={post.bodyHtml} lines={3} />}
                    <AttachmentStrip atts={post.attachments} onPreview={setPreview} />
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                    <button onClick={() => toggleLike(post.id)} className="rounded px-2 py-1 hover:bg-slate-50">
                      👍 Upvote {post.likes > 0 && <span className="text-slate-500">({post.likes})</span>}
                    </button>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700">{(post.comments || []).filter((c) => !c.parentId).length} Comments</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700">{post.views || 0} Views</span>
                    <button
                     type="button"
                  onClick={() => onReport({ itemType: "post", itemId: post.id, postId: post.id })}
                     className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                    >
                   🚩 Report
                    </button>

                    <button onClick={() => toggleSave(post.id)} className="ml-auto rounded px-2 py-1 hover:bg-slate-50">
                      {post.saved ? "★ Saved" : "☆ Save"}
                    </button>

                  </div>

                  <div className="mt-2">
                    <AnswerThread post={post} />
                  </div>
                </div>
              </Card>
            ))}
          </section>

          {/* RIGHT rail */}
          <aside className="space-y-4 pb-24">
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
                {Object.values(follows).filter(Boolean).length === 0 && <div className="text-slate-500">Follow topics from the left panel.</div>}
              </div>
            </Card>

            <Card square>
              <HeaderBar title="Community rules" square />
              <div className="p-4 text-sm text-slate-700">Be respectful. No harassment, plagiarism, or sharing of exam content. Cite sources when possible.</div>
            </Card>

            <Card square>
              <HeaderBar title="Academic Platforms' links" square />
              <div className="p-3 text-sm space-y-2 text-center">
                <Link to="/platform/university" className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50">
                  University Academic Platform
                </Link>

                {!isLecturer && (
                  <>
                    <Link to="/marketplace" className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50">
                      Student Market Place
                    </Link>
                    <Link to="/student-dashboard?tab=profile" className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50">
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
      </div>

      <NotificationTray userId={user?.id} onOpenPost={scrollToPost} />
      <Lightbox img={preview} onClose={() => setPreview(null)} />

      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-black/80 text-white text-sm px-4 py-2 rounded-full">{toast}</div>}
    </div>
  );
}