// src/components/MessagingDock.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getConversation,
  listPeople,
  listThreads,
  markRead,
  sendMessage,
  heartbeatPresence,
  getPresence,
} from "../lib/messagingApi";
import AttachmentUploader from "./upload/AttachmentUploader";


function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

/* ---------------- Helpers ---------------- */
function safeStr(x) {
  return String(x || "").trim();
}

function isEmail(x) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x || "").trim());
}

// ✅ IMPORTANT: backend expects stable ids. If it's not email and not already prefixed,
// treat it as a UID (so "u1" becomes "uid:u1").
function normalizeUserId(x) {
  const s = safeStr(x);
  if (!s) return "";

  // keep already-normalized ids
  if (s.startsWith("email:") || s.startsWith("uid:")) return s;

  // normalize emails
  if (isEmail(s)) return `email:${s.toLowerCase()}`;

  // if it already contains a prefix-like colon (e.g. "google:xxx"), keep as-is
  if (s.includes(":")) return s;

  // fallback: treat as uid
  return `uid:${s}`;
}

function makeScopeKey(me) {
  return safeStr(me?.scopeKey);
}
// ✅ map a person to their thread row (to show unread dot per person)
function threadForPerson(threads, personUserId) {
  const target = normalizeUserId(personUserId);
  return (threads || []).find((t) => normalizeUserId(t?.otherUserId) === target) || null;
}

function isImageAttachment(a) {
  const ct = String(a?.contentType || a?.mime || "").toLowerCase();
  const url = String(a?.url || "").toLowerCase();
  const name = String(a?.name || a?.fileName || "").toLowerCase();

  if (ct.startsWith("image/")) return true;
  return (
    url.match(/\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/) ||
    name.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/)
  );
}

function messageKey(m) {
  return safeStr(m?.messageId || m?.sk || "");
}

function sortPeopleWithUnreadFirst(arr, threads) {
  const list = Array.isArray(arr) ? arr.slice() : [];

  return list.sort((a, b) => {
    const ta = threadForPerson(threads, a?.userId || a?.email);
    const tb = threadForPerson(threads, b?.userId || b?.email);

    const ua = Number(ta?.unreadCount || 0);
    const ub = Number(tb?.unreadCount || 0);

    if (ua > 0 && ub <= 0) return -1;
    if (ub > 0 && ua <= 0) return 1;

    const la = Number(ta?.lastAt || ta?.updatedAt || 0);
    const lb = Number(tb?.lastAt || tb?.updatedAt || 0);
    if (lb !== la) return lb - la;

    return safeStr(a?.fullName).localeCompare(safeStr(b?.fullName));
  });
}

function resolveDisplayRole({ mine, myRole, me, active, roleByUserId }) {
  if (mine) {
    if (myRole === "lecturer") return "Lecturer";
    return "Student";
  }

  const activeRole = safeStr(active?.otherRole).toLowerCase();
  if (activeRole === "lecturer") return "Lecturer";
  if (activeRole === "student") return "Student";

  const otherId = normalizeUserId(active?.otherUserId);
  const mapped = safeStr(roleByUserId?.get(otherId)).toLowerCase();
  if (mapped === "lecturer") return "Lecturer";
  if (mapped === "student") return "Student";

  if (myRole === "lecturer") return "Student";
  return "Lecturer";
}

function resolveHeaderSubtitle({ myRole, active, roleByUserId }) {
  const activeRole = safeStr(active?.otherRole).toLowerCase();
  const otherId = normalizeUserId(active?.otherUserId);
  const mapped = safeStr(roleByUserId?.get(otherId)).toLowerCase();
  const role = activeRole || mapped;

  if (role === "student") return safeStr(active?.otherProgram) || "Student";
  if (role === "lecturer") return "Lecturer";

  return myRole === "lecturer"
    ? safeStr(active?.otherProgram) || "Student"
    : "Lecturer";
}



/* ---------------- Local presence (same-browser only) ---------------- */
const PRESENCE_KEY = "presence__byUserId";

function touchPresence(userId) {
  const id = normalizeUserId(userId);
  if (!id) return;

  const m = safeParse(localStorage.getItem(PRESENCE_KEY)) || {};
  m[id] = Date.now();
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(m));
}

function isOnline(userId) {
  const id = normalizeUserId(userId);
  if (!id) return false;

  const m = safeParse(localStorage.getItem(PRESENCE_KEY)) || {};
  return Date.now() - (m[id] || 0) < 5 * 60 * 1000;
}

