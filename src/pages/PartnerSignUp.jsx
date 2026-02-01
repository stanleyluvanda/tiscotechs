// src/pages/PartnerSignUp.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// Upload to S3 (your existing component)
import SingleImageUploader from "../components/upload/SingleImageUploader";

/* Helpers */
function isEmail(x = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}
function pwStrengthLabel(pw = "") {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "Weak", bar: 2 };
  if (score === 3) return { label: "Fair", bar: 3 };
  if (score === 4) return { label: "Good", bar: 4 };
  return { label: "Strong", bar: 5 };
}

async function sha256Hex(str) {
  if (!(window?.crypto?.subtle)) {
    throw new Error("Secure context required for hashing (https or http://localhost).");
  }
  const enc = new TextEncoder().encode(str);
  const buf = await window.crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* API base (Partner-specific)
   NOTE:
   - Uses VITE_PARTNER_API_BASE first (your new API Gateway URL)
   - Falls back to VITE_API_BASE, then localhost
   - Strips trailing slashes to avoid // in URLs
*/
const RAW_API_BASE =
  (import.meta?.env?.VITE_PARTNER_API_BASE &&
    String(import.meta.env.VITE_PARTNER_API_BASE).trim()) ||
  (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "http://localhost:5001";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

export default function PartnerSignUp() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    orgName: "",
    contactName: "",
    logoUrl: "", // optional text URL
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  // S3 uploads
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ✅ Start afresh: remove legacy local “partners DB” so signup/login is truly API-first
  useEffect(() => {
    try {
      localStorage.removeItem("partners");
    } catch {}
    try {
      localStorage.removeItem("partnersById");
    } catch {}
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    if (
      !form.orgName.trim() ||
      !form.contactName.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      return "Please complete all required fields.";
    }
    if (!isEmail(form.email.trim())) {
      return "Please enter a valid email address.";
    }
    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }
    if (!form.agree) {
      return "Please agree to the partnership terms.";
    }
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setSubmitting(true);
    try {
      const email = form.email.trim().toLowerCase();
      const passwordHash = await sha256Hex(form.password);

      // S3 URLs take priority over text field
      const logoUrl = (logo || form.logoUrl || "").trim();
      const bannerUrl = (banner || "").trim();

      // ✅ API-first payload (DynamoDB source of truth)
      const payload = {
        email,
        passwordHash,
        role: "partner",
        orgName: form.orgName.trim(),
        contactName: form.contactName.trim(),
        photo: logoUrl,
        banner: bannerUrl,
      };

      const base = String(API_BASE || "").replace(/\/+$/, "");
      const res = await fetch(`${base}/api/auth/register/partner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const code = data?.error || "UNKNOWN";
        if (code === "EMAIL_EXISTS" || code === "User already exists") {
          setErr("An account with this email already exists. Please log in instead.");
        } else if (code === "MISSING_FIELDS" || code === "Missing required fields") {
          setErr("Missing required fields. Please check the form and try again.");
        } else {
          setErr(`Sign up failed. (${code})`);
        }
        return;
      }

      // ✅ Store only the current session (NOT a local “database”)
      const user =
        data.user || {
          email,
          role: "partner",
          orgName: payload.orgName,
          contactName: payload.contactName,
          photo: payload.photo,
          banner: payload.banner,
        };

      localStorage.setItem("partnerAuth", JSON.stringify(user));
      nav("/partner/welcome", { replace: true });
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const strength = pwStrengthLabel(form.password);

  
   return (
  <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-50">
    {/* Soft background blobs (variant colors for Partner) */}
    <div
      className="pointer-events-none absolute -left-[420px] -top-[260px] h-[900px] w-[900px] rounded-full blur-[60px] opacity-80"
      style={{
        background:
          "radial-gradient(circle at 35% 35%, rgba(160,220,255,.92), rgba(180,255,220,.55), rgba(180,255,220,0))",
      }}
    />
    <div
      className="pointer-events-none absolute -right-[380px] -top-[420px] h-[900px] w-[900px] rounded-full blur-[60px] opacity-75"
      style={{
        background:
          "radial-gradient(circle at 30% 30%, rgba(255,210,140,.92), rgba(255,170,200,.50), rgba(255,170,200,0))",
      }}
    />
    <div
      className="pointer-events-none absolute right-[-140px] top-[-80px] h-[780px] w-[780px] rounded-full blur-[75px] opacity-45"
      style={{
        background:
          "radial-gradient(circle at 40% 40%, rgba(200,170,255,.85), rgba(200,170,255,0))",
      }}
    />

    {/* Keep your existing layout above the background */}
    <main className="relative z-10 flex-1">
      <section className="max-w-xl mx-auto px-4 py-12">       





          <h1 className="text-3xl font-bold">Partner Sign Up</h1>
          <p className="text-slate-600 mt-1">Create an account to list scholarships on ScholarsKnowledge.</p>

          <form onSubmit={submit} className="mt-6 bg-white rounded-2xl p-6 border space-y-5">
            {err && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">
                {err}
              </div>
            )}

            {/* ORG NAME */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Organization / University *</span>
              <input
                name="orgName"
                value={form.orgName}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., University of Example"
              />
            </label>

            {/* CONTACT NAME */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Contact Person *</span>
              <input
                name="contactName"
                value={form.contactName}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Full name"
              />
            </label>

            {/* Optional URL */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Logo URL (optional)</span>
              <input
                name="logoUrl"
                value={form.logoUrl}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="https://example.edu/logo.png"
              />
            </label>

            {/* S3 Logo uploader */}
            <div className="space-y-1">
              <span className="text-sm text-slate-700 font-medium">Upload Organization Logo</span>
              <SingleImageUploader value={logo} onChange={setLogo} folder="partner-logos" />
            </div>

            {/* S3 Banner uploader */}
            {/*<div className="space-y-1">
              <span className="text-sm text-slate-700 font-medium">Upload Banner (optional)</span>
              <SingleImageUploader value={banner} onChange={setBanner} folder="partner-banners" />
            </div>*/}

            {/* EMAIL + PASSWORD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">Email *</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="you@org.edu"
                />
              </label>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">Password *</span>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2 pr-20"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>

                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${i < strength.bar ? "bg-green-500" : "bg-slate-200"}`}
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">Strength: {strength.label}</div>
                  </div>
                )}
              </label>
            </div>

            {/* Confirm Password */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Confirm Password *</span>
              <div className="relative">
                <input
                  type={showPw2 ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2 pr-20"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw2((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600"
                >
                  {showPw2 ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {/* Terms */}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={onChange}
                className="mt-1"
              />
              <span className="text-sm text-slate-700">
                I agree to the partnership requirements: no essays, no application fees, and no collection of confidential personal data.
              </span>
            </label>

            {/* Submit */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                disabled={submitting}
                className={`rounded px-4 py-2 text-sm font-semibold text-white ${
                  submitting ? "bg-blue-400 cursor-not-allowed" : "bg-[#1a73e8] hover:opacity-90"
                }`}
              >
                {submitting ? "Creating..." : "Create Account"}
              </button>

              <span className="text-sm text-slate-600">
                Already have an account?{" "}
                <Link to="/partner/login" className="text-[#1a73e8] underline">
                  Log in
                </Link>
              </span>
            </div>
          </form>
        </section>
      </main>

      <footer className="bg-blue-900 text-white py-6 text-center text-sm">
        © {new Date().getFullYear()} ScholarsKnowledge ·{" "}
        <a href="/login" className="underline">
          Contact Sales
        </a>
      </footer>
    </div>
  );
}