
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

import crypto from "crypto";
const TABLE_NAME = process.env.USERS_TABLE || "ScholarsUsers";
const ddb = new DynamoDBClient({});
const SESSION_ABSOLUTE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
import supertokens from "supertokens-node/index.js";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import Session from "supertokens-node/recipe/session/index.js";
/*import { middleware } from "supertokens-node/framework/awsLambda/index.js";
import {AWSRequest,AWSResponse,} from "supertokens-node/framework/awsLambda/index.js";*/
import {middleware,wrapRequest,wrapResponse,} from "supertokens-node/framework/awsLambda/index.js";


supertokens.init({
  framework: "awsLambda",
  supertokens: {
    connectionURI:
      process.env.SUPERTOKENS_CONNECTION_URI || "http://172.31.27.14:3567",
  },
  appInfo: {
    appName: "ScholarsKnowledge",
    apiDomain: "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com",
    websiteDomain: "http://localhost:5176",
    /*apiBasePath: "/default/api/auth-st",*/
    apiBasePath: "/api/auth-st",
    websiteBasePath: "/auth-st-test",
  },
  /*recipeList: [EmailPassword.init()],*/
  recipeList: [
    EmailPassword.init(),
    Session.init({
      cookieSecure: true,
      cookieSameSite: "none",
      antiCsrf: "VIA_CUSTOM_HEADER",

      override: {
        functions: (originalImplementation) => ({
          ...originalImplementation,

          // Enforce absolute expiration during token refresh.
          refreshSession: async function (input) {
            const session =
              await originalImplementation.refreshSession(input);

            const sessionData =
              await session.getSessionDataFromDatabase();

            const absoluteExpiresAt =
              sessionData?.absoluteExpiresAt;

            if (
              !Number.isSafeInteger(absoluteExpiresAt) ||
              absoluteExpiresAt <= Date.now()
            ) {
              await session.revokeSession();

              throw new Session.Error({
                message: "SESSION_EXPIRED",
                type: Session.Error.UNAUTHORISED,
                payload: { clearTokens: true },
              });
            }

            return session;
          },

          // Enforce absolute expiration during session verification.
          getSession: async function (input) {
            const session =
              await originalImplementation.getSession(input);

            if (!session) {
              return session;
            }

            const sessionData =
              await session.getSessionDataFromDatabase();

            const absoluteExpiresAt =
              sessionData?.absoluteExpiresAt;

            if (
              !Number.isSafeInteger(absoluteExpiresAt) ||
              absoluteExpiresAt <= Date.now()
            ) {
              await session.revokeSession();

              throw new Session.Error({
                message: "SESSION_EXPIRED",
                type: Session.Error.UNAUTHORISED,
                payload: { clearTokens: true },
              });
            }

            return session;
          },
        }),
      },
    }),
  ],
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5176",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,st-auth-mode,rid,fdi-version,anti-csrf",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function body(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return {};
  }
}

function getSessionWrappers(event) {
  const existingResponse = event.supertokens?.response;

  if (!existingResponse) {
    throw new Error("SUPERTOKENS_MIDDLEWARE_NOT_INITIALIZED");
  }

  const req = wrapRequest(event);
  const res = wrapResponse(event);

  // Preserve headers and cookies initialized by middleware.
  const newResponse = event.supertokens.response;

  newResponse.headers = [
    ...(existingResponse.headers || []),
    ...(newResponse.headers || []),
  ];

  newResponse.cookies = [
    ...(existingResponse.cookies || []),
    ...(newResponse.cookies || []),
  ];

  return { req, res };
}
/*async function createAuthSession(event, recipeUserId, role) {*/
async function createAuthSession(event, recipeUserId, role, email) {
  if (
    !recipeUserId ||
    typeof recipeUserId.getAsString !== "function"
  ) {
    throw new Error("INVALID_RECIPE_USER_ID");
  }

  const { req, res } = getSessionWrappers(event);

  /*const sessionCreatedAt = Date.now();
  const absoluteExpiresAt =
    sessionCreatedAt + SESSION_ABSOLUTE_LIFETIME_MS;*/
    const sessionCreatedAt = Date.now();

const sessionLifetimeMs = SESSION_ABSOLUTE_LIFETIME_MS;

const absoluteExpiresAt = sessionCreatedAt + sessionLifetimeMs;

  await Session.createNewSession(
    req,
    res,
    "public",
    recipeUserId,
    {
      role,
      sessionCreatedAt,
      absoluteExpiresAt,
    },
    {
      sessionCreatedAt,
      absoluteExpiresAt,
    }
  );
}

function parseProfile(x) {
  try {
    return JSON.parse(x || "{}");
  } catch {
    return {};
  }
}

function sha256Hex(str) {
  return crypto.createHash("sha256").update(String(str || "")).digest("hex");
}

function passwordMatches(stored, candidate) {
  if (!stored || !candidate) return false;

  const s = String(stored).trim();
  const p = String(candidate).trim();

  if (s === p) return true;

  if (s.length === 64 && /^[0-9a-f]+$/i.test(s)) {
    return sha256Hex(p) === s;
  }

  return false;
}


/*export const handler = async (event) => {*/
const customHandler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "";
  const path =
    event.requestContext?.http?.path || event.rawPath || event.path || "";

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  if (method === "POST" && path.endsWith("/api/auth-st/register")) {
  const b = body(event);

  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const role = String(b.role || "student").trim().toLowerCase();

  if (!email || !password) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  if (!["student", "lecturer", "partner"].includes(role)) {
    return json(400, { ok: false, error: "INVALID_ROLE" });
  }

  const result = await EmailPassword.signUp("public", email, password);

  if (result.status === "EMAIL_ALREADY_EXISTS_ERROR") {
    return json(409, { ok: false, error: "EMAIL_EXISTS", raw: result });
  }

  if (result.status !== "OK") {
    return json(400, { ok: false, error: "REGISTER_FAILED", raw: result });
  }

  const userId =
    result.user?.id ||
    result.recipeUserId?.recipeUserId ||
    email;

  const baseProfile =
    b.profile && typeof b.profile === "object" ? b.profile : {};

  const profile =
    role === "partner"
      ? {
          orgName: b.orgName || baseProfile.orgName || "",
          contactName: b.contactName || baseProfile.contactName || "",
          email,
          role,
          logoUrl: b.logoUrl || baseProfile.logoUrl || "",
          bannerUrl: b.bannerUrl || baseProfile.bannerUrl || "",
          photo: b.photo || b.logoUrl || baseProfile.photo || baseProfile.logoUrl || "",
          photoUrl: b.photoUrl || b.logoUrl || baseProfile.photoUrl || baseProfile.logoUrl || "",
          createdAt: baseProfile.createdAt || new Date().toISOString(),
          ...baseProfile,
        }
      : role === "lecturer"
      ? {
          title: b.title || baseProfile.title || "",
          name: b.name || baseProfile.name || "",
          fullName: b.fullName || baseProfile.fullName || b.name || baseProfile.name || "",
          gender: b.gender || baseProfile.gender || "",
          email,
          role,
          continent: b.continent || baseProfile.continent || "",
          country: b.country || baseProfile.country || "",
          countryCode: b.countryCode || baseProfile.countryCode || "",
          university: b.university || baseProfile.university || "",
          faculty: b.faculty || baseProfile.faculty || "",
          scopeKey: b.scopeKey || baseProfile.scopeKey || "",
          gsi_scopeRole: b.gsi_scopeRole || b.gsiScopeRole || baseProfile.gsi_scopeRole || "",
          photo: b.photo || baseProfile.photo || baseProfile.photoUrl || "",
          photoUrl: b.photoUrl || b.photo || baseProfile.photoUrl || baseProfile.photo || "",
          createdAt: baseProfile.createdAt || new Date().toISOString(),
          ...baseProfile,
        }
      : {
          name: b.name || baseProfile.name || "",
          fullName: b.fullName || baseProfile.fullName || b.name || baseProfile.name || "",
          studentName:
            b.studentName || baseProfile.studentName || b.name || baseProfile.name || "",
          gender: b.gender || baseProfile.gender || "",
          email,
          role,
          continent: b.continent || baseProfile.continent || "",
          country: b.country || baseProfile.country || "",
          countryCode: b.countryCode || baseProfile.countryCode || "",
          university: b.university || baseProfile.university || "",
          faculty: b.faculty || baseProfile.faculty || "",
          program: b.program || baseProfile.program || "",
          year: b.year || baseProfile.year || "",
          scopeKey: b.scopeKey || baseProfile.scopeKey || "",
          photo: b.photo || baseProfile.photo || baseProfile.photoUrl || "",
          photoUrl: b.photoUrl || b.photo || baseProfile.photoUrl || baseProfile.photo || "",
          createdAt: baseProfile.createdAt || new Date().toISOString(),
          ...baseProfile,
        };

  profile.supertokensUserId = userId;
  profile.authProvider = "supertokens";

  const item = {
    email: { S: email },
    role: { S: role },
    profile: { S: JSON.stringify(profile) },
    supertokensUserId: { S: userId },
  };

  const scopeKey = String(b.scopeKey || profile.scopeKey || "").trim();
  const gsiScopeRole = String(
    b.gsi_scopeRole || b.gsiScopeRole || profile.gsi_scopeRole || ""
  ).trim();

  if (scopeKey) item.scopeKey = { S: scopeKey };
  if (gsiScopeRole) item.gsi_scopeRole = { S: gsiScopeRole };

  try {
    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
  } catch (err) {
    console.error("DDB ERROR:", err);
    throw err;
  }

  return json(201, {
    ok: true,
    userId,
    email,
    role,
    user: {
      id: userId,
      uid: userId,
      email,
      role,
      ...profile,
    },
    raw: result,
  });
}

/*if (method === "POST" && path.endsWith("/api/auth-st/register/student")) {
  event.body = JSON.stringify({ ...body(event), role: "student" });
  event.requestContext.http.path = "/default/api/auth-st/register";
  return handler(event);
}

if (method === "POST" && path.endsWith("/api/auth-st/register/lecturer")) {
  event.body = JSON.stringify({ ...body(event), role: "lecturer" });
  event.requestContext.http.path = "/default/api/auth-st/register";
  return handler(event);
}

if (method === "POST" && path.endsWith("/api/auth-st/register/partner")) {
  event.body = JSON.stringify({ ...body(event), role: "partner" });
  event.requestContext.http.path = "/default/api/auth-st/register";
  return handler(event);
}*/
if (method === "POST" && path.endsWith("/api/auth-st/register/student")) {
  event.body = JSON.stringify({ ...body(event), role: "student" });
  event.requestContext.http.path = "/default/api/auth-st/register";
  return customHandler(event);
}

if (method === "POST" && path.endsWith("/api/auth-st/register/lecturer")) {
  event.body = JSON.stringify({ ...body(event), role: "lecturer" });
  event.requestContext.http.path = "/default/api/auth-st/register";
  return customHandler(event);
}

if (method === "POST" && path.endsWith("/api/auth-st/register/partner")) {
  event.body = JSON.stringify({ ...body(event), role: "partner" });
  event.requestContext.http.path = "/default/api/auth-st/register";
  return customHandler(event);
}


if (method === "POST" && path.endsWith("/api/auth-st/change-password")) {
  const b = body(event);

  const email = String(b.email || "").trim().toLowerCase();
  const currentPassword = String(b.currentPassword || "");
  const newPassword = String(b.newPassword || "");

  if (!email || !currentPassword || !newPassword) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  const signInResult = await EmailPassword.signIn(
    "public",
    email,
    currentPassword
  );

  if (signInResult.status !== "OK") {
    return json(401, { ok: false, error: "CURRENT_PASSWORD_INCORRECT" });
  }

  const userId =
    signInResult.user?.id ||
    signInResult.recipeUserId?.recipeUserId ||
    "";

  if (!userId) {
    return json(400, { ok: false, error: "MISSING_USER_ID" });
  }

  const tokenResult = await EmailPassword.createResetPasswordToken(
    "public",
    userId,
    email
  );

  if (tokenResult.status !== "OK") {
    return json(400, {
      ok: false,
      error: "CHANGE_PASSWORD_TOKEN_FAILED",
      raw: tokenResult,
    });
  }

  const resetResult = await EmailPassword.resetPasswordUsingToken(
    "public",
    tokenResult.token,
    newPassword
  );

  if (resetResult.status !== "OK") {
    return json(400, {
      ok: false,
      error: "CHANGE_PASSWORD_FAILED",
      raw: resetResult,
    });
  }

  return json(200, {
    ok: true,
    message: "PASSWORD_CHANGED",
  });
}

/* ✅ ADD MIGRATION ROUTE HERE */

if (method === "POST" && path.endsWith("/api/auth-st/migrate-login")) {
  const b = body(event);

  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const requestedRole = String(b.role || "").trim().toLowerCase();

  if (!email || !password) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  const db = await ddb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: email } },
    })
  );

  if (!db.Item) {
    return json(404, { ok: false, error: "NO_PROFILE" });
  }

  const storedRole = String(db.Item.role?.S || "student").toLowerCase();

  if (requestedRole && requestedRole !== storedRole) {
    return json(403, {
      ok: false,
      error: "ROLE_MISMATCH",
      role: storedRole,
    });
  }

  const storedPw = db.Item.passwordHash?.S || "";
  if (!passwordMatches(storedPw, password)) {
    return json(401, { ok: false, error: "INVALID_CREDENTIALS" });
  }

  let supertokensUserId =
    db.Item.supertokensUserId?.S ||
    parseProfile(db.Item.profile?.S)?.supertokensUserId ||
    "";

  let signInResult = null;

  if (!supertokensUserId) {
    const signUpResult = await EmailPassword.signUp("public", email, password);

    if (
      signUpResult.status !== "OK" &&
      signUpResult.status !== "EMAIL_ALREADY_EXISTS_ERROR"
    ) {
      return json(400, {
        ok: false,
        error: "SUPERTOKENS_SIGNUP_FAILED",
        raw: signUpResult,
      });
    }

    signInResult = await EmailPassword.signIn("public", email, password);

    if (signInResult.status !== "OK") {
      return json(401, {
        ok: false,
        error: "SUPERTOKENS_SIGNIN_FAILED_AFTER_MIGRATION",
        raw: signInResult,
      });
    }

    supertokensUserId =
      signInResult.user?.id ||
      signInResult.recipeUserId?.recipeUserId ||
      signUpResult.user?.id ||
      signUpResult.recipeUserId?.recipeUserId ||
      email;

    const oldProfile = parseProfile(db.Item.profile?.S);
    const nextProfile = {
      ...oldProfile,
      email,
      role: storedRole,
      authProvider: "supertokens",
      supertokensUserId,
      migratedToSuperTokensAt: new Date().toISOString(),
    };

    await ddb.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { email: { S: email } },
        UpdateExpression:
          "SET supertokensUserId = :sid, authProvider = :ap, profile = :p",
        ExpressionAttributeValues: {
          ":sid": { S: supertokensUserId },
          ":ap": { S: "supertokens" },
          ":p": { S: JSON.stringify(nextProfile) },
        },
      })
    );
  } else {
    signInResult = await EmailPassword.signIn("public", email, password);

    if (signInResult.status !== "OK") {
      return json(401, {
        ok: false,
        error: "INVALID_SUPERTOKENS_CREDENTIALS",
        raw: signInResult,
      });
    }
  }

  const finalDb = await ddb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: email } },
    })
  );

  const profile = parseProfile(finalDb.Item?.profile?.S);

  const recipeUserId = signInResult?.recipeUserId;

