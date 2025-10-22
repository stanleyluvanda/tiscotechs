/// src/pages/LecturerMessages.jsx  
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadLecturerThreads,
  markLecturerRead,
  postMessage,
  deleteConversation,
  purgeOldConversations,
  getUserById,
} from "../lib/contactStore";

/* ----------------- small utils ----------------- */
function safeParse(j) { try { return JSON.parse(j || ""); } catch { return null; } }
function initials(s = "") {
  const [a = "", b = ""] = String(s).trim().split(/\s+/);
  return (a[0] || "L").toUpperCase() + (b[0] || "K").toUpperCase();
}
function fmt(ts) {
  const d = new Date(typeof ts === "number" ? ts : Date.now());
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/* ----------------- Avatar ----------------- */
function Avatar({ url, name, size = "md" }) {
  const cls = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  return (
    <div className={`${cls} rounded-full overflow-hidden bg-slate-300 flex items-center justify-center shrink-0`}>
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
async function getObjectUrlForAttachment(att) {
  if (!att?.id) return null;
  const blob = await idbGet(att.id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/* ---------- generic IDB reader for any db/store (fallbacks) ---------- */
async function idbGetFrom(dbName, storeName, key) {
  try {
    const req = indexedDB.open(dbName, 1);
    const db = await new Promise((resolve, reject) => {
      req.onupgradeneeded = (e) => {
        const db2 = e.target.result;
        if (!db2.objectStoreNames.contains(storeName)) db2.createObjectStore(storeName);
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
  const units = ["B","KB","MB","GB"];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n % 1 === 0 ? n : n.toFixed(1)} ${units[i]}`;
}
function bytesFromDataUrl(dataUrl) {
  try {
    const b64 = (String(dataUrl || "").split(",")[1] || "");
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
    const mime = (hdr.match(/data:(.*?);base64/) || [, "application/octet-stream"])[1];
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
    if (!blob) blob = await idbGetFrom("sk_contact_files", "contactFiles", file.id); // student-side store
    if (blob) return blob;
  }
  if (file.dataUrl) return dataURLtoBlob(file.dataUrl);
  return null;
}
function useAttachmentUrlAndMeta(file) {
  const [state, setState] = useState({ url: null, size: 0, mime: file?.mime || "", name: file?.name || "" });
  useEffect(() => {
    let revoke = null, cancelled = false;
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
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [file?.id, file?.dataUrl, file?.mime, file?.name]);
  const sizeLabel = state.size ? formatBytes(state.size) : "";
  const typeLabel = typeLabelFrom(state.mime, state.name);
  return { ...state, sizeLabel, typeLabel };
}
async function downloadOneAttachment(file) {
  const blob = await fetchBlobForFile(file);
  if (!blob && !file?.dataUrl) {
    alert("Could not retrieve file. It may be missing in this browser's storage.");
    return;
  }
  let url;
  if (blob) url = URL.createObjectURL(blob);
  else url = file.dataUrl;
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
    await new Promise(res => setTimeout(res, 120));
  }
}

/* ---------- Optional legacy hook (kept) ---------- */
function useAttachmentUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let revoke = null;
    let cancelled = false;
    (async () => {
      if (file?.id) {
        let blob = await idbGet(file.id);
        if (!blob) blob = await idbGetFrom("sk_contact_files", "contactFiles", file.id);
        if (blob && !cancelled) {
          const obj = URL.createObjectURL(blob);
          revoke = obj;
          setUrl(obj);
          return;
        }
      }
      if (!cancelled && file?.dataUrl) setUrl(file.dataUrl);
    })();
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [file?.id, file?.dataUrl]);
  return url;
}
function AttachmentLink({ file }) {
  const url = useAttachmentUrl(file);
  if (!url) return <span className="text-slate-400">{file?.name || "file"}</span>;
  return (
    <a href={url} download={file?.name || "attachment"} target="_blank" rel="noopener noreferrer" className="underline" title="Download file">
      {file?.name || "file"}
    </a>
  );
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
        style={ open ? {} : { display: "-webkit-box", WebkitLineClamp: initialLines, WebkitBoxOrient: "vertical", overflow: "hidden" } }
      >
        {text}
      </div>
      {tooLong && (
        <button className="mt-1 text-blue-600 text-sm hover:underline" onClick={() => setOpen((v) => !v)}>
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

/* ----------------- RichComposer ----------------- */
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
      const w = Math.round(img.width * r), h = Math.round(img.height * r);
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
function dataURLtoBlobForComposer(dataUrl) {
  const [hdr, b64] = dataUrl.split(",");
  const mime = (hdr.match(/data:(.*?);base64/) || [, "application/octet-stream"])[1];
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
function RichComposer({ value, onChange, onPickImages, onPickFiles, onSubmit }) {
  const taRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  const autosize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, expanded ? 600 : 220);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > next ? "auto" : "hidden";
  };
  useEffect(() => { if (taRef.current) autosize(taRef.current); }, [value, expanded]);

  const onPaste = async (e) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items || []);
    const imgs = items.filter((i) => i.type?.startsWith("image/"));
    if (!imgs.length) return;
    e.preventDefault();
    const files = await Promise.all(imgs.map((i) => i.getAsFile()).filter(Boolean));
    const mapped = await Promise.all(files.map(async (f) => {
      const dataUrl = await readFileAsDataURL(f);
      const blob = dataURLtoBlobForComposer(dataUrl);
      const id = `att_img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await idbSet(id, blob);
      const thumb = await makeThumb(dataUrl, 360, 360, 0.72);
      return { id, name: f.name || "image.jpg", mime: blob.type, thumb, dataUrl };
    }));
    onPickImages && onPickImages(mapped);
  };

  const pickImages = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    const mapped = await Promise.all(files.map(async (f) => {
      const dataUrl = await readFileAsDataURL(f);
      const blob = dataURLtoBlobForComposer(dataUrl);
      const id = `att_img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await idbSet(id, blob);
      const thumb = await makeThumb(dataUrl, 360, 360, 0.72);
      return { id, name: f.name || "image.jpg", mime: blob.type, thumb, dataUrl };
    }));
    onPickImages && onPickImages(mapped);
    e.target.value = "";
  };

  const pickDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = await Promise.all(files.map(async (f) => {
      const dataUrl = await readFileAsDataURL(f);
      const blob = dataURLtoBlobForComposer(dataUrl);
      const id = `att_file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await idbSet(id, blob);
      return { id, name: f.name || "file", mime: blob.type || f.type || "application/octet-stream" };
    }));
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
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="px-2 py-1 border border-slate-200 rounded cursor-pointer text-sm">
            📷 Images
            <input type="file" accept="image/*" multiple className="hidden" onChange={pickImages} />
          </label>
          <label className="px-2 py-1 border border-slate-200 rounded cursor-pointer text-sm">
            📎 Files
            <input type="file" multiple className="hidden" onChange={pickDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" />
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
  const { url, sizeLabel, typeLabel } = useAttachmentUrlAndMeta(file);
  return (
    <li className="flex items-center gap-2">
      📎
      {url ? (
        <>
          <a href={url} download={file.name || "file"} target="_blank" rel="noopener noreferrer" className="underline" title="Download file">
            {file.name || "file"}
          </a>
          {(typeLabel || sizeLabel) && (
            <span className="ml-2 text-[11px] text-slate-600 rounded-full border border-slate-200 px-2 py-0.5">
              {typeLabel}{sizeLabel ? ` • ${sizeLabel}` : ""}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="text-slate-400">{file.name || "file"}</span>
          {(typeLabel || sizeLabel) && (
            <span className="ml-2 text-[11px] text-slate-600 rounded-full border border-slate-200 px-2 py-0.5">
              {typeLabel}{sizeLabel ? ` • ${sizeLabel}` : ""}
            </span>
          )}
        </>
      )}
      <button type="button" className="text-xs underline ml-2" onClick={() => downloadOneAttachment(file)} title="Download">
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
    : (student?.name || "Student");
  const subline = isLect ? (lecturer?.title || "Lecturer") : (student?.program || "");
  const hasMultipleFiles = Array.isArray(msg.files) && msg.files.length > 1;

  return (
    <div className="flex items-start gap-3">
      <Avatar url={who?.photoUrl || who?.photoURL} name={name} size="sm" />
      <div className="min-w-0">
        <div className="text-[13px] text-slate-500 flex items-center gap-2">
          <span className="font-semibold text-slate-900">{name}</span>
          {subline && <span>• {subline}</span>}
          <span>• {fmt(msg.createdAt)}</span>
        </div>
        <div className={`mt-1 rounded-2xl px-3 py-2 ${isLect ? "bg-[#ECF9FE] border border-sky-100" : "bg-slate-50 border border-slate-100"}`}>
          {msg.text && <ExpandableText text={msg.text} />}

          {Array.isArray(msg.images) && msg.images.length > 0 && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {msg.images.map((img, i) => (
                <img
                  key={(img.id || img.name || "img") + i}
                  src={img.dataUrl || img.thumb}
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
                  <FileDownload key={i} file={f} />
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
  const loadMe = () =>
    safeParse(sessionStorage.getItem("currentUser")) ||
    safeParse(localStorage.getItem("currentUser")) ||
    {};
  const [lecturer, setLecturer] = useState(() => loadMe());
  useEffect(() => {
    const onU = () => setLecturer(loadMe());
    window.addEventListener("user:updated", onU);
    return () => window.removeEventListener("user:updated", onU);
  }, []);

  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    purgeOldConversations();
    const daily = setInterval(() => purgeOldConversations(), 24 * 60 * 60 * 1000);
    const recalc = () => setRefreshTick((t) => t + 1);
    window.addEventListener("storage", recalc);
    window.addEventListener("contact:updated", recalc);
    return () => {
      clearInterval(daily);
      window.removeEventListener("storage", recalc);
      window.removeEventListener("contact:updated", recalc);
    };
  }, []);

  const threadIds = useMemo(() => loadLecturerThreads(lecturer.id) || [], [lecturer.id, refreshTick]);

  const sortedThreads = useMemo(() => {
    const arr = (threadIds || [])
      .map((id) => safeParse(localStorage.getItem(id)))
      .filter(Boolean)
      .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
    return arr;
  }, [threadIds, refreshTick]);

  const [activeConvId, setActiveConvId] = useState(sortedThreads[0]?.id || "");
  useEffect(() => {
    if (!activeConvId && sortedThreads.length) setActiveConvId(sortedThreads[0].id);
    if (activeConvId && !sortedThreads.find((t) => t.id === activeConvId)) {
      setActiveConvId(sortedThreads[0]?.id || "");
    }
  }, [sortedThreads, activeConvId]);

  const activeConv = useMemo(() => {
    if (!activeConvId) return null;
    const raw = safeParse(localStorage.getItem(activeConvId));
    return raw || null;
  }, [activeConvId, refreshTick]);

  const activeStudent = useMemo(() => {
    const sid = activeConv?.studentId;
    return sid ? getUserById(sid) || {} : {};
  }, [activeConv]);

  useEffect(() => {
    if (activeConv?.studentId && lecturer?.id) {
      try { markLecturerRead(activeConv.studentId, lecturer.id); } catch {}
    }
  }, [activeConv?.id, activeConv?.studentId, lecturer?.id]);

  const messagesRef = useRef(null);
  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [activeConv?.id, activeConv?.messages?.length]);
  const scrollToBottomNow = () => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  };

  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);

  const onSend = () => {
    if (!activeConv || !activeConv.studentId || !lecturer?.id) return;
    if (!text.trim() && images.length === 0 && files.length === 0) return;
    postMessage({ studentId: activeConv.studentId, lecturerId: lecturer.id, authorRole: "lecturer", text, images, files });
    setText(""); setImages([]); setFiles([]);
    try { markLecturerRead(activeConv.studentId, lecturer.id); } catch {}
    setRefreshTick((t) => t + 1);
    requestAnimationFrame(scrollToBottomNow);
  };

  const onDeleteThread = () => {
    if (!activeConv?.studentId || !lecturer?.id) return;
    const ok = window.confirm("Delete this conversation? This cannot be undone.");
    if (!ok) return;
    deleteConversation(activeConv.studentId, lecturer.id);
    setText(""); setImages([]); setFiles([]);
    setRefreshTick((t) => t + 1);
  };

  /* ====== Image lightbox state ====== */
  const [lightbox, setLightbox] = useState({ open:false, items:[], index:0 });
  const openLightbox = (items=[], index=0) => {
    if (!items || !items.length) return;
    setLightbox({ open:true, items: items.slice(), index: Math.max(0, Math.min(index, items.length - 1)) });
  };
  const closeLightbox = () => setLightbox(l => ({ ...l, open:false }));
  const stepLightbox = (dir) => setLightbox(l => {
    const len = l.items?.length || 0; if (len <= 1) return l;
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

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      {/* container */}
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        {/* On mobile: stack. On lg+: two columns (left list + center feed) */}
        <div className="grid gap-6 lg:flex lg:items-start lg:gap-6">
          {/* LEFT rail: narrower & shifted left */}
          <aside className="space-y-3 lg:w-[220px] lg:flex-shrink-0 lg:-ml-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="font-semibold text-slate-900">Students’ Messages</div>
              <div className="mt-2 space-y-1 max-h-[70vh] overflow-auto pr-1">
                {sortedThreads.length === 0 && (<div className="text-sm text-slate-500">No messages yet.</div>)}
                {sortedThreads.map((c) => {
                  const studentCard = getUserById(c.studentId) || {};
                  const last = c.messages?.[c.messages.length - 1];
                  const lastRead = c.lastRead?.lecturerId || 0;
                  const unreadCount = (c.messages || []).filter((m) => m.authorRole === "student" && m.createdAt > lastRead).length;
                  const isUnread = unreadCount > 0;
                  const title = c.title || c.subject || "(no subject)";
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveConvId(c.id);
                        try { markLecturerRead(c.studentId, lecturer.id); } catch {}
                        setRefreshTick((t) => t + 1);
                        requestAnimationFrame(scrollToBottomNow);
                      }}
                      className={`w-full text-left flex items-start gap-2 rounded px-2 py-2 hover:bg-slate-50 ${c.id === activeConvId ? "border border-slate-200 bg-slate-50" : ""}`}
                    >
                      <Avatar url={studentCard.photoUrl || studentCard.photoURL} name={studentCard.name} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">{title}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-slate-800 truncate">{studentCard.name || "Student"}</div>
                          {isUnread && (
                            <span className="inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {studentCard.program || ""} {last ? `• ${fmt(last.createdAt)}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Link to="/lecturer-dashboard" className="block text-sm text-blue-600 underline">
              ← Back to Lecturer Dashboard
            </Link>
          </aside>

          {/* CENTER feed: shifted left & width reduced by 2 inches */}
          <section className="space-y-4 lg:flex-1 lg:min-w-0 lg:-ml-6 lg:max-w-[calc(100%-192px)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              {activeConv ? (
                <>
                  <div>
                    <div className="font-semibold text-slate-900 text-lg">
                      {activeConv.title || activeConv.subject || "(no subject)"}
                    </div>
                    <hr className="mt-2 mb-3 border-slate-200" />
                  </div>

                  <div className="flex items-center gap-3">
                    <Avatar
                      url={(getUserById(activeConv.studentId)?.photoUrl) || (getUserById(activeConv.studentId)?.photoURL)}
                      name={(getUserById(activeConv.studentId)?.name)}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-slate-900 truncate">
                        {getUserById(activeConv.studentId)?.name || "Student"}
                      </div>
                      <div className="text-xs text-slate-600 truncate">
                        {getUserById(activeConv.studentId)?.program || ""}
                      </div>
                    </div>
                    <button
                      onClick={onDeleteThread}
                      className="ml-auto rounded border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                    >
                      Delete conversation
                    </button>
                  </div>

                  <div ref={messagesRef} className="mt-4 space-y-4 max-h-[62vh] overflow-auto pr-1">
                    {activeConv.messages?.map((m) => (
                      <MessageBubble
                        key={m.id}
                        msg={m}
                        student={getUserById(activeConv.studentId)}
                        lecturer={lecturer}
                        onImageClick={(items, index) => openLightbox(items, index)}
                      />
                    ))}
                  </div>

                  <div className="mt-3">
                    <RichComposer
                      value={text}
                      onChange={setText}
                      onPickImages={(imgs) => setImages((prev) => [...prev, ...imgs])}
                      onPickFiles={(docs) => setFiles((prev) => [...prev, ...docs])}
                      onSubmit={onSend}
                    />

                    {images.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {images.map((img, i) => (
                          <div key={i} className="relative">
                            <img src={img.dataUrl || img.thumb} alt={img.name} className="w-full h-28 object-cover rounded" />
                            <button
                              type="button"
                              className="absolute right-1 top-1 bg-white/90 text-xs rounded px-1"
                              onClick={() => {
                                const next = images.slice();
                                next.splice(i, 1);
                                setImages(next);
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {files.length > 0 && (
                      <ul className="mt-2 text-sm text-slate-700 space-y-1">
                        {files.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            📎 <span className="truncate">{f.name || "file"}</span>
                            <button
                              type="button"
                              className="text-xs underline ml-2"
                              onClick={() => {
                                const next = files.slice();
                                next.splice(i, 1);
                                setFiles(next);
                              }}
                            >
                              remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">No conversation selected.</div>
              )}
            </div>
          </section>

          {/* Reserved space on the right = 2 inches */}
          <div className="hidden lg:block lg:w-[192px] lg:flex-shrink-0" />
        </div>
      </main>

      {/* ===== Lightbox Overlay ===== */}
      {lightbox.open && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4" onClick={closeLightbox}>
          <div className="relative max-w-5xl w-full pointer-events-auto" onClick={(e)=>e.stopPropagation()}>
            <img
              src={lightbox.items[lightbox.index]?.dataUrl || lightbox.items[lightbox.index]?.thumb}
              alt={lightbox.items[lightbox.index]?.name || "image"}
              className="w-full max-h-[88vh] object-contain rounded"
            />
            <button type="button" className="absolute -top-3 -right-3 bg-white rounded-full px-2 py-1 text-sm shadow z-10" onClick={closeLightbox} aria-label="Close">✕</button>
            {lightbox.items.length > 1 && (
              <>
                <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10" onClick={()=>stepLightbox(-1)} aria-label="Previous" title="Previous">‹</button>
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10" onClick={()=>stepLightbox(1)} aria-label="Next" title="Next">›</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}