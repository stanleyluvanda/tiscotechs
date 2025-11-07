// src/pages/PartnerWelcome.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

/* ---------- API base (same convention used elsewhere) ---------- */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5000";

/* ---------- Helpers ---------- */
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

/** hash helper (keeps parity with signup/login pages) */
async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
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
    partnerEmail: (s.partnerEmail || s.postedByEmail || s.email || "").toLowerCase(),
    postedByEmail: (s.postedByEmail || s.email || "").toLowerCase(),
    orgName: s.orgName || s.organization || s.university || "",
    description: s.description || s.summary || "",
    amount: s.amount || s.value || "",
    link: s.link || s.applyLink || s.url || "",
  };
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

  // 1) API first
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
    // 2) Local fallback
    const keys = ["partnerScholarships", "scholarships", "postedScholarships"];
    let merged = [];
    for (const k of keys) {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || "[]");
        if (Array.isArray(arr)) merged = merged.concat(arr);
      } catch {}
    }
    return merged.map(normalizeScholarship);
  }
}

export default function PartnerWelcome() {
  const nav = useNavigate();
  const [user, setUser] = useState(() => getPartner());
  const [editOpen, setEditOpen] = useState(false);
  const [msg, setMsg] = useState("");

  // Profile form state (used in modal)
  const [form, setForm] = useState(() => ({
    orgName: user?.orgName || "",
    contactName: user?.contactName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    website: user?.website || "",
  }));

  // Password fields inside the same modal
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErr, setPwErr] = useState("");

  // Scholarships (center panel)
  const [allScholarships, setAllScholarships] = useState([]);

  useEffect(() => {
    // Initial load + react to other tabs updating (API first, fallback local)
    let alive = true;
    const load = async () => {
      const list = await loadAllScholarshipsForPartner(user || {});
      if (alive) setAllScholarships(list);
    };
    load();
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [user]);

  // Filter “mine” by partner identity
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

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const saveUpdates = async (e) => {
    e.preventDefault();
    setPwErr("");

    // Detect sensitive changes
    const emailChanging = (form.email || "") !== (user?.email || "");
    const wantsPwChange =
      newPw.length > 0 || confirmPw.length > 0 || currentPw.length > 0;

    // If email changes OR password changes, require verifying current password
    if (emailChanging || wantsPwChange) {
      // If account has a password hash (preferred) — verify via hash
      if (user?.passwordHash) {
        if (!currentPw) {
          setPwErr("Please enter your current password.");
          return;
        }
        const enteredHash = await sha256Hex(currentPw);
        if (enteredHash !== user.passwordHash) {
          setPwErr("Current password is incorrect.");
          return;
        }
      } else if (user?.password) {
        // Legacy plain-text compatibility
        if (!currentPw) {
          setPwErr("Please enter your current password.");
          return;
        }
        if (currentPw !== user.password) {
          setPwErr("Current password is incorrect.");
          return;
        }
      } else {
        // No password set yet — require setting a new one only if they are changing password
        if (wantsPwChange && !currentPw) {
          // They don't have a current password to verify; allow setting new but still validate newPw
        }
      }
    }

    // Validate new password if they are changing it
    if (wantsPwChange) {
      if (!newPw || newPw.length < 6) {
        setPwErr("New password must be at least 6 characters.");
        return;
      }
      if (newPw !== confirmPw) {
        setPwErr("New passwords do not match.");
        return;
      }
    }

    // Build updated object
    const updated = { ...(user || {}), ...form };

    // If changing password -> store hash and remove any plain
    if (wantsPwChange) {
      updated.passwordHash = await sha256Hex(newPw);
      delete updated.password; // ensure no plain password is kept
    }

    setPartner(updated);
    setUser(updated);
    setEditOpen(false);

    // clear sensitive fields
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");

    setMsg("Account information updated.");
    setTimeout(() => setMsg(""), 3000);
  };

  const logout = () => {
    localStorage.removeItem("partnerAuth");
    nav("/partner/login", { replace: true });
  };

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eef3ff] via-white to-[#f5f7fb]">
      {/* Top bar with full-width background tint */}
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

      {/* Main 3-pane layout */}
      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-0 lg:px-8">
          <div className="grid grid-cols-12 gap-0 lg:gap-6">
            {/* LEFT SIDEBAR (unchanged layout) */}
            <aside className="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-3 lg:border-r border-slate-200">
              <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto pb-4">
                <div className="h-full bg-indigo-50/60 p-4">
                  {/* Organization details */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <h2 className="text-sm font-semibold text-indigo-900">
                      Organization
                    </h2>
                    <dl className="mt-3 space-y-2 text-sm text-indigo-900/90">
                      <div className="flex justify-between gap-3">
                        <dt className="text-indigo-800/80 min-w-[90px]">
                          Organization
                        </dt>
                        <dd className="font-medium text-right break-words">
                          {user?.orgName || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-indigo-800/80 min-w-[90px]">
                          Contact
                        </dt>
                        <dd className="font-medium text-right break-words">
                          {user?.contactName || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-indigo-800/80 min-w-[90px]">
                          Email
                        </dt>
                        <dd className="font-medium text-right break-all">
                          {user?.email || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-indigo-800/80 min-w-[90px]">
                          Phone
                        </dt>
                        <dd className="font-medium text-right break-words">
                          {user?.phone || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-indigo-800/80 min-w-[90px]">
                          Website
                        </dt>
                        <dd className="font-medium text-right break-all">
                          {user?.website || "—"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4">
                      <div className="text-xs text-indigo-800/80 mb-1">
                        Total scholarships posted
                      </div>
                      <div className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-900">
                        {totalPosted}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                    <Link
                      to="/partner/dashboard"
                      className="block w-full rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-900 hover:bg-indigo-100 text-center"
                    >
                      Go to Dashboard
                    </Link>
                    <button
                      onClick={() => setEditOpen(true)}
                      className="block w-full rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-900 hover:bg-indigo-100"
                    >
                      Update Account Information
                    </button>
                    <button
                      onClick={logout}
                      className="block w-full rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* CENTER — list (unchanged layout) */}
            <main className="col-span-12 lg:col-span-6 xl:col-span-6">
              <div className="sticky top-14 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
                <div className="h-12 px-4 lg:px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Posted Scholarships
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5">
                      {totalPosted}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[calc(100vh-3.5rem-3rem-56px)] md:h-[calc(100vh-3.5rem-56px)] overflow-y-auto pb-4">
                {myScholarships.length === 0 ? (
                  <div className="h-[50vh] grid place-items-center text-sm text-slate-500">
                    No Scholarship posted yet
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {myScholarships.map((sch) => {
                      const postedDate = new Date(
                        Number(sch.createdAt) || Date.parse(sch.createdAt)
                      ).toLocaleDateString();
                      const isOpen =
                        String(sch.status).toLowerCase() === "open";
                      return (
                        <li
                          key={sch.id}
                          className="group hover:bg-slate-50 transition"
                        >
                          <div className="px-4 lg:px-6 py-3 flex items-start gap-4">
                            <div
                              className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                isOpen ? "bg-green-500" : "bg-slate-300"
                              }`}
                              title={sch.status}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="truncate text-sm font-semibold text-slate-900">
                                  {sch.title}
                                </h3>
                                <div className="shrink-0 flex items-center gap-3">
                                  {sch.deadline ? (
                                    <span className="text-xs text-slate-500 whitespace-nowrap">
                                      Deadline: {sch.deadline}
                                    </span>
                                  ) : null}
                                  <span className="text-xs text-slate-500 whitespace-nowrap">
                                    {postedDate}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                {sch.orgName ? (
                                  <span className="truncate">
                                    Org: {sch.orgName}
                                  </span>
                                ) : null}
                                {sch.amount ? (
                                  <span>Amount: {sch.amount}</span>
                                ) : null}
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 ring-1 text-[11px] ${
                                    isOpen
                                      ? "bg-green-50 text-green-700 ring-green-200"
                                      : "bg-slate-100 text-slate-700 ring-slate-200"
                                  }`}
                                >
                                  {sch.status}
                                </span>
                              </div>

                              {/* Clean text snippet (no raw HTML tags) */}
                              {sch.description ? (
                                <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                  {truncate(stripHtml(sch.description), 180)}
                                </p>
                              ) : null}

                              {sch.link ? (
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
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Bottom action (sticky, above footer) */}
              <div className="border-t border-slate-200 px-4 lg:px-6 py-4 bg-white/90 backdrop-blur sticky bottom-0">
                <Link
                  to="/partner/submit-scholarship"
                  className="block w-full text-center rounded-lg bg-blue-600 text-white px-4 py-2.5 font-semibold hover:bg-blue-700"
                >
                  Submit a Scholarship
                </Link>
                <p className="mt-2 text-center text-xs text-slate-500">
                  Post an opportunity for students (no essays, no fees, no
                  sensitive data).
                </p>
              </div>
            </main>

            {/* RIGHT SIDEBAR — Partnership Standards (unchanged layout) */}
            <aside className="col-span-12 lg:col-span-3 xl:col-span-3">
              <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto pb-4">
                {/* Mirror left panel container so the card stays visually inside the column */}
                <div className="h-full bg-indigo-50/60 p-4">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <h3 className="text-sm font-semibold text-indigo-900">
                      Partnership Standards
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-indigo-900/90">
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
                          No confidential data collection (bank details,
                          national IDs, SSNs, etc.).
                        </span>
                      </li>
                    </ul>
                  </div>
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

      {/* EDIT MODAL */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Update Account Information
              </h3>
              <button
                onClick={() => setEditOpen(false)}
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
                      placeholder={user?.password ? "Current password" : "Not set"}
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
                  }}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Save Changes
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