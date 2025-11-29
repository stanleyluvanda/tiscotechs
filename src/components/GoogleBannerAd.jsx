// src/components/GoogleBannerAd.jsx
import { useEffect, useRef } from "react";

export default function GoogleBannerAd() {
  const adRef = useRef(null);

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.log("Google ad error:", e);
    }
  }, []);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{
        display: "block",
        width: "100%",         // full width inside your container
        maxHeight: "90px",     // prevents distortion
      }}
      data-ad-client="ca-pub-2132263917593964"
      data-ad-slot="4919459228"
      data-ad-format="horizontal"
      data-full-width-responsive="true"
    ></ins>
  );
}