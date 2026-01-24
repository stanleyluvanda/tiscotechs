// aws/ConsentsHandler/index.mjs
// Node.js 22 (ESM) — DynamoDB-backed student consents (cross-device)
// ✅ NO admin authorization
// ✅ GET /api/consents?userId=... -> fetch one
// ✅ GET /api/consents?limit=..&cursor=.. -> list all (no auth)
// ✅ PUT /api/consents -> upsert

import crypto from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";

const CONSENTS_TABLE =
  process.env.CONSENTS_TABLE ||
  process.env.CONSENT_TABLE ||
  "StudentConsents";

// If your GSI is not literally named "GSI1", set this env.
const CONSENTS_GSI1_NAME = String(process.env.CONSENTS_GSI1_NAME || "GSI1").trim();

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

const ALLOWED_ORIGINS = new Set([
  "https://scholarsknowledge.com",
  "https://www.scholarsknowledge.com",
  "http://localhost:5176",
  "http://localhost:5175",
  "http://localhost:5174",
]);

function getHeader(event, name) {
  const h = event?.headers || {};
  return h[name] || h[name?.toLowerCase()] || h[name?.toUpperCase()] || "";
}

function corsHeaders(event) {
  const origin = String(getHeader(event, "origin") || "").trim();
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,PUT",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  // For browser calls, always echo allowed origins.
  if (origin && (ALLOWED_ORIGINS.has(origin) || origin.startsWith("http://localhost"))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else {
    // Non-browser tools (curl/postman) or unknown origins.
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

function json(event, statusCode, body) {
  return { statusCode, headers: corsHeaders(event), body: JSON.stringify(body || {}) };
}

function safeParse(s) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

function nowIso() {
  return new Date().toISOString();
}

function encodeCursor(key) {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64");
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(String(cursor), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Normalize consent keys.
 * UI might send singular or plural for "invitation(s)".
 * Canonical key is "applicationInvitation" (singular).
 */
function normalizeConsents(input) {
  const raw = input && typeof input === "object" ? input : {};
  const pick = (k) => {
    const v = raw[k];
    if (v && typeof v === "object") return !!v.granted;
    return !!v;
  };

  const invitation = pick("applicationInvitation") || pick("applicationInvitations");

  return {
    scholarshipAlerts: pick("scholarshipAlerts"),
    applicationTips: pick("applicationTips"),
    programRecommendations: pick("programRecommendations"),
    applicationInvitation: invitation,
    applicationInvitations: invitation, // legacy alias
  };
}

function normalizeProfile(input) {
  const p = input && typeof input === "object" ? input : {};
  return {
    name: String(p.name || "").trim() || undefined,
    email: String(p.email || "").trim().toLowerCase() || undefined,
    university: String(p.university || "").trim() || undefined,
    faculty: String(p.faculty || "").trim() || undefined,
  };
}

/* ---------------------------------------------------------
   Handlers
--------------------------------------------------------- */

async function handleGetByUserId(event, userId) {
  if (!userId) return json(event, 400, { ok: false, error: "MISSING_USERID" });

  const key = { PK: `USER#${userId}`, SK: "CONSENTS" };
  const res = await ddb.send(new GetCommand({ TableName: CONSENTS_TABLE, Key: key }));
  return json(event, 200, { ok: true, item: res.Item || null });
}

async function handlePutByUserId(event, body) {
  const userId = String(body.userId || "").trim();
  if (!userId) return json(event, 400, { ok: false, error: "MISSING_USERID" });

  const consentsRaw = body.consents ?? body.consent ?? body.preferences ?? {};
  const consents = normalizeConsents(consentsRaw);

  const updatedAt = nowIso();
  const profile = normalizeProfile(body.profile || body);

  // Canonical cross-device flag
  const visibleAcrossDevices = !!(
    body.visibleAcrossDevices ??
    body.persistAcrossDevices ??
    body.syncAcrossDevices ??
    true // ✅ default TRUE (since you want cross-device visibility)
  );

  const stored = {
    scholarshipAlerts: !!consents.scholarshipAlerts,
    applicationTips: !!consents.applicationTips,
    programRecommendations: !!consents.programRecommendations,
    applicationInvitation: !!consents.applicationInvitation,
    applicationInvitations: !!consents.applicationInvitations, // legacy alias
  };

  const item = {
    PK: `USER#${userId}`,
    SK: "CONSENTS",
    userId,

    ...profile,

    visibleAcrossDevices,

    // Keep both shapes for frontend compatibility
    consent: stored,
    consents: stored,

    updatedAt,

    // Index for listing
    GSI1PK: "CONSENTS",
    GSI1SK: `${updatedAt}#${userId}`,
  };

  await ddb.send(new PutCommand({ TableName: CONSENTS_TABLE, Item: item }));
  return json(event, 200, { ok: true, item });
}

async function handleListAll(event) {
  const qs = event?.queryStringParameters || {};
  const limit = Math.max(1, Math.min(200, Number(qs.limit || 200)));
  const cursor = decodeCursor(qs.cursor);

  try {
    const out = await ddb.send(
      new QueryCommand({
        TableName: CONSENTS_TABLE,
        IndexName: CONSENTS_GSI1_NAME,
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": "CONSENTS" },
        ScanIndexForward: false, // newest first
        Limit: limit,
        ExclusiveStartKey: cursor || undefined,
      })
    );

    return json(event, 200, {
      ok: true,
      items: out.Items || [],
      nextCursor: encodeCursor(out.LastEvaluatedKey) || null,
    });
  } catch (e) {
    console.error("List query failed:", e);
    return json(event, 500, {
      ok: false,
      error: "LIST_FAILED",
      detail: String(e?.message || e),
      hint:
        "Check DynamoDB GSI name. If not 'GSI1', set env CONSENTS_GSI1_NAME to your real index name.",
    });
  }
}

export const handler = async (event) => {
  try {
    const method = event?.requestContext?.http?.method || event?.httpMethod || "";
    const path = String(event?.requestContext?.http?.path || event?.rawPath || event?.path || "");

    if (method === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(event), body: "" };
    }

    const qs = event?.queryStringParameters || {};
    const hasUserId = !!String(qs.userId || "").trim();

    // ✅ Primary route: /api/consents
    if (path.includes("/api/consents")) {
      if (method === "GET") {
        if (hasUserId) {
          return handleGetByUserId(event, String(qs.userId || "").trim());
        }
        // No userId => list all
        return handleListAll(event);
      }

      if (method === "PUT") {
        const body = safeParse(event.body);
        return handlePutByUserId(event, body);
      }
    }

    // Legacy support (optional)
    if (method === "GET" && path.endsWith("/consents/me")) {
      const userId = String(qs.userId || "").trim();
      return handleGetByUserId(event, userId);
    }
    if (method === "PUT" && path.endsWith("/consents/me")) {
      const body = safeParse(event.body);
      return handlePutByUserId(event, body);
    }

    return json(event, 404, { ok: false, error: "NOT_FOUND", path });
  } catch (err) {
    console.error("ConsentsHandler error:", err);
    return json(event, 500, {
      ok: false,
      error: "SERVER_ERROR",
      detail: String(err?.message || err),
    });
  }
};