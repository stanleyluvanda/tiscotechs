// src/lib/postsApi.js
// Universal helper for global posts API
// Used by:
// - StudentDashboard.jsx
// - LecturerDashboard.jsx
// - UniversityAcademicPlatform.jsx
// - GlobalAcademicPlatform.jsx
//
// ✅ Cursor-ready + universal (non-breaking):
// - keeps existing exports working: fetchPosts, createPost, postCommentToServer, postReplyToServer, deletePost, etc.
// - adds: fetchPostsPage() -> { posts, cursor }
// - adds: fetchThread() -> { comments, cursor } (for optional “load comments on expand” UX)
// - safer JSON parsing + clearer error when API Gateway returns HTML (fixes "Unexpected token '<'")
//
// ✅ FIX (multi-program posts):
// - Canonical threadId for comments/replies/thread fetch so replies never “disappear”
// - Uses: post.multiGroupId || post.threadId || post.id || post.postId (fallback)
//
// ✅ FIX (reply not showing after 201):
// - When server returns replies with commentId (no parentId), treat commentId as parentId during normalization.

const RAW_POSTS_BASE =
  (import.meta.env.VITE_POSTS_API_BASE &&
    String(import.meta.env.VITE_POSTS_API_BASE).trim()) ||
  "http://localhost:5003";

const POSTS_BASE = RAW_POSTS_BASE.replace(/\/+$/, "");

/* ===================== URL / Fetch helpers ===================== */

function buildPostsUrl(path, params) {
  const rel = String(path || "");
  const prefixed = rel.startsWith("/") ? rel : `/${rel}`;
  const url = new URL(POSTS_BASE + prefixed);

  if (params && typeof params === "object") {
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function doJsonFetch(pathOrUrl, options = {}) {
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : buildPostsUrl(pathOrUrl);

  const init = {
    method: options.method || "GET",
    credentials: "include",
    ...options,
  };

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.body && typeof options.body !== "string") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    init.body = JSON.stringify(options.body);
  }

  init.headers = headers;

  const res = await fetch(url, init);
  const text = await res.text().catch(() => "");

  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    // If API Gateway / CloudFront returns your SPA HTML, make it obvious
    if (
      typeof parsed === "string" &&
      parsed.trim().toLowerCase().startsWith("<!doctype")
    ) {
      const err = new Error(
        `HTTP ${res.status} – Received HTML instead of JSON. Check VITE_POSTS_API_BASE and API Gateway route for: ${url}`
      );
      err.status = res.status;
      err.data = parsed;
      throw err;
    }

    const msg =
      (parsed && typeof parsed === "object" && parsed.error) ||
      text ||
      res.statusText;

    const err = new Error(`HTTP ${res.status} – ${msg}`);
    err.status = res.status;
    err.data = parsed;
    throw err;
  }

  return parsed;
}


/* ===================== Notifications API ===================== */

// Optional: small in-memory cache so the bell opens instantly after first load
let _notifCache = { userId: null, notifications: [], cursor: null, fetchedAt: 0 };

export function getCachedNotifications(userId) {
  if (!userId) return { ok: true, notifications: [], cursor: null };
  if (_notifCache.userId !== String(userId)) return { ok: true, notifications: [], cursor: null };
  return { ok: true, notifications: _notifCache.notifications || [], cursor: _notifCache.cursor || null };
}

export function countUnread(notifications = []) {
  return (Array.isArray(notifications) ? notifications : []).reduce(
    (acc, n) => acc + (n && n.read ? 0 : 1),
    0
  );
}

export async function getMyNotifications(userId, { limit = 30, cursor = null } = {}) {
  const uid = String(userId || "").trim();
  if (!uid) return { ok: true, notifications: [], cursor: null };

  const url = buildPostsUrl("/api/notifications/mine", {
    userId: uid,
    limit,
    cursor: cursor || undefined,
  });

  const res = await doJsonFetch(url, { method: "GET" });

  const notifications = Array.isArray(res?.notifications) ? res.notifications : [];
  const nextCursor = res?.cursor ? String(res.cursor) : null;

  // refresh cache
  _notifCache = { userId: uid, notifications, cursor: nextCursor, fetchedAt: Date.now() };

  return { ok: true, notifications, cursor: nextCursor };
}

