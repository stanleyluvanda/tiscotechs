// src/lib/marketplaceApi.js
// Helper for Marketplace API (StudentMarketplace).

// Use a dedicated Marketplace API base (set in .env as VITE_MARKETPLACE_API_BASE).
// Fallback to localhost for local development.
const RAW_BASE =
  (import.meta.env.VITE_MARKETPLACE_API_BASE &&
    String(import.meta.env.VITE_MARKETPLACE_API_BASE).trim()) ||
  "http://localhost:5003"; // only if you proxy locally; otherwise set env

// Strip any trailing slashes so we can safely append paths.
const BASE = RAW_BASE.replace(/\/+$/, "");

/**
 * Build a full marketplace URL from a path.
 * Example:
 *   buildUrl("/api/marketplace")
 *   => "https://.../api/marketplace"
 */
function buildUrl(path) {
  const rel = String(path || "");
  return `${BASE}${rel.startsWith("/") ? rel : `/${rel}`}`;
}

function withQuery(path, params) {
  const p = String(path || "");
  const sp = new URLSearchParams();
  const obj = params && typeof params === "object" ? params : {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${p}${p.includes("?") ? "&" : "?"}${qs}` : p;
}

async function readJson(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      data?.error || data?.message || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * ✅ Backwards-compatible:
 * - Old callers: fetchMarketplaceItems() => returns items[]
 * - New callers: fetchMarketplaceItems({ limit, cursor, university, includeComments })
 *   => returns { items, cursor }
 */
export async function fetchMarketplaceItems(opts) {
  const hasOpts = !!(opts && typeof opts === "object" && Object.keys(opts).length);

  const {
    limit, // number
    cursor, // string (base64url) from backend
    university, // optional filter
    includeComments, // 0/1 or boolean
  } = hasOpts ? opts : {};

  const path = withQuery("/api/marketplace", {
    ...(limit != null ? { limit } : {}),
    ...(cursor ? { cursor } : {}),
    ...(university ? { university } : {}),
    ...(includeComments != null
      ? { includeComments: includeComments ? 1 : 0 }
      : {}),
  });

  const res = await fetch(buildUrl(path), {
    method: "GET",
    headers: { "content-type": "application/json" },
    // NOTE: kept consistent with your existing calls (no credentials)
  });

  const data = await readJson(res);

  // If new pagination style is used, return {items, cursor}
  if (hasOpts) {
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      cursor: data?.cursor ?? null,
      ok: data?.ok ?? true,
    };
  }

  // Otherwise preserve old return type (items[])
  return Array.isArray(data?.items) ? data.items : [];
}

export async function createMarketplaceItem(payload) {
  const res = await fetch(buildUrl("/api/marketplace"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await readJson(res);
  return data?.item || null;
}

export async function deleteMarketplaceItem(id) {
  if (!id) throw new Error("Missing id");
  const res = await fetch(buildUrl(`/api/marketplace/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });
  const data = await readJson(res);
  return data || { ok: true, deletedId: id };
}

export async function createMarketplaceComment({
  itemId,
  text,
  authorId,
  authorName,
  authorProgram,
  authorPhoto,
}) {
  const res = await fetch(
    `${BASE}/api/marketplace/${encodeURIComponent(itemId)}/comments`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, authorId, authorName, authorProgram, authorPhoto }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok)
    throw new Error(data?.error || "createMarketplaceComment failed");
  return data;
}

export async function createMarketplaceReply({
  itemId,
  commentId,
  text,
  authorId,
  authorName,
  authorProgram,
  authorPhoto,
}) {
  const res = await fetch(
    `${BASE}/api/marketplace/${encodeURIComponent(itemId)}/comments/${encodeURIComponent(
      commentId
    )}/replies`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, authorId, authorName, authorProgram, authorPhoto }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok)
    throw new Error(data?.error || "createMarketplaceReply failed");
  return data;
}

/**
 * Optional helper (safe add): fetch thread for a single item
 * (matches your new backend route GET /api/marketplace/thread?itemId=...)
 */
export async function fetchMarketplaceThread({ itemId } = {}) {
  if (!itemId) throw new Error("Missing itemId");
  const res = await fetch(
    buildUrl(
      withQuery("/api/marketplace/thread", { itemId: encodeURIComponent(itemId) })
    ),
    {
      method: "GET",
      headers: { "content-type": "application/json" },
      // If you want cookies, add: credentials: "include"
    }
  );
  const data = await readJson(res);
  return {
    itemId: data?.itemId || itemId,
    comments: Array.isArray(data?.comments) ? data.comments : [],
    updatedAt: data?.updatedAt ?? null,
  };
}

export async function getMarketplaceUploadUrl({ fileName, contentType } = {}) {
  const res = await fetch(buildUrl("/api/marketplace/upload-url"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName, contentType }),
  });
  const data = await readJson(res);
  // expected: { ok:true, uploadUrl, key, url }
  return data;
}