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
// CloudFront base for cached public scholarship/fellowship listing GET requests only
const SCHOLARSHIPS_PUBLIC_CLOUDFRONT_BASE =
  "https://d9xoeam8jbfti.cloudfront.net";

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

  /*const apiData = await apiFetch(`/api/scholarships?${params.toString()}`, {
    method: "GET",
  });*/

  let apiData = null;

try {
  const r = await fetch(
    `${SCHOLARSHIPS_PUBLIC_CLOUDFRONT_BASE}/api/scholarships?${params.toString()}`,
    {
      method: "GET",
    }
  );

  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  apiData = await r.json();
} catch (e) {
  // In production, do not silently fall back to browser-local scholarship data.
  if (IS_PROD) throw e;
}


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

  /*const apiData = await apiFetch(`/api/scholarships?${params.toString()}`, {
    method: "GET",
  });*/
  const res = await fetch(
  `${SCHOLARSHIPS_PUBLIC_CLOUDFRONT_BASE}/api/scholarships?${params.toString()}`,
  {
    method: "GET",
  }
);

if (!res.ok) throw new Error(`HTTP ${res.status}`);

const apiData = await res.json();

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

/* ---------- Private Partner geographical statistics ---------- */
import { partnerAuthenticatedFetch, PartnerApiError } from "../lib/partnerAuthenticatedApi";
import { ScholarsAuthSession } from "../lib/scholarsAuthSession";

const GEO_TTL_MS = 5 * 60 * 1000;
const geoCache = new Map();
let geoSession = null;
let geoEpoch = 0;

export function clearScholarshipGeoCache() {
  geoCache.clear();
  geoSession = null;
  geoEpoch += 1;
}

// Use the existing authentication notifications, including cross-tab changes.
if (typeof window !== "undefined") {
  window.addEventListener("auth:changed", clearScholarshipGeoCache);
  window.addEventListener("user:updated", clearScholarshipGeoCache);
  window.addEventListener("storage", clearScholarshipGeoCache);
}

async function geoSessionSnapshot() {
  if (!(await ScholarsAuthSession.doesSessionExist())) {
    clearScholarshipGeoCache();
    throw new PartnerApiError("Please log in again.", 401, "SESSION_REQUIRED");
  }
  const userId = await ScholarsAuthSession.getUserId();
  const token = await ScholarsAuthSession.getAccessToken();
  if (!userId || !token) {
    clearScholarshipGeoCache();
    throw new PartnerApiError("Please log in again.", 401, "SESSION_REQUIRED");
  }
  // Exact token comparison is conservative: even token rotation invalidates cache.
  // Token stays in module memory only and is never returned or logged.
  if (!geoSession || geoSession.userId !== userId || geoSession.token !== token) {
    clearScholarshipGeoCache();
    geoSession = { userId, token };
  }
  return geoSession;
}

function geoAbort(signal) {
  if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
}

export async function getScholarshipGeoStats(listingId, { signal, forceRefresh = false } = {}) {
  const id = String(listingId ?? "").trim();
  if (!/^\d+$/.test(id)) throw new PartnerApiError("Invalid listing ID.", 400, "INVALID_LISTING_ID");
  geoAbort(signal);
  const session = await geoSessionSnapshot();
  const epoch = geoEpoch;
  geoAbort(signal);
  const cached = geoCache.get(id);
  if (!forceRefresh && cached && Date.now() - cached.at < GEO_TTL_MS) {
    return structuredClone(cached.data);
  }
  geoCache.delete(id);
  try {
    const response = await partnerAuthenticatedFetch(`/api/scholarships/${encodeURIComponent(id)}/geo-stats`, { method: "GET", signal });
    const data = await response.json();
    geoAbort(signal);
    const current = await geoSessionSnapshot();
    geoAbort(signal);
    if (current !== session || epoch !== geoEpoch) {
      throw new PartnerApiError("Account or session changed. Please reopen statistics.", 401, "SESSION_CHANGED");
    }
    if (data?.ok !== true || String(data.listingId) !== id || !Array.isArray(data.countries)) {
      throw new PartnerApiError("Invalid geographical statistics response.", 502, "INVALID_GEO_RESPONSE");
    }
    // Bound memory use; only successful, current-session responses are cached.
    for (const [key, entry] of geoCache) {
      if (Date.now() - entry.at >= GEO_TTL_MS) geoCache.delete(key);
    }
    if (geoCache.size >= 100) geoCache.delete(geoCache.keys().next().value);
    geoCache.set(id, { at: Date.now(), data: structuredClone(data) });
    return data;
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) clearScholarshipGeoCache();
    throw error;
  }
}

