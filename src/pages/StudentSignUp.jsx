// src/pages/StudentSignUp.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getContinents,
  getCountriesWithFlags, // returns [{ name, code }, ...]
  getUniversities,
  getFaculties,
  getPrograms,
  YEARS,
} from "../data/eduData.js";
import { postJSON } from "../lib/api";

/* ---------- Helpers ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();
async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function trySet(k, v) { try { localStorage.setItem(k, v); } catch {} }

/* --- Optional flag as emoji helper (kept in case you want emoji elsewhere) --- */
const FLAG = (iso2) => {
  const code = String(iso2 || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (code.charCodeAt(0) - 65), A + (code.charCodeAt(1) - 65));
};

// Small PNG flag icon from FlagCDN
const flagPng = (code) => `https://flagcdn.com/24x18/${String(code || "").toLowerCase()}.png`;

// ---------- Turnstile helpers ----------
const TURNSTILE_KEY = (import.meta.env?.VITE_TURNSTILE_SITE_KEY ?? "").trim();

function loadTurnstileScript() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.querySelector('script[data-turnstile="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.turnstile));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.setAttribute("data-turnstile", "1");
    s.onload = () => resolve(window.turnstile);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function StudentSignUp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    gender: "",
    email: "",
    password: "",
    confirmPassword: "",
    continent: "",
    country: "",
    countryCode: "",
    university: "",
    faculty: "",
    program: "",
    year: "",
    agree: false,
  });
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");

  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);

  // init Turnstile
  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        const t = await loadTurnstileScript();
        if (destroyed || !turnstileRef.current || !t || !TURNSTILE_KEY) return;

        if (turnstileWidgetIdRef.current) {
          try { t.remove(turnstileWidgetIdRef.current); } catch {}
          turnstileWidgetIdRef.current = null;
        }

        turnstileWidgetIdRef.current = t.render(turnstileRef.current, {
          sitekey: TURNSTILE_KEY,
          theme: "light",
          size: "normal",
          appearance: "always",
          callback: (token) => setTurnstileToken(token),
          "error-callback": () => setTurnstileToken(""),
          "expired-callback": () => setTurnstileToken(""),
          "timeout-callback": () => setTurnstileToken(""),
        });
      } catch (e) {
        console.warn("Turnstile failed to load:", e);
      }
    })();
    return () => {
      destroyed = true;
      if (window.turnstile && turnstileWidgetIdRef.current) {
        try { window.turnstile.remove(turnstileWidgetIdRef.current); } catch {}
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  // cleanup photo object URL
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const onBasic = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onContinent = (e) =>
    setForm((f) => ({
      ...f,
      continent: e.target.value,
      country: "",
      countryCode: "",
      university: "",
      faculty: "",
      program: "",
      year: "",
    }));

  const onUniversity = (e) =>
    setForm((f) => ({ ...f, university: e.target.value, faculty: "", program: "", year: "" }));
  const onFaculty = (e) => setForm((f) => ({ ...f, faculty: e.target.value, program: "", year: "" }));
  const onProgram = (e) => setForm((f) => ({ ...f, program: e.target.value, year: "" }));
  const onYear = (e) => setForm((f) => ({ ...f, year: e.target.value }));

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please select an image file.");
    setError("");
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
  };
  const clearPhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null);
    setPhotoUrl("");
  };

  async function downscaleImageToDataURL(file, maxDim = 320, quality = 0.82) {
    const blobUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = blobUrl;
      });
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      let q = quality;
      let dataURL = canvas.toDataURL("image/jpeg", q);
      const TARGET = 400 * 1024;
      while (dataURL.length * 0.75 > TARGET && q > 0.5) {
        q -= 0.06;
        dataURL = canvas.toDataURL("image/jpeg", q);
      }
      return dataURL;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const required = [
      "name",
      "gender",
      "email",
      "password",
      "confirmPassword",
      "continent",
      "country",
      "university",
      "faculty",
      "program",
      "year",
      "agree",
    ];
    const missing = required.filter((k) => !form[k]);
    if (missing.includes("agree")) return setError("You must agree to the Privacy Policy and Terms of Use.");
    if (missing.length) return setError("Please complete all fields.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (!turnstileToken) return setError("Please complete the verification.");

    try {
      let photoDataUrl = "";
      if (photo) photoDataUrl = await downscaleImageToDataURL(photo);

      // Normalize first email & keep as canonical for all future flows
      const emailNorm = normalizeEmail(form.email);

      // Build payload to backend (include password + turnstile token; backend must hash & verify)
      const payload = {
        role: "student",
        name: form.name,
        gender: form.gender,
        email: emailNorm,              // normalized
        password: form.password,       // hash on server
        continent: form.continent,
        country: form.country,
        countryCode: form.countryCode,
        university: form.university,
        faculty: form.faculty,
        program: form.program,
        year: form.year,
        photo: photoDataUrl,
        agree: !!form.agree,
        turnstileToken,                // verify server-side with your secret key
      };

      // Server path (best effort; allow local if backend not ready)
      try {
        await postJSON("/auth/register/student", payload);
      } catch {
        /* allow local fallback */
      }

      // Store current password locally for dashboard/account flows (dev-only)
      sessionStorage.setItem("currentPassword", form.password);

      // Create local profile (canonical lowercase role/email)
      const id = `u_${Date.now()}`;
      const newUser = {
        id,
        uid: id,
        role: "student",
        name: form.name,
        gender: form.gender,
        email: emailNorm,
        continent: form.continent,
        country: form.country,
        countryCode: form.countryCode,
        university: form.university,
        faculty: form.faculty,
        program: form.program,
        year: form.year,
        photoUrl: photoDataUrl,
        createdAt: new Date().toISOString(),
      };

      // Persist to users/usersById so Login.jsx legacy fallback can find it (with passwordHash)
      const users = safeParse(localStorage.getItem("users")) || [];
      const byId = safeParse(localStorage.getItem("usersById")) || {};
      const passwordHash = await sha256Hex(form.password);

      users.push({ ...newUser, passwordHash });
      byId[id] = { ...newUser, passwordHash };
      localStorage.setItem("users", JSON.stringify(users));
      localStorage.setItem("usersById", JSON.stringify(byId));

      // Mark ACTIVE (mirror to both session & local like Login.jsx)
      const stubUser = { ...newUser }; // no password in memory
      sessionStorage.setItem("currentUser", JSON.stringify(stubUser));
      trySet("currentUser", JSON.stringify(stubUser));
      for (const k of ["authUserId","activeUserId","currentUserId","loggedInUserId"]) {
        sessionStorage.setItem(k, id);
        trySet(k, id);
      }

      // optional: reset widget after submit
      if (window.turnstile && turnstileWidgetIdRef.current) {
        try { window.turnstile.reset(turnstileWidgetIdRef.current); } catch {}
      }

      // Redirect to the same route family used by Login.jsx
      navigate("/student-dashboard");
    } catch (err) {
      console.error(err);
      setError("Registration failed. Please try again.");
    }
  };

  // ----- options -----
  const continents = getContinents();
  const rawCountries = form.continent ? getCountriesWithFlags(form.continent) : [];
  const countries = (rawCountries || []).map((c) => ({
    name: c.name || c.value,
    code: String(c.code || c.iso || "").toUpperCase(),
  }));

  const universities = getUniversities(form.continent, form.country) || [];
  const faculties = getFaculties(form.continent, form.country, form.university) || [];
  const programs = getPrograms(form.continent, form.country, form.university, form.faculty) || [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f0f6ff] via-white to-[#eef2ff]">
      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <img src="/images/1754280544595.jpeg" alt="ScholarsKnowledge Logo" className="mx-auto h-14 w-14 object-contain" />
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">Student Sign Up</h1>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4 bg-white/70 rounded-2xl p-6 border">
            {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center border">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-slate-500">👤</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPhoto}
                  className="block w-full text-sm text-slate-600
                             file:mr-3 file:py-2 file:px-4
                             file:rounded file:border-0
                             file:text-sm file:font-semibold
                             file:bg-blue-600 file:text-white
                             hover:file:bg-blue-700"
                />
                {photo && (
                  <button type="button" onClick={clearPhoto} className="text-sm text-slate-600 underline self-start">
                    Remove photo
                  </button>
                )}
                <p className="text-xs text-slate-500">Large images will be resized.</p>
              </div>
            </div>

            {/* Basic */}
            <input
              name="name"
              className="w-full border rounded px-3 py-2"
              placeholder="Full name"
              value={form.name}
              onChange={onBasic}
            />

            {/* Gender (binary only) */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Gender</span>
              <select name="gender" className="w-full border rounded px-3 py-2" value={form.gender} onChange={onBasic}>
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </label>

            <input
              name="email"
              type="email"
              className="w-full border rounded px-3 py-2"
              placeholder="Email"
              value={form.email}
              onChange={onBasic}
            />

            {/* Passwords */}
            <div className="grid md:grid-cols-2 gap-4">
              <input
                name="password"
                type="password"
                className="w-full border rounded px-3 py-2"
                placeholder="Password"
                value={form.password}
                onChange={onBasic}
              />
              <input
                name="confirmPassword"
                type="password"
                className="w-full border rounded px-3 py-2"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={onBasic}
              />
            </div>

            {/* Continent */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Continent</span>
              <select className="w-full border rounded px-3 py-2" value={form.continent} onChange={onContinent}>
                <option value="">Select Continent</option>
                {getContinents().map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            {/* Country (custom dropdown with rectangular flag icons) */}
            <CountrySelect
              label="Country"
              disabled={!form.continent}
              countries={countries}
              value={{ name: form.country, code: form.countryCode }}
              onSelect={({ name, code }) =>
                setForm((f) => ({ ...f, country: name, countryCode: code }))
              }
            />

            <Select
              label="University"
              value={form.university}
              onChange={onUniversity}
              options={getUniversities(form.continent, form.country) || []}
              placeholder="Select University"
              disabled={!form.country}
            />
            <Select
              label="College/School/Faculty/Department"
              value={form.faculty}
              onChange={onFaculty}
              options={getFaculties(form.continent, form.country, form.university) || []}
              placeholder="Select Faculty/School"
              disabled={!form.university}
            />
            <Select
              label="Academic Program"
              value={form.program}
              onChange={onProgram}
              options={getPrograms(form.continent, form.country, form.university, form.faculty) || []}
              placeholder="Select Program"
              disabled={!form.faculty}
            />
            <Select
              label="Year of Study"
              value={form.year}
              onChange={onYear}
              options={YEARS}
              placeholder="Select Year"
              disabled={!form.program}
            />

            {/* Terms + Turnstile row */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start md:items-center gap-3 mb-2">
              <label className="flex items-start gap-2 min-w-0">
                <input
                  type="checkbox"
                  name="agree"
                  checked={form.agree}
                  onChange={onBasic}
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">
                  I agree to the <a href="/privacy" className="underline">Privacy Policy</a> and{" "}
                  <a href="/terms" className="underline">Terms of Use</a>.
                </span>
              </label>

              {TURNSTILE_KEY ? (
                <div className="justify-self-end pr-2">
                  {/* This div is the mount point for Turnstile */}
                  <div ref={turnstileRef} className="turnstile-wide" />
                </div>
              ) : (
                <div className="text-xs text-red-600 justify-self-end pr-2">
                  Missing <code>VITE_TURNSTILE_SITE_KEY</code> in <code>.env</code>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90 disabled:opacity-60"
              disabled={!form.agree}
            >
              Submit
            </button>

            <p className="text-sm text-slate-600 text-center">
              Already have an account?{" "}
              <a href="/login?role=student" className="text-[#1a73e8] underline">
                Log in
              </a>
            </p>
          </form>
        </section>
      </main>

      <footer className="bg-blue-900 text-white py-6 text-center text-sm">
        © {new Date().getFullYear()} ScholarsKnowledge · <a href="/login" className="underline">Contact Sales</a>
      </footer>
    </div>
  );
}

/* ---------- Reusable select ---------- */
function Select({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <label className="block">
      <span className="block text-sm text-slate-600 mb-1">{label}</span>
      <select
        className="w-full border rounded px-3 py-2 disabled:bg-slate-50"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------- CountrySelect with rectangular flag icons (24x18) ---------- */
function CountrySelect({ label, countries, value, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const selected =
    value?.name && value?.code
      ? { name: value.name, code: String(value.code).toUpperCase() }
      : null;

  return (
    <div className="relative" ref={ref}>
      <span className="block text-sm text-slate-600 mb-1">{label}</span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full border rounded px-3 py-2 text-left bg-white ${
          disabled ? "bg-slate-50 cursor-not-allowed" : "hover:bg-slate-50"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="inline-flex items-center gap-2">
            <img
              src={flagPng(selected.code)}
              alt=""
              className="w-[24px] h-[18px] border object-contain"
            />
            <span>{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-500">Select Country</span>
        )}
      </button>

      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg"
        >
          {countries.map(({ name, code }) => {
            const c = String(code || "").toUpperCase();
            return (
              <li
                key={`${name}-${c}`}
                role="option"
                tabIndex={0}
                onClick={() => {
                  onSelect({ name, code: c });
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSelect({ name, code: c });
                    setOpen(false);
                  }
                }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
              >
                <img
                  src={flagPng(c)}
                  alt=""
                  className="w-[24px] h-[18px] border object-contain"
                />
                <span>{name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}