// src/pages/LecturerMessages.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getUserById } from "../lib/contactStore";

/* ----------------- small utils ----------------- */
function safeParse(j) {
  try {
    return JSON.parse(j || "");
  } catch {
    return null;
  }
}
function initials(s = "") {
  const [a = "", b = ""] = String(s).trim().split(/\s+/);
  return (a[0] || "L").toUpperCase() + (b[0] || "K").toUpperCase();
}
function fmt(ts) {
  const d = new Date(ts ?? Date.now());
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr || []) {
    const key = String(v || "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function stableUserId(u) {
  if (!u) return "";
  const id = String(u.id || u.uid || u.userId || "").trim();
  if (id) return id;
  const email = String(u.email || u.mail || "").trim().toLowerCase();
  return email ? `email:${email}` : "";
}

// ✅ Add once near other utils (you already have it here)
function userPhoto(u) {
  return (
    u?.photoUrl ||
    u?.photoURL ||
    u?.photo ||
    u?.profile?.photoUrl ||
    u?.profile?.photo ||
    ""
  );
}

/* ----------------- API base ----------------- */
const RAW_CONTACTS_BASE =
  (import.meta.env.VITE_CONTACTS_API_BASE &&
    String(import.meta.env.VITE_CONTACTS_API_BASE).trim()) ||
  (import.meta.env.VITE_POSTS_API_BASE &&
    String(import.meta.env.VITE_POSTS_API_BASE).trim()) ||
  "http://localhost:5003";

const CONTACTS_BASE = RAW_CONTACTS_BASE.replace(/\/+$/, "");

/* ✅ Users API (source of truth for cross-browser profile cards) */
const USERS_API_URL =
  (import.meta.env.VITE_USERS_API_BASE &&
    String(import.meta.env.VITE_USERS_API_BASE).trim().replace(/\/+$/, "") +
      "/api/users") ||
  "https://eovdrymvq3.execute-api.us-east-1.amazonaws.com/api/users";

function buildContactsUrl(path, params) {
  const rel = String(path || "");
  const prefixed = rel.startsWith("/") ? rel : `/${rel}`;
  const url = new URL(CONTACTS_BASE + prefixed);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function apiFetchJson(url, options) {
  const res = await fetch(url, {
    method: "GET",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { ok: false, error: text || "Non-JSON response" };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function fetchLecturerThreadsOne(lecturerId) {
  const url = buildContactsUrl("/api/contacts/threads", { lecturerId });
  return apiFetchJson(url);
}

async function fetchConversation(studentId, lecturerId, threadId) {
  const url = buildContactsUrl("/api/contacts/conversation", {
    studentId,
    lecturerId,
    threadId,
  });
  return apiFetchJson(url);
}

async function postContactMessage(payload) {
  const url = buildContactsUrl("/api/contacts/message");
  return apiFetchJson(url, { method: "POST", body: JSON.stringify(payload) });
}

/* ----------------- Avatar ----------------- */
function Avatar({ url, name, size = "md" }) {
  const cls =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  return (
    <div
      className={`${cls} rounded-full overflow-hidden bg-slate-300 flex items-center justify-center shrink-0`}
    >
      {url ? (
        <img src={url} alt={name || "U"} className="h-full w-full object-cover" />
      ) : (
        <div className="text-white text-sm bg-gradient-to-tr from-indigo-500 to-purple-500 h-full w-full flex items-center justify-center">
          {initials(name || "Lecturer")}
        </div>
      )}
    </div>
  );
}

/* ----------------- IndexedDB helpers (download) ----------------- */
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
async function idbGet(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
}

/* ---------- generic IDB reader for any db/store (fallbacks) ---------- */
async function idbGetFrom(dbName, storeName, key) {
  try {
    const req = indexedDB.open(dbName, 1);
    const db = await new Promise((resolve, reject) => {
      req.onupgradeneeded = (e) => {
        const db2 = e.target.result;
        if (!db2.objectStoreNames.contains(storeName))
          db2.createObjectStore(storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return await new Promise((res, rej) => {
      const tx = db.transaction(storeName, "readonly");
      const g = tx.objectStore(storeName).get(key);
      g.onsuccess = () => res(g.result || null);
      g.onerror = () => rej(g.error);
    });
  } catch {
    return null;
  }
}

/* ---------- Resolve file to URL + meta (size/type) ---------- */
function formatBytes(bytes = 0) {
  if (!bytes || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n % 1 === 0 ? n : n.toFixed(1)} ${units[i]}`;
}
function bytesFromDataUrl(dataUrl) {
  try {
    const b64 = String(dataUrl || "").split(",")[1] || "";
    const pad = (b64.match(/=+$/) || [""])[0].length;
    return Math.max(0, (b64.length * 3) / 4 - pad);
  } catch {
    return 0;
  }
}
function extFromName(name = "") {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/i);
  return m ? m[1] : "";
}
function typeLabelFrom(mime = "", name = "") {
  if (mime) {
    const t = mime.toLowerCase();
    if (t.startsWith("application/")) {
      if (t.includes("pdf")) return "PDF";
      if (t.includes("msword") || t.includes("wordprocessingml")) return "DOCX";
      if (t.includes("excel") || t.includes("spreadsheetml")) return "XLSX";
      if (t.includes("powerpoint") || t.includes("presentationml")) return "PPTX";
      const ext = extFromName(name);
      return ext ? ext.toUpperCase() : "FILE";
    }
    if (t.startsWith("image/")) return "IMG";
    if (t.startsWith("text/")) return "TXT";
    const ext = extFromName(name);
    return ext ? ext.toUpperCase() : t.split("/")[1]?.toUpperCase() || "FILE";
  }
  const ext = extFromName(name);
  return ext ? ext.toUpperCase() : "FILE";
}
function dataURLtoBlob(dataUrl) {
  try {
    const [hdr, b64] = String(dataUrl).split(",");
    const mime =
      (hdr.match(/data:(.*?);base64/) || [, "application/octet-stream"])[1];
    const bin = atob(b64 || "");
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return new Blob([], { type: "application/octet-stream" });
  }
}
async function fetchBlobForFile(file) {
  if (!file) return null;
  if (file.id) {
    let blob = await idbGet(file.id); // lecturer-side store
    if (!blob)
      blob = await idbGetFrom("sk_contact_files", "contactFiles", file.id); // student-side store
    if (blob) return blob;
  }
  if (file.dataUrl) return dataURLtoBlob(file.dataUrl);
  return null;
}
function useAttachmentUrlAndMeta(file) {
  const [state, setState] = useState({
    url: null,
    size: 0,
    mime: file?.mime || "",
    name: file?.name || "",
  });
  useEffect(() => {
    let revoke = null,
      cancelled = false;
    (async () => {
      const name = file?.name || "";
      const mimeHint = file?.mime || "";
      const blob = await fetchBlobForFile(file);
      if (!cancelled && blob) {
        const url = URL.createObjectURL(blob);
        revoke = url;
        setState({ url, size: blob.size || 0, mime: blob.type || mimeHint, name });
        return;
      }
      if (!cancelled && file?.dataUrl) {
        const bytes = bytesFromDataUrl(file.dataUrl);
        setState({ url: file.dataUrl, size: bytes, mime: mimeHint, name });
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [file?.id, file?.dataUrl, file?.mime, file?.name]);
  const sizeLabel = state.size ? formatBytes(state.size) : "";
  const typeLabel = typeLabelFrom(state.mime, state.name);
  return { ...state, sizeLabel, typeLabel };
}
async function downloadOneAttachment(file) {
  const blob = await fetchBlobForFile(file);
  if (!blob && !file?.dataUrl && !file?.url) {
    alert("Could not retrieve file. It may be missing in this browser's storage.");
    return;
  }
  let url;
  if (blob) url = URL.createObjectURL(blob);
  else url = file?.dataUrl || file?.url;
  const a = document.createElement("a");
  a.href = url;
  a.download = file?.name || "attachment";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (blob && url.startsWith("blob:")) URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}
async function downloadAllAttachments(files = []) {
  for (const f of files) {
    await downloadOneAttachment(f);
    await new Promise((res) => setTimeout(res, 120));
  }
}

/* -------- paragraph-preserving expandable text -------- */
function ExpandableText({ text, initialLines = 10 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [tooLong, setTooLong] = useState(false);
  useEffect(() => {
    if (ref.current) {
      const lh = parseFloat(getComputedStyle(ref.current).lineHeight || "20");
      const max = lh * initialLines;
      setTooLong(ref.current.scrollHeight > max + 2);
    }
  }, [text, initialLines, open]);
  return (
    <div>
      <div
        ref={ref}
        className="text-[15px] leading-6 text-slate-800 whitespace-pre-line break-words"
        style={
          open
            ? {}
            : {
                display: "-webkit-box",
                WebkitLineClamp: initialLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {text}
      </div>
      {tooLong && (
        <button
          className="mt-1 text-blue-600 text-sm hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

/* ----------------- RichComposer (same as yours) ----------------- */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
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
async function makeThumb(dataUrl, maxW = 360, maxH = 360, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.round(img.width * r),
        h = Math.round(img.height * r);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
function dataURLtoBlobForComposer(dataUrl) {
  const [hdr, b64] = dataUrl.split(",");
  const mime =
    (hdr.match(/data:(.*?);base64/) || [, "application/octet-stream"])[1];
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
/*function RichComposer({ value, onChange, onPickImages, onPickFiles, onSubmit }) {*/
function RichComposer({ value, onChange, images = [], files = [], onPickImages, onPickFiles, onSubmit }) {
  const taRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  const autosize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, expanded ? 600 : 220);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > next ? "auto" : "hidden";
  };
  useEffect(() => {
    if (taRef.current) autosize(taRef.current);
  }, [value, expanded]);

  const onPaste = async (e) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items || []);
    const imgs = items.filter((i) => i.type?.startsWith("image/"));
    if (!imgs.length) return;
    e.preventDefault();
    const files = await Promise.all(imgs.map((i) => i.getAsFile()).filter(Boolean));
    const mapped = await Promise.all(
      files.map(async (f) => {
        const dataUrl = await readFileAsDataURL(f);
        const blob = dataURLtoBlobForComposer(dataUrl);
        const id = `att_img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await idbSet(id, blob);
        const thumb = await makeThumb(dataUrl, 360, 360, 0.72);
        return { id, name: f.name || "image.jpg", mime: blob.type, thumb, dataUrl };
      })
    );
    onPickImages && onPickImages(mapped);
  };

  const pickImages = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    const mapped = await Promise.all(
      files.map(async (f) => {
        const dataUrl = await readFileAsDataURL(f);
        const blob = dataURLtoBlobForComposer(dataUrl);
        const id = `att_img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await idbSet(id, blob);
        const thumb = await makeThumb(dataUrl, 360, 360, 0.72);
        return { id, name: f.name || "image.jpg", mime: blob.type, thumb, dataUrl };
      })
    );
    onPickImages && onPickImages(mapped);
    e.target.value = "";
  };

  const pickDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = await Promise.all(
      files.map(async (f) => {
        const dataUrl = await readFileAsDataURL(f);
        const blob = dataURLtoBlobForComposer(dataUrl);
        const id = `att_file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await idbSet(id, blob);
        /*return { id, name: f.name || "file", mime: blob.type || f.type || "application/octet-stream" };*/

        return {id,name: f.name || "file",mime: blob.type || f.type || "application/octet-stream",dataUrl, // ✅ needed so it can be sent to Lambda (like images)
};
      
      })
    );
    onPickFiles && onPickFiles(mapped);
    e.target.value = "";
  };

  return (
    <div className={`border rounded-xl bg-white ${expanded ? "p-3" : "p-2"} relative`}>
      <textarea
        ref={taRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        placeholder="Write your reply…"
        className="w-full resize-none outline-none text-[15px] leading-6"
      />

      {/* ✅ INSERT THIS PREVIEW BLOCK RIGHT HERE (between textarea and the buttons row) */}
    {(images?.length > 0 || files?.length > 0) && (
      <div className="mt-2 space-y-2">
        {images?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {images.map((img, i) => (
              <img
                key={(img.id || "img") + i}
                src={img.dataUrl || img.thumb}
                alt={img.name || "image"}
                className="w-full h-24 object-cover rounded"
              />
            ))}
          </div>
        )}

        {files?.length > 0 && (
          <ul className="text-sm text-slate-700 space-y-1">
            {files.map((f, i) => (
              <li key={(f.id || "file") + i} className="flex items-center gap-2">
                📎 <span className="truncate">{f.name || "file"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}

   



      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="px-2 py-1 border border-slate-200 rounded cursor-pointer text-sm">
            📷 Images
            <input type="file" accept="image/*" multiple className="hidden" onChange={pickImages} />
          </label>
          <label className="px-2 py-1 border border-slate-200 rounded cursor-pointer text-sm">
            📎 Files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={pickDocs}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title={expanded ? "Collapse editor" : "Expand editor"}
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-slate-200 w-7 h-7 flex items-center justify-center text-slate-600"
          >
            {expanded ? "˅" : "^"}
          </button>
          <button
            onClick={onSubmit}
            className="rounded-full bg-blue-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------- File badge + download -------- */
function FileDownload({ file }) {
  const { url: localUrl, sizeLabel, typeLabel } = useAttachmentUrlAndMeta(file);
  const url = file?.url || localUrl || file?.dataUrl || null;

  return (
    <li className="flex items-center gap-2">
      📎
      {url ? (
        <>
          <a
            href={url}
            download={file.name || "file"}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            title="Download file"
          >
            {file.name || "file"}
          </a>
          {(typeLabel || sizeLabel) && (
            <span className="ml-2 text-[11px] text-slate-600 rounded-full border border-slate-200 px-2 py-0.5">
              {typeLabel}
              {sizeLabel ? ` • ${sizeLabel}` : ""}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="text-slate-400">{file.name || "file"}</span>
          {(typeLabel || sizeLabel) && (
            <span className="ml-2 text-[11px] text-slate-600 rounded-full border border-slate-200 px-2 py-0.5">
              {typeLabel}
              {sizeLabel ? ` • ${sizeLabel}` : ""}
            </span>
          )}
        </>
      )}
      <button
        type="button"
        className="text-xs underline ml-2"
        onClick={() => downloadOneAttachment(file)}
        title="Download"
      >
        Download
      </button>
    </li>
  );
}

/* ----------------- MessageBubble ----------------- */
function MessageBubble({ msg, student, lecturer, onImageClick }) {
  const isLect = msg.authorRole === "lecturer";
  const who = isLect ? lecturer : student;

  const name = isLect
    ? `${lecturer?.title ? lecturer.title + " " : ""}${lecturer?.name || "Lecturer"}`
    : student?.name || "Student";

  const subline = isLect ? lecturer?.title || "Lecturer" : student?.program || "";
  const hasMultipleFiles = Array.isArray(msg.files) && msg.files.length > 1;

  const imgSrc = (img) => img?.url || img?.dataUrl || img?.thumb;
  const fileName = (f) => f?.name || "file";

  return (
    <div className="flex items-start gap-3">
      <Avatar url={userPhoto(who)} name={name} size="sm" />
      <div className="min-w-0">
        <div className="text-[13px] text-slate-500 flex items-center gap-2">
          <span className="font-semibold text-slate-900">{name}</span>
          {subline && <span>• {subline}</span>}
          <span>• {fmt(msg.createdAt)}</span>
        </div>

        <div
          className={`mt-1 rounded-2xl px-3 py-2 ${
            isLect
              ? "bg-[#ECF9FE] border border-sky-100"
              : "bg-slate-50 border border-slate-100"
          }`}
        >
          {msg.text && <ExpandableText text={msg.text} />}

          {Array.isArray(msg.images) && msg.images.length > 0 && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {msg.images.map((img, i) => (
                <img
                  key={(img.id || img.name || "img") + i}
                  src={imgSrc(img)}
                  alt={img.name || "image"}
                  className="w-full h-32 object-cover rounded cursor-zoom-in"
                  onClick={() => onImageClick && onImageClick(msg.images, i)}
                />
              ))}
            </div>
          )}

          {Array.isArray(msg.files) && msg.files.length > 0 && (
            <div className="mt-2">
              {hasMultipleFiles && (
                <div className="mb-2">
                  <button
                    type="button"
                    className="text-xs rounded border border-slate-200 px-2 py-0.5 hover:bg-slate-50"
                    onClick={() => downloadAllAttachments(msg.files)}
                    title="Download all attachments"
                  >
                    Download all
                  </button>
                </div>
              )}

              <ul className="text-sm text-slate-700 space-y-1">
                {msg.files.map((f, i) => (
                  <FileDownload key={i} file={{ ...f, name: fileName(f) }} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Main ----------------- */
export default function LecturerMessages() {
  const loadMe = () => {
    const u =
      safeParse(sessionStorage.getItem("currentUser")) ||
      safeParse(localStorage.getItem("currentUser")) ||
      {};

    return {
      ...u,
      photoUrl: u.photoUrl || u.profile?.photoUrl || u.profile?.photo || "",
    };
  };

  const [lecturer, setLecturer] = useState(() => loadMe());
  useEffect(() => {
    const onU = () => setLecturer(loadMe());
    window.addEventListener("user:updated", onU);
    return () => window.removeEventListener("user:updated", onU);
  }, []);

  /* ✅ Load users once so student cards resolve consistently across browsers */
  const [usersByUid, setUsersByUid] = useState({});
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(USERS_API_URL, {
          headers: { "content-type": "application/json" },
        });
        const text = await res.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        const list = Array.isArray(data?.users) ? data.users : [];
        const map = {};

        for (const u of list) {
          const uid = String(u?.uid || u?.id || u?.userId || "").trim();
          if (uid) map[uid] = u;

          const email = String(u?.email || "").trim().toLowerCase();
          if (email) map[`email:${email}`] = u;
        }

        if (!cancelled) setUsersByUid(map);
      } catch {
        // silent; we still have thread/local fallbacks
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /// ✅ Canonical lecturerId (must match student side & backend)
  const lecturerIdCandidates = useMemo(() => {
    const ids = new Set();

    if (lecturer?.uid) ids.add(String(lecturer.uid).trim());
    if (lecturer?.id) ids.add(String(lecturer.id).trim());

    const email = String(lecturer?.email || "").trim().toLowerCase();
    if (email) ids.add(`email:${email}`);

    return Array.from(ids);
  }, [lecturer?.uid, lecturer?.id, lecturer?.email]);

  const [loadingThreads, setLoadingThreads] = useState(false);
  const [threads, setThreads] = useState([]);
  const [threadsErr, setThreadsErr] = useState("");
  const hasLoadedOnceRef = useRef(false);

  const reloadThreads = async ({ silent = false } = {}) => {
    if (!lecturerIdCandidates.length) return;

    if (!silent && !hasLoadedOnceRef.current) {
      setLoadingThreads(true);
      setThreadsErr("");
    }

    try {
      const all = [];
      for (const lid of lecturerIdCandidates) {
        try {
          const data = await fetchLecturerThreadsOne(lid);
          const list = Array.isArray(data?.threads) ? data.threads : [];
          for (const t of list) all.push(t);
        } catch {
          // ignore one id failing; we only need one to work
        }
      }

      const byId = new Map();
      for (const t of all) {
        if (!t?.id) continue;
        const prev = byId.get(t.id);
        if (!prev) byId.set(t.id, t);
        else {
          const a = prev.lastUpdated || 0;
          const b = t.lastUpdated || 0;
          if (b > a) byId.set(t.id, t);
        }
      }

      const merged = Array.from(byId.values());

      setThreads((prev) => {
        const prevKey = (prev || [])
          .map((x) => `${x.id}:${x.lastUpdated || 0}`)
          .join("|");
        const nextKey = (merged || [])
          .map((x) => `${x.id}:${x.lastUpdated || 0}`)
          .join("|");
        return prevKey === nextKey ? prev : merged;
      });

      hasLoadedOnceRef.current = true;

      /*if (!silent && merged.length === 0) {
        setThreadsErr(
          `No threads found for lecturerId(s): ${lecturerIdCandidates.join(", ")}. ` +
            `This usually means the student stored lecturerId under a different value.`
        );
      }*/


      if (!silent && merged.length === 0) {
  setThreadsErr(
    "No student messages yet. When a student contacts you, the conversation will appear here."
  );
 }


    } catch (e) {
      if (!silent) {
        setThreadsErr(String(e?.message || e));
        setThreads([]);
      }
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    reloadThreads({ silent: false });
    const t = setInterval(() => reloadThreads({ silent: true }), 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecturerIdCandidates.join("|")]);


  /*useEffect(() => {
  let cancelled = false;

  const url = buildContactsUrl("/api/users");

  apiFetchJson(url)
    .then((data) => {
      if (cancelled) return;
      const list = Array.isArray(data?.users) ? data.users : [];

      const map = {};
      for (const u of list) {
        const uid = String(u?.uid || "").trim();
        if (uid) map[uid] = u;

        const email = String(u?.email || "").trim().toLowerCase();
        if (email) map[`email:${email}`] = u;
      }

      setUsersById(map);
    })
    .catch(() => {});

  return () => {
    cancelled = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);*/

  const sortedThreads = useMemo(() => {
    return (threads || [])
      .slice()
      .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
  }, [threads]);

  // Group threads by studentId so the left rail shows each student only once
  const groupedByStudent = useMemo(() => {
    const map = new Map(); // studentId -> { studentId, threads: [] }

    for (const t of sortedThreads || []) {
      const sid = String(t?.studentId || "").trim();
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, { studentId: sid, threads: [] });
      map.get(sid).threads.push(t);
    }

    for (const entry of map.values()) {
      entry.threads.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
    }

    return Array.from(map.values()).sort((a, b) => {
      const aTop = a.threads?.[0]?.lastUpdated || 0;
      const bTop = b.threads?.[0]?.lastUpdated || 0;
      return bTop - aTop;
    });
  }, [sortedThreads]);

  const [activeStudentId, setActiveStudentId] = useState("");
  const [activeConvId, setActiveConvId] = useState("");
  const [usersById, setUsersById] = useState({});

  useEffect(() => {
    if (!activeStudentId && groupedByStudent.length) {
      const sid = groupedByStudent[0].studentId;
      setActiveStudentId(sid);
      setActiveConvId(groupedByStudent[0].threads?.[0]?.id || "");
      return;
    }

    if (
      activeStudentId &&
      !groupedByStudent.find((g) => g.studentId === activeStudentId)
    ) {
      const sid = groupedByStudent[0]?.studentId || "";
      setActiveStudentId(sid);
      setActiveConvId(groupedByStudent[0]?.threads?.[0]?.id || "");
      return;
    }

    if (activeStudentId && activeConvId) {
      const g = groupedByStudent.find((x) => x.studentId === activeStudentId);
      if (g && !g.threads.find((t) => t.id === activeConvId)) {
        setActiveConvId(g.threads?.[0]?.id || "");
      }
    }
  }, [groupedByStudent, activeStudentId, activeConvId]);

  const activeThread = useMemo(() => {
    if (!activeConvId) return null;
    return sortedThreads.find((t) => t.id === activeConvId) || null;
  }, [sortedThreads, activeConvId]);

  const [activeConv, setActiveConv] = useState(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [convErr, setConvErr] = useState("");

  const loadActiveConversation = async (thread) => {
    if (!thread?.studentId || !thread?.lecturerId) return;
    setLoadingConv(true);
    setConvErr("");
    try {
      const data = await fetchConversation(
        thread.studentId,
        thread.lecturerId,
        thread.threadId || ""
      );
      setActiveConv(data?.conversation || null);
    } catch (e) {
      setConvErr(String(e?.message || e));
      setActiveConv(null);
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    if (activeThread) loadActiveConversation(activeThread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThread?.id]);

  const messagesRef = useRef(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }, [activeConv?.id, activeConv?.messages?.length]);

  const scrollToBottomNow = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
  };

  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);

  const onSend = async () => {
    if (!activeConv || !activeConv.studentId) return;
    if (!text.trim() && images.length === 0 && files.length === 0) return;

    const lecturerIdForThisConversation = String(
      activeConv.lecturerId || stableUserId(lecturer) || ""
    ).trim();
    if (!lecturerIdForThisConversation) return;

    try {
      const data = await postContactMessage({
        studentId: activeConv.studentId,
        lecturerId: lecturerIdForThisConversation,
        threadId: activeConv.threadId || activeThread?.threadId || "",
        authorRole: "lecturer",
        text,
        images,
        files,
      });
      setText("");
      setImages([]);
      setFiles([]);
      setActiveConv(data?.conversation || activeConv);

      reloadThreads();
      requestAnimationFrame(scrollToBottomNow);
    } catch (e) {
      alert(String(e?.message || e));
    }
  };

  const onDeleteThread = () => {
    alert(
      "Delete conversation is still local-only in this file. If you want, we can add a backend delete endpoint next."
    );
  };

  /* ====== Image lightbox state ====== */
  const [lightbox, setLightbox] = useState({ open: false, items: [], index: 0 });
  const openLightbox = (items = [], index = 0) => {
    if (!items || !items.length) return;
    setLightbox({
      open: true,
      items: items.slice(),
      index: Math.max(0, Math.min(index, items.length - 1)),
    });
  };
  const closeLightbox = () => setLightbox((l) => ({ ...l, open: false }));
  const stepLightbox = (dir) =>
    setLightbox((l) => {
      const len = l.items?.length || 0;
      if (len <= 1) return l;
      return { ...l, index: (l.index + dir + len) % len };
    });

  useEffect(() => {
    if (!lightbox.open) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") stepLightbox(1);
      if (e.key === "ArrowLeft") stepLightbox(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open]);

  /* ====== Google AdSense push ====== */
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.warn("AdSense error in LecturerMessages sidebar:", e);
    }
  }, []);

  // ✅ student card resolver (used in left rail + header)
  /*onst resolveStudentCard = (studentId, newestThread) => {
    const newest = newestThread || null;
    const sid = String(studentId || "").trim();

    const fromThread =
      newest?.studentProfile ||
      (newest?.studentName || newest?.studentProgram || newest?.studentPhotoUrl
        ? {
            name: newest?.studentName || "",
            program: newest?.studentProgram || "",
            photoUrl: newest?.studentPhotoUrl || newest?.studentPhoto || "",
          }
        : null);

    const fromUsersApi = (sid && usersByUid[sid]) || null;
    const fromLocal = getUserById(studentId) || null;

    const u = fromThread || fromUsersApi || fromLocal || {};

    return {
      name: u?.name || u?.profile?.name || newest?.studentName || "Student",
      program:
        u?.program ||
        u?.profile?.program ||
        newest?.studentProgram ||
        u?.faculty ||
        u?.profile?.faculty ||
        "",
      photoUrl:
        u?.photoUrl ||
        u?.photoURL ||
        u?.photo ||
        u?.profile?.photoUrl ||
        u?.profile?.photo ||
        newest?.studentPhotoUrl ||
        newest?.studentPhoto ||
        "",
    };
  };*/


  // ✅ student card resolver (used in left rail + header)
/*const resolveStudentCard = (studentId, newestThread) => {
  const newest = newestThread || null;

  // ✅ NEW: use backend source of truth (/api/users), works across browsers/devices
  const fromUsersApi = usersById?.[String(studentId || "").trim()] || null;

  return (
    newest?.studentProfile ||
    fromUsersApi ||
    getUserById(studentId) ||
    {
      name: newest?.studentName || "Student",
      program: newest?.studentProgram || "",
      photoUrl: newest?.studentPhotoUrl || newest?.studentPhoto || "",
    }
  );
};*/


const resolveStudentCard = (studentId, newestThread) => {
  const newest = newestThread || null;
  const sid = String(studentId || "").trim();

  // 1) If thread already carries student info, use it first
  const fromThread =
    newest?.studentProfile ||
    (newest?.studentName || newest?.studentProgram || newest?.studentPhotoUrl
      ? {
          name: newest?.studentName || "",
          program: newest?.studentProgram || "",
          photoUrl: newest?.studentPhotoUrl || newest?.studentPhoto || "",
        }
      : null);

  // 2) Backend source of truth (works across browsers/devices)
  const fromUsersApi = (sid && usersByUid?.[sid]) || null;

  // 3) Local fallback (may be empty in other browsers, but harmless)
  const fromLocal = getUserById(sid) || null;

  const u = fromThread || fromUsersApi || fromLocal || {};

  return {
    name: u?.name || u?.profile?.name || "Student",
    program: u?.program || u?.profile?.program || u?.faculty || u?.profile?.faculty || "",
    photoUrl:
      u?.photoUrl ||
      u?.photoURL ||
      u?.photo ||
      u?.profile?.photoUrl ||
      u?.profile?.photo ||
      "",
  };
};


  const activeStudentCard = useMemo(() => {
  if (!activeConv?.studentId) return null;
  const g = groupedByStudent.find((x) => x.studentId === activeConv.studentId);
  const newest = g?.threads?.[0] || null;
  return resolveStudentCard(activeConv.studentId, newest);
}, [activeConv?.studentId, groupedByStudent, usersByUid]);

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        <div className="grid gap-6 lg:flex lg:items-start lg:gap-6">
          {/* LEFT rail */}
          <aside className="space-y-3 lg:w-[220px] lg:flex-shrink-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="font-semibold text-slate-900">Students’ Messages</div>

              <div className="mt-2 space-y-1 max-h-[70vh] overflow-auto pr-1">

                {loadingThreads && <div className="text-sm text-slate-500">Loading…</div>}

                {!loadingThreads && threadsErr && (
                  <div className="text-sm text-red-600 whitespace-pre-line">
                    {threadsErr}
                    <div className="mt-2">
                      <button className="text-xs underline" onClick={reloadThreads}>
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {!loadingThreads && !threadsErr && sortedThreads.length === 0 && (
                  <div className="text-sm text-slate-500">No messages yet.</div>
                )}

                {groupedByStudent.map((g) => {
                  const newest = g.threads?.[0];
                  const studentCard = resolveStudentCard(g.studentId, newest);
                  const title = newest?.title || newest?.subject || "(no subject)";

                  return (
                    <button
                      key={g.studentId}
                      onClick={() => {
                        setActiveStudentId(g.studentId);
                        setActiveConvId(newest?.id || "");
                        requestAnimationFrame(scrollToBottomNow);
                      }}
                      className={`w-full text-left flex items-start gap-2 rounded px-2 py-2 hover:bg-slate-50 ${
                        g.studentId === activeStudentId ? "border border-slate-200 bg-slate-50" : ""
                      }`}
                    >
                      <Avatar url={userPhoto(studentCard)} name={studentCard?.name || "Student"} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-900 truncate">
                            {studentCard?.name || "Student"}
                          </div>
                          <span className="text-[11px] text-slate-500 shrink-0">{g.threads.length}</span>
                        </div>
                        <div className="text-xs text-slate-600 truncate">{studentCard?.program || ""}</div>
                        <div className="text-xs text-slate-500 truncate">
                          Latest: {title} {newest?.lastUpdated ? `• ${fmt(newest.lastUpdated)}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* CENTER */}
          
            <section className="space-y-4 lg:flex-1 lg:min-w-0 lg:max-w-[calc(100%-192px)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              {activeConv ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-slate-900 text-lg flex-1">
                      {activeConv.title || activeConv.subject || "(no subject)"}
                    </div>
                    <Link to="/lecturer-dashboard" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
                      ← Back to Lecturer Dashboard
                    </Link>
                  </div>
                  <hr className="mt-2 mb-3 border-slate-200" />

                  <div className="flex items-center gap-3">
                    <Avatar url={userPhoto(activeStudentCard)} name={activeStudentCard?.name || "Student"} size="lg" />
                    <div className="min-w-0">
                      <div className="text-sm text-slate-900 truncate">
                        {activeStudentCard?.name || "Student"}
                      </div>
                      <div className="text-xs text-slate-600 truncate">
                        {activeStudentCard?.program || ""}
                      </div>
                    </div>
                    <button
                      onClick={onDeleteThread}
                      className="ml-auto rounded border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                      title="Optional: add backend delete endpoint later"
                    >
                      Delete conversation
                    </button>
                  </div>

                  {loadingConv && <div className="mt-3 text-sm text-slate-500">Loading conversation…</div>}
                  {!loadingConv && convErr && <div className="mt-3 text-sm text-red-600">{convErr}</div>}

                  {/* Threads for selected student */}
                  {activeStudentId && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-slate-700 px-2 shrink-0">Threads</div>

                        <div className="flex-1 overflow-x-auto">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {(groupedByStudent.find((x) => x.studentId === activeStudentId)?.threads || []).map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setActiveConvId(t.id)}
                                className={`px-3 py-1 rounded-full text-xs border shrink-0 ${
                                  t.id === activeConvId
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white border-slate-200 hover:bg-slate-100"
                                }`}
                                title={t.title || t.subject || "(no subject)"}
                              >
                                {t.title || t.subject || "(no subject)"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesRef} className="mt-4 space-y-4 pr-1">
                    {(activeConv.messages || []).map((m) => (
                      <MessageBubble
                        key={m.id}
                        msg={m}
                        student={activeStudentCard || getUserById(activeConv.studentId)}
                        lecturer={lecturer}
                        onImageClick={(items, index) => openLightbox(items, index)}
                      />
                    ))}
                  </div>

                  <div className="mt-3">
                    <RichComposer
                      value={text}
                      onChange={setText}
                      images={images}   // ✅ add
                      files={files}     // ✅ add
                      onPickImages={(imgs) => setImages((prev) => [...prev, ...imgs])}
                      onPickFiles={(docs) => setFiles((prev) => [...prev, ...docs])}
                      onSubmit={onSend}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>No conversation selected.</span>
                  <Link to="/lecturer-dashboard" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
                    ← Back to Lecturer Dashboard
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Right rail: ads */}
          <aside className="hidden lg:block lg:w-[192px] lg:flex-shrink-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 sticky top-4">
              <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client="ca-pub-2132263917593964"
                data-ad-slot="8097228850"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            </div>
          </aside>
        </div>
      </main>

      {/* ===== Lightbox Overlay ===== */}
      {lightbox.open && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4" onClick={closeLightbox}>
          <div className="relative max-w-5xl w-full pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={
                lightbox.items[lightbox.index]?.url ||
                lightbox.items[lightbox.index]?.dataUrl ||
                lightbox.items[lightbox.index]?.thumb
              }
              alt={lightbox.items[lightbox.index]?.name || "image"}
              className="w-full max-h-[88vh] object-contain rounded"
            />
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white rounded-full px-2 py-1 text-sm shadow z-10"
              onClick={closeLightbox}
              aria-label="Close"
            >
              ✕
            </button>
            {lightbox.items.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10"
                  onClick={() => stepLightbox(-1)}
                  aria-label="Previous"
                  title="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10"
                  onClick={() => stepLightbox(1)}
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
    </div>
  );
}