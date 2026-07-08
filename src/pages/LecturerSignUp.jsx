// src/pages/LecturerSignUp.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate,useSearchParams, Link } from "react-router-dom";
import useNoIndex from "../lib/useNoIndex";
import { US_UNIVERSITY_STATE_SEPARATORS } from "../data/usStateUniversityGroups";
import {
  getContinents,
  getCountriesWithFlags,
  getUniversities,
  getFaculties,
} from "../data/eduData.js";

import SingleImageUploader from "../components/upload/SingleImageUploader";
//import { apiRegisterLecturer } from "../lib/api";
import { loginWithGoogle } from "../lib/googleLogin";

// Small rectangular flag PNG (24x18)
const flagPng = (code) =>
  `https://flagcdn.com/24x18/${String(code || "").toLowerCase()}.png`;

/* ---------- Helpers ---------- */
function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

const normalizeEmail = (e) => String(e || "").trim().toLowerCase();

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function trySet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}


// ✅ ADD THESE HELPERS START
function safeStr2(x) {
  return String(x || "").trim();
}

function buildScopeKey({ university, faculty }) {
  const u = safeStr2(university);
  const f = safeStr2(faculty);
  return [u, f].filter(Boolean).join("#");
}

function buildGsiScopeRole({ scopeKey, role }) {
  const sk = safeStr2(scopeKey);
  const r = safeStr2(role).toLowerCase();
  return sk && r ? `${sk}#${r}` : "";
}
// ✅ ADD THESE HELPERS END


/* ---------- Password UX helpers (UI only) ---------- */
function scorePassword(pw = "") {
  const p = String(pw || "");
  let score = 0;

  const hasLower = /[a-z]/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasDigit = /\d/.test(p);
  const hasSymbol = /[^A-Za-z0-9]/.test(p);

  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (hasLower) score++;
  if (hasUpper) score++;
  if (hasDigit) score++;
  if (hasSymbol) score++;

  score = Math.min(score, 5);

  const label =
    score <= 2 ? "Weak" : score === 3 ? "Fair" : score === 4 ? "Good" : "Strong";

  const tips = [];
  if (p.length < 12) tips.push("Use at least 12 characters");
  if (!hasUpper) tips.push("Add an uppercase letter");
  if (!hasLower) tips.push("Add a lowercase letter");
  if (!hasDigit) tips.push("Add a number");
  if (!hasSymbol) tips.push("Add a symbol (e.g. !@#$)");

  return { score, label, tips };
}

