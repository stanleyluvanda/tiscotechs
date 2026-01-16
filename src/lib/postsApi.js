// src/lib/postsApi.js
// Helper for global posts API (student / lecturer dashboards).

// Use a dedicated POSTS API base (set in .env as VITE_POSTS_API_BASE).
// Fallback to localhost for local development.
const RAW_POSTS_BASE =
  (import.meta.env.VITE_POSTS_API_BASE &&
    String(import.meta.env.VITE_POSTS_API_BASE).trim()) ||
  "http://localhost:5003";

// Strip any trailing slashes so we can safely append paths.
const POSTS_BASE = RAW_POSTS_BASE.replace(/\/+$/, "");

/**
 * Build a full posts URL from a path and optional query params.
 * Example:
 *   buildPostsUrl("/api/posts", { scope: "student-dashboard" })
 *   => "https://.../api/posts?scope=student-dashboard"
 */
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

/**
 * Minimal JSON fetch helper just for posts.
 * Throws an Error if response is not OK.
 */
async function doJsonFetch(pathOrUrl, options = {}) {
  // Allow either a full URL or a relative path.
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

  let parsed = null;
  const text = await res.text().catch(() => "");

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
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

/* ========= Normalisation helpers (frontend-only) ========= */

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

// Lightweight "time ago" string so server posts also have .time
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

/* ---- Attachment normalisers (kept for compatibility) ---- */

function normalizeImageAttachment(a) {
  if (!a) return null;
  const id =
    a.id ||
    a.key ||
    a.url ||
    `img_${Math.random().toString(36).slice(2)}`;
  return {
    id,
    name: a.fileName || a.name || "image",
    mime: a.mime || "image/*",
    url: a.url || "",
    thumb: a.thumb || null,
    dataUrl: a.dataUrl || null,
  };
}

function normalizeFileAttachment(a) {
  if (!a) return null;
  const id =
    a.id ||
    a.key ||
    a.url ||
    `file_${Math.random().toString(36).slice(2)}`;
  return {
    id,
    name: a.fileName || a.name || "file",
    mime: a.mime || "application/octet-stream",
    url: a.url || "",
    dataUrl: a.dataUrl || null,
  };
}

/* ---- Comment normaliser (supports BOTH nested & flat parentId) ---- */

/**
 * @param {object} raw
 * @param {string|null} inferredParentId - if provided, forces parentId for this node (used for nested replies[])
 */
function normalizeCommentFromServer(raw = {}, inferredParentId = null) {
  const createdAt = toNumber(
    raw.createdAt || raw.created_at || raw.ts || raw.timestamp,
    Date.now()
  );

  // image normalizer
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

  // file normalizer
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

  // ----- IMAGES -----
  let images = [];
  if (Array.isArray(raw.images) && raw.images.length) {
    images = raw.images.map(mapImage);
  } else if (Array.isArray(raw.attachments)) {
    images = raw.attachments
      .filter(
        (a) =>
          a && (a.type === "image" || String(a.mime || "").startsWith("image/"))
      )
      .map(mapImage);
  }

  // ----- FILES -----
  let files = [];
  if (Array.isArray(raw.files) && raw.files.length) {
    files = raw.files.map(mapFile);
  } else if (Array.isArray(raw.attachments)) {
    files = raw.attachments
      .filter(
        (a) =>
          a && !(a.type === "image" || String(a.mime || "").startsWith("image/"))
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

  // ✅ preserve snapshot fields (so they don't disappear after refresh)
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
    raw.authorCountryCode ||
    raw.countryCode ||
    raw.country_code ||
    "";

  // ✅ KEY: keep parentId if server sends flat comments
  // ✅ EXTRA SAFE: if this comment came from nested replies[], infer parentId
  const parentIdRaw =
    inferredParentId != null ? inferredParentId : raw.parentId;

  const parentId = parentIdRaw == null ? null : String(parentIdRaw);

  const thisId =
    raw.id ||
    raw.commentId ||
    `c_${createdAt}_${Math.random().toString(36).slice(2, 8)}`;

  // Support nested replies too (older shape)
  // ✅ IMPORTANT: infer parentId for nested replies so they never become "orphans"
  const nestedReplies = Array.isArray(raw.replies)
    ? raw.replies.map((r) => normalizeCommentFromServer(r, String(thisId)))
    : [];

  return {
    id: thisId,
    postId: raw.postId || raw.post_id,

    parentId, // ✅ used to rebuild threads (or kept for flat rendering)

    authorId: raw.authorId || raw.userId || raw.studentId || "",
    authorName,
    author: authorName,
    authorPhoto: avatar,
    authorProgram,

    authorTitle: raw.authorTitle || raw.title || "",
    authorRole: raw.authorRole || raw.role || "",

    // ✅ NEW: keep these fields for Global/Uni platforms after refresh
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
 * ✅ Flatten a possibly-nested comment tree into ONE flat list.
 * Keeps parentId already inferred by normalizeCommentFromServer().
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
 * ✅ Rebuild a nested replies[] structure from a flat list using parentId.
 * - top-level comments: parentId == null
 * - replies: parentId == "<commentId>"
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

  // ✅ preserve post snapshot fields too (some UIs read them from post)
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
              a && !(a.type === "image" || String(a.mime || "").startsWith("image/"))
          )
          .map((a) => ({
            id: a.key || a.id || a.url || `file_${Math.random().toString(36).slice(2)}`,
            name: a.fileName || a.name || "file",
            mime: a.mime || "application/octet-stream",
            url: a.url || a.dataUrl || "",
            dataUrl: a.dataUrl || null,
          }))
      : [];

  // Normalize to a FLAT list first (keeping parentId, and inferring for nested replies)
  const normalizedFlatComments = Array.isArray(raw.comments)
    ? raw.comments.map((c) => normalizeCommentFromServer(c))
    : [];

  // Flatten any nested replies into the same flat list (so platforms that render flat parentId can work)
  const flat = flattenCommentTreeToFlat(normalizedFlatComments);

  // ✅ These scopes render a FLAT parentId thread (Global/Uni platforms)
  const wantFlat =
    scopeHint === "uni-academic-platform" ||
    scopeHint === "global-academic-platform";

  // Otherwise, keep existing nested thread shape for other pages
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

    // ✅ keep snapshot meta for display after refresh
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

    audience: raw.audience || "GLOBAL",
    time,
  };
}

/**
 * Fetch posts for a given scope.
 * Always returns an array.
 */
export async function fetchPosts({ scope = "student-dashboard" } = {}) {
  const url = buildPostsUrl("/api/posts", { scope });
  const data = await doJsonFetch(url, { method: "GET" });

  console.log("[postsApi] raw fetchPosts data:", data);

  let list = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object" && Array.isArray(data.posts)) {
    list = data.posts;
  }

  return list.map((p) =>
    p && typeof p === "object" ? normalizePostFromServer(p, scope) : p
  );
}

/**
 * Create a new post.
 */
export async function createPost(payload) {
  const url = buildPostsUrl("/api/posts");

  try {
    const res = await doJsonFetch(url, {
      method: "POST",
      body: payload,
    });

    console.log("[postsApi] createPost response:", res);

    let serverPost = null;

    if (res && typeof res === "object") {
      if (res.post && typeof res.post === "object") {
        serverPost = res.post;
      } else {
        serverPost = res;
      }
    }

    return {
      ...payload,
      ...(serverPost || {}),
    };
  } catch (err) {
    console.error("[postsApi] createPost failed, using local payload only", err);
    return payload;
  }
}


/**
 * 🔹 Create a new comment for a post (persisted in S3).
 * Matches Lambda: POST /api/posts/comment
 */
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

  const trimmedText = String(text || "").trim();
  const trimmedHtml = String(html || "").trim();

  const hasImages = Array.isArray(images) && images.length > 0;
  const hasFiles = Array.isArray(files) && files.length > 0;
  const hasAtts = Array.isArray(attachments) && attachments.length > 0;

  if (
    !postId ||
    ((!trimmedText && !trimmedHtml) && !hasImages && !hasFiles && !hasAtts)
  ) {
    throw new Error(
      "postId and (text/html or images/files/attachments) are required for createComment"
    );
  }

  const url = buildPostsUrl("/api/posts/comment");

  return doJsonFetch(url, {
    method: "POST",
    body: {
      postId,
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

      // ✅ preserve these snapshot fields in S3 (so refresh keeps them)
      authorUniversity: authorUniversity || "",
      authorFaculty: authorFaculty || "",
      authorCountry: authorCountry || "",
      authorCountryCode: authorCountryCode || "",

      images: Array.isArray(images) ? images : [],
      files: Array.isArray(files) ? files : [],
      attachments: Array.isArray(attachments) ? attachments : [],
    },
  });
}

