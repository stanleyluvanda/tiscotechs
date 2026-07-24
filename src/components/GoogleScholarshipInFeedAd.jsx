// src/components/GoogleScholarshipInFeedAd.jsx
import { useEffect, useRef, useState } from "react";
import { loadAdsenseScript } from "../lib/loadAdsense";

export default function GoogleScholarshipInFeedAd({
  enabled = true,
  className = "",
}) {
  const wrapperRef = useRef(null);
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
      console.log("Google in-feed ad error:", error);
    }
  }, [enabled, ready]);

  useEffect(() => {
    if (!enabled || !ready) return;

    const element = adRef.current;
    const wrapper = wrapperRef.current;

    if (!element || !wrapper) return;

    const updateVisibility = () => {
      const status = element.getAttribute("data-ad-status");

      if (status === "filled") {
        wrapper.style.display = "block";
      } else {
        wrapper.style.display = "none";
      }
    };

    updateVisibility();

    const observer = new MutationObserver(updateVisibility);

    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled, ready]);

  if (!enabled) return null;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        display: "none",
        width: "100%",
      }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
        }}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
        data-ad-client="ca-pub-2132263917593964"
        data-ad-slot="8031660537"
      />
    </div>
  );
}