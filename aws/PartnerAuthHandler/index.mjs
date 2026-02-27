// aws/PartnerAuthHandler/index.mjs
// ✅ Partner-only auth (DynamoDB-backed), with optional best-effort Cognito mirror for REGISTER only
// ✅ Non-breaking updates in this version:
// - Adds POST /api/auth/forgot  (partner)  -> returns ok:true (no enumeration)
// - Adds POST /api/auth/reset   (partner)  -> updates passwordHash in DynamoDB
// - Keeps ALL existing partner routes/logic unchanged

import crypto from "crypto";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

// ✅ Cognito (best-effort mirror)
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

/**
 * DynamoDB table env var:
 * Keep partner logic unchanged, but allow common env keys + safe default.
 */
const TABLE =
  process.env.USER_TABLE_NAME ||
  process.env.USERS_TABLE ||
  process.env.USER_TABLE ||
  "ScholarsUsers";

const REGION = process.env.AWS_REGION || "us-east-1";
const db = new DynamoDBClient({ region: REGION });

// ✅ Cognito (optional / best-effort)
const COGNITO_USER_POOL_ID = String(process.env.COGNITO_USER_POOL_ID || "").trim();
const COGNITO_APP_CLIENT_ID = String(process.env.COGNITO_APP_CLIENT_ID || "").trim(); // not required for AdminCreateUser, kept for consistency
const COGNITO_ENABLED = !!COGNITO_USER_POOL_ID;

const cognito = new CognitoIdentityProviderClient({ region: REGION });

async function cognitoCreatePartnerBestEffort(email, plainPassword, displayName) {
  const emailNorm = String(email || "").trim().toLowerCase();
  const pw = String(plainPassword || "");
  const name = String(displayName || "").trim();

  if (!COGNITO_ENABLED) {
    console.log("[register-partner] Cognito disabled (missing COGNITO_USER_POOL_ID)");
    return;
  }
  if (!emailNorm) {
    console.log("[register-partner] Cognito skip: missing email");
    return;
  }
  if (!pw) {
    console.log("[register-partner] Cognito skip: missing plain password");
    return;
  }

  try {
    console.log("[register-partner] attempting cognito create for", emailNorm);

    // Create user (suppress Cognito email — you already use Resend/VerifyGate)
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: emailNorm,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: emailNorm },
          { Name: "email_verified", Value: "true" },
          ...(name ? [{ Name: "name", Value: name }] : []),
        ],
      })
    );

    // Set permanent password so Cognito login is possible immediately
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: emailNorm,
        Password: pw,
        Permanent: true,
      })
    );

    console.log("[register-partner] cognito user created:", emailNorm);
  } catch (e) {
    // ✅ Correct detection: use e.name, not message includes(...)
    const ename = String(e?.name || "");
    if (ename === "UsernameExistsException") {
      console.warn("[register-partner] cognito user already exists:", emailNorm);
      return;
    }
    console.warn("[register-partner] cognito error:", ename, String(e?.message || e));
  }
}

/**
 * ✅ CORS helper (unchanged behavior)
 */
const ALLOWED_ORIGINS = new Set([
  "https://scholarsknowledge.com",
  "https://www.scholarsknowledge.com",
  "http://localhost:5176",
]);

function getHeader(event, name) {
  const h = event?.headers || {};
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()] || "";
}

function getOrigin(event) {
  return String(getHeader(event, "origin") || "").trim();
}

function corsHeaders(event) {
  const origin = getOrigin(event);
  const isAllowed = origin && ALLOWED_ORIGINS.has(origin);

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (isAllowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

function json(event, statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify(body),
  };
}

function sha256Hex(str) {
  return crypto.createHash("sha256").update(String(str || "")).digest("hex");
}

function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "";
}

