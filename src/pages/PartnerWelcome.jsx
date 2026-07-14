// src/pages/PartnerWelcome.jsx
import { useEffect, useMemo, useState } from "react";
/*import { Link, useNavigate } from "react-router-dom";*/
import { Link, useNavigate, Navigate } from "react-router-dom";
import Footer from "../components/Footer";
import { isVerified } from "../lib/verifyGate";
import VerifyGate from "../components/VerifyGate";

async function apiUpdatePartnerProfile(payload) {
  const res = await fetch(`${AUTH_BASE}/api/auth/partner/update-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "UPDATE_FAILED");
  }
  return data.user;
}

/* ---------- API base (scholarships, etc.) ---------- */
const API_BASE = (
  import.meta.env.VITE_SCHOLARSHIPS_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5000"
).replace(/\/+$/, "");

/* Are we running in "serverless/local only" mode? */
const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "false").toLowerCase() === "true";

/* ---------- Auth API base ---------- */
const AUTH_BASE = (
  import.meta.env.VITE_PARTNER_API_BASE ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001"
).replace(/\/+$/, "");

/*const USE_SUPERTOKENS_TEST = true;*/
/*const USE_SUPERTOKENS_TEST =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";*/

  /* === SuperTokens controlled switch ======================= */
/*const USE_SUPERTOKENS_PROD = false;*/
const USE_SUPERTOKENS_PROD = true;

const USE_SUPERTOKENS_TEST =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  USE_SUPERTOKENS_PROD;
const IS_LOCALHOST =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const SUPERTOKENS_TEST_API =
  /*"https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st";*/
  "https://287gaj3pt3.execute-api.us-east-1.amazonaws.com/default/api/auth-st-prod";


/* ---------- Content types ---------- */
const CT_SCH = "SCHOLARSHIP";
const CT_FEL = "FELLOWSHIP";
const CT_FGA = "FUNDED_GRAD_ADMISSION";

/* ---------- Helpers ---------- */
function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

function getPartner() {
  try {
    return JSON.parse(localStorage.getItem("partnerAuth") || "null");
  } catch {
    return null;
  }
}

/*function setPartner(p) {
  localStorage.setItem("partnerAuth", JSON.stringify(p));
  window.dispatchEvent(new Event("storage"));
}*/
function setPartner(p) {
  localStorage.setItem("partnerAuth", JSON.stringify(p));

  localStorage.setItem("currentUser", JSON.stringify(p));
  sessionStorage.setItem("currentUser", JSON.stringify(p));

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("auth:changed"));
}

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function apiChangePartnerEmail(oldEmail, newEmail, currentPassword) {
  const body = {
    email: oldEmail,
    newEmail,
    currentPassword,
    role: "partner",
  };

  /*const res = await fetch(`${AUTH_BASE}/api/auth/change-email`, {*/
    const res = await fetch(
  USE_SUPERTOKENS_TEST
    ? `${SUPERTOKENS_TEST_API}/change-email`
    : `${AUTH_BASE}/api/auth/change-email`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const code = data.error || "UNKNOWN";
    if (code === "BAD_PASSWORD") {
      throw new Error("Current password is incorrect.");
    }
    if (code === "EMAIL_EXISTS") {
      throw new Error("That new email is already in use.");
    }
    throw new Error("Could not update email. Please try again.");
  }
  return data;
}

async function partnerGetProfile(email) {
  const res = await fetch(`${AUTH_BASE}/api/auth/partner/get-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    const msg = data?.error || `HTTP_${res.status}`;
    throw new Error(msg);
  }
  return data.user || {};
}

