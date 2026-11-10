//src/components/AcademicBookGoogleAd.jsx//
import { useEffect, useRef, useState } from "react";

export default function AcademicBookGoogleAd({
  slot = "8562818627",
  className = "",
  minHeight = 250,
}) {
  const wrapperRef = useRef(null);
  const adRef = useRef(null);
  const requestedRef = useRef(false);

  const [nearViewport, setNearViewport] = useState(false);
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "500px 0px",
      }
    );

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearViewport) return;

    const ad = adRef.current;
    if (!ad) return;

    let cancelled = false;

    const checkStatus = () => {
      if (cancelled) return;

      const value = ad.getAttribute("data-ad-status");

      if (value === "filled") {
        setStatus("filled");
      } else if (value === "unfilled") {
        setStatus("unfilled");
      }
    };

    const observer = new MutationObserver(checkStatus);

    observer.observe(ad, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    const requestAd = () => {
      if (cancelled || requestedRef.current) return;

      if (ad.getAttribute("data-adsbygoogle-status")) {
        requestedRef.current = true;
        checkStatus();
        return;
      }

      if (!Array.isArray(window.adsbygoogle)) return;

      try {
        window.adsbygoogle.push({});
        requestedRef.current = true;
      } catch (error) {
        console.error("AcademicBookGoogleAd:", error);
      }
    };

    requestAd();

    window.addEventListener("load", requestAd);

    checkStatus();

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("load", requestAd);
    };
  }, [nearViewport]);

  if (status === "unfilled") {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        width: "100%",
        minHeight:
          nearViewport && status !== "filled"
            ? minHeight
            : undefined,
      }}
    >
      {nearViewport && (
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minHeight:
              status === "filled"
                ? undefined
                : minHeight,
          }}
          data-ad-client="ca-pub-2132263917593964"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}