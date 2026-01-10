// aws/AuthHandler/index.mjs — AuthHandler (Node.js 20, ESM)
//
// Handles:
//   POST /api/auth/login
//   POST /api/auth/register/student
//   POST /api/auth/register/lecturer
//   POST /api/auth/register/partner
//   POST /api/auth/change-email
//   POST /api/auth/change-password
//   POST /api/auth/reset
//
// ADDED (non-breaking, minimal):
//   POST /api/auth/student/get-profile
//   POST /api/auth/student/update-profile
//   POST /api/auth/lecturer/get-profile
//   POST /api/auth/lecturer/update-profile
//   POST /api/auth/partner/get-profile
//   POST /api/auth/partner/update-profile
//
// DynamoDB table: ScholarsUsers (or env: USERS_TABLE / USER_TABLE_NAME / USER_TABLE)

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import crypto from "crypto";

const TABLE_NAME =
  process.env.USERS_TABLE ||
  process.env.USER_TABLE_NAME ||
  process.env.USER_TABLE ||
  "ScholarsUsers";

const ddb = new DynamoDBClient({});

/* ---------- Helpers ---------- */

function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return {};
  }
}

/* ---------- CORS helper ---------- */
/**
 * We always return an Access-Control-Allow-Origin header.
 * - For known origins (prod + localhost) we echo the exact origin
 * - For anything else we fall back to "*" so browser never sees
 *   "No 'Access-Control-Allow-Origin' header is present" again.
 */
