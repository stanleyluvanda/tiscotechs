// src/pages/Login.jsx  
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  normalizeEmail,
  sha256Hex,
  markActiveUser, // kept for compatibility with your existing imports
} from "../lib/authState"; // single source of truth for auth rules
import { verifyTurnstileToken } from "../lib/turnstileVerify";
import { login as apiLogin } from "../lib/api"; // ONLY for /api/auth/login
import { apiCompletePasswordReset } from "../lib/api";

/* ---------- Local helpers ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
function trySetItem(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
function now() { return Date.now(); }

/* === DEV flag ====================================== */
const IS_DEV =
  typeof window !== "undefined" && /^localhost(?::\d+)?$/.test(window.location.host);

/* === Serverless flag (strict local auth when true) === */
const SERVERLESS =
  String(import.meta?.env?.VITE_SERVERLESS_MODE ?? "false").toLowerCase() === "true";

/* === Dev email flag: real emails in dev? =========================== */
const EMAIL_DEV =
  String(import.meta?.env?.VITE_ENABLE_EMAIL_DEV ?? "false").toLowerCase() === "true";

/* === Local auth helpers for strict password check ================ */
function lower(x) { return String(x || "").trim().toLowerCase(); }

/** Read both the new indexes AND legacy stores, and build indexes if missing. */
function readAuthMaps() {
  const authById    = safeParse(localStorage.getItem("authUsersById"))    || {};
  const authByEmail = safeParse(localStorage.getItem("authUsersByEmail")) || {};

  const legacyUsersArr = safeParse(localStorage.getItem("users"))    || [];
  const legacyById     = safeParse(localStorage.getItem("usersById"))|| {};

  const byId = { ...authById };

  for (const [id, rec] of Object.entries(legacyById)) {
    if (!id || !rec) continue;
    byId[id] = { ...(byId[id] || {}), ...rec, id };
  }

  for (const u of legacyUsersArr) {
    if (!u) continue;
    let id = u.id || "";
    const em = lower(u.email || "");

    if (!id && em) {
      try {
        id = "uid:" + btoa(em);
      } catch {
        id = "uid:" + Date.now() + ":" + Math.random().toString(36).slice(2, 8);
      }
    }
    if (!id) continue;

    byId[id] = { ...(byId[id] || {}), ...u, id };
  }

  const byEmail = {};
  for (const [id, rec] of Object.entries(byId)) {
    const em = lower(rec && rec.email);
    if (em && !byEmail[em]) {
      byEmail[em] = id;
    }
  }

  try {
    localStorage.setItem("authUsersById", JSON.stringify(byId));
    localStorage.setItem("authUsersByEmail", JSON.stringify(byEmail));
  } catch {}

  return { byId, byEmail };
}

function getUserIdByEmail(email) {
  const em = lower(email);
  const { byId, byEmail } = readAuthMaps();

  const fromIndex = byEmail[em];
  if (fromIndex && byId[fromIndex]) return fromIndex;

  for (const [id, rec] of Object.entries(byId)) {
    if (lower(rec?.email) === em) return id;
  }
  return "";
}

/* === Role-aware helpers ============================================= */
function getUserByEmailRole(email, role) {
  const em = (email || "").trim().toLowerCase();
  const r  = (role || "student").toLowerCase();
  const users = safeParse(localStorage.getItem("users")) || [];
  return (
    users.find(
      (u) =>
        String(u?.email || "").trim().toLowerCase() === em &&
        String(u?.role || "student").toLowerCase() === r
    ) || null
  );
}

function profileExistsForRole(email, role) {
  return !!getUserByEmailRole(email, role);
}

/** If a user exists with *any* role, return that role; else "" */
function roleOfEmailIfAny(email) {
  const em = (email || "").trim().toLowerCase();
  const users = safeParse(localStorage.getItem("users")) || [];
  const hit = users.find((u) => String(u?.email || "").trim().toLowerCase() === em);
  return hit ? String(hit.role || "student").toLowerCase() : "";
}

