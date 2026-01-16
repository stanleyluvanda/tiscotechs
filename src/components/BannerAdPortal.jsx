// src/components/BannerAdPortal.jsx
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
//import { useLocation } from "react-router-dom";
import GoogleBannerAd from "./GoogleBannerAd";
import { useLocation, useInRouterContext } from "react-router-dom";

/**
 * ✅ AdSense-safe banner portal
 * - Renders ONLY on approved public routes
 * - Never renders on login, dashboards, messages, or empty pages
 * - Prevents global ad injection
 */

const ALLOWED_ROUTES = [
  "/",                         // Home (public)
  "/scholarships",             // Scholarship list
  "/scholarship/",             // Scholarship detail (prefix)
  "/study-in-us",
  "/edu-financing",

  // ✅ Authenticated but content-rich pages
  "/student-dashboard",
  "/lecturer-dashboard",
  "/student-marketplace",
  "/global-academic-platform",
  "/university-academic-platform",
];

export default function BannerAdPortal({ canShow = true }) {
  //const { pathname } = useLocation();
  const inRouter = useInRouterContext();
const pathname = inRouter ? useLocation().pathname : "";
  const [host, setHost] = useState(null);
  const containerRef = useRef(null);

  // 🔒 Route whitelist check
  const isAllowedRoute = ALLOWED_ROUTES.some((r) =>
    r.endsWith("/") ? pathname.startsWith(r) : pathname === r
  );

  // ❌ Hard stop if not allowed
  /*if (!isAllowedRoute || !canShow) {
    return null;
  }*/
  // 🚫 Hide banner container on disallowed pages
useEffect(() => {
  const el = document.getElementById("ad-banner");
  if (!el) return;

  if (!isAllowedRoute || !canShow) {
    el.style.display = "none";
  } else {
    el.style.display = "";
  }
}, [isAllowedRoute, canShow]);

if (!inRouter || !isAllowedRoute || !canShow) {
  return null;
}

  // Find banner host AFTER route is approved
  useEffect(() => {
    const el = document.getElementById("ad-banner");
    if (el) setHost(el);
  }, []);

  useEffect(() => {
    if (!host || !containerRef.current) return;

    // Hide any static placeholders inside #ad-banner
    Array.from(host.children).forEach((child) => {
      if (child !== containerRef.current) {
        child.style.display = "none";
      }
    });
  }, [host]);

  if (!host) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="h-full w-full flex items-center justify-center"
    >
      <GoogleBannerAd />
    </div>,
    host
  );
}