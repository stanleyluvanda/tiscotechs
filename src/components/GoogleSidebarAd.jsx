// src/components/GoogleSidebarAd.jsx
import { useEffect, useRef, useState } from "react";

export default function GoogleSidebarAd({
  slot = "8562818627",
  className = "",
  minHeight = 250,
  enabled = true,
  keepPlaceholder = true,
}) {
  const adRef = useRef(null);
  const pushedSlotRef = useRef(false);
  const [adFilled, setAdFilled] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const el = adRef.current;
    if (!el) return;

    const updateStatus = () => {
      setAdFilled(
        el.getAttribute("data-ad-status") === "filled"
      );
    };

    const observer = new MutationObserver(updateStatus);

    observer.observe(el, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    updateStatus();

    const requestAd = () => {
      if (pushedSlotRef.current) return;

      if (el.getAttribute("data-adsbygoogle-status")) {
        pushedSlotRef.current = true;
        return;
      }

      if (!Array.isArray(window.adsbygoogle)) return;

      try {
        window.adsbygoogle.push({});
        pushedSlotRef.current = true;
      } catch (error) {
        console.error("GoogleSidebarAd:", error);
      }
    };

    requestAd();

    window.addEventListener("load", requestAd);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", requestAd);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className={"w-full overflow-hidden " + className}
      style={{
        minHeight: keepPlaceholder ? minHeight : undefined,
        display:
          !keepPlaceholder && !adFilled
            ? "none"
            : undefined,
      }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          minHeight: keepPlaceholder ? minHeight : 0,
        }}
        data-ad-client="ca-pub-2132263917593964"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}