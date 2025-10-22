// src/pages/UniversityAcademicPlatform.jsx
import { useEffect, useMemo, useRef, useState, memo, forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ============ Utils & Storage ============ */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
const ID_KEYS = ["authUserId","activeUserId","currentUserId","loggedInUserId"];
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
  return safeParse(sessionStorage.getItem("currentUser")) || safeParse(localStorage.getItem("currentUser"));
}
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts)/1000);
  if (s<60) return `${s}s`;
  const m = Math.floor(s/60); if (m<60) return `${m}m`;
  const h = Math.floor(m/60); if (h<24) return `${h}h`;
  const d = Math.floor(h/24); return `${d}d`;
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
  return (Date.now() - (m[userId] || 0)) < 5 * 60 * 1000;
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
  const upd = arr.map(n => n._id === notifId ? { ...n, read: true } : n);
  localStorage.setItem(NOTIF_KEY(toUserId), JSON.stringify(upd));
  return upd;
}
function clearNotifs(toUserId) {
  localStorage.setItem(NOTIF_KEY(toUserId), JSON.stringify([]));
  return [];
}

/* ============ UI bits ============ */
const Card = forwardRef(function Card({ className="", children, square=false, ...rest }, ref) {
  return <div ref={ref} className={`${square ? "rounded-none" : "rounded-2xl"} border border-slate-200 bg-white shadow-sm ${className}`} {...rest}>{children}</div>;
});
function HeaderBar({ title, square=false }) {
  return (
    <div className={`${square ? "rounded-none" : "rounded-t-2xl"} px-4 py-2.5 bg-[#7bdad1]/90 text-slate-900 text-sm font-semibold text-center`}>
      {title}
    </div>
  );
}
function Avatar({ url, name, size="md", online=false }) {
  const sz = size==="lg"?"h-12 w-12":size==="sm"?"h-7 w-7":"h-9 w-9";
  const initials = (name||"User").split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join("") || "U";
  return (
    <div className={`relative ${sz} rounded-full bg-slate-300 overflow-hidden flex items-center justify-center shrink-0`}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover"/> :
        <span className="text-white text-xs bg-gradient-to-tr from-blue-500 to-indigo-500 h-full w-full flex items-center justify-center">{initials}</span>}
      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${online ? "bg-green-500" : "bg-slate-300"}`} />
    </div>
  );
}

/* ReadMore (works without line-clamp plugin) */
function HTMLReadMore({ html="", lines=3 }) {
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
        <button type="button" onClick={()=>setOpen(o=>!o)} className="text-blue-600 text-xs mt-1 underline">
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

/* ============ Attachments ============ */
function readFiles(files) {
  const arr = Array.from(files || []);
  return Promise.all(arr.map(async (f) => {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    return { id: uid(), name: f.name, type: f.type, size: f.size, dataUrl };
  }));
}

function AttachmentStrip({ atts=[], onPreview }) {
  if (!atts.length) return null;
  const images = atts.filter(a => (a.type||"").startsWith("image/"));
  const files  = atts.filter(a => !(a.type||"").startsWith("image/"));
  return (
    <div className="mt-2 space-y-2">
      {images.length>0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map(img => (
            <button
              key={img.id}
              type="button"
              onClick={()=>onPreview && onPreview(img)}
              className="relative group"
              title="Click to enlarge"
            >
              <img src={img.dataUrl} alt={img.name} className="w-full h-40 object-cover rounded transition-transform group-active:scale-95" />
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white rounded px-1">Zoom</span>
            </button>
          ))}
        </div>
      )}
      {files.length>0 && (
        <ul className="text-sm list-disc pl-5">
          {files.map(f => (
            <li key={f.id} className="break-all">
              <a href={f.dataUrl} download={f.name} className="text-blue-600 underline">{f.name}</a>
              <span className="text-slate-400 text-xs"> ({Math.round((f.size||0)/1024)} KB)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttachmentStripEditable({ atts=[], onRemove, onPreview }) {
  if (!atts.length) return null;
  const images = atts.filter(a => (a.type||"").startsWith("image/"));
  const files  = atts.filter(a => !(a.type||"").startsWith("image/"));
  return (
    <div className="mt-2 space-y-2">
      {images.length>0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map(img => (
            <div key={img.id} className="relative">
              <button type="button" onClick={()=>onPreview && onPreview(img)} title="Click to enlarge" className="w-full">
                <img src={img.dataUrl} alt={img.name} className="w-full h-40 object-cover rounded" />
              </button>
              <button
                type="button"
                onClick={()=>onRemove(img.id)}
                className="absolute top-1 right-1 rounded-full bg-white/90 border border-slate-300 text-xs px-2 py-0.5 hover:bg-white"
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length>0 && (
        <ul className="text-sm pl-0">
          {files.map(f => (
            <li key={f.id} className="flex items-center gap-2 border border-slate-200 rounded px-2 py-1">
              <a href={f.dataUrl} download={f.name} className="text-blue-600 underline truncate">{f.name}</a>
              <span className="text-slate-400 text-xs">({Math.round((f.size||0)/1024)} KB)</span>
              <button
                type="button"
                onClick={()=>onRemove(f.id)}
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
}

/* Lightbox for image preview */
function Lightbox({ img, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!img) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <img src={img.dataUrl} alt={img.name} className="max-h-full max-w-full rounded shadow-lg" />
    </div>
  );
}

/* ============ Categories & Topics ============ */
const TOPIC_MAP = {
  "Law": ["Admiralty (Maritime) Law","Business law","Child Protection Laws","Construction Law","Corporate Law","Criminal Law","Cybersecurity Law","Environmental Law","Health Law","Human Rights Law","Intellectual Property Law","International Law","Marriage Law","Tax Law"],
  "Engineering": ["Aeronautical Engineering","Agricultural Engineering","Architectural Engineering","Architecture","Aviation Engineering","Biomedical Engineering","Chemical Engineering","Civil Engineering","Computer and IT Engineering","Electrical Engineering","Electronic Engineering","Environmental Engineering","General Engineering","Geological Engineering","Industrial Engineering","Manufacturing Engineering","Marine Engineering","Mechanical Engineering","Metallurgical Engineering","Mining Engineering","Textiles Engineering"],
  "Natural sciences": ["Biochemistry","Biology","Chemistry","Mathematics / Statistics","Microbiology","Physics","Botany","Zoology"],
  "Sports": ["Physical Education","Sport Science","English Premier League","Spanish La Liga","German Bundesliga","Italian Serie A","French Ligue 1","Cricket","Field hockey","Tennis","Volleyball","Table tennis","Baseball","Golf","Basketball","American football","Athletics sports","NBA"],
  "Business Studies": ["Accounting","Finance","Marketing","Management","Human Resources","Business Analytics","Entrepreneurship","Supply Chain Management","Information Systems","Project Management","Tourism / Hospitality","Crypto Currency","Banking","Insurance","Mortgages","Credit Cards","Tax Studies","Personal loans","Autoloans"],
  "Social Sciences": ["Anthropology","Archaeology","Criminology","Geography","History","International relations","Political Science","Psychology","Public Administration","Social Policy","Social work","Sociology"],
  "Agriculture": ["Agribusiness and Agricultural Economics","Agricultural engineering","Agriculture","Agronomy","Animal Science","Aquaculture Science","Crop Science","Environmental Sciences and Management","Food science & Technology","Forestry","Horticulture","Human Nutrition","Irrigation and Water Resources Engineering","Marine Science","Natural resource management.","Textiles and Fibre Science","Veterinary Science & Medicine"],
  "Economics": ["Behavioral Economics","Crypto Currency","Development Economics","Economic Sanctions","Financial Economics","Health Economics","Internal Trade","International Economics","Labor Economics","Macroeconomics","Microeconomics","Public Economics","Real Estate","Stock Markets","Treasure Bonds","Digital Economy","Inequality and Poverty"],
  "Arts & Humanities": ["Applied Arts","Classics","Design","Education","Fine Arts","History","Literature","Museum Studies","Performing Arts","Philosophy","Religion and Theology","Visual Arts"],
  "Current & Trending Topics": ["Artificial Intelligence (AI)","Climate Change","Divorce","Economic Inequality:","Gender Equality","Girl-Boy friends Relationship","Healthcare Access","Marriage Relationship","Mental Health","Pre-Marital Sexual relationship","Privacy","Racial and Ethnic Inequality","Social Media Fatigue","Trending fashions & Styles","University Life","University Students Relationship"],
  "Medicine & Health": ["Anaesthesia","Anatomy","Biomedical Science","Dentistry","Dermatology","Medicine / Surgery","Natural / Alternative Medicine","Nursing","Obstetrics / Gynaecology","Optometry / Ophthalmology","Orthopaedics","Otorhinolaryngology","Pathology","Pediatrics","Podiatry","Psychiatry","Radiography","Speech / Rehabilitation / Physio"]
};
const CATEGORIES = ["All", ...Object.keys(TOPIC_MAP)];

/* ============ Simple textarea-based HTML editor ============ */
function ToolbarButton({ onAction, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e)=>{ e.preventDefault(); onAction && onAction(); }}
      onClick={(e)=>e.preventDefault()}
      className="border border-slate-200 rounded px-2 py-1 text-xs hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

const SimpleHTMLEditor = memo(function SimpleHTMLEditor({ html, onChange, placeholder="Write here…" }) {
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

  const makeList = (ordered=false) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const before = value.lastIndexOf("\n", start - 1) + 1;
    const after  = value.indexOf("\n", end);
    const to = after === -1 ? value.length : after;
    const block = value.slice(before, to);
    const lines = block.split("\n").map(s => s.trim()).filter(s => s.length>0);
    if (!lines.length) return;
    const items = lines.map(s => `<li>${s}</li>`).join("");
    const wrapped = (ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`);
    const next = value.slice(0, before) + wrapped + value.slice(to);
    onChange(next);
    requestAnimationFrame(()=>{ ta.focus(); });
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
    requestAnimationFrame(()=>ref.current?.focus());
  };

  return (
    <div className="border border-slate-200 rounded">
      <div className="flex flex-wrap gap-1 p-1 border-b border-slate-200 bg-slate-50">
        <ToolbarButton onAction={()=>wrapSel("<strong>","</strong>")} title="Bold">B</ToolbarButton>
        <ToolbarButton onAction={()=>wrapSel("<em>","</em>")} title="Italic"><span className="italic">I</span></ToolbarButton>
        <ToolbarButton onAction={()=>wrapSel("<u>","</u>")} title="Underline"><span className="underline">U</span></ToolbarButton>
        <ToolbarButton onAction={()=>makeList(false)} title="Bulleted list">• List</ToolbarButton>
        <ToolbarButton onAction={()=>makeList(true)} title="Numbered list">1. List</ToolbarButton>
        <ToolbarButton onAction={createLink} title="Insert link">Link</ToolbarButton>
        <ToolbarButton onAction={clearFormatting} title="Clear formatting">Clear</ToolbarButton>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[96px] max-h-[45vh] w-full overflow-auto px-3 py-2 text-sm outline-none"
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
}, (p,n)=>p.html===n.html && p.onChange===n.onChange);

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
          onClick={()=>setOpen(o=>!o)}
          className="rounded-full shadow border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
          title="Notifications"
        >
          🔔
          {notifs.filter(n=>!n.read).length > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 text-xs rounded-full bg-red-500 text-white px-1">
              {notifs.filter(n=>!n.read).length}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 bottom-10 w-[320px] max-h-[50vh] overflow-auto bg-white border border-slate-200 rounded-xl shadow">
            <div className="px-3 py-2 border-b border-slate-200 flex items-center">
              <div className="font-semibold text-sm">Notifications</div>
              <button
                onClick={()=>{ setNotifs(clearNotifs(userId)); }}
                className="ml-auto text-xs border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-50"
              >
                Clear all
              </button>
            </div>
            <div className="p-2 space-y-2">
              {notifs.length === 0 && <div className="text-sm text-slate-500 px-2 py-3">No notifications yet.</div>}
              {notifs.map(n => (
                <div key={n._id} className={`p-2 rounded border ${n.read ? "border-slate-100 bg-slate-50" : "border-blue-200 bg-blue-50"}`}>
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-slate-600">by {n.by} • {timeAgo(n.createdAt)} ago</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="text-xs border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-100"
                      onClick={()=>{
                        setNotifs(markNotifRead(userId, n._id));
                        onOpenPost?.(n.postId);
                      }}
                    >
                      Open
                    </button>
                    {!n.read && (
                      <button
                        className="text-xs border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-100"
                        onClick={()=>{ setNotifs(markNotifRead(userId, n._id)); }}
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
  const interval = setInterval(()=>touchPresence(user?.id), 60_000);
  return () => clearInterval(interval);
}, [user, navigate]);

  const seeded = useMemo(() => {
    const now = Date.now();
    return [
      {
        id: uid(),
        title: "Welcome! Ask or share thoughts about your courses here.",
        bodyHtml: "Click the prompt above to open the editor. Attach images/files when helpful. Be respectful and cite sources.",
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
          photoUrl: user?.photoUrl || ""
        },
        university: uni,
        createdAt: now - 3600_000,
        attachments: [],
        comments: []
      }
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uni]);

  const [posts, setPosts] = useState(() => {
    const ls = safeParse(localStorage.getItem(STORE_KEY));
    return Array.isArray(ls) ? ls : seeded;
  });
  const [follows, setFollows] = useState(() => safeParse(localStorage.getItem(FOL_KEY)) || {});
  const [toast, setToast] = useState("");

  // Safe persistence (prevents blank page on large images)
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(posts));
    } catch (e) {
      try {
        const slim = posts.map(p => ({
          ...p,
          attachments: (p.attachments||[]).map(a => ({ id:a.id, name:a.name, type:a.type, size:a.size, dataUrl:"" })),
          comments: (p.comments||[]).map(c => ({
            ...c,
            attachments: (c.attachments||[]).map(a => ({ id:a.id, name:a.name, type:a.type, size:a.size, dataUrl:"" }))
          }))
        }));
        localStorage.setItem(STORE_KEY, JSON.stringify(slim));
        setToast("Images are large; saved a lightweight version so the page stays stable.");
        setTimeout(()=>setToast(""), 4000);
      } catch {}
    }
  }, [posts, STORE_KEY]);

  useEffect(() => { localStorage.setItem(FOL_KEY, JSON.stringify(follows)); }, [follows, FOL_KEY]);

  const postRefs = useRef({});

  /* Filters & UI state */
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("Top");
  const [myOnly, setMyOnly] = useState(false);

  /* When "My Posts" turns on, jump to your latest post regardless of topic/category */
  useEffect(() => {
    if (!myOnly) return;
    const mine = posts.filter(p => p.university === uni && p.author?.id === user?.id);
    if (mine.length) {
      const latest = mine.reduce((a,b)=> (a.createdAt||0) > (b.createdAt||0) ? a : b);
      setTimeout(()=>scrollToPost(latest.id), 120);
    }
  }, [myOnly, posts, user?.id, uni]);

  /* Composer (collapsed by default) */
  const [editorOpen, setEditorOpen] = useState(false);
  const [askTitle, setAskTitle] = useState("");
  const [askBodyHtml, setAskBodyHtml] = useState(""); // still HTML string
  const [askAtts, setAskAtts] = useState([]);
  const [preview, setPreview] = useState(null); // lightbox

  const onPickAskFiles = async (e) => {
    const chosen = await readFiles(e.target.files);
    setAskAtts(prev => [...prev, ...chosen]);
    e.target.value = "";
  };
  const removeAskAttachment = (id) => setAskAtts(prev => prev.filter(a => a.id !== id));

  const postQuestion = (e) => {
    e.preventDefault();
    const plain = (askBodyHtml||"").replace(/<[^>]+>/g, "").trim();
    if (!askTitle.trim() && !plain && askAtts.length===0) return;
    const p = {
      id: uid(),
      title: askTitle.trim() || "(No title)",
      bodyHtml: (askBodyHtml || "").replace(/\n/g, "<br/>"),
      category: selectedCategory==="All" ? "Current & Trending Topics" : selectedCategory,
      topic: selectedTopic==="All" ? "General" : selectedTopic,
      views: 0,
      likes: 0,
      saved: false,
      // ✅ include lecturer title on posts
      author: {
        id: user?.id,
        name: user?.name || "Student",
        program: user?.program || "Program",
        title: user?.title || "",
        photoUrl: user?.photoUrl || ""
      },
      university: uni,
      createdAt: Date.now(),
      attachments: askAtts,
      comments: []
    };
    setPosts(prev => [p, ...prev]);
    setAskTitle(""); setAskBodyHtml(""); setAskAtts([]); setEditorOpen(false);
  };

  /* Post interactions */
  const toggleLike = (id) => setPosts(prev => prev.map(p => p.id===id ? ({...p, likes: (p._liked? p.likes-1 : p.likes+1), _liked: !p._liked}) : p));
  const toggleSave = (id) => setPosts(prev => prev.map(p => p.id===id ? ({...p, saved: !p.saved}) : p));
  const deletePost = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  const addAnswer = async (postId, textHtml, atts=[]) => {
    const plain = (textHtml||"").replace(/<[^>]+>/g, "").trim();
    if (!plain && atts.length===0) return;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const ans = {
        id: uid(),
        parentId: null,
        html: (textHtml||"").replace(/\n/g,"<br/>"),
        authorId: user?.id,
        author: user?.name,
        authorProgram: user?.program,
        authorTitle: user?.title || "",   // ✅ capture title on comments
        authorPhoto: user?.photoUrl,
        createdAt: Date.now(),
        attachments: atts
      };
      if (p.author?.id && p.author.id !== user?.id) {
        pushNotif(p.author.id, {
          type: "comment",
          postId: p.id,
          title: `New comment on: ${p.title}`,
          by: user?.name || "Student"
        });
      }
      return { ...p, comments: [...(p.comments||[]), ans] };
    }));
  };

  const addReply = async (postId, parentId, textHtml, atts=[]) => {
    const plain = (textHtml||"").replace(/<[^>]+>/g, "").trim();
    if (!plain && atts.length===0) return;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const r = {
        id: uid(),
        parentId,
        html: (textHtml||"").replace(/\n/g,"<br/>"),
        authorId: user?.id,
        author: user?.name,
        authorProgram: user?.program,
        authorTitle: user?.title || "",  // ✅ capture title on replies
        authorPhoto: user?.photoUrl,
        createdAt: Date.now(),
        attachments: atts
      };
      if (p.author?.id && p.author.id !== user?.id) {
        pushNotif(p.author.id, {
          type: "reply",
          postId: p.id,
          title: `New reply on: ${p.title}`,
          by: user?.name || "Student"
        });
      }
      return { ...p, comments: [...(p.comments||[]), r] };
    }));
  };

  const followKey = (cat, topic) => `${cat}::${topic}`;
  const isFollowed = (cat, topic) => !!follows[followKey(cat,topic)];
  const toggleFollow = (cat, topic) => setFollows(prev => ({ ...prev, [followKey(cat, topic)]: !prev[followKey(cat, topic)] }));

  /* Derived lists */
  const visibleBase = posts.filter(p => p.university === uni);

  const visible = visibleBase
    .filter(p => (myOnly ? p.author.id === user?.id : true))
    .filter(p => (!myOnly && selectedCategory !== "All" ? p.category === selectedCategory : true))
    .filter(p => (!myOnly && selectedTopic !== "All" ? p.topic === selectedTopic : true))
    .filter(p => q ? ((p.title||"").toLowerCase().includes(q.toLowerCase()) || (p.bodyHtml||"").toLowerCase().includes(q.toLowerCase())) : true);

  const withCounts = visible.map(p => {
    const answers = (p.comments||[]).filter(c => !c.parentId).length;
    return { ...p, _answers: answers };
  });

  let sorted = [...withCounts];
  if (sort === "Top") sorted.sort((a,b) => (b.likes||0) - (a.likes||0));
  if (sort === "Newest") sorted.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  if (sort === "Answered") sorted.sort((a,b) => (b._answers - a._answers) || ((b.createdAt||0)-(a.createdAt||0)));

  /* Collapsible inline composer for comments/replies (controlled) */
  function InlineComposer({ placeholder="Write a comment…", onSubmit, isOpen, setIsOpen }) {
    const [openInternal, setOpenInternal] = useState(false);
    const open = (typeof isOpen === "boolean") ? isOpen : openInternal;
    const setOpen = setIsOpen || setOpenInternal;

    const [html, setHtml] = useState("");
    const [atts, setAtts] = useState([]);
    const onPick = async (e) => {
      const chosen = await readFiles(e.target.files);
      setAtts(prev => [...prev, ...chosen]);
      e.target.value = "";
    };

    if (!open) {
      return (
        <button
          type="button"
          onClick={()=>setOpen(true)}
          className="w-full text-left border border-slate-200 rounded-full px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
        >
          {placeholder}
        </button>
      );
    }
    return (
      <form
        onSubmit={(e)=>{ e.preventDefault(); onSubmit(html, atts); setHtml(""); setAtts([]); setOpen(false); }}
        className="mt-2"
      >
        <AttachmentStripEditable atts={atts} onRemove={(id)=>setAtts(prev=>prev.filter(a=>a.id!==id))} onPreview={setPreview} />
        <div className="mt-2">
          <SimpleHTMLEditor html={html} onChange={setHtml} placeholder={placeholder} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label className="text-xs border border-slate-200 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-50">
            📎 Attach
            <input type="file" className="hidden" multiple onChange={onPick}/>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50">Post</button>
            <button type="button" onClick={()=>{ setOpen(false); setHtml(""); setAtts([]); }} className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      </form>
    );
  }

  function AnswerThread({ post }) {
    const [open, setOpen] = useState(true);
    const [commentOpen, setCommentOpen] = useState(false);
    const [replyOpenById, setReplyOpenById] = useState({});
    const answers = (post.comments||[]).filter(c => !c.parentId);
    const byParent = (post.comments||[]).reduce((acc,c)=>{ if(c.parentId){ (acc[c.parentId] ||= []).push(c);} return acc; }, {});
    const setReplyOpen = (id, val) => setReplyOpenById(s => ({ ...s, [id]: val }));
    return (
      <div className="mt-3">
        <button onClick={()=>setOpen(o=>!o)} className="text-sm text-blue-700 underline">
          Comments ({answers.length}) {open ? "▾" : "▸"}
        </button>
        {open && (
          <div className="mt-2">
            {answers.map(a => (
              <div key={a.id} className="mt-3">
                <div className="flex items-start gap-2">
                  <Avatar url={a.authorPhoto} name={a.author} size="sm" online={isOnline(a.authorId)} />
                  <div className="bg-slate-50 rounded-2xl px-3 py-2 w-full">
                    <div className="text-sm font-medium text-slate-900">
                      {a.authorTitle ? `${a.authorTitle} ${a.author}` : a.author}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {(a.authorProgram || "")} • {timeAgo(a.createdAt)} ago
                    </div>
                    <HTMLReadMore html={a.html} lines={3} />
                    <AttachmentStrip atts={a.attachments} onPreview={setPreview} />

                    {(byParent[a.id]||[]).map(r => (
                      <div key={r.id} className="mt-3 pl-4 border-l border-slate-200">
                        <div className="flex items-start gap-2">
                          <Avatar url={r.authorPhoto} name={r.author} size="sm" online={isOnline(r.authorId)} />
                          <div className="bg-white rounded-2xl px-3 py-2 border border-slate-100 w-full">
                            <div className="text-sm font-medium text-slate-900">
                              {r.authorTitle ? `${r.authorTitle} ${r.author}` : r.author}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {(r.authorProgram || "")} • {timeAgo(r.createdAt)} ago
                            </div>
                            <HTMLReadMore html={r.html} lines={3} />
                            <AttachmentStrip atts={r.attachments} onPreview={setPreview} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Reply toggle for each comment */}
                    <div className="mt-2 pl-8 flex items-start gap-2">
                      <Avatar url={user?.photoUrl} name={user?.name} size="sm" online />
                      <div className="flex-1">
                        <InlineComposer
                          placeholder="Reply…"
                          onSubmit={(v, ra)=>addReply(post.id, a.id, v, ra)}
                          isOpen={!!replyOpenById[a.id]}
                          setIsOpen={(v)=>setReplyOpen(a.id, v)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* New top-level comment (shows avatar + collapsed input) */}
            <div className="mt-3 flex items-start gap-2">
              <Avatar url={user?.photoUrl} name={user?.name} size="sm" online />
              <div className="flex-1">
                <InlineComposer
                  placeholder="Write a comment…"
                  onSubmit={(v, atts)=>addAnswer(post.id, v, atts)}
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
      el.classList.add("ring-2","ring-yellow-300");
      setTimeout(()=>el.classList.remove("ring-2","ring-yellow-300"), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      {/* Top-left back arrow for lecturers */}
      <div className="relative max-w-[1300px] mx-auto">
        {isLecturer && (
          <>
            {/* Desktop floating arrow just outside the left of the grid */}
            <button
              type="button"
              onClick={()=>navigate("/lecturer/dashboard")}
              title="Back to Lecturer Dashboard"
              className="hidden lg:flex items-center justify-center absolute -left-6 top-6 h-9 w-9 rounded-full border border-slate-200 bg-white shadow hover:bg-slate-50"
              aria-label="Back to Lecturer Dashboard"
            >
              ←
            </button>
            {/* Mobile simple link above content */}
            <div className="lg:hidden px-3 pt-4">
              <button
                type="button"
                onClick={()=>navigate("/lecturer/dashboard")}
                className="inline-flex items-center gap-1 text-sm text-blue-700 underline"
              >
                ← Back to Lecturer Dashboard
              </button>
            </div>
          </>
        )}
      </div>

      <main className="max-w-[1300px] mx-auto px-3 lg:px-5 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-5">
        {/* LEFT rail */}
        <aside className="space-y-4">
          <Card square>
            <HeaderBar title="University Academic Platform" square />
            <div className="p-4">
              <p className="text-xs text-slate-700 text-center">Only for {uni || "your university"}.</p>
            </div>
          </Card>

          <Card square>
            <HeaderBar title="My Posts" square />
            <div className="p-3">
              <button
                onClick={()=>setMyOnly(v=>!v)}
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
                onChange={(e)=>{ const c=e.target.value; setSelectedCategory(c); setSelectedTopic("All"); }}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="max-h-[48vh] overflow-auto pr-1">
                {(selectedCategory === "All" ? ["All"] : TOPIC_MAP[selectedCategory]).map(t => {
                  const topicVal = selectedCategory === "All" ? "All" : t;
                  const active = topicVal === selectedTopic;
                  const canFollow = selectedCategory !== "All" && topicVal !== "All";
                  const f = canFollow ? isFollowed(selectedCategory, topicVal) : false;

                  return (
                    <div key={topicVal} className={`flex items-center gap-2 rounded px-2 py-1 ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                      <button
                        className="text-left text-sm flex-1 truncate"
                        onClick={()=>setSelectedTopic(topicVal)}
                        title={topicVal}
                      >
                        {topicVal}
                      </button>
                      {canFollow && (
                        <button
                          onClick={()=>toggleFollow(selectedCategory, topicVal)}
                          className={`text-xs rounded-full px-2 py-0.5 border ${f?"border-blue-600 text-blue-600":"border-slate-300 text-slate-600"} hover:bg-slate-50`}
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
        </aside>

        {/* CENTER: Composer + Filters + Feed */}
        <section className="space-y-4">
          <Card>
            <div className="p-4">
              {!editorOpen ? (
                <div className="flex items-center gap-3">
                  <Avatar url={user?.photoUrl} name={user?.name} size="md" online={true} />
                  <button
                    onClick={()=>setEditorOpen(true)}
                    className="flex-1 text-left border border-slate-200 rounded-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-600"
                  >
                    What do you want to post, ask or share?
                  </button>
                </div>
              ) : (
                <form onSubmit={postQuestion}>
                  <div className="flex items-start gap-3">
                    <Avatar url={user?.photoUrl} name={user?.name} size="md" online={true} />
                    <div className="flex-1 min-w-0">
                      <input
                        value={askTitle}
                        onChange={e=>setAskTitle(e.target.value)}
                        placeholder="Add a title"
                        className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                      />
                      <div className="mt-2">
                        <SimpleHTMLEditor html={askBodyHtml} onChange={setAskBodyHtml} placeholder="Write your post…" />
                      </div>
                      <AttachmentStripEditable atts={askAtts} onRemove={removeAskAttachment} onPreview={setPreview} />
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs border border-slate-200 rounded-full px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                          📎 Attach images/files
                          <input type="file" className="hidden" multiple onChange={onPickAskFiles}/>
                        </label>
                        <div className="ml-auto flex items-center gap-2">
                          <select
                            value={selectedCategory}
                            onChange={(e)=>{ const c=e.target.value; setSelectedCategory(c); setSelectedTopic("All"); }}
                            className="border border-slate-200 rounded px-2 py-1 text-xs"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select
                            value={selectedTopic}
                            onChange={(e)=>setSelectedTopic(e.target.value)}
                            className="border border-slate-200 rounded px-2 py-1 text-xs"
                          >
                            {(["All", ...(selectedCategory==="All" ? [] : TOPIC_MAP[selectedCategory] || [])]).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <button className="rounded-full bg-blue-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-blue-700">
                            Post
                          </button>
                          <button
                            type="button"
                            onClick={()=>{ setEditorOpen(false); setAskTitle(""); setAskBodyHtml(""); setAskAtts([]); }}
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
                {["Top","Newest","Answered"].map(s => (
                  <button
                    key={s}
                    onClick={()=>setSort(s)}
                    className={`text-xs rounded-full px-3 py-1 border ${sort===s ? "bg-blue-600 text-white border-blue-600":"border-slate-200 hover:bg-slate-50"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="ml-auto">
                <input
                  value={q}
                  onChange={e=>setQ(e.target.value)}
                  placeholder="Search posts…"
                  className="w-72 max-w-[60vw] border border-slate-200 rounded px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          </Card>

          {sorted.map(post => (
            <Card
              key={post.id}
              className="p-0"
              ref={(el)=>{ if(el) postRefs.current[post.id] = el; }}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar url={post.author.photoUrl} name={post.author.name} online={isOnline(post.author.id)} />
                  <div className="min-w-0">
                    <div className="text-sm text-slate-500">
                      <span className="font-semibold text-slate-900">
                        {post.author?.title ? `${post.author.title} ${post.author.name}` : post.author.name}
                      </span>
                      {" "}• {post.author.program || "Program"} • {timeAgo(post.createdAt)} ago
                    </div>
                    <div className="text-xs text-slate-500">{post.category} • {post.topic}</div>
                  </div>
                  {post.author?.id === user?.id && (
                    <button
                      onClick={()=>{ if (confirm("Delete this post?")) deletePost(post.id); }}
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

                <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                  <button onClick={()=>toggleLike(post.id)} className="rounded px-2 py-1 hover:bg-slate-50">
                    👍 Upvote {post.likes>0 && <span className="text-slate-500">({post.likes})</span>}
                  </button>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-700">{(post.comments||[]).filter(c=>!c.parentId).length} Comments</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-700">{post.views || 0} Views</span>
                  <button onClick={()=>toggleSave(post.id)} className="ml-auto rounded px-2 py-1 hover:bg-slate-50">
                    {post.saved ? "★ Saved" : "☆ Save"}
                  </button>
                </div>

                <div className="mt-2">
                  <AnswerThread key={`answers-${post.id}`} post={post}/>
                </div>
              </div>
            </Card>
          ))}
        </section>

        {/* RIGHT rail */}
        <aside className="space-y-4">
          <Card square>
            <HeaderBar title="Your Topics" square />
            <div className="p-3 space-y-1 text-sm max-h-[180px] overflow-auto">
              {Object.entries(follows).filter(([_,v])=>v).map(([k])=>{
                const [cat,topic] = k.split("::");
                return (
                  <button
                    key={k}
                    onClick={()=>{ setSelectedCategory(cat); setSelectedTopic(topic); }}
                    className="w-full text-left rounded px-2 py-1 hover:bg-slate-50"
                    title={`${cat} • ${topic}`}
                  >
                    {topic} <span className="text-slate-400">• {cat}</span>
                  </button>
                );
              })}
              {Object.values(follows).filter(Boolean).length===0 && (
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

          {/* RIGHT rail — Shortcuts (hide Marketplace/Profile for lecturers) */}
          <Card square>
            <HeaderBar title="Students' links" square />
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
        </aside>
      </main>

      {/* Notifications tray (isolated => editors won't collapse) */}
      <NotificationTray userId={user?.id} onOpenPost={scrollToPost} />

      {/* Lightbox + Toast */}
      <Lightbox img={preview} onClose={()=>setPreview(null)} />
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-black/80 text-white text-sm px-4 py-2 rounded-full">
          {toast}
        </div>
      )}
    </div>
  );
}