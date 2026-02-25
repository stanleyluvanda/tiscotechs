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
// ✅ ADDED (non-breaking):
//   GET  /api/admin/members   -> list ALL users from DynamoDB (ScholarsUsers)
//
// DynamoDB table: ScholarsUsers (or env: USERS_TABLE / USER_TABLE_NAME / USER_TABLE)

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import crypto from "crypto";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const TABLE_NAME =
  process.env.USERS_TABLE ||
  process.env.USER_TABLE_NAME ||
  process.env.USER_TABLE ||
  "ScholarsUsers";

const ddb = new DynamoDBClient({});

/* =======================================================================
   COGNITO (optional, non-breaking)
   - Enabled ONLY when env vars exist
   ======================================================================= */

   const COGNITO_USER_POOL_ID = (process.env.COGNITO_USER_POOL_ID || "").trim();
   const COGNITO_APP_CLIENT_ID = (process.env.COGNITO_APP_CLIENT_ID || "").trim();
   
   const COGNITO_ENABLED = !!(COGNITO_USER_POOL_ID && COGNITO_APP_CLIENT_ID);
   
   const cognito = COGNITO_ENABLED
     ? new CognitoIdentityProviderClient({})
     : null;
   
   function isCognitoUserNotFound(err) {
     const name = String(err?.name || "");
     const msg = String(err?.message || "");
     return (
       name === "UserNotFoundException" ||
       msg.toLowerCase().includes("user does not exist")
     );
   }
   
   function isCognitoBadPassword(err) {
     const name = String(err?.name || "");
     const msg = String(err?.message || "").toLowerCase();
     return (
       name === "NotAuthorizedException" ||
       msg.includes("incorrect username or password") ||
       msg.includes("not authorized")
     );
   }
   
   async function cognitoEnsureUser(email) {
     if (!COGNITO_ENABLED) return { ok: false, reason: "disabled" };
   
     try {
       await cognito.send(
         new AdminGetUserCommand({
           UserPoolId: COGNITO_USER_POOL_ID,
           Username: email,
         })
       );
       return { ok: true, exists: true };
     } catch (e) {
       if (isCognitoUserNotFound(e)) return { ok: true, exists: false };
       return { ok: false, error: e };
     }
   }
   
   /*async function cognitoCreateUserSilent(email) {*/
   async function cognitoCreateUserSilent(email, name) {
     if (!COGNITO_ENABLED) return { ok: false, reason: "disabled" };
   
     try {
       await cognito.send(
         new AdminCreateUserCommand({
           UserPoolId: COGNITO_USER_POOL_ID,
           Username: email,
           MessageAction: "SUPPRESS", // ✅ no Cognito email
           UserAttributes: [
             { Name: "email", Value: email },
             { Name: "email_verified", Value: "true" }, // you already handle VerifyGate separately
             { Name: "name", Value: String(name || "") },
           ],
         })
       );
       return { ok: true };
     } catch (e) {
       // If user already exists, treat as ok
       const name = String(e?.name || "");
       if (name === "UsernameExistsException") return { ok: true, exists: true };
       return { ok: false, error: e };
     }
   }
   
   async function cognitoSetPermanentPassword(email, password) {
     if (!COGNITO_ENABLED) return { ok: false, reason: "disabled" };
   
     try {
       await cognito.send(
         new AdminSetUserPasswordCommand({
           UserPoolId: COGNITO_USER_POOL_ID,
           Username: email,
           Password: String(password || ""),
           Permanent: true,
         })
       );
       return { ok: true };
     } catch (e) {
       return { ok: false, error: e };
     }
   }
   
   async function cognitoAuthPassword(email, password) {
     if (!COGNITO_ENABLED) return { ok: false, reason: "disabled" };
   
     try {
       const out = await cognito.send(
         new InitiateAuthCommand({
           AuthFlow: "USER_PASSWORD_AUTH",
           ClientId: COGNITO_APP_CLIENT_ID,
           AuthParameters: {
             USERNAME: email,
             PASSWORD: String(password || ""),
           },
         })
       );
   
       return {
         ok: true,
         auth: out?.AuthenticationResult || null,
       };
     } catch (e) {
       return { ok: false, error: e };
     }
   }
   
   async function cognitoDeleteUser(email) {
     if (!COGNITO_ENABLED) return { ok: false, reason: "disabled" };
     try {
       await cognito.send(
         new AdminDeleteUserCommand({
           UserPoolId: COGNITO_USER_POOL_ID,
           Username: email,
         })
       );
       return { ok: true };
     } catch (e) {
       if (isCognitoUserNotFound(e)) return { ok: true };
       return { ok: false, error: e };
     }
   }


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
      // ✅ include GET for the new /api/admin/members route
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
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
   ADMIN MEMBERS (NEW — non-breaking)
   ======================================================================= */

