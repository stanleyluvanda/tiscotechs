// src/components/GoogleSidebarAd.jsx
import { useEffect, useRef } from "react";

export default function GoogleSidebarAd({
  slot = "2515946722",
  label = "Sponsored",
  className = "",
  minHeight = 250,
  enabled = true,
  keepPlaceholder = true,
}) {
  const adRef = useRef(null);
  const pushedSlotRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const el = adRef.current;
    if (!el) return;

    // Do not push again if AdSense already initialized this node
    if (el.getAttribute("data-adsbygoogle-status")) return;

    // Extra local guard for this slot
    if (pushedSlotRef.current === slot) return;

    // Only run if AdSense is actually available
    if (!window.adsbygoogle || !Array.isArray(window.adsbygoogle)) return;

    try {
      window.adsbygoogle.push({});
      pushedSlotRef.current = slot;
    } catch (e) {
      console.log("Google sidebar ad error:", e);
    }
  }, [slot, enabled]);

  if (!enabled) {
    if (!keepPlaceholder) return null;

    return (
      <div
        className={"bg-[#f3f6fb] p-0 w-full " + className}
        style={{ minHeight }}
        aria-hidden="true"
      >
        {label && (
          /*<div className="text-xs font-semibold text-slate-500 mb-2 text-center">*/
            <div className="text-[10px] font-medium text-slate-400 mb-1 text-center">
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