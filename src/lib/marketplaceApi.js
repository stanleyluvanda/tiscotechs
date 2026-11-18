// src/lib/marketplaceApi.js
// ScholarsKnowledge Student Marketplace API
// Existing Marketplace functionality + verified student authentication.

import Session from "supertokens-web-js/recipe/session";

const RAW_BASE =
  (import.meta.env.VITE_MARKETPLACE_API_BASE &&
    String(import.meta.env.VITE_MARKETPLACE_API_BASE).trim()) ||
  "http://localhost:5003";

const BASE = RAW_BASE.replace(/\/+$/, "");

const MARKETPLACE_FEED_BASE =
  "https://d9xoeam8jbfti.cloudfront.net";

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
    const msg =
      data?.error ||
      data?.message ||
      `HTTP ${res.status} ${res.statusText}`;

    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Only public Marketplace reads bypass authentication.
// All other Marketplace API requests require the existing session.
function isPublicMarketplaceRequest(path, method) {
  const pathname = String(path || "").split("?")[0];

  return (
    method === "GET" &&
    (
      pathname === "/api/marketplace" ||
      pathname === "/api/marketplace/thread"
    )
  );
}

// Reuse the session established by ScholarsKnowledge login.
// Do not create or refresh a separate Marketplace session.
async function getMarketplaceAccessToken() {
  try {
    const exists = await Session.doesSessionExist();

    if (!exists) {
      const err = new Error(
        "Your session has expired. Please log in again."
      );
      err.status = 401;
      throw err;
    }

    const token = await Session.getAccessToken();

    if (!token || typeof token !== "string") {
      const err = new Error(
        "Your session has expired. Please log in again."
      );
      err.status = 401;
      throw err;
    }

    return token;
  } catch (err) {
    if (err?.status === 401) throw err;

    const authError = new Error(
      "Unable to verify your login session. Please sign in again."
    );
    authError.status = 401;
    throw authError;
  }
}

// Central Marketplace fetch wrapper.
async function apiFetch(
  path,
  { method = "GET", headers, body } = {}
) {
  const normalizedMethod = String(method).toUpperCase();
  const publicRequest = isPublicMarketplaceRequest(
    path,
    normalizedMethod
  );

  const requestHeaders = {
    "content-type": "application/json",
    ...(headers || {}),
  };

  if (!publicRequest) {
    const token = await getMarketplaceAccessToken();
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    method: normalizedMethod,
    credentials: "include",
    headers: requestHeaders,
    ...(body !== undefined
      ? {
          body:
            typeof body === "string"
              ? body
              : JSON.stringify(body),
        }
      : {}),
  });

  return readJson(res);
}

function originOnly(
  u,
  fallback = "https://scholarsknowledge.com"
) {
  const s = String(u || "").trim();

  if (!s) return fallback;

  try {
    return new URL(s).origin;
  } catch {
    return fallback;
  }
}

/* ---------------- Public Marketplace listings ---------------- */

export async function fetchMarketplaceItems() {
  const data = await apiFetch("/api/marketplace", {
    method: "GET",
  });

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

  if (university) {
    qs.set("university", String(university));
  }

  const data = await apiFetch(
    `/api/marketplace?${qs.toString()}`,
    { method: "GET" }
  );

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    cursor: data?.cursor ?? null,
  };
}

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

  if (includeComments) {
    qs.set("includeComments", "1");
  }

  // Preserve the existing CloudFront cached feed.
  const res = await fetch(
    `${MARKETPLACE_FEED_BASE}/api/marketplace?${qs.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
    }
  );

  const data = await readJson(res);
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    ok:
      typeof data?.ok === "boolean"
        ? data.ok
        : items.length > 0,
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

/* ---------------- Protected listing operations ---------------- */

export async function createMarketplaceItem(payload) {
  const data = await apiFetch("/api/marketplace", {
    method: "POST",
    body: payload || {},
  });

  return data?.item || null;
}

export async function deleteMarketplaceItem(id) {
  if (!id) throw new Error("Missing id");

  const data = await apiFetch(
    `/api/marketplace/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );

  return data || { ok: true, deletedId: id };
}

/* ---------------- Comments ---------------- */

export async function createMarketplaceComment({
  itemId,
  text,
  authorId,
  authorName,
  authorProgram,
  authorPhoto,
}) {
  if (!itemId) throw new Error("Missing itemId");

  const data = await apiFetch(
    `/api/marketplace/${encodeURIComponent(itemId)}/comments`,
    {
      method: "POST",
      body: {
        text,
        authorId,
        authorName,
        authorProgram,
        authorPhoto,
      },
    }
  );

  if (!data?.ok) {
    throw new Error(
      data?.error || "createMarketplaceComment failed"
    );
  }

  return data;
}

/* ---------------- Replies ---------------- */

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
    `/api/marketplace/${encodeURIComponent(itemId)}/comments/${encodeURIComponent(commentId)}/replies`,
    {
      method: "POST",
      body: {
        text,
        authorId,
        authorName,
        authorProgram,
        authorPhoto,
      },
    }
  );

  if (!data?.ok) {
    throw new Error(
      data?.error || "createMarketplaceReply failed"
    );
  }

  return data;
}

/* ---------------- S3 upload URL ---------------- */

export async function getMarketplaceUploadUrl({
  fileName,
  contentType,
} = {}) {
  return apiFetch("/api/marketplace/upload-url", {
    method: "POST",
    body: { fileName, contentType },
  });
}

/* ---------------- Billing / Entitlement ---------------- */

// Preserve the original calling conventions.
// The backend uses the verified session identity instead
// of trusting this query parameter.
export async function getMarketplaceEntitlement(arg) {
  const userId =
    typeof arg === "string"
      ? arg
      : String(
          arg?.userId || arg?.id || arg?.uid || ""
        ).trim();

  if (!userId) throw new Error("Missing userId");

  return apiFetch(
    `/api/marketplace/entitlement?userId=${encodeURIComponent(userId)}`,
    { method: "GET" }
  );
}

/* ---------------- Stripe / Flutterwave checkout ---------------- */

export async function startMarketplaceCheckout({
  userId,
  id,
  uid,
  provider = "stripe",
  email = "",
  name = "",
  plan = "semester",
} = {}) {
  const finalUserId = String(
    userId || id || uid || ""
  ).trim();

  if (!finalUserId) throw new Error("Missing userId");

  const origin = originOnly(
    (
      typeof window !== "undefined" &&
      window.location &&
      window.location.href
    ) || "",
    "https://scholarsknowledge.com"
  );

  const successUrl =
    `${origin}/student-marketplace?paid=1`;

  const cancelUrl =
    `${origin}/student-marketplace?canceled=1`;

  const normalizedPlan =
    ["month", "monthly"].includes(
      String(plan || "semester").trim().toLowerCase()
    )
      ? "month"
      : "semester";

  const body = {
    userId: finalUserId,
    provider,
    email,
    name,
    plan: normalizedPlan,
    successUrl,
    cancelUrl,
    success_url: successUrl,
    cancel_url: cancelUrl,
    redirectUrl: successUrl,
  };

  return apiFetch("/api/marketplace/checkout", {
    method: "POST",
    body,
  });
}