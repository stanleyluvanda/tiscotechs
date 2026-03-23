// src/components/BannerAdPortal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useInRouterContext } from "react-router-dom";
import GoogleBannerAd from "./GoogleBannerAd";

/**
 * AdSense-safe banner portal
 * - Renders only on approved routes
 * - Never renders on login, forgot-password, messages, admin forms, etc.
 * - Uses the existing #ad-banner host without changing backend or layout logic
 */

const EXACT_ROUTES = new Set([
  "/home",
  "/scholarship",
  "/study-in-us",
  "/edufinancing",
  "/funded-graduate-admission",
  "/marketplace",
  "/student-marketplace",
  "/platform/global",
  "/platform/university",
]);

const PREFIX_ROUTES = [
  "/scholarship/",
  "/funded-graduate-admission/",
];

export default function BannerAdPortal({ canShow = true }) {
  const inRouter = useInRouterContext();
  const pathname = inRouter ? useLocation().pathname : "";
  const [host, setHost] = useState(null);
  const containerRef = useRef(null);

  const isAllowedRoute = useMemo(() => {
    if (!pathname) return false;
    if (EXACT_ROUTES.has(pathname)) return true;
    return PREFIX_ROUTES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  useEffect(() => {
    const el = document.getElementById("ad-banner");
    if (!el) return;

    if (!inRouter || !isAllowedRoute || !canShow) {
      el.style.display = "none";
      setHost(null);
      return;
    }

    el.style.display = "";
    setHost(el);
  }, [inRouter, isAllowedRoute, canShow]);

  useEffect(() => {
    if (!host || !containerRef.current) return;

    const hiddenSiblings = [];

    Array.from(host.children).forEach((child) => {
      if (child !== containerRef.current) {
        hiddenSiblings.push(child);
        child.style.display = "none";
      }
    });

    return () => {
      hiddenSiblings.forEach((child) => {
        child.style.display = "";
      });
    };
  }, [host]);

  if (!inRouter || !isAllowedRoute || !canShow || !host) {
    return null;
  }

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