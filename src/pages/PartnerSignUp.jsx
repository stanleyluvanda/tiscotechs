// src/pages/PartnerSignUp.jsx  
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

/* Helpers (unchanged in spirit) */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
function isEmail(x = "") { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x); }
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
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ----- API base (same pattern as other auth pages) ----- */
const API_BASE =
  (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
  "http://localhost:5001";

export default function PartnerSignUp() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    orgName: "",
    contactName: "",
    logoUrl: "",          // logo / avatar URL or data-URL
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // handle file upload for logo/avatar
  const onLogoFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      console.warn("Selected file is not an image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setForm((f) => ({ ...f, logoUrl: dataUrl }));
    };
    reader.onerror = () => {
      console.error("Error reading logo file");
    };
    reader.readAsDataURL(file);
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
      const logoUrl = form.logoUrl.trim(); // may be empty or data-URL

      const payload = {
        email,
        passwordHash,
        role: "partner",
        // send photo/logo at top-level for backend helper
        photo: logoUrl,
        profile: {
          orgName: form.orgName.trim(),
          contactName: form.contactName.trim(),
          photo: logoUrl, // store inside profile as well
          createdAt: new Date().toISOString(),
        },
      };

      const res = await fetch(`${API_BASE}/api/auth/register/partner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const code = data?.error || "UNKNOWN";
        if (code === "EMAIL_EXISTS") {
          setErr("An account with this email already exists. Please log in instead.");
        } else if (code === "MISSING_FIELDS") {
          setErr("Missing required fields. Please check the form and try again.");
        } else {
          setErr(`Sign up failed. (${code})`);
        }
        setSubmitting(false);
        return;
      }

      const user = data.user || {
        email,
        role: "partner",
        orgName: form.orgName.trim(),
        contactName: form.contactName.trim(),
        photo: logoUrl,
      };

      // Store partner session locally (used by PartnerWelcome / PartnerDashboard)
      localStorage.setItem("partnerAuth", JSON.stringify(user));

      // Optional: keep a local list of partners (for legacy UI, if needed)
      try {
        const partners = safeParse(localStorage.getItem("partners")) || [];
        const remaining = partners.filter(
          (p) => String(p.email || "").toLowerCase() !== email
        );
        remaining.unshift(user);
        localStorage.setItem("partners", JSON.stringify(remaining));
      } catch {}

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
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <section className="max-w-xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">Partner Sign Up</h1>
          <p className="text-slate-600 mt-1">
            Create an account to list scholarships on ScholarsKnowledge.
          </p>

          <form
            onSubmit={submit}
            className="mt-6 bg-white rounded-2xl p-6 border space-y-5"
          >
            {err && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">
                {err}
              </div>
            )}

            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">
                Organization / University *
              </span>
              <input
                name="orgName"
                value={form.orgName}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., University of Example"
              />
            </label>

            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">
                Contact Person *
              </span>
              <input
                name="contactName"
                value={form.contactName}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Full name"
              />
            </label>

            {/* Logo / Avatar URL (optional) */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">
                Logo / Avatar URL (optional)
              </span>
              <input
                name="logoUrl"
                value={form.logoUrl}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="https://example.edu/logo.png"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Paste a link to your organization logo or avatar image.
              </span>
            </label>

            {/* file upload for logo / avatar with visible icon + subtle border */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span aria-hidden="true">📁</span>
                  <span>Upload logo / avatar (optional)</span>
                </span>
              </span>
              <div className="w-full border border-slate-300 rounded px-3 py-2 bg-slate-50 inline-flex items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onLogoFileChange}
                  className="text-sm cursor-pointer"
                />
              </div>
              <span className="mt-1 block text-xs text-slate-500">
                If you upload an image, it will override the URL above and be
                used as your profile avatar.
              </span>

              {form.logoUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-300 bg-slate-100">
                    {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    Preview of your organization avatar.
                  </span>
                </div>
              )}
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">
                  Email *
                </span>
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
                <span className="block text-sm text-slate-600 mb-1">
                  Password *
                </span>
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600 hover:text-slate-800"
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
                          className={`h-1 flex-1 rounded ${
                            i < strength.bar ? "bg-green-500" : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Strength: {strength.label}
                    </div>
                  </div>
                )}
              </label>
            </div>

            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">
                Confirm Password *
              </span>
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600 hover:text-slate-800"
                >
                  {showPw2 ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={onChange}
                className="mt-1"
              />
              <span className="text-sm text-slate-700">
                I agree to the partnership requirements: no essays, no
                application fees, and no collection of confidential personal
                data (e.g., bank details, SSN).
              </span>
            </label>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                disabled={submitting}
                className={`rounded px-4 py-2 text-sm font-semibold text-white ${
                  submitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-[#1a73e8] hover:opacity-90"
                }`}
              >
                {submitting ? "Creating..." : "Create Account"}
              </button>
              <span className="text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  to="/partner/login"
                  className="text-[#1a73e8] underline"
                >
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