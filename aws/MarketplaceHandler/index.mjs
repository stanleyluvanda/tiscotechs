// Node.js 20 — Marketplace API
// ✅ Upgrades (non-breaking):
// - GET /api/marketplace now uses Query + pagination: ?limit=&cursor=&includeComments=0/1&university=...
// - NEW: GET /api/marketplace/thread?itemId=... returns comments only for one item
// - NEW: Billing/Entitlement (same DynamoDB table):
//   - GET  /api/marketplace/entitlement?userId=...
//   - POST /api/marketplace/checkout/start   (provider=stripe|flutterwave)
//   - ALSO supports: POST /api/marketplace/checkout (alias)
//   - POST /api/marketplace/webhook/stripe
//   - POST /api/marketplace/webhook/flutterwave
// - Enforced rule:
//   - 1 free listing per user
//   - second listing requires payment ($99.99, 120 days) to post unlimited

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

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

/* ------------------ billing env ------------------ */
const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();
const STRIPE_WEBHOOK_SECRET = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
const STRIPE_SUCCESS_URL =
  (process.env.STRIPE_SUCCESS_URL ||
    process.env.APP_ORIGIN ||
    "https://scholarsknowledge.com").trim();
const STRIPE_CANCEL_URL =
  (process.env.STRIPE_CANCEL_URL ||
    process.env.APP_ORIGIN ||
    "https://scholarsknowledge.com").trim();

const FLW_SECRET_KEY = (process.env.FLW_SECRET_KEY || "").trim();
const FLW_WEBHOOK_SECRET_HASH = (process.env.FLW_WEBHOOK_SECRET_HASH || "").trim();
const FLW_REDIRECT_URL =
  (process.env.FLW_REDIRECT_URL ||
    process.env.APP_ORIGIN ||
    "https://scholarsknowledge.com").trim();

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
    "access-control-allow-credentials": "true", // ✅ REQUIRED
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers":
      "content-type,authorization,stripe-signature,verif-hash",
    "access-control-max-age": "86400",
    "vary": "Origin", // ✅ avoid caching wrong origin
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

function paymentRequired(origin) {
  return json(
    402,
    {
      ok: false,
      error: "PAYMENT_REQUIRED",
      message: "Pay $99.99 for 120 days to post unlimited marketplace listings.",
      price: 99.99,
      currency: "USD",
      durationDays: 120,
    },
    origin
  );
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

function getRawBody(event) {
  const b = event?.body || "";
  if (event?.isBase64Encoded) {
    try {
      return Buffer.from(String(b), "base64").toString("utf8");
    } catch {
      return "";
    }
  }
  return String(b);
}
/* ✅ ADD THIS HELPER RIGHT HERE */
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

const nowIso = () => new Date().toISOString();
const nowMs = () => Date.now();

function makeId(prefix = "mkt") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const PK = "MARKETPLACE#ITEM";
const BILLING_PK = "MARKETPLACE#BILLING";

// ✅ Cursor helpers (safe, simple)
function encodeCursor(lek) {
  if (!lek) return null;
  return Buffer.from(JSON.stringify(lek)).toString("base64url");
}
function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
function pickLimit(qs, def = 30, max = 60) {
  const n = Number(qs?.limit);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(max, Math.floor(n));
}

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

    // Path-style
    const isPathStyle = host === "s3.amazonaws.com" || host.startsWith("s3.");
    if (isPathStyle) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const key = parts.slice(1).join("/");
        return `https://${CLOUDFRONT_DOMAIN}/${key}`;
      }
      return s;
    }

    // Virtual-hosted-style
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

/* ------------------ billing helpers ------------------ */

function billingKey(userId) {
  return { pk: BILLING_PK, sk: `USER#${String(userId || "").trim()}` };
}

async function getBilling(userId) {
  if (!userId) return null;
  const got = await doc.send(
    new GetCommand({
      TableName: TABLE,
      Key: billingKey(userId),
    })
  );
  return got?.Item || null;
}

function isPaidActive(b) {
  const paidUntil = Number(b?.paidUntil || 0);
  return paidUntil > nowMs();
}

function paidUntil120DaysFromNow() {
  return nowMs() + 120 * 24 * 60 * 60 * 1000;
}