export default function MessagingDock({ me }) {
  // (1) ✅ normalize MY userId used everywhere (threads, markRead, fromUserId)
  const userId = normalizeUserId(
  me?.email ||          // ✅ prefer email if available
    me?.userId ||
    me?.id ||
    me?.uid ||
    me?.studentId ||
    me?.lecturerId
);

  const myRole = safeStr(me?.role); // "student" or "lecturer"
  const scopeKey = makeScopeKey(me);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("focused"); // focused | other (reserved)
  const [q, setQ] = useState("");

  /*const [people, setPeople] = useState([]);
  // ✅ ADD THIS RIGHT HERE
  const [roleByUserId, setRoleByUserId] = useState(() => new Map());
  const [threads, setThreads] = useState([]);*/
const [people, setPeople] = useState([]);
const [roleByUserId, setRoleByUserId] = useState(() => new Map());
const [presenceByUserId, setPresenceByUserId] = useState({});
const [threads, setThreads] = useState([]);

  // { threadId, otherUserId, otherName, otherAvatarUrl, otherProgram? }
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);

  // separate LinkedIn-style chat window state
  const [chatOpen, setChatOpen] = useState(false);
  function closeChat() {
    setChatOpen(false);
    setActive(null);
    setMsgs([]);
  }

  // attachment icon toggle (UI only)
  const [attachOpen, setAttachOpen] = useState(false);
  // ✅ upload attachments (real file/image upload)
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // composer
  const [msgText, setMsgText] = useState("");
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerAttachments, setComposerAttachments] = useState([]); // [{url,name,contentType,key}...]

  // simple attachment url + name
  const [attUrl, setAttUrl] = useState("");
  const [attName, setAttName] = useState("");

  /*const pollRef = useRef(null);
  const convoPollRef = useRef(null);*/
  const pollRef = useRef(null);
  const convoPollRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const messageRefs = useRef(new Map());
  const pendingScrollMessageIdRef = useRef("");

  const otherRole = useMemo(() => {
    if (myRole === "student") return "lecturer";
    if (myRole === "lecturer") return "student";
    return "lecturer";
  }, [myRole]);

  useEffect(() => {
  if (!userId) return;

  touchPresence(userId);
  const t = setInterval(() => touchPresence(userId), 60000);

  return () => clearInterval(t);
}, [userId]);

  async function refreshThreads() {
    if (!userId) return;
    const data = await listThreads({ userId }); // already normalized
    setThreads(data.threads || []);
    return data.threads || [];
  }

  async function refreshPeople(search = "") {
    if (!scopeKey || !myRole) return;
    /*const data = await listPeople({ scopeKey, role: otherRole, q: search });*/
    const data = await listPeople({ scopeKey, role: listRole, q: search });
    

const arr = data.people || [];

    // ✅ if student is viewing Students tab, remove "me" from the list
    const filtered =
      myRole === "student" && tab === "other"
        ? arr.filter((p) => normalizeUserId(p?.userId || p?.email) !== userId)
        : arr;

    setPeople(sortPeopleWithUnreadFirst(filtered, threads));


  }

  const listRole = useMemo(() => {
  // lecturer experience unchanged: they only list students
  if (myRole === "lecturer") return "student";

  // student can switch tabs
  if (myRole === "student") {
    return tab === "other" ? "student" : "lecturer";
  }

  // fallback
  return "lecturer";
}, [myRole, tab]);



async function refreshRoleDirectory() {
  if (myRole !== "student") return;   // only students need both tabs
  if (!scopeKey) return;

  try {
    // Fetch BOTH lists (no search filtering) so badges are always correct
    const [lec, stu] = await Promise.all([
      listPeople({ scopeKey, role: "lecturer", q: "" }),
      listPeople({ scopeKey, role: "student", q: "" }),
    ]);

    const next = new Map();

    for (const p of lec?.people || []) {
      const id = normalizeUserId(p?.userId || p?.email);
      if (id) next.set(id, "lecturer");
    }
    for (const p of stu?.people || []) {
      const id = normalizeUserId(p?.userId || p?.email);
      if (id) next.set(id, "student");
    }

    setRoleByUserId(next);
  } catch {
    // ignore; badges will just be best-effort
  }
}