if (!recipeUserId) {
  return json(500, {
    ok: false,
    error: "MISSING_RECIPE_USER_ID",
  });
}

/*await createAuthSession(event, recipeUserId, storedRole);*/
await createAuthSession(event, recipeUserId, storedRole, email);

  return json(200, {
    ok: true,
    migrated: !db.Item.supertokensUserId?.S,
    userId: supertokensUserId,
    email,
    role: storedRole,
    user: {
      id: supertokensUserId,
      uid: supertokensUserId,
      email,
      role: storedRole,
      ...profile,
    },
  });
}

/* ✅ EXISTING LOGIN ROUTE STAYS BELOW */




if (method === "POST" && path.endsWith("/api/auth-st/login")) {
  const b = body(event);

  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const requestedRole = String(b.role || "").trim().toLowerCase();

  if (!email || !password) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  const result = await EmailPassword.signIn("public", email, password);

  if (result.status !== "OK") {
    return json(401, { ok: false, error: "INVALID_CREDENTIALS", raw: result });
  }

  const db = await ddb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: email } },
    })
  );

  if (!db.Item) {
    return json(404, { ok: false, error: "NO_PROFILE" });
  }

  const role = String(db.Item.role?.S || "student").toLowerCase();

  if (requestedRole && requestedRole !== role) {
    return json(403, { ok: false, error: "ROLE_MISMATCH", role });
  }

  const profile = parseProfile(db.Item.profile?.S);

  const userId =
    db.Item.supertokensUserId?.S ||
    result.user?.id ||
    result.recipeUserId?.recipeUserId ||
    email;

    const recipeUserId = result.recipeUserId;