async function partnerUpdateProfile(payload) {
  const res = await fetch(`${AUTH_BASE}/api/auth/partner/update-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    const msg = data?.error || `HTTP_${res.status}`;
    throw new Error(msg);
  }
  return data.user || {};
}

function syncLocalPartnerRecords(updatedUser, originalEmail) {
  if (!updatedUser) return;

  const idKey = String(updatedUser.id || "").trim();
  const newEmail = (updatedUser.email || "").trim().toLowerCase();
  const oldEmail = (originalEmail || "").trim().toLowerCase();

  const partners = safeParse(localStorage.getItem("partners")) || [];
  const idx = partners.findIndex((p) => {
    const pid = String(p.id || "").trim();
    const pEmail = (p.email || "").trim().toLowerCase();
    return (
      (idKey && pid && pid === idKey) ||
      (oldEmail && pEmail === oldEmail) ||
      (newEmail && pEmail === newEmail)
    );
  });

  if (idx >= 0) {
    partners[idx] = { ...partners[idx], ...updatedUser };
    try {
      localStorage.setItem("partners", JSON.stringify(partners));
    } catch {
      // ignore
    }
  }

  const map = safeParse(localStorage.getItem("partnersById")) || {};
  if (idKey && map[idKey]) {
    map[idKey] = { ...map[idKey], ...updatedUser };
    try {
      localStorage.setItem("partnersById", JSON.stringify(map));
    } catch {
      // ignore
    }
  }
}

function stripHtml(html = "") {
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").trim();
}

function truncate(s = "", n = 180) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function normalizeScholarship(s = {}) {
  const contentType = String(s.contentType || CT_SCH).toUpperCase();

  return {
    id: s.id || s.scholarshipId || `sch_${Math.random().toString(36).slice(2)}`,
    title: s.title || s.name || "Untitled Listing",
    deadline: s.deadline || s.closeDate || s.dueDate || "",
    createdAt: s.createdAt || s.postedAt || s.created || s.timestamp || Date.now(),
    status: (s.status || "Open").toString(),
    partnerId: s.partnerId || s.ownerId || s.postedById || "",
    partnerEmail: (s.partnerEmail || s.postedByEmail || s.email || "").toLowerCase(),
    postedByEmail: (s.postedByEmail || s.email || "").toLowerCase(),
    orgName: s.orgName || s.organization || s.university || s.provider || "",
    description: s.description || s.summary || "",
    amount: s.amount || s.value || "",
    link: s.link || s.applyLink || s.url || "",
    contentType,
    views: Number(s.views || 0),
    applyClicks: Number(s.applyClicks || 0),
    websiteClicks: Number(s.websiteClicks || 0),
  };
}

function getPartnerAvatar(user) {
  if (!user) return "";
  return user.photo || user.logo || user.logoUrl || user.avatar || user.avatarUrl || "";
}

function listingTypeLabel(item) {
  const ct = String(item?.contentType || CT_SCH).toUpperCase();
  if (ct === CT_FEL) return "Fellowship";
  if (ct === CT_FGA) return "Funded Admission";
  return "Scholarship";
}

function listingPublicPath(item) {
  const ct = String(item?.contentType || CT_SCH).toUpperCase();
  if (ct === CT_FEL) return `/fellowship/${item.id}`;
  if (ct === CT_FGA) return `/funded-graduate-admission/${item.id}`;
  return `/scholarship/${item.id}`;
}

async function loadAllScholarshipsForPartner(partner) {
  const partnerEmail = (
    partner?.email ||
    partner?.userEmail ||
    partner?.username ||
    ""
  ).toLowerCase();

  const partnerId = String(partner?.id || "");

  const readLocal = () => {
    const keys = [
      "scholarships_local",
      "partnerScholarships",
      "scholarships",
      "postedScholarships",
    ];
    let merged = [];
    for (const k of keys) {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || "[]");
        if (Array.isArray(arr)) merged = merged.concat(arr);
      } catch {
        // ignore
      }
    }
    return merged.map(normalizeScholarship);
  };

  if (SERVERLESS) {
    return readLocal();
  }

  try {
    const baseParams = new URLSearchParams();
    if (partnerEmail) baseParams.set("partnerEmail", partnerEmail);
    else if (partnerId) baseParams.set("partnerId", partnerId);

    const fetchByType = async (ct) => {
      const p = new URLSearchParams(baseParams);
      p.set("contentType", ct);

      const url = `${API_BASE}/api/scholarships?${p.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];

      return list;
    };

    const [sch, fel, funded] = await Promise.all([
      fetchByType(CT_SCH),
      fetchByType(CT_FEL),
      fetchByType(CT_FGA),
    ]);

    const merged = [...(sch || []), ...(fel || []), ...(funded || [])];

    const seen = new Set();
    const unique = [];
    for (const it of merged) {
      const id = String(it?.id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(it);
    }

    return unique.map(normalizeScholarship);
  } catch (e) {
    console.warn("[PartnerWelcome] API fetch failed, falling back to local:", e);
    return readLocal();
  }
}

