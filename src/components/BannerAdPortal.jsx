// src/components/BannerAdPortal.jsx
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import GoogleBannerAd from "./GoogleBannerAd";

export default function BannerAdPortal() {
  const [host, setHost] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = document.getElementById("ad-banner");
    if (el) setHost(el);
  }, []);

  useEffect(() => {
    if (!host || !containerRef.current) return;

    // Hide placeholder inside #ad-banner
    const children = Array.from(host.children);
    children.forEach((child) => {
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