if (!recipeUserId) {
  return json(500, {
    ok: false,
    error: "MISSING_RECIPE_USER_ID",
  });
}

/*await createAuthSession(event, recipeUserId, role);*/
await createAuthSession(event, recipeUserId, role, email);


  return json(200, {
    ok: true,
    userId,
    email,
    role,
    user: {
      id: userId,
      uid: userId,
      email,
      role,
      ...profile,
    },
    raw: result,
  });
}

if (method === "POST" && path.endsWith("/api/auth-st/forgot")) {
  const b = body(event);

  const email = String(b.email || "").trim().toLowerCase();
  const role = String(b.role || "").trim().toLowerCase();

  if (!email) {
    return json(400, { ok: false, error: "MISSING_EMAIL" });
  }

  const db = await ddb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: email } },
    })
  );

  // Do not reveal whether the email exists.
  if (!db.Item) {
    return json(200, { ok: true, sent: true });
  }

  const userId =
    db.Item.supertokensUserId?.S ||
    parseProfile(db.Item.profile?.S)?.supertokensUserId ||
    "";

  if (!userId) {
    return json(200, { ok: true, sent: true });
  }

  const tokenResult = await EmailPassword.createResetPasswordToken(
    "public",
    userId,
    email
  );

  if (tokenResult.status !== "OK") {
    console.error("RESET TOKEN ERROR:", tokenResult);
    return json(200, { ok: true, sent: true });
  }

  const token = tokenResult.token;

  const resetPath =
    role === "partner"
      ? `/partner/login?mode=reset&token=${encodeURIComponent(token)}`
      : `/login?mode=reset&token=${encodeURIComponent(token)}`;

  const websiteDomain =
    process.env.WEBSITE_DOMAIN || "http://localhost:5176";

  const resetUrl = `${websiteDomain}${resetPath}`;

  let emailSent = false;


  return json(200, {
    ok: true,
    sent: true,
    emailSent,
    token,
    resetUrl,
  });
}
if (method === "POST" && path.endsWith("/api/auth-st/reset")) {
  const b = body(event);

  const token = String(b.token || b.code || "").trim();
  const newPassword = String(b.newPassword || b.password || "");

  if (!token || !newPassword) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  const result = await EmailPassword.resetPasswordUsingToken(
    "public",
    token,
    newPassword
  );

  if (result.status !== "OK") {
    return json(400, { ok: false, error: "RESET_FAILED", raw: result });
  }

  return json(200, {
    ok: true,
    message: "PASSWORD_RESET_OK",
    raw: result,
  });
}

