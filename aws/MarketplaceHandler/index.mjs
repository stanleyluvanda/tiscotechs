// aws/MarketplaceHandler/index.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.MARKETPLACE_TABLE || "sk_marketplace";

// Uploads (for presigned PUT)
const UPLOADS_BUCKET = process.env.MARKETPLACE_UPLOADS_BUCKET || "";
const UPLOADS_PREFIX = (process.env.MARKETPLACE_UPLOADS_PREFIX || "marketplace/attachments/")
  .replace(/^\/+/, "");

// CloudFront domain (response-only rewriting)
const CLOUDFRONT_DOMAIN = (process.env.CLOUDFRONT_DOMAIN || "").trim();

const ddb = new DynamoDBClient({ region: REGION });
const doc = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: { removeUndefinedValues: true },
});

const s3 = new S3Client({ region: REGION });

/* ------------------ helpers ------------------ */

function corsHeaders(origin) {
  const allow = new Set([
    "https://scholarsknowledge.com",
    "https://www.scholarsknowledge.com",
    "http://localhost:5176",
  ]);
  const o = allow.has(origin) ? origin : "https://scholarsknowledge.com";

  return {
    "access-control-allow-origin": o,
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
  };
}

function json(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
    body: JSON.stringify(body ?? {}),
  };
}

function badRequest(msg, origin) {
  return json(400, { ok: false, error: msg }, origin);
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

const nowIso = () => new Date().toISOString();

function makeId(prefix = "mkt") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const PK = "MARKETPLACE#ITEM";

// Split "Main • Sub" safely (works with "•" and also with plain "-"/"|")
function splitCategory(cat) {
  const raw = String(cat || "").trim();
  if (!raw) return { mainCategory: "", subCategory: "" };

  if (raw.includes("•")) {
    const parts = raw
      .split("•")
      .map((s) => s.trim())
      .filter(Boolean);
    return { mainCategory: parts[0] || "", subCategory: parts[1] || "" };
  }

  for (const sep of ["|", "-", "/", ">"]) {
    if (raw.includes(sep)) {
      const parts = raw
        .split(sep)
        .map((s) => s.trim())
        .filter(Boolean);
      return { mainCategory: parts[0] || "", subCategory: parts[1] || "" };
    }
  }

  return { mainCategory: raw, subCategory: "" };
}

function publicUrlForKey(key) {
  if (CLOUDFRONT_DOMAIN) return `https://${CLOUDFRONT_DOMAIN}/${key}`;
  return UPLOADS_BUCKET ? `https://${UPLOADS_BUCKET}.s3.${REGION}.amazonaws.com/${key}` : "";
}

// Safer rewrite (no regex footguns). Only rewrites real http(s) URLs.
function toCloudFrontUrl(u) {
  const s = String(u || "").trim();
  if (!s) return s;
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (!CLOUDFRONT_DOMAIN) return s;

  // already CloudFront
  if (s.includes(CLOUDFRONT_DOMAIN)) return s;

  // only rewrite real URLs
  if (!/^https?:\/\//i.test(s)) return s;

  try {
    const url = new URL(s);
    const host = url.hostname.toLowerCase();

    // Path-style: https://s3.<region>.amazonaws.com/<bucket>/<key>
    //            https://s3.amazonaws.com/<bucket>/<key>
    const isPathStyle = host === "s3.amazonaws.com" || host.startsWith("s3.");
    if (isPathStyle) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const key = parts.slice(1).join("/");
        return `https://${CLOUDFRONT_DOMAIN}/${key}`;
      }
      return s;
    }

    // Virtual-hosted-style: https://<bucket>.s3.<region>.amazonaws.com/<key>
    //                       https://<bucket>.s3.amazonaws.com/<key>
    const isVirtualStyle = host.includes(".s3.");
    if (isVirtualStyle || host.endsWith(".s3.amazonaws.com")) {
      const key = url.pathname.replace(/^\/+/, "");
      return key ? `https://${CLOUDFRONT_DOMAIN}/${key}` : s;
    }

    return s;
  } catch {
    return s;
  }
}

