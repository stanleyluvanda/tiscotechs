//api/auth/forgot.js//

import { Resend } from "resend";
import { signToken, cors } from "../_token";

export default async function handler(req, res) {
  if (cors(res, req)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    const { email } = req.body || {};
    const em = String(email || "").trim().toLowerCase();
    if (!em) return res.status(400).json({ error: "missing_email" });

    const secret = process.env.RESET_TOKEN_SECRET;
    const webBase = process.env.WEB_BASE;               // e.g. https://scholarsknowledge2.vercel.app
    const fromEmail = process.env.FROM_EMAIL;           // e.g. "ScholarsKnowledge <no-reply@yourdomain.com>"
    if (!secret || !webBase || !fromEmail) {
      return res.status(500).json({ error: "server_not_configured" });
    }

    const token = signToken({ email: em, exp: Date.now() + 15 * 60 * 1000, v: 1 }, secret);
    const link = `${webBase}/reset-password?token=${encodeURIComponent(token)}`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Reset your password</h2>
        <p>We received a request to reset your password.</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Reset Password</a></p>
        <p>Or paste this link in your browser:</p>
        <p style="word-break:break-all">${link}</p>
        <p><small>This link expires in 15 minutes. If you didn’t request this, you can ignore this email.</small></p>
      </div>
    `;

    try {
      await resend.emails.send({ from: fromEmail, to: em, subject: "Reset your password", html });
    } catch (e) {
      console.error("Resend error:", e);
      // Privacy: still return ok
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("forgot error:", e);
    return res.status(500).json({ error: "server_error" });
  }
}