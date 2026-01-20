// src/lib/marketplaceApi.js
// Helper for Marketplace API (StudentMarketplace).

const RAW_BASE =
  (import.meta.env.VITE_MARKETPLACE_API_BASE &&
    String(import.meta.env.VITE_MARKETPLACE_API_BASE).trim()) ||
  "http://localhost:5003";

// Strip any trailing slashes so we can safely append paths.
const BASE = RAW_BASE.replace(/\/+$/, "");

function buildUrl(path) {
  const rel = String(path || "");
  return `${BASE}${rel.startsWith("/") ? rel : `/${rel}`}`;
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
    const msg = data?.error || data?.message || `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * ✅ Backward-compatible:
 * - Old code: fetchMarketplaceItems() returns array of items.
 * - New pagination: use fetchMarketplaceItemsPage({ limit, cursor, includeComments, university })
 */
export async function fetchMarketplaceItems() {
  const res = await fetch(buildUrl("/api/marketplace"), {
    method: "GET",
    headers: { "content-type": "application/json" },
    credentials: "include",
  });
  const data = await readJson(res);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function fetchMarketplaceItemsPage({
  limit = 30,
  cursor = null,
  includeComments = false,
  university = "",
} = {}) {
  const qs = new URLSearchParams();
  if (limit) qs.set("limit", String(limit));
  if (cursor) qs.set("cursor", String(cursor));
  qs.set("includeComments", includeComments ? "1" : "0");
  if (university) qs.set("university", String(university));

  const res = await fetch(buildUrl(`/api/marketplace?${qs.toString()}`), {
    method: "GET",
    headers: { "content-type": "application/json" },
    credentials: "include",
  });
  const data = await readJson(res);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    cursor: data?.cursor || null,
  };
}

export async function fetchMarketplaceThread(itemId) {
  if (!itemId) throw new Error("Missing itemId");
  const res = await fetch(
    buildUrl(`/api/marketplace/thread?itemId=${encodeURIComponent(itemId)}`),
    {
      method: "GET",
      headers: { "content-type": "application/json" },
      credentials: "include",
    }
  );
  const data = await readJson(res);
  return {
    itemId: data?.itemId || itemId,
    comments: Array.isArray(data?.comments) ? data.comments : [],
    updatedAt: data?.updatedAt || null,
  };
}

export async function createMarketplaceItem(payload) {
  const res = await fetch(buildUrl("/api/marketplace"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
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
    credentials: "include",
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
  const res = await fetch(`${BASE}/api/marketplace/${encodeURIComponent(itemId)}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text, authorId, authorName, authorProgram, authorPhoto }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "createMarketplaceComment failed");
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
      credentials: "include",
      body: JSON.stringify({ text, authorId, authorName, authorProgram, authorPhoto }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "createMarketplaceReply failed");
  return data;
}

export async function getMarketplaceUploadUrl({ fileName, contentType } = {}) {
  const res = await fetch(buildUrl("/api/marketplace/upload-url"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ fileName, contentType }),
  });
  const data = await readJson(res);
  return data;
}

/* ------------------ Billing / Entitlement ------------------ */

export async function getMarketplaceEntitlement(userId) {
  if (!userId) throw new Error("Missing userId");
  const res = await fetch(
    buildUrl(`/api/marketplace/entitlement?userId=${encodeURIComponent(userId)}`),
    {
      method: "GET",
      headers: { "content-type": "application/json" },
      credentials: "include",
    }
  );
  return readJson(res);
}

export async function startMarketplaceCheckout({ userId, provider = "stripe", email = "", name = "" }) {
  if (!userId) throw new Error("Missing userId");
  const res = await fetch(buildUrl("/api/marketplace/checkout/start"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, provider, email, name }),
  });
  return readJson(res); // { ok:true, url }
}