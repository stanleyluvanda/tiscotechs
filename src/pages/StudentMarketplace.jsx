// src/pages/StudentMarketplace.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ============ Utils ============ */
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
function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "S") + (parts[1]?.[0] || "K")).toUpperCase();
}
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts)/1000);
  if (s<60) return `${s}s`;
  const m = Math.floor(s/60); if (m<60) return `${m}m`;
  const h = Math.floor(m/60); if (h<24) return `${h}h`;
  const d = Math.floor(h/24); return `${d}d`;
};

/* ============ IndexedDB for attachments ============ */
const DB_NAME = "sk_attachments";
const STORE = "files";
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
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

/* ============ Tiny UI bits ============ */
function Card({ className="", children, square=false }) {
  return <div className={`${square ? "rounded-none" : "rounded-2xl"} border border-slate-100 bg-white p-0 shadow-sm overflow-hidden ${className}`}>{children}</div>;
}
function CardHeader({ title, small=false, square=false }) {
  return (
    <div className={`${square ? "rounded-none" : "rounded-t-2xl"} ${small ? "py-2" : "py-2.5"} px-3 text-sm font-semibold text-center bg-[#7bdad1]/90 text-slate-900`}>
      {title}
    </div>
  );
}
function CardBody({ className="", children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
function Badge({ children }) {
  return <span className="ml-auto text-xs rounded-full border border-slate-200 px-2 py-0.5">{children}</span>;
}
function Avatar({ url, name, size="md" }) {
  const sizeClass = size==="lg"?"h-14 w-14":size==="sm"?"h-8 w-8":"h-10 w-10";
  return (
    <div className={`${sizeClass} rounded-full bg-slate-300 overflow-hidden flex items-center justify-center`}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover"/> : <span className="text-white text-sm bg-gradient-to-tr from-blue-500 to-indigo-500 h-full w-full flex items-center justify-center">{initials(name)}</span>}
    </div>
  );
}
const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
function useAttachmentUrl(att, preferFull=true) {
  const [url, setUrl] = useState(att?.dataUrl || (preferFull ? null : att?.thumb || null));
  useEffect(() => {
    let toRevoke = null; let cancelled = false;
    if (!url && att?.id) {
      (async () => {
        const blob = await idbGet(att.id);
        if (cancelled) return;
        if (blob) { const obj = URL.createObjectURL(blob); toRevoke = obj; setUrl(obj); }
        else if (att.thumb) setUrl(att.thumb);
      })();
    }
    return () => { cancelled = true; if (toRevoke) URL.revokeObjectURL(toRevoke); };
  }, [att?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return url;
}
function AttachmentImage({ att, className="", onClick, enlarge=false }) {
  const url = useAttachmentUrl(att, enlarge);
  if (!url) return null;
  return <img src={url} alt={att.name || "image"} className={className} onClick={onClick} loading="lazy" />;
}
function ImageGrid({ images=[], onOpen, max=4, tileClass="h-40" }) {
  const len = images.length; if (!len) return null;
  const show = images.slice(0, max);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {show.map((img, idx) => (
        <div key={(img.id||img.name||"img")+idx} className="relative">
          <AttachmentImage att={img} className={`w-full ${tileClass} object-cover rounded cursor-zoom-in`} onClick={() => onOpen(idx)} />
          {(idx === show.length-1 && len>max) && (
            <button type="button" onClick={() => onOpen(idx)} className="absolute inset-0 rounded bg-black/50 text-white font-semibold text-sm md:text-base flex items-center justify-center">+{len - max} more</button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============ Categories ============ */
const CATEGORY_MAP = {
  "Laptops": ["Acer","Apple/Mac","Asus","Dell","HP","Lenovo","LG","Microsoft","MSL","Razer","Samsung","Toshiba","Otherbrands"],
  "Laptop Accessories": ["Adapters/Chargers","Batteries","Cooling Pads","External Hard Drives","External Keyboards","External Monitors","External Speakers","USB-Flash Disks","Hard Drives","Laptop stands","Mouse","Screen Filters","Screen Protectors","USB hubs","Other Accessories"],
  "Laptop Bags": ["Laptop backpack","Laptop Sleeves"],
  "Tablets": ["Acer","Apple/Mac","Asus","Dell","HP","Lenovo","LG","Microsoft","MSL","Razer","Samsung","Toshiba","Otherbrands"],
  "Tablet Accessories": ["Bags","Cases","Sleeves","Adapters/Charger","Keyboards","Mounts","Screen Filters","Screen Protectors","Tablet stands","Tablet holders","Other"],
  "Mobile Phones": ["Alcatel","Apple iPhone","Lg","Motorola","Nokia","Oppo","Samsung","Xiaomi","Aoc mobile phones","ARCHOS","ASUS","BlackBerry","BLU Products","Ericsson","Google Pixel","HTC","Huawei","OnePlus","Realme","SONY","Tecno","Vivo"],
  "Mobile Phone Accessories": ["Cases","Chargers","Earbuds","Cellphone stands","Headphones","Mass storage","Tripod Stands","Selfie sticks","Other"],
  "Men's shoes": ["Athletic","Loafers","Slip-ons","Sandals","Slippers","Other"],
  "Women shoes": ["Women sneakers","Heels","Sandals","Flats","Loafers","Mules","Mary Janes","Wedges","Other"],
  "Rooms & Hostel Items": ["On-Campus rooms","Off-Campus Rooms","Room seekers"],
  "Sports & Fitness": [],
  "Tickets": [],
  "Services": [],
  "Other": []
};
const MAIN_CATEGORIES = Object.keys(CATEGORY_MAP);

/* ============ Notifications storage helpers ============ */
const NOTI_KEY = "market_notifications__all";
function loadAllNotis() {
  return safeParse(localStorage.getItem(NOTI_KEY)) || [];
}
function saveAllNotis(all) {
  localStorage.setItem(NOTI_KEY, JSON.stringify(all));
}

/* ============ Page ============ */
export default function StudentMarketplace() {
  const navigate = useNavigate();
  const [user] = useState(() => loadActiveUser());
  const uni = user?.university || "";
  const STORE_KEY = `market_items__${uni}`;

  useEffect(() => { if (!user) navigate("/login?role=student", { replace: true }); }, [user, navigate]);

  /* ---------- Seed & load items (scoped to this university) ---------- */
  const seeded = useMemo(() => {
    const now = Date.now();
    return [
      {
        id: `m${now-1}`,
        title: "Used Calculus Textbook (Stewart)",
        price: 15,
        currency: "$",
        mainCategory: "Books",
        subCategory: "",
        condition: "",
        description: "7th Edition, lightly used. No highlights.",
        images: [],
        likes: 1, saved: false,
        comments: [],
        seller: { id: user?.id, name: user?.name || "Student", program: user?.program || "Program", photoUrl: user?.photoUrl || "" },
        university: uni,
        createdAt: now-3600_000,
        deleted: false
      }
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uni]);

  const [items, setItems] = useState(() => {
    const ls = safeParse(localStorage.getItem(STORE_KEY));
    return Array.isArray(ls) ? ls : seeded;
  });
  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(items)); }, [items, STORE_KEY]);

  /* ---------- Notifications ---------- */
  const [notiOpen, setNotiOpen] = useState(false);
  const [notis, setNotis] = useState(() => loadAllNotis());
  const myUnread = notis.filter(n => n.toUserId === user?.id && !n.read).length;
  const [focusThread, setFocusThread] = useState(null); // { itemId, rootId }

  useEffect(() => { saveAllNotis(notis); }, [notis]);

  const pushNotification = ({ toUserId, fromUserId, itemId, message, rootId }) => {
    const n = {
      id: `n${Date.now()}_${Math.random().toString(36).slice(2)}`,
      toUserId, fromUserId, itemId, rootId,
      message, createdAt: Date.now(), read: false
    };
    setNotis(all => [n, ...all].slice(0, 200));
  };
  const markNotiRead = (id) => setNotis(all => all.map(n => n.id===id ? ({...n, read:true}) : n));
  const markAllRead = () => setNotis(all => all.map(n => n.toUserId===user?.id ? ({...n, read:true}) : n));

  const jumpToListing = (itemId) => {
    const el = document.getElementById(`listing-${itemId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2","ring-blue-400");
      setTimeout(() => el.classList.remove("ring-2","ring-blue-400"), 1800);
    }
  };

  /* ---------- Composer ---------- */
  const [openComposer, setOpenComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("$");
  const [mainCategory, setMainCategory] = useState(MAIN_CATEGORIES[0]);
  const [subCategory, setSubCategory] = useState(CATEGORY_MAP[MAIN_CATEGORIES[0]][0] || "");
  const [condition, setCondition] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const first = CATEGORY_MAP[mainCategory]?.[0] ?? "";
    setSubCategory(first);
  }, [mainCategory]);

  async function persistAttachments(images=[]) {
    const imgDescs = [];
    for (let i=0;i<images.length;i++) {
      const src = images[i];
      const id = `mk_img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const blob = dataURLtoBlob(src.dataUrl);
      await idbSet(id, blob);
      const thumb = await makeThumb(src.dataUrl, 360, 360, 0.72);
      imgDescs.push({ id, name: src.name || "image.jpg", mime: blob.type || "image/jpeg", thumb });
    }
    return imgDescs;
  }

  const onPickPhotos = async (e) => {
    const files = Array.from(e.target.files||[]).filter(f => f.type.startsWith("image/"));
    const slots = Math.max(0, 6 - photos.length);
    const chosen = files.slice(0, slots);
    const dataUrls = await Promise.all(chosen.map(f => fileToDownscaledDataURL(f, 1280, 1280, 0.82, 420)));
    const next = dataUrls.map((dataUrl,i)=>({ name: chosen[i].name, dataUrl }));
    setPhotos(arr => [...arr, ...next]);
    e.target.value = "";
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !price) return;
    const imgs = await persistAttachments(photos);
    const newItem = {
      id: `m${Date.now()}`,
      title: title.trim(),
      price: Number(price),
      currency: (currency || "").slice(0,4),
      mainCategory,
      subCategory: CATEGORY_MAP[mainCategory]?.length ? subCategory : "",
      condition,
      description: desc.trim(),
      images: imgs,
      likes: 0, saved: false,
      comments: [],
      seller: { id: user?.id, name: user?.name || "Student", program: user?.program || "Program", photoUrl: user?.photoUrl || "" },
      university: uni,
      createdAt: Date.now(),
      deleted: false
    };
    setItems(prev => [newItem, ...prev]);
    setOpenComposer(false);
    setTitle(""); setPrice(""); setDesc(""); setPhotos([]);
    setCurrency("$");
    setMainCategory(MAIN_CATEGORIES[0]);
    setSubCategory(CATEGORY_MAP[MAIN_CATEGORIES[0]][0] || "");
    setCondition("");
  };

  /* ---------- Filters ---------- */
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [subFilter, setSubFilter] = useState("All");
  const [showMine, setShowMine] = useState(false);

  const visibleItems = items
    .filter(i => !i.deleted)
    .filter(i => i.university === uni);

  const filtered = visibleItems
    .filter(i => (catFilter === "All" ? true : i.mainCategory === catFilter))
    .filter(i => (subFilter === "All" ? true : (i.subCategory || "") === subFilter))
    .filter(i => showMine ? i.seller.id === user?.id : true)
    .filter(i => (q ? (i.title.toLowerCase().includes(q.toLowerCase()) || i.description.toLowerCase().includes(q.toLowerCase())) : true));

  /* ---------- Interactions & comment/notification logic ---------- */
  const toggleLike = (id) => setItems(prev => prev.map(i => i.id===id ? ({ ...i, likes: (i._liked? i.likes-1 : i.likes+1), _liked: !i._liked }) : i));
  const toggleSave = (id) => setItems(prev => prev.map(i => i.id===id ? ({ ...i, saved: !i.saved }) : i));

  // Helper to build comment lookup for root author resolution
  const buildCommentIndex = (comments=[]) => {
    const byId = new Map();
    comments.forEach(c => byId.set(c.id, c));
    const getRoot = (c) => {
      let cur = c;
      while (cur && cur.parentId) cur = byId.get(cur.parentId);
      return cur || c;
    };
    return { byId, getRoot };
  };

  const addComment = (itemId, text, viewer, parentId=null) => {
    if (!text.trim()) return;
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      const comment = {
        id:`c${Date.now()}_${Math.random().toString(36).slice(2)}`,
        parentId: parentId || null,
        text: text.trim(),
        authorId: viewer?.id,
        author: viewer?.name,
        authorProgram: viewer?.program,
        authorPhoto: viewer?.photoUrl,
        createdAt: Date.now()
      };
      const updated = { ...i, comments: [...(i.comments||[]), comment] };

      // Notifications:
      const { byId, getRoot } = buildCommentIndex(updated.comments);
      const root = getRoot(comment);
      const sellerId = updated.seller.id;
      const rootAuthorId = root.authorId;

      let toUserId = null;
      if (viewer?.id === sellerId) {
        if (rootAuthorId && rootAuthorId !== sellerId) toUserId = rootAuthorId; // notify the student
      } else {
        toUserId = sellerId; // notify the seller
      }
      if (toUserId && toUserId !== viewer?.id) {
        pushNotification({
          toUserId,
          fromUserId: viewer?.id,
          itemId: updated.id,
          rootId: root.id, // thread anchor
          message: `${viewer?.name || "Someone"} replied on "${updated.title}"`
        });
      }
      return updated;
    }));
  };

  const deleteListing = (id) => {
    setItems(prev => prev.map(i => i.id===id ? ({ ...i, deleted: true }) : i));
  };

  /* ---------- Read more helper ---------- */
  function ReadMore({ text }) {
    const [open, setOpen] = useState(false);
    return (
      <div className="text-sm text-slate-700">
        <p className={`${open ? "" : "line-clamp-2"} whitespace-pre-wrap`}>{text}</p>
        {text && text.length > 0 && (
          <button type="button" onClick={() => setOpen(o=>!o)} className="text-blue-600 text-xs mt-1 underline">
            {open ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    );
  }

  /* ---------- Lightbox ---------- */
  const [lightbox, setLightbox] = useState({ open:false, items:[], index:0 });
  const openLightbox = (items=[], index=0) => setLightbox({ open:true, items, index });
  const closeLightbox = () => setLightbox(l => ({ ...l, open:false }));
  const step = (dir) => setLightbox(l => ({ ...l, index: (l.index + dir + l.items.length) % l.items.length }));

  /* ---------- UI ---------- */
  const currentSubcats = CATEGORY_MAP[catFilter] || [];
  const subFilterOptions = catFilter==="All" ? [] : currentSubcats;

  return (
    <div className="min-h-screen bg-[#f3f6fb] relative">
      {/* Notifications bell (bottom-right so it doesn't cover header actions) */}
      <div className="fixed right-4 bottom-6 z-40">
        <button
          onClick={()=>setNotiOpen(o=>!o)}
          className="relative rounded-full border border-slate-200 bg-white shadow px-3 py-2 text-sm hover:bg-slate-50"
          title="Notifications"
        >
          🔔 Notifications
          {myUnread>0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5">{myUnread}</span>}
        </button>
        {notiOpen && (
          <div className="mt-2 w-80 max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100">
              <div className="font-semibold text-sm">Notifications</div>
              <button onClick={markAllRead} className="ml-auto text-xs text-blue-600 underline">Mark all read</button>
            </div>
            <ul className="divide-y divide-slate-100">
              {notis.filter(n=>n.toUserId===user?.id).length===0 && (
                <li className="px-3 py-3 text-sm text-slate-500">No notifications yet.</li>
              )}
              {notis
                .filter(n=>n.toUserId===user?.id)
                .map(n=>(
                <li key={n.id} className={`px-3 py-2 ${n.read ? "bg-white" : "bg-blue-50/40"}`}>
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      markNotiRead(n.id);
                      setNotiOpen(false);
                      setFocusThread({ itemId: n.itemId, rootId: n.rootId }); // open the thread on that listing
                      jumpToListing(n.itemId);
                    }}
                  >
                    <div className="text-sm text-slate-900">{n.message}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{timeAgo(n.createdAt)} ago • Go to thread</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Expanded width + center column like other platforms */}
      <main className="max-w-[1300px] mx-auto px-3 lg:px-5 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-5">
        {/* LEFT: Filters */}
        <aside className="space-y-4">
          <Card square>
            <CardHeader title="Student Marketplace" square />
            <CardBody>
              <p className="text-xs text-slate-700 text-center">Only for {uni || "your university"}.</p>
            </CardBody>
          </Card>

          {/* My Listings directly under Student Marketplace */}
          <Card square>
            <CardHeader title="My listings" square />
            <CardBody>
              <button
                onClick={()=>setShowMine(v=>!v)}
                className={`w-full rounded-full px-3 py-1.5 text-sm ${showMine?"bg-blue-600 text-white":"border border-slate-200 hover:bg-slate-50"}`}
              >
                {showMine ? "On" : "Off"}
              </button>
              {showMine && (
                <ul className="mt-3 space-y-2 text-sm">
                  {visibleItems.filter(i => i.seller.id===user?.id).map(i => (
                    <li key={i.id} className="flex items-center gap-2">
                      <span className="truncate">{i.title}</span>
                      <Link to="#" onClick={(e)=>{e.preventDefault(); jumpToListing(i.id);}} className="ml-auto text-xs text-blue-600 underline">
                        View
                      </Link>
                    </li>
                  ))}
                  {visibleItems.filter(i=>i.seller.id===user?.id).length===0 && <li className="text-slate-500">No listings yet.</li>}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card square>
            <CardHeader title="Search" square />
            <CardBody>
              <input
                value={q}
                onChange={e=>setQ(e.target.value)}
                placeholder="Search listings…"
                className="w-full border border-slate-200 rounded px-3 py-2"
              />
            </CardBody>
          </Card>

          <Card square>
            <CardHeader title="Category" square />
            <CardBody className="space-y-2">
              <select
                value={catFilter}
                onChange={e=>{ setCatFilter(e.target.value); setSubFilter("All"); }}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              >
                <option>All</option>
                {MAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {subFilterOptions.length>0 && (
                <select
                  value={subFilter}
                  onChange={e=>setSubFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                >
                  <option>All</option>
                  {subFilterOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </CardBody>
          </Card>

          {/* NEW: Shortcuts under Category */}
          <Card square>
            <CardHeader title="Students' links" square />
            <CardBody className="text-sm space-y-2 text-center">
              <Link
                to="/platform/university"
                className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50"
              >
                University Academic Platform
              </Link>
              <Link
                to="/platform/global"
                className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50"
              >
                Global Academic Platform
              </Link>
              <Link
                to="/student-dashboard?tab=profile"
                className="inline-flex items-center justify-center w-full rounded px-3 py-2 border border-slate-200 hover:bg-slate-50"
              >
                View My Profile
              </Link>
            </CardBody>
          </Card>
        </aside>

        {/* CENTER: Composer + Feed */}
        <section className="space-y-4">
          <Card>
            <CardBody>
              {!openComposer ? (
                <div className="flex items-center gap-3">
                  <Avatar url={user?.photoUrl} name={user?.name} />
                  <button
                    onClick={()=>setOpenComposer(true)}
                    className="flex-1 text-left border border-slate-200 rounded-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-600"
                  >
                    Create a listing
                  </button>
                </div>
              ) : (
                <form onSubmit={onCreate} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar url={user?.photoUrl} name={user?.name} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{user?.name}</div>
                      <div className="text-xs text-slate-600">{user?.program}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <select
                        value={mainCategory}
                        onChange={e=>setMainCategory(e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-sm"
                      >
                        {MAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {CATEGORY_MAP[mainCategory]?.length>0 && (
                        <select
                          value={subCategory}
                          onChange={e=>setSubCategory(e.target.value)}
                          className="border border-slate-200 rounded px-2 py-1 text-sm"
                        >
                          {CATEGORY_MAP[mainCategory].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={title}
                      onChange={e=>setTitle(e.target.value)}
                      placeholder="Title (e.g., Dell XPS 13, 16GB RAM)"
                      className="w-full border border-slate-200 rounded px-3 py-2"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        value={currency}
                        onChange={e=>setCurrency(e.target.value)}
                        placeholder="$"
                        className="w-16 border border-slate-200 rounded px-3 py-2"
                        maxLength={4}
                      />
                      <input
                        value={price}
                        onChange={e=>setPrice(e.target.value.replace(/[^\d.]/g,""))}
                        placeholder="Price"
                        className="w-full border border-slate-200 rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={condition}
                      onChange={e=>setCondition(e.target.value)}
                      className="border border-slate-200 rounded px-3 py-2"
                    >
                      <option value="">Condition (optional)</option>
                      <option>New</option>
                      <option>Used-like New</option>
                      <option>Used-Good</option>
                      <option>Used-Fair</option>
                    </select>

                    <label className="text-sm text-slate-700 cursor-pointer inline-flex items-center gap-2">
                      📷 Photos (max 6)
                      <input type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} />
                    </label>
                  </div>

                  <textarea
                    value={desc}
                    onChange={e=>setDesc(e.target.value)}
                    rows={3}
                    placeholder="Describe the item, condition, campus pickup point…"
                    className="w-full border border-slate-200 rounded px-3 py-2"
                  />

                  {photos.length>0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {photos.map((img,idx)=>(
                        <div key={idx} className="relative">
                          <img src={img.dataUrl} alt={img.name} className="w-full h-32 object-cover rounded"/>
                          <button
                            type="button"
                            onClick={()=>setPhotos(arr=>arr.filter((_,i)=>i!==idx))}
                            className="absolute right-1 top-1 bg-white/80 text-xs px-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={()=>{ setOpenComposer(false); setTitle(""); setPrice(""); setDesc(""); setPhotos([]); setCurrency("$"); setMainCategory(MAIN_CATEGORIES[0]); setSubCategory(CATEGORY_MAP[MAIN_CATEGORIES[0]][0] || ""); setCondition(""); }}
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
            </CardBody>
          </Card>

          {filtered.map(item => (
            <Card key={item.id} id={`listing-${item.id}`}>
              <CardBody>
                <div className="flex items-center gap-3">
                  <Avatar url={item.seller.photoUrl} name={item.seller.name}/>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{item.seller.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.seller.program} • {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge>
                    {item.mainCategory}{item.subCategory ? ` • ${item.subCategory}` : ""}
                  </Badge>

                  {/* Seller-only delete */}
                  {item.seller.id === user?.id && (
                    <button
                      onClick={()=>deleteListing(item.id)}
                      className="ml-2 text-xs rounded-full border border-red-200 text-red-600 px-2 py-0.5 hover:bg-red-50"
                      title="Delete listing"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="mt-2">
                  <div className="text-lg font-semibold text-slate-900">{item.title}</div>
                  <div className="text-slate-700">
                    {(item.currency || "").trim()}{item.currency ? "" : "$"}{item.price.toFixed(2)}
                    {item.condition ? <span className="ml-2 text-xs text-slate-500">• {item.condition}</span> : null}
                  </div>
                  <div className="mt-1">
                    <ReadMore text={item.description} />
                  </div>
                </div>

                {item.images?.length>0 && (
                  <div className="mt-3">
                    <ImageGrid
                      images={item.images}
                      onOpen={(idx)=>openLightbox(item.images, idx)}
                      max={4}
                      tileClass="h-44"
                    />
                  </div>
                )}

                {lightbox.open && (
                  <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4" onClick={closeLightbox}>
                    <div className="relative max-w-5xl w-full" onClick={stop} onMouseDown={stop}>
                      <AttachmentImage key={lightbox.items[lightbox.index]?.id || lightbox.index} att={lightbox.items[lightbox.index]} enlarge className="w-full max-h-[86vh] object-contain rounded"/>
                      <button type="button" className="absolute -top-3 -right-3 bg-white rounded-full px-2 py-1 text-sm shadow z-10" onClick={(e)=>{ stop(e); closeLightbox(); }} aria-label="Close">✕</button>
                      {lightbox.items.length>1 && (
                        <>
                          <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10" onClick={(e)=>{ stop(e); step(-1); }} aria-label="Previous">‹</button>
                          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10" onClick={(e)=>{ stop(e); step(1); }} aria-label="Next">›</button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-6 text-sm text-slate-600">
                  <button onClick={()=>toggleLike(item.id)} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">👍 Like {item.likes>0 && <span className="text-slate-500">({item.likes})</span>}</button>
                  <button onClick={()=>toggleSave(item.id)} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">{item.saved ? "★ Saved" : "☆ Save"}</button>
                  <Link to="/student-dashboard" className="ml-auto text-blue-600 underline">View profile</Link>
                </div>

                {/* Private, threaded comments (seller + root commenter) */}
                <Comments
                  item={item}
                  currentUser={user}
                  focusThread={focusThread}
                  onAdd={(txt, parentId)=>addComment(item.id, txt, user, parentId)}
                />
              </CardBody>
            </Card>
          ))}
        </section>

        {/* RIGHT: Tips / rules */}
        <aside className="space-y-4">
          <Card square>
            <CardHeader title="Marketplace Safety tips" square />
            <CardBody>
              <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
                <li>Meet on campus in public places.</li>
                <li>Cash or trusted digital payments only.</li>
                <li>Check items before you pay.</li>
              </ul>
            </CardBody>
          </Card>
          <Card square>
            <CardHeader title="Community rules" square />
            <CardBody>
              <p className="text-sm text-slate-700">No illegal goods, weapons, counterfeit items, or academic misconduct services.</p>
            </CardBody>
          </Card>
        </aside>
      </main>
    </div>
  );
}

/* ============ Comments component (two-way threads + focus-from-notification) ============ */
function Comments({ item, onAdd, currentUser, focusThread }) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const [replyForId, setReplyForId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const isSeller = item.seller.id === currentUser?.id;

  // Build indexes to resolve root threads
  const byId = new Map((item.comments||[]).map(c => [c.id, c]));
  const getRoot = (c) => { let cur = c; while (cur && cur.parentId) cur = byId.get(cur.parentId); return cur || c; };

  // Visibility:
  // - Seller sees all threads on their listing
  // - Non-seller sees only threads where they are the root author, plus replies
  const all = (item.comments || []);
  const visible = isSeller ? all : all.filter(c => {
    const root = getRoot(c);
    return root.authorId === currentUser?.id || c.authorId === currentUser?.id;
  });

  const parents = visible.filter(c => !c.parentId);
  const repliesByParent = visible.reduce((acc, c) => {
    if (c.parentId) { (acc[c.parentId] ||= []).push(c); }
    return acc;
  }, {});

  // Auto-open & scroll to a focused thread when a notification is clicked
  useEffect(() => {
    if (!focusThread) return;
    if (focusThread.itemId !== item.id) return; // not this card
    setOpen(true);
    const id = `comment-${focusThread.rootId}`;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2","ring-emerald-400","rounded-xl");
        setTimeout(() => el.classList.remove("ring-2","ring-emerald-400","rounded-xl"), 1800);
        setReplyForId(null);
      }
    }, 60);
  }, [focusThread, item.id]);

  const privacyNote = isSeller
    ? "Only you and the commenter see each thread."
    : "Only you and the seller see this thread.";

  const submitTopLevel = (e) => { e.preventDefault(); onAdd(text, null); setText(""); };
  const submitReply = (e, parentId) => { e.preventDefault(); if (!replyText.trim()) return; onAdd(replyText, parentId); setReplyText(""); setReplyForId(null); };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button onClick={()=>setOpen(o=>!o)} className="text-sm text-slate-600 hover:underline">
          💬 Comments {visible.length? `(${visible.length})` : ""}
        </button>
        <span className="text-[11px] text-slate-500">{privacyNote}</span>
      </div>
      {open && (
        <div className="mt-2 space-y-3">
          {parents.map(c => (
            <div key={c.id} id={`comment-${c.id}`} className="space-y-2">
              <div className="flex items-start gap-2">
                <Avatar url={c.authorPhoto} name={c.author} size="sm" />
                <div className="bg-slate-50 rounded-2xl px-3 py-2 max-w-full">
                  <div className="text-sm font-medium text-slate-900">{c.author}</div>
                  <div className="text-xs text-slate-500">{c.authorProgram || ""}</div>
                  <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{c.text}</div>

                  {/* Reply (both sides) */}
                  <button
                    onClick={() => setReplyForId(replyForId === c.id ? null : c.id)}
                    className="mt-2 text-xs text-blue-600 underline"
                  >
                    {replyForId === c.id ? "Cancel reply" : "Reply"}
                  </button>

                  {/* Nested replies */}
                  {(repliesByParent[c.id] || []).map(r => (
                    <div key={r.id} className="mt-3 pl-4 border-l border-slate-200">
                      <div className="flex items-start gap-2">
                        <Avatar url={r.authorPhoto} name={r.author} size="sm" />
                        <div className="bg-white rounded-2xl px-3 py-2 border border-slate-100">
                          <div className="text-sm font-medium text-slate-900">{r.author}</div>
                          <div className="text-xs text-slate-500">{r.authorProgram || ""}</div>
                          <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{r.text}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Reply box */}
                  {replyForId === c.id && (
                    <form onSubmit={(e)=>submitReply(e, c.id)} className="mt-2 pl-4">
                      <div className="flex items-start gap-2">
                        <input
                          value={replyText}
                          onChange={e=>setReplyText(e.target.value)}
                          placeholder={`Reply to ${c.author}…`}
                          className="flex-1 border border-slate-200 rounded-full px-3 py-1.5"
                        />
                        <button type="submit" className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
                          Reply
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Top-level comment box */}
          <form onSubmit={submitTopLevel}>
            <div className="flex items-start gap-2">
              <input
                value={text}
                onChange={e=>setText(e.target.value)}
                placeholder={isSeller ? "Write a private message to the buyer…" : "Write a private comment to the seller…"}
                className="flex-1 border border-slate-200 rounded-full px-3 py-1.5"
              />
              <button type="submit" className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50">Post</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}