export async function markNotificationRead({ userId, id, createdAt }) {
  const uid = String(userId || "").trim();
  const nid = String(id || "").trim();
  const ts = Number(createdAt || 0);

  if (!uid || !nid || !Number.isFinite(ts) || ts <= 0) {
    throw new Error("markNotificationRead requires userId, id, createdAt");
  }

  const url = buildPostsUrl("/api/notifications/markRead");

  const res = await doJsonFetch(url, {
    method: "POST",
    body: { userId: uid, id: nid, createdAt: ts },
  });

  // optimistic cache update (keeps UI instant)
  if (_notifCache.userId === uid && Array.isArray(_notifCache.notifications)) {
    _notifCache.notifications = _notifCache.notifications.map((n) =>
      n && String(n.id || "") === nid ? { ...n, read: true, readAt: Date.now() } : n
    );
  }

  return res;
}

// ✅ ADD THIS RIGHT HERE (immediately below markNotificationRead)
export async function clearReadNotifications({ userId }) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("clearReadNotifications requires userId");

  const url = buildPostsUrl("/api/notifications/clearRead");

  const res = await doJsonFetch(url, {
    method: "POST",
    body: { userId: uid },
  });

  return res;
}

/* ===================== Normalisation helpers (frontend-only) ===================== */

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toNumber(v, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatTimeAgoForPost(ts) {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

/**
 * Canonical thread id resolver.
 * Accepts either:
 *  - a post object (preferred): uses multiGroupId when present
 *  - a string id
 */
function getThreadId(input) {
  if (!input) return "";
  if (typeof input === "object") {
    return String(
      input.multiGroupId || input.threadId || input.id || input.postId || ""
    ).trim();
  }
  return String(input).trim();
}

/* ===================== Thread cache ===================== */

const _threadCache = new Map();

/** Clear cached pages for a given thread id (used after comment/reply) */
function clearThreadCacheFor(threadId) {
  if (!threadId) return;
  for (const k of _threadCache.keys()) {
    if (String(k).startsWith(`${threadId}::`)) _threadCache.delete(k);
  }
}

/**
 * Normalize one comment OR reply.
 * @param {object} raw
 * @param {string|null} inferredParentId - used when reply is inside raw.replies[]
 */
function normalizeCommentFromServer(raw = {}, inferredParentId = null) {
  const createdAt = toNumber(
    raw.createdAt || raw.created_at || raw.ts || raw.timestamp,
    Date.now()
  );

  const mapImage = (a = {}) => {
    const id =
      a.id ||
      a.key ||
      a.url ||
      a.dataUrl ||
      `img_${Math.random().toString(36).slice(2)}`;

    return {
      id,
      name: a.fileName || a.name || "image",
      mime: a.mime || "image/*",
      url: a.url || a.thumb || a.dataUrl || "",
      thumb: a.thumb || null,
      dataUrl: a.dataUrl || null,
    };
  };

  const mapFile = (a = {}) => {
    const id =
      a.id ||
      a.key ||
      a.url ||
      a.dataUrl ||
      `file_${Math.random().toString(36).slice(2)}`;

    return {
      id,
      name: a.fileName || a.name || "file",
      mime: a.mime || a.type || "application/octet-stream",
      url: a.url || a.dataUrl || "",
      dataUrl: a.dataUrl || null,
    };
  };

  // Images
  let images = [];
  if (Array.isArray(raw.images) && raw.images.length) {
    images = raw.images.map(mapImage);
  } else if (Array.isArray(raw.attachments)) {
    images = raw.attachments
      .filter(
        (a) =>
          a &&
          (a.type === "image" || String(a.mime || "").startsWith("image/"))
      )
      .map(mapImage);
  }

  // Files
  let files = [];
  if (Array.isArray(raw.files) && raw.files.length) {
    files = raw.files.map(mapFile);
  } else if (Array.isArray(raw.attachments)) {
    files = raw.attachments
      .filter(
        (a) =>
          a &&
          !(a.type === "image" || String(a.mime || "").startsWith("image/"))
      )
      .map(mapFile);
  }

  const authorName =
    raw.authorName || raw.author || raw.studentName || raw.lecturerName || "";

  const avatar =
    raw.authorPhoto ||
    raw.authorAvatarUrl ||
    raw.authorPhotoUrl ||
    raw.avatarUrl ||
    raw.photoUrl ||
    "";

  const authorProgram =
    raw.authorProgram || raw.programHeader || raw.programName || "";

  // ✅ snapshot fields (important for refresh across all platforms)
  const authorUniversity =
    raw.authorUniversity ||
    raw.university ||
    raw.universityName ||
    raw.schoolUniversity ||
    "";

  const authorFaculty =
    raw.authorFaculty ||
    raw.faculty ||
    raw.college ||
    raw.school ||
    raw.department ||
    "";

  const authorCountry = raw.authorCountry || raw.country || raw.countryName || "";

  const authorCountryCode =
    raw.authorCountryCode || raw.countryCode || raw.country_code || "";

  // ✅ parentId:
  // - prefer explicit parentId
  // - if server returns replies with commentId (no parentId), treat commentId as parentId
  // - if nested replies[], we infer it via inferredParentId
  const parentIdRaw =
    inferredParentId != null
      ? inferredParentId
      : raw.parentId != null
      ? raw.parentId
      : raw.commentId != null
      ? raw.commentId
      : null;

  const parentId = parentIdRaw == null ? null : String(parentIdRaw);

  const thisId =
    raw.id ||
    raw.replyId ||
    raw.commentId ||
    `c_${createdAt}_${Math.random().toString(36).slice(2, 8)}`;

  // If nested replies exist, normalize them and infer parentId
  const nestedReplies = Array.isArray(raw.replies)
    ? raw.replies.map((r) => normalizeCommentFromServer(r, String(thisId)))
    : [];

  return {
    id: thisId,
    postId: raw.postId || raw.post_id,
    parentId,

    authorId: raw.authorId || raw.userId || raw.studentId || "",
    authorName,
    author: authorName,
    authorPhoto: avatar,
    authorProgram,

    authorTitle: raw.authorTitle || raw.title || "",
    authorRole: raw.authorRole || raw.role || "",

    authorUniversity,
    authorFaculty,
    authorCountry,
    authorCountryCode,

    text: raw.text || "",
    html: raw.html || "",

    images,
    files,

    replies: nestedReplies,

    createdAt,
    updatedAt: toNumber(raw.updatedAt || raw.updated_at, createdAt),
  };
}

/**
 * Flatten a nested comment tree to a flat list
 * (keeps parentId already inferred).
 */
function flattenCommentTreeToFlat(list = []) {
  const out = [];
  const walk = (c) => {
    if (!c) return;
    const kids = Array.isArray(c.replies) ? c.replies : [];
    out.push({ ...c, replies: [] });
    kids.forEach(walk);
  };
  (Array.isArray(list) ? list : []).forEach(walk);
  return out;
}

/**
 * Rebuild a nested replies[] structure from a flat list using parentId.
 */
function buildThreadFromFlatComments(comments = []) {
  const list = Array.isArray(comments) ? comments : [];
  if (list.length === 0) return [];

  const hasAnyParentId = list.some((c) => c && c.parentId != null);
  if (!hasAnyParentId) return list;

  const byId = new Map();
  for (const c of list) {
    if (!c || !c.id) continue;
    byId.set(String(c.id), {
      ...c,
      replies: Array.isArray(c.replies) ? c.replies.slice() : [],
    });
  }

  const roots = [];
  for (const c of byId.values()) {
    const pid = c.parentId == null ? null : String(c.parentId);
    if (!pid) {
      roots.push(c);
      continue;
    }
    const parent = byId.get(pid);
    if (parent) {
      parent.replies = Array.isArray(parent.replies) ? parent.replies : [];
      parent.replies.push(c);
    } else {
      // parent missing => keep it visible
      roots.push(c);
    }
  }

  const sortByCreated = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);

  const deepSort = (node) => {
    if (Array.isArray(node.replies) && node.replies.length) {
      node.replies.sort(sortByCreated);
      node.replies.forEach(deepSort);
    }
  };

  roots.sort(sortByCreated);
  roots.forEach(deepSort);

  return roots;
}

/**
 * Normalize one post from server into the shape your UIs expect.
 */
function normalizePostFromServer(raw = {}, scopeHint = "") {
  const createdAt = toNumber(
    raw.createdAt || raw.created_at || raw.ts || raw.timestamp,
    Date.now()
  );

  const authorName =
    raw.authorName || raw.author || raw.studentName || raw.lecturerName || "";

  const avatar =
    raw.authorPhoto ||
    raw.authorAvatarUrl ||
    raw.authorPhotoUrl ||
    raw.avatarUrl ||
    raw.photoUrl ||
    "";

  const authorProgram =
    raw.authorProgram || raw.programHeader || raw.programName || "";

  // snapshot fields (important for Uni/Global pages too)
  const authorUniversity =
    raw.authorUniversity || raw.university || raw.universityName || "";

  const authorFaculty =
    raw.authorFaculty ||
    raw.faculty ||
    raw.college ||
    raw.school ||
    raw.department ||
    "";

  const authorCountry = raw.authorCountry || raw.country || raw.countryName || "";

  const authorCountryCode =
    raw.authorCountryCode || raw.countryCode || raw.country_code || "";

  const text =
    (typeof raw.text === "string" && raw.text) ||
    (typeof raw.body === "string" && raw.body) ||
    (typeof raw.content === "string" && raw.content) ||
    "";

  const html = raw.html || (text ? `<p>${escapeHtml(text)}</p>` : "");

  const images =
    Array.isArray(raw.images) && raw.images.length
      ? raw.images
      : Array.isArray(raw.attachments)
      ? raw.attachments
          .filter(
            (a) =>
              a && (a.type === "image" || String(a.mime || "").startsWith("image/"))
          )
          .map((a) => ({
            id: a.key || a.id || a.url || `img_${Math.random().toString(36).slice(2)}`,
            name: a.fileName || a.name || "image",
            mime: a.mime || "image/*",
            url: a.url || a.thumb || a.dataUrl || "",
            thumb: a.thumb || null,
            dataUrl: a.dataUrl || null,
          }))
      : [];

  const files =
    Array.isArray(raw.files) && raw.files.length
      ? raw.files
      : Array.isArray(raw.attachments)
      ? raw.attachments
          .filter(
            (a) =>
              a &&
              !(a.type === "image" || String(a.mime || "").startsWith("image/"))
          )
          .map((a) => ({
            id: a.key || a.id || a.url || `file_${Math.random().toString(36).slice(2)}`,
            name: a.fileName || a.name || "file",
            mime: a.mime || "application/octet-stream",
            url: a.url || a.dataUrl || "",
            dataUrl: a.dataUrl || null,
          }))
      : [];

  // Normalize to flat first, then choose “flat vs nested” per platform
  const normalizedFlatComments = Array.isArray(raw.comments)
    ? raw.comments.map((c) => normalizeCommentFromServer(c))
    : [];

  const flat = flattenCommentTreeToFlat(normalizedFlatComments);

  // Uni + Global platforms render flat parentId threads in your app
  const wantFlat =
    scopeHint === "uni-academic-platform" ||
    scopeHint === "global-academic-platform";

  const comments = wantFlat ? flat : buildThreadFromFlatComments(flat);

  const title =
    raw.title ||
    raw.textTitle ||
    raw.subject ||
    (text.trim() ? text.trim().slice(0, 80) : "");

  const time = raw.time || formatTimeAgoForPost(createdAt);

  return {
    ...raw,

    id: raw.id || raw.postId || `p_${createdAt}`,
    createdAt,
    updatedAt: toNumber(raw.updatedAt || raw.updated_at, createdAt),

    authorType: raw.authorType || raw.role || "student",
    author: authorName,
    authorName,
    authorPhoto: avatar,
    authorAvatarUrl: avatar,
    authorProgram,

    authorUniversity,
    authorFaculty,
    authorCountry,
    authorCountryCode,

    title,
    text,
    html,

    images,
    files,
    comments,
    commentCount: toNumber(raw.commentCount, comments.length),
replyCount: toNumber(raw.replyCount, 0),
threadItemCount: toNumber(raw.threadItemCount, comments.length),

    audience: raw.audience || "GLOBAL",
    time,
  };
}

/* ===================== Feed fetchers ===================== */

/**
 * ✅ Cursor-ready feed fetch (NEW, non-breaking)
 * Returns: { posts, cursor }
 */
export async function fetchPostsPage({
  scope = "student-dashboard",
  limit = 30,
  cursor = null,
  withThread = true,
  view = null,
} = {}) {
  const url = buildPostsUrl("/api/posts", {
    scope,
    limit,
    cursor: cursor || undefined,
    withThread: withThread ? 1 : 0,
    view: view || undefined,
  });

  const data = await doJsonFetch(url, { method: "GET" });

  let list = [];
  let nextCursor = null;

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object") {
    if (Array.isArray(data.posts)) list = data.posts;
    if (data.cursor) nextCursor = String(data.cursor);
  }

  const posts = list.map((p) =>
    p && typeof p === "object" ? normalizePostFromServer(p, scope) : p
  );

  return { posts, cursor: nextCursor };
}