/**
 * 🔹 Create a new reply for a comment (persisted in S3).
 * Matches Lambda: POST /api/posts/reply
 */
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

  const realCommentId = String(commentId || parentId || "").trim();

  const trimmedText = String(text || "").trim();
  const trimmedHtml = String(html || "").trim();

  const hasImages = Array.isArray(images) && images.length > 0;
  const hasFiles = Array.isArray(files) && files.length > 0;
  const hasAtts = Array.isArray(attachments) && attachments.length > 0;

  if (
    !postId ||
    !realCommentId ||
    ((!trimmedText && !trimmedHtml) && !hasImages && !hasFiles && !hasAtts)
  ) {
    throw new Error(
      "postId, commentId and (text/html or images/files/attachments) are required for createReply"
    );
  }

  const url = buildPostsUrl("/api/posts/reply");

  return doJsonFetch(url, {
    method: "POST",
    body: {
      postId,
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

      // ✅ preserve these snapshot fields in S3 (so refresh keeps them)
      authorUniversity: authorUniversity || "",
      authorFaculty: authorFaculty || "",
      authorCountry: authorCountry || "",
      authorCountryCode: authorCountryCode || "",

      images: Array.isArray(images) ? images : [],
      files: Array.isArray(files) ? files : [],
      attachments: Array.isArray(attachments) ? attachments : [],
    },
  });
}

