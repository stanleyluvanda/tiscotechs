// aws/ScholarshipsHandler/index.mjs
// Node.js 20 — DynamoDB-backed scholarships API (drop-in replacement for S3 JSON)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";


const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.SCHOLARSHIPS_TABLE; // ✅ required
// ===== Images -> S3 (origin) + CloudFront (public URL) =====
const BUCKET = process.env.SCHOLARSHIPS_BUCKET; // already set in your env
const IMG_PREFIX = process.env.SCHOLARSHIPS_IMG_PREFIX || "scholarships/images/";
const CLOUDFRONT_BASE_URL = (process.env.CLOUDFRONT_BASE_URL || "").replace(/\/+$/, "");

const s3 = new S3Client({ region: REGION });

function safeExtFromContentType(ct = "") {
  const x = String(ct).toLowerCase();
  if (x.includes("png")) return "png";
  if (x.includes("jpeg") || x.includes("jpg")) return "jpg";
  if (x.includes("webp")) return "webp";
  if (x.includes("gif")) return "gif";
  if (x.includes("svg")) return "svg";
  return "bin";
}

function makeImgKey({ fileName = "", contentType = "" } = {}) {
  const ext =
    (String(fileName).split(".").pop() || "").toLowerCase() ||
    safeExtFromContentType(contentType);
  const rand = crypto.randomBytes(16).toString("hex");
  return `${IMG_PREFIX}${Date.now()}-${rand}.${ext}`;
}

function toCloudFrontUrl(key) {
  if (!CLOUDFRONT_BASE_URL) return "";
  return `${CLOUDFRONT_BASE_URL}/${String(key).replace(/^\/+/, "")}`;
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      ...extraHeaders,
    },
    body: JSON.stringify(body ?? {}),
  };
}

async function readBody(event) {
  try {
    return JSON.parse(event?.body || "{}");
  } catch {
    return null;
  }
}

function normalizeId(x) {
  return String(x ?? "");
}

function nowId() {
  // Keep your old behavior (string Date.now) so existing IDs remain compatible.
  return String(Date.now());
}

function pk() {
  return "SCHOLARSHIP";
}

function skFromId(id) {
  return `SCH#${normalizeId(id)}`;
}

function stripKeys(obj) {
  // Prevent overwriting keys accidentally
  const { pk: _pk, sk: _sk, ...rest } = obj || {};
  return rest;
}

export const handler = async (event) => {
  try {
    if (!TABLE) throw new Error("Missing env SCHOLARSHIPS_TABLE");

    // Preflight
    if (event?.requestContext?.http?.method === "OPTIONS") {
      return json(204, {});
    }

    const method =
      event?.requestContext?.http?.method || event?.httpMethod || "GET";

    const rawPath = event?.rawPath || event?.path || "/";
    const stage = String(event?.requestContext?.stage || "").trim(); // e.g. "prod"
    const path =
      stage && rawPath.startsWith(`/${stage}/`)
        ? rawPath.slice(stage.length + 1)
        : stage && rawPath === `/${stage}`
        ? "/"
        : rawPath;

    const id = event?.pathParameters?.id
      ? normalizeId(event.pathParameters.id)
      : null;

    // Only serve /api/scholarships and /api/scholarships/{id}
    if (!path.startsWith("/api/scholarships")) {
      return json(404, { ok: false, error: "Not found" });
    }
    // ---------- POST /api/scholarships/upload-url ----------
    if (method === "POST" && path === "/api/scholarships/upload-url") {
      if (!BUCKET) return json(500, { ok: false, error: "Missing env SCHOLARSHIPS_BUCKET" });
      if (!CLOUDFRONT_BASE_URL) return json(500, { ok: false, error: "Missing env CLOUDFRONT_BASE_URL" });

      const body = await readBody(event);
      if (!body) return json(400, { ok: false, error: "Invalid JSON body" });

      const fileName = String(body.fileName || "");
      const contentType = String(body.contentType || "application/octet-stream");

      // small allowlist
      if (!contentType.startsWith("image/")) {
        return json(400, { ok: false, error: "Only image uploads are allowed" });
      }

      const key = makeImgKey({ fileName, contentType });

      const putCmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 60 });

      return json(200, {
        ok: true,
        key,
        uploadUrl,
        cloudfrontUrl: toCloudFrontUrl(key),
      });
    }

    // ---------- POST /api/scholarships/import-image ----------
    // Takes an external image URL, downloads it, stores in S3, returns CloudFront URL.
    /*if (method === "POST" && path === "/api/scholarships/import-image") {
      if (!BUCKET) return json(500, { ok: false, error: "Missing env SCHOLARSHIPS_BUCKET" });
      if (!CLOUDFRONT_BASE_URL) return json(500, { ok: false, error: "Missing env CLOUDFRONT_BASE_URL" });

      const body = await readBody(event);
      if (!body) return json(400, { ok: false, error: "Invalid JSON body" });

      const src = String(body.url || "").trim();
      if (!src || !/^https?:\/\//i.test(src)) {
        return json(400, { ok: false, error: "Provide a valid http(s) url" });
      }

      // Node 20 has global fetch
      const r = await fetch(src);
      if (!r.ok) return json(400, { ok: false, error: `Failed to fetch image: HTTP ${r.status}` });

      const contentType = String(r.headers.get("content-type") || "");
      if (!contentType.startsWith("image/")) {
        return json(400, { ok: false, error: "URL must point to an image" });
      }

      const arr = new Uint8Array(await r.arrayBuffer());
      const key = makeImgKey({ fileName: body.fileName || "", contentType });

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: arr,
          ContentType: contentType,
        })
      );

      return json(200, { ok: true, key, cloudfrontUrl: toCloudFrontUrl(key) });
    }*/

    // ---------- POST /api/scholarships/import-image ----------
