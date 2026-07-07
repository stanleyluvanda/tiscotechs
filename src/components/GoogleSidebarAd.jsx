// src/components/GoogleSidebarAd.jsx
import { useEffect, useRef } from "react";

export default function GoogleSidebarAd({
  slot = "8562818627",
  className = "",
  minHeight = 250,
  enabled = true,
  keepPlaceholder = true,
}) {
  const adRef = useRef(null);
  const pushedSlotRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const el = adRef.current;
    if (!el) return;

    // Already initialized by AdSense
    if (el.getAttribute("data-adsbygoogle-status")) return;

    // Prevent duplicate pushes
    if (pushedSlotRef.current) return;

    if (!window.adsbygoogle || !Array.isArray(window.adsbygoogle)) return;

    try {
      window.adsbygoogle.push({});
      pushedSlotRef.current = true;
    } catch (e) {
      console.error("GoogleSidebarAd:", e);
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className={"w-full overflow-hidden " + className}
      /*style={{ minHeight }}*/
      /*style={{ minHeight: keepPlaceholder ? minHeight : 0 }}*/
      style={{ minHeight: keepPlaceholder ? minHeight : undefined }}
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