function getPath(event) {
  return event?.requestContext?.http?.path || event?.rawPath || event?.path || "";
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

function normalizeUrlOrEmpty(v) {
  const s = String(v || "").trim();
  return s ? s : "";
}

function isLikelyTooLargeDataUrl(url) {
  const s = String(url || "");
  return s.startsWith("data:") && s.length > 250_000;
}

export const handler = async (event) => {
  console.log(
    "[PartnerAuthHandler] method=",
    getMethod(event),
    "path=",
    getPath(event),
    "origin=",
    getOrigin(event)
  );

  try {
    const method = getMethod(event);
    const path = String(getPath(event) || "");

    // Preflight
    if (method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders(event),
        body: "",
      };
    }

    if (method !== "POST") {
      return json(event, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    const body = safeJsonParse(event.body);

    const isRegister =
      path === "/api/auth/register/partner" || path.endsWith("/api/auth/register/partner");

    const isLogin =
      path === "/api/auth/login/partner" || path.endsWith("/api/auth/login/partner");

    const isChangePassword =
      path === "/api/auth/change-password" || path.endsWith("/api/auth/change-password");

    const isGetProfile =
      path === "/api/auth/partner/get-profile" || path.endsWith("/api/auth/partner/get-profile");

    const isUpdateProfile =
      path === "/api/auth/partner/update-profile" || path.endsWith("/api/auth/partner/update-profile");

    // ✅ NEW (partner forgot + reset)
    const isForgot =
      path === "/api/auth/forgot" || path.endsWith("/api/auth/forgot");

    const isReset =
      path === "/api/auth/reset" || path.endsWith("/api/auth/reset");

    if (
      !isRegister &&
      !isLogin &&
      !isChangePassword &&
      !isGetProfile &&
      !isUpdateProfile &&
      !isForgot &&
      !isReset
    ) {
      return json(event, 404, { ok: false, error: "ROUTE_NOT_FOUND", path });
    }

    /* =========================
       REGISTER: /api/auth/register/partner
       ========================= */
    if (isRegister) {
      const email = String(body.email || "").trim().toLowerCase();
      const contactName = String(body.contactName || "").trim();

      const organization = String(
        body.organization || body.orgName || body.org || body.organizationName || ""
      ).trim();

      const passwordPlain = String(body.password || "");
      const passwordHashIncoming = String(body.passwordHash || "");
      const role = String(body.role || "partner");

      // NOTE: your frontend uses photo/banner, but backend expects logoUrl/bannerUrl.
      // Keeping as-is to avoid breaking anything; you can map later if you want.
      const logoUrl = normalizeUrlOrEmpty(body.logoUrl || body.avatarUrl || "");
      const bannerUrl = normalizeUrlOrEmpty(body.bannerUrl || "");

      if (!email || !organization || (!passwordPlain && !passwordHashIncoming)) {
        return json(event, 400, { ok: false, error: "MISSING_FIELDS" });
      }

      if (isLikelyTooLargeDataUrl(logoUrl) || isLikelyTooLargeDataUrl(bannerUrl)) {
        return json(event, 400, { ok: false, error: "IMAGE_TOO_LARGE_USE_URL" });
      }

      const existing = await db.send(
        new GetItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
        })
      );

      if (existing.Item) {
        return json(event, 409, { ok: false, error: "EMAIL_EXISTS" });
      }

      const userId = `partner:${crypto.randomUUID()}`;

      const storedPasswordHash = passwordHashIncoming
        ? String(passwordHashIncoming)
        : sha256Hex(passwordPlain);

      const item = {
        email: { S: email },
        userId: { S: userId },
        role: { S: role },
        passwordHash: { S: storedPasswordHash },
        organization: { S: organization },
        contactName: { S: contactName },
        createdAt: { S: new Date().toISOString() },
        status: { S: "active" },
      };

      if (logoUrl) item.logoUrl = { S: logoUrl };
      if (bannerUrl) item.bannerUrl = { S: bannerUrl };

      await db.send(
        new PutItemCommand({
          TableName: TABLE,
          Item: item,
          ConditionExpression: "attribute_not_exists(email)",
        })
      );

      // ✅ Best-effort Cognito create (does NOT block signup if Cognito fails)
      console.log(
        "[register-partner] COGNITO_ENABLED=",
        COGNITO_ENABLED,
        "hasPassword=",
        !!passwordPlain
      );
      await cognitoCreatePartnerBestEffort(email, passwordPlain, contactName || organization);

      return json(event, 201, {
        ok: true,
        user: { email, userId, role, organization, contactName, logoUrl, bannerUrl },
      });
    }

    /* =========================
       LOGIN: /api/auth/login/partner
       ========================= */
    if (isLogin) {
      const email = String(body.email || "").trim().toLowerCase();
      const passwordPlain = String(body.password || "");
      const passwordHashIncoming = String(body.passwordHash || "");

      if (!email || (!passwordPlain && !passwordHashIncoming)) {
        return json(event, 400, { ok: false, error: "MISSING_FIELDS" });
      }

      const found = await db.send(
        new GetItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
        })
      );

      if (!found.Item) {
        return json(event, 401, { ok: false, error: "INVALID_CREDENTIALS" });
      }

      const storedHash = String(found.Item.passwordHash?.S || "");
      const incomingHash = passwordHashIncoming
        ? String(passwordHashIncoming)
        : sha256Hex(passwordPlain);

      if (!storedHash || storedHash !== incomingHash) {
        return json(event, 401, { ok: false, error: "INVALID_CREDENTIALS" });
      }

      const role = String(found.Item.role?.S || "partner");

      return json(event, 200, {
        ok: true,
        user: {
          email,
          userId: String(found.Item.userId?.S || ""),
          role,
          organization: String(found.Item.organization?.S || ""),
          contactName: String(found.Item.contactName?.S || ""),
          phone: String(found.Item.phone?.S || ""),
          website: String(found.Item.website?.S || ""),
          logoUrl: String(found.Item.logoUrl?.S || ""),
          bannerUrl: String(found.Item.bannerUrl?.S || ""),
        },
      });
    }

    /* =========================
       FORGOT: /api/auth/forgot  (partner)
       Body: { email }
       - Always returns ok:true to avoid enumeration.
       - Your Resend email flow can be elsewhere; this keeps API consistent.
       ========================= */
    if (isForgot) {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json(event, 400, { ok: false, error: "MISSING_FIELDS" });

      // Optional existence check for logs only (still ok:true either way)
      try {
        const found = await db.send(
          new GetItemCommand({ TableName: TABLE, Key: { email: { S: email } } })
        );
        console.log("[partner-forgot] exists=", !!found.Item, "email=", email);
      } catch (e) {
        console.warn("[partner-forgot] ddb read failed:", String(e?.message || e));
      }

      return json(event, 200, { ok: true });
    }

    /* =========================
       RESET: /api/auth/reset  (partner, DynamoDB-only)
       Body: { email, newPassword } (also accepts { email, password })
       - Updates passwordHash in DynamoDB.
       ========================= */
    if (isReset) {
      const email = String(body.email || "").trim().toLowerCase();
      const newPassword = String(body.newPassword || body.password || "");

      if (!email || !newPassword) {
        return json(event, 400, { ok: false, error: "MISSING_FIELDS" });
      }

      if (newPassword.length < 6) {
        return json(event, 400, { ok: false, error: "WEAK_PASSWORD" });
      }

      const found = await db.send(
        new GetItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
        })
      );

      if (!found.Item) {
        return json(event, 404, { ok: false, error: "NOT_FOUND" });
      }

      const newHash = sha256Hex(newPassword);

      await db.send(
        new UpdateItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
          UpdateExpression: "SET passwordHash = :h",
          ExpressionAttributeValues: { ":h": { S: newHash } },
        })
      );

      return json(event, 200, { ok: true });
    }

    /* =========================
       GET PROFILE: /api/auth/partner/get-profile
       ========================= */
    if (isGetProfile) {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json(event, 400, { ok: false, error: "MISSING_FIELDS" });

      const found = await db.send(
        new GetItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
        })
      );

      if (!found.Item) return json(event, 404, { ok: false, error: "NOT_FOUND" });

      const role = String(found.Item.role?.S || "partner");

      return json(event, 200, {
        ok: true,
        user: {
          email,
          userId: String(found.Item.userId?.S || ""),
          role,
          organization: String(found.Item.organization?.S || ""),
          contactName: String(found.Item.contactName?.S || ""),
          phone: String(found.Item.phone?.S || ""),
          website: String(found.Item.website?.S || ""),
          logoUrl: String(found.Item.logoUrl?.S || ""),
          bannerUrl: String(found.Item.bannerUrl?.S || ""),
        },
      });
    }

    /* =========================
       UPDATE PROFILE: /api/auth/partner/update-profile
       ========================= */
    if (isUpdateProfile) {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json(event, 400, { ok: false, error: "MISSING_FIELDS" });

      const found = await db.send(
        new GetItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
        })
      );

      if (!found.Item) return json(event, 404, { ok: false, error: "NOT_FOUND" });

      const storedRole = String(found.Item.role?.S || "partner");
      const storedUserId = String(found.Item.userId?.S || "");
      const storedHash = String(found.Item.passwordHash?.S || "");

      const providedUserId = String(body.userId || "");
      const currentPassword = String(body.currentPassword || "");
      const passwordHashIncoming = String(body.passwordHash || "");

      let authorized = false;
      if (currentPassword && storedHash && sha256Hex(currentPassword) === storedHash) authorized = true;
      if (!authorized && passwordHashIncoming && storedHash && passwordHashIncoming === storedHash) authorized = true;
      if (!authorized && providedUserId && storedUserId && providedUserId === storedUserId) authorized = true;

      if (!authorized) {
        return json(event, 401, { ok: false, error: "UNAUTHORIZED" });
      }

      const organization = String(
        body.organization || body.orgName || body.org || body.organizationName || ""
      ).trim();

      const contactName = String(body.contactName || "").trim();
      const phone = String(body.phone || "").trim();
      const website = String(body.website || "").trim();
      const logoUrl = normalizeUrlOrEmpty(body.logoUrl || body.avatarUrl || "");
      const bannerUrl = normalizeUrlOrEmpty(body.bannerUrl || "");

      if (isLikelyTooLargeDataUrl(logoUrl) || isLikelyTooLargeDataUrl(bannerUrl)) {
        return json(event, 400, { ok: false, error: "IMAGE_TOO_LARGE_USE_URL" });
      }

      const sets = [];
      const names = {};
      const values = {};

      function addStr(fieldName, attrName, val) {
        if (typeof val !== "string") return;
        names[`#${attrName}`] = fieldName;
        values[`:${attrName}`] = { S: val };
        sets.push(`#${attrName} = :${attrName}`);
      }

      addStr("organization", "org", organization);
      addStr("contactName", "cn", contactName);
      addStr("phone", "ph", phone);
      addStr("website", "web", website);
      addStr("logoUrl", "logo", logoUrl);
      addStr("bannerUrl", "ban", bannerUrl);

      if (!sets.length) {
        return json(event, 200, {
          ok: true,
          user: {
            email,
            userId: storedUserId,
            role: storedRole,
            organization: String(found.Item.organization?.S || ""),
            contactName: String(found.Item.contactName?.S || ""),
            phone: String(found.Item.phone?.S || ""),
            website: String(found.Item.website?.S || ""),
            logoUrl: String(found.Item.logoUrl?.S || ""),
            bannerUrl: String(found.Item.bannerUrl?.S || ""),
          },
        });
      }

      sets.push(`#ua = :ua`);
      names["#ua"] = "updatedAt";
      values[":ua"] = { S: new Date().toISOString() };

      await db.send(
        new UpdateItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
          UpdateExpression: `SET ${sets.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        })
      );

      return json(event, 200, {
        ok: true,
        user: {
          email,
          userId: storedUserId,
          role: storedRole,
          organization,
          contactName,
          phone,
          website,
          logoUrl,
          bannerUrl,
        },
      });
    }

    /* =========================
       CHANGE PASSWORD: /api/auth/change-password
       ========================= */
    if (isChangePassword) {
      const email = String(body.email || "").trim().toLowerCase();
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      const role = String(body.role || "partner");

      if (!email || !currentPassword || !newPassword) {
        return json(event, 400, { ok: false, error: "MISSING_FIELDS" });
      }

      if (newPassword.length < 6) {
        return json(event, 400, { ok: false, error: "WEAK_PASSWORD" });
      }

      const found = await db.send(
        new GetItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
        })
      );

      if (!found.Item) {
        return json(event, 404, { ok: false, error: "NOT_FOUND" });
      }

      const storedRole = String(found.Item.role?.S || "partner");
      if (role && storedRole && storedRole !== role) {
        return json(event, 403, { ok: false, error: "ROLE_MISMATCH" });
      }

      const storedHash = String(found.Item.passwordHash?.S || "");
      const incomingHash = sha256Hex(currentPassword);

      if (!storedHash || storedHash !== incomingHash) {
        return json(event, 401, { ok: false, error: "BAD_PASSWORD" });
      }

      const newHash = sha256Hex(newPassword);

      await db.send(
        new UpdateItemCommand({
          TableName: TABLE,
          Key: { email: { S: email } },
          UpdateExpression: "SET passwordHash = :h",
          ExpressionAttributeValues: { ":h": { S: newHash } },
        })
      );

      return json(event, 200, { ok: true, email, role: storedRole });
    }

    return json(event, 500, { ok: false, error: "UNREACHABLE" });
  } catch (err) {
    console.error("Partner auth error:", err);
    return json(event, 500, { ok: false, error: "INTERNAL_SERVER_ERROR" });
  }
};