async function refreshPresence(extraUserIds = []) {
  try {
    const ids = new Set();

    ids.add(userId);

    for (const p of people || []) {
      const id = normalizeUserId(p?.userId || p?.email);
      if (id) ids.add(id);
    }

    for (const t of threads || []) {
      const id = normalizeUserId(t?.otherUserId);
      if (id) ids.add(id);
    }

    for (const id of extraUserIds || []) {
      const v = normalizeUserId(id);
      if (v) ids.add(v);
    }

    const arr = Array.from(ids).filter(Boolean);
    if (!arr.length) return;

    const data = await getPresence({ userIds: arr });
    setPresenceByUserId(data?.presence || {});
  } catch {
    // keep UI quiet
  }
}


  async function openConversation(thread) {
    setChatOpen(true);
    setAttachOpen(false);

    // keep header avatar/name stable even if thread payload is partial
    setActive((prev) => {
      const merged = { ...(prev || {}), ...(thread || {}) };

      merged.otherAvatarUrl =
        safeStr(thread?.otherAvatarUrl) ||
        safeStr(prev?.otherAvatarUrl) ||
        safeStr(thread?.avatarUrl) ||
        safeStr(prev?.avatarUrl) ||
        "";

      merged.otherName =
        safeStr(thread?.otherName) ||
        safeStr(prev?.otherName) ||
        safeStr(thread?.fullName) ||
        safeStr(prev?.fullName) ||
        "";

      merged.otherProgram =
        safeStr(thread?.otherProgram) ||
        safeStr(prev?.otherProgram) ||
        "";

      merged.otherRole =
        safeStr(thread?.otherRole) ||
        safeStr(prev?.otherRole) ||
        safeStr(roleByUserId.get(normalizeUserId(thread?.otherUserId || prev?.otherUserId))) ||
        "";

      // normalize otherUserId if present
      merged.otherUserId = normalizeUserId(
        thread?.otherUserId || prev?.otherUserId
      );
      return merged;
    });

    setMsgs([]);
    messageRefs.current = new Map();
    pendingScrollMessageIdRef.current = "";

    const threadId = safeStr(thread?.threadId);
    if (!threadId) return;

    try {
      const data = await getConversation({ threadId, limit: 50 });
      const incoming = Array.isArray(data?.messages) ? data.messages : [];
      setMsgs(incoming);

      const unreadCount = Number(thread?.unreadCount || 0);
      if (unreadCount > 0 && incoming.length > 0) {
        const ordered = incoming.slice().reverse(); // oldest -> newest for rendered order
        const unreadSlice = ordered.slice(-unreadCount);
        const target = unreadSlice[unreadSlice.length - 1] || null; // newest unread
        pendingScrollMessageIdRef.current = messageKey(target);
      }
    } catch {
      setMsgs([]);
    }

    try {
      await markRead({ userId, threadId }); // userId normalized
    } catch {}

    try {
      await refreshThreads();
    } catch {}
  }

  async function openChat(person) {
    setChatOpen(true);
    setAttachOpen(false);
    if (!person?.userId && !person?.email) return;

    // (2) ✅ normalize otherUserId consistently
    const otherUserId = normalizeUserId(person.userId || person.email);
    const otherName = safeStr(person.fullName); // keep titles like "Dr." / "Prof." as-is
    const otherAvatarUrl = safeStr(person.avatarUrl);
    const otherProgram = safeStr(person.program); // student subtitle

    // open UI immediately even if no thread yet
    setActive({
      threadId: "",
      otherUserId,
      otherName,
      otherAvatarUrl,
      otherProgram,
      otherRole: safeStr(person.role), // ✅ add this
    });
    setMsgs([]);

    // find existing thread
    let tlist = [];
    try {
      const data = await listThreads({ userId }); // userId normalized
      tlist = data.threads || [];
      setThreads(tlist);
    } catch {
      tlist = threads || [];
    }

    // ✅ compare normalized ids (prevents "u1" vs "uid:u1" mismatches)
    const existing = (tlist || []).find(
      (t) => normalizeUserId(t?.otherUserId) === otherUserId
    );

    if (existing?.threadId) {
      await openConversation({
        ...existing,
        otherUserId,
        otherName: otherName || existing.otherName || "",
        otherAvatarUrl: otherAvatarUrl || existing.otherAvatarUrl || "",
        otherProgram: otherProgram || existing.otherProgram || "",
      });
    }
  }





  // ✅ TODO: wire to your existing S3/CloudFront uploader (posts/marketplace uploader)
  // Must return { url, name, contentType }
  async function uploadAttachmentFile(file) {
    // Placeholder so we don't silently fail.
    // You will replace this function after you share your uploader helper (postsApi.js etc.)
    throw new Error("UPLOAD_NOT_WIRED_YET");
  }

  async function onPickFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking the same file again
    if (!files.length) return;

    try {
      setUploading(true);

      for (const file of files) {
        const out = await uploadAttachmentFile(file); // {url,name,contentType}
        if (out?.url) {
          setComposerAttachments((prev) => [
            ...prev,
            {
              url: out.url,
              name: out.name || file.name || "attachment",
              contentType: out.contentType || file.type || "",
            },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
      alert(String(err?.message || "Upload failed"));
    } finally {
      setUploading(false);
      setAttachOpen(true);
    }
  }

  async function handleSend() {
    if (!active) return;

    const text = safeStr(msgText);

    // allow adding a pasted URL as an attachment
    const u = safeStr(attUrl);
    if (u) {
      setComposerAttachments((prev) => [
        ...prev,
        { url: u, name: safeStr(attName) || "attachment" },
      ]);
    }

    const attachments = Array.isArray(composerAttachments)
      ? composerAttachments
      : [];

    // include immediate attachment if state hasn't flushed yet
    const immediate = u
      ? [{ url: u, name: safeStr(attName) || "attachment" }]
      : [];
    const finalAttachments = u && attachments.length === 0 ? immediate : attachments;

    if (!text && finalAttachments.length === 0) return;

    let out = null;
    try {
      out = await sendMessage({
        // ✅ fromUserId should be the normalized userId (fixes "u1" causing backend 500)
        fromUserId: userId,
        // (3) ✅ normalize toUserId too
        toUserId: normalizeUserId(active.otherUserId),
        scopeKey,
        text,
        attachments: finalAttachments,
      });
    } catch {
      return;
    }

    setMsgText("");
    setAttUrl("");
    setAttName("");
    setComposerAttachments([]);
    setAttachOpen(false);

    const newThreadId = safeStr(out?.threadId) || safeStr(active?.threadId);
    if (newThreadId && safeStr(active?.threadId) !== newThreadId) {
      setActive((prev) => (prev ? { ...prev, threadId: newThreadId } : prev));
    }

    if (newThreadId) {
      try {
        const data = await getConversation({ threadId: newThreadId, limit: 50 });
        setMsgs(data.messages || []);
      } catch {}
      try {
        await refreshThreads();
      } catch {}
    } else {
      try {
        await refreshThreads();
      } catch {}
    }
  }

  

  useEffect(() => {
  if (!open) return;
  refreshThreads();
  refreshPeople(q);
  refreshRoleDirectory(); // ✅ add this
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, tab]);

  

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => refreshPeople(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open, threads]);

  // threads polling (badge across devices)
  useEffect(() => {
    if (!userId) return;
    clearInterval(pollRef.current);
    /*pollRef.current = setInterval(() => {
      refreshThreads().catch(() => {});
    }, open ? 6000 : 12000);*/
    pollRef.current = setInterval(() => {
  refreshThreads()
    .then(() => refreshRoleDirectory())
    .catch(() => {});
}, open ? 6000 : 12000);

    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, open]);

  // conversation polling (only if we have threadId)
  useEffect(() => {
    clearInterval(convoPollRef.current);
    const threadId = safeStr(active?.threadId);
    if (!threadId) return;

    convoPollRef.current = setInterval(async () => {
      try {
        const data = await getConversation({ threadId, limit: 50 });
        setMsgs(data.messages || []);
      } catch {}
    }, 4000);

    return () => clearInterval(convoPollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.threadId]);

  // ✅ ADD THIS BLOCK RIGHT HERE
useEffect(() => {
  if (!open) return;
  refreshPresence(active?.otherUserId ? [active.otherUserId] : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, people, threads, active?.otherUserId]);


  useEffect(() => {
  if (!userId || !scopeKey) return;

  let cancelled = false;

  const run = async () => {
    try {
      await heartbeatPresence({ userId, scopeKey });
      if (!cancelled) {
        await refreshPresence(active?.otherUserId ? [active.otherUserId] : []);
      }
    } catch {
      // ignore
    }
  };

  run();
  const t = setInterval(run, 60000);

  return () => {
    cancelled = true;
    clearInterval(t);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userId, scopeKey, active?.otherUserId]);





  /* ✅ ADD THIS EFFECT RIGHT HERE (auto-scroll to newest unread message) */
useEffect(() => {
  const targetId = pendingScrollMessageIdRef.current;
  if (!targetId) return;

  const el = messageRefs.current.get(targetId);
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    pendingScrollMessageIdRef.current = "";
  }
}, [msgs]);

  const unseen = useMemo(() => {
    return (threads || []).reduce((acc, t) => acc + (t.unreadCount || 0), 0);
  }, [threads]);

  const unreadByOtherId = useMemo(() => {
  const map = new Map();

  for (const t of threads || []) {
    const otherId = normalizeUserId(t?.otherUserId);
    const c = Number(t?.unreadCount || 0);
    if (!otherId || c <= 0) continue;
    map.set(otherId, c);
  }

  return map;
}, [threads]);

const unreadCountsByRole = useMemo(() => {
  let lecturers = 0;
  let students = 0;

  for (const t of threads || []) {
    const c = Number(t?.unreadCount || 0);
    if (c <= 0) continue;

    const otherId = normalizeUserId(t?.otherUserId);
    if (!otherId) continue;

    const r = roleByUserId.get(otherId);

    if (r === "student") students += c;
    else if (r === "lecturer") lecturers += c;
    else {
      // fallback: if role not found, keep it under lecturers
      lecturers += c;
    }
  }

  return { lecturers, students };
}, [threads, roleByUserId]);

// ✅ ADD THESE TWO HELPERS RIGHT HERE
function isOnlineNow(id) {
  const row = presenceByUserId?.[normalizeUserId(id)];
  return Boolean(row?.isOnline);
}

function myOnlineNow() {
  return isOnlineNow(userId);
}


  if (!userId || !myRole || !scopeKey) return null;

  return (
      /*<div className="fixed bottom-4 right-[160px] z-50">*/
      <div className="fixed bottom-4 right-3 sm:right-[160px] z-50">
      {/* collapsed pill */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-white shadow-lg border border-slate-200 px-3 py-2"
        >
          {/*<div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden">
            {me?.avatarUrl ? (
              <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>*/}
          <div className="relative w-7 h-7 rounded-full bg-slate-200 overflow-hidden">
  {me?.avatarUrl ? (
    <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
  ) : null}
  <span
    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
      /*isOnline(userId) ? "bg-green-500" : "bg-slate-300"*/
      myOnlineNow() ? "bg-emerald-500" : "bg-slate-300"
    }`}
  />
</div>
          <span className="font-semibold">Messaging</span>
          {/*{unseen > 0 && <span className="ml-1 w-2 h-2 rounded-full bg-emerald-600" />}*/}
          {unseen > 0 ? (
  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold">
    {unseen}
  </span>
) : null}

          <span className="ml-2 text-slate-500">▲</span>
        </button>
      )}

      {/* expanded tray: list-only dock */}
      {open && (
        /*<div className="w-[320px] h-[540px] bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden flex flex-col">*/
        /*<div className="w-[320px] max-w-[calc(100vw-24px)] h-[min(540px,calc(100vh-110px))] bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden flex flex-col">*/
        <div className="w-[calc(100vw-24px)] sm:w-[320px] h-[min(540px,calc(100vh-110px))] bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          {/* header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {/*<div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden">
                {me?.avatarUrl ? (
                  <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>*/}
              <div className="relative w-7 h-7 rounded-full bg-slate-200 overflow-hidden">
  {me?.avatarUrl ? (
    <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
  ) : null}
  <span
    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
      myOnlineNow() ? "bg-emerald-500" : "bg-slate-300"
    }`}
  />
</div>
              <div className="font-semibold">Messaging</div>
              {unseen > 0 && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="text-slate-600 hover:text-slate-900"
              title="Close"
            >
              ▼
            </button>
          </div>

          {/* search */}
          <div className="p-3 border-b border-slate-100">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              /*placeholder={`Search ${otherRole} by name`}*/
              placeholder={`Search ${listRole} by name`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
            />
          </div>

          
<div className="flex border-b border-slate-100">
  <button
    onClick={() => setTab("focused")}
    className={`flex-1 py-2 text-sm flex items-center justify-center gap-2 ${
      tab === "focused"
        ? "font-semibold border-b-2 border-emerald-600"
        : "text-slate-500"
    }`}
  >
    {myRole === "student" ? "Lecturers" : "Students"}

    {myRole === "student" && unreadCountsByRole.lecturers > 0 ? (
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold">
        {unreadCountsByRole.lecturers}
      </span>
    ) : null}
  </button>

  <button
    onClick={() => setTab("other")}
    className={`flex-1 py-2 text-sm flex items-center justify-center gap-2 ${
      tab === "other"
        ? "font-semibold border-b-2 border-emerald-600"
        : "text-slate-500"
    }`}
  >
    {myRole === "student" ? "Students" : "Other"}

    {myRole === "student" && unreadCountsByRole.students > 0 ? (
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold">
        {unreadCountsByRole.students}
      </span>
    ) : null}
  </button>
</div>

          {/* list area */}
          <div className="flex-1 min-h-0 overflow-auto">
            

            <div className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-500">
              {/*{otherRole === "lecturer" ? "Lecturers" : "Students"}*/}
              {listRole === "lecturer" ? "Lecturers" : "Students"}
            </div>

            {people.map((p) => {
              const t = threadForPerson(threads, p.userId || p.email);
              const hasUnread = (t?.unreadCount || 0) > 0;

              return (
                <button
                  key={p.userId || p.email}
                  onClick={() => openChat(p)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    {/*<div className="relative w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0">
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}

                      {/* ✅ unread dot */}
                      {/*{hasUnread ? (
                        <span className="absolute -right-0.5 -top-0.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white" />
                      ) : null}
                    </div>*/}
                    <div className="relative w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0">
  {p.avatarUrl ? (
    <img
      src={p.avatarUrl}
      alt=""
      className="w-full h-full object-cover"
    />
  ) : null}

  {hasUnread ? (
    <span className="absolute -right-0.5 -top-0.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white" />
  ) : null}

  <span
    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
      /*isOnline(p.userId || p.email) ? "bg-green-500" : "bg-slate-300"*/
      isOnlineNow(p.userId || p.email) ? "bg-emerald-500" : "bg-slate-300"
    }`}
  />
</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        {/*<div className="font-semibold truncate">{p.fullName}</div>*/}
                        {(() => {
  const pid = normalizeUserId(p.userId || p.email);
  const c = unreadByOtherId.get(pid) || 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="font-semibold truncate">{p.fullName}</div>

      {c > 0 ? (
        <span className="shrink-0 inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold flex items-center justify-center">
            {c}
          </span>
        </span>
      ) : null}
    </div>
  );
})()}
  </div>

                      {/* Optional: show last message preview if exists, otherwise program */}
                      <div className="text-xs text-slate-500 truncate">
                        {t?.lastText ? t.lastText : (p.program || "")}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {people.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No results.</div>
            )}
          </div>
        </div>
      )}

      {/* separate chat window next to dock (LinkedIn-style) */}
      {chatOpen && active && (
        /*<div className="fixed bottom-4 right-[485px] z-50 w-[650px] h-[540px] bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden flex flex-col">*/
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-[485px] z-50 w-auto sm:w-[650px] h-[min(540px,calc(100vh-110px))] bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        
          {/* chat header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
            <div className="flex items-center gap-2 min-w-0">
              {/*<div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0">
                {active.otherAvatarUrl || active.avatarUrl ? (
                  <img
                    src={active.otherAvatarUrl || active.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>*/}
              <div className="relative w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0">
  {active.otherAvatarUrl || active.avatarUrl ? (
    <img
      src={active.otherAvatarUrl || active.avatarUrl}
      alt=""
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full" />
  )}

  <span
    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
      /*isOnline(active.otherUserId) ? "bg-green-500" : "bg-slate-300"*/
      isOnlineNow(active?.otherUserId) ? "bg-emerald-500" : "bg-slate-300"
    }`}
  />
</div>



              <div className="min-w-0">
                <div className="font-semibold truncate">{active.otherName || "Conversation"}</div>
                
                  <div className="text-xs text-slate-500 truncate">
                  {resolveHeaderSubtitle({ myRole, active, roleByUserId })}
                </div>

              </div>
            </div>

            <button
              onClick={closeChat}
              className="text-slate-600 hover:text-slate-900"
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* messages (LinkedIn rows, not bubbles) */}
            <div
            ref={messagesScrollRef}
            /*className="flex-1 min-h-0 overflow-auto px-2 py-3 space-y-4">*/
            className="flex-1 min-h-0 overflow-auto px-2 py-3 pb-24 sm:pb-3 space-y-4">
            {msgs.length === 0 ? (
              <div className="text-sm text-slate-500">
                No messages yet. Send the first message to start this conversation.
              </div>
            ) : (
              msgs
                .slice()
                .reverse()
                .map((m) => {
                  const mine = normalizeUserId(m?.fromUserId) === userId;

                  return (
                    
                     <div
                      key={m.messageId || m.sk || `${m.createdAt || ""}`}
                      ref={(el) => {
                        const k = messageKey(m);
                        if (!k) return;
                        if (el) messageRefs.current.set(k, el);
                        else messageRefs.current.delete(k);
                      }}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div className="w-full">
                        <div className="flex items-start gap-2">
                          {/* avatar */}
                          {/*<div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                            {mine ? (
                              me?.avatarUrl ? (
                                <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : null
                            ) : active?.otherAvatarUrl ? (
                              <img
                                src={active.otherAvatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>*/}

                          <div className="relative w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
  {mine ? (
    me?.avatarUrl ? (
      <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
    ) : null
  ) : active?.otherAvatarUrl ? (
    <img
      src={active.otherAvatarUrl}
      alt=""
      className="w-full h-full object-cover"
    />
  ) : null}

  <span
    className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-white ${
      mine
        ? isOnline(userId)
          ? "bg-green-500"
          : "bg-slate-300"
        : isOnline(active?.otherUserId)
        ? "bg-green-500"
        : "bg-slate-300"
    }`}
  />
</div>

                          <div className="min-w-0 text-left">
                            {/* name + role + date (single line) */}
                            <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">
                                {mine
                                  ? safeStr(me?.fullName || me?.name) || "You"
                                  : active?.otherName || "User"}
                              </span>

                              <span className="text-slate-400">•</span>
                               <span>
                                {resolveDisplayRole({
                                  mine,
                                  myRole,
                                  me,
                                  active,
                                  roleByUserId,
                                })}
                              </span>

                              <span className="text-slate-400">•</span>

                              <span className="text-[11px] text-slate-400">
                                {new Date(m.createdAt || 0).toLocaleString()}
                              </span>
                            </div>

                            {/* text */}
                            {m.text ? (
                              <div className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                                {m.text}
                              </div>
                            ) : null}

                            
                            {/* attachments */}
{(m.attachments || []).length > 0 ? (
  <div className="mt-2 space-y-2">
    {(m.attachments || []).map((a, idx) => {
      const ct = String(a?.contentType || a?.mime || "").toLowerCase();
      const url = String(a?.url || "").toLowerCase();
      const name = String(a?.name || a?.fileName || "attachment");

      const isImage =
        ct.startsWith("image/") ||
        /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/.test(url) ||
        /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);

      return isImage ? (
        <a
          key={idx}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="block"
        >
          <img
            src={a.url}
            alt={name}
            className="max-w-[500px] w-full rounded-lg border border-slate-200 object-cover"
            loading="lazy"
          />
          <div className="mt-1 text-xs text-slate-500 truncate">
            {name}
          </div>
        </a>
      ) : (
        <a
          key={idx}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-blue-600 hover:underline break-all"
        >
          {name}
        </a>
      );
    })}
  </div>
) : null}

                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* composer (LinkedIn-like) */}
          {/*<div className="border-t border-slate-200 p-3">*/}
          <div className="border-t border-slate-200 px-3 pt-4 pb-6 sm:p-3">
<div className="relative">
  <textarea
    value={msgText}
    onChange={(e) => setMsgText(e.target.value)}
    placeholder="Write a message..."
    /*className={`w-full resize-none rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm outline-none ${*/
    className={`w-full resize-none rounded-lg border border-slate-200 px-3 py-3 pr-10 text-sm outline-none ${
      composerExpanded ? "h-46" : "h-14"
    }`}
  />

  {/* ✅ Attachment preview shown in the editor area (does not push Send) */}
{(composerAttachments || []).length > 0 ? (
  <div className="mt-2 flex flex-wrap gap-2">
    {composerAttachments.map((a, idx) => {
      const isImg =
        /^image\//i.test(String(a.contentType || "")) ||
        /\.(png|jpe?g|gif|webp)$/i.test(String(a.url || ""));

      return (
        <div
          key={idx}
          className="relative border border-slate-200 rounded-md bg-slate-50 p-1"
        >
          {isImg ? (
            <img
              src={a.url}
              alt={a.name || "image"}
              className="h-16 w-24 object-cover rounded"
            />
          ) : (
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="block max-w-[180px] text-xs text-blue-600 underline truncate px-2 py-2"
              title={a.name || "attachment"}
            >
              {a.name || "attachment"}
            </a>
          )}

          <button
            type="button"
            onClick={() =>
              setComposerAttachments((prev) => prev.filter((_, i) => i !== idx))
            }
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-slate-200 text-xs flex items-center justify-center text-slate-600 hover:text-slate-900"
            title="Remove"
          >
            ✕
          </button>
        </div>
      );
    })}
  </div>
) : null}

  {/* LinkedIn-style expand/collapse arrow */}
  <button
    type="button"
    onClick={() => setComposerExpanded((v) => !v)}
    className="absolute right-2 bottom-2 w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
    title={composerExpanded ? "Collapse" : "Expand"}
  >
    <span className="text-slate-600 text-lg leading-none">
      {composerExpanded ? "▾" : "▴"}
    </span>
  </button>
</div>

            {/* queued attachments preview (put ABOVE the bottom row, so it doesn't push Send) */}
{(composerAttachments || []).length > 0 ? (
  <div className="mt-2 text-xs text-slate-600 space-y-1">
    {composerAttachments.map((a, idx) => (
      <div key={idx} className="flex items-center justify-between gap-2">
        <span className="truncate">{a.name || "attachment"}</span>
        <button
          type="button"
          className="text-slate-500 hover:text-slate-900"
          onClick={() =>
            setComposerAttachments((prev) => prev.filter((_, i) => i !== idx))
          }
          title="Remove"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
) : null}

{/* bottom row: 📎 + attach inputs + Send */}
{/*<div className="mt-2 flex items-center justify-between gap-2">*/}
{/*<div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-10 sm:pb-0">*/}
<div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 sm:pb-0">
  {/*<div className="flex items-center gap-2 min-w-0">*/}
  {/*<div className="w-full sm:w-auto flex items-center gap-2 min-w-0">*/}
  <div className="w-full sm:w-auto flex items-center gap-2 min-w-0 mt-2 sm:mt-0">
    <button
      type="button"
      onClick={() => setAttachOpen((v) => !v)}
      className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0"
      title="Add attachment"
    >
      <span className="text-slate-600 text-lg">📎</span>
    </button>

    {attachOpen && (
      <div className="min-w-0">
        {/*<div className="flex items-center gap-2 min-w-0">*/}
          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <input
            value={attUrl}
            onChange={(e) => setAttUrl(e.target.value)}
            placeholder="Paste attachment URL"
            /*className="w-[220px] rounded-md border border-slate-200 px-2 py-1 text-xs outline-none"*/
            className="w-full sm:w-[220px] rounded-md border border-slate-200 px-2 py-1 text-xs outline-none"
          />

          <input
            value={attName}
            onChange={(e) => setAttName(e.target.value)}
            placeholder="Attachment Name"
            /*className="w-[130px] rounded-md border border-slate-200 px-2 py-1 text-xs outline-none"*/
            className="w-full sm:w-[130px] rounded-md border border-slate-200 px-2 py-1 text-xs outline-none"
          />

          <div className="shrink-0 scale-90 origin-left">
            <AttachmentUploader
              value={composerAttachments}
              onChange={(arr) => {
                const mapped = (arr || []).map((a) => ({
                  url: a.url,
                  name: a.fileName || "attachment",
                  contentType: a.mime || "",
                  key: a.key || "",
                }));
                setComposerAttachments(mapped);
              }}
              role={myRole === "lecturer" ? "lecturer" : "student"}
              folder="messaging-attachments"
              maxFiles={5}
              showList={false}
            />
          </div>
        </div>
      </div>
    )}
  </div>

  <button
    onClick={handleSend}
    /*className="rounded-full bg-emerald-600 text-white px-4 py-2 text-sm font-semibold shrink-0"*/
    /*className="self-end sm:self-auto rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-semibold shrink-0 mr-10 sm:mr-0"*/
    className="self-end sm:self-auto rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-semibold shrink-0 mb-2 mr-12 sm:mb-0 sm:mr-0"
  >
    Send
  </button>

</div>
          </div>
        </div>
      )}
    </div>
  );
}