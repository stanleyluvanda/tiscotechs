// src/components/GoogleSidebarAd.jsx
import { useEffect, useRef } from "react";

export default function GoogleSidebarAd({
  slot = "4919459228",
  label = "Sponsored",
  className = "",
  minHeight = 250, // ✅ reserve space to prevent layout shift (adjust if you want)
}) {
  const adRef = useRef(null);
  const pushedSlotRef = useRef(null);

  useEffect(() => {
    const el = adRef.current;
    if (!el) return;

    // ✅ If we already initialized this exact slot for this <ins>, do nothing
    if (pushedSlotRef.current === slot) return;

    // ✅ If slot changes, reset the <ins> before pushing again
    // (AdSense can otherwise ignore or cause odd resizing.)
    el.innerHTML = "";
    el.removeAttribute("data-adsbygoogle-status");

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedSlotRef.current = slot;
    } catch (e) {
      console.log("Google sidebar ad error:", e);
    }
  }, [slot]);

  return (
    <div
      className={
        "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm w-full " +
        className
      }
      style={{ minHeight }} // ✅ keeps card height stable
    >
      {label && (
        <div className="text-xs font-semibold text-slate-500 mb-2 text-center">
          {label}
        </div>
      )}

      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          minHeight: `${minHeight - (label ? 24 : 0)}px`, // keep inner space stable too
        }}
        data-ad-client="ca-pub-2132263917593964"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}