if (method === "POST" && path.endsWith("/api/auth-st/change-email")) {
  const b = body(event);

  const email = String(b.email || "").trim().toLowerCase();
  const newEmail = String(b.newEmail || "").trim().toLowerCase();
  const currentPassword = String(b.currentPassword || "");

  if (!email || !newEmail || !currentPassword) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  if (email === newEmail) {
    return json(400, { ok: false, error: "SAME_EMAIL" });
  }

  const signInResult = await EmailPassword.signIn(
    "public",
    email,
    currentPassword
  );

  if (signInResult.status !== "OK") {
    return json(401, { ok: false, error: "CURRENT_PASSWORD_INCORRECT" });
  }

  const userId =
    signInResult.user?.id ||
    signInResult.recipeUserId?.recipeUserId ||
    "";

  if (!userId) {
    return json(400, { ok: false, error: "MISSING_USER_ID" });
  }

  const updateResult = await EmailPassword.updateEmailOrPassword({
    recipeUserId: signInResult.recipeUserId,
    email: newEmail,
  });

  if (updateResult.status !== "OK") {
    return json(400, {
      ok: false,
      error: updateResult.status,
      raw: updateResult,
    });
  }

  const oldDb = await ddb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: email } },
    })
  );

  const oldProfile = parseProfile(oldDb.Item?.profile?.S);
  const nextProfile = {
    ...oldProfile,
    email: newEmail,
    authProvider: "supertokens",
    supertokensUserId: userId,
    emailChangedAt: new Date().toISOString(),
  };

  await ddb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        email: { S: newEmail },
        role: { S: String(oldDb.Item?.role?.S || "student") },
        profile: { S: JSON.stringify(nextProfile) },
        supertokensUserId: { S: userId },
        previousEmail: { S: email },
      },
    })
  );

  return json(200, {
    ok: true,
    email: newEmail,
    oldEmail: email,
    userId,
    user: {
      id: userId,
      uid: userId,
      email: newEmail,
      role: String(oldDb.Item?.role?.S || "student"),
      ...nextProfile,
    },
  });
}

