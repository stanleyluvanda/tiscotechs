// src/pages/StudentSignUp.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import {
  getContinents,
  getCountriesWithFlags,
  getUniversities,
  getFaculties,
  getPrograms,
  YEARS,
} from "../data/eduData.js";

import SingleImageUploader from "../components/upload/SingleImageUploader";
import { apiRegisterStudent } from "../lib/api";

/* ---------- Helpers ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
const normalizeEmail = (e) => String(e || "").trim().toLowerCase();

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function trySet(k, v) { try { localStorage.setItem(k, v); } catch {} }

/* --- Local email role-check --- */
function emailExistsForRoleLocal(email, role) {
  const em = normalizeEmail(email);
  const r  = String(role || "student").toLowerCase();
  const users = safeParse(localStorage.getItem("users")) || [];
  return users.some(u =>
    normalizeEmail(u?.email) === em &&
    String(u?.role || "student").toLowerCase() === r
  );
}

// Flag helpers
const FLAG = (iso2) => {
  const code = String(iso2 || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (code.charCodeAt(0) - 65), A + (code.charCodeAt(1) - 65));
};

const flagPng = (code) =>
  `https://flagcdn.com/24x18/${String(code || "").toLowerCase()}.png`;

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

  /* ----------------- FORM STATE ----------------- */
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

  /* ----------------- PHOTO (S3 URL) ----------------- */
  const [photo, setPhoto] = useState(null);  // SingleImageUploader output

  /* ----------------- Turnstile ----------------- */
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);

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

  /* ----------------- FORM HANDLERS ----------------- */
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

  const onFaculty = (e) =>
    setForm((f) => ({ ...f, faculty: e.target.value, program: "", year: "" }));

  const onProgram = (e) =>
    setForm((f) => ({ ...f, program: e.target.value, year: "" }));

  const onYear = (e) =>
    setForm((f) => ({ ...f, year: e.target.value }));

  /* ----------------- SUBMIT ----------------- */
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
    if (missing.includes("agree"))
      return setError("You must agree to the Privacy Policy and Terms of Use.");
    if (missing.length)
      return setError("Please complete all fields.");

    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");

    if (!turnstileToken)
      return setError("Please complete the verification.");

    // Normalize email
    const emailNorm = normalizeEmail(form.email);

    // Local duplicate check
    if (emailExistsForRoleLocal(emailNorm, "student")) {
      setError("An account with this email already exists for a student. Please log in instead.");
      return;
    }

    // Hash password ONCE
    const passwordHash = await sha256Hex(form.password);

    // Build profile object
    const profile = {
      name: form.name,
      fullName: form.name,
      studentName: form.name,
      gender: form.gender,
      continent: form.continent,
      country: form.country,
      countryCode: form.countryCode,
      university: form.university,
      faculty: form.faculty,
      program: form.program,
      year: form.year,
      photoUrl: photo || "",   // <-- S3 URL
    };

    /* ----------------- BACKEND CALL ----------------- */
    let backendResp;
    try {
      backendResp = await apiRegisterStudent({
        email: emailNorm,
        passwordHash,
        role: "student",
        profile,
        name: form.name,
        gender: form.gender,
        continent: form.continent,
        country: form.country,
        countryCode: form.countryCode,
        university: form.university,
        faculty: form.faculty,
        program: form.program,
        year: form.year,
        photo: photo || "",
        turnstileToken,
      });
    } catch (err) {
      console.error("[student-signup] backend network error:", err);
      backendResp = { ok: false, error: "network" };
    }

    if (!backendResp || !backendResp.ok) {
      const code = String(backendResp?.error || "").toUpperCase();
      if (["ALREADY_EXISTS","EMAIL_EXISTS","EMAIL_EXISTS_STUDENT"].includes(code)) {
        setError("An account with this email already exists for a student. Please log in instead.");
      } else if (code === "MISSING_FIELDS") {
        setError("Some required fields are missing. Please review the form.");
      } else {
        setError("Could not create your account. Please try again.");
      }
      return;
    }




    // ✅ Best-effort: mirror student into global Users API (for Contact Lecturer list)