/**
 * ✅ Backward compatible
 * Existing pages call: fetchPosts({ scope })
 */
/*export async function fetchPosts({ scope = "student-dashboard" } = {}) {
  const { posts } = await fetchPostsPage({
    scope,
    limit: 30,
    withThread: true,
  });
  return posts;
}*/
export async function fetchPosts({
  scope = "student-dashboard",
  limit = 10,
  cursor = null,
  withThread = true,
  view = null,
} = {}) {
  const { posts } = await fetchPostsPage({
    scope,
    limit,
    cursor,
    withThread,
    view,
  });

  return posts;
}

/* ===================== Thread fetcher (optional) ===================== */

/**
 * ✅ Fetch comments+replies for ONE post (from /api/posts/thread)
 * Returns: { comments, cursor }
 */
export async function fetchThread({ postId, limit = 500, cursor = null } = {}) {
  const threadId = getThreadId(postId);
  if (!threadId) throw new Error("postId is required for fetchThread");

  const cacheKey = `${threadId}::${cursor || ""}::${limit}`;
  if (_threadCache.has(cacheKey)) return _threadCache.get(cacheKey);

  const url = buildPostsUrl("/api/posts/thread", {
    postId: threadId,
    limit,
    cursor: cursor || undefined,
  });

  const p = doJsonFetch(url, { method: "GET" }).then((res) => {
    const commentsRaw = res && res.comments ? res.comments : [];
    const comments = Array.isArray(commentsRaw)
      ? commentsRaw.map((c) => normalizeCommentFromServer(c))
      : [];
    return { comments, cursor: res && res.cursor ? String(res.cursor) : null };
  });

  _threadCache.set(cacheKey, p);
  return p;
}

