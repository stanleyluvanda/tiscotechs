//src/lib/loadAdsense.js
let adsenseLoadPromise = null;

export function loadAdsenseScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
    return Promise.resolve(true);
  }

  if (adsenseLoadPromise) {
    return adsenseLoadPromise;
  }

  adsenseLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-adsense-script="true"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => reject(new Error("AdSense failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2132263917593964";
    script.crossOrigin = "anonymous";
    script.setAttribute("data-adsense-script", "true");

    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("AdSense failed to load"));

    document.head.appendChild(script);
  });

  return adsenseLoadPromise;
}