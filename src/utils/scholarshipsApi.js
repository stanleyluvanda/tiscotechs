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

/* =========================================================
   🆕 Funded Graduate Admission (separate content type)
   - Uses SAME backend endpoint
   - Uses SAME DynamoDB table
   - Does NOT affect scholarships logic
========================================================= */

const FUNDED_TYPE = "FUNDED_GRAD_ADMISSION";
const FUNDED_CACHE_PREFIX = "sk:funded_admissions:cache:v1:";


/* =========================================================
   ✅ NEW: Lightweight cache for instant UI
   - Works in PROD safely (it's just caching API responses)
   - Does NOT replace backend data, does NOT break cross-device
   - Cache is per-status (approved/all/pending etc.)
========================================================= */
const CACHE_PREFIX = "sk:scholarships:cache:v1:"; // key = prefix + status
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/*function cacheKey(status) {
  return `${CACHE_PREFIX}${String(status || "all").toLowerCase()}`;
}*/



function cacheKey(status, contentType) {
  const s = String(status || "all").toLowerCase();
  const ct = String(contentType || "all").toUpperCase();
  return `${CACHE_PREFIX}${s}:${ct}`;
}

export function readScholarshipsCache(status = "all", contentType = "all") {
  try {
    const raw = localStorage.getItem(cacheKey(status, contentType));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    const ts = Number(obj.ts || 0);
    const items = Array.isArray(obj.items) ? obj.items : [];
    const total = Number.isFinite(Number(obj.total)) ? Number(obj.total) : items.length;

    if (ts && Date.now() - ts > CACHE_TTL_MS) return null;

    return { items, total, ts };
  } catch {
    return null;
  }
}

export function writeScholarshipsCache(status = "all", contentType = "all", payload) {
  try {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const total = Number.isFinite(Number(payload?.total)) ? Number(payload.total) : items.length;

    localStorage.setItem(
      cacheKey(status, contentType),
      JSON.stringify({ ts: Date.now(), items, total })
    );
  } catch {
    // ignore
  }
}


/* =========================================================
   🆕 Funded Graduate Admission Cache
========================================================= */

function fundedCacheKey(status) {
  return `${FUNDED_CACHE_PREFIX}${String(status || "all").toLowerCase()}`;
}

export function readFundedAdmissionsCache(status = "all") {
  try {
    const raw = localStorage.getItem(fundedCacheKey(status));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    const ts = Number(obj.ts || 0);
    const items = Array.isArray(obj.items) ? obj.items : [];
    const total = Number.isFinite(Number(obj.total)) ? Number(obj.total) : items.length;

    if (ts && Date.now() - ts > CACHE_TTL_MS) return null;

    return { items, total, ts };
  } catch {
    return null;
  }
}

function writeFundedAdmissionsCache(status = "all", payload) {
  try {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const total = Number.isFinite(Number(payload?.total))
      ? Number(payload.total)
      : items.length;

    localStorage.setItem(
      fundedCacheKey(status),
      JSON.stringify({ ts: Date.now(), items, total })
    );
  } catch {
    // ignore
  }
}





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
  contentType = "", // ✅ ADD
  view = "",
} = {}) {


  const params = new URLSearchParams({
    q,
    status,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (contentType) {
  params.set("contentType", String(contentType));
}

if (view) {
  params.set("view", String(view));
}
  if (contentType) {
  params.set("contentType", String(contentType));
}

  const apiData = await apiFetch(`/api/scholarships?${params.toString()}`, {
    method: "GET",
  });

  if (apiData) {
    // ✅ NEW: cache results (helps Scholarship page render instantly next time)
    // We cache only the first page because Scholarship.jsx requests a large page anyway.
    if (Number(page) === 1) {
      /*writeScholarshipsCache(status, apiData);*/
      writeScholarshipsCache(status, contentType || "all", apiData);
    }
    return { ...apiData, meta: { source: "api" } }; // meta is additive (non-breaking)
  }

  // Local fallback (DEV ONLY)
  let items = readLocal();
  if (contentType) {
  const want = String(contentType).toUpperCase();
  items = items.filter((it) => String(it?.contentType || "").toUpperCase() === want);
}

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
      (it) => (it.status || "pending").toLowerCase() === status.toLowerCase()
    );
  }

  items.sort((a, b) => (b.createdAt || b.id || 0) - (a.createdAt || a.id || 0));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return { items: paged, total, meta: { source: "local-dev" } };
}




/**
 * Retrieve the complete scholarship collection in API-sized batches.
 *
 * Lambda limits each response to 100 records, so this helper requests
 * additional pages until the API-reported total has been collected.
 */
export async function listAllScholarships({
  q = "",
  status = "all",
  contentType = "",
  pageSize = 100,
   view = "",
} = {}) {
  const allItems = [];
  let page = 1;
  let total = 0;
  let source = "api";

  do {
    const response = await listScholarships({
      q,
      status,
      contentType,
      page,
      pageSize,
      view,
    });

    const batch = Array.isArray(response?.items)
      ? response.items
      : [];

    allItems.push(...batch);

    total = Number.isFinite(Number(response?.total))
      ? Number(response.total)
      : allItems.length;

    source = response?.meta?.source || source;

    if (batch.length === 0) break;

    page += 1;
  } while (allItems.length < total);

  const completeResult = {
    items: allItems,
    total: allItems.length,
  };

  // Replace the partial first-page cache with the complete collection.
  writeScholarshipsCache(
    status,
    contentType || "all",
    completeResult
  );

  return {
    ...completeResult,
    meta: { source },
  };
}


/* ================= INSERT NEW FUNCTION BELOW THIS LINE ================= */

export async function listFundedGraduateAdmissions({
  q = "",
  status = "all",
  page = 1,
  pageSize = 50,
  view = "",
} = {}) {
  const params = new URLSearchParams({
    q,
    status,
    page: String(page),
    pageSize: String(pageSize),
    contentType: FUNDED_TYPE,
  });
  if (view) {
  params.set("view", String(view));
}

  const apiData = await apiFetch(`/api/scholarships?${params.toString()}`, {
    method: "GET",
  });

  if (apiData) {
    if (Number(page) === 1) {
      writeFundedAdmissionsCache(status, apiData);
    }
    return { ...apiData, meta: { source: "api" } };
  }

  // Local fallback (DEV ONLY)
  let items = readLocal();

  items = items.filter(
    (it) => String(it?.contentType || "").toUpperCase() === FUNDED_TYPE
  );

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
      (it) => (it.status || "pending").toLowerCase() === status.toLowerCase()
    );
  }

  items.sort((a, b) => (b.createdAt || b.id || 0) - (a.createdAt || a.id || 0));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return { items: paged, total, meta: { source: "local-dev" } };
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



/* ================= INSERT NEW FUNCTION BELOW THIS LINE ================= */

export async function createFundedGraduateAdmission(data) {
  const apiData = await apiFetch(`/api/scholarships`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(data || {}),
      contentType: FUNDED_TYPE,
    }),
  });

  if (apiData) return apiData;

  // Local fallback (DEV ONLY)
  const items = readLocal();

  const withId = ensureId({
    ...data,
    contentType: FUNDED_TYPE,
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

/* ================= INSERT BELOW THIS LINE ================= */

export async function getFundedGraduateAdmissionById(id) {
  return apiFetch(`/api/scholarships/${id}`, { method: "GET" });
}