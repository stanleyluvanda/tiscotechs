// src/components/GoogleBannerAd.jsx
import { useEffect, useRef, useState } from "react";
import { loadAdsenseScript } from "../lib/loadAdsense";

export default function GoogleBannerAd({
  enabled = true,
  reserveSpace = true,
  className = "",
}) {
  const adRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    loadAdsenseScript()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((error) => {
        console.log("AdSense script load error:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !ready) return;

    const element = adRef.current;
    if (!element) return;

    if (element.getAttribute("data-adsbygoogle-status")) return;
    if (element.dataset.adLoaded === "true") return;

    window.adsbygoogle = window.adsbygoogle || [];

    try {
      window.adsbygoogle.push({});
      element.dataset.adLoaded = "true";
    } catch (error) {
      console.log("Google ad error:", error);
    }
  }, [enabled, ready]);

  if (!enabled) return null;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        minHeight: reserveSpace ? "100px" : undefined,
      }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
        }}
        data-ad-client="ca-pub-2132263917593964"
        data-ad-slot="4919459228"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}