/* ===================== Mutations ===================== */

export async function createPost(payload) {
  const url = buildPostsUrl("/api/posts");

  try {
    const res = await doJsonFetch(url, {
      method: "POST",
      body: payload,
    });

    let serverPost = null;
    if (res && typeof res === "object") {
      if (res.post && typeof res.post === "object") serverPost = res.post;
      else serverPost = res;
    }

    return { ...payload, ...(serverPost || {}) };
  } catch (err) {
    console.error("[postsApi] createPost failed, using local payload only", err);
    return payload;
  }
}

export async function createComment(payload = {}) {
  const {
    postId,
    text,
    html,
    authorId,
    authorName,
    authorProgram,
    authorPhoto,
    authorRole,
    authorTitle,
    authorUniversity,
    authorFaculty,
    authorCountry,
    authorCountryCode,
    images = [],
    files = [],
    attachments = [],
  } = payload || {};

  const threadId = getThreadId(postId);

  const trimmedText = String(text || "").trim();
  const trimmedHtml = String(html || "").trim();

  const hasImages = Array.isArray(images) && images.length > 0;
  const hasFiles = Array.isArray(files) && files.length > 0;
  const hasAtts = Array.isArray(attachments) && attachments.length > 0;

  if (
    !threadId ||
    ((!trimmedText && !trimmedHtml) && !hasImages && !hasFiles && !hasAtts)
  ) {
    throw new Error(
      "postId and (text/html or images/files/attachments) are required for createComment"
    );
  }

  const url = buildPostsUrl("/api/posts/comment");

  const res = await doJsonFetch(url, {
    method: "POST",
    body: {
      postId: threadId,
      text: trimmedText,
      html: trimmedHtml,

      authorId: authorId || "",
      authorName: authorName || "",
      authorProgram: authorProgram || "",
      authorPhoto: authorPhoto || "",

      authorRole: authorRole || "",
      role: authorRole || "",
      authorTitle: authorTitle || "",
      title: authorTitle || "",

      // ✅ snapshot fields (important for refresh)
      authorUniversity: authorUniversity || "",
      authorFaculty: authorFaculty || "",
      authorCountry: authorCountry || "",
      authorCountryCode: authorCountryCode || "",

      images: Array.isArray(images) ? images : [],
      files: Array.isArray(files) ? files : [],
      attachments: Array.isArray(attachments) ? attachments : [],
    },
  });

  clearThreadCacheFor(threadId);
  return res;
}