export default function PartnerWelcome() {
  const nav = useNavigate();
  const [user, setUser] = useState(() => getPartner());
  const [originalEmail] = useState(() => user?.email || "");

  const emailForGate = (user?.email || user?.userEmail || user?.username || "").toLowerCase();
  const [verified, setVerified] = useState(() => (emailForGate ? isVerified(emailForGate) : false));

  useEffect(() => {
    if (!emailForGate) {
      setVerified(false);
      return;
    }
    setVerified((prev) => (prev ? true : isVerified(emailForGate)));
  }, [emailForGate]);

  const [editOpen, setEditOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const [statsOpen, setStatsOpen] = useState(false);
  const [statsItem, setStatsItem] = useState(null);

  function openStatsModal(sch) {
    setStatsItem(sch || null);
    setStatsOpen(true);
  }

  function closeStatsModal() {
    setStatsOpen(false);
    setStatsItem(null);
  }

  function num(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }

  const initialAvatar = getPartnerAvatar(user);

  const [form, setForm] = useState(() => ({
    orgName: user?.orgName || "",
    contactName: user?.contactName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    website: user?.website || "",
    photo: initialAvatar || "",
  }));

  const [profileLoadedFor, setProfileLoadedFor] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        /*if (SERVERLESS) return;*/
        if (SERVERLESS || IS_LOCALHOST) return;
        const email = (user?.email || "").trim().toLowerCase();
        if (!email) return;

        if (profileLoadedFor === email) return;

        const u = await partnerGetProfile(email);
        if (cancelled) return;

        /*const next = {
          ...user,
          orgName: u.orgName ?? u.organization ?? user?.orgName ?? "",
          contactName: u.contactName ?? user?.contactName ?? "",
          phone: u.phone ?? user?.phone ?? "",
          website: u.website ?? user?.website ?? "",
          logoUrl: u.logoUrl ?? user?.logoUrl ?? "",
          bannerUrl: u.bannerUrl ?? user?.bannerUrl ?? "",
          photo: u.logoUrl ?? user?.photo ?? user?.logoUrl ?? "",
          email: (u.email || email).toLowerCase(),
        };*/
        const next = {
  ...(user || {}),
  ...u,

  orgName:
    u.orgName ||
    u.organization ||
    user?.orgName ||
    user?.organization ||
    "",

  organization:
    u.organization ||
    u.orgName ||
    user?.organization ||
    user?.orgName ||
    "",

  contactName:
    u.contactName ||
    user?.contactName ||
    "",

  phone:
    u.phone ||
    user?.phone ||
    "",

  website:
    u.website ||
    user?.website ||
    "",

  logoUrl:
    u.logoUrl ||
    u.photo ||
    u.photoUrl ||
    user?.logoUrl ||
    user?.photo ||
    user?.photoUrl ||
    "",

  photo:
    u.photo ||
    u.logoUrl ||
    u.photoUrl ||
    user?.photo ||
    user?.logoUrl ||
    user?.photoUrl ||
    "",

  photoUrl:
    u.photoUrl ||
    u.photo ||
    u.logoUrl ||
    user?.photoUrl ||
    user?.photo ||
    user?.logoUrl ||
    "",

  bannerUrl:
    u.bannerUrl ||
    u.banner ||
    user?.bannerUrl ||
    user?.banner ||
    "",

  banner:
    u.banner ||
    u.bannerUrl ||
    user?.banner ||
    user?.bannerUrl ||
    "",

  email:
    String(u.email || user?.email || email)
      .trim()
      .toLowerCase(),
};

        setPartner(next);
        setUser(next);

        setForm((f) => ({
          ...f,
          orgName: next.orgName || "",
          contactName: next.contactName || "",
          email: next.email || f.email || "",
          phone: next.phone || "",
          website: next.website || "",
          photo: (next.photo || next.logoUrl || "").trim(),
        }));

        setProfileLoadedFor(email);
      } catch (e) {
        console.warn("[PartnerWelcome] get-profile failed:", e);
        setProfileLoadedFor((user?.email || "").trim().toLowerCase() || "");
      }
    }

    if (user?.email) loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.email, profileLoadedFor]);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [allScholarships, setAllScholarships] = useState([]);

  const partnerKey = useMemo(() => {
    const email = (user?.email || user?.userEmail || user?.username || "").trim().toLowerCase();
    const id = String(user?.id || user?.userId || "").trim();
    return email || id || "";
  }, [user?.email, user?.userEmail, user?.username, user?.id, user?.userId]);

  const [loadingScholarships, setLoadingScholarships] = useState(false);
  const [schErr, setSchErr] = useState("");

  useEffect(() => {
    let alive = true;
    let inFlight = false;

    const load = async () => {
      if (!partnerKey) return;
      if (inFlight) return;
      inFlight = true;

      setSchErr("");
      setLoadingScholarships(true);

      try {
        const list = await loadAllScholarshipsForPartner(user || {});
        if (alive) setAllScholarships(Array.isArray(list) ? list : []);
      } catch (e) {
        if (alive) setSchErr(e?.message || "Failed to load listings");
      } finally {
        inFlight = false;
        if (alive) setLoadingScholarships(false);
      }
    };

    load();

    const onStorage = (e) => {
      if (e?.key && e.key !== "partnerAuth") return;
      load();
    };

    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [partnerKey]);

  const myScholarships = useMemo(() => {
    if (!user) return [];
    const uId = user.id || "";
    const uEmail = (user.email || user.userEmail || user.username || "").toLowerCase();
    const uOrg = (user.orgName || "").trim().toLowerCase();

    return allScholarships
      .filter((s) => {
        const byId = s.partnerId && String(s.partnerId) === String(uId);
        const byEmail =
          (s.partnerEmail && s.partnerEmail.toLowerCase() === uEmail) ||
          (s.postedByEmail && s.postedByEmail.toLowerCase() === uEmail);
        const byOrg = s.orgName && s.orgName.toLowerCase() === uOrg;
        return byId || byEmail || byOrg;
      })
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [allScholarships, user]);

  const clickTotals = useMemo(() => {
    return myScholarships.reduce(
      (acc, s) => {
        acc.views += Number(s.views || 0);
        acc.apply += Number(s.applyClicks || 0);
        acc.website += Number(s.websiteClicks || 0);
        return acc;
      },
      { views: 0, apply: 0, website: 0 }
    );
  }, [myScholarships]);

  const totalPosted = myScholarships.length;
  const pendingCount = myScholarships.filter((s) => {
    const st = String(s.status || "").toLowerCase();
    return st.includes("pending");
  }).length;
  const approvedCount = myScholarships.filter((s) => {
    const st = String(s.status || "").toLowerCase();
    return st.includes("approved");
  }).length;

  const { totalViews, totalApplyClicks, totalWebsiteClicks } = useMemo(() => {
    let v = 0,
      a = 0,
      w = 0;
    for (const s of myScholarships) {
      v += Number(s?.views || 0);
      a += Number(s?.applyClicks || 0);
      w += Number(s?.websiteClicks || 0);
    }
    return { totalViews: v, totalApplyClicks: a, totalWebsiteClicks: w };
  }, [myScholarships]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onAvatarFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      console.warn("Selected file is not an image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setForm((f) => ({ ...f, photo: dataUrl }));
    };
    reader.onerror = () => {
      console.error("Error reading avatar file");
    };
    reader.readAsDataURL(file);
  };

  const saveUpdates = async (e) => {
    e.preventDefault();
    setPwErr("");
    setMsg("");
    setSaving(true);

    try {
      const emailChanging = (form.email || "") !== (user?.email || "");
      const wantsPwChange =
        /*newPw.length > 0 || confirmPw.length > 0 || currentPw.length > 0;*/
        newPw.trim().length > 0 || confirmPw.trim().length > 0;

      const trimmedEmail = (form.email || "").trim().toLowerCase();
      const oldEmail = (originalEmail || user?.email || "").trim().toLowerCase();

      if (!trimmedEmail) {
        setPwErr("Email is required.");
        return;
      }

      if (wantsPwChange) {
        if (!newPw || newPw.length < 6) {
          setPwErr("New password must be at least 6 characters.");
          return;
        }
        if (newPw !== confirmPw) {
          setPwErr("New passwords do not match.");
          return;
        }
        if (!currentPw) {
          setPwErr("Please enter your current password.");
          return;
        }

        /*if (user?.passwordHash) {
          const enteredHash = await sha256Hex(currentPw);
          if (enteredHash !== user.passwordHash) {
            setPwErr("Current password is incorrect.");
            return;
          }
        } else if (user?.password) {
          if (currentPw !== user.password) {
            setPwErr("Current password is incorrect.");
            return;
          }
        }
      }*/
      if (!USE_SUPERTOKENS_TEST) {
  if (user?.passwordHash) {
    const enteredHash = await sha256Hex(currentPw);
    if (enteredHash !== user.passwordHash) {
      setPwErr("Current password is incorrect.");
      return;
    }
  } else if (user?.password) {
    if (currentPw !== user.password) {
      setPwErr("Current password is incorrect.");
      return;
    }
  }
}
}

      if (emailChanging) {
        if (!currentPw) {
          setPwErr("Please enter your current password to change email.");
          return;
        }
        await apiChangePartnerEmail(oldEmail, trimmedEmail, currentPw);
      }

      if (wantsPwChange) {
        try {
          /*const resp = await fetch(`${AUTH_BASE}/api/auth/change-password`, {*/
            const resp = await fetch(
  USE_SUPERTOKENS_TEST
    ? `${SUPERTOKENS_TEST_API}/change-password`
    : `${AUTH_BASE}/api/auth/change-password`,
  {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: trimmedEmail,
              currentPassword: currentPw,
              newPassword: newPw,
              role: "partner",
            }),
          });

          const data = await resp.json().catch(() => ({}));

          if (!resp.ok || !data.ok) {
            const code = data.error || "UNKNOWN";
            if (code === "BAD_PASSWORD") {
              throw new Error("Current password is incorrect.");
            }
            throw new Error("Could not update password. Please try again.");
          }
        } catch (err) {
          console.warn("[Partner password change] backend error:", err);
          throw err;
        }
      }

      /*if (!SERVERLESS) {*/
      if (!SERVERLESS && !USE_SUPERTOKENS_TEST) {
        const payload = {
          email: trimmedEmail,
          userId: user?.id || user?.userId || "",
          logoUrl: String(form.photo || "").trim(),
          bannerUrl: String(user?.bannerUrl || "").trim(),
          phone: String(form.phone || "").trim(),
          website: String(form.website || "").trim(),
          contactName: String(form.contactName || "").trim(),
          organization: String(form.orgName || "").trim(),
        };

        if (payload.userId) {
          const persisted = await partnerUpdateProfile(payload);

          /*const merged = {
            ...(user || {}),
            orgName: persisted.orgName ?? persisted.organization ?? payload.organization,
            contactName: persisted.contactName ?? payload.contactName,
            phone: persisted.phone ?? payload.phone,
            website: persisted.website ?? payload.website,
            email: (persisted.email || payload.email).toLowerCase(),
            logoUrl: persisted.logoUrl ?? payload.logoUrl,
            bannerUrl: persisted.bannerUrl ?? payload.bannerUrl,
            photo: (persisted.logoUrl ?? payload.logoUrl) || (user?.photo || ""),
          };*/

          const merged = {
  ...(user || {}),

  orgName:
    persisted.orgName ??
    persisted.organization ??
    payload.organization,

  organization:
    persisted.organization ??
    persisted.orgName ??
    payload.organization,

  contactName:
    persisted.contactName ??
    payload.contactName,

  phone:
    persisted.phone ??
    payload.phone,

  website:
    persisted.website ??
    payload.website,

  email:
    (persisted.email || payload.email).toLowerCase(),

  logoUrl:
    persisted.logoUrl ??
    payload.logoUrl,

  bannerUrl:
    persisted.bannerUrl ??
    payload.bannerUrl,

  photo:
    (persisted.logoUrl ?? payload.logoUrl) ||
    user?.photo ||
    "",
};



          setPartner(merged);
          setUser(merged);

          setForm((f) => ({
            ...f,
            orgName: merged.orgName || "",
            contactName: merged.contactName || "",
            email: merged.email || f.email || "",
            phone: merged.phone || "",
            website: merged.website || "",
            photo: merged.photo || merged.logoUrl || "",
          }));
        } else {
          console.warn("[PartnerWelcome] Missing userId; update-profile skipped.");
        }
      }

      /*const backendUser = await apiUpdatePartnerProfile({
        email: trimmedEmail,
        userId: user?.userId || user?.id,
        organization: form.orgName,
        contactName: form.contactName,
        phone: form.phone,
        website: form.website,
        logoUrl: form.photo || "",
      });*/
      const backendUser = USE_SUPERTOKENS_TEST
  ? {
      ...(user || {}),
      email: trimmedEmail,
      organization: form.orgName,
      contactName: form.contactName,
      phone: form.phone,
      website: form.website,
      logoUrl: form.photo || "",
    }
  : await apiUpdatePartnerProfile({
      email: trimmedEmail,
      userId: user?.userId || user?.id,
      organization: form.orgName,
      contactName: form.contactName,
      phone: form.phone,
      website: form.website,
      logoUrl: form.photo || "",
    });

      const updated = {
        ...(user || {}),
        ...backendUser,
        orgName: backendUser.organization,
        photo: backendUser.logoUrl,
      };

      if (wantsPwChange) {
        updated.passwordHash = await sha256Hex(newPw);
        delete updated.password;
      }

      setPartner(updated);
      setUser(updated);
      syncLocalPartnerRecords(updated, originalEmail);

      setEditOpen(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");

      setMsg("Account information updated.");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      console.error("[Partner saveUpdates] error:", err);
      setPwErr(err.message || "Could not update account information.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
  localStorage.removeItem("partnerAuth");
  nav("/partner/login", { replace: true });
};
  

  {/*if (!user) {
    return (
      <div className="min-h-[calc(100vh-0px)] bg-gradient-to-br from-[#eef3ff] via-white to-[#f5f7fb]">*/}
if (!user) {
  return <Navigate to="/partner/login" replace />;
  return null;
}
        /*<div className="max-w-5xl mx-auto px-4 lg:px-8 py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Partner Welcome
          </h1>
        </div>
        <Footer />
      </div>
    );
  }*/

  if (emailForGate && !verified) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eef3ff] via-white to-[#f5f7fb]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-indigo-50/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white font-bold">
                SK
              </span>
              <h1 className="text-base sm:text-lg font-semibold text-slate-900">
                ScholarsKnowledge — Partner
              </h1>
            </div>
            <div className="text-sm text-slate-700">
              Welcome{user?.contactName ? `, ${user.contactName}` : ""}!
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <VerifyGate email={emailForGate} onVerified={() => setVerified(true)} />
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const initials =
    (user?.orgName || "P")[0]?.toUpperCase() +
    (user?.contactName || "K")[0]?.toUpperCase();
  const avatarUrl = getPartnerAvatar(user);
  const verificationLabel = verified ? "Verified partner" : "Email not verified";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eef3ff] via-white to-[#f5f7fb]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-indigo-50/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white font-bold">
              SK
            </span>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900">
              ScholarsKnowledge — Partner Dashboard
            </h1>
          </div>
          <div className="text-xs sm:text-sm text-slate-700">
            Welcome{user?.contactName ? `, ${user.contactName}` : ""}!
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-2 lg:px-8 py-2 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_260px] gap-4 items-stretch">
            <div className="h-full w-full rounded-2xl bg-white shadow-sm border border-slate-200 px-3 py-2.5 flex items-center gap-2.5">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.orgName || "Organization logo"}
                  className="h-9 w-9 rounded-full object-cover border border-white shadow-sm"
                />
              ) : (
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/90 text-white text-sm font-semibold">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 leading-tight">Organization</div>
                <div className="text-sm font-semibold text-slate-900 truncate leading-tight">
                  {user?.orgName || "Your organization"}
                </div>
                <div className="text-[11px] text-slate-500 truncate leading-tight">
                  {user?.email || "No email set"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full w-full">
              <div className="h-full w-full rounded-2xl bg-white shadow-sm border border-slate-200 px-3.5 py-3 flex flex-col gap-2.5">
                <div className="flex justify-between gap-2 text-[11px] text-slate-500 leading-tight">
                  <span className="flex-1 whitespace-nowrap">Posted</span>
                  <span className="flex-1 text-center whitespace-nowrap">Pending</span>
                  <span className="flex-1 text-right whitespace-nowrap">Approved</span>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="flex-1">
                    <div className="mt-1 text-2xl font-bold text-slate-900 leading-none">
                      {totalPosted}
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="mt-1 text-xl font-semibold text-slate-900 leading-none">
                      {pendingCount}
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="mt-1 text-xl font-semibold text-slate-900 leading-none">
                      {approvedCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-full w-full rounded-2xl bg-white shadow-sm border border-slate-200 px-3.5 py-3 flex flex-col gap-2">
                <div className="text-[11px] text-slate-500 leading-tight text-center">
                  Listing clicks stats
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                    <div className="text-[11px] text-slate-500 leading-tight">Views</div>
                    <div className="text-xl font-bold text-slate-900 leading-none">
                      {clickTotals.views}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                    <div className="text-[11px] text-slate-500 leading-tight">Clicks on Apply</div>
                    <div className="text-xl font-bold text-slate-900 leading-none">
                      {clickTotals.apply}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                    <div className="text-[11px] text-slate-500 leading-tight">Website visits</div>
                    <div className="text-xl font-bold text-slate-900 leading-none">
                      {clickTotals.website}
                    </div>
                  </div>
                </div>

                <div className="mt-0.5 text-[11px] text-slate-500 leading-tight text-center">
                  Totals across all your listings.
                </div>
              </div>
            </div>

            <div className="h-full w-full rounded-2xl bg-white shadow-sm border border-slate-200 px-3 py-2.5 flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 leading-tight">Account status</div>
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {verificationLabel}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Keep your info up to date for students.
                </div>
              </div>

              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shrink-0"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:gap-4 md:grid-cols-3 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
            <aside className="col-span-12 md:col-span-1">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
                  <div className="flex flex-col items-center gap-3">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.orgName || "Organization logo"}
                        className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/90 text-white text-xl font-semibold">
                        {initials}
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-sm font-semibold text-slate-900">
                        {user?.orgName || "Organization"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {user?.contactName || "Contact person"}
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 space-y-2 text-xs sm:text-sm text-slate-700">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500 min-w-[60px] text-left">Email</dt>
                      <dd className="font-medium text-right whitespace-nowrap overflow-hidden text-ellipsis">
                        {user?.email || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500 min-w-[60px] text-left">Phone</dt>
                      <dd className="font-medium text-right whitespace-nowrap overflow-hidden text-ellipsis">
                        {user?.phone || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500 min-w-[60px] text-left">Website</dt>
                      <dd className="font-medium text-right whitespace-nowrap overflow-hidden text-ellipsis">
                        {user?.website || "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setEditOpen(true)}
                      className="w-full rounded-md bg-indigo-600 text-white px-3 py-2 text-sm font-semibold hover:bg-indigo-700"
                    >
                      Update account info
                    </button>
                    <Link
                      to="/partner/dashboard"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 text-center"
                    >
                      Go to full dashboard
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Log out
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200/40 shadow-none p-4">
                  <h3 className="text-sm font-semibold text-white text-center -mx-4 -mt-4 mb-4">
                    <span className="block w-full bg-[#0A4595] py-2 rounded-t-2xl">
                      Scholarship / Fellowship Posting Quick Tips
                    </span>
                  </h3>

                  <ul className="mt-2 space-y-3 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span>
                        Add your organization’s official logo to clearly identify the provider and build credibility with applicants.
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span>
                        Include a strong banner image to visually highlight the opportunity and attract student attention.
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span>
                        Provide a direct link to the official opportunity page so applicants can access full details and apply easily.
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span>
                        Include a link to the organization’s official website to help applicants verify the provider.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>

            <main className="col-span-12 md:col-span-1">
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="px-4 lg:px-5 py-3 border-b border-slate-200 flex items-center justify-center">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Link
                      to="/partner/submit-scholarship"
                      className="inline-flex items-center rounded-full bg-green-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Post Scholarship
                    </Link>

                    <Link
                      to="/partner/submit-scholarship"
                      className="inline-flex items-center rounded-full bg-violet-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      Post Fellowship
                    </Link>

                    <Link
                      to="/partner/submit-funded-graduate-admission"
                      className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Post Funded Admission
                    </Link>
                  </div>
                </div>

                <div className="flex-1 h-[calc(100vh-3.5rem-160px)] overflow-y-auto">
                  {loadingScholarships ? (
                    <div className="h-[50vh] grid place-items-center text-sm text-slate-500">
                      Loading listings...
                    </div>
                  ) : schErr ? (
                    <div className="h-[50vh] grid place-items-center text-sm text-red-600">
                      {schErr}
                    </div>
                  ) : myScholarships.length === 0 ? (
                    <div className="h-[50vh] grid place-items-center text-sm text-slate-500">
                      No opportunity posted yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {myScholarships.map((sch) => {
                        const postedDate = new Date(
                          Number(sch.createdAt) || Date.parse(sch.createdAt)
                        ).toLocaleDateString();

                        const rawStatus = String(sch.status || "").toLowerCase();

                        let statusLabel = sch.status || "pending";
                        if (rawStatus === "pending") statusLabel = "Pending for Approval";
                        else if (rawStatus === "approved") statusLabel = "Approved";

                        const dotClass =
                          rawStatus === "approved"
                            ? "bg-green-500"
                            : rawStatus === "pending"
                            ? "bg-amber-400"
                            : "bg-slate-300";

                        const pillClass =
                          rawStatus === "approved"
                            ? "bg-green-50 text-green-700 ring-green-200"
                            : rawStatus === "pending"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-slate-100 text-slate-700 ring-slate-200";

                        const type = listingTypeLabel(sch);
                        const publicPath = listingPublicPath(sch);

                        return (
                          <li key={sch.id} className="group hover:bg-slate-50/80 transition">
                            <div className="px-4 lg:px-5 py-3 flex items-start gap-4">
                              <div
                                className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`}
                                title={statusLabel}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <h3 className="truncate text-sm font-semibold text-slate-900">
                                    {sch.title}
                                  </h3>
                                  <div className="shrink-0 flex items-center gap-3 text-xs text-slate-500">
                                    {sch.deadline && (
                                      <span className="whitespace-nowrap">
                                        Deadline: {sch.deadline}
                                      </span>
                                    )}
                                    <span className="whitespace-nowrap">{postedDate}</span>
                                  </div>
                                </div>

                                <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                  {sch.orgName && <span className="truncate">Org: {sch.orgName}</span>}
                                  {sch.amount && <span>Amount: {sch.amount}</span>}
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 ring-1 text-[11px] bg-violet-50 text-violet-700 ring-violet-200">
                                    {type}
                                  </span>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 ring-1 text-[11px] ${pillClass}`}
                                  >
                                    {statusLabel}
                                  </span>
                                </div>

                                {sch.description && (
                                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                    {truncate(stripHtml(sch.description), 180)}
                                  </p>
                                )}

                                {(sch.link || publicPath) && (
                                  <div className="mt-1">
                                    {sch.link ? (
                                      <a
                                        href={sch.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-medium text-blue-700 hover:underline"
                                      >
                                        View / Apply
                                      </a>
                                    ) : (
                                      <Link
                                        to={publicPath}
                                        className="text-xs font-medium text-blue-700 hover:underline"
                                      >
                                        View details
                                      </Link>
                                    )}

                                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-600">
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                        Views: {sch.views ?? 0}
                                      </span>
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                        Clicks on Apply: {sch.applyClicks ?? 0}
                                      </span>
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                        Website visits: {sch.websiteClicks ?? 0}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => openStatsModal(sch)}
                                        className="rounded-full border border-slate-300 bg-white px-3 py-0.6 hover:bg-slate-50"
                                      >
                                        Details
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="border-t border-slate-200 px-4 lg:px-5 py-3 bg-slate-50/60 rounded-b-2xl">
                  <p className="text-xs text-slate-500 text-center">
                    Posting clear, trustworthy opportunities helps students trust your organization and our platform.
                  </p>
                </div>
              </div>
            </main>

            <aside className="col-span-12 md:col-span-1">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Partnership standards</h3>
                  <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-700">
                    <li className="flex gap-2"><span>✅</span><span>Scholarships and Academic programs must be verified.</span></li>
                    <li className="flex gap-2"><span>✅</span><span>No application fees.</span></li>
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span>
                        The opportunity URL must point directly to the provider’s official page and include enough
                        information to help students understand the application process and apply with ease.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span>
                        Universities and providers must share a contact email using their organization’s domain and ensure it remains reachable.
                      </span>
                    </li>
                    <li className="flex gap-2"><span>✅</span><span>No confidential data collection (bank details, IDs, SSNs, etc.).</span></li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200/40 shadow-none p-4">
                  <h3 className="text-sm font-semibold text-white text-center -mx-4 -mt-4 mb-4">
                    <span className="block w-full bg-[#0A4595] py-2 rounded-t-2xl">
                      Funded Program Posting Quick Tips
                    </span>
                  </h3>

                  <ul className="mt-2 space-y-3 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span>
                        Add your University’s official logo to clearly identify the provider and build credibility with applicants.
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span>
                        Include a program banner image to visually highlight the opportunity and attract student attention.
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span>
                        Provide a direct link to the official program webpage so applicants can access full details and apply.
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span>
                        Include a link to the University’s official website to help applicants verify the institution.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {msg && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-5 z-40">
          <div className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm shadow-lg">
            {msg}
          </div>
        </div>
      )}

      {statsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeStatsModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {statsItem?.title || "Listing details"}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {statsItem?.orgName ? statsItem.orgName : ""}
                </div>
              </div>

              <button
                type="button"
                onClick={closeStatsModal}
                className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700"
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <div className="mb-3 text-xs text-slate-500">
                Type: <span className="font-medium text-slate-700">{listingTypeLabel(statsItem)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Views</div>
                  <div className="text-xl font-bold text-slate-900">
                    {num(statsItem?.views)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Clicks on Apply</div>
                  <div className="text-xl font-bold text-slate-900">
                    {num(statsItem?.applyClicks)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Website visits</div>
                  <div className="text-xl font-bold text-slate-900">
                    {num(statsItem?.websiteClicks)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={closeStatsModal}
                  className="text-sm rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto px-4 py-6">
          <div className="w-full max-w-xl mx-auto mt-32 rounded-2xl bg-white shadow-xl max-h-[calc(100vh-9rem)] flex flex-col">
            <div className="relative px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 text-center">
                Update Account Information
              </h3>

              <button
                type="button"
                onClick={() => {
                  setEditOpen(false);
                  setPwErr("");
                  setCurrentPw("");
                  setNewPw("");
                  setConfirmPw("");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveUpdates} className="px-5 py-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium text-slate-700">Organization</div>
                  <input
                    name="orgName"
                    value={form.orgName}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-slate-700">Contact Name</div>
                  <input
                    name="contactName"
                    value={form.contactName}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-slate-700">Email</div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-slate-700">Phone</div>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block md:col-span-2">
                  <div className="text-sm font-medium text-slate-700">Website</div>
                  <input
                    name="website"
                    value={form.website}
                    onChange={onChange}
                    placeholder="https://example.edu"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block md:col-span-2">
                  <div className="text-sm font-medium text-slate-700">Logo / Avatar URL</div>
                  <input
                    name="photo"
                    value={form.photo}
                    onChange={onChange}
                    placeholder="https://example.edu/logo.png or data URL"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                  <div className="mt-2 w-full border border-slate-300 rounded px-3 py-2 bg-slate-50 inline-flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <span aria-hidden="true">📁</span>
                      <span>Upload logo / avatar image (optional)</span>
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onAvatarFileChange}
                      className="text-xs cursor-pointer"
                    />
                  </div>
                  {form.photo && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-300 bg-slate-100">
                        <img src={form.photo} alt="Logo preview" className="h-full w-full object-cover" />
                      </div>
                      <span className="text-xs text-slate-500">
                        Preview of your organization avatar.
                      </span>
                    </div>
                  )}
                </label>
              </div>

              <hr className="my-5 border-slate-200" />

              <div>
                <h4 className="text-sm font-semibold text-slate-800">Change Password</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {user?.password
                    ? "Update your password below."
                    : "Set a password for quicker login next time."}
                </p>

                {pwErr && (
                  <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-red-700 text-sm">
                    {pwErr}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="block">
                    <div className="text-sm font-medium text-slate-700">Current password</div>
                    <input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder={user?.password ? "Current password" : "Not set"}
                      className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium text-slate-700">New password</div>
                    <input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="At least 6 characters"
                      className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium text-slate-700">Confirm new password</div>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Repeat new password"
                      className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setPwErr("");
                    setCurrentPw("");
                    setNewPw("");
                    setConfirmPw("");
                  }}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}