// Takes an external image URL (http/https) OR a data:image base64 URL,
// stores in S3, returns CloudFront URL.
if (method === "POST" && path === "/api/scholarships/import-image") {
  if (!BUCKET) return json(500, { ok: false, error: "Missing env SCHOLARSHIPS_BUCKET" });
  if (!CLOUDFRONT_BASE_URL) return json(500, { ok: false, error: "Missing env CLOUDFRONT_BASE_URL" });

  const body = await readBody(event);
  if (!body) return json(400, { ok: false, error: "Invalid JSON body" });

  const src = String(body.url || "").trim();
  if (!src) return json(400, { ok: false, error: "Provide a url" });

  // ✅ NEW: Handle data:image/...;base64,...
  // This is common when users copy/paste an image "link" from some contexts.
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(src)) {
    try {
      const m = src.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
      if (!m) return json(400, { ok: false, error: "Invalid data URL format" });

      const contentType = String(m[1] || "").toLowerCase();
      const b64 = String(m[2] || "");

      if (!contentType.startsWith("image/")) {
        return json(400, { ok: false, error: "Data URL must be an image" });
      }

      // Decode base64 safely
      const buf = Buffer.from(b64, "base64");
      if (!buf || !buf.length) {
        return json(400, { ok: false, error: "Empty image data" });
      }

      // Optional: guard against huge payloads (adjust if you want)
      // 6MB raw buffer cap (API Gateway payload limits vary)
      if (buf.length > 6 * 1024 * 1024) {
        return json(413, { ok: false, error: "Image too large" });
      }

      const key = makeImgKey({ fileName: body.fileName || "", contentType });

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buf,
          ContentType: contentType,
        })
      );

      return json(200, { ok: true, key, cloudfrontUrl: toCloudFrontUrl(key) });
    } catch (e) {
      return json(400, { ok: false, error: `Failed to import data URL: ${String(e?.message || e)}` });
    }
  }

  // Existing behavior: http(s) URL import
  if (!/^https?:\/\//i.test(src)) {
    return json(400, { ok: false, error: "Provide a valid http(s) url or a data:image base64 url" });
  }

  // Node 20 has global fetch
  const r = await fetch(src);
  if (!r.ok) return json(400, { ok: false, error: `Failed to fetch image: HTTP ${r.status}` });

  const contentType = String(r.headers.get("content-type") || "");
  if (!contentType.startsWith("image/")) {
    return json(400, { ok: false, error: "URL must point to an image" });
  }

  const arr = new Uint8Array(await r.arrayBuffer());
  const key = makeImgKey({ fileName: body.fileName || "", contentType });

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: arr,
      ContentType: contentType,
    })
  );

  return json(200, { ok: true, key, cloudfrontUrl: toCloudFrontUrl(key) });
}

    // ---------- GET /api/scholarships ----------
    if (method === "GET" && !id) {
      const qp = event?.queryStringParameters || {};
      const q = String(qp.q || "").trim().toLowerCase();
      const status = String(qp.status || "all").trim().toLowerCase();
      const page = Math.max(1, parseInt(qp.page || "1", 10) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(qp.pageSize || "20", 10) || 20)
      );

      // Query all scholarships by pk (single partition pattern).
      // Then filter in-memory to preserve your existing behavior exactly.
      // For big scale later, we’ll add a GSI (STATUS#...) to avoid reading all.
      let items = [];
      let lastKey = undefined;

      do {
        const resp = await ddb.send(
          new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :pref)",
            ExpressionAttributeNames: { "#pk": "pk", "#sk": "sk" },
            ExpressionAttributeValues: { ":pk": pk(), ":pref": "SCH#" },
            ExclusiveStartKey: lastKey,
          })
        );

        const batch = Array.isArray(resp.Items) ? resp.Items : [];
        items = items.concat(batch);
        lastKey = resp.LastEvaluatedKey;
      } while (lastKey);

      // Normalize (strip internal keys) and keep old semantics
      let filtered = items
        .map((x) => {
          const out = stripKeys(x);
          // Ensure id exists (in case old data imported without id)
          if (!out.id && x?.sk?.startsWith("SCH#")) out.id = x.sk.slice(4);
          return out;
        })
        .filter(Boolean);

      if (q) {
        filtered = filtered.filter((it) => {
          const hay = [it.title, it.provider, it.country, it.level, it.field]
            .filter(Boolean)
            .map((v) => String(v).toLowerCase());
          return hay.some((v) => v.includes(q));
        });
      }

      if (status && status !== "all") {
        filtered = filtered.filter(
          (it) => String(it.status || "pending").toLowerCase() === status
        );
      }

      filtered.sort(
        (a, b) => (b.createdAt || b.id || 0) - (a.createdAt || a.id || 0)
      );

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      return json(200, { items: paged, total });
    }

    // ---------- GET /api/scholarships/{id} ----------
    if (method === "GET" && id) {
      const resp = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { pk: pk(), sk: skFromId(id) },
        })
      );
      if (!resp.Item) return json(404, { ok: false, error: "Not found" });

      const out = stripKeys(resp.Item);
      if (!out.id) out.id = id;
      return json(200, out);
    }

    // ---------- POST /api/scholarships ----------
    if (method === "POST" && !id) {
      const body = await readBody(event);
      if (!body) return json(400, { ok: false, error: "Invalid JSON body" });

      const newId = body.id ? normalizeId(body.id) : nowId();
      const createdAt = body.createdAt || Date.now();

      const item = {
        pk: pk(),
        sk: skFromId(newId),
        ...stripKeys(body),
        id: newId,
        createdAt,
        status: String(body.status || "pending").toLowerCase(),
      };

      await ddb.send(
        new PutCommand({
          TableName: TABLE,
          Item: item,
        })
      );

      return json(200, stripKeys(item));
    }

    // ---------- PUT /api/scholarships/{id} ----------
    if (method === "PUT" && id) {
      const patch = await readBody(event);
      if (!patch) return json(400, { ok: false, error: "Invalid JSON body" });

      // Build UpdateExpression from patch keys
      const clean = stripKeys(patch);
      delete clean.id; // never change id

      const keys = Object.keys(clean || {}).filter((k) => k !== "pk" && k !== "sk");
      const names = {};
      const values = {};
      const sets = [];

      for (const k of keys) {
        names[`#${k}`] = k;
        values[`:${k}`] = clean[k];
        sets.push(`#${k} = :${k}`);
      }

      // Always stamp updatedAt
      names["#updatedAt"] = "updatedAt";
      values[":updatedAt"] = Date.now();
      sets.push("#updatedAt = :updatedAt");

      // Optional: normalize status if present
      if (Object.prototype.hasOwnProperty.call(clean, "status")) {
        values[":status"] = String(clean.status || "").toLowerCase();
        names["#status"] = "status";
        // ensure it’s included (in case it was undefined)
        if (!sets.some((s) => s.startsWith("#status"))) sets.push("#status = :status");
      }

      const resp = await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: pk(), sk: skFromId(id) },
          UpdateExpression: `SET ${sets.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
          ReturnValues: "ALL_NEW",
        })
      );

      const out = stripKeys(resp.Attributes);
      if (!out.id) out.id = id;
      return json(200, out);
    }

    // ---------- DELETE /api/scholarships/{id} ----------
    /*if (method === "DELETE" && id) {
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { pk: pk(), sk: skFromId(id) },
        })
      );
      return json(200, { ok: true });
    }*/


    // ---------- DELETE /api/scholarships/{id} ----------
if (method === "DELETE" && id) {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { pk: pk(), sk: skFromId(id) },
      ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
    })
  );
  return json(200, { ok: true });
}

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("ScholarshipsHandler ERROR:", {
      name: e?.name,
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      statusCode: e?.$metadata?.httpStatusCode,
      requestId: e?.$metadata?.requestId,
    });

    return json(500, { ok: false, error: String(e?.message || e) });
  }
};