export async function createReply(payload = {}) {
  const {
    postId,
    commentId,
    parentId,
    text,
    html,
    authorId,
    authorName,
    authorProgram,
    authorPhoto,
    authorRole,
    authorTitle,
    authorUniversity,
    authorFaculty,
    authorCountry,
    authorCountryCode,
    images = [],
    files = [],
    attachments = [],
  } = payload || {};

  const threadId = getThreadId(postId);
  const realCommentId = String(commentId || parentId || "").trim();

  const trimmedText = String(text || "").trim();
  const trimmedHtml = String(html || "").trim();

  const hasImages = Array.isArray(images) && images.length > 0;
  const hasFiles = Array.isArray(files) && files.length > 0;
  const hasAtts = Array.isArray(attachments) && attachments.length > 0;

  if (
    !threadId ||
    !realCommentId ||
    ((!trimmedText && !trimmedHtml) && !hasImages && !hasFiles && !hasAtts)
  ) {
    throw new Error(
      "postId, commentId and (text/html or images/files/attachments) are required for createReply"
    );
  }

  const url = buildPostsUrl("/api/posts/reply");

  const res = await doJsonFetch(url, {
    method: "POST",
    body: {
      postId: threadId,
      commentId: realCommentId,
      text: trimmedText,
      html: trimmedHtml,

      authorId: authorId || "",
      authorName: authorName || "",
      authorProgram: authorProgram || "",
      authorPhoto: authorPhoto || "",

      authorRole: authorRole || "",
      role: authorRole || "",
      authorTitle: authorTitle || "",
      title: authorTitle || "",

      // ✅ snapshot fields (important for refresh)
      authorUniversity: authorUniversity || "",
      authorFaculty: authorFaculty || "",
      authorCountry: authorCountry || "",
      authorCountryCode: authorCountryCode || "",

      images: Array.isArray(images) ? images : [],
      files: Array.isArray(files) ? files : [],
      attachments: Array.isArray(attachments) ? attachments : [],
    },
  });

  clearThreadCacheFor(threadId);
  return res;
}

