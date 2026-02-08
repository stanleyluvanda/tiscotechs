// src/lib/moderationApi.js
// Moderation API helper (Report content)
// Ensures JSON body is sent correctly to HTTP API Gateway.

const RAW_BASE =
  (import.meta.env.VITE_MODERATION_API_BASE &&
    String(import.meta.env.VITE_MODERATION_API_BASE).trim()) ||
  ""; // if empty => same-origin "/api/..."

const BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

/** Build a full URL from a path (supports same-origin when BASE is empty). */
function buildUrl(path) {
  const p = String(path || "");
  if (!BASE) return p.startsWith("/") ? p : `/${p}`;
  return `${BASE}${p.startsWith("/") ? p : `/${p}`}`;
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
      data?.raw ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Report content to moderation queue
 * Required: itemType, itemId, postId
 */
export async function reportContent(payload) {
  const it = String(payload?.itemType || "").trim();
  const iid = String(payload?.itemId || "").trim();
  const pid = String(payload?.postId || "").trim();

  if (!it || !iid || !pid) {
    throw new Error("itemType, itemId, postId required");
  }

  const body = {
    ...payload,
    itemType: it,
    itemId: iid,
    postId: pid,
  };

  // Optional: keep this log while testing
  console.log("[moderationApi] reportContent body:", body);

  const res = await fetch(buildUrl("/api/moderation/report"), {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return readJson(res);
}