// src/pages/PartnerWelcome.jsx  
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { isVerified } from "../lib/verifyGate";
import VerifyGate from "../components/VerifyGate";

/* ---------- API base (scholarships, etc.) ---------- */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5000";

/* Are we running in "serverless/local only" mode? */
const SERVERLESS =
  String(import.meta.env.VITE_SERVERLESS_MODE ?? "true").toLowerCase() ===
  "true";

/* ---------- Auth API base (email + password reset) ---------- */
const AUTH_BASE =
  (import.meta.env.VITE_API_BASE &&
    String(import.meta.env.VITE_API_BASE).trim()) ||
  (import.meta.env.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  "http://localhost:5001"; // same default as Login/AuthHandler

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

function setPartner(p) {
  localStorage.setItem("partnerAuth", JSON.stringify(p));
  window.dispatchEvent(new Event("storage"));
}

/** hash helper (same as Login / PartnerLogin) */
async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- Email change helper ---------- */
async function apiChangePartnerEmail(oldEmail, newEmail, currentPassword) {
  const body = {
    email: oldEmail,
    newEmail,
    currentPassword,
    role: "partner",
  };

  const res = await fetch(`${AUTH_BASE}/api/auth/change-email`, {
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
  return data; // { ok: true, email, role, oldEmail }
}

/* ---------- Keep local 'partners' in sync with login ---------- */
function syncLocalPartnerRecords(updatedUser, originalEmail) {
  if (!updatedUser) return;

  const idKey = String(updatedUser.id || "").trim();
  const newEmail = (updatedUser.email || "").trim().toLowerCase();
  const oldEmail = (originalEmail || "").trim().toLowerCase();

  // 1) partners array (used by PartnerLogin.jsx)
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

  // 2) optional partnersById map
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

/** Clean HTML -> plain text for compact list snippets */
function stripHtml(html = "") {
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").trim();
}
function truncate(s = "", n = 180) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** Normalize a scholarship into the fields we display */
function normalizeScholarship(s = {}) {
  return {
    id: s.id || s.scholarshipId || `sch_${Math.random().toString(36).slice(2)}`,
    title: s.title || s.name || "Untitled Scholarship",
    deadline: s.deadline || s.closeDate || s.dueDate || "",
    createdAt:
      s.createdAt || s.postedAt || s.created || s.timestamp || Date.now(),
    status: (s.status || "Open").toString(),
    partnerId: s.partnerId || s.ownerId || s.postedById || "",
    partnerEmail:
      (s.partnerEmail || s.postedByEmail || s.email || "").toLowerCase(),
    postedByEmail: (s.postedByEmail || s.email || "").toLowerCase(),
    orgName: s.orgName || s.organization || s.university || "",
    description: s.description || s.summary || "",
    amount: s.amount || s.value || "",
    link: s.link || s.applyLink || s.url || "",
  };
}

/** Decide the avatar URL from user object (signup should store one of these) */
function getPartnerAvatar(user) {
  if (!user) return "";
  return (
    user.photo ||
    user.logo ||
    user.logoUrl ||
    user.avatar ||
    user.avatarUrl ||
    ""
  );
}

/** Try API first for this partner's items, then fall back to localStorage */
async function loadAllScholarshipsForPartner(partner) {
  const partnerEmail = (
    partner?.email ||
    partner?.userEmail ||
    partner?.username ||
    ""
  ).toLowerCase();
  const partnerId = String(partner?.id || "");

  const readLocal = () => {
    // 🔗 Read from the unified local store plus legacy keys
    const keys = [
      "scholarships_local", // matches scholarshipsApi + PartnerSubmit fallback
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

  if (
    SERVERLESS ||
    API_BASE.includes("izhwiz3a17.execute-api") // current HTTP API
  ) {
    return readLocal();
  }

  try {
    const params = new URLSearchParams();
    if (partnerEmail) params.set("partnerEmail", partnerEmail);
    else if (partnerId) params.set("partnerId", partnerId);

    const res = await fetch(`${API_BASE}/api/scholarships?` + params.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];
    return list.map(normalizeScholarship);
  } catch {
    return readLocal();
  }
}

export default function PartnerWelcome() {
  const nav = useNavigate();
  const [user, setUser] = useState(() => getPartner());
  const [originalEmail] = useState(() => user?.email || "");

  // -------- VerifyGate state for partner email --------
  const emailForGate =
    (user?.email || user?.userEmail || user?.username || "").toLowerCase();
  const [verified, setVerified] = useState(() =>
    emailForGate ? isVerified(emailForGate) : false
  );

  useEffect(() => {
    if (emailForGate) {
      setVerified(isVerified(emailForGate));
    } else {
      setVerified(false);
    }
  }, [emailForGate]);

  const [editOpen, setEditOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const initialAvatar = getPartnerAvatar(user);

  // Profile form state (includes photo/logo)
  const [form, setForm] = useState(() => ({
    orgName: user?.orgName || "",
    contactName: user?.contactName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    website: user?.website || "",
    photo: initialAvatar || "",
  }));

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Scholarships (center panel)
  const [allScholarships, setAllScholarships] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const list = await loadAllScholarshipsForPartner(user || {});
      if (alive) setAllScholarships(list);
    };
    if (user) load();
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [user]);

  // Filter “mine”
  const myScholarships = useMemo(() => {
    if (!user) return [];
    const uId = user.id || "";
    const uEmail = (
      user.email ||
      user.userEmail ||
      user.username ||
      ""
    ).toLowerCase();
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

  const totalPosted = myScholarships.length;
  const pendingCount = myScholarships.filter((s) => {
    const st = String(s.status || "").toLowerCase();
    return st.includes("pending");
  }).length;
  const approvedCount = myScholarships.filter((s) => {
    const st = String(s.status || "").toLowerCase();
    return st.includes("approved");
  }).length;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // handle avatar/logo file change in EDIT modal
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
        newPw.length > 0 || confirmPw.length > 0 || currentPw.length > 0;

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

      // 1) Email change
      if (emailChanging) {
        if (!currentPw) {
          setPwErr("Please enter your current password to change email.");
          return;
        }
        await apiChangePartnerEmail(oldEmail, trimmedEmail, currentPw);
      }

      // 2) Password change (real DynamoDB update)
      if (wantsPwChange) {
        try {
          const resp = await fetch(`${AUTH_BASE}/api/auth/change-password`, {
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

      // 3) Update local user + hashes (including updated photo/logo)
      const updated = {
        ...(user || {}),
        ...form,
        email: trimmedEmail,
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

  // --------- If not logged in ----------
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-0px)] bg-gradient-to-br from-[#eef3ff] via-white to-[#f5f7fb]">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Partner Welcome
          </h1>
        </div>
        <Footer />
      </div>
    );
  }

  // --------- VerifyGate ----------
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
            <VerifyGate
              email={emailForGate}
              onVerified={() => setVerified(true)}
            />
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // --------- MAIN DASHBOARD (student-style layout) ----------
  const initials =
    (user?.orgName || "P")[0]?.toUpperCase() +
    (user?.contactName || "K")[0]?.toUpperCase();
  const avatarUrl = getPartnerAvatar(user);
  const verificationLabel = verified ? "Verified partner" : "Email not verified";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eef3ff] via-white to-[#f5f7fb]">
      {/* Top bar */}
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

      {/* Body */}
      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-2 lg:px-2 py-4 space-y-4">
          {/* Overview strip (3 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Organization summary card */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-4 py-3 flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.orgName || "Organization logo"}
                  className="h-10 w-10 rounded-full object-cover border border-white shadow-sm"
                />
              ) : (
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/90 text-white font-semibold">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Organization</div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {user?.orgName || "Your organization"}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {user?.email || "No email set"}
                </div>
              </div>
            </div>

            {/* Scholarships stats card — labels all in one line */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-4 py-4 flex flex-col gap-3">
              <div className="flex justify-between gap-4 text-[10px] sm:text-xs text-slate-500">
                <span className="flex-1 whitespace-nowrap">
                  Scholarships posted
                </span>
                <span className="flex-1 text-center whitespace-nowrap">
                  Pending for Approval
                </span>
                <span className="flex-1 text-right whitespace-nowrap">
                  Approved
                </span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
                    {totalPosted}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {pendingCount}
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {approvedCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Account status card */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Account status</div>
                <div className="text-sm font-semibold text-slate-900">
                  {verificationLabel}
                </div>
                <div className="text-xs text-slate-500">
                  Keep your info up to date for students.
                </div>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Edit profile
              </button>
            </div>
          </div>

          {/* Main 3-column layout: fixed side widths, flexible center */}
          <div className="grid gap-3 lg:gap-4 md:grid-cols-3 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
            {/* LEFT: profile card */}
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
                      <dt className="text-slate-500 min-w-[60px] text-left">
                        Email
                      </dt>
                      <dd className="font-medium text-right whitespace-nowrap overflow-hidden text-ellipsis">
                        {user?.email || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500 min-w-[60px] text-left">
                        Phone
                      </dt>
                      <dd className="font-medium text-right whitespace-nowrap overflow-hidden text-ellipsis">
                        {user?.phone || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500 min-w-[60px] text-left">
                        Website
                      </dt>
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

                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Quick tips
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                    <li>• Clear, simple eligibility helps more students apply.</li>
                    <li>• Add an apply link that works on mobile and desktop.</li>
                    <li>• Keep deadlines accurate to build trust.</li>
                  </ul>
                </div>
              </div>
            </aside>

            {/* CENTER: posted scholarships */}
            <main className="col-span-12 md:col-span-1">
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="px-4 lg:px-5 py-3 border-b border-slate-200 flex items-center justify-center">
                  <Link
                    to="/partner/submit-scholarship"
                    className="inline-flex items-center rounded-full bg-green-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Post new scholarship
                  </Link>
                </div>

                <div className="flex-1 h-[calc(100vh-3.5rem-160px)] overflow-y-auto">
                  {myScholarships.length === 0 ? (
                    <div className="h-[50vh] grid place-items-center text-sm text-slate-500">
                      No scholarship posted yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {myScholarships.map((sch) => {
                        const postedDate = new Date(
                          Number(sch.createdAt) || Date.parse(sch.createdAt)
                        ).toLocaleDateString();

                        const rawStatus = String(sch.status || "").toLowerCase();

                        // Friendly label for partners
                        let statusLabel = sch.status || "pending";
                        if (rawStatus === "pending") statusLabel = "Pending for Approval";
                        else if (rawStatus === "approved") statusLabel = "Approved";

                        // Color coding for the dot + pill
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

                        return (
                          <li
                            key={sch.id}
                            className="group hover:bg-slate-50/80 transition"
                          >
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
                                    <span className="whitespace-nowrap">
                                      {postedDate}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                  {sch.orgName && (
                                    <span className="truncate">
                                      Org: {sch.orgName}
                                    </span>
                                  )}
                                  {sch.amount && (
                                    <span>Amount: {sch.amount}</span>
                                  )}
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

                                {sch.link && (
                                  <div className="mt-1">
                                    <a
                                      href={sch.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-medium text-blue-700 hover:underline"
                                    >
                                      View / Apply
                                    </a>
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
                    Posting clear, scam-free scholarships helps students trust
                    your organization and our platform.
                  </p>
                </div>
              </div>
            </main>

            {/* RIGHT: partnership standards column */}
            <aside className="col-span-12 md:col-span-1">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Partnership standards
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-700">
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span>No essays for students.</span>
                    </li>
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span>No application fees.</span>
                    </li>

                    <li className="flex gap-2">
                      <span>✅</span>
                      <span>
                        The scholarship URL must point directly to the
                        provider’s official scholarship page and include enough
                        information to help students understand the application
                        process and apply with ease.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span>✅</span>
                      <span>
                        Scholarship providers must share a contact email using
                        their organization’s domain and ensure it remains
                        reachable.
                      </span>
                    </li>

                    <li className="flex gap-2">
                      <span>✅</span>
                      <span>
                        No confidential data collection (bank details, IDs,
                        SSNs, etc.).
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-indigo-600 text-white shadow-sm p-4">
                  <h3 className="text-sm font-semibold">
                    Make your scholarship stand out
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-indigo-100">
                    <li>• Use a clear title students understand instantly.</li>
                    <li>• Mention key fields of study or regions.</li>
                    <li>• Add a short 2–3 sentence summary.</li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-5 z-40">
          <div className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm shadow-lg">
            {msg}
          </div>
        </div>
      )}

      {/* EDIT MODAL (with avatar/logo editing) */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Update Account Information
              </h3>
              <button
                onClick={() => {
                  setEditOpen(false);
                  setPwErr("");
                  setCurrentPw("");
                  setNewPw("");
                  setConfirmPw("");
                }}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveUpdates} className="px-5 py-4">
              {/* Account fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium text-slate-700">
                    Organization
                  </div>
                  <input
                    name="orgName"
                    value={form.orgName}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-slate-700">
                    Contact Name
                  </div>
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
                  <div className="text-sm font-medium text-slate-700">
                    Website
                  </div>
                  <input
                    name="website"
                    value={form.website}
                    onChange={onChange}
                    placeholder="https://example.edu"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                {/* Logo / avatar URL + upload */}
                <label className="block md:col-span-2">
                  <div className="text-sm font-medium text-slate-700">
                    Logo / Avatar URL
                  </div>
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
                        <img
                          src={form.photo}
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
              </div>

              <hr className="my-5 border-slate-200" />

              {/* Password change */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Change Password
                </h4>
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
                    <div className="text-sm font-medium text-slate-700">
                      Current password
                    </div>
                    <input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder={
                        user?.password ? "Current password" : "Not set"
                      }
                      className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium text-slate-700">
                      New password
                    </div>
                    <input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="At least 6 characters"
                      className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium text-slate-700">
                      Confirm new password
                    </div>
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