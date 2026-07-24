import { useEffect, useRef } from "react";
import { loadAdsenseScript } from "../lib/loadAdsense";

const ADSENSE_CLIENT = "ca-pub-2132263917593964";
const ADSENSE_SLOT = "2683965087";

export default function GoogleInArticleAd({ className = "" }) {
  const wrapperRef = useRef(null);
  const adRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    let observer;
    let cancelled = false;

    async function initializeAd() {
      try {
        await loadAdsenseScript();

        if (cancelled || pushedRef.current || !adRef.current) return;

        observer = new MutationObserver(() => {
          const status = adRef.current?.getAttribute("data-ad-status");
          const wrapper = wrapperRef.current;

          if (!wrapper) return;

          if (status === "filled") {
            wrapper.style.display = "block";
          } else if (status === "unfilled") {
            wrapper.style.display = "none";
          }
        });

        observer.observe(adRef.current, {
          attributes: true,
          attributeFilter: ["data-ad-status"],
        });

        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
          pushedRef.current = true;
        } catch (error) {
          console.warn("In-article AdSense request failed:", error);
        }
      } catch (error) {
        console.warn("Failed to load AdSense:", error);
      }
    }

    initializeAd();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ display: "none" }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          textAlign: "center",
        }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
      />
    </div>
  );
}