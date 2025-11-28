
//api/_token.js//

import crypto from "crypto";

const b64url = (buf) =>
  Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
export function signToken(payloadObj, secret) {
  const payload = JSON.stringify(payloadObj);
  const p64 = b64url(payload);
  const sig = crypto.createHmac("sha256", secret).update(p64).digest("base64url");
  return `${p64}.${sig}`;
}

export function verifyToken(token, secret) {
  if (!token || !token.includes(".")) return { ok: false, reason: "format" };
  const [p64, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(p64).digest("base64url");
  if (sig !== expected) return { ok: false, reason: "sig" };
  let payload;
  try {
    payload = JSON.parse(Buffer.from(p64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return { ok: false, reason: "payload" };
  }
  if (!payload?.email || !payload?.exp) return { ok: false, reason: "payload_fields" };
  if (Date.now() > payload.exp) return { ok: false, reason: "expired" };
  return { ok: true, email: String(payload.email).toLowerCase(), payload };
}

export function cors(res, req) {
  const origins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (!origin || origins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}