/** Strict local login: require matching password (hash or legacy plain) AND role */
async function localLoginStrict(email, password, expectedRole) {
  const userId = getUserIdByEmail(email);
  if (!userId) {
    throw new Error("No account registered with this email.");
  }

  const { byId } = readAuthMaps();
  const rec = byId[userId] || {};

  const recRole = String(rec?.role || "student").toLowerCase();
  const wantRole = String(expectedRole || "student").toLowerCase();
  if (recRole !== wantRole) {
    throw new Error(
      `This email is registered as ${recRole}, not ${wantRole}. Switch role to continue.`
    );
  }

  const stored = String(rec?.passwordHash || rec?.password || "").trim();
  if (!stored) {
    throw new Error("Incorrect password.");
  }

  const candHash = await sha256Hex(password);

  if (stored.length === 64) {
    if (stored !== candHash) {
      throw new Error("Incorrect password.");
    }
  } else {
    if (stored !== password) {
      throw new Error("Incorrect password.");
    }
    const upgraded = { ...rec, passwordHash: candHash };
    delete upgraded.password;
    byId[userId] = upgraded;
    try {
      localStorage.setItem("authUsersById", JSON.stringify(byId));
    } catch {}
  }

  return { userId, rec: byId[userId] || rec };
}

function devMarkEmailVerified(email) {
  const key = "verify:map";
  try {
    const m = JSON.parse(localStorage.getItem(key) || "{}");
    const em = String(email || "").trim().toLowerCase();
    if (em) {
      m[em] = Date.now() + 365 * 24 * 60 * 60 * 1000; // ~1 year
      localStorage.setItem(key, JSON.stringify(m));
    }
  } catch {}
}

/* >>> helper used in backend path ================================== */
function emailExistsForRole(email, role) {
  const em = (email || "").trim().toLowerCase();
  const r = (role || "student").toLowerCase();
  const users = safeParse(localStorage.getItem("users")) || [];
  return users.some(
    (u) =>
      String(u?.email || "").trim().toLowerCase() === em &&
      String(u?.role || "student").toLowerCase() === r
  );
}
/* <<< end helpers */