function rewriteImagesToCloudFront(images) {
  const arr = Array.isArray(images) ? images : [];
  if (!arr.length) return arr;

  return arr.map((img) => {
    if (!img || typeof img !== "object") return img;
    const next = { ...img };
    if (next.url) next.url = toCloudFrontUrl(next.url);
    if (next.dataUrl) next.dataUrl = toCloudFrontUrl(next.dataUrl);
    if (next.thumb) next.thumb = toCloudFrontUrl(next.thumb);
    return next;
  });
}

/* ------------------ handler ------------------ */

export const handler = async (event) => {
  const origin =
    event?.headers?.origin ||
    event?.headers?.Origin ||
    "https://scholarsknowledge.com";

  const method = (
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    "GET"
  ).toUpperCase();

  const path = String(event?.rawPath || event?.path || "/");

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  try {
    const id = event?.pathParameters?.id ? String(event.pathParameters.id) : null;

    const commentId = event?.pathParameters?.commentId
      ? String(event.pathParameters.commentId)
      : null;

    /* ---------- POST /api/marketplace/upload-url ---------- */
    if (method === "POST" && path === "/api/marketplace/upload-url") {
      if (!UPLOADS_BUCKET) return badRequest("MARKETPLACE_UPLOADS_BUCKET is missing", origin);

      const parsed = safeJsonParse(event.body);
      const fileName = String(parsed?.fileName || "image.jpg");
      const contentType = String(parsed?.contentType || "image/jpeg");

      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `${UPLOADS_PREFIX}${Date.now()}_${Math.random()
        .toString(16)
        .slice(2)}_${safeName}`;

      const cmd = new PutObjectCommand({
        Bucket: UPLOADS_BUCKET,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

      return json(200, { ok: true, key, uploadUrl, url: publicUrlForKey(key) }, origin);
    }

    /* ---------- GET /api/marketplace ---------- */
    if (method === "GET" && path === "/api/marketplace") {
      const out = await doc.send(
        new ScanCommand({
          TableName: TABLE,
          FilterExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": PK },
          Limit: 200,
        })
      );

      const items = (out.Items || [])
        .map((x) => {
          const item = x || {};

          const mainCategory =
            String(item.mainCategory || "").trim() ||
            splitCategory(item.category).mainCategory ||
            "General";

          const subCategory =
            String(item.subCategory || "").trim() ||
            splitCategory(item.category).subCategory ||
            "";

          const category =
            String(item.category || "").trim() ||
            (subCategory ? `${mainCategory} • ${subCategory}` : mainCategory);

          return {
            ...item,
            mainCategory,
            subCategory,
            category,
            comments: Array.isArray(item.comments) ? item.comments : [],
            images: rewriteImagesToCloudFront(item.images),
          };
        })
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        );

      return json(200, { ok: true, items }, origin);
    }

    /* ---------- POST /api/marketplace ---------- */
    if (method === "POST" && path === "/api/marketplace") {
      const parsed = safeJsonParse(event.body);

      if (!parsed.title || !String(parsed.title).trim()) {
        return badRequest("title is required", origin);
      }

      const newId = makeId("item");
      const createdAt = nowIso();

      const mainCategory =
        String(parsed.mainCategory || "").trim() ||
        splitCategory(parsed.category).mainCategory ||
        "General";

      const subCategory =
        String(parsed.subCategory || "").trim() ||
        splitCategory(parsed.category).subCategory ||
        "";

      const category =
        String(parsed.category || "").trim() ||
        (subCategory ? `${mainCategory} • ${subCategory}` : mainCategory);

      const item = {
        pk: PK,
        sk: newId,
        id: newId,

        title: String(parsed.title).trim(),
        description: parsed.description ? String(parsed.description) : "",

        price: parsed.price ?? null,
        currency: parsed.currency ? String(parsed.currency) : "USD",

        mainCategory,
        subCategory,
        category,

        condition: parsed.condition ? String(parsed.condition) : "Used",
        images: Array.isArray(parsed.images) ? parsed.images.slice(0, 8) : [],

        sellerId: parsed.sellerId ? String(parsed.sellerId) : null,
        sellerName: parsed.sellerName ? String(parsed.sellerName) : null,

        sellerProgram: parsed.sellerProgram ? String(parsed.sellerProgram) : "",
        sellerPhotoUrl: parsed.sellerPhotoUrl ? String(parsed.sellerPhotoUrl) : "",

        sellerMobile: parsed.sellerMobile ? String(parsed.sellerMobile) : "",
        sellerWhatsapp: parsed.sellerWhatsapp ? String(parsed.sellerWhatsapp) : "",
        // ✅ NEW: availability/pickup location (e.g. "Mabibo Hostel")
        sellerLocation: parsed.sellerLocation ? String(parsed.sellerLocation) : "",
        location: parsed.location ? String(parsed.location) : null,

        status: "active",
        comments: [],

        createdAt,
        updatedAt: createdAt,
      };

      await doc.send(
        new PutCommand({
          TableName: TABLE,
          Item: item,
          ConditionExpression:
            "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        })
      );

      return json(201, { ok: true, item }, origin);
    }

    /* ---------- POST /api/marketplace/{id}/comments ---------- */
    if (method === "POST" && path.endsWith("/comments") && id) {
      const parsed = safeJsonParse(event.body);
      if (!parsed?.text || !String(parsed.text).trim()) {
        return badRequest("text is required", origin);
      }

      const existing = await doc.send(
        new GetCommand({
          TableName: TABLE,
          Key: { pk: PK, sk: id },
        })
      );

      if (!existing.Item) {
        return json(404, { ok: false, error: "Not found" }, origin);
      }

      const comment = {
        id: makeId("c"),
        text: String(parsed.text).trim(),
        authorId: parsed.authorId ?? "",
        authorName: parsed.authorName ?? "",
        authorProgram: parsed.authorProgram ?? "",
        authorPhoto: parsed.authorPhoto ?? "",
        createdAt: nowIso(),
        replies: [],
      };

      await doc.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: PK, sk: id },
          UpdateExpression:
            "SET comments = list_append(if_not_exists(comments, :e), :c), updatedAt = :u",
          ExpressionAttributeValues: {
            ":c": [comment],
            ":e": [],
            ":u": nowIso(),
          },
        })
      );

      return json(201, { ok: true, comment }, origin);
    }

    /* ---------- POST /api/marketplace/{id}/comments/{commentId}/replies ---------- */
    if (
      method === "POST" &&
      id &&
      commentId &&
      path.endsWith(`/api/marketplace/${id}/comments/${commentId}/replies`)
    ) {
      const parsed = safeJsonParse(event.body);
      if (!parsed?.text || !String(parsed.text).trim()) {
        return badRequest("text is required", origin);
      }

      const existing = await doc.send(
        new GetCommand({
          TableName: TABLE,
          Key: { pk: PK, sk: id },
        })
      );

      if (!existing.Item) {
        return json(404, { ok: false, error: "Not found" }, origin);
      }

      const item = existing.Item;
      const comments = Array.isArray(item.comments) ? item.comments : [];

      const idx = comments.findIndex((c) => String(c?.id) === String(commentId));
      if (idx < 0) {
        return json(404, { ok: false, error: "Comment not found" }, origin);
      }

      const reply = {
        id: makeId("r"),
        text: String(parsed.text).trim(),
        authorId: parsed.authorId ?? "",
        authorName: parsed.authorName ?? "",
        authorProgram: parsed.authorProgram ?? "",
        authorPhoto: parsed.authorPhoto ?? "",
        createdAt: nowIso(),
      };

      const target = comments[idx] || {};
      const replies = Array.isArray(target.replies) ? target.replies : [];
      comments[idx] = { ...target, replies: [...replies, reply] };

      await doc.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: PK, sk: id },
          UpdateExpression: "SET comments = :c, updatedAt = :u",
          ExpressionAttributeValues: {
            ":c": comments,
            ":u": nowIso(),
          },
        })
      );

      return json(201, { ok: true, reply }, origin);
    }

    /* ---------- DELETE /api/marketplace/{id} ---------- */
    if (method === "DELETE" && id) {
      await doc.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { pk: PK, sk: id },
        })
      );

      return json(200, { ok: true, deletedId: id }, origin);
    }

    return json(404, { ok: false, error: "Route not found" }, origin);
  } catch (err) {
    console.error("MarketplaceHandler error:", err);
    return json(
      500,
      { ok: false, error: "Server error", detail: err.message },
      origin
    );
  }
};