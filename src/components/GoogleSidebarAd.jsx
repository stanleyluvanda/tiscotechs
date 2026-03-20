// src/components/GoogleSidebarAd.jsx
import { useEffect, useRef } from "react";

export default function GoogleSidebarAd({
  slot = "2515946722",
  label = "Sponsored",
  className = "",
  minHeight = 250, // reserve space to prevent layout shift
  enabled = true, // ✅ NEW: gate ads on content-ready pages only
  keepPlaceholder = true, // ✅ NEW: keep the card space when disabled (prevents squeeze/jump)
}) {
  const adRef = useRef(null);
  const pushedSlotRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const el = adRef.current;
    if (!el) return;

    // If we already initialized this exact slot for this <ins>, do nothing
    if (pushedSlotRef.current === slot) return;

    // If slot changes, reset the <ins> before pushing again
    el.innerHTML = "";
    el.removeAttribute("data-adsbygoogle-status");

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedSlotRef.current = slot;
    } catch (e) {
      console.log("Google sidebar ad error:", e);
    }
  }, [slot, enabled]);

  // ✅ If not enabled, don't render AdSense <ins> at all (policy-safe)
  if (!enabled) {
    if (!keepPlaceholder) return null;

    // Optional placeholder: keeps layout stable but contains no ad code.
    return (
      <div
        className={"bg-[#f3f6fb] p-0 w-full " + className}
        style={{ minHeight }}
        aria-hidden="true"
      >
        {label && (
          <div className="text-xs font-semibold text-slate-500 mb-2 text-center">
            {label}
          </div>
        )}
        <div
          className="w-full rounded-xl bg-slate-50 border border-slate-100"
          style={{
            minHeight: `${minHeight - (label ? 24 : 0)}px`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={"bg-[#f3f6fb] p-0 w-full " + className}
      style={{ minHeight }}
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
          minHeight: `${minHeight - (label ? 24 : 0)}px`,
        }}
        data-ad-client="ca-pub-2132263917593964"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}