export default function Login() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const mode = (sp.get("mode") || "login").toLowerCase(); // 'login' | 'forgot' | 'reset'
  const initialRole =
    (sp.get("role") || "student").toLowerCase() === "lecturer" ? "lecturer" : "student";
  const [role, setRole] = useState(initialRole);

  useEffect(() => {
    const r = (sp.get("role") || "student").toLowerCase();
    setRole(r === "lecturer" ? "lecturer" : "student");
  }, [sp]);

  /* ====== LOGIN STATE ====== */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /* ====== Turnstile ====== */
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [turnToken, setTurnToken] = useState("");
  const [turnReady, setTurnReady] = useState(false);

  const SITE_KEY =
    import.meta?.env?.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAB2QBaumf-KRvBPY";

  const API_BASE =
    (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
    "http://localhost:5001";

  // separate base for forgot/reset emails
  const EMAIL_API_BASE =
    (import.meta?.env?.VITE_EMAIL_API_BASE &&
      String(import.meta.env.VITE_EMAIL_API_BASE).trim()) ||
    API_BASE;

  /* ====== Load Turnstile script once ====== */
  useEffect(() => {
    const id = "cf-turnstile-api";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  if (typeof window !== "undefined" && !window.onTurnstileSuccess) {
    window.onTurnstileSuccess = (token) => {
      try {
        console.log("✅ Turnstile token:", token);
        sessionStorage.setItem("turnstileToken", token || "");
      } catch {}
    };
  }

  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled) return;
      if (!turnstileRef.current) return;
      if (!window.turnstile || typeof window.turnstile.render !== "function") {
        setTimeout(renderWidget, 200);
        return;
      }

      if (widgetIdRef.current && window.turnstile.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: SITE_KEY,
        theme: "light",
        action: "login",
        retry: "auto",
        "refresh-expired": "auto",
        callback: (token) => {
          setTurnToken(token || "");
          setTurnReady(!!token);
          setError("");
          try {
            window.onTurnstileSuccess?.(token);
          } catch {}
        },
        "expired-callback": () => {
          setTurnToken("");
          setTurnReady(false);
        },
        "error-callback": () => {
          setTurnToken("");
          setTurnReady(false);
        },
      });
    }

    if (mode === "login") {
      renderWidget();
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [SITE_KEY, mode]);

  useEffect(() => {
    if (window.turnstile?.reset && widgetIdRef.current) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {}
      setTurnToken("");
      setTurnReady(false);
    }
  }, [role]);

  /* ====== FORGOT & RESET STATE ====== */
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSentToken, setForgotSentToken] = useState("");
  const [forgotError, setForgotError] = useState("");

  const token = sp.get("token") || "";
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  /* ====== LOGIN HANDLER ====== */
  const onSubmitLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      [
        "currentUser",
        "authUserId",
        "activeUserId",
        "currentUserId",
        "loggedInUserId",
      ].forEach((k) => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
    } catch {}

    const tsToken = sessionStorage.getItem("turnstileToken") || turnToken;
    if (!tsToken) {
      setError("Please complete the human verification.");
      return;
    }

    const v = await verifyTurnstileToken(tsToken);
    if (!v.ok) {
      setError(
        v.offline
          ? "Cannot reach verification service. Please try again."
          : "Human verification failed. Please try again."
      );
      try {
        if (window.turnstile?.reset && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
        }
      } catch {}
      setTurnToken("");
      setTurnReady(false);
      return;
    }

    const em = normalizeEmail(email);
    if (!em || !password) {
      setError("Please enter email and password.");
      return;
    }

    /* ----- SERVERLESS PATH (localStorage auth) --------------------- */
    if (SERVERLESS) {
      try {
        const { userId, rec } = await localLoginStrict(em, password, role);

        const usersById = safeParse(localStorage.getItem("usersById")) || {};
        const usersArr = safeParse(localStorage.getItem("users")) || [];

        const base = usersById[userId] || {};
        const serverRole = (rec.role || base.role || role || "student").toLowerCase();

        const emailName = em.split("@")[0] || "";
        const titleCased = (s = "") =>
          s
            .replace(/[-_.]+/g, " ")
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : ""))
            .join(" ")
            .trim();

        const derivedName =
          titleCased(base.fullName || base.name || emailName) ||
          (serverRole === "lecturer" ? "Lecturer Name" : "Student Name");

        const uid = userId;
        const merged = {
          id: uid,
          uid,
          email: em,
          role: serverRole,

          name: base.name || derivedName,
          fullName: base.fullName || derivedName,
          displayName: base.displayName || derivedName,
          studentName:
            base.studentName || (serverRole === "student" ? derivedName : undefined),
          lecturerName:
            base.lecturerName ||
            (serverRole === "lecturer" ? derivedName : "Lecturer Name"),

          program: base.program || "",
          faculty: base.faculty || "",
          year: base.year || "",
          university: base.university || "",
          country: base.country || "",
          countryCode: base.countryCode || "",

          avatarUrl: base.avatarUrl || base.photoUrl || "",
          bannerUrl: base.bannerUrl || "",
          ...base,
        };

        usersById[uid] = { ...(usersById[uid] || {}), ...merged };
        localStorage.setItem("usersById", JSON.stringify(usersById));

        const idx = usersArr.findIndex((u) => u.id === uid);
        if (idx >= 0) usersArr[idx] = { ...usersArr[idx], ...merged };
        else usersArr.push(merged);
        localStorage.setItem("users", JSON.stringify(usersArr));

        try {
          sessionStorage.setItem("authUserId", uid);
          sessionStorage.setItem("activeUserId", uid);
          sessionStorage.setItem("currentUserId", uid);
          sessionStorage.setItem("loggedInUserId", uid);
          sessionStorage.setItem("currentUser", JSON.stringify(merged));
          localStorage.setItem("currentUser", JSON.stringify(merged));
        } catch {}

        // In pure local dev (no real emails), auto-mark as verified.
        // But when EMAIL_DEV is true, we want VerifyGate to enforce the code.
        if (IS_DEV && !EMAIL_DEV) {
          try {
            devMarkEmailVerified(em);
          } catch {}
        }

        setPassword("");
        navigate(
          serverRole === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard"
        );
        return;
      } catch (err) {
        console.error("[login][serverless]", err);
        setError(err?.message || "Invalid credentials.");
        return;
      }
    }

    /* ----- REAL BACKEND PATH -------------------------------------- */
    // Hash the password before sending. Lambda expects { email, passwordHash, role }.
    const passwordHash = await sha256Hex(password);

    const resp = await apiLogin({
      email: em,
      passwordHash,
      role,
    });

    if (resp && resp.status) {
      const code = Number(resp.status);

      if (code === 404) {
        setError("No account registered with this email.");
        return;
      }

      if (code === 401 || code === 403) {
        const exists = emailExistsForRole(em, role);
        setError(
          exists
            ? "Incorrect password."
            : "No account registered with this email."
        );
        return;
      }
    }

    if (!(resp?.ok && resp?.user && resp?.user?.email)) {
      setError("No account registered for this email or the password is incorrect.");
      return;
    }

    const serverRole = (resp.role || role || "student").toLowerCase();
    const serverEmail = normalizeEmail(resp.user?.email || em);

    // Same rule: only auto-verify on localhost when NOT using real emails.
    if (IS_DEV && !EMAIL_DEV) {
      try {
        devMarkEmailVerified(serverEmail);
      } catch {}
    }

    let uid = resp.uid;
    try {
      if (!uid) uid = `uid:${btoa(serverEmail)}`;
    } catch {
      uid = `uid:${Date.now()}`;
    }

    const usersArr = safeParse(localStorage.getItem("users")) || [];
    const legacy = usersArr.find(
      (u) =>
        (u?.email || "").toLowerCase() === serverEmail &&
        (u?.role || "student") === serverRole
    );

    const byId = safeParse(localStorage.getItem("usersById")) || {};

    const emailName = serverEmail.split("@")[0] || "";
    const titleCased = (s = "") =>
      s
        .replace(/[-_.]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : ""))
        .join(" ")
        .trim();

    const derivedName =
      titleCased(
        resp.user?.fullName ||
          resp.user?.name ||
          legacy?.fullName ||
          legacy?.name ||
          emailName
      ) || (serverRole === "lecturer" ? "Lecturer Name" : "Student Name");

    const merged = {
      id: uid,
      uid,
      email: serverEmail,
      role: serverRole,

      name: legacy?.name || derivedName,
      fullName: legacy?.fullName || derivedName,
      displayName: legacy?.displayName || derivedName,
      studentName:
        legacy?.studentName || (serverRole === "student" ? derivedName : undefined),
      lecturerName:
        legacy?.lecturerName ||
        (serverRole === "lecturer" ? derivedName : "Lecturer Name"),

      program: legacy?.program || resp.user?.program || "",
      faculty: legacy?.faculty || resp.user?.faculty || "",
      year: legacy?.year || resp.user?.year || "",
      university: legacy?.university || resp.user?.university || "",
      country: legacy?.country || resp.user?.country || "",
      countryCode: legacy?.countryCode || resp.user?.countryCode || "",

      avatarUrl:
        legacy?.avatarUrl ||
        legacy?.photoUrl ||
        resp.user?.avatarUrl ||
        resp.user?.photoUrl ||
        "",
      bannerUrl: legacy?.bannerUrl || resp.user?.bannerUrl || "",

      ...legacy,
      ...(resp.user || {}),
    };

    byId[uid] = { ...(byId[uid] || {}), ...merged };
    localStorage.setItem("usersById", JSON.stringify(byId));

    const idx = usersArr.findIndex((u) => u.id === (legacy?.id || uid));
    if (idx >= 0) {
      usersArr[idx] = { ...usersArr[idx], ...merged };
    } else {
      usersArr.push(merged);
    }
    localStorage.setItem("users", JSON.stringify(usersArr));

    try {
      sessionStorage.setItem("authUserId", uid);
      sessionStorage.setItem("activeUserId", uid);
      sessionStorage.setItem("currentUserId", uid);
      sessionStorage.setItem("loggedInUserId", uid);
      sessionStorage.setItem("currentUser", JSON.stringify(merged));
      localStorage.setItem("currentUser", JSON.stringify(merged));

      const host = window.location.host;
      const isProd = /scholarsknowledge\.com$/i.test(host);
      if (isProd) {
        const enriched = { ...merged };
        enriched.name ||= enriched.fullName ||
          (serverRole === "lecturer" ? "Lecturer Name" : "Student Name");
        enriched.program ||= "Program";
        enriched.faculty ||= "Faculty/School/Department";
        enriched.university ||= "University";
        enriched.year ||= "1st Year";
        enriched.country ||= "Country";

        sessionStorage.setItem("currentUser", JSON.stringify(enriched));
        localStorage.setItem("currentUser", JSON.stringify(enriched));
      }
    } catch {}

    try {
      window.dispatchEvent(new Event("auth:changed"));
    } catch {}

    // ✅ Ensure lecturers exist in global Users API (cross-browser visibility)
