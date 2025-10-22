// src/pages/ContactLecturer.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadStudentThreads,
  loadConversation,
  saveConversation,
  postMessage,
  markStudentRead,
  getUserById,
  listLecturersFor,
} from "../lib/contactStore";

/* ---------------- Utilities ---------------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
function initials(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "U") + (parts[1]?.[0] || "N")).toUpperCase();
}
function fmtDate(ts) {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts || Date.now());
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/* ====== Avatar (fix distortion with shrink-0) ====== */
function Avatar({ size="md", url, name }) {
  const sizeClass = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={`${sizeClass} shrink-0 rounded-full overflow-hidden bg-slate-300 flex items-center justify-center`}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> :
        <div className="h-full w-full flex items-center justify-center text-white text-sm bg-gradient-to-tr from-indigo-500 to-purple-500">
          {initials(name)}
        </div>}
    </div>
  );
}

/* ====== Small file helpers (dataURL) ====== */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ====== Lightweight IndexedDB for message files (student side) ====== */
const DB_NAME = "sk_contact_files";
const STORE = "contactFiles";
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

/* ====== TRY both student-side and lecturer-side IDB stores for a blob ====== */
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

/* ====== Extra helpers: size + type label + URL resolving ====== */
function formatBytes(bytes = 0) {
  if (!bytes || bytes < 0) return "";
  const units = ["B","KB","MB","GB"];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n % 1 === 0 ? n : n.toFixed(1)} ${units[i]}`;
}
function bytesFromDataUrl(dataUrl) {
  try {
    const b64 = (dataUrl.split(",")[1] || "");
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
    const majorMinor = mime.toLowerCase();
    if (majorMinor.startsWith("application/")) {
      // map some common types to short label
      if (majorMinor.includes("pdf")) return "PDF";
      if (majorMinor.includes("msword") || majorMinor.includes("wordprocessingml")) return "DOCX";
      if (majorMinor.includes("excel") || majorMinor.includes("spreadsheetml")) return "XLSX";
      if (majorMinor.includes("powerpoint") || majorMinor.includes("presentationml")) return "PPTX";
      const ext = extFromName(name);
      return ext ? ext.toUpperCase() : "FILE";
    }
    if (majorMinor.startsWith("image/")) return "IMG";
    if (majorMinor.startsWith("text/")) return "TXT";
    const ext = extFromName(name);
    return ext ? ext.toUpperCase() : majorMinor.split("/")[1]?.toUpperCase() || "FILE";
  }
  const ext = extFromName(name);
  return ext ? ext.toUpperCase() : "FILE";
}

/* Resolve blob + objectURL + size/type for a message file */
async function fetchBlobForFile(file) {
  if (!file) return null;
  // Try student's store (this page)
  if (file.id) {
    let blob = await idbGet(file.id);
    if (!blob) {
      // Try lecturer's shared store
      blob = await idbGetFrom("sk_attachments", "files", file.id);
    }
    if (blob) return blob;
  }
  // fallback from dataUrl (if present)
  if (file.dataUrl) return dataURLtoBlob(file.dataUrl);
  return null;
}

/* Hook: resolve URL + meta */
function useAttachmentUrlAndMeta(file) {
  const [state, setState] = useState({ url: null, size: 0, mime: file?.mime || "", name: file?.name || "" });

  useEffect(() => {
    let revoke = null, cancelled = false;
    (async () => {
      const name = file?.name || "";
      const mimeHint = file?.mime || "";
      // 1) Try IDB blob(s)
      const blob = await fetchBlobForFile(file);
      if (!cancelled && blob) {
        const url = URL.createObjectURL(blob);
        revoke = url;
        setState({ url, size: blob.size || 0, mime: blob.type || mimeHint, name });
        return;
      }
      // 2) dataUrl fallback
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

/* Programmatic download helpers */
async function downloadOneAttachment(file) {
  const blob = await fetchBlobForFile(file);
  if (!blob && !file?.dataUrl) {
    alert("Could not retrieve file. It may be missing in this browser's storage.");
    return;
  }
  let url;
  if (blob) {
    url = URL.createObjectURL(blob);
  } else {
    url = file.dataUrl;
  }
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
    // small gap to avoid pop-up blockers stacking too fast
    await downloadOneAttachment(f);
    await new Promise(res => setTimeout(res, 120));
  }
}

/* Resolve a file object to a download URL (tries student store, then lecturer store, then dataUrl) */
function useFileUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let revoke = null; let cancelled = false;
    (async () => {
      // 1) Try this student's store first
      if (file?.id) {
        let blob = await idbGet(file.id);
        // 2) If not found, try the lecturer's standard store name used on their side
        if (!blob) {
          blob = await idbGetFrom("sk_attachments", "files", file.id);
        }
        if (!cancelled && blob) {
          const obj = URL.createObjectURL(blob);
          revoke = obj; setUrl(obj);
          return;
        }
      }
      // 3) Fall back to inlined dataUrl
      if (!cancelled && file?.dataUrl) {
        setUrl(file.dataUrl);
      }
    })();
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [file?.id, file?.dataUrl]);
  return url;
}

/* --------- Main Page --------- */
export default function ContactLecturer() {
  /* ---- current student ---- */
  const me = useMemo(() => {
    const s = safeParse(sessionStorage.getItem("currentUser")) || {};
    const l = safeParse(localStorage.getItem("currentUser")) || {};
    return Object.keys(s).length ? s : l;
  }, []);
  const myId = me?.id || me?.uid || me?.email || "student";
  const myProgram = me?.program || "";
  const myFaculty = me?.faculty || "";
  const myUniversity = me?.university || "";
  const myPhoto = me?.photoUrl || me?.photoURL || "";

  /* ---- lecturers at my university/faculty ---- */
  const lecturers = useMemo(() => {
    const list = listLecturersFor(myUniversity, myFaculty) || [];
    // sort by title then name
    return list.sort(
      (a,b) =>
        (a.title || "").localeCompare(b.title || "") ||
        (a.name || "").localeCompare(b.name || "")
    );
  }, [myUniversity, myFaculty]);

  /* ---- threads (shared with lecturer UI via contactStore) ---- */
  const [threadIds, setThreadIds] = useState(() => loadStudentThreads(myId));
  const [threads, setThreads] = useState(() => {
    return loadStudentThreads(myId)
      .map(id => safeParse(localStorage.getItem(id)))
      .filter(Boolean)
      .sort((a,b) => (b.lastUpdated||0) - (a.lastUpdated||0));
  });

  // live sync on any store change
  useEffect(() => {
    const sync = () => {
      const ids = loadStudentThreads(myId);
      setThreadIds(ids);
      const convs = ids
        .map(id => safeParse(localStorage.getItem(id)))
        .filter(Boolean)
        .sort((a,b) => (b.lastUpdated||0) - (a.lastUpdated||0));
      setThreads(convs);
    };
    const onStorage = (e) => {
      if (!e || (e.key && !String(e.key).startsWith("contact:"))) return;
      sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("contact:updated", sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("contact:updated", sync);
    };
  }, [myId]);

  /* ---- UI state ---- */
  const [tab, setTab] = useState("threads"); // "threads" | "start"
  const [activeConvId, setActiveConvId] = useState(threads[0]?.id || "");
  useEffect(() => {
    if (tab === "threads" && (!activeConvId || !threads.find(t => t.id === activeConvId))) {
      setActiveConvId(threads[0]?.id || "");
    }
  }, [tab, threads, activeConvId]);

  const activeConv = useMemo(() => threads.find(t => t.id === activeConvId) || null, [threads, activeConvId]);
  const activeLecturer = useMemo(() => activeConv ? getUserById(activeConv.lecturerId) : null, [activeConv]);

  // Mark student read when opening/view changes
  useEffect(() => {
    if (activeConv?.studentId && myId) {
      try { markStudentRead(activeConv.studentId, activeConv.lecturerId); } catch {}
    }
  }, [activeConv?.id, activeConv?.studentId, activeConv?.lecturerId, myId]);

  /* ---- Start New state ---- */
  const [selectedLect, setSelectedLect] = useState(null);
  const [subject, setSubject] = useState("");
  const [newText, setNewText] = useState("");
  const [newImages, setNewImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [editorExpanded, setEditorExpanded] = useState(false);

  const onPickNewImages = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    const mapped = await Promise.all(files.map(async f => ({ name: f.name, dataUrl: await readFileAsDataURL(f) })));
    setNewImages(arr => [...arr, ...mapped]);
    e.target.value = "";
  };
  const onPickNewDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = await Promise.all(files.map(async f => ({
      name: f.name, mime: f.type || "application/octet-stream", dataUrl: await readFileAsDataURL(f)
    })));
    setNewFiles(arr => [...arr, ...mapped]);
    e.target.value = "";
  };
  const onPasteNew = async (e) => {
    const items = e.clipboardData?.items || [];
    const imgItems = Array.from(items).filter(i => i.kind === "file" && i.type.startsWith("image/"));
    if (imgItems.length) {
      e.preventDefault();
      const add = await Promise.all(imgItems.map(async it => {
        const f = it.getAsFile();
        return { name: f?.name || "pasted-image.jpg", dataUrl: await readFileAsDataURL(f) };
      }));
      setNewImages(arr => [...arr, ...add]);
    }
  };

  /* Persist chosen files to IDB and return lightweight descriptors {id,name,mime} */
  async function persistMessageFiles(files = []) {
    const out = [];
    for (const f of files) {
      const id = `cmf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const blob = dataURLtoBlob(f.dataUrl);
      await idbSet(id, blob);
      out.push({ id, name: f.name || "file", mime: blob.type || f.mime || "application/octet-stream" });
    }
    return out;
  }

  const createThread = async () => {
    if (!selectedLect?.id) { alert("Select a lecturer from the left list."); return; }
    if (!newText.trim() && newImages.length === 0 && newFiles.length === 0) {
      alert("Please write a message or attach a file/image."); return;
    }
    // seed conv and set subject/title so lecturer sees it too
    const conv = loadConversation(myId, selectedLect.id);
    if (subject?.trim()) {
      conv.title = subject.trim();
      saveConversation(conv);
    }

    // persist files for transport
    const fileDescs = await persistMessageFiles(newFiles);

    // post initial message
    postMessage({
      studentId: myId,
      lecturerId: selectedLect.id,
      authorRole: "student",
      text: newText,
      images: newImages.slice(),     // images keep dataUrl for inline preview
      files: fileDescs,              // files are IDB-backed descriptors
    });

    // reset + switch
    setTab("threads");
    setActiveConvId(conv.id);
    setNewText(""); setNewImages([]); setNewFiles([]); setSubject("");
  };

  /* ---- Reply composer ---- */
  const [replyText, setReplyText] = useState("");
  const [replyImages, setReplyImages] = useState([]);
  const [replyFiles, setReplyFiles] = useState([]);
  const [replyExpanded, setReplyExpanded] = useState(false);

  const onPickReplyImages = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    const mapped = await Promise.all(files.map(async f => ({ name: f.name, dataUrl: await readFileAsDataURL(f) })));
    setReplyImages(arr => [...arr, ...mapped]);
    e.target.value = "";
  };
  const onPickReplyDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = await Promise.all(files.map(async f => ({
      name: f.name, mime: f.type || "application/octet-stream", dataUrl: await readFileAsDataURL(f)
    })));
    setReplyFiles(arr => [...arr, ...mapped]);
    e.target.value = "";
  };
  const onPasteReply = async (e) => {
    const items = e.clipboardData?.items || [];
    const imgItems = Array.from(items).filter(i => i.kind === "file" && i.type.startsWith("image/"));
    if (imgItems.length) {
      e.preventDefault();
      const add = await Promise.all(imgItems.map(async it => {
        const f = it.getAsFile();
        return { name: f?.name || "pasted-image.jpg", dataUrl: await readFileAsDataURL(f) };
      }));
      setReplyImages(arr => [...arr, ...add]);
    }
  };

  const sendReply = async () => {
    if (!activeConv) return;
    if (!replyText.trim() && replyImages.length === 0 && replyFiles.length === 0) return;

    const fileDescs = await persistMessageFiles(replyFiles);

    postMessage({
      studentId: activeConv.studentId,
      lecturerId: activeConv.lecturerId,
      authorRole: "student",
      text: replyText,
      images: replyImages.slice(),
      files: fileDescs,
    });
    setReplyText(""); setReplyImages([]); setReplyFiles([]);
    // mark myself read
    try { markStudentRead(activeConv.studentId, activeConv.lecturerId); } catch {}
  };

  /* ---- Search: lecturers (left) & threads (top) ---- */
  const [searchLect, setSearchLect] = useState("");
  const [threadSearch, setThreadSearch] = useState("");

  const filteredLecturers = useMemo(() => {
    const q = searchLect.trim().toLowerCase();
    if (!q) return lecturers;
    return lecturers.filter(l => {
      const text = [(l.title||""), (l.name||""), (l.email||"")].join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [lecturers, searchLect]);

  const myThreads = threads; // already sorted by lastUpdated desc
  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return myThreads;
    return myThreads.filter(t => {
      const lect = getUserById(t.lecturerId) || {};
      const last = t.messages?.[t.messages.length - 1];
      const hay = [
        lect.title || "",
        lect.name || "",
        t.title || "",         // subject
        last?.text || "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [myThreads, threadSearch]);

  /* ====== Auto-scroll to the newest message when opening / on updates ====== */
  const messagesBoxRef = useRef(null);
  const scrollToBottom = () => {
    const el = messagesBoxRef.current;
    if (!el) return;
    // Scroll after paint
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight + 64;
    });
  };
  // When the active conversation changes, scroll to bottom
  useEffect(() => {
    if (activeConv?.id) {
      scrollToBottom();
      try { markStudentRead(activeConv.studentId, activeConv.lecturerId); } catch {}
    }
  }, [activeConv?.id]);
  // When any contact store changes, scroll if this thread is active
  useEffect(() => {
    const onContactUpdated = () => {
      if (activeConv?.id) {
        scrollToBottom();
        try { markStudentRead(activeConv.studentId, activeConv.lecturerId); } catch {}
      }
    };
    window.addEventListener("contact:updated", onContactUpdated);
    return () => window.removeEventListener("contact:updated", onContactUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id]);

  /* ====== Image lightbox ====== */
  const [lightbox, setLightbox] = useState({ open:false, items:[], index:0 });
  const openLightbox = (items=[], index=0) => {
    if (!items || !items.length) return;
    setLightbox({ open:true, items: items.slice(), index: Math.max(0, Math.min(index, items.length-1)) });
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

  /* ============ Layout ============ */
  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      {/* 3-column layout: left list, center threads, right ads 
          Reduced right rail by ~2cm (~76px) and added that to center min width */}
      <main className="max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[220px_minmax(836px,1fr)_244px] gap-5">
        {/* LEFT: Search Lecturers + List */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold text-slate-900">Search Lecturers</div>
            <input
              value={searchLect}
              onChange={(e)=>setSearchLect(e.target.value)}
              placeholder="Search by name or title"
              className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold text-slate-900">Lecturers</div>
            <div className="mt-2 max-h-[55vh] overflow-auto divide-y divide-slate-100">
              {filteredLecturers.length === 0 && (
                <div className="text-xs text-slate-500 py-3">No lecturers found.</div>
              )}
              {filteredLecturers.map((l) => (
                <button
                  key={l.id}
                  className={`w-full text-left py-2 flex items-center gap-2 hover:bg-slate-50 px-2 rounded ${
                    selectedLect?.id === l.id ? "bg-blue-50" : ""
                  }`}
                  onClick={()=>{ setSelectedLect(l); setTab("start"); }}
                >
                  <Avatar size="sm" url={l.photoUrl || l.photoURL} name={l.name} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {(l.title ? l.title + " " : "") + (l.name || "Lecturer")}
                    </div>
                    <div className="text-xs text-slate-600 truncate">{l.faculty || ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Link to="/student-dashboard" className="block text-sm text-blue-600 underline">
            ← Back to Student Dashboard
          </Link>

          {/* New small ad area under the back link */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            <div id="ad-slot-under-back" className="w-full min-h-[120px] flex items-center justify-center text-xs text-slate-500">
              {/* Google Ad (e.g., 300x100 / responsive) */}
              Ad space
            </div>
          </div>
        </aside>

        {/* CENTER: Tabs + Content */}
        <section className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={`px-4 py-2 rounded-full text-sm ${tab==="threads" ? "bg-slate-900 text-white" : "border border-slate-200"}`}
                onClick={()=>setTab("threads")}
              >
                My Threads
              </button>
              <button
                className={`px-4 py-2 rounded-full text-sm ${tab==="start" ? "bg-slate-900 text-white" : "border border-slate-200"}`}
                onClick={()=>setTab("start")}
              >
                Start New
              </button>

              {/* Search box next to Start New */}
              {tab === "threads" && (
                <input
                  value={threadSearch}
                  onChange={(e)=>setThreadSearch(e.target.value)}
                  placeholder="Search: lecturer, title, keywords…"
                  className="ml-auto min-w-[240px] flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
                />
              )}
            </div>
          </div>

          {/* ---- My Threads ---- */}
          {tab === "threads" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              {filteredThreads.length === 0 ? (
                <div className="text-sm text-slate-600">
                  No matching threads. Try another search or use <strong>Start New</strong>.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
                  {/* Threads list (scrollable) */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-sm font-semibold">My Threads</div>
                    <div className="max-h-[60vh] overflow-auto divide-y divide-slate-100">
                      {filteredThreads.map(t => {
                        const lect = getUserById(t.lecturerId) || {};
                        const last = t.messages?.[t.messages.length - 1];
                        const unreadCount = (() => {
                          const lr = t.lastRead?.studentId || 0;
                          return (t.messages || []).filter(m => m.authorRole === "lecturer" && m.createdAt > lr).length;
                        })();
                        return (
                          <button
                            key={t.id}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2 ${
                              t.id === activeConvId ? "bg-blue-50" : ""
                            }`}
                            onClick={()=>setActiveConvId(t.id)}
                          >
                            <Avatar size="sm" url={lect.photoUrl || lect.photoURL} name={lect.name || "Lecturer"} />
                            <div className="min-w-0 flex-1">
                              {/* Lecturer name + unread */}
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-slate-900 truncate">
                                  {(lect.title ? lect.title+" " : "") + (lect.name || "Lecturer")}
                                </div>
                                {unreadCount > 0 && (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] rounded-full bg-red-600 text-white">
                                    {unreadCount}
                                  </span>
                                )}
                              </div>
                              {/* Subject Title */}
                              <div className="text-xs text-slate-800 truncate font-semibold">
                                {t.title || "(no subject)"}
                              </div>
                              {/* Last snippet */}
                              {last?.text && (
                                <div className="text-xs text-slate-500 truncate">
                                  {last.authorRole === "lecturer" ? "Lecturer: " : "You: "}{last.text}
                                </div>
                              )}
                              <div className="text-[11px] text-slate-400">{fmtDate(t.lastUpdated)}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active thread */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {!activeConv ? (
                      <div className="p-6 text-sm text-slate-600">Select a thread on the left to view messages.</div>
                    ) : (
                      <>
                        {/* Title at top + divider, then avatar/name row */}
                        <div className="px-4 pt-3 pb-2 bg-slate-50">
                          <div className="text-base md:text-lg font-semibold text-slate-900 truncate">
                            {activeConv.title || "(no subject)"}
                          </div>
                          <hr className="my-2" />
                          <div className="flex items-center gap-3">
                            <Avatar size="md" url={activeLecturer?.photoUrl || activeLecturer?.photoURL} name={activeLecturer?.name || "Lecturer"} />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">
                                {(activeLecturer?.title ? activeLecturer.title + " " : "") + (activeLecturer?.name || "Lecturer")}
                              </div>
                              <div className="text-[11px] text-slate-600 truncate">
                                {activeLecturer?.faculty || ""}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Last updated: {fmtDate(activeConv.lastUpdated)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Messages (paragraphs preserved) */}
                        <div ref={messagesBoxRef} className="p-4 max-h-[56vh] overflow-auto space-y-3">
                          {activeConv.messages?.map(m => {
                            const isLect = m.authorRole === "lecturer";
                            const who = isLect ? activeLecturer : me;
                            const name = isLect
                              ? `${activeLecturer?.title ? activeLecturer.title + " " : ""}${activeLecturer?.name || "Lecturer"}`
                              : (me?.name || "Student");

                            const hasMultipleFiles = Array.isArray(m.files) && m.files.length > 1;

                            return (
                              <div key={m.id} className="flex items-start gap-2">
                                <Avatar size="sm" url={(who?.photoUrl || who?.photoURL)} name={name}/>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-slate-900">{name}</div>
                                    <div className="text-[11px] text-slate-500">{fmtDate(m.createdAt)}</div>
                                  </div>
                                  <div className="text-xs text-slate-600 mb-1">
                                    {isLect ? (activeLecturer?.title ? activeLecturer.title+" " : "") + (activeLecturer?.name || "Lecturer")
                                            : (myProgram || "")}
                                  </div>
                                  {/* preserve paragraphs + wrap long words */}
                                  <div className={`text-sm rounded-lg px-3 py-2 whitespace-pre-line break-words ${isLect ? "bg-[#ECF9FE] border border-sky-100" : "bg-slate-50 border border-slate-100"}`}>
                                    {m.text}
                                  </div>

                                  {/* images (click to open lightbox) */}
                                  {Array.isArray(m.images) && m.images.length > 0 && (
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                      {m.images.map((img, i) => (
                                        <img
                                          key={i}
                                          src={img.dataUrl || img.thumb}
                                          alt={img.name || "image"}
                                          className="w-full h-28 object-cover rounded cursor-zoom-in"
                                          onClick={() => openLightbox(m.images, i)}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* files (now downloadable with type + size) */}
                                  {Array.isArray(m.files) && m.files.length > 0 && (
                                    <div className="mt-2">
                                      {hasMultipleFiles && (
                                        <div className="mb-2">
                                          <button
                                            type="button"
                                            className="text-xs rounded border border-slate-200 px-2 py-0.5 hover:bg-slate-50"
                                            onClick={() => downloadAllAttachments(m.files)}
                                            title="Download all attachments"
                                          >
                                            Download all
                                          </button>
                                        </div>
                                      )}

                                      <ul className="text-sm space-y-1">
                                        {m.files.map((f,i)=>(<FileDownload key={i} file={f} />))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Reply */}
                        <div className="p-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-slate-900">Reply</div>
                            <button
                              className="text-xs rounded border border-slate-200 px-2 py-0.5"
                              onClick={()=>setReplyExpanded(v => !v)}
                              title="Expand editor"
                            >
                              ^
                            </button>
                          </div>

                          <textarea
                            value={replyText}
                            onChange={(e)=>setReplyText(e.target.value)}
                            onPaste={onPasteReply}
                            placeholder="Write your reply…"
                            rows={replyExpanded ? 6 : 3}
                            className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y"
                          />

                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📷
                              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickReplyImages}/>
                            </label>
                            <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📎
                              <input type="file" multiple className="hidden" onChange={onPickReplyDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
                            </label>
                            <button
                              onClick={sendReply}
                              className="ml-auto rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                            >
                              Send
                            </button>
                          </div>

                          {(replyImages.length>0 || replyFiles.length>0) && (
                            <div className="mt-2 space-y-2">
                              {replyImages.length>0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {replyImages.map((img,i)=>(
                                    <div key={i} className="relative">
                                      <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover rounded" />
                                      <button
                                        type="button"
                                        className="absolute right-1 top-1 text-xs bg-white/80 px-1 rounded"
                                        onClick={()=> setReplyImages(arr => arr.filter((_,idx)=>idx!==i))}
                                      >✕</button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {replyFiles.length>0 && (
                                <ul className="text-xs space-y-1">
                                  {replyFiles.map((f,i)=>(
                                    <li key={i} className="flex items-center gap-2">📎<span>{f.name}</span>
                                      <button
                                        type="button"
                                        className="text-xs underline"
                                        onClick={()=> setReplyFiles(arr => arr.filter((_,idx)=>idx!==i))}
                                      >
                                        remove
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- Start New ---- */}
          {tab === "start" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">Start New Thread</div>
              {!selectedLect ? (
                <p className="text-sm text-slate-600 mt-1">Select a lecturer on the left to begin.</p>
              ) : (
                <>
                  <div className="mt-3 flex items-center gap-2">
                    <Avatar size="md" url={selectedLect.photoUrl || selectedLect.photoURL} name={selectedLect.name} />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {(selectedLect.title ? selectedLect.title + " " : "") + (selectedLect.name || "Lecturer")}
                      </div>
                      <div className="text-xs text-slate-600 truncate">{selectedLect.faculty || ""}</div>
                    </div>
                  </div>

                  <label className="block mt-3 text-xs text-slate-600">
                    Subject (optional)
                    <input
                      value={subject}
                      onChange={(e)=>setSubject(e.target.value)}
                      className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      placeholder="e.g., Clarification on Week 2 assignment"
                    />
                  </label>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-600">Message</div>
                    <button
                      className="text-xs rounded border border-slate-200 px-2 py-0.5"
                      onClick={()=>setEditorExpanded(v => !v)}
                      title="Expand editor"
                    >
                      ^
                    </button>
                  </div>
                  <textarea
                    value={newText}
                    onChange={(e)=>setNewText(e.target.value)}
                    onPaste={onPasteNew}
                    rows={editorExpanded ? 6 : 3}
                    className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm resize-y"
                    placeholder="Write your message…"
                  />

                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📷
                      <input type="file" accept="image/*" multiple className="hidden" onChange={onPickNewImages}/>
                    </label>
                    <label className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer">📎
                      <input type="file" multiple className="hidden" onChange={onPickNewDocs} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"/>
                    </label>
                    <button
                      onClick={createThread}
                      className="ml-auto rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                    >
                      Create Thread
                    </button>
                  </div>

                  {(newImages.length>0 || newFiles.length>0) && (
                    <div className="mt-2 space-y-2">
                      {newImages.length>0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {newImages.map((img,i)=>(
                            <div key={i} className="relative">
                              <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover rounded" />
                              <button
                                type="button"
                                className="absolute right-1 top-1 text-xs bg-white/80 px-1 rounded"
                                onClick={()=> setNewImages(arr => arr.filter((_,idx)=>idx!==i))}
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {newFiles.length>0 && (
                        <ul className="text-xs space-y-1">
                          {newFiles.map((f,i)=>(
                            <li key={i} className="flex items-center gap-2">📎<span>{f.name}</span>
                              <button
                                type="button"
                                className="text-xs underline"
                                onClick={()=> setNewFiles(arr => arr.filter((_,idx)=>idx!==i))}
                              >remove</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* RIGHT: Reduced (by ~2cm) gutter for Google Ads */}
        <aside className="hidden lg:block">
          <div className="rounded-2xl border border-slate-200 bg-white p-2 sticky top-4">
            {/* Replace this container with your Google ads script/ins */}
            <div id="ad-slot-right-rail" className="w-[240px] min-h-[600px] mx-auto flex items-center justify-center text-xs text-slate-500">
              {/* Google Ad (Right Rail 240x600 or responsive) */}
              Ad space
            </div>
          </div>
        </aside>
      </main>

      {/* ===== Lightbox Overlay ===== */}
      {lightbox.open && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-5xl w-full pointer-events-auto"
            onClick={(e)=>e.stopPropagation()}
          >
            <img
              src={lightbox.items[lightbox.index]?.dataUrl || lightbox.items[lightbox.index]?.thumb}
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
                  onClick={()=>stepLightbox(-1)}
                  aria-label="Previous"
                  title="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10"
                  onClick={()=>stepLightbox(1)}
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

/* -------- Download component for files in a message -------- */
function FileDownload({ file }) {
  const { url, sizeLabel, typeLabel } = useAttachmentUrlAndMeta(file);

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
      {/* explicit programmatic download fallback (works for blob-only as well) */}
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