/*async function markPaid(userId, provider, ref) {
  if (!userId) return;
  const createdAt = nowIso();
  const paidUntil = paidUntil120DaysFromNow();

  await doc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: billingKey(userId),
      UpdateExpression:
        "SET userId=:u, #status=:s, plan=:p, currency=:c, priceCents=:pc, paidUntil=:pu, lastPaymentProvider=:lp, lastPaymentRef=:lr, updatedAt=:ua, createdAt=if_not_exists(createdAt,:ca)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":u": String(userId),
        ":s": "active",
        ":p": "semester_unlimited",
        ":c": "USD",
        ":pc": 9999,
        ":pu": paidUntil,
        ":lp": provider || "",
        ":lr": ref || "",
        ":ua": createdAt,
        ":ca": createdAt,
      },
    })
  );

  return paidUntil;
}*/
async function markPaid(userId, provider, ref) {
  if (!userId) return;
  const createdAt = nowIso();
  const paidUntil = paidUntil120DaysFromNow();

  await doc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: billingKey(userId),
      UpdateExpression:
        "SET userId=:u, #status=:s, #plan=:p, currency=:c, priceCents=:pc, paidUntil=:pu, lastPaymentProvider=:lp, lastPaymentRef=:lr, updatedAt=:ua, createdAt=if_not_exists(createdAt,:ca)",
      ExpressionAttributeNames: {
        "#status": "status",
        "#plan": "plan", // ✅ FIX: 'plan' is reserved
      },
      ExpressionAttributeValues: {
        ":u": String(userId),
        ":s": "active",
        ":p": "semester_unlimited",
        ":c": "USD",
        ":pc": 9999,
        ":pu": paidUntil,
        ":lp": provider || "",
        ":lr": ref || "",
        ":ua": createdAt,
        ":ca": createdAt,
      },
    })
  );

  return paidUntil;
}

// Called on every successful listing create to keep counts (optional)
async function bumpListingCount(userId) {
  if (!userId) return;
  const ts = nowIso();
  await doc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: billingKey(userId),
      UpdateExpression:
        "SET userId=:u, listingCount = if_not_exists(listingCount,:z) + :one, updatedAt=:t, createdAt=if_not_exists(createdAt,:t)",
      ExpressionAttributeValues: {
        ":u": String(userId),
        ":z": 0,
        ":one": 1,
        ":t": ts,
      },
    })
  );
}

// Enforce: 1 free listing total (unless paid)
async function consumeFreeIfAvailable(userId) {
  const ts = nowIso();
  try {
    await doc.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: billingKey(userId),
        ConditionExpression: "attribute_not_exists(freeUsed) OR freeUsed = :z",
        UpdateExpression:
          "SET userId=:u, freeUsed=:one, updatedAt=:t, createdAt=if_not_exists(createdAt,:t)",
        ExpressionAttributeValues: {
          ":u": String(userId),
          ":z": 0,
          ":one": 1,
          ":t": ts,
        },
      })
    );
    return true;
  } catch {
    return false;
  }
}

/* ------------------ Stripe helpers (no SDK; direct API) ------------------ */

/*async function stripeCreateCheckoutSession({ userId, email, name }) {
  if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is missing");

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append(
    "success_url",
    `${STRIPE_SUCCESS_URL.replace(/\/+$/, "")}/student-marketplace?paid=1`
  );
  params.append(
    "cancel_url",
    `${STRIPE_CANCEL_URL.replace(/\/+$/, "")}/student-marketplace?canceled=1`
  );

  if (email) params.append("customer_email", email);

  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", "Marketplace Unlimited (120 days)");
  params.append("line_items[0][price_data][unit_amount]", "9999");
  params.append("line_items[0][quantity]", "1");

  params.append("metadata[userId]", String(userId || ""));
  params.append("metadata[plan]", "semester_unlimited");
  if (name) params.append("metadata[name]", String(name));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe error: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}*/