/* ---- Back-compat aliases used in your pages ---- */

export async function postCommentToServer(payload) {
  return createComment(payload);
}

export async function postReplyToServer(payload) {
  return createReply(payload);
}

/* ===================== Delete ===================== */

/**
 * Delete a post by id (supports both signatures):
 *   deletePost({ postId, scope })
 *   deletePost(postId, scope)
 */
export async function deletePost(arg1, arg2) {
  const postId = typeof arg1 === "object" ? arg1?.postId : arg1;
  const scope = typeof arg1 === "object" ? arg1?.scope : arg2;

  if (!postId) throw new Error("postId is required to delete a post");

  const params = { postId };
  if (scope) params.scope = scope;

  const url = buildPostsUrl("/api/posts", params);

  return doJsonFetch(url, {
    method: "DELETE",
    body: { postId, scope },
  });
}

export async function deletePostOnServer(arg1, arg2) {
  return deletePost(arg1, arg2);
}


/* ===================== Saved posts ===================== */

export async function savePost({ userId, postId, scope = "student-dashboard" }) {
  const uid = String(userId || "").trim();
  const pid = String(postId || "").trim();

  if (!uid || !pid) {
    throw new Error("savePost requires userId and postId");
  }

  /*return doJsonFetch("/api/posts/save", {*/
  return doJsonFetch("/posts/save", {
    method: "POST",
    body: {
      userId: uid,
      postId: pid,
      scope,
    },
  });
}