// Back-compat aliases used in your pages
export async function postCommentToServer(payload) {
  return createComment(payload);
}

export async function postReplyToServer(payload) {
  return createReply(payload);
}

/**
 * Delete a post by id.
 */
/*export async function deletePost(id) {
  if (!id) throw new Error("id is required to delete a post");

  const url = buildPostsUrl("/api/posts", { id, postId: id });

  return doJsonFetch(url, {
    method: "DELETE",
    body: { id, postId: id },
  });
}

// Backwards-compatible alias so existing imports keep working.
export async function deletePostOnServer(id) {
  return deletePost(id);
}*/

/**
 * Delete a post by id (supports both signatures):
 *   deletePost({ postId, scope })
 *   deletePost(postId, scope)
 */
export async function deletePost(arg1, arg2) {
  const postId = typeof arg1 === "object" ? arg1?.postId : arg1;
  const scope = typeof arg1 === "object" ? arg1?.scope : arg2;

  if (!postId) throw new Error("postId is required to delete a post");

  // scope is important in your system (student-dashboard / lecturer-dashboard etc.)
  const params = { postId };
  if (scope) params.scope = scope;

  const url = buildPostsUrl("/api/posts", params);

  return doJsonFetch(url, {
    method: "DELETE",
    body: { postId, scope },
  });
}

// Backwards-compatible alias so existing imports keep working.
export async function deletePostOnServer(arg1, arg2) {
  return deletePost(arg1, arg2);
}

/* ================= Marketplace helpers (keep using same API) ================= */

export async function createPostComment({ postId, text, viewer, images = [], files = [] }) {
  if (!postId) return null;

  const trimmed = String(text || "").trim();
  const safeImages = Array.isArray(images) ? images : [];
  const safeFiles = Array.isArray(files) ? files : [];

  if (!trimmed && safeImages.length === 0 && safeFiles.length === 0) return null;

  const payload = {
    postId,
    text: trimmed,
    images: safeImages,
    files: safeFiles,

    authorId: viewer?.id || viewer?.uid || viewer?.userId || "",
    authorName: viewer?.name || "Student",
    authorProgram: viewer?.program || "",
    authorPhoto: viewer?.photoUrl || viewer?.avatarUrl || viewer?.profileImageUrl || "",

    authorRole: viewer?.role || viewer?.authorRole || "",
    authorTitle: viewer?.title || "",

    // ✅ pass through snapshot fields when available
    authorUniversity: viewer?.university || viewer?.authorUniversity || "",
    authorFaculty: viewer?.faculty || viewer?.authorFaculty || "",
    authorCountry: viewer?.country || viewer?.authorCountry || "",
    authorCountryCode: viewer?.countryCode || viewer?.authorCountryCode || "",
  };

  try {
    const url = buildPostsUrl("/api/posts/comment");
    return await doJsonFetch(url, { method: "POST", body: payload });
  } catch (err) {
    console.error("[postsApi] createPostComment failed", err);
    return null;
  }
}

export async function createPostReply({ postId, commentId, text, viewer, images = [], files = [] }) {
  if (!postId || !commentId) return null;

  const trimmed = String(text || "").trim();
  const safeImages = Array.isArray(images) ? images : [];
  const safeFiles = Array.isArray(files) ? files : [];

  if (!trimmed && safeImages.length === 0 && safeFiles.length === 0) return null;

  const payload = {
    postId,
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

    // ✅ pass through snapshot fields when available
    authorUniversity: viewer?.university || viewer?.authorUniversity || "",
    authorFaculty: viewer?.faculty || viewer?.authorFaculty || "",
    authorCountry: viewer?.country || viewer?.authorCountry || "",
    authorCountryCode: viewer?.countryCode || viewer?.authorCountryCode || "",
  };

  try {
    const url = buildPostsUrl("/api/posts/reply");
    return await doJsonFetch(url, { method: "POST", body: payload });
  } catch (err) {
    console.error("[postsApi] createPostReply failed", err);
    return null;
  }
}