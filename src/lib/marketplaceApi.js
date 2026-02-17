// src/lib/marketplaceApi.js
// Helper for Marketplace API (StudentMarketplace).
// ✅ Pagination support + backward compatibility + consistent fetch behavior.

const RAW_BASE =
  (import.meta.env.VITE_MARKETPLACE_API_BASE &&
    String(import.meta.env.VITE_MARKETPLACE_API_BASE).trim()) ||
  "http://localhost:5003";

// Strip any trailing slashes so we can safely append paths.
const BASE = RAW_BASE.replace(/\/+$/, "");

/** Build a full marketplace URL from a path. */
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

// One fetch wrapper so headers/credentials stay consistent everywhere.
async function apiFetch(path, { method = "GET", headers, body } = {}) {
  const res = await fetch(buildUrl(path), {
    method,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(headers || {}),
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
  return readJson(res);
}

/* ------------------ NEW: URL origin helper (place near helpers) ------------------ */
function originOnly(u, fallback = "https://scholarsknowledge.com") {
  const s = String(u || "").trim();
  if (!s) return fallback;
  try {
    return new URL(s).origin;
  } catch {
    // If it's not a valid URL, fallback
    return fallback;
  }
}

/**
 * ✅ Backward compatible:
 * Old code expects `fetchMarketplaceItems()` to return an array of items.
 */
export async function fetchMarketplaceItems() {
  const data = await apiFetch("/api/marketplace", { method: "GET" });
  return Array.isArray(data?.items) ? data.items : [];
}

/**
 * ✅ Existing pagination function (keep, so your UI does NOT break).
 * Returns { items, cursor }
 */
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

  const data = await apiFetch(`/api/marketplace?${qs.toString()}`, { method: "GET" });

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    cursor: data?.cursor ?? null,
  };
}

/**
 * ✅ NEW clean helper: Fetch one page (returns { ok, items, cursor }).
 * Use this for your new "Load more" implementation.
 */
export async function fetchMarketplacePage(opts = {}) {
  const {
    limit = 30,
    cursor = null,
    university = "",
    includeComments = false,
  } = opts || {};

  const qs = new URLSearchParams();
  if (limit) qs.set("limit", String(limit));
  if (cursor) qs.set("cursor", String(cursor));
  if (university) qs.set("university", String(university));
  if (includeComments) qs.set("includeComments", "1");

  const data = await apiFetch(`/api/marketplace?${qs.toString()}`, { method: "GET" });

  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    // ✅ Some GET endpoints may not return {ok:true}; treat "items present" as OK.
    ok: typeof data?.ok === "boolean" ? data.ok : items.length > 0,
    items,
    cursor: data?.cursor ?? null,
  };
}

export async function fetchMarketplaceThread(itemId) {
  if (!itemId) throw new Error("Missing itemId");

  const data = await apiFetch(
    `/api/marketplace/thread?itemId=${encodeURIComponent(itemId)}`,
    { method: "GET" }
  );

  return {
    itemId: data?.itemId || itemId,
    comments: Array.isArray(data?.comments) ? data.comments : [],
    updatedAt: data?.updatedAt || null,
  };
}

export async function createMarketplaceItem(payload) {
  const data = await apiFetch("/api/marketplace", {
    method: "POST",
    body: payload || {},
  });
  return data?.item || null;
}

export async function deleteMarketplaceItem(id) {
  if (!id) throw new Error("Missing id");
  const data = await apiFetch(`/api/marketplace/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
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
  if (!itemId) throw new Error("Missing itemId");

  const data = await apiFetch(`/api/marketplace/${encodeURIComponent(itemId)}/comments`, {
    method: "POST",
    body: { text, authorId, authorName, authorProgram, authorPhoto },
  });

  if (!data?.ok) throw new Error(data?.error || "createMarketplaceComment failed");
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
  if (!itemId) throw new Error("Missing itemId");
  if (!commentId) throw new Error("Missing commentId");

  const data = await apiFetch(
    `/api/marketplace/${encodeURIComponent(itemId)}/comments/${encodeURIComponent(
      commentId
    )}/replies`,
    {
      method: "POST",
      body: { text, authorId, authorName, authorProgram, authorPhoto },
    }
  );

  if (!data?.ok) throw new Error(data?.error || "createMarketplaceReply failed");
  return data;
}

export async function getMarketplaceUploadUrl({ fileName, contentType } = {}) {
  return apiFetch("/api/marketplace/upload-url", {
    method: "POST",
    body: { fileName, contentType },
  });
}

/* ------------------ Billing / Entitlement ------------------ */

// ✅ Backward compatible: supports getMarketplaceEntitlement(userId) and getMarketplaceEntitlement({userId})
// ✅ Also accepts {id} or {uid} (alias) to avoid cross-page mismatches.
export async function getMarketplaceEntitlement(arg) {
  const userId =
    typeof arg === "string"
      ? arg
      : String(arg?.userId || arg?.id || arg?.uid || "").trim();

  if (!userId) throw new Error("Missing userId");

  return apiFetch(
    `/api/marketplace/entitlement?userId=${encodeURIComponent(userId)}`,
    { method: "GET" }
  );
}

// ✅ Accepts userId plus optional aliases in case older callers pass id/uid.
// ✅ Accepts userId plus optional aliases in case older callers pass id/uid.
export async function startMarketplaceCheckout({
  userId,
  id,
  uid,
  provider = "stripe",
  email = "",
  name = "",
  plan = "semester", // ✅ NEW: "month" | "semester" (default keeps old behavior)
} = {}) {
  const finalUserId = String(userId || id || uid || "").trim();
  if (!finalUserId) throw new Error("Missing userId");

  // ✅ NEW: force return URLs back to StudentMarketplace route
  // Works on localhost and production automatically.
  const origin = originOnly(
    (typeof window !== "undefined" && window.location && window.location.href) || "",
    "https://scholarsknowledge.com"
  );

  // IMPORTANT: must match your actual route path in React Router
  const successUrl = `${origin}/student-marketplace?paid=1`;
  const cancelUrl = `${origin}/student-marketplace?canceled=1`;

  const body = {
    userId: finalUserId,
    provider,
    email,
    name,

    // ✅ NEW (safe): backend can ignore if not implemented yet
    /*plan: String(plan || "semester").trim(),*/
    plan: (String(plan || "semester").trim().toLowerCase() === "month" ||
       String(plan || "semester").trim().toLowerCase() === "monthly")
  ? "month"
  : "semester",

    successUrl,
    cancelUrl,
    success_url: successUrl,
    cancel_url: cancelUrl,
    redirectUrl: successUrl,
  };

  return apiFetch("/api/marketplace/checkout", {
    method: "POST",
    body,
  }); // { ok:true, url }
}