export async function unsavePost({ userId, postId, scope = "student-dashboard" }) {
  const uid = String(userId || "").trim();
  const pid = String(postId || "").trim();

  if (!uid || !pid) {
    throw new Error("unsavePost requires userId and postId");
  }

  /*return doJsonFetch("/api/posts/save", {*/
  return doJsonFetch("/posts/save", {
    method: "DELETE",
    body: {
      userId: uid,
      postId: pid,
      scope,
    },
  });
}

export async function fetchSavedPosts({ userId, scope = "student-dashboard" }) {
  const uid = String(userId || "").trim();

  if (!uid) {
    return { ok: true, saved: [], savedPostIds: [] };
  }

  return doJsonFetch(
    /*buildPostsUrl("/api/posts/saved", {*/
    buildPostsUrl("/posts/saved", {
      userId: uid,
      scope,
    }),
    { method: "GET" }
  );
}


/* ===================== Marketplace helpers (keep using same API) ===================== */

export async function createPostComment({
  postId,
  text,
  viewer,
  images = [],
  files = [],
}) {
  const threadId = getThreadId(postId);
  if (!threadId) return null;

  const trimmed = String(text || "").trim();
  const safeImages = Array.isArray(images) ? images : [];
  const safeFiles = Array.isArray(files) ? files : [];

  if (!trimmed && safeImages.length === 0 && safeFiles.length === 0) return null;

  const payload = {
    postId: threadId,
    text: trimmed,
    images: safeImages,
    files: safeFiles,

    authorId: viewer?.id || viewer?.uid || viewer?.userId || "",
    authorName: viewer?.name || "Student",
    authorProgram: viewer?.program || "",
    authorPhoto: viewer?.photoUrl || viewer?.avatarUrl || viewer?.profileImageUrl || "",

    authorRole: viewer?.role || viewer?.authorRole || "",
    authorTitle: viewer?.title || "",

    authorUniversity: viewer?.university || viewer?.authorUniversity || "",
    authorFaculty: viewer?.faculty || viewer?.authorFaculty || "",
    authorCountry: viewer?.country || viewer?.authorCountry || "",
    authorCountryCode: viewer?.countryCode || viewer?.authorCountryCode || "",
  };

  try {
    const url = buildPostsUrl("/api/posts/comment");
    const res = await doJsonFetch(url, { method: "POST", body: payload });
    clearThreadCacheFor(threadId);
    return res;
  } catch (err) {
    console.error("[postsApi] createPostComment failed", err);
    return null;
  }
}

export async function createPostReply({
  postId,
  commentId,
  text,
  viewer,
  images = [],
  files = [],
}) {
  const threadId = getThreadId(postId);
  if (!threadId || !commentId) return null;

  const trimmed = String(text || "").trim();
  const safeImages = Array.isArray(images) ? images : [];
  const safeFiles = Array.isArray(files) ? files : [];

  if (!trimmed && safeImages.length === 0 && safeFiles.length === 0) return null;

  const payload = {
    postId: threadId,
    commentId,
    text: trimmed,
    images: safeImages,
    files: safeFiles,

    authorId: viewer?.id || viewer?.uid || viewer?.userId || "",
    authorName: viewer?.name || "Student",
    authorProgram: viewer?.program || "",
    authorPhoto: viewer?.photoUrl || viewer?.avatarUrl || viewer?.profileImageUrl || "",

    authorRole: viewer?.role || viewer?.authorRole || "",
    authorTitle: viewer?.title || "",

    authorUniversity: viewer?.university || viewer?.authorUniversity || "",
    authorFaculty: viewer?.faculty || viewer?.authorFaculty || "",
    authorCountry: viewer?.country || viewer?.authorCountry || "",
    authorCountryCode: viewer?.countryCode || viewer?.authorCountryCode || "",
  };

  try {
    const url = buildPostsUrl("/api/posts/reply");
    const res = await doJsonFetch(url, { method: "POST", body: payload });
    clearThreadCacheFor(threadId);
    return res;
  } catch (err) {
    console.error("[postsApi] createPostReply failed", err);
    return null;
  }
}