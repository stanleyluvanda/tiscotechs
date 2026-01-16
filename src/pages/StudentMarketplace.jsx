// src/pages/StudentMarketplace.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";
//import { fetchPosts, createPost, deletePost } from "../lib/postsApi"; // ⬅️ NEW
//import { fetchPosts, createPost, deletePost,createComment,createReply,} from "../lib/postsApi"; // ⬅️ NEW
import {
  fetchMarketplaceItems,
  createMarketplaceItem,
  deleteMarketplaceItem,
  createMarketplaceComment,
  createMarketplaceReply,
  getMarketplaceUploadUrl,
} from "../lib/marketplaceApi";

/* ============ Utils ============ */
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
        const found = arr.find(
          (u) => u.id === id || u.uid === id || u.userId === id
        );
        if (found) return found;
      }
    }
  }
  return (
    safeParse(sessionStorage.getItem("currentUser")) ||
    safeParse(localStorage.getItem("currentUser"))
  );
}
function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "S") + (parts[1]?.[0] || "K")).toUpperCase();
}
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

/* ============ IndexedDB for attachments ============ */
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
    r.onerror = () => rej(tx.error);
  });
}
function dataURLtoBlob(dataUrl) {
  const [hdr, b64] = dataUrl.split(",");
  const mime = (hdr.match(/data:(.*?);base64/) || [, "application/octet-stream"])[1];
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
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
async function fileToDownscaledDataURL(
  file,
  maxW,
  maxH,
  quality = 0.84,
  targetKB = 480
) {
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = blobUrl;
    });
    const ratio = Math.min(1, maxW / img.width, maxH / img.height);
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    let q = quality,
      dataURL = canvas.toDataURL("image/jpeg", q),
      TARGET = targetKB * 1024;
    while (dataURL.length * 0.75 > TARGET && q > 0.5) {
      q -= 0.06;
      dataURL = canvas.toDataURL("image/jpeg", q);
    }
    return dataURL;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/* ============ Tiny UI bits ============ */