try {
  const BASE =
    (import.meta.env.VITE_POSTS_API_BASE ||
      import.meta.env.VITE_CONTACTS_API_BASE ||
      "http://localhost:5003").replace(/\/+$/, "");

  await fetch(`${BASE}/api/users/upsert`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: {
        uid: `email:${emailNorm}`, // stable id across devices/logins
        role: "student",
        email: emailNorm,
        name: form.name,
        gender: form.gender,
        continent: form.continent,
        country: form.country,
        countryCode: form.countryCode,
        university: form.university,
        faculty: form.faculty,
        program: form.program,
        year: form.year,
        photoUrl: photo || "",
        profile: { ...profile, photoUrl: photo || "" },
      },
    }),
  });
} catch (e) {
  console.warn("[student-signup] users upsert failed (non-blocking):", e);
}





















    /* ---------------- LOCAL MIRRORS ----------------- */
    sessionStorage.setItem("currentPassword", form.password);

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
      photoUrl: photo || "",
      createdAt: new Date().toISOString(),
    };

    const users = safeParse(localStorage.getItem("users")) || [];
    const byId = safeParse(localStorage.getItem("usersById")) || {};

    users.push({ ...newUser, passwordHash });
    byId[id] = { ...newUser, passwordHash };

    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("usersById", JSON.stringify(byId));

    const stubUser = { ...newUser };
    sessionStorage.setItem("currentUser", JSON.stringify(stubUser));
    trySet("currentUser", JSON.stringify(stubUser));

    for (const k of ["authUserId","activeUserId","currentUserId","loggedInUserId"]) {
      sessionStorage.setItem(k, id);
      trySet(k, id);
    }

    if (window.turnstile && turnstileWidgetIdRef.current) {
      try { window.turnstile.reset(turnstileWidgetIdRef.current); } catch {}
    }

    navigate("/student-dashboard");
  };

  /* ----------------- OPTIONS ----------------- */
  const continents = getContinents();
  const rawCountries = form.continent ? getCountriesWithFlags(form.continent) : [];
  const countries = (rawCountries || []).map((c) => ({
    name: c.name || c.value,
    code: String(c.code || c.iso || "").toUpperCase(),
  }));

  const universities = getUniversities(form.continent, form.country) || [];
  const faculties = getFaculties(form.continent, form.country, form.university) || [];
  const programs = getPrograms(form.continent, form.country, form.university, form.faculty) || [];

  /* ----------------- RENDER ----------------- */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f0f6ff] via-white to-[#eef2ff]">
      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-4 py-12">

          <div className="text-center">
            <img src="/images/1754280544595.jpeg" alt="ScholarsKnowledge Logo" className="mx-auto h-14 w-14 object-contain" />
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">Student Sign Up</h1>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4 bg-white/70 rounded-2xl p-6 border">
            {error && (
              <p className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            {/* NEW S3 IMAGE UPLOADER */}
            <SingleImageUploader
              value={photo}
              onChange={setPhoto}
              folder="profiles"
            />

            {/* BASIC */}
            <input
              name="name"
              className="w-full border rounded px-3 py-2"
              placeholder="Full name"
              value={form.name}
              onChange={onBasic}
            />

            {/* Gender */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Gender</span>
              <select
                name="gender"
                className="w-full border rounded px-3 py-2"
                value={form.gender}
                onChange={onBasic}
              >
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

            {/* PASSWORD */}
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

            {/* CONTINENT */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Continent</span>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.continent}
                onChange={onContinent}
              >
                <option value="">Select Continent</option>
                {continents.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            {/* COUNTRY */}
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
              options={universities}
              placeholder="Select University"
              disabled={!form.country}
            />

            <Select
              label="College/School/Faculty/Department"
              value={form.faculty}
              onChange={onFaculty}
              options={faculties}
              placeholder="Select Faculty/School"
              disabled={!form.university}
            />

            <Select
              label="Academic Program"
              value={form.program}
              onChange={onProgram}
              options={programs}
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

            {/* TERMS + TURNSTILE */}
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
                  I agree to the{" "}
                  <Link to="/privacy-policy" className="text-[#1a73e8] underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/terms-of-use" className="text-[#1a73e8] underline">
                    Terms of Use
                  </Link>.
                </span>
              </label>

              {TURNSTILE_KEY ? (
                <div className="justify-self-end pr-2">
                  <div ref={turnstileRef} className="turnstile-wide" />
                </div>
              ) : (
                <div className="text-xs text-red-600 justify-self-end pr-2">
                  Missing <code>VITE_TURNSTILE_SITE_KEY</code>
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
              <Link to="/login?role=student" className="text-[#1a73e8] underline">
               Log in
             </Link>
           </p>
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

/* ---------- Reusable Select ---------- */
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
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

/* ---------- Country Select ---------- */
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
      >
        {selected ? (
          <span className="inline-flex items-center gap-2">
            <img src={flagPng(selected.code)} className="w-[24px] h-[18px] border object-contain" />
            <span>{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-500">Select Country</span>
        )}
      </button>

      {open && !disabled && (
        <ul
          className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg"
        >
          {countries.map(({ name, code }) => {
            const c = String(code || "").toUpperCase();
            return (
              <li
                key={`${name}-${c}`}
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