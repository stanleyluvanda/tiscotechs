// src/components/GoogleBannerAd.jsx
import { useEffect, useRef, useState } from "react";
import { loadAdsenseScript } from "../lib/loadAdsense";

export default function GoogleBannerAd() {
  const adRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadAdsenseScript()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        console.log("AdSense script load error:", e);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const el = adRef.current;
    if (!el) return;

    if (el.getAttribute("data-adsbygoogle-status")) return;
    if (el.dataset.adLoaded === "true") return;
    if (!window.adsbygoogle || !Array.isArray(window.adsbygoogle)) return;

    try {
      window.adsbygoogle.push({});
      el.dataset.adLoaded = "true";
    } catch (e) {
      console.log("Google ad error:", e);
    }
  }, [ready]);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{
        display: "block",
        width: "100%",
        maxHeight: "90px",
      }}
      data-ad-client="ca-pub-2132263917593964"
      data-ad-slot="4919459228"
      data-ad-format="horizontal"
      data-full-width-responsive="true"
    />
  );
}