/**
 * Scan DynamoDB and return ALL user rows.
 * - Handles pagination (so you don't get only 1MB worth of items)
 * - Returns each user as a flat object: { email, role, ...profile }
 *   so your AdminMembers.jsx normalizeUser() can read fields easily.
 */
async function listAllUsersFromDynamo() {
  const all = [];
  let ExclusiveStartKey = undefined;

  do {
    const out = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey,
      })
    );

    const items = Array.isArray(out.Items) ? out.Items : [];
    for (const it of items) {
      const email = it.email?.S || "";
      const role = (it.role?.S || "student").toLowerCase();
      const profile = parseProfile(it.profile?.S || "{}");

      // Flatten (profile fields become top-level, which your UI expects)
      all.push({
        email,
        role,
        ...profile,
      });
    }

    ExclusiveStartKey = out.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return all;
}

async function handleAdminMembers(event, baseHeaders) {
  try {
    const users = await listAllUsersFromDynamo();
    return jsonResponse(200, { ok: true, users }, baseHeaders);
  } catch (err) {
    console.error("AuthHandler admin/members error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
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

/* ============================
   ✅ NEW: GET /api/auth/profile
   ============================ */
   function getQuery(event) {
    const qs = event?.queryStringParameters || {};
    return qs || {};
  }
  
  async function handleGetAuthProfile(event, baseHeaders) {
    try {
      const qs = getQuery(event);
      const email = normalizeEmail(qs.email || "");
  
      if (!email) {
        return jsonResponse(400, { ok: false, error: "MISSING_EMAIL" }, baseHeaders);
      }
  
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
      const profile = parseProfile(res.Item.profile?.S || "{}");
      const userId = email;
  
      return jsonResponse(
        200,
        {
          ok: true,
          userId,
          role: storedRole,
          profile,
          user: { email, role: storedRole, ...profile },
        },
        baseHeaders
      );
    } catch (err) {
      console.error("AuthHandler GET /api/auth/profile error:", err);
      return jsonResponse(
        500,
        { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
        baseHeaders
      );
    }
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

{/*async function handleLogin(event, baseHeaders) {
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
}*/}

async function handleLogin(event, baseHeaders) {
  const body = parseBody(event);

  const rawEmail = normalizeEmail(body.email || body.oldEmail || "");
  const plainPassword = body.password || ""; // ✅ NEW for Cognito path
  const legacyCandidate = body.passwordHash || ""; // legacy (hash or plain)
  const roleFromBody = String(body.role || "").trim().toLowerCase(); // optional

  if (!rawEmail || !(plainPassword || legacyCandidate)) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }

  // 1) Read DynamoDB profile first (we always need it for response)
  let ddbItem = null;
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
    ddbItem = res.Item;
  } catch (err) {
    console.error("AuthHandler login ddb error:", err);
    return jsonResponse(
      500,
      { ok: false, error: "SERVER_ERROR", detail: String(err?.message || err) },
      baseHeaders
    );
  }

  const storedRole = (ddbItem.role?.S || "student").toLowerCase();
  if (roleFromBody && roleFromBody !== storedRole) {
    return jsonResponse(
      403,
      { ok: false, error: "ROLE_MISMATCH", role: storedRole },
      baseHeaders
    );
  }

  const profile = parseProfile(ddbItem.profile?.S || "{}");
  const user = { email: rawEmail, role: storedRole, ...profile };

  // 2) Cognito path (ONLY if enabled + password provided)
  if (COGNITO_ENABLED && plainPassword) {
    const auth = await cognitoAuthPassword(rawEmail, plainPassword);

    if (auth.ok) {
      // ✅ Cognito success → login success (DDB profile returned same as before)
      return jsonResponse(200, { ok: true, role: storedRole, user }, baseHeaders);
    }

    // If Cognito says user doesn't exist, we can auto-migrate if DDB password matches.
    if (isCognitoUserNotFound(auth.error)) {
      const storedPw = ddbItem.passwordHash?.S || "";
      const ddbOk = passwordMatches(storedPw, plainPassword);

      if (!ddbOk) {
        // User not in Cognito AND password doesn't match DDB
        return jsonResponse(
          401,
          { ok: false, error: "INVALID_CREDENTIALS" },
          baseHeaders
        );
      }

      // ✅ Auto-migrate silently into Cognito using the password they just typed
      try {
        await cognitoCreateUserSilent(rawEmail);
        await cognitoSetPermanentPassword(rawEmail, plainPassword);
      } catch (e) {
        console.warn("[login] cognito migrate failed (non-blocking):", e);
        // Even if migration fails, we still allow login because DDB matched (non-breaking)
      }

      return jsonResponse(200, { ok: true, role: storedRole, user }, baseHeaders);
    }

    // Cognito says bad password or other auth error → do NOT leak details
    if (isCognitoBadPassword(auth.error)) {
      return jsonResponse(
        401,
        { ok: false, error: "INVALID_CREDENTIALS" },
        baseHeaders
      );
    }

    // Other Cognito error: fallback to legacy check to avoid breaking prod during rollout
    console.warn("[login] cognito error, falling back to ddb:", auth.error);
  }

  // 3) Legacy DynamoDB passwordHash path (unchanged behavior)
  try {
    const storedPw = ddbItem.passwordHash?.S || "";
    const candidate = plainPassword || legacyCandidate;

    if (!passwordMatches(storedPw, candidate)) {
      return jsonResponse(
        401,
        { ok: false, error: "INVALID_CREDENTIALS" },
        baseHeaders
      );
    }

    return jsonResponse(200, { ok: true, role: storedRole, user }, baseHeaders);
  } catch (err) {
    console.error("AuthHandler login legacy error:", err);
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

/*async function handleRegisterStudent(event, baseHeaders) {
  const body = parseBody(event);

  const email = normalizeEmail(body.email);
  const rawPassword = body.password || body.passwordHash || "";
  const role = "student";

  if (!email || !rawPassword) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }*/

  async function handleRegisterStudent(event, baseHeaders) {
    const body = parseBody(event);
  
    const email = normalizeEmail(body.email);
    const role = "student";
  
    const isOauth = body.oauth === true || String(body.authProvider || "").toLowerCase() === "google";
  
    // For traditional signup, we still require a password (existing behavior).
    const rawPassword = body.password || body.passwordHash || "";
  
    if (!email || (!isOauth && !rawPassword)) {
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

    // ========================= ✅ ADD THIS BLOCK RIGHT HERE =========================
    // ✅ If Cognito enabled and frontend provided plain password, create user in Cognito
    if (COGNITO_ENABLED && body.password) {
      const emailNorm = email;
      const pw = String(body.password || "");
      try {
        /*await cognitoCreateUserSilent(emailNorm);*/
        /*await cognitoCreateUserSilent(emailNorm, body.name || body?.profile?.name || "");*/
        await cognitoCreateUserSilent(emailNorm, body.contactName || body.orgName || "");
        const setPw = await cognitoSetPermanentPassword(emailNorm, pw);
        if (!setPw.ok) {
          console.warn(
            "[register-student] cognito set password failed:",
            setPw.error
          );
          // Non-breaking: continue to store in DynamoDB so signup still works
        }
      } catch (e) {
        console.warn("[register-student] cognito create failed (non-blocking):", e);
        // Non-breaking: continue to DynamoDB
      }
    }
    // ======================= ✅ END ADD BLOCK (KEEP CODE BELOW) =====================

    /*const passwordToStore =
      body.passwordHash && /^[0-9a-f]{64}$/i.test(String(body.passwordHash))
        ? String(body.passwordHash)
        : sha256Hex(rawPassword);*/

    const passwordToStore = isOauth
        ? ""
        : (
            body.passwordHash && /^[0-9a-f]{64}$/i.test(String(body.passwordHash))
              ? String(body.passwordHash)
              : sha256Hex(rawPassword)
          );

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

    /*await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          email: { S: email },
          passwordHash: { S: passwordToStore },
          role: { S: role },
          profile: { S: JSON.stringify(profile) },
        },
      })
    );*/

    const item = {
      email: { S: email },
      role: { S: role },
      profile: { S: JSON.stringify(profile) },
    };

    // Only store passwordHash for traditional sign-up
    if (!isOauth) {
      item.passwordHash = { S: passwordToStore };
    }

    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
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

/*async function handleRegisterLecturer(event, baseHeaders) {
  const body = parseBody(event);

  const email = normalizeEmail(body.email);
  const rawPassword = body.password || body.passwordHash || "";
  const role = "lecturer";

  if (!email || !rawPassword) {
    return jsonResponse(400, { ok: false, error: "MISSING_FIELDS" }, baseHeaders);
  }*/

  async function handleRegisterLecturer(event, baseHeaders) {
    const body = parseBody(event);
  
    const email = normalizeEmail(body.email);
    const role = "lecturer";
  
    const isOauth =
      body.oauth === true ||
      String(body.authProvider || "").toLowerCase() === "google";
  
    // For traditional signup, we still require a password (existing behavior).
    const rawPassword = body.password || body.passwordHash || "";
  
    if (!email || (!isOauth && !rawPassword)) {
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

    // ========================= ✅ ADD THIS BLOCK RIGHT HERE =========================
    // ✅ If Cognito enabled and frontend provided plain password, create user in Cognito
    if (COGNITO_ENABLED && body.password) {
      const emailNorm = email;
      const pw = String(body.password || "");
      try {
        /*await cognitoCreateUserSilent(emailNorm);*/
        await cognitoCreateUserSilent(emailNorm, body.name || body?.profile?.name || "");
        const setPw = await cognitoSetPermanentPassword(emailNorm, pw);
        if (!setPw.ok) {
          console.warn("[register-lecturer] cognito set password failed:", setPw.error);
        }
      } catch (e) {
        console.warn("[register-lecturer] cognito create failed (non-blocking):", e);
      }
    }
    // ======================= ✅ END ADD BLOCK (KEEP CODE BELOW) =====================

    /*const passwordToStore =
      body.passwordHash && /^[0-9a-f]{64}$/i.test(String(body.passwordHash))
        ? String(body.passwordHash)
        : sha256Hex(rawPassword);*/

    const passwordToStore = isOauth
  ? ""
  : (
      body.passwordHash && /^[0-9a-f]{64}$/i.test(String(body.passwordHash))
        ? String(body.passwordHash)
        : sha256Hex(rawPassword)
    );

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

           // ✅ ADD THIS BLOCK (right after profile is constructed)
    if (isOauth) {
      profile.authProvider = profile.authProvider || "google";
      profile.oauth = true;
    }
    // ✅ END ADD BLOCK

    /*await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          email: { S: email },
          passwordHash: { S: passwordToStore },
          role: { S: role },
          profile: { S: JSON.stringify(profile) },
        },
      })
    );*/

    const item = {
      email: { S: email },
      role: { S: role },
      profile: { S: JSON.stringify(profile) },
    };
    
    // Only store passwordHash for traditional sign-up
    if (!isOauth) {
      item.passwordHash = { S: passwordToStore };
    }
    
    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
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

    // ========================= ✅ ADD THIS BLOCK RIGHT HERE =========================
    // ✅ If Cognito enabled and frontend provided plain password, create user in Cognito
    if (COGNITO_ENABLED && body.password) {
      const emailNorm = email;
      const pw = String(body.password || "");
      try {
        /*await cognitoCreateUserSilent(emailNorm);*/
        await cognitoCreateUserSilent(emailNorm, body.name || body?.profile?.name || "");
        const setPw = await cognitoSetPermanentPassword(emailNorm, pw);
        if (!setPw.ok) {
          console.warn("[register-partner] cognito set password failed:", setPw.error);
        }
      } catch (e) {
        console.warn("[register-partner] cognito create failed (non-blocking):", e);
      }
    }
    // ======================= ✅ END ADD BLOCK (KEEP CODE BELOW) =====================

  
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

    // ========================= ✅ ADD THIS BLOCK RIGHT HERE =========================
    // ✅ Best-effort Cognito mirror (non-breaking)
    // We create the new Cognito user and delete the old one.
    // If anything fails, we still proceed with DynamoDB change (so app doesn’t break).
    if (COGNITO_ENABLED && password) {
      try {
        await cognitoCreateUserSilent(newEmail);
        await cognitoSetPermanentPassword(newEmail, password);

        // delete old Cognito user (ignore not found)
        await cognitoDeleteUser(oldEmail);
      } catch (e) {
        console.warn("[change-email] cognito mirror failed (non-blocking):", e);
      }
    }
    // ======================= ✅ END ADD BLOCK (KEEP CODE BELOW) =====================

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

    {/*const newHash = sha256Hex(newPassword);

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

    // ========================= ✅ ADD THIS BLOCK RIGHT HERE =========================
    // ✅ If Cognito enabled, also set password in Cognito (non-breaking)
    if (COGNITO_ENABLED) {
      try {
        const setPw = await cognitoSetPermanentPassword(email, newPassword);
        if (!setPw.ok) {
          console.warn(
            "[reset] cognito set password failed (non-blocking):",
            setPw.error
          );
        }
      } catch (e) {
        console.warn("[reset] cognito error (non-blocking):", e);
      }
    }*/}
    // ======================= ✅ END ADD BLOCK (KEEP RETURN BELOW) ===================

    // ========================= ✅ COGNITO FIRST (AUTHORITATIVE) =========================
if (COGNITO_ENABLED) {
  try {
    const setPw = await cognitoSetPermanentPassword(email, newPassword);
    if (!setPw.ok) {
      return jsonResponse(
        500,
        { ok: false, error: "COGNITO_PASSWORD_FAILED" },
        baseHeaders
      );
    }
  } catch (e) {
    return jsonResponse(
      500,
      { ok: false, error: "COGNITO_PASSWORD_FAILED" },
      baseHeaders
    );
  }
}

// ========================= ✅ DYNAMODB MIRROR (LEGACY / FALLBACK) ===================
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
        // ✅ include GET for preflight
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: "",
    };
  }

  const path = String(
    event.requestContext?.http?.path || event.rawPath || event.path || ""
  ).toLowerCase();

  // ✅ NEW: Admin members route (DynamoDB-backed)
  if (method === "GET" && path.endsWith("/api/admin/members")) {
    return handleAdminMembers(event, baseHeaders);
  }

  // ✅ NEW: Auth profile lookup (DynamoDB-backed)
if (method === "GET" && path.endsWith("/api/auth/profile")) {
  return handleGetAuthProfile(event, baseHeaders);
}

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