// src/utils/scholarshipsApi.js

// Prefer a dedicated scholarships API base so we don't break other APIs that use VITE_API_BASE.
const RAW_API_BASE =
  (import.meta?.env?.VITE_SCHOLARSHIPS_API_BASE &&
    String(import.meta.env.VITE_SCHOLARSHIPS_API_BASE).trim()) ||
  (import.meta?.env?.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim()) ||
  (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "";

// Strip trailing slashes so we can safely append paths.
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

const LS_KEY = "scholarships_local";
const IS_PROD = !!import.meta?.env?.PROD;

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

/* ---------- Internal helpers ---------- */
async function apiFetch(path, opts) {
  if (!API_BASE) {
    if (IS_PROD) {
      throw new Error(
        "Scholarships API base is missing in production. Set VITE_SCHOLARSHIPS_API_BASE in Amplify."
      );
    }
    return null; // dev: allow local fallback
  }

  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    // In prod: never fall back to local (that breaks cross-device visibility)
    if (IS_PROD) throw e;
    return null; // dev: allow local fallback
  }
}

/* ---------- API + fallback ops ---------- */
export async function listScholarships({
  q = "",
  status = "all",
  page = 1,
  pageSize = 50,
} = {}) {
  const params = new URLSearchParams({
    q,
    status,
    page: String(page),
    pageSize: String(pageSize),
  });

  const apiData = await apiFetch(`/api/scholarships?${params.toString()}`, {
    method: "GET",
  });
  if (apiData) return apiData; // { items, total }

  // Local fallback (DEV ONLY)
  let items = readLocal();

  if (q) {
    const s = q.toLowerCase();
    items = items.filter((it) =>
      [it.title, it.provider, it.country, it.level, it.field]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }
  if (status && status !== "all") {
    items = items.filter(
      (it) =>
        (it.status || "pending").toLowerCase() === status.toLowerCase()
    );
  }

  items.sort((a, b) => (b.createdAt || b.id || 0) - (a.createdAt || a.id || 0));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return { items: paged, total };
}

export async function createScholarship(data) {
  const apiData = await apiFetch(`/api/scholarships`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
  if (apiData) return apiData;

  // Local fallback (DEV ONLY)
  const items = readLocal();
  const withId = ensureId({
    ...data,
    createdAt: data?.createdAt || Date.now(),
    status: String(data?.status || "pending").toLowerCase(),
  });
  items.unshift(withId);
  writeLocal(items);
  return withId;
}

export async function updateScholarship(id, patch) {
  const apiData = await apiFetch(`/api/scholarships/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch || {}),
  });
  if (apiData) return apiData;

  // Local fallback (DEV ONLY)
  const items = readLocal();
  const idx = items.findIndex((x) => String(x.id) === String(id));
  if (idx === -1) throw new Error("Not found (local)");
  items[idx] = { ...items[idx], ...patch, id: items[idx].id };
  writeLocal(items);
  return items[idx];
}

export async function deleteScholarship(id) {
  const apiData = await apiFetch(`/api/scholarships/${id}`, { method: "DELETE" });
  if (apiData) return { ok: true };

  // Local fallback (DEV ONLY)
  const items = readLocal().filter((x) => String(x.id) !== String(id));
  writeLocal(items);
  return { ok: true };
}