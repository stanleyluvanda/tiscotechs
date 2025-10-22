// src/components/Navbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";

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
    <div className="rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }} title="ScholarsKnowledge">
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
  "px-3 py-2 rounded-md text-sm font-semibold transition " +
  (isActive ? "bg-white/10 text-white" : "text-white/90 hover:bg-white/10");

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => loadActiveUser());
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // heights
  const NAV_H = 56;   // navbar height
  const STRIP_H = 96; // banner height
  const TOTAL_H = NAV_H + STRIP_H;

  // keep auth fresh
  useEffect(() => {
    const onStorage = () => setUser(loadActiveUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { setUser(loadActiveUser()); }, [location.pathname, location.search]);

  // close menu on outside/esc
  useEffect(() => {
    const onDown = (e) => {
      if (e.key === "Escape") setOpen(false);
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

  const dashboardPath =
    (user?.role || "").toLowerCase() === "lecturer"
      ? "/lecturer/dashboard"
      : "/student/dashboard";

  const handleLogout = () => {
    const roleParam =
      (user?.role || "student").toLowerCase() === "lecturer" ? "lecturer" : "student";
    clearAuthStateKeepData();
    setUser(null);
    setOpen(false);
    window.dispatchEvent(new Event("auth:changed"));
    navigate(`/login?role=${roleParam}`);
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
        className="h-full px-3 md:px-5 flex items-center gap-3"
        style={{ fontFamily: '"Open Sans", Arial, sans-serif' }}
      >
        {/* LEFT: logo + brand (tight together) */}
        <Link to="/home" className="flex items-center gap-2 min-w-0">
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
        <nav className="flex-1 flex items-center justify-center gap-1 md:gap-2 lg:gap-3">
          <NavLink to="/home" className={link}>Home</NavLink>
          <NavLink to="/about" className={link}>About</NavLink>
          <NavLink to="/partner" className={link}>Partner</NavLink>
          <NavLink to="/edufinancing" className={link}>EduFinancing</NavLink>
          <NavLink to="/study-in-us" className={link}>Study in The U.S</NavLink>
          <NavLink to="/scholarships" className={link}>Scholarships Directory</NavLink>
          <NavLink to="/student-sign-up" className={link}>Student Sign Up</NavLink>
          <NavLink to="/lecturer-sign-up" className={link}>Lecturer Sign Up</NavLink>
        </nav>

        {/* RIGHT: globe + auth (single Log in) */}
        <div className="ml-auto flex items-center gap-3">
          <SpinningGlobe />
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
                <span className="hidden md:block text-sm font-medium">Me ▾</span>
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
                  <button
                    onClick={() => { setOpen(false); navigate(dashboardPath); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                    role="menuitem"
                  >
                    <span>👤</span> <span>View My Profile</span>
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
      {/* Full-width ad area (drop your Google Ad tag into #ad-banner) */}
      <div id="ad-banner" className="h-full w-full flex items-center justify-center">
        {/* Placeholder; replace with Ad script/ins element */}
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
      {/* Spacer pushes content below fixed bars */}
      <div style={{ height: TOTAL_H }} />
    </>
  );
}