async function stripeCreateCheckoutSession({ userId, email, name }) {
  if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is missing");

  const baseSuccess = originOnly(STRIPE_SUCCESS_URL, "https://scholarsknowledge.com");
  const baseCancel = originOnly(STRIPE_CANCEL_URL, "https://scholarsknowledge.com");

  const params = new URLSearchParams();
  params.append("mode", "payment");

  params.append("success_url", `${baseSuccess}/student-marketplace?paid=1`);
  params.append("cancel_url", `${baseCancel}/student-marketplace?canceled=1`);

  if (email) params.append("customer_email", email);

  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", "Marketplace Unlimited (120 days)");
  params.append("line_items[0][price_data][unit_amount]", "9999");
  params.append("line_items[0][quantity]", "1");

  params.append("metadata[userId]", String(userId || ""));
  params.append("metadata[plan]", "semester_unlimited");
  if (name) params.append("metadata[name]", String(name));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe error: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function stripeVerifySignature(rawBody, signatureHeader) {
  if (!STRIPE_WEBHOOK_SECRET) return false;
  const sig = String(signatureHeader || "");
  const parts = sig.split(",").map((s) => s.trim());
  const t = parts.find((p) => p.startsWith("t="))?.slice(2);

  // Stripe can include multiple v1 signatures; accept any match
  const v1s = parts
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3))
    .filter(Boolean);

  if (!t || !v1s.length) return false;

  const signedPayload = `${t}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(signedPayload, "utf8")
    .digest("hex");

  for (const v1 of v1s) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(v1, "utf8"))) {
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

/* ------------------ Flutterwave helpers ------------------ */

async function flutterwaveCreatePaymentLink({ userId, email, name }) {
  if (!FLW_SECRET_KEY) throw new Error("FLW_SECRET_KEY is missing");

  const tx_ref = `flw_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const body = {
    tx_ref,
    amount: 99.99,
    currency: "USD",
    redirect_url: `${FLW_REDIRECT_URL.replace(/\/+$/, "")}/student-marketplace?paid=1`,
    payment_options: "card,mobilemoney,ussd,banktransfer",
    customer: {
      email: email || "unknown@scholarsknowledge.com",
      name: name || "Student",
    },
    meta: {
      userId: String(userId || ""),
      plan: "semester_unlimited",
    },
    customizations: {
      title: "Marketplace Unlimited (120 days)",
      description: "Post unlimited marketplace listings for 120 days.",
    },
  };

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status !== "success") {
    const msg = data?.message || `Flutterwave error: ${res.status}`;
    throw new Error(msg);
  }

  const link = data?.data?.link;
  if (!link) throw new Error("Flutterwave did not return a payment link");
  return { link, tx_ref };
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

  // ✅ Normalize path so /foo and /foo/ behave the same (fixes your 404)
  const rawPath = String(event?.rawPath || event?.path || "/");
  const path =
    rawPath !== "/" ? rawPath.replace(/\/+$/, "") : "/";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  try {
    const id = event?.pathParameters?.id ? String(event.pathParameters.id) : null;
    const commentId = event?.pathParameters?.commentId ? String(event.pathParameters.commentId) : null;

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

    /* ---------- GET /api/marketplace/entitlement?userId=... ---------- */
    if (method === "GET" && path === "/api/marketplace/entitlement") {
      const qs = event?.queryStringParameters || {};
      //const userId = String(qs.userId || "").trim();
      const userId = String(qs.userId || qs.id || qs.uid || "").trim();
      if (!userId) return badRequest("userId is required", origin);

      const b = await getBilling(userId);
      const isPaid = isPaidActive(b);
      const freeUsed = Number(b?.freeUsed || 0);
      const freeRemaining = isPaid ? 0 : Math.max(0, 1 - freeUsed);

      return json(
        200,
        {
          ok: true,
          userId,
          isPaid,
          paidUntil: b?.paidUntil || null,
          canPost: isPaid || freeUsed < 1,
          freeRemaining,
          status: b?.status || (isPaid ? "active" : "inactive"),
        },
        origin
      );
    }

    /* ---------- POST /api/marketplace/checkout/start (and /checkout alias) ---------- */
    if (
      method === "POST" &&
      (path === "/api/marketplace/checkout/start" || path === "/api/marketplace/checkout")
    ) {
      const parsed = safeJsonParse(event.body);
      //const userId = String(parsed?.userId || "").trim();
      const userId = String(parsed?.userId || parsed?.id || parsed?.uid || "").trim();

      const provider = String(parsed?.provider || "stripe").trim().toLowerCase();
      const email = parsed?.email ? String(parsed.email).trim() : "";
      const name = parsed?.name ? String(parsed.name).trim() : "";

      if (!userId) return badRequest("userId is required", origin);
      if (!["stripe", "flutterwave"].includes(provider)) {
        return badRequest("provider must be stripe or flutterwave", origin);
      }

      if (provider === "stripe") {
        const session = await stripeCreateCheckoutSession({ userId, email, name });
        return json(200, { ok: true, provider: "stripe", url: session?.url || null }, origin);
      } else {
        const out = await flutterwaveCreatePaymentLink({ userId, email, name });
        return json(200, { ok: true, provider: "flutterwave", url: out.link, tx_ref: out.tx_ref }, origin);
      }
    }

    /* ---------- POST /api/marketplace/webhook/stripe ---------- */
    if (method === "POST" && path === "/api/marketplace/webhook/stripe") {
      const raw = getRawBody(event);
      const sig =
        event?.headers?.["stripe-signature"] ||
        event?.headers?.["Stripe-Signature"];

      if (!stripeVerifySignature(raw, sig)) {
        return json(400, { ok: false, error: "Invalid Stripe signature" }, origin);
      }

      const evt = safeJsonParse(raw);
      const type = String(evt?.type || "");

      if (type === "checkout.session.completed") {
        const obj = evt?.data?.object || {};
        const paid = obj?.payment_status === "paid";
        const amount = Number(obj?.amount_total || 0);
        const currency = String(obj?.currency || "").toLowerCase();

        if (paid && amount === 9999 && currency === "usd") {
          const userId = String(obj?.metadata?.userId || "").trim();
          const ref = String(obj?.id || obj?.payment_intent || "").trim();
          if (userId) {
            const pu = await markPaid(userId, "stripe", ref);
            return json(200, { ok: true, activated: true, userId, paidUntil: pu }, origin);
          }
        }
      }

      return json(200, { ok: true, received: true }, origin);
    }

    /* ---------- POST /api/marketplace/webhook/flutterwave ---------- */
    if (method === "POST" && path === "/api/marketplace/webhook/flutterwave") {
      const verif = event?.headers?.["verif-hash"] || event?.headers?.["Verif-Hash"];
      if (!FLW_WEBHOOK_SECRET_HASH || String(verif || "") !== FLW_WEBHOOK_SECRET_HASH) {
        return json(400, { ok: false, error: "Invalid Flutterwave verif-hash" }, origin);
      }

      const raw = getRawBody(event);
      const payload = safeJsonParse(raw);

      const status = String(payload?.data?.status || "").toLowerCase();
      const amount = Number(payload?.data?.amount || 0);
      const currency = String(payload?.data?.currency || "").toUpperCase();
      const txRef = String(payload?.data?.tx_ref || payload?.data?.id || "").trim();

      const userId = String(payload?.data?.meta?.userId || "").trim();

      if (status === "successful" && amount === 99.99 && currency === "USD" && userId) {
        const pu = await markPaid(userId, "flutterwave", txRef);
        return json(200, { ok: true, activated: true, userId, paidUntil: pu }, origin);
      }

      return json(200, { ok: true, received: true }, origin);
    }

    /* ---------- GET /api/marketplace ---------- */
    /*if (method === "GET" && path === "/api/marketplace") {
      const qs = event?.queryStringParameters || {};
      const limit = pickLimit(qs, 30, 60);
      const cursor = decodeCursor(qs.cursor);
      const includeComments = String(qs.includeComments || "0") === "1";

      const uni = String(qs.university || "").trim();

const params = {
  TableName: TABLE,
  KeyConditionExpression: "pk = :pk",
  ExpressionAttributeValues: { ":pk": PK },
  Limit: limit,
  ScanIndexForward: false,
  ...(cursor ? { ExclusiveStartKey: cursor } : {}),
};

// ✅ Safe uni filter: supports BOTH old data (location) + new data (university)
// ✅ Uses ExpressionAttributeNames so Dynamo never complains about attribute names
if (uni) {
  params.FilterExpression = "(#loc = :u OR #uni = :u)";
  params.ExpressionAttributeNames = {
    ...(params.ExpressionAttributeNames || {}),
    "#loc": "location",
    "#uni": "university",
  };
  params.ExpressionAttributeValues = {
    ...(params.ExpressionAttributeValues || {}),
    ":u": uni,
  };
}

const out = await doc.send(new QueryCommand(params));
      const nextCursor = encodeCursor(out.LastEvaluatedKey);

      const items = (out.Items || []).map((x) => {
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
          ...(includeComments
            ? { comments: Array.isArray(item.comments) ? item.comments : [] }
            : { comments: [] }),
          images: rewriteImagesToCloudFront(item.images),
        };
      });

      return json(200, { ok: true, items, cursor: nextCursor }, origin);
    }*/

    /* ---------- GET /api/marketplace ---------- */
    if (method === "GET" && path === "/api/marketplace") {
      const qs = event?.queryStringParameters || {};
      const limit = pickLimit(qs, 30, 60);
      const cursor = decodeCursor(qs.cursor);
      const includeComments = String(qs.includeComments || "0") === "1";

      const uniRaw = String(qs.university || "").trim();
      const uni = uniRaw; // keep exact match (safe)

      // Helper to shape items consistently (same as your current mapper)
      const shapeItem = (x) => {
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
          ...(includeComments
            ? { comments: Array.isArray(item.comments) ? item.comments : [] }
            : { comments: [] }),
          images: rewriteImagesToCloudFront(item.images),
        };
      };

      // ✅ Key fix: if university filter is used, DynamoDB may return empty pages
      // (FilterExpression is applied AFTER reading). So we keep scanning pages
      // until we collect enough matches OR there is no more data.
      const collected = [];
      let lek = cursor || null;

      // Safety: prevent runaway reads if table is huge
      const MAX_PAGES = 12;

      for (let page = 0; page < MAX_PAGES; page++) {
        const params = {
          TableName: TABLE,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": PK },
          // When filtering, ask DynamoDB for a bit more each request,
          // because many will be filtered out.
          Limit: uni ? Math.min(60, limit * 3) : limit,
          ScanIndexForward: false,
          ...(lek ? { ExclusiveStartKey: lek } : {}),
        };

        if (uni) {
          // FilterExpression happens after read — but this is OK now because we loop.
          params.FilterExpression = "(#loc = :u OR #uni = :u)";
          params.ExpressionAttributeNames = {
            ...(params.ExpressionAttributeNames || {}),
            "#loc": "location",
            "#uni": "university",
          };
          params.ExpressionAttributeValues = {
            ...params.ExpressionAttributeValues,
            ":u": uni,
          };
        }

        const out = await doc.send(new QueryCommand(params));
        const batch = Array.isArray(out?.Items) ? out.Items : [];

        for (const raw of batch) {
          collected.push(shapeItem(raw));
          if (collected.length >= limit) break;
        }

        lek = out?.LastEvaluatedKey || null;
        if (collected.length >= limit) break;
        if (!lek) break; // no more data to scan
      }

      const nextCursor = encodeCursor(lek);

      return json(200, { ok: true, items: collected, cursor: nextCursor }, origin);
    }

    /* ---------- GET /api/marketplace/thread?itemId=... ---------- */
    if (method === "GET" && path === "/api/marketplace/thread") {
      const qs = event?.queryStringParameters || {};
      const itemId = String(qs.itemId || "").trim();
      if (!itemId) return badRequest("itemId is required", origin);

      const got = await doc.send(
        new GetCommand({
          TableName: TABLE,
          Key: { pk: PK, sk: itemId },
          ProjectionExpression: "pk, sk, id, comments, updatedAt",
        })
      );

      if (!got.Item) return json(404, { ok: false, error: "Not found" }, origin);

      const comments = Array.isArray(got.Item.comments) ? got.Item.comments : [];
      return json(200, { ok: true, itemId, comments, updatedAt: got.Item.updatedAt || null }, origin);
    }

    /* ---------- POST /api/marketplace ---------- */
    if (method === "POST" && path === "/api/marketplace") {
      const parsed = safeJsonParse(event.body);

      if (!parsed.title || !String(parsed.title).trim()) {
        return badRequest("title is required", origin);
      }

      // ✅ Determine userId for posting enforcement
      const userId =
        String(parsed?.sellerId || parsed?.seller?.id || parsed?.authorId || "").trim();

      if (!userId) {
        return badRequest("sellerId (userId) is required", origin);
      }

      // ✅ Enforce: paid OR first free listing
      const b = await getBilling(userId);
      const paid = isPaidActive(b);

      if (!paid) {
        const okFree = await consumeFreeIfAvailable(userId);
        if (!okFree) {
          return paymentRequired(origin);
        }
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
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        })
      );

      bumpListingCount(userId).catch(() => {});
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
    return json(500, { ok: false, error: "Server error", detail: err?.message || String(err) }, origin);
  }
};