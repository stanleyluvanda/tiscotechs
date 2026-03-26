// src/components/Navbar.jsx  
import React, { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { signOut } from "aws-amplify/auth";

/* ---------- Small helpers ---------- */
function safeParse(json) {
  try { return JSON.parse(json || ""); } catch { return null; }
}
const ID_KEYS = ["authUserId", "activeUserId", "currentUserId", "loggedInUserId"];

function loadActiveUser() {
  for (const src of [sessionStorage, localStorage]) {
    for (const k of ID_KEYS) {
      const id = src.getItem(k);
      if (id) {
        const byId = safeParse(localStorage.getItem("usersById")) || {};
        if (byId[id]) return byId[id];
        const list = safeParse(localStorage.getItem("users")) || [];
        const found = list.find(
          (u) => u.id === id || u.uid === id || u.userId === id
        );
        if (found) return found;
      }
    }
  }
  return (
    safeParse(sessionStorage.getItem("currentUser")) ||
    safeParse(localStorage.getItem("currentUser")) ||
    null
  );
}

function loadNavbarUser() {
  // 1) Prefer existing logic (student/lecturer)
  const u = loadActiveUser();
  if (u) return u;

  // 2) Fallback: partner session (does not affect student/lecturer)
  const p = safeParse(localStorage.getItem("partnerAuth")) || null;
  if (!p?.email) return null;

  return {
    // keep the same field names the Navbar already uses
    role: "partner",
    email: p.email,
    name: p.organization || p.orgName || p.contactName || "Partner",
    photoUrl: p.logoUrl || p.photo || p.avatarUrl || "",
  };
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "U").toUpperCase();
  const b = (parts[1]?.[0] || "S").toUpperCase();
  return a + b;
}
function clearAuthStateKeepData() {
  sessionStorage.clear();
  localStorage.removeItem("currentUser");
  for (const k of ID_KEYS) {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  }
}