if (serverRole === "lecturer") {
  try {
    const BASE =
      (import.meta.env.VITE_POSTS_API_BASE ||
        import.meta.env.VITE_CONTACTS_API_BASE ||
        "http://localhost:5003").replace(/\/+$/, "");

    const emailNorm = serverEmail;

    await fetch(`${BASE}/api/users/upsert`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user: {
          uid: `email:${emailNorm}`,
          role: "lecturer",
          email: emailNorm,
          name: merged.name,
          title: merged.title || "",
          university: merged.university || "",
          faculty: merged.faculty || "",
          photoUrl:
            merged.photoUrl ||
            merged.avatarUrl ||
            merged.profile?.photoUrl ||
            "",
          profile: {
            ...merged.profile,
            photoUrl:
              merged.photoUrl ||
              merged.avatarUrl ||
              merged.profile?.photoUrl ||
              "",
          },
        },
      }),
    });
  } catch (e) {
    console.warn("[login] lecturer users upsert failed (non-blocking):", e);
  }
}

/* ⬆️ END BLOCK ⬆️ */

    setPassword("");
    navigate(
      serverRole === "lecturer" ? "/lecturer/dashboard" : "/student/dashboard"
    );
  };

  /* ====== FORGOT PASSWORD HANDLER ====== */
  const onSubmitForgot = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSentToken("");

    const em = normalizeEmail(forgotEmail);
    if (!em) {
      setForgotError("Please enter your registered email.");
      return;
    }

    try {
      const res = await fetch(`${EMAIL_API_BASE}/api/auth/forgot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: em }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setForgotError(data?.error || "Could not send reset link. Please try again.");
        return;
      }

      try {
        localStorage.setItem("lastResetEmail", em);
      } catch (err) {
        console.warn("[forgot] could not persist lastResetEmail:", err);
      }

      let devToken = "";
      if (data.devLink) {
        try {
          const u = new URL(data.devLink);
          devToken = u.searchParams.get("token") || "";
        } catch (err) {
          console.warn("[forgot] could not parse devLink:", err);
        }
      }

      if (devToken) {
        try {
          const raw = localStorage.getItem("resetTokens") || "{}";
          const map = safeParse(raw) || {};
          map[devToken] = { email: em, createdAt: Date.now() };
          localStorage.setItem("resetTokens", JSON.stringify(map));
          console.log("[forgot] stored local reset token", devToken, "for", em);
        } catch (err) {
          console.warn("[forgot] could not persist reset token map:", err);
        }

        setForgotSentToken(devToken);
      } else {
        setForgotSentToken("dummy");
      }
    } catch (err) {
      console.error("[forgot] network error:", err);
      setForgotError("Network error. Please try again.");
    }
  };

  /* ====== RESET PASSWORD HANDLER ====== */
  const onSubmitReset = async (e) => {
    e.preventDefault();
    setResetMsg("");

    if (!newPass || newPass.length < 6) {
      setResetMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPass !== newPass2) {
      setResetMsg("Passwords do not match.");
      return;
    }

    const resetToken = (token || "").trim();
    if (!resetToken) {
      setResetMsg("This reset link is missing or invalid.");
      return;
    }

    // -------- 1) Try real PasswordReset-API first --------
    let backendSucceeded = false;
    try {
      // We stored this when the user submitted the Forgot form
      const lastEmail =
        (localStorage.getItem("lastResetEmail") || "").trim();

      const resetEmail = normalizeEmail(lastEmail);

      const resp = await apiCompletePasswordReset({
        email: resetEmail || undefined,
        code: resetToken,
        newPassword: newPass,
      });

      if (resp?.ok) {
        backendSucceeded = true;

        // Keep local "users" / "usersById" consistent (same logic as before)
        const users = safeParse(localStorage.getItem("users")) || [];
        let idx = -1;

        if (resp.userId) {
          idx = users.findIndex((u) => u.id === resp.userId);
        }
        if (idx < 0 && (resp.email || resetEmail)) {
          const em = normalizeEmail(resp.email || resetEmail);
          idx = users.findIndex((u) => normalizeEmail(u.email) === em);
        }

        if (idx >= 0) {
          const newHash = await sha256Hex(newPass);
          const updated = { ...users[idx], passwordHash: newHash };
          delete updated.password;
          users[idx] = updated;
          localStorage.setItem("users", JSON.stringify(users));

          const byId = safeParse(localStorage.getItem("usersById")) || {};
          const uid = updated.id;
          if (uid && byId[uid]) {
            byId[uid] = { ...byId[uid], passwordHash: newHash };
            delete byId[uid].password;
            localStorage.setItem("usersById", JSON.stringify(byId));
          }
        }
      } else {
        console.warn("[reset] PasswordReset-API responded with error:", resp);
      }
    } catch (err) {
      console.warn(
        "[reset] PasswordReset-API network error, will try local fallback:",
        err
      );
    }

    // -------- 2) Local fallback (dev / offline) --------
    if (!backendSucceeded) {
      const rawMap = localStorage.getItem("resetTokens") || "{}";
      const map = safeParse(rawMap) || {};
      let record = map && map[resetToken] ? map[resetToken] : null;

      let targetEmail = record?.email || "";
      if (!targetEmail) {
        const last = (localStorage.getItem("lastResetEmail") || "").trim();
        if (last) targetEmail = normalizeEmail(last);
      }

      if (!targetEmail) {
        setResetMsg("This reset link is invalid or expired. Please request a new one.");
        return;
      }

      const em = normalizeEmail(targetEmail);

      let users = safeParse(localStorage.getItem("users")) || [];
      const byId = safeParse(localStorage.getItem("usersById")) || {};

      let idx = users.findIndex((u) => normalizeEmail(u.email) === em);

      if (idx < 0) {
        let hitId = "";
        for (const [uid, rec] of Object.entries(byId)) {
          if (normalizeEmail(rec?.email) === em) {
            hitId = uid;
            break;
          }
        }
        if (hitId) {
          const rec = byId[hitId] || {};
          const newUser = {
            id: rec.id || hitId,
            email: em,
            role: rec.role || "student",
            ...rec,
          };
          users.push(newUser);
          idx = users.length - 1;
        }
      }

      if (idx < 0) {
        setResetMsg(
          "Account for this reset link could not be found locally. Please log in or sign up again, then request a new reset."
        );
        return;
      }

      const newHash = await sha256Hex(newPass);
      const updated = { ...users[idx], passwordHash: newHash };
      delete updated.password;
      users[idx] = updated;
      localStorage.setItem("users", JSON.stringify(users));

      const uid = updated.id;
      if (uid) {
        const nextById = { ...(byId || {}) };
        nextById[uid] = { ...(nextById[uid] || {}), ...updated };
        delete nextById[uid].password;
        localStorage.setItem("usersById", JSON.stringify(nextById));
      }

      try {
        if (map && map[resetToken]) {
          delete map[resetToken];
          localStorage.setItem("resetTokens", JSON.stringify(map));
        }
        localStorage.removeItem("lastResetEmail");
      } catch {}
    }

    // -------- 3) Clear auth caches & show success message --------
    try {
      const AUTH_SESSION_KEYS = [
        "currentUser",
        "authUserId",
        "activeUserId",
        "currentUserId",
        "loggedInUserId",
        "partnerAuth",
        "adminAuth",
      ];
      AUTH_SESSION_KEYS.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
        try {
          sessionStorage.removeItem(k);
        } catch {}
      });

      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sk_trusted:") || k === "sk_device_id") {
          try {
            localStorage.removeItem(k);
          } catch {}
        }
      });
    } catch {}

    setResetMsg("Your password has been reset. You can now log in with your new password.");
  };

  /* ====== VIEWS ====== */
  const RoleTabs = (
    <div className="mt-6 grid grid-cols-2 rounded-lg overflow-hidden border border-slate-200">
      <button
        onClick={() => setRole("student")}
        className={`py-2 font-medium ${
          role === "student" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
        }`}
        type="button"
      >
        Student
      </button>
      <button
        onClick={() => setRole("lecturer")}
        className={`py-2 font-medium ${
          role === "lecturer" ? "bg-blue-600 text-white" : "bg-white text-slate-700"
        }`}
        type="button"
      >
        Lecturer
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f0f6ff] via-white to-[#eef2ff]">
      <main className="flex-1">
        <section className="max-w-md mx-auto px-4 py-12">
          <div className="text-center">
            <img
              src="/images/1754280544595.jpeg"
              alt="ScholarsKnowledge Logo"
              className="mx-auto h-14 w-14 rounded-full object-cover"
            />
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">
              {mode === "forgot"
                ? "Forgot Password"
                : mode === "reset"
                ? "Reset Password"
                : "Log in"}
            </h1>
          </div>

          {/* LOGIN */}
          {mode === "login" && (
            <>
              {RoleTabs}

              <form
                onSubmit={onSubmitLogin}
                className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border"
              >
                {error && (
                  <p
                    className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">Email</span>
                  <input
                    type="email"
                    className="w-full border rounded px-3 py-2"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">Password</span>
                  <input
                    type="password"
                    className="w-full border rounded px-3 py-2"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>

                <div className="pt-1">
                  <div ref={turnstileRef} />
                  {!turnReady && (
                    <p className="mt-2 text-xs text-slate-500">
                      Human verification will appear here. If it doesn’t, refresh the page.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90"
                >
                  Log in
                </button>

                <div className="text-sm text-slate-600 text-center">
                  Don’t have an account?{" "}
                  {role === "lecturer" ? (
                    <Link
                      className="text-[#1a73e8] underline"
                      to="/lecturer-sign-up"
                    >
                      Create Lecturer account
                    </Link>
                  ) : (
                    <Link
                      className="text-[#1a73e8] underline"
                      to="/student-sign-up"
                    >
                      Create Student account
                    </Link>
                  )}
                </div>

                <div className="text-center">
                  <Link
                    className="inline-block mt-2 text-[#1a73e8] underline text-sm"
                    to="/login?mode=forgot"
                  >
                    Forgot password?
                  </Link>
                </div>
              </form>
            </>
          )}

          {/* FORGOT */}
          {mode === "forgot" && (
            <form
              onSubmit={onSubmitForgot}
              className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border"
            >
              {forgotError && (
                <p
                  className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2"
                  role="alert"
                >
                  {forgotError}
                </p>
              )}

              {!forgotSentToken ? (
                <>
                  <p className="text-sm text-slate-700">
                    Enter your registered email. We’ll send a password reset link.
                  </p>
                  <label className="block">
                    <span className="block text-sm text-slate-600 mb-1">Email</span>
                    <input
                      type="email"
                      className="w-full border rounded px-3 py-2"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </label>
                  <button className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90">
                    Send reset link
                  </button>
                  <div className="text-center">
                    <Link
                      className="inline-block mt-2 text-[#1a73e8] underline text-sm"
                      to="/login"
                    >
                      Back to login
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-700">
                    If that email exists, we’ve sent a password reset link. (Dev mode:
                    open it directly below.)
                  </p>
                  {forgotSentToken !== "dummy" && (
                    <div className="mt-3">
                      <Link
                        to={`/login?mode=reset&token=${encodeURIComponent(
                          forgotSentToken
                        )}`}
                        className="inline-block text-[#1a73e8] underline text-sm"
                      >
                        Open reset link
                      </Link>
                    </div>
                  )}
                  <div className="text-center">
                    <Link
                      className="inline-block mt-4 text-[#1a73e8] underline text-sm"
                      to="/login"
                    >
                      Back to login
                    </Link>
                  </div>
                </>
              )}
            </form>
          )}

          {/* RESET */}
          {mode === "reset" && (
            <form
              onSubmit={onSubmitReset}
              className="mt-6 space-y-4 bg-white/70 rounded-2xl p-6 border"
            >
              {resetMsg && (
                <p
                  className={`rounded px-3 py-2 ${
                    resetMsg.includes("reset link is invalid") ||
                    resetMsg.includes("expired")
                      ? "text-red-600 bg-red-50 border border-red-200"
                      : "text-green-700 bg-green-50 border border-green-200"
                  }`}
                >
                  {resetMsg}
                </p>
              )}

              <p className="text-sm text-slate-700">
                Choose a new password for your account.
              </p>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">New password</span>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="block">
                <span className="block text-sm text-slate-600 mb-1">
                  Confirm new password
                </span>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={newPass2}
                  onChange={(e) => setNewPass2(e.target.value)}
                  placeholder="Re-enter password"
                />
              </label>

              <button className="w-full bg-[#1a73e8] text-white py-2 rounded font-semibold hover:opacity-90">
                Set new password
              </button>

              <div className="text-center">
                <Link
                  className="inline-block mt-2 text-[#1a73e8] underline text-sm"
                  to="/login"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
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