function Card({ className = "", children, square = false }) {
  return (
    <div
      className={`${square ? "rounded-none" : "rounded-2xl"} border border-slate-100 bg-white p-0 shadow-sm overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
function CardHeader({ title, small = false, square = false }) {
  return (
    <div
      className={`${square ? "rounded-none" : "rounded-t-2xl"} ${
        small ? "py-2" : "py-2.5"
      } px-3 text-sm font-semibold text-center bg-[#7bdad1]/90 text-slate-900`}
    >
      {title}
    </div>
  );
}
function CardBody({ className = "", children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
function Badge({ children }) {
  return (
    <span className="ml-auto text-xs rounded-full border border-slate-200 px-2 py-0.5">
      {children}
    </span>
  );
}
function Avatar({ url, name, size = "md" }) {
  const sizeClass =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div
      className={`${sizeClass} rounded-full bg-slate-300 overflow-hidden flex items-center justify-center`}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-white text-sm bg-gradient-to-tr from-blue-500 to-indigo-500 h-full w-full flex items-center justify-center">
          {initials(name)}
        </span>
      )}
    </div>
  );
}
const stop = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

// ✅ CloudFront base (no trailing slash)
const CLOUDFRONT_BASE =
  (import.meta.env.VITE_CLOUDFRONT_BASE &&
    String(import.meta.env.VITE_CLOUDFRONT_BASE).trim().replace(/\/+$/, "")) ||
  "";

// Convert S3-style URLs to CloudFront URLs (does NOT change format; just rewrites display URL)
function toCloudFrontUrl(input) {
  const s = String(input || "").trim();
  if (!s) return s;

  // Only rewrite if we have a CloudFront domain configured
  if (!CLOUDFRONT_BASE) return s;

  // Do NOT rewrite blob/object URLs or data URLs
  if (s.startsWith("blob:") || s.startsWith("data:")) return s;

  // If already CloudFront (or not a URL), leave it
  if (s.startsWith(CLOUDFRONT_BASE)) return s;
  if (!/^https?:\/\//i.test(s)) return s;

  // Handle common S3 URL styles by extracting path after the host
  // Examples:
  // https://bucket.s3.amazonaws.com/path/to/file.jpg
  // https://s3.us-east-1.amazonaws.com/bucket/path/to/file.jpg
  // https://bucket.s3.us-east-1.amazonaws.com/path/to/file.jpg
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();

    // Path-style: /bucket/key...
    const pathStyle = host.startsWith("s3.") || host === "s3.amazonaws.com";
    if (pathStyle) {
      const parts = u.pathname.split("/").filter(Boolean);
      // parts[0] is bucket, rest is key
      if (parts.length >= 2) {
        const key = parts.slice(1).join("/");
        return `${CLOUDFRONT_BASE}/${key}`;
      }
      return s;
    }

    // Virtual-hosted-style: bucket.s3.../key...
    const virtualStyle = host.includes(".s3");
    if (virtualStyle) {
      const key = u.pathname.replace(/^\/+/, "");
      return key ? `${CLOUDFRONT_BASE}/${key}` : s;
    }

    return s;
  } catch {
    return s;
  }
}

/**
 * ✅ FIXED: prefer CloudFront URL FIRST (global), then fallback to local-only storage.
 */
function useAttachmentUrl(att, preferFull = true) {
  const [url, setUrl] = useState(
    toCloudFrontUrl(att?.url) ||
      toCloudFrontUrl(att?.dataUrl) ||
      (preferFull
        ? null
        : toCloudFrontUrl(att?.thumbUrl) ||
          toCloudFrontUrl(att?.thumb) ||
          null)
  );

  useEffect(() => {
    let toRevoke = null;
    let cancelled = false;

    // If we already have a URL, do nothing.
    if (url) return;

    // If attachment has a URL, set it
    if (att?.url) {
      setUrl(toCloudFrontUrl(att.url));
      return;
    }

    // Otherwise try IndexedDB blob (same browser/device only)
    if (att?.id) {
      (async () => {
        try {
          const blob = await idbGet(att.id);
          if (cancelled) return;

          if (blob) {
            const obj = URL.createObjectURL(blob);
            toRevoke = obj;
            // IMPORTANT: don't rewrite blob: URLs
            setUrl(obj);
          } else if (att?.thumb) {
            setUrl(toCloudFrontUrl(att.thumb));
          }
        } catch (e) {
          console.warn("[Marketplace] idbGet failed:", e);
          if (!cancelled && att?.thumb) setUrl(toCloudFrontUrl(att.thumb));
        }
      })();
    } else if (att?.thumb) {
      setUrl(toCloudFrontUrl(att.thumb));
    }

    return () => {
      cancelled = true;
      if (toRevoke) URL.revokeObjectURL(toRevoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [att?.id, att?.url]);

  return url;
}

function AttachmentImage({ att, className = "", onClick, enlarge = false }) {
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
function ImageGrid({ images = [], onOpen, max = 4, tileClass = "h-40" }) {
  const len = images.length;
  if (!len) return null;
  const show = images.slice(0, max);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {show.map((img, idx) => (
        <div key={(img.id || img.name || "img") + idx} className="relative">
          <AttachmentImage
            att={img}
            className={`w-full ${tileClass} object-cover rounded cursor-zoom-in`}
            onClick={() => onOpen(idx)}
          />
          {idx === show.length - 1 && len > max && (
            <button
              type="button"
              onClick={() => onOpen(idx)}
              className="absolute inset-0 rounded bg-black/50 text-white font-semibold text-sm md:text-base flex items-center justify-center"
            >
              +{len - max} more
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function WhatsAppIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* green outlined circle */}
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="3" />

      {/* WhatsApp mark */}
      <path
        fill="currentColor"
        d="M16 7.2c-4.86 0-8.8 3.83-8.8 8.55 0 1.55.43 3.06 1.25 4.39L7.2 24.8l4.83-1.2c1.26.67 2.68 1.02 4.13 1.02 4.86 0 8.8-3.83 8.8-8.55S20.86 7.2 16 7.2zm5.06 12.25c-.21.59-1.05 1.05-1.7 1.19-.45.09-1.02.16-2.96-.62-2.5-1.02-4.1-3.55-4.23-3.72-.12-.17-1.02-1.33-1.02-2.54 0-1.2.64-1.79.87-2.04.23-.25.5-.31.67-.31h.49c.16 0 .38-.05.6.45.21.5.72 1.75.78 1.88.06.12.1.28.02.45-.08.17-.12.28-.25.43-.12.16-.26.35-.37.47-.12.12-.24.25-.1.49.14.25.62 1.02 1.33 1.65.92.82 1.7 1.07 1.95 1.19.25.12.39.1.54-.06.16-.16.62-.72.78-.96.16-.25.33-.21.55-.12.23.08 1.45.67 1.7.79.25.12.41.18.47.28.06.1.06.58-.14 1.17z"
      />
    </svg>
  );
}
function LocationPinIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

/* ============ Categories ============ */
const CATEGORY_MAP = {
  Laptops: [
    "Acer",
    "Apple/Mac",
    "Asus",
    "Dell",
    "HP",
    "Lenovo",
    "LG",
    "Microsoft",
    "MSL",
    "Razer",
    "Samsung",
    "Toshiba",
    "Otherbrands",
  ],
  "Laptop Accessories": [
    "Adapters/Chargers",
    "Batteries",
    "Cooling Pads",
    "External Hard Drives",
    "External Keyboards",
    "External Monitors",
    "External Speakers",
    "USB-Flash Disks",
    "Hard Drives",
    "Laptop stands",
    "Mouse",
    "Screen Filters",
    "Screen Protectors",
    "USB hubs",
    "Other Accessories",
  ],
  "Laptop Bags": ["Laptop backpack", "Laptop Sleeves"],
  Tablets: [
    "Acer",
    "Apple/Mac",
    "Asus",
    "Dell",
    "HP",
    "Lenovo",
    "LG",
    "Microsoft",
    "MSL",
    "Razer",
    "Samsung",
    "Toshiba",
    "Otherbrands",
  ],
  "Tablet Accessories": [
    "Bags",
    "Cases",
    "Sleeves",
    "Adapters/Charger",
    "Keyboards",
    "Mounts",
    "Screen Filters",
    "Screen Protectors",
    "Tablet stands",
    "Tablet holders",
    "Other",
  ],
  "Mobile Phones": [
    "Alcatel",
    "Apple iPhone",
    "Lg",
    "Motorola",
    "Nokia",
    "Oppo",
    "Samsung",
    "Xiaomi",
    "Aoc mobile phones",
    "ARCHOS",
    "ASUS",
    "BlackBerry",
    "BLU Products",
    "Ericsson",
    "Google Pixel",
    "HTC",
    "Huawei",
    "OnePlus",
    "Realme",
    "SONY",
    "Tecno",
    "Vivo",
  ],
  "Mobile Phone Accessories": [
    "Cases",
    "Chargers",
    "Earbuds",
    "Cellphone stands",
    "Headphones",
    "Mass storage",
    "Tripod Stands",
    "Selfie sticks",
    "Other",
  ],

  "Camera Brands": [
    "Canon",
    "Nikon",
    "Sony",
    "Fujifilm",
    "Panasonic",
    "OM System (Olympus)",
    "Leica",
    "Blackmagic Design",
    "DJI",
    "Hasselblad",
    "Other",
  ],
  "Webcam Brands": [
    "Logitech",
    "Razer",
    "Insta360",
    "Elgato",
    "OBSBOT",
    "Microsoft",
    "Dell",
    "JLab",
    "A4Tech",
    "Other",
  ],

  "Men's shoes": ["Athletic", "Loafers", "Slip-ons", "Sandals", "Slippers", "Other"],
  "Women shoes": [
    "Women sneakers",
    "Heels",
    "Sandals",
    "Flats",
    "Loafers",
    "Mules",
    "Mary Janes",
    "Wedges",
    "Other",
  ],
  "Rooms & Hostel Items": ["On-Campus rooms", "Off-Campus Rooms", "Room seekers"],
  "Sports & Fitness": [],
  Tickets: [],
  Services: [],
  Other: [],
};
const MAIN_CATEGORIES = Object.keys(CATEGORY_MAP);
const MARKETPLACE_SCOPE = "student-marketplace"; // ⬅️ NEW

/* ============ Notifications storage helpers ============ */
const NOTI_KEY = "market_notifications__all";
function loadAllNotis() {
  return safeParse(localStorage.getItem(NOTI_KEY)) || [];
}
function saveAllNotis(all) {
  localStorage.setItem(NOTI_KEY, JSON.stringify(all));
}

// Track which comment IDs we've already turned into notifications, per user
const SEEN_COMMENTS_KEY_PREFIX = "market_seen_comments__";

function loadSeenCommentsForUser(userId) {
  if (!userId) return new Set();
  const raw = safeParse(
    localStorage.getItem(`${SEEN_COMMENTS_KEY_PREFIX}${userId}`)
  );
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw);
}

function saveSeenCommentsForUser(userId, set) {
  if (!userId || !set) return;
  const arr = Array.from(set);
  localStorage.setItem(
    `${SEEN_COMMENTS_KEY_PREFIX}${userId}`,
    JSON.stringify(arr)
  );
}

/* ============ Page ============ */
export default function StudentMarketplace() {
  const navigate = useNavigate();
  const [user] = useState(() => loadActiveUser());
  const uni = user?.university || "";
  /*const STORE_KEY = `market_items__${uni}`;*/

  useEffect(() => {
    if (!user) navigate("/login?role=student", { replace: true });
  }, [user, navigate]);

  /* ---------- Seed & load items (scoped to this university) ---------- */
// ✅ DISABLED (no seeded items)
const seeded = useMemo(() => [], [uni]);

  /*const [items, setItems] = useState(() => {
    const ls = safeParse(localStorage.getItem(STORE_KEY));
    return Array.isArray(ls) ? ls : seeded;
  });*/

  const [items, setItems] = useState(seeded);

  /*useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  }, [items, STORE_KEY]);*/

  /// 🔄 NEW: load & poll listings from backend (global marketplace)
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const firstLoadRef = useMemo(() => ({ done: false }), []);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    async function loadFromApi() {
      if (cancelled) return;

      /*setFeedLoading(true);*/
      if (!firstLoadRef.done) setFeedLoading(true);
      setFeedError("");

      try {
        /*const remote = await fetchPosts({
          scope: MARKETPLACE_SCOPE,
          role: "student",
        });*/
        const remote = await fetchMarketplaceItems();

        if (cancelled) return;

        /*console.log("[StudentMarketplace] raw fetchPosts data:", remote);*/
        console.log("[StudentMarketplace] raw fetchMarketplaceItems data:", remote);

        // 1️⃣ Normalise backend rows (seller + comments)
        const mapped = (remote || []).map((r) => {
          if (!r || typeof r !== "object") return r;

          const createdAt =
            r.createdAt ||
            r.created_at ||
            r.timestamp ||
            (typeof r.time === "number" ? r.time : Date.now());

          // ✅ Prefer nested seller (new backend), fallback to flat seller fields (older rows)
          const rawSeller =
            r.seller && typeof r.seller === "object"
              ? r.seller
              : {
                  id: r.sellerId ?? null,
                  name: r.sellerName ?? null,
                  program: r.sellerProgram ?? "",
                  photoUrl: r.sellerPhotoUrl ?? "",
                };

          const seller = {
            id:
              rawSeller?.id ??
              rawSeller?.uid ??
              rawSeller?.userId ??
              rawSeller?.ownerId ??
              rawSeller?.authorId ??
              r.sellerId ??
              null,
            name:
              rawSeller?.name ??
              rawSeller?.fullName ??
              rawSeller?.author ??
              r.sellerName ??
              "Student",
            program:
              rawSeller?.program ??
              rawSeller?.authorProgram ??
              r.sellerProgram ??
              "",
            photoUrl:
              rawSeller?.photoUrl ??
              rawSeller?.avatarUrl ??
              r.sellerPhotoUrl ??
              "",
          };

          // 🔄 Flatten backend comments (root + replies)
          let comments = [];
          if (Array.isArray(r.comments)) {
            for (const c of r.comments) {
              if (!c) continue;
              const rootId = c.id || `c_${Math.random().toString(36).slice(2)}`;
              comments.push({
                id: rootId,
                parentId: null,
                text: c.text || "",
                authorId: c.authorId || "",
                author: c.author || c.authorName || "",
                authorProgram: c.authorProgram || "",
                authorPhoto: c.authorPhoto || c.avatarUrl || c.profileImageUrl || "",
                createdAt: c.createdAt || c.updatedAt || null,
              });

              if (Array.isArray(c.replies)) {
                for (const rpl of c.replies) {
                  if (!rpl) continue;
                  comments.push({
                    id: rpl.id || `r_${Math.random().toString(36).slice(2)}`,
                    parentId: rootId,
                    text: rpl.text || "",
                    authorId: rpl.authorId || "",
                    author: rpl.author || rpl.authorName || "",
                    authorProgram: rpl.authorProgram || "",
                    authorPhoto:
                      rpl.authorPhoto || rpl.avatarUrl || rpl.profileImageUrl || "",
                    createdAt: rpl.createdAt || rpl.updatedAt || null,
                  });
                }
              }
            }
          }

          const images = Array.isArray(r.images)
            ? r.images.map((img) => {
                if (!img || typeof img !== "object") return img;

                // Keep same fields, just ensure any url/dataUrl/thumb points to CloudFront
                const next = { ...img };

                if (next.url) next.url = toCloudFrontUrl(next.url);
                if (next.dataUrl) next.dataUrl = toCloudFrontUrl(next.dataUrl);
                if (next.thumb) next.thumb = toCloudFrontUrl(next.thumb);

                return next;
              })
            : r.images;

          return {
            ...r,
            university: r.university || r.location || "",
            createdAt,
            seller,
            ...(images !== undefined ? { images } : {}),
            ...(comments.length ? { comments } : {}),
          };
        });

        // 2️⃣ Merge backend items with existing local ones without losing likes/save state
        setItems((prev) => {
          const prevArr = Array.isArray(prev) ? prev : [];
          const byId = new Map();

          for (const p of mapped || []) {
            if (!p) continue;

            const existing = p.id ? prevArr.find((x) => x.id === p.id) : null;

            // Start from existing (local), then overlay backend – so local-only fields stay.
            let merged = { ...(existing || {}), ...p };

            // Preserve like/save state when present locally
            merged.likes =
              typeof existing?.likes === "number" ? existing.likes : p.likes || 0;
            merged.saved =
              typeof existing?.saved === "boolean" ? existing.saved : !!p.saved;
            merged._liked =
              typeof existing?._liked === "boolean" ? existing._liked : !!p._liked;

            // ✅ IMPORTANT: don't let an empty backend comments array erase local comments
            if (Array.isArray(existing?.comments)) {
              const backendHasComments =
                Array.isArray(p.comments) && p.comments.length > 0;

              if (!backendHasComments) {
                // keep whatever we already had locally
                merged.comments = existing.comments;
              }
            }

            // If backend didn't send seller but we had one locally, keep it.
            if (!p.seller && existing?.seller) {
              merged.seller = existing.seller;
            }

            // Ensure createdAt exists
            merged.createdAt = merged.createdAt || merged.created_at || Date.now();

            const key = merged.id || `backend_${Math.random().toString(36).slice(2)}`;
            byId.set(key, merged);
          }

          // 3️⃣ Keep purely local items (seeded / offline) that backend doesn't know yet
          for (const p of prevArr) {
            if (!p) continue;
            const key = p.id || `local_${Math.random().toString(36).slice(2)}`;
            if (!byId.has(key)) byId.set(key, p);
          }

          return Array.from(byId.values());
        });
      } catch (err) {
        console.error("[StudentMarketplace] fetchPosts failed", err);
        if (!cancelled) {
          setFeedError("Could not load marketplace listings.");
        }
      } finally {
        /*if (!cancelled) setFeedLoading(false);*/
        if (!cancelled && !firstLoadRef.done) setFeedLoading(false);
        firstLoadRef.done = true;
      }
    }

    // initial load + polling
    loadFromApi();
    timerId = window.setInterval(loadFromApi, 30000); // every 30s

    return () => {
      cancelled = true;
      if (timerId) window.clearInterval(timerId);
    };
    /*}, [STORE_KEY]);*/
  }, [MARKETPLACE_SCOPE]);

  /* ---------- Notifications ---------- */
  const [notiOpen, setNotiOpen] = useState(false);
  const [notis, setNotis] = useState(() => loadAllNotis());
  const myUnread = notis.filter((n) => n.toUserId === user?.id && !n.read).length;
  const [focusThread, setFocusThread] = useState(null); // { itemId, rootId }

  useEffect(() => {
    saveAllNotis(notis);
  }, [notis]);

  // 🔔 Derive notifications from global comments so they appear across browsers
  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const seen = loadSeenCommentsForUser(userId);
    const nextSeen = new Set(seen);
    let seenChanged = false;
    const newNotis = [];

    const markSeen = (commentId) => {
      if (!commentId) return false;
      if (nextSeen.has(commentId)) return false;
      nextSeen.add(commentId);
      seenChanged = true;
      return true;
    };

    for (const item of items || []) {
      if (!item || !Array.isArray(item.comments) || !item.comments.length) continue;

      const sellerId = item.seller?.id;
      if (!sellerId) continue;

      const { byId, getRoot } = buildCommentIndex(item.comments);

      for (const c of item.comments) {
        if (!c || !c.id) continue;
        // Only handle each comment once per browser/user
        if (!markSeen(c.id)) continue;

        const viewerId = c.authorId;
        if (!viewerId) continue;

        const root = getRoot(c);
        const rootAuthorId = root?.authorId;

        // Who should receive the notification for this comment?
        let toUserId = null;
        if (viewerId === sellerId) {
          // Seller wrote the comment → notify root commenter (if different)
          if (rootAuthorId && rootAuthorId !== sellerId) {
            toUserId = rootAuthorId;
          }
        } else {
          // Buyer/root commenter wrote the comment → notify seller
          toUserId = sellerId;
        }

        // Don't notify the author themself
        if (!toUserId || toUserId === viewerId) continue;

        // Only create notifications for THIS logged-in user
        if (toUserId !== userId) continue;

        newNotis.push({
          toUserId,
          fromUserId: viewerId,
          itemId: item.id,
          rootId: root?.id || c.id,
          message: `${c.author || "Someone"} replied on "${item.title}"`,
        });
      }
    }

    if (newNotis.length) {
      setNotis((all) => {
        const stamped = newNotis.map((n) => ({
          id: `n${Date.now()}_${Math.random().toString(36).slice(2)}`,
          ...n,
          createdAt: Date.now(),
          read: false,
        }));
        return [...stamped, ...all].slice(0, 200);
      });
    }

    if (seenChanged) {
      saveSeenCommentsForUser(userId, nextSeen);
    }
  }, [items, user?.id]);

  const pushNotification = ({ toUserId, fromUserId, itemId, message, rootId }) => {
    const n = {
      id: `n${Date.now()}_${Math.random().toString(36).slice(2)}`,
      toUserId,
      fromUserId,
      itemId,
      rootId,
      message,
      createdAt: Date.now(),
      read: false,
    };
    setNotis((all) => [n, ...all].slice(0, 200));
  };
  const markNotiRead = (id) =>
    setNotis((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () =>
    setNotis((all) =>
      all.map((n) => (n.toUserId === user?.id ? { ...n, read: true } : n))
    );

  const jumpToListing = (itemId) => {
    const el = document.getElementById(`listing-${itemId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-blue-400");
      setTimeout(() => el.classList.remove("ring-2", "ring-blue-400"), 1800);
    }
  };

  /* ---------- Composer ---------- */
  const [openComposer, setOpenComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("$");
  const [mainCategory, setMainCategory] = useState(MAIN_CATEGORIES[0]);
  const [subCategory, setSubCategory] = useState(
    CATEGORY_MAP[MAIN_CATEGORIES[0]][0] || ""
  );
  const [condition, setCondition] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState([]);
  const [sellerMobile, setSellerMobile] = useState("");
  const [sellerWhatsapp, setSellerWhatsapp] = useState("");
  const [sellerLocation, setSellerLocation] = useState(""); // ✅ NEW

  useEffect(() => {
    const first = CATEGORY_MAP[mainCategory]?.[0] ?? "";
    setSubCategory(first);
  }, [mainCategory]);

  /**
   * ✅ FIXED: persist CloudFront URL into each attachment descriptor (global)
   * - Keeps your IndexedDB local storage unchanged (no logic removed)
   */
  async function persistAttachments(images = []) {
    const imgDescs = [];

    for (let i = 0; i < images.length; i++) {
      const src = images[i];
      const id = `mk_img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const blob = dataURLtoBlob(src.dataUrl);

      // Local persistence for same-browser preview (unchanged)
      await idbSet(id, blob);

      const thumb = await makeThumb(src.dataUrl, 360, 360, 0.72);

      // Upload to S3 and store a REAL global URL (CloudFront)
      let url = "";

      try {
        const up = await getMarketplaceUploadUrl({
          fileName: src.name || "image.jpg",
          contentType: blob.type || "image/jpeg",
        });

        if (up?.uploadUrl) {
          const putRes = await fetch(up.uploadUrl, {
            method: "PUT",
            headers: { "content-type": blob.type || "image/jpeg" },
            body: blob,
          });
          if (!putRes.ok) throw new Error(`S3 PUT failed: ${putRes.status}`);

          // Determine final URL:
          // 1) If backend returns up.url, use it (rewrite to CloudFront if needed)
          // 2) Else if backend returns up.key, build CloudFront URL from it
          // 3) Else keep url empty (local-only fallback still works on same device)
          if (up?.url) {
            url = toCloudFrontUrl(up.url);
          } else if (up?.key) {
            const cleanKey = String(up.key || "").replace(/^\/+/, "");
            if (CLOUDFRONT_BASE && cleanKey) {
              url = `${CLOUDFRONT_BASE}/${cleanKey}`;
            }
          }
        }
      } catch (e) {
        console.warn("[Marketplace] upload failed, using local-only image:", e);
      }

      imgDescs.push({
        id,
        name: src.name || "image.jpg",
        mime: blob.type || "image/jpeg",
        thumb,
        ...(url ? { url } : {}),
      });
    }

    return imgDescs;
  }

  const onPickPhotos = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    const slots = Math.max(0, 6 - photos.length);
    const chosen = files.slice(0, slots);

    const dataUrls = await Promise.all(
      chosen.map((f) => fileToDownscaledDataURL(f, 2200, 2200, 0.9, 1400))
    );

    const next = dataUrls.map((dataUrl, i) => ({
      name: chosen[i].name,
      dataUrl,
    }));
    setPhotos((arr) => [...arr, ...next]);
    e.target.value = "";
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !price) return;

    const imgs = await persistAttachments(photos);
    const tempId = `m${Date.now()}`;

    // ✅ ADD THIS BLOCK (RIGHT HERE)
    const myProgram =
      user?.program ||
      user?.academicProgram ||
      user?.programName ||
      user?.selectedProgram ||
      "";

    const myPhoto =
      user?.photoUrl ||
      user?.avatarUrl ||
      user?.profileImageUrl ||
      user?.profilePhotoUrl ||
      "";

    const baseItem = {
      title: title.trim(),
      price: Number(price),
      currency: (currency || "").slice(0, 4),
      mainCategory,
      subCategory: CATEGORY_MAP[mainCategory]?.length ? subCategory : "",
      condition,
      description: desc.trim(),
      images: imgs,
      likes: 0,
      saved: false,
      comments: [],
      // ✅ ADD THESE TWO LINES RIGHT HERE
      sellerMobile: sellerMobile.trim(),
      sellerWhatsapp: sellerWhatsapp.trim(),
      sellerLocation: sellerLocation.trim(), // ✅ NEW


      // ✅ REPLACE seller: {...} WITH THIS
      seller: {
        id: user?.id || user?.uid || user?.userId || null,
        name: user?.name || user?.fullName || "Student",
        program: myProgram,
        photoUrl: myPhoto,
      },

      university: uni,
      createdAt: Date.now(),
      deleted: false,
    };

    const newItem = {
      id: tempId,
      scope: MARKETPLACE_SCOPE,
      ...baseItem,
    };

    // Optimistic local update
    setItems((prev) => [newItem, ...prev]);

    // reset composer
    setOpenComposer(false);
    setTitle("");
    setPrice("");
    setDesc("");
    setPhotos([]);
    setCurrency("$");
    setMainCategory(MAIN_CATEGORIES[0]);
    setSubCategory(CATEGORY_MAP[MAIN_CATEGORIES[0]][0] || "");
    setCondition("");
    setSellerMobile("");
    setSellerWhatsapp("");
    setSellerLocation(""); // ✅ NEW

    // Persist to backend
    try {
      const saved = await createMarketplaceItem({
        title: baseItem.title,
        description: baseItem.description,
        price: baseItem.price,
        currency: baseItem.currency, // you currently store "$" — Lambda will accept it
        category: `${baseItem.mainCategory}${
          baseItem.subCategory ? ` • ${baseItem.subCategory}` : ""
        }`,
        condition: baseItem.condition || "Used",
        images: imgs, // store the attachment descriptors you already generate
        sellerId: baseItem.seller?.id || null,
        sellerName: baseItem.seller?.name || null,
        sellerProgram: baseItem.seller?.program || "",
        sellerPhotoUrl: baseItem.seller?.photoUrl || "",
        // optional contacts
        sellerMobile: baseItem.sellerMobile || "",
        sellerWhatsapp: baseItem.sellerWhatsapp || "",
        sellerLocation: baseItem.sellerLocation || "", // ✅ NEW (optional extra field)
        location: uni || null, // optional
      });

      if (saved && typeof saved === "object") {
        setItems((prev = []) =>
          prev.map((i) => {
            if (i.id !== tempId) return i;

            const merged = { ...i, ...saved };

            if (saved.price == null) merged.price = i.price;
            if (saved.currency == null) merged.currency = i.currency;

            // MarketplaceHandler returns description + images
            if (saved.description != null) {
              merged.description = saved.description;
            }

            if (Array.isArray(saved.images)) {
              merged.images = saved.images;
            } else {
              merged.images = i.images;
            }

            if (!saved.seller) {
              merged.seller = i.seller;
            }

            merged.createdAt = saved.createdAt || saved.created_at || i.createdAt;

            if (saved.id && saved.id !== tempId) {
              merged.id = saved.id;
            }

            return merged;
          })
        );
      }
    } catch (err) {
      console.error("[StudentMarketplace] createPost failed", err);
      // keep local listing if backend fails
    }
  };

  /* ---------- Filters ---------- */
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [subFilter, setSubFilter] = useState("All");
  const [showMine, setShowMine] = useState(false);

  const visibleItems = items
    .filter((i) => !i.deleted)
    .filter((i) => i.university === uni);

  const filtered = visibleItems
    .filter((i) => (catFilter === "All" ? true : i.mainCategory === catFilter))
    .filter((i) => (subFilter === "All" ? true : (i.subCategory || "") === subFilter))
    .filter((i) => (showMine ? i.seller && i.seller.id === user?.id : true))
    .filter((i) =>
      q
        ? i.title.toLowerCase().includes(q.toLowerCase()) ||
          i.description.toLowerCase().includes(q.toLowerCase())
        : true
    );

  /* ---------- Interactions & comment/notification logic ---------- */
  const toggleLike = (id) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              likes: i._liked ? i.likes - 1 : i.likes + 1,
              _liked: !i._liked,
            }
          : i
      )
    );
  const toggleSave = (id) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, saved: !i.saved } : i)));

  const buildCommentIndex = (comments = []) => {
    const byId = new Map();
    comments.forEach((c) => byId.set(c.id, c));
    const getRoot = (c) => {
      let cur = c;
      while (cur && cur.parentId) cur = byId.get(cur.parentId);
      return cur || c;
    };
    return { byId, getRoot };
  };

  const addComment = (itemId, text, viewer, parentId = null) => {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();

    // 1️⃣ Optimistic local update (same shape as before)
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;

        const comment = {
          id: `c${Date.now()}_${Math.random().toString(36).slice(2)}`,
          parentId: parentId || null,
          text: trimmed,
          authorId: viewer?.id,
          author: viewer?.name,
          authorProgram: viewer?.program,
          authorPhoto: viewer?.photoUrl,
          createdAt: Date.now(),
        };

        const updated = {
          ...i,
          comments: [...(i.comments || []), comment],
        };

        // 🔔 keep your existing notification logic
        const { byId, getRoot } = buildCommentIndex(updated.comments);
        const root = getRoot(comment);
        const sellerId = updated.seller?.id;
        const rootAuthorId = root.authorId;

        let toUserId = null;
        if (viewer?.id === sellerId) {
          if (rootAuthorId && rootAuthorId !== sellerId) {
            toUserId = rootAuthorId;
          }
        } else {
          toUserId = sellerId;
        }

        if (toUserId && toUserId !== viewer?.id) {
          pushNotification({
            toUserId,
            fromUserId: viewer?.id,
            itemId: updated.id,
            rootId: root.id,
            message: `${viewer?.name || "Someone"} replied on "${updated.title}"`,
          });
        }

        return updated;
      })
    );

    // 2️⃣ Persist to backend so comments are global and survive refresh
    (async () => {
      try {
        if (!parentId) {
          await createMarketplaceComment({
            itemId,
            text: trimmed,
            authorId: viewer?.id,
            authorName: viewer?.name,
            authorProgram: viewer?.program,
            authorPhoto: viewer?.photoUrl,
          });
        } else {
          await createMarketplaceReply({
            itemId,
            commentId: parentId,
            text: trimmed,
            authorId: viewer?.id,
            authorName: viewer?.name,
            authorProgram: viewer?.program,
            authorPhoto: viewer?.photoUrl,
          });
        }
      } catch (err) {
        console.error("[StudentMarketplace] addComment backend save failed", err);
        // keep local comment; next refresh will show it if backend saved successfully
      }
    })();
  };

  const deleteListing = async (id) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, deleted: true } : i)));
    try {
      /*await deletePost(id, { scope: MARKETPLACE_SCOPE, role: "student" });*/
      await deleteMarketplaceItem(id);
    } catch (err) {
      console.error("[StudentMarketplace] deletePost failed", err);
    }
  };

  /* ---------- Read more helper ---------- */
  function ReadMore({ text }) {
    const [open, setOpen] = useState(false);
    return (
      <div className="text-sm text-slate-700">
        <p className={`${open ? "" : "line-clamp-2"} whitespace-pre-wrap`}>{text}</p>
        {text && text.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-blue-600 text-xs mt-1 underline"
          >
            {open ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    );
  }

  /* ---------- Lightbox ---------- */
  const [lightbox, setLightbox] = useState({
    open: false,
    items: [],
    index: 0,
  });
  const openLightbox = (items = [], index = 0) => setLightbox({ open: true, items, index });
  const closeLightbox = () => setLightbox((l) => ({ ...l, open: false }));
  const step = (dir) =>
    setLightbox((l) => ({
      ...l,
      index: (l.index + dir + l.items.length) % l.items.length,
    }));

  /* ---------- UI ---------- */
  const currentSubcats = CATEGORY_MAP[catFilter] || [];
  const subFilterOptions = catFilter === "All" ? [] : currentSubcats;

  return (
    <div className="min-h-screen bg-[#f3f6fb] relative">
      {/* Notifications bell */}
      <div className="fixed right-4 bottom-6 z-40">
        <button
          onClick={() => setNotiOpen((o) => !o)}
          className="relative rounded-full border border-slate-200 bg-white shadow px-3 py-2 text-sm hover:bg-slate-50"
          title="Notifications"
        >
          🔔 Notifications
          {myUnread > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5">
              {myUnread}
            </span>
          )}
        </button>
        {notiOpen && (
          <div className="mt-2 w-80 max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100">
              <div className="font-semibold text-sm">Notifications</div>
              <button onClick={markAllRead} className="ml-auto text-xs text-blue-600 underline">
                Mark all read
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {notis.filter((n) => n.toUserId === user?.id).length === 0 && (
                <li className="px-3 py-3 text-sm text-slate-500">No notifications yet.</li>
              )}
              {notis
                .filter((n) => n.toUserId === user?.id)
                .map((n) => (
                  <li
                    key={n.id}
                    className={`px-3 py-2 ${n.read ? "bg-white" : "bg-blue-50/40"}`}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => {
                        markNotiRead(n.id);
                        setNotiOpen(false);
                        setFocusThread({ itemId: n.itemId, rootId: n.rootId });
                        jumpToListing(n.itemId);
                      }}
                    >
                      <div className="text-sm text-slate-900">{n.message}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {timeAgo(n.createdAt)} ago • Go to thread
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* Layout */}
      <main className="max-w-[1300px] mx-auto px-3 lg:px-5 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(780px,1fr)_260px] gap-5">
        {/* LEFT: Filters */}
        <aside className="space-y-4 pb-32">
          <Card square>
            <CardHeader title="Student Marketplace" square />
            <CardBody>
              <p className="text-xs text-slate-700 text-center">
                Only for {uni || "your university"}.
              </p>
              {feedError && <p className="mt-2 text-xs text-red-600 text-center">{feedError}</p>}
              {/*{feedLoading && (
                <p className="mt-1 text-[11px] text-slate-500 text-center">
                  Refreshing listings…
                </p>
              )}*/}
              <div className="mt-1 text-[11px] text-slate-500 text-center h-4">
              {feedLoading ? "Refreshing listings…" : "\u00A0"}
                </div>


            </CardBody>
          </Card>

          <Card square>
            <CardHeader title="My listings" square />
            <CardBody>
              <button
                onClick={() => setShowMine((v) => !v)}
                className={`w-full rounded-full px-3 py-1.5 text-sm ${
                  showMine ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {showMine ? "On" : "Off"}
              </button>
              {showMine && (
                <ul className="mt-3 space-y-2 text-sm">
                  {visibleItems.filter((i) => i.seller && i.seller.id === user?.id).length ===
                    0 && <li className="text-slate-500">No listings yet.</li>}
                  {visibleItems
                    .filter((i) => i.seller && i.seller.id === user?.id)
                    .map((i) => (
                      <li key={i.id} className="flex items-center gap-2">
                        <span className="truncate">{i.title}</span>
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            jumpToListing(i.id);
                          }}
                          className="ml-auto text-xs text-blue-600 underline"
                        >
                          View
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card square>
            <CardHeader title="Search" square />
            <CardBody>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
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
                onChange={(e) => {
                  setCatFilter(e.target.value);
                  setSubFilter("All");
                }}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
              >
                <option>All</option>
                {MAIN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {subFilterOptions.length > 0 && (
                <select
                  value={subFilter}
                  onChange={(e) => setSubFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
                >
                  <option>All</option>
                  {subFilterOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </CardBody>
          </Card>

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

        {/* CENTER: Composer + Feed */}
        <section className="space-y-4">
          <Card>
            <CardBody>
              {!openComposer ? (
                <div className="flex items-center gap-3">
                  <Avatar url={user?.photoUrl} name={user?.name} />
                  <button
                    onClick={() => setOpenComposer(true)}
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
                        onChange={(e) => setMainCategory(e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-sm"
                      >
                        {MAIN_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {CATEGORY_MAP[mainCategory]?.length > 0 && (
                        <select
                          value={subCategory}
                          onChange={(e) => setSubCategory(e.target.value)}
                          className="border border-slate-200 rounded px-2 py-1 text-sm"
                        >
                          {CATEGORY_MAP[mainCategory].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Title (e.g., Dell XPS 13, 16GB RAM)"
                      className="w-full border border-slate-200 rounded px-3 py-2"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        placeholder="$"
                        className="w-16 border border-slate-200 rounded px-3 py-2"
                        maxLength={4}
                      />
                      <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                        placeholder="Price"
                        className="w-full border border-slate-200 rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
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
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={onPickPhotos}
                      />
                    </label>
                  </div>

                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={3}
                    placeholder="Describe the item, condition, campus pickup point…"
                    className="w-full border border-slate-200 rounded px-3 py-2"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={sellerWhatsapp}
                      onChange={(e) => setSellerWhatsapp(e.target.value)}
                      placeholder="WhatsApp number (optional) e.g. +1 202 555 0123"
                      className="w-full border border-slate-200 rounded px-3 py-2"
                    />
                    <input
                      value={sellerMobile}
                      onChange={(e) => setSellerMobile(e.target.value)}
                      placeholder="Mobile number (optional) e.g. +1 202 555 0456"
                      className="w-full border border-slate-200 rounded px-3 py-2"
                    />
                    <input
  value={sellerLocation}
  onChange={(e) => setSellerLocation(e.target.value)}
  placeholder="Location of availability (optional) e.g. Campus Gate A, Dorm B, City Center"
  className="w-full border border-slate-200 rounded px-3 py-2"
/>
                  </div>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {photos.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-full h-32 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setPhotos((arr) => arr.filter((_, i) => i !== idx))}
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
                      onClick={() => {
                        setOpenComposer(false);
                        setTitle("");
                        setPrice("");
                        setDesc("");
                        setPhotos([]);
                        setCurrency("$");
                        setMainCategory(MAIN_CATEGORIES[0]);
                        setSubCategory(CATEGORY_MAP[MAIN_CATEGORIES[0]][0] || "");
                        setCondition("");
                        setSellerMobile("");
                        setSellerWhatsapp("");
                        setSellerLocation(""); // ✅ NEW
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
            </CardBody>
          </Card>

          {filtered.map((item) => {
            // ---- Seller: rebuild from backend author* fields when seller is missing ----
            const sellerFromPost =
              item.seller && typeof item.seller === "object" ? item.seller : {};

            const seller = {
              id:
                sellerFromPost.id ??
                sellerFromPost.uid ??
                item.sellerId ??
                item.authorId ??
                item.ownerId ??
                null,
              name:
                sellerFromPost.name ??
                sellerFromPost.fullName ??
                item.sellerName ??
                item.authorName ??
                item.author ??
                item.userName ??
                "Student",
              program:
                sellerFromPost.program ??
                item.sellerProgram ??
                item.authorProgram ??
                item.program ??
                "",
              photoUrl:
                sellerFromPost.photoUrl ??
                sellerFromPost.avatarUrl ??
                item.sellerPhotoUrl ??
                item.sellerPhoto ??
                item.authorPhoto ??
                item.photoUrl ??
                "",
            };

            const mobile = (item.sellerMobile ?? item.mobile ?? "").toString().trim();
            const whatsapp = (item.sellerWhatsapp ?? item.whatsapp ?? "").toString().trim();
            const locationText = (item.sellerLocation ??item.availabilityLocation ??item.locationText ??"").toString().trim();
            const waDigits = whatsapp.replace(/[^\d]/g, "");

            // Make sure Comments component also "sees" a seller object
            const itemForComments = item.seller ? item : { ...item, seller };

            // ---- Body text: description first, then fall back to text ----
            const bodyText =
              typeof item.description === "string" && item.description.trim().length
                ? item.description
                : typeof item.text === "string"
                ? item.text
                : "";

            // ---- Price & currency: try several possible locations ----
            const rawPrice =
              item.price ??
              item.meta?.price ??
              item.meta?.marketplace?.price ??
              item.details?.price ??
              item.extra?.price;

            const priceNum = Number(rawPrice);
            const hasPrice = Number.isFinite(priceNum);

            const rawCurrency =
              item.currency ??
              item.meta?.currency ??
              item.meta?.marketplace?.currency ??
              item.details?.currency ??
              item.extra?.currency ??
              "";

            const currencyLabel = String(rawCurrency).trim() || (hasPrice ? "$" : "");

            return (
              <Card key={item.id} id={`listing-${item.id}`}>
                <CardBody>
                  <div className="flex items-center gap-3">
                    <Avatar url={seller.photoUrl} name={seller.name} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{seller.name}</div>
                      <div className="text-xs text-slate-500">
                        {seller.program}{" "}
                        {item.createdAt ? `• ${new Date(item.createdAt).toLocaleString()}` : ""}
                      </div>
                    </div>
                    <Badge>
                      {item.mainCategory}
                      {item.subCategory ? ` • ${item.subCategory}` : ""}
                    </Badge>

                    {/* Seller-only delete */}
                    {seller.id === user?.id && (
                      <button
                        onClick={() => deleteListing(item.id)}
                        className="ml-2 text-xs rounded-full border border-red-200 text-red-600 px-2 py-0.5 hover:bg-red-50"
                        title="Delete listing"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="text-lg font-semibold text-slate-900">{item.title}</div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700">
                      {/* Price + condition (left) */}
                      <div className="flex items-center flex-wrap gap-x-2">
                        <span>
                          {currencyLabel}
                          {hasPrice ? priceNum.toFixed(2) : ""}
                        </span>

                        {item.condition ? (
                          <span className="text-xs text-slate-500">• {item.condition}</span>
                        ) : null}
                      </div>

                      {/* Contacts (same line, pushed a bit away) */}
                      {(mobile || whatsapp || locationText) && (
                      /*{(mobile || whatsapp) && (*/
                        <div className="flex items-center gap-3 ml-6">
                          {whatsapp && (
                            <a
                              href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-emerald-600 hover:underline"
                              title="Chat on WhatsApp"
                            >
                              <WhatsAppIcon className="h-6 w-6" />
                              <span>{whatsapp}</span>
                            </a>
                          )}

                          {mobile && (
                            <a
                              href={`tel:${mobile}`}
                              className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                              title={`Mobile: ${mobile}`}
                            >
                              <span className="text-base">📞</span>
                              <span className="text-sm">{mobile}</span>
                            </a>
                          )}
                        </div>
                      )}

                      {locationText && (
                     <span
                     className="inline-flex items-center gap-1 text-slate-700"
                       title={`Location: ${locationText}`}
                       >
                      <LocationPinIcon className="h-4 w-4 text-red-600" />
                      <span className="text-sm">{locationText}</span>
                      </span>
                     )}
                    </div>

                    <div className="mt-1">
                      <ReadMore text={bodyText} />
                    </div>
                  </div>

                  {item.images?.length > 0 && (
                    <div className="mt-3">
                      <ImageGrid
                        images={item.images}
                        onOpen={(idx) => openLightbox(item.images, idx)}
                        max={4}
                        tileClass="h-44"
                      />
                    </div>
                  )}

                  {lightbox.open && (
                    <div
                      className="fixed inset-0 z-[9999] bg-black/70 flex items-start justify-center pt-[140px] pb-6 px-4"
                      onClick={closeLightbox}
                    >
                      <div className="relative max-w-5xl w-full" onClick={stop} onMouseDown={stop}>
                        <AttachmentImage
                          key={lightbox.items[lightbox.index]?.id || lightbox.index}
                          att={lightbox.items[lightbox.index]}
                          enlarge
                          className="w-full max-h-[calc(100vh-180px)] object-contain rounded"
                        />
                        <button
                          type="button"
                          className="absolute -top-3 -right-3 bg-white rounded-full px-2 py-1 text-sm shadow z-10"
                          onClick={(e) => {
                            stop(e);
                            closeLightbox();
                          }}
                          aria-label="Close"
                        >
                          ✕
                        </button>
                        {lightbox.items.length > 1 && (
                          <>
                            <button
                              type="button"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10"
                              onClick={(e) => {
                                stop(e);
                                step(-1);
                              }}
                              aria-label="Previous"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full px-3 py-2 text-xl shadow z-10"
                              onClick={(e) => {
                                stop(e);
                                step(1);
                              }}
                              aria-label="Next"
                            >
                              ›
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-6 text-sm text-slate-600">
                    <button
                      onClick={() => toggleLike(item.id)}
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                    >
                      👍 Like{" "}
                      {item.likes > 0 && (
                        <span className="text-slate-500">({item.likes})</span>
                      )}
                    </button>
                    <button
                      onClick={() => toggleSave(item.id)}
                      className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                    >
                      {item.saved ? "★ Saved" : "☆ Save"}
                    </button>
                    <Link to="/student-dashboard" className="ml-auto text-blue-600 underline">
                      Back to Dashboard
                    </Link>
                  </div>

                  {/* Private, threaded comments (seller + root commenter) */}
                  <Comments
                    item={itemForComments}
                    currentUser={user}
                    focusThread={focusThread}
                    onAdd={(txt, parentId) => addComment(item.id, txt, user, parentId)}
                  />
                </CardBody>
              </Card>
            );
          })}
        </section>

        {/* RIGHT: Tips / rules */}
        <aside className="space-y-4 pb-32">
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
              <p className="text-sm text-slate-700">
                No illegal goods, weapons, counterfeit items, or academic misconduct services.
              </p>
            </CardBody>
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
  );
}

/* ============ Comments component (two-way threads + focus-from-notification) ============ */
function autoGrow(e) {
  e.target.style.height = "auto";
  e.target.style.height = `${e.target.scrollHeight}px`;
}

function Comments({ item, onAdd, currentUser, focusThread }) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const [replyForId, setReplyForId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const isSeller = item.seller && item.seller.id === currentUser?.id;

  const byId = new Map((item.comments || []).map((c) => [c.id, c]));
  const getRoot = (c) => {
    let cur = c;
    while (cur && cur.parentId) cur = byId.get(cur.parentId);
    return cur || c;
  };

  const all = item.comments || [];
  const visible = isSeller
    ? all
    : all.filter((c) => {
        const root = getRoot(c);
        return root.authorId === currentUser?.id || c.authorId === currentUser?.id;
      });

  const parents = visible.filter((c) => !c.parentId);
  const repliesByParent = visible.reduce((acc, c) => {
    if (c.parentId) {
      (acc[c.parentId] ||= []).push(c);
    }
    return acc;
  }, {});

  useEffect(() => {
    if (!focusThread) return;
    if (focusThread.itemId !== item.id) return;
    setOpen(true);
    const id = `comment-${focusThread.rootId}`;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-emerald-400", "rounded-xl");
        setTimeout(
          () => el.classList.remove("ring-2", "ring-emerald-400", "rounded-xl"),
          1800
        );
        setReplyForId(null);
      }
    }, 60);
  }, [focusThread, item.id]);

  const privacyNote = isSeller
    ? "Only you and the commenter see each thread."
    : "Only you and the seller see this thread.";

  const submitTopLevel = (e) => {
    e.preventDefault();
    onAdd(text, null);
    setText("");
  };
  const submitReply = (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onAdd(replyText, parentId);
    setReplyText("");
    setReplyForId(null);
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-sm text-slate-600 hover:underline"
        >
          💬 Comments {visible.length ? `(${visible.length})` : ""}
        </button>
        <span className="text-[11px] text-slate-500">{privacyNote}</span>
      </div>
      {open && (
        <div className="mt-2 space-y-3">
          {parents.map((c) => (
            <div key={c.id} id={`comment-${c.id}`} className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  <Avatar url={c.authorPhoto} name={c.author} size="sm" />
                </div>
                <div className="min-w-0 bg-slate-50 rounded-2xl px-3 py-2 max-w-full">
                  <div className="text-sm font-medium text-slate-900">{c.author}</div>
                  <div className="text-xs text-slate-500">{c.authorProgram || ""}</div>
                  <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{c.text}</div>

                  <button
                    onClick={() => setReplyForId(replyForId === c.id ? null : c.id)}
                    className="mt-2 text-xs text-blue-600 underline"
                  >
                    {replyForId === c.id ? "Cancel reply" : "Reply"}
                  </button>

                  {(repliesByParent[c.id] || []).map((r) => (
                    <div key={r.id} className="mt-3 pl-4 border-l border-slate-200">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0">
                          <Avatar url={r.authorPhoto} name={r.author} size="sm" />
                        </div>
                        <div className="min-w-0 bg-white rounded-2xl px-3 py-2 border border-slate-100">
                          <div className="text-sm font-medium text-slate-900">{r.author}</div>
                          <div className="text-xs text-slate-500">{r.authorProgram || ""}</div>
                          <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">
                            {r.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* ✅ Bottom Reply button */}
                  <div className="mt-2 pl-4">
                    <button
                      type="button"
                      onClick={() => setReplyForId(replyForId === c.id ? null : c.id)}
                      className="text-xs text-blue-600 underline"
                    >
                      {replyForId === c.id ? "Cancel reply" : "Reply"}
                    </button>
                  </div>

                  {replyForId === c.id && (
                    <form onSubmit={(e) => submitReply(e, c.id)} className="mt-2 pl-4">
                      <div className="flex items-start gap-2">
                        {(() => {
                          const threadReplies = repliesByParent[c.id] || [];
                          const lastMsg = threadReplies.length
                            ? threadReplies[threadReplies.length - 1]
                            : c;

                          const replyToName =
                            lastMsg?.authorId && lastMsg.authorId === currentUser?.id
                              ? c.author || "them"
                              : lastMsg?.author || c.author || "them";

                          return (
                            <>
                              <textarea
                                value={replyText}
                                onChange={(e) => {
                                  setReplyText(e.target.value);
                                  autoGrow(e);
                                }}
                                onInput={autoGrow}
                                placeholder={`Reply to ${replyToName}…`}
                                rows={1}
                                className="flex-1 border border-slate-200 rounded-2xl px-3 py-2 resize-none overflow-hidden leading-5"
                              />
                              <button
                                type="submit"
                                className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
                              >
                                Reply
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}

          <form onSubmit={submitTopLevel}>
            <div className="flex items-start gap-2">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  autoGrow(e);
                }}
                onInput={autoGrow}
                placeholder={
                  isSeller
                    ? "Write a private message to the buyer…"
                    : "Write a private comment to the seller…"
                }
                rows={1}
                className="flex-1 border border-slate-200 rounded-2xl px-3 py-2 resize-none overflow-hidden leading-5"
              />
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
              >
                Post
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}