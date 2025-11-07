// src/utils/scholarshipsApi.js
const API_BASE = (
  import.meta?.env?.VITE_API_URL ||
  import.meta?.env?.VITE_API_BASE ||
  ""
).replace(/\/+$/, ""); // strip trailing slash

const LS_KEY = "scholarships_local";

/* ---------- Local helpers ---------- */
function readLocal() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeLocal(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr || []));
}

/* Ensure an id exists in local mode */
function ensureId(item) {
  if (item.id === 0 || item.id) return item;
  return { ...item, id: Date.now() };
}

/* ---------- API + fallback ops ---------- */
export async function listScholarships({ q = "", status = "all", page = 1, pageSize = 50 } = {}) {
  // Try API
  if (API_BASE) {
    try {
      const params = new URLSearchParams({
        q,
        status,
        page: String(page),
        pageSize: String(pageSize),
      });
      const r = await fetch(`${API_BASE}/api/scholarships?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json(); // { items, total }
    } catch (_) {
      // fall through to local
    }
  }

  // Local fallback
  let items = readLocal();

  // Filter
  if (q) {
    const s = q.toLowerCase();
    items = items.filter((it) =>
      [it.title, it.provider, it.country, it.level, it.field]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }
  if (status && status !== "all") {
    items = items.filter((it) => (it.status || "pending").toLowerCase() === status.toLowerCase());
  }

  // Sort newest first by createdAt or id
  items.sort((a, b) => (b.createdAt || b.id || 0) - (a.createdAt || a.id || 0));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return { items: paged, total };
}

export async function updateScholarship(id, patch) {
  // Try API
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/api/scholarships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (_) {
      // fall through to local
    }
  }

  // Local fallback
  const items = readLocal();
  const idx = items.findIndex((x) => String(x.id) === String(id));
  if (idx === -1) throw new Error("Not found (local)");
  items[idx] = { ...items[idx], ...patch };
  writeLocal(items);
  return items[idx];
}

export async function deleteScholarship(id) {
  // Try API
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/api/scholarships/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { ok: true };
    } catch (_) {
      // fall through to local
    }
  }

  // Local fallback
  const items = readLocal().filter((x) => String(x.id) !== String(id));
  writeLocal(items);
  return { ok: true };
}

/* Optional: use this if you ever need to create via local directly */
export function createLocalScholarship(data) {
  const items = readLocal();
  const withId = ensureId({
    ...data,
    createdAt: data.createdAt || Date.now(),
  });
  items.push(withId);
  writeLocal(items);
  return withId;
}