if (method === "POST" && path.endsWith("/api/auth-st/reset-legacy-partner")) {
  const b = body(event);

  const email = String(b.email || "").trim().toLowerCase();
  const newPassword = String(b.newPassword || b.password || "");
  const role = String(b.role || "").trim().toLowerCase();

  if (!email || !newPassword) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  if (role && role !== "partner") {
    return json(400, { ok: false, error: "INVALID_ROLE" });
  }

  const db = await ddb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: email } },
    })
  );

  if (!db.Item) {
    return json(404, { ok: false, error: "NO_PROFILE" });
  }

  const storedRole = String(db.Item.role?.S || "").toLowerCase();

  if (storedRole !== "partner") {
    return json(403, { ok: false, error: "NOT_PARTNER", role: storedRole });
  }

  const newHash = sha256Hex(newPassword);

  await ddb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: email } },
      UpdateExpression: "SET passwordHash = :p, legacyPasswordResetAt = :t",
      ExpressionAttributeValues: {
        ":p": { S: newHash },
        ":t": { S: new Date().toISOString() },
      },
    })
  );

  return json(200, {
    ok: true,
    email,
    role: "partner",
    message: "LEGACY_PARTNER_PASSWORD_RESET",
  });
}


  /*if (method === "POST" && path.endsWith("/api/auth-st/session")) {*/
  if (
    (method === "GET" || method === "POST") &&
    path.endsWith("/api/auth-st/session")
  ) {
    const { req, res } = getSessionWrappers(event);

    const session = await Session.getSession(req, res, {
      sessionRequired: false,
    });

    if (!session) {
      return json(401, {
        ok: false,
        error: "UNAUTHORISED",
      });
    }

    const accessTokenPayload = session.getAccessTokenPayload();
    const absoluteExpiresAt = Number(
      accessTokenPayload.absoluteExpiresAt
    );

    if (
      !Number.isFinite(absoluteExpiresAt) ||
      Date.now() >= absoluteExpiresAt
    ) {
      await session.revokeSession();

      return json(401, {
        ok: false,
        error: "SESSION_EXPIRED",
      });
    }

    return json(200, {
      ok: true,
      authenticated: true,
      userId: session.getUserId(),
      role: accessTokenPayload.role || null,
    });
  }
    /*return json(200, {
      ok: true,
      message: "Session route reached",
    });
  }*/

    return json(404, {
      ok: false,
      error: "NOT_FOUND",
      method,
      path,
    });
  };

  const supertokensHandler = middleware(customHandler);

export const handler = async (event, context) => {
  return await supertokensHandler(event, context);
};