async function logoutEverywhere() {
  try { await signOut({ global: true }); } catch {}
  try {
    [
      "currentUser","authUserId","activeUserId","currentUserId","loggedInUserId",
      "partnerAuth","adminAuth"
    ].forEach((k) => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
  } catch {}
}

/* ---------- Avatar ---------- */
function Avatar({ url, name }) {
  return (
    <div className="h-10 w-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center shrink-0">
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-white h-full w-full flex items-center justify-center">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

/* ---------- Rotating globe ---------- */
function SpinningGlobe({ size = 36 }) {
  const candidates = ["/images/globe.jpg", "/images/globe.png", "/images/globe.svg"];
  const [idx, setIdx] = useState(0);
  const [hidden, setHidden] = useState(false);
  const src = candidates[idx];
  const onErr = () => {
    if (idx < candidates.length - 1) setIdx((i) => i + 1);
    else setHidden(true);
  };
  if (hidden) return null;

  return (
    <div
      className="rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size }}
      title="ScholarsKnowledge"
    >
      <img
        src={src}
        onError={onErr}
        alt="Globe"
        className="h-full w-full object-cover animate-spin"
        style={{ animationDuration: "6s" }}
      />
    </div>
  );
}

/* ---------- NavLink style ---------- */
const link = ({ isActive }) =>
  "px-1.5 py-1.5 rounded-md text-[13px] font-semibold whitespace-nowrap transition " +
  (isActive ? "bg-white/10 text-white" : "text-white/90 hover:bg-white/10");

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => loadNavbarUser());
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef(null);

  // heights
  const NAV_H = 56;   // navbar height
  const STRIP_H = 96; // banner height
  const TOTAL_H = NAV_H + STRIP_H;

  useEffect(() => {
    const refresh = () => setUser(loadNavbarUser());

    // Other tabs/windows
    window.addEventListener("storage", refresh);

    // Same tab (manual logout, auto logout, any forced refresh)
    window.addEventListener("auth:changed", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("auth:changed", refresh);
    };
  }, []);

  useEffect(() => { setUser(loadNavbarUser()); }, [location.pathname, location.search]);

  useEffect(() => {
    const onDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileNavOpen(false);
      }
      if (!menuRef.current) return;
      if (open && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onDown);
    };
  }, [open]);

  const role = (user?.role || "").toLowerCase();
  const dashboardPath =
    role === "partner"
      ? "/partner/welcome"
      : role === "lecturer"
        ? "/lecturer/dashboard"
        : "/student/dashboard";

  // When user clicks "Edit My Profile", we send them to dashboard with a flag
  const profileEditPath = `${dashboardPath}?editProfile=1`;

  const handleLogout = async () => {
    const roleParam =
      role === "lecturer" ? "lecturer" : role === "partner" ? "partner" : "student";

    // ✅ important: actually sign out from Amplify/Cognito AND clear storage keys
    await logoutEverywhere();

    // keep your existing UI cleanup behavior
    setUser(null);
    setOpen(false);
    window.dispatchEvent(new Event("auth:changed"));

    // route by role
    if (role === "partner") navigate("/partner/login");
    else navigate(`/login?role=${roleParam}`);
  };

  /* ===================== FIXED NAVBAR (portal) ===================== */
  const NavbarBar = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: NAV_H,
        zIndex: 1000,
        backgroundColor: "#0A4595",
        WebkitTransform: "translateZ(0)",
      }}
      className="border-b border-black/5 text-white"
    >
      <div
        className="h-full px-3 md:px-5 flex items-center gap-2 md:gap-3"
        style={{ fontFamily: '"Open Sans", Arial, sans-serif' }}
      >

        {/* LEFT: logo + brand (tight together) */}
        <Link to="/home" className="flex items-center gap-2 min-w-0 shrink-0">
          <img
            src="/images/1754280544595.jpeg"
            alt="ScholarsKnowledge logo"
            className="h-8 w-8 rounded-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <span className="font-extrabold text-base md:text-lg text-white truncate">
            ScholarsKnowledge
          </span>
        </Link>

        {/* CENTER: nav (Partner after About) */}
        {/*<nav className="hidden md:flex flex-1 items-center justify-center gap-0 md:gap-0.5 lg:gap-1 overflow-x-auto">
          <NavLink to="/home" className={link}>Home</NavLink>
          <NavLink to="/about" className={link}>About</NavLink>
          <NavLink to="/partner" className={link}>Partner</NavLink>
          <NavLink to="/edufinancing" className={link}>EduFinancing</NavLink>
          <NavLink to="/study-in-us" className={link}>Study in The U.S</NavLink>
          <NavLink to="/stem-programs" className={link}>STEM Programs</NavLink>
          <NavLink to="/funded-graduate-admission" className={link}>University-funded Programs</NavLink>
          <NavLink to="/scholarships" className={link}>Scholarships</NavLink>
          <NavLink to="/fellowships" className={link}>Fellowships</NavLink>
          <NavLink to="/student-sign-up" className={link}>Student Sign Up</NavLink>
          <NavLink to="/lecturer-sign-up" className={link}>Lecturer Sign Up</NavLink>
        </nav>*/}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-0 md:gap-0.5 lg:gap-1">
  <NavLink to="/home" className={link}>Home</NavLink>
  <NavLink to="/about" className={link}>About</NavLink>
  <NavLink to="/partner" className={link}>Partner</NavLink>
  <NavLink to="/edufinancing" className={link}>EduFinancing</NavLink>
  <NavLink to="/study-in-us" className={link}>Study in The U.S</NavLink>
  <NavLink to="/stem-programs" className={link}>STEM Programs</NavLink>

  {/* ✅ Funding Dropdown (NEW) */}
  <div className="relative group">
    <button className="px-1.5 py-1.5 text-[13px] font-semibold text-white/90 hover:bg-white/10 rounded-md whitespace-nowrap">
      Funding Programs for International Students ▾
    </button>

    <div className="absolute left-0 hidden group-hover:block bg-white text-slate-900 rounded-md shadow-lg mt-2 min-w-[220px] z-50">
      
      <Link to="/scholarship" className="block px-4 py-2 text-sm hover:bg-slate-100">
        Scholarships
      </Link>

      <Link to="/fellowship" className="block px-4 py-2 text-sm hover:bg-slate-100">
        Fellowships
      </Link>

      <Link to="/funded-graduate-admission" className="block px-4 py-2 text-sm hover:bg-slate-100">
        University-funded Programs
      </Link>

      <Link to="/funding-programs" className="block px-4 py-2 text-sm hover:bg-slate-100 font-semibold text-[#0A4595]">
        Funding Programs
      </Link>

    </div>
  </div>

  <NavLink to="/student-sign-up" className={link}>Student Sign Up</NavLink>
  <NavLink to="/lecturer-sign-up" className={link}>Lecturer Sign Up</NavLink>