// Fixed geographic convention: Central America and Caribbean are North America;
// Russia is Europe; Cyprus, Türkiye and the South Caucasus are Asia.
const GEO_REGIONS = {
  Africa: "DZ AO BJ BW BF BI CV CM CF TD KM CG CD DJ EG GQ ER SZ ET GA GM GH GN GW CI KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW SH ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW",
  Asia: "AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE IO",
  Europe: "AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG HU IS IE IM IT JE XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SJ SE CH UA GB VA AX",
  "North America": "AI AG AW BS BB BZ BM BQ CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PR BL KN LC MF PM VC SX TT TC US VG VI",
  "South America": "AR BO BR CL CO EC FK GF GY PY PE SR UY VE",
  Oceania: "AS AU CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV VU WF UM CC CX",
  Antarctica: "AQ BV GS HM TF"
};
const GEO_CONTINENTS = new Map(Object.entries(GEO_REGIONS).flatMap(([region, codes]) => codes.split(" ").map(code => [code, region])));
const GEO_METRICS = ["views", "applyClicks", "websiteClicks"];
let geoNames;
try { geoNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" }); } catch { /* use code */ }
const geoCode = code => String(code ?? "").trim().toUpperCase();
export function getGeoCountryName(code) {
  const normalized = geoCode(code);
  if (!/^[A-Z]{2}$/.test(normalized)) return "Unknown";
  try { return geoNames?.of(normalized) || normalized; } catch { return normalized; }
}
export function getGeoContinent(code) {
  return GEO_CONTINENTS.get(geoCode(code)) || "Unknown";
}
function aggregateGeoStats(input, metric, byContinent, continent) {
  if (!GEO_METRICS.includes(metric)) throw new Error("Invalid geographical metric");
  const countries = Array.isArray(input) ? input : input?.countries || [];
  const groups = new Map();
  for (const country of countries) {
    const code = geoCode(country?.countryCode);
    if (!/^[A-Z]{2}$/.test(code)) continue;
    const region = getGeoContinent(code);
    if (continent && continent !== "all" && region !== continent) continue;
    const key = byContinent ? region : code;
    const row = groups.get(key) || { key, name: byContinent ? region : getGeoCountryName(code), continent: region, ...(byContinent ? {} : { countryCode: code }), views: 0, applyClicks: 0, websiteClicks: 0 };
    for (const field of GEO_METRICS) {
      const n = Number(country[field]);
      if (Number.isSafeInteger(n) && n >= 0) row[field] += n;
    }
    groups.set(key, row);
  }
  const rows = [...groups.values()];
  const total = rows.reduce((sum, row) => sum + row[metric], 0);
  return rows.map(row => ({ ...row, value: row[metric], percentage: total ? 100 * row[metric] / total : 0 })).sort((a,b) => b.value - a.value || a.name.localeCompare(b.name));
}
export function aggregateGeoStatsByContinent(input, metric = "views") {
  return aggregateGeoStats(input, metric, true);
}
export function aggregateGeoStatsByCountry(input, metric = "views", continent = "all") {
  return aggregateGeoStats(input, metric, false, continent);
}