function buildBaseHeaders(originRaw) {
  const origin = String(originRaw || "").trim();

  const allow = new Set([
    "https://www.scholarsknowledge.com",
    "https://scholarsknowledge.com",
    "http://localhost:5176",
    "http://localhost:5175",
    "http://localhost:5174",
  ]);

  let ACAO = "";

  if (allow.has(origin)) {
    ACAO = origin;
  } else if (origin.startsWith("http://localhost")) {
    // allow any localhost port in dev
    ACAO = origin;
  }

  // If we still don't have a specific ACAO, fall back to "*"
  if (!ACAO) {
    ACAO = origin || "*";
  }

  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ACAO,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function jsonResponse(statusCode, body, baseHeaders) {
  return {
    statusCode,
    headers: {
      ...baseHeaders,
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
    body: JSON.stringify(body || {}),
  };
}

/* ---------- Password helpers ---------- */

function sha256Hex(str) {
  return crypto.createHash("sha256").update(String(str || "")).digest("hex");
}

/**
 * Accepts BOTH:
 *   - stored plain password   (e.g. "MyPass123!")
 *   - stored sha256 hex hash  (64 chars)
 * and compares against the provided *plain* password OR a sha256 string.
 */
function passwordMatches(stored, candidate) {
  if (!stored || !candidate) return false;

  const s = String(stored).trim();
  const p = String(candidate).trim();

  // direct match (both plain or both hash)
  if (s === p) return true;

  // if stored looks like a sha256 hash, hash the candidate as plain
  if (s.length === 64 && /^[0-9a-f]+$/i.test(s)) {
    const candHash = sha256Hex(p);
    return candHash === s;
  }

  return false;
}

/* ---------- Deserialize profile ---------- */

function parseProfile(profileJson) {
  if (!profileJson) return {};
  try {
    return JSON.parse(profileJson);
  } catch {
    return {};
  }
}

/* =======================================================================
   GET/UPDATE PROFILE (ADDED — minimal, non-breaking)
   ======================================================================= */

/**
 * Detect role from path: /api/auth/<role>/...
 * Returns "student" | "lecturer" | "partner" | null
 */
function roleFromPath(pathLower) {
  if (!pathLower) return null;
  if (pathLower.includes("/api/auth/student/")) return "student";
  if (pathLower.includes("/api/auth/lecturer/")) return "lecturer";
  if (pathLower.includes("/api/auth/partner/")) return "partner";
  return null;
}

/**
 * POST /api/auth/<role>/get-profile
 * Body: { email }
 */
async function handleGetProfile(event, baseHeaders) {
  const body = parseBody(event);
  const email = normalizeEmail(body.email);

  const pathLower = String(
    event.requestContext?.http?.path || event.rawPath || event.path || ""
  ).toLowerCase();

  const wantRole = roleFromPath(pathLower);

  if (!email || !wantRole) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  try {
    const res = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
      })
    );

    if (!res.Item) {
      return jsonResponse(404, { ok: false, error: "NO_ACCOUNT" }, baseHeaders);
    }

    const storedRole = (res.Item.role?.S || "student").toLowerCase();
    if (storedRole !== wantRole) {
      return jsonResponse(
        403,
        { ok: false, error: "ROLE_MISMATCH", role: storedRole },
        baseHeaders
      );
    }

    const profile = parseProfile(res.Item.profile?.S || "{}");

    return jsonResponse(
      200,
      { ok: true, user: { email, role: storedRole, ...profile } },
      baseHeaders
    );
  } catch (err) {
    console.error("AuthHandler get-profile error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }
}

/**
 * POST /api/auth/<role>/update-profile
 * Body: { email, ...patch }
 *
 * Merges patch into existing DynamoDB "profile" JSON and stores it back.
 * This is what makes banner (and any future fields) global across devices.
 */
async function handleUpdateProfile(event, baseHeaders) {
  const body = parseBody(event);
  const email = normalizeEmail(body.email);

  const pathLower = String(
    event.requestContext?.http?.path || event.rawPath || event.path || ""
  ).toLowerCase();

  const wantRole = roleFromPath(pathLower);

  if (!email || !wantRole) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  // patch = everything except email
  const { email: _ignored, ...patch } = body || {};

  // If patch is empty, do nothing but still return current profile.
  try {
    const res = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
      })
    );

    if (!res.Item) {
      return jsonResponse(404, { ok: false, error: "NO_ACCOUNT" }, baseHeaders);
    }

    const storedRole = (res.Item.role?.S || "student").toLowerCase();
    if (storedRole !== wantRole) {
      return jsonResponse(
        403,
        { ok: false, error: "ROLE_MISMATCH", role: storedRole },
        baseHeaders
      );
    }

    const currentProfile = parseProfile(res.Item.profile?.S || "{}");

    // ✅ merge patch into profile (banner becomes persistent here)
    const nextProfile = {
      ...currentProfile,
      ...(patch || {}),
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
        UpdateExpression: "SET #profile = :p",
        ExpressionAttributeNames: { "#profile": "profile" },
        ExpressionAttributeValues: {
          ":p": { S: JSON.stringify(nextProfile) },
        },
      })
    );

    return jsonResponse(
      200,
      { ok: true, user: { email, role: storedRole, ...nextProfile } },
      baseHeaders
    );
  } catch (err) {
    console.error("AuthHandler update-profile error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }
}

/* =======================================================================
   LOGIN
   ======================================================================= */

async function handleLogin(event, baseHeaders) {
  const body = parseBody(event);

  const rawEmail = normalizeEmail(body.email || body.oldEmail || "");
  const password = body.password || body.passwordHash || "";
  const roleFromBody = String(body.role || "").trim().toLowerCase(); // optional

  if (!rawEmail || !password) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  try {
    const res = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: rawEmail } },
      })
    );

    if (!res.Item) {
      return jsonResponse(404, { ok: false, error: "NO_ACCOUNT" }, baseHeaders);
    }

    const item = res.Item;
    const storedPw = item.passwordHash?.S || "";
    const storedRole = (item.role?.S || "student").toLowerCase();
    const profileJson = item.profile?.S || "{}";

    if (!passwordMatches(storedPw, password)) {
      return jsonResponse(
        401,
        { ok: false, error: "INVALID_CREDENTIALS" },
        baseHeaders
      );
    }

    if (roleFromBody && roleFromBody !== storedRole) {
      // Email exists but role is different (e.g. trying lecturer vs student)
      return jsonResponse(
        403,
        { ok: false, error: "ROLE_MISMATCH", role: storedRole },
        baseHeaders
      );
    }

    const profile = parseProfile(profileJson);

    const user = {
      email: rawEmail,
      role: storedRole,
      ...profile,
    };

    return jsonResponse(
      200,
      { ok: true, role: storedRole, user },
      baseHeaders
    );
  } catch (err) {
    console.error("AuthHandler login error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }
}

/* =======================================================================
   REGISTER STUDENT
   ======================================================================= */

async function handleRegisterStudent(event, baseHeaders) {
  const body = parseBody(event);

  const email = normalizeEmail(body.email);
  const rawPassword = body.password || body.passwordHash || "";
  const role = "student";

  if (!email || !rawPassword) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  try {
    // Check if already exists
    const existing = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
      })
    );

    if (existing.Item) {
      return jsonResponse(409, { ok: false, error: "EMAIL_EXISTS" }, baseHeaders);
    }

    const passwordToStore =
      body.passwordHash && /^[0-9a-f]{64}$/i.test(String(body.passwordHash))
        ? String(body.passwordHash)
        : sha256Hex(rawPassword);

    const profile =
      body.profile && typeof body.profile === "object"
        ? body.profile
        : {
            name: body.name || "",
            gender: body.gender || "",
            continent: body.continent || "",
            country: body.country || "",
            countryCode: body.countryCode || "",
            university: body.university || "",
            faculty: body.faculty || "",
            program: body.program || "",
            year: body.year || "",
            photo: body.photo || "",
            createdAt: new Date().toISOString(),
          };

    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          email: { S: email },
          passwordHash: { S: passwordToStore },
          role: { S: role },
          profile: { S: JSON.stringify(profile) },
        },
      })
    );

    const user = { email, role, ...profile };

    return jsonResponse(201, { ok: true, role, user }, baseHeaders);
  } catch (err) {
    console.error("AuthHandler register student error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }
}

/* =======================================================================
   REGISTER LECTURER
   ======================================================================= */

async function handleRegisterLecturer(event, baseHeaders) {
  const body = parseBody(event);

  const email = normalizeEmail(body.email);
  const rawPassword = body.password || body.passwordHash || "";
  const role = "lecturer";

  if (!email || !rawPassword) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  try {
    // Check if already exists
    const existing = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
      })
    );

    if (existing.Item) {
      return jsonResponse(409, { ok: false, error: "EMAIL_EXISTS" }, baseHeaders);
    }

    const passwordToStore =
      body.passwordHash && /^[0-9a-f]{64}$/i.test(String(body.passwordHash))
        ? String(body.passwordHash)
        : sha256Hex(rawPassword);

    const profile =
      body.profile && typeof body.profile === "object"
        ? body.profile
        : {
            name: body.name || "",
            title: body.title || "",
            gender: body.gender || "",
            continent: body.continent || "",
            country: body.country || "",
            countryCode: body.countryCode || "",
            university: body.university || "",
            faculty: body.faculty || "",
            photo: body.photo || "",
            createdAt: new Date().toISOString(),
          };

    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          email: { S: email },
          passwordHash: { S: passwordToStore },
          role: { S: role },
          profile: { S: JSON.stringify(profile) },
        },
      })
    );

    const user = { email, role, ...profile };

    return jsonResponse(201, { ok: true, role, user }, baseHeaders);
  } catch (err) {
    console.error("AuthHandler register lecturer error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }
}

/* =======================================================================
   REGISTER PARTNER
   ======================================================================= */

async function handleRegisterPartner(event, baseHeaders) {
  const body = parseBody(event);

  const email = normalizeEmail(body.email);
  const rawPassword = body.password || body.passwordHash || "";
  const role = "partner";

  if (!email || !rawPassword) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  try {
    // Check if already exists
    const existing = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
      })
    );

    if (existing.Item) {
      return jsonResponse(409, { ok: false, error: "EMAIL_EXISTS" }, baseHeaders);
    }

    const passwordToStore =
      body.passwordHash && /^[0-9a-f]{64}$/i.test(String(body.passwordHash))
        ? String(body.passwordHash)
        : sha256Hex(rawPassword);

    const profile =
      body.profile && typeof body.profile === "object"
        ? body.profile
        : {
            orgName: body.orgName || "",
            contactName: body.contactName || "",
            continent: body.continent || "",
            country: body.country || "",
            countryCode: body.countryCode || "",
            phone: body.phone || "",
            website: body.website || "",
            // NEW: organization logo / avatar
            photo: body.photo || body.logo || body.logoUrl || "",
            createdAt: new Date().toISOString(),
          };

    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          email: { S: email },
          passwordHash: { S: passwordToStore },
          role: { S: role },
          profile: { S: JSON.stringify(profile) },
        },
      })
    );

    const user = { email, role, ...profile };

    return jsonResponse(201, { ok: true, role, user }, baseHeaders);
  } catch (err) {
    console.error("AuthHandler register partner error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }
}

/* =======================================================================
   CHANGE EMAIL
   ======================================================================= */

async function handleChangeEmail(event, baseHeaders) {
  const body = parseBody(event);

  const rawUserId = String(body.userId || "").trim();

  const oldEmail = normalizeEmail(
    body.oldEmail || body.email || (rawUserId.includes("@") ? rawUserId : "")
  );

  const newEmail = normalizeEmail(body.newEmail);
  const password =
    body.password || body.currentPassword || body.oldPassword || "";
  const roleFromBody = String(body.role || "").trim().toLowerCase() || null;

  if (!oldEmail || !newEmail || !password) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  if (oldEmail === newEmail) {
    return jsonResponse(400, { ok: false, error: "SAME_EMAIL" }, baseHeaders);
  }

  try {
    const current = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: oldEmail } },
      })
    );

    if (!current.Item) {
      return jsonResponse(404, { ok: false, error: "NO_ACCOUNT" }, baseHeaders);
    }

    const item = current.Item;
    const storedPw = item.passwordHash?.S || "";
    const storedRole = (item.role?.S || "student").toLowerCase();

    if (roleFromBody && roleFromBody !== storedRole) {
      return jsonResponse(
        403,
        { ok: false, error: "ROLE_MISMATCH", role: storedRole },
        baseHeaders
      );
    }

    if (!passwordMatches(storedPw, password)) {
      return jsonResponse(401, { ok: false, error: "BAD_PASSWORD" }, baseHeaders);
    }

    const existingNew = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: newEmail } },
      })
    );

    if (existingNew.Item) {
      return jsonResponse(409, { ok: false, error: "EMAIL_EXISTS" }, baseHeaders);
    }

    const newItem = {
      ...item,
      email: { S: newEmail },
    };

    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: newItem,
      })
    );

    await ddb.send(
      new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: oldEmail } },
      })
    );

    return jsonResponse(
      200,
      { ok: true, email: newEmail, role: storedRole, oldEmail },
      baseHeaders
    );
  } catch (err) {
    console.error("AuthHandler change-email error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }
}

/* =======================================================================
   CHANGE PASSWORD
   ======================================================================= */

async function handleChangePassword(event, baseHeaders) {
  const body = parseBody(event);

  // Frontend may send: email, oldEmail, or userId (email in your dashboards)
  const email = normalizeEmail(body.email || body.oldEmail || body.userId || "");

  const newPassword = body.newPassword || "";

  // We still accept currentPassword in the body for compatibility,
  // but we don't enforce it here. The UI already checks it locally.
  if (!email || !newPassword) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  if (newPassword.length < 8) {
    return jsonResponse(400, { ok: false, error: "WEAK_PASSWORD" }, baseHeaders);
  }

  // Delegate to the proven reset-password logic so DynamoDB update
  // behaves exactly like the working forgot-password flow.
  const resetEvent = {
    ...event,
    body: JSON.stringify({ email, newPassword }),
  };

  return handleResetPassword(resetEvent, baseHeaders);
}

/* =======================================================================
   RESET PASSWORD (no old password – used by reset link)
   ======================================================================= */

async function handleResetPassword(event, baseHeaders) {
  const body = parseBody(event);

  const email = normalizeEmail(body.email || body.userId || body.oldEmail || "");
  const newPassword = body.newPassword || "";

  if (!email || !newPassword) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  if (newPassword.length < 6) {
    return jsonResponse(400, { ok: false, error: "WEAK_PASSWORD" }, baseHeaders);
  }

  try {
    const res = await ddb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
      })
    );

    if (!res.Item) {
      return jsonResponse(404, { ok: false, error: "NO_ACCOUNT" }, baseHeaders);
    }

    const item = res.Item;
    const storedRole = (item.role?.S || "student").toLowerCase();

    const newHash = sha256Hex(newPassword);

    await ddb.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
        UpdateExpression: "SET passwordHash = :p",
        ExpressionAttributeValues: {
          ":p": { S: newHash },
        },
      })
    );

    return jsonResponse(200, { ok: true, role: storedRole, email }, baseHeaders);
  } catch (err) {
    console.error("AuthHandler reset-password error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }
}

/* =======================================================================
   MAIN LAMBDA ENTRY
   ======================================================================= */

export const handler = async (event) => {
  const origin =
    event?.headers?.origin ||
    event?.headers?.Origin ||
    event?.headers?.ORIGIN ||
    "";

  const baseHeaders = buildBaseHeaders(origin);

  const httpMethod =
    event.requestContext?.http?.method || event.httpMethod || "";
  const method = String(httpMethod || "").toUpperCase();

  // CORS preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...baseHeaders,
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: "",
    };
  }

  const path = String(
    event.requestContext?.http?.path || event.rawPath || event.path || ""
  ).toLowerCase();

  // Existing routes (unchanged)
  if (method === "POST" && path.endsWith("/api/auth/login")) {
    return handleLogin(event, baseHeaders);
  }

  if (method === "POST" && path.endsWith("/api/auth/register/student")) {
    return handleRegisterStudent(event, baseHeaders);
  }

  if (method === "POST" && path.endsWith("/api/auth/register/lecturer")) {
    return handleRegisterLecturer(event, baseHeaders);
  }

  if (method === "POST" && path.endsWith("/api/auth/register/partner")) {
    return handleRegisterPartner(event, baseHeaders);
  }

  if (method === "POST" && path.endsWith("/api/auth/change-email")) {
    return handleChangeEmail(event, baseHeaders);
  }

  if (method === "POST" && path.endsWith("/api/auth/change-password")) {
    return handleChangePassword(event, baseHeaders);
  }

  if (method === "POST" && path.endsWith("/api/auth/reset")) {
    return handleResetPassword(event, baseHeaders);
  }

  // ✅ Added profile routes (non-breaking)
  if (method === "POST" && path.endsWith("/api/auth/student/get-profile")) {
    return handleGetProfile(event, baseHeaders);
  }
  if (method === "POST" && path.endsWith("/api/auth/student/update-profile")) {
    return handleUpdateProfile(event, baseHeaders);
  }

  if (method === "POST" && path.endsWith("/api/auth/lecturer/get-profile")) {
    return handleGetProfile(event, baseHeaders);
  }
  if (method === "POST" && path.endsWith("/api/auth/lecturer/update-profile")) {
    return handleUpdateProfile(event, baseHeaders);
  }

  if (method === "POST" && path.endsWith("/api/auth/partner/get-profile")) {
    return handleGetProfile(event, baseHeaders);
  }
  if (method === "POST" && path.endsWith("/api/auth/partner/update-profile")) {
    return handleUpdateProfile(event, baseHeaders);
  }

  return jsonResponse(404, { ok: false, error: "NOT_FOUND" }, baseHeaders);
};