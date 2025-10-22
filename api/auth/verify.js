
//api/auth/verify.js//
import { verifyToken, cors } from "../_token";

export default async function handler(req, res) {
  if (cors(res, req)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    const { token } = req.body || {};
    const secret = process.env.RESET_TOKEN_SECRET;
    if (!secret) return res.status(500).json({ error: "server_not_configured" });

    const v = verifyToken(String(token || ""), secret);
    if (!v.ok) return res.status(400).json({ ok: false, error: v.reason });

    return res.json({ ok: true, email: v.email });
  } catch (e) {
    console.error("verify error:", e);
    return res.status(500).json({ error: "server_error" });
  }
}