function generateStrongPassword(length = 14) {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{};:,.?/";

  const all = lower + upper + digits + symbols;
  const pick = (s) => s[Math.floor(Math.random() * s.length)];

  // ensure at least one of each category
  let out = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (out.length < length) out.push(pick(all));

  // shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

/* ---------- Turnstile helpers ---------- */
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
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.setAttribute("data-turnstile", "1");
    s.onload = () => resolve(window.turnstile);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ---------- Title options ---------- */
const TITLE_OPTIONS = ["Mr.", "Miss", "Madam", "Dr.", "Ass. Prof", "Prof."];

export default function LecturerSignUp() {
  const navigate = useNavigate();
   useNoIndex();
  const [sp] = useSearchParams();
  /*const oauthMode = sp.get("oauth") === "1";
  const oauthEmail = (sp.get("email") || "").trim();
  const oauthName = (sp.get("name") || "").trim();*/
const oauthMode = sp.get("oauth") === "1";
const googleSignup = sp.get("googleSignup") || "";
const googleSignupSig = sp.get("googleSignupSig") || "";

let googleSignupData = {};
try {
  googleSignupData = googleSignup
    ? JSON.parse(atob(googleSignup.replace(/-/g, "+").replace(/_/g, "/")))
    : {};
} catch {
  googleSignupData = {};
}

const oauthEmail = (sp.get("email") || googleSignupData.email || "").trim();
const oauthName = (sp.get("name") || googleSignupData.name || "").trim();

  /* ------------------ State ------------------ */
  const [form, setForm] = useState({
    name: "",
    title: "",
    gender: "",
    email: "",
    password: "",
    confirmPassword: "",
    continent: "",
    country: "",
    countryCode: "",
    university: "",
    faculty: "",
    agree: false,
  });

  // ✅ ADD THIS BLOCK HERE (right after form state)
  useEffect(() => {
    if (!oauthMode) return;

    setForm((f) => ({
      ...f,
      email: oauthEmail || f.email,
      name: oauthName || f.name,
      password: "",
      confirmPassword: "",
    }));
  }, [oauthMode, oauthEmail, oauthName]);
  // ✅ END ADD BLOCK

  const [error, setError] = useState("");

  // NEW → S3 image URL
  const [photo, setPhoto] = useState(null);

  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);

  /* ------------------ Load Turnstile ------------------ */
  useEffect(() => {
    let destroyed = false;

    (async () => {
      try {
        const t = await loadTurnstileScript();
        if (destroyed || !turnstileRef.current || !t || !TURNSTILE_KEY) return;

        if (turnstileWidgetIdRef.current) {
          try {
            t.remove(turnstileWidgetIdRef.current);
          } catch {}
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
        console.warn("Turnstile failed:", e);
      }
    })();

    return () => {
      destroyed = true;
      if (window.turnstile && turnstileWidgetIdRef.current) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {}
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  /* ------------------ Password UX derived state (UI only) ------------------ */
  const pw = form.password || "";
  const cpw = form.confirmPassword || "";
  const pwTouched = pw.length > 0 || cpw.length > 0;
  const pwStrength = scorePassword(pw);
  const passwordsMatch = pw.length > 0 && cpw.length > 0 && pw === cpw;
  const passwordsMismatch = pwTouched && cpw.length > 0 && pw !== cpw;

  /* ------------------ Form handlers ------------------ */
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
    }));

  const onUniversity = (e) =>
    setForm((f) => ({ ...f, university: e.target.value, faculty: "" }));

  const onFaculty = (e) =>
    setForm((f) => ({ ...f, faculty: e.target.value }));

// ✅ Google OAuth entry for Lecturer signup (doesn't touch backend)
  const onGoogleSignup = async () => {
    setError("");
    try { sessionStorage.setItem("oauthRole", "lecturer"); } catch {}
    try { sessionStorage.setItem("oauthFrom", window.location.pathname + window.location.search); } catch {}
    /*await loginWithGoogle();*/
const res = await fetch(
  "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st-prod/authorisationurl?thirdPartyId=google"
);

const data = await res.json().catch(() => ({}));

if (!res.ok || !data?.url) {
  setError(data?.error || "Could not start Google signup.");
  return;
}

window.location.href = data.url;
  };

  /* ------------------ Submit ------------------ */
  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Required fields
    /*const required = [
      "name",
      "gender",
      "email",
      "password",
      "confirmPassword",
      "continent",
      "country",
      "university",
      "faculty",
      "agree",
    ];*/

     const required = [
      "name",
      "gender",
      "email",
      ...(oauthMode ? [] : ["password", "confirmPassword"]),
      "continent",
      "country",
      "university",
      "faculty",
      "agree",
    ];

    const missing = required.filter((k) => !form[k]);
    if (missing.includes("agree"))
      return setError("You must agree to the Privacy Policy and Terms of Use.");

    if (missing.length) return setError("Please complete all fields.");

    /*if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");*/
    if (!oauthMode && form.password !== form.confirmPassword)
      return setError("Passwords do not match.");

    if (!turnstileToken)
      return setError("Please complete the verification.");

    /* ------------------ Duplicate email check ------------------ */
    const emailNorm = normalizeEmail(form.email);
    const users = safeParse(localStorage.getItem("users")) || [];

    const duplicate = users.find(
      (u) =>
        normalizeEmail(u.email) === emailNorm &&
        String(u.role).toLowerCase() === "lecturer"
    );

    if (duplicate)
      return setError(
        "An account with this email already exists for a lecturer. Please log in instead."
      );

    /* ------------------ Hash password ------------------ */
    /*const passwordHash = await sha256Hex(form.password);*/
    let passwordHash = "";
if (!oauthMode) {
  passwordHash = await sha256Hex(form.password);
}


const scopeKey = buildScopeKey({ university: form.university, faculty: form.faculty });
const gsi_scopeRole = buildGsiScopeRole({ scopeKey, role: "lecturer" });

    /* ------------------ Profile object (using S3 URL) ------------------ */
    const profile = {
      title: form.title,
      name: form.name,
      gender: form.gender,
      continent: form.continent,
      country: form.country,
      countryCode: form.countryCode,
      university: form.university,
      faculty: form.faculty,
      // ✅ add these
      scopeKey,
      gsi_scopeRole,
      photoUrl: photo || "", // ✅ add this
      photo: photo || "", // <--- S3 URL
    };

    /* ------------------ Backend call ------------------ */
    /*let backendResp;
    try {
      backendResp = await apiRegisterLecturer({
        email: emailNorm,
        password: form.password,     // ✅ NEW
        passwordHash,
        role: "lecturer",
        profile,
      });
    } catch (err) {
      console.error("[lecturer-signup] network error:", err);
      backendResp = { ok: false, error: "network" };
    }*/

    let backendResp;

try {
  const payload = {
    email: emailNorm,
    role: "lecturer",
    scopeKey,
    gsi_scopeRole,
    profile,
    ...(oauthMode
      ? { oauth: true, authProvider: "google" }
      : { password: form.password, passwordHash }),
  };

  const res = await fetch(
    "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st-prod/register/lecturer",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  backendResp = await res.json().catch(() => ({
    ok: false,
    error: "BAD_JSON",
  }));
} catch (err) {
  console.error("[lecturer-signup] network error:", err);
  backendResp = {
    ok: false,
    error: "network",
  };
}




    if (!backendResp || !backendResp.ok) {
      const code = backendResp?.error;
      if (code === "ALREADY_EXISTS" || code === "EMAIL_EXISTS") {
        setError(
          "An account with this email already exists for a lecturer. Please log in instead."
        );
      } else if (code === "MISSING_FIELDS") {
        setError("Some required fields are missing.");
      } else {
        setError("Could not create your account. Please try again.");
      }
      return;
    }

if (oauthMode && googleSignup && googleSignupSig) {
  try {
    const linkRes = await fetch(
      "https://l0coytc8bg.execute-api.us-east-1.amazonaws.com/default/AuthHandlerGoogleCallbackTest?action=complete-google-signup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          googleSignup,
          googleSignupSig,
        }),
      }
    );

    const linkData = await linkRes.json().catch(() => ({}));

    if (!linkRes.ok || !linkData?.ok) {
      console.warn("[lecturer-signup] google link failed:", linkData);
    }
  } catch (err) {
    console.warn("[lecturer-signup] google link network error:", err);
  }
}



    //✅ Best-effort: mirror lecturer into global Users API (for Contact Lecturer list)
    try {
      const BASE =
        (import.meta.env.VITE_POSTS_API_BASE ||
          import.meta.env.VITE_CONTACTS_API_BASE ||
          "http://localhost:5003").replace(/\/+$/, "");

      await fetch(`${BASE}/api/users/lecturers/upsert`, {
        /*await fetch(`${BASE}/api/users/upsert`, {*/
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lecturer: {
            uid: `email:${emailNorm}`, // stable id across devices/logins
            role: "lecturer",
            email: emailNorm,
            name: form.name,
            title: form.title,
            university: form.university,
            faculty: form.faculty, // this field currently holds Faculty/School/College/Dept selection
            scopeKey,        // ✅ add
            gsi_scopeRole,   // ✅ add
            photoUrl: photo || "",
            profile: { ...profile, photoUrl: photo || "" },
          },
        }),
      });
    } catch (e) {
      console.warn("[lecturer-signup] users upsert failed (non-blocking):", e);
    }

    /* ------------------ Local mirrors ------------------ */
    sessionStorage.setItem("currentEmail", emailNorm);
    /*sessionStorage.setItem("currentPassword", form.password);*/
    if (!oauthMode) sessionStorage.setItem("currentPassword", form.password);

    const id = `email:${emailNorm}`;
    /*const id = `l_${Date.now()}`;*/
    const newUser = {
      id,
      uid: id,
      role: "lecturer",
      title: form.title,
      name: form.name,
      gender: form.gender,
      email: emailNorm,
      continent: form.continent,
      country: form.country,
      countryCode: form.countryCode,
      university: form.university,
      faculty: form.faculty,
      // ✅ add
      scopeKey,
      gsi_scopeRole,
      photoUrl: photo || "", // <--- S3 URL
      createdAt: new Date().toISOString(),
    };

    /*const newStoredUser = { ...newUser, passwordHash };
    users.push(newStoredUser);
    const byId = safeParse(localStorage.getItem("usersById")) || {};
    byId[id] = newStoredUser;*/
    const newStoredUser = oauthMode ? { ...newUser } : { ...newUser, passwordHash };
    users.push(newStoredUser);
    const byId = safeParse(localStorage.getItem("usersById")) || {};
    byId[id] = newStoredUser;

    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("usersById", JSON.stringify(byId));

    const stub = { ...newUser }; // no password
    sessionStorage.setItem("currentUser", JSON.stringify(stub));
    trySet("currentUser", JSON.stringify(stub));

    for (const k of ["authUserId", "activeUserId", "currentUserId", "loggedInUserId"]) {
      sessionStorage.setItem(k, id);
      trySet(k, id);
    }

    if (window.turnstile && turnstileWidgetIdRef.current) {
      try {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      } catch {}
    }

    navigate("/lecturer-dashboard");
  };

  /* ------------------ Options ------------------ */
  const continents = getContinents();
  const rawCountries = form.continent ? getCountriesWithFlags(form.continent) : [];

  const countries = rawCountries.map((c) => ({
    name: c.name || c.value,
    code: String(c.code || c.iso || "").toUpperCase(),
  }));

  const universities = getUniversities(form.continent, form.country) || [];
  const faculties = getFaculties(form.continent, form.country, form.university) || [];

  /* ------------------ Render ------------------ */
  
  return (
  <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-50">
    {/* Cognito-like soft background blobs */}
    <div
      className="pointer-events-none absolute -left-[420px] -top-[260px] h-[900px] w-[900px] rounded-full blur-[55px] opacity-80"
      style={{
        background:
          "radial-gradient(circle at 35% 35%, rgba(190,214,255,.95), rgba(214,196,255,.55), rgba(214,196,255,0))",
      }}
    />
    <div
      className="pointer-events-none absolute -right-[380px] -top-[420px] h-[900px] w-[900px] rounded-full blur-[55px] opacity-80"
      style={{
        background:
          "radial-gradient(circle at 30% 30%, rgba(255,233,126,.95), rgba(255,206,120,.55), rgba(255,206,120,0))",
      }}
    />
    <div
      className="pointer-events-none absolute right-[-140px] top-[-80px] h-[780px] w-[780px] rounded-full blur-[70px] opacity-50"
      style={{
        background:
          "radial-gradient(circle at 40% 40%, rgba(223,196,255,.9), rgba(223,196,255,0))",
      }}
    />

    {/* Keep your existing layout above the background */}
    <main className="relative z-10 flex-1">
      <section className="max-w-2xl mx-auto px-4 py-12">         


          <div className="text-center">
            <img
              src="/images/1754280544595.jpeg"
              className="mx-auto h-14 w-14 object-contain"
              alt="ScholarsKnowledge Logo"
            />
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">
              Lecturer Sign Up
            </h1>
          </div>

          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 bg-white/70 rounded-2xl p-6 border"
          >
            {error && (
              <p className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}


            {/* ✅ Continue with Google (Lecturer) */}
  {!oauthMode && (
    <button
      type="button"
      onClick={onGoogleSignup}
      className="w-full border rounded px-3 py-2 flex items-center justify-center gap-2 bg-white hover:bg-slate-50"
    >
      <img src="/images/Google icon.svg" alt="" className="h-5 w-5" />
      <span>Continue with Google</span>
    </button>
  )}






            {/* NEW S3 PHOTO UPLOADER */}
            <SingleImageUploader
              value={photo}
              onChange={setPhoto}
              folder="lecturer-profiles"
            />

            {/* Name + Title */}
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <label className="block min-w-0">
                <span className="block text-sm text-slate-600 mb-1">Full name</span>
                <input
                  name="name"
                  className="w-full border rounded px-3 py-2"
                  placeholder="Full name"
                  value={form.name}
                  onChange={onBasic}
                />
              </label>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">Title</span>
                <select
                  name="title"
                  className="w-full border rounded px-3 py-2 md:max-w-[120px]"
                  value={form.title}
                  onChange={onBasic}
                >
                  <option value="">Title</option>
                  {TITLE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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

            {/* Email */}
            {/*<input
              name="email"
              type="email"
              className="w-full border rounded px-3 py-2"
              placeholder="Email"
              value={form.email}
              onChange={onBasic}
            />*/}
            <input
  name="email"
  type="email"
  className={`w-full border rounded px-3 py-2 ${oauthMode ? "bg-slate-100" : ""}`}
  placeholder="Email"
  value={form.email}
  onChange={onBasic}
  readOnly={oauthMode}
/>

            {/* PASSWORD (enhanced UX, no backend changes) */}
            {/*<div className="space-y-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <input
                    name="password"
                    type="password"
                    className="w-full border rounded px-3 py-2"
                    placeholder="Password"
                    value={form.password}
                    onChange={onBasic}
                  />

                  {pw.length > 0 && (
                    <div className="text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-600">
                          Strength:{" "}
                          <span className="font-semibold text-slate-900">
                            {pwStrength.label}
                          </span>
                        </span>

                        <button
                          type="button"
                          className="text-[#1a73e8] underline whitespace-nowrap"
                          onClick={() => {
                            const gen = generateStrongPassword(14);
                            setForm((f) => ({ ...f, password: gen, confirmPassword: gen }));
                          }}
                          title="Generate a strong password"
                        >
                          Generate strong password
                        </button>
                      </div>

                      <div className="mt-1 h-2 w-full rounded bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded bg-[#1a73e8]"
                          style={{ width: `${(pwStrength.score / 5) * 100}%` }}
                        />
                      </div>

                      {pwStrength.tips.length > 0 && (
                        <div className="mt-1 text-slate-600">
                          Suggestions: {pwStrength.tips.slice(0, 2).join(" • ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <input
                    name="confirmPassword"
                    type="password"
                    className={`w-full border rounded px-3 py-2 ${
                      passwordsMatch ? "border-green-400" : passwordsMismatch ? "border-red-400" : ""
                    }`}
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={onBasic}
                  />

                  {pwTouched && cpw.length > 0 && (
                    <div className={`text-xs ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                      {passwordsMatch ? "✅ Passwords match" : "❌ Passwords do not match"}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-600">
                Use 12+ characters with upper/lowercase letters, a number, and a symbol.
              </div>
            </div>*/}

            {!oauthMode && (
              <>
                {/* PASSWORD (enhanced UX, no backend changes) */}
                <div className="space-y-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <input
                        name="password"
                        type="password"
                        className="w-full border rounded px-3 py-2"
                        placeholder="Password"
                        value={form.password}
                        onChange={onBasic}
                      />

                      {pw.length > 0 && (
                        <div className="text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-600">
                              Strength:{" "}
                              <span className="font-semibold text-slate-900">
                                {pwStrength.label}
                              </span>
                            </span>

                            <button
                              type="button"
                              className="text-[#1a73e8] underline whitespace-nowrap"
                              onClick={() => {
                                const gen = generateStrongPassword(14);
                                setForm((f) => ({ ...f, password: gen, confirmPassword: gen }));
                              }}
                              title="Generate a strong password"
                            >
                              Generate strong password
                            </button>
                          </div>

                          <div className="mt-1 h-2 w-full rounded bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded bg-[#1a73e8]"
                              style={{ width: `${(pwStrength.score / 5) * 100}%` }}
                            />
                          </div>

                          {pwStrength.tips.length > 0 && (
                            <div className="mt-1 text-slate-600">
                              Suggestions: {pwStrength.tips.slice(0, 2).join(" • ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <input
                        name="confirmPassword"
                        type="password"
                        className={`w-full border rounded px-3 py-2 ${
                          passwordsMatch ? "border-green-400" : passwordsMismatch ? "border-red-400" : ""
                        }`}
                        placeholder="Confirm password"
                        value={form.confirmPassword}
                        onChange={onBasic}
                      />

                      {pwTouched && cpw.length > 0 && (
                        <div className={`text-xs ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                          {passwordsMatch ? "✅ Passwords match" : "❌ Passwords do not match"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600">
                    Use 12+ characters with upper/lowercase letters, a number, and a symbol.
                  </div>
                </div>
              </>
            )}

            {/* Continent */}
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1">Continent</span>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.continent}
                onChange={onContinent}
              >
                <option value="">Select Continent</option>
                {continents.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            {/* Country */}
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
              countryName={form.country}
              separatorsMap={US_UNIVERSITY_STATE_SEPARATORS}
            />

            <Select
              label="College/School/Faculty/Department"
              value={form.faculty}
              onChange={onFaculty}
              options={faculties}
              placeholder="Select Faculty/School"
              disabled={!form.university}
            />

            {/* Terms + Turnstile */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start md:items-center gap-3">
              <label className="flex items-start gap-2">
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
                  </Link>
                  .
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
              <Link to="/login?role=lecturer" className="text-[#1a73e8] underline">
                Log in
              </Link>
            </p>
          </form>
        </section>
      </main>

      {/*<footer className="bg-blue-900 text-white py-6 text-center text-sm">*/}
      <footer className="relative z-10 bg-blue-900 text-white py-6 text-center text-sm">
        © {new Date().getFullYear()} ScholarsKnowledge ·{" "}
        <a href="/login" className="underline">
          Contact Sales
        </a>
      </footer>
    </div>
  );
}

function Select({label,value,onChange,options,placeholder,disabled,countryName = "",separatorsMap = null,})
 {
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

  const isUnitedStates = countryName === "United States";
  const useSeparators = isUnitedStates && separatorsMap;

  const triggerChange = (selectedValue) => {
    onChange({ target: { value: selectedValue } });
    setOpen(false);
  };

  return (
    <div className="relative block" ref={ref}>
      <span className="block text-sm text-slate-600 mb-1">{label}</span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full border rounded px-3 py-2 text-left bg-white ${
          disabled ? "bg-slate-50 cursor-not-allowed" : "hover:bg-slate-50"
        }`}
      >
        {value || <span className="text-slate-500">{placeholder}</span>}
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg">
          <button
            type="button"
            onClick={() => triggerChange("")}
            className="block w-full px-3 py-2 text-left hover:bg-slate-50"
          >
            {placeholder}
          </button>

          {options.map((o) => (
            <div key={o}>
              {useSeparators && separatorsMap[o] && (
                <div className="w-full bg-purple-700 px-3 py-2 text-xs font-bold text-white">
                  {separatorsMap[o]}
                </div>
              )}

              <button
                type="button"
                onClick={() => triggerChange(o)}
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
              >
                {o}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
            <img
              src={flagPng(selected.code)}
              className="w-[24px] h-[18px] border object-contain"
              alt=""
            />
            <span>{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-500">Select Country</span>
        )}
      </button>

      {open && !disabled && (
        <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg">
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
                  alt=""
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