</nav>

        {/* RIGHT: globe + auth (single Log in) */}
        <div className="ml-auto flex items-center gap-2 md:gap-3 shrink-0">

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-md px-2 py-1 text-white hover:bg-white/10"
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
          >
            <span className="text-xl leading-none">☰</span>
          </button>

          <div className="hidden sm:block">
            <SpinningGlobe size={32} />
          </div>

          {!user ? (
            <Link
              to="/login"
              className="rounded-full bg-white text-[#0A4595] px-4 py-1.5 text-sm font-semibold hover:bg-white/90"
            >
              Log in
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full hover:bg-white/10 pl-2 pr-1 py-1"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <span className="hidden lg:block text-sm font-medium">Me ▾</span>
                <Avatar url={user.photoUrl} name={user.name || "User"} />
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 w-60 rounded-xl border border-white/20 bg-white text-slate-900 shadow-lg overflow-hidden"
                  role="menu"
                >
                  <div className="p-3 flex items-center gap-3">
                    <Avatar url={user.photoUrl} name={user.name || "User"} />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{user.name || "User"}</div>
                      {user.role && (
                        <div className="text-xs text-slate-500 capitalize truncate">
                          {String(user.role).toLowerCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <hr className="border-slate-100" />

                  {/* View profile (normal dashboard) */}
                  <button
                    onClick={() => { setOpen(false); navigate(dashboardPath); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                    role="menuitem"
                  >
                    <span>👤</span> <span>View My Profile</span>
                  </button>

                  {/* NEW: Edit profile (dashboard with editProfile flag) */}
                  <button
                    onClick={() => { setOpen(false); navigate(profileEditPath); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                    role="menuitem"
                  >
                    <span>✏️</span> <span>Edit My Profile</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                    role="menuitem"
                  >
                    <span>🚪</span> <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {mobileNavOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#0A4595] border-t border-white/10 shadow-lg">
            <div className="px-3 py-3 flex flex-col">
              <NavLink to="/home" className={link} onClick={() => setMobileNavOpen(false)}>Home</NavLink>
              <NavLink to="/about" className={link} onClick={() => setMobileNavOpen(false)}>About</NavLink>
              <NavLink to="/partner" className={link} onClick={() => setMobileNavOpen(false)}>Partner</NavLink>
              <NavLink to="/edufinancing" className={link} onClick={() => setMobileNavOpen(false)}>EduFinancing</NavLink>
              <NavLink to="/study-in-us" className={link} onClick={() => setMobileNavOpen(false)}>Study in The U.S</NavLink>
              <NavLink to="/stem-programs" className={link} onClick={() => setMobileNavOpen(false)}>STEM Programs</NavLink>
              <NavLink to="/funded-graduate-admission" className={link} onClick={() => setMobileNavOpen(false)}>Funded Graduate Admission</NavLink>
              <NavLink to="/funding-programs" className={link} onClick={() => setMobileNavOpen(false)}>Funding Programs</NavLink>
              <NavLink to="/scholarships" className={link} onClick={() => setMobileNavOpen(false)}>Scholarships Directory</NavLink>
              <NavLink to="/fellowships" className={link} onClick={() => setMobileNavOpen(false)}>Fellowships</NavLink>
              <NavLink to="/student-sign-up" className={link} onClick={() => setMobileNavOpen(false)}>Student Sign Up</NavLink>
              <NavLink to="/lecturer-sign-up" className={link} onClick={() => setMobileNavOpen(false)}>Lecturer Sign Up</NavLink>

              {!user && (
                <Link
                  to="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="mt-2 rounded-full bg-white text-[#0A4595] px-4 py-2 text-sm font-semibold text-center hover:bg-white/90"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );

  /* ===================== FULL-WIDTH BANNER STRIP (portal) ===================== */
  const BannerStrip = (
    <div
      style={{
        position: "fixed",
        top: NAV_H,
        left: 0,
        right: 0,
        height: STRIP_H,
        zIndex: 999, // just below navbar
        background: "#f3f8fc",
        WebkitTransform: "translateZ(0)",
      }}
      className="border-b border-black/5"
    >
      <div id="ad-banner" className="hidden md:flex h-full w-full items-center justify-center">
        <div className="h-[72px] md:h-[90px] w-[96%] rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 text-sm">
          Banner Ad Slot (728×90 / responsive)
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(NavbarBar, document.body)}
      {createPortal(BannerStrip, document.body)}
      <div className="h-[56px] md:h-[152px]" />
    </>
  );
}