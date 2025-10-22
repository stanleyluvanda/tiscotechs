// src/components/YouTubeEmbed.jsx
import { useMemo } from "react";

/**
 * <YouTubeEmbed idOrUrl="https://youtu.be/dQw4w9WgXcQ" title="My video" />
 * <YouTubeEmbed idOrUrl="dQw4w9WgXcQ" title="My video" />
 */
export default function YouTubeEmbed({ idOrUrl = "", title = "YouTube video", className = "" }) {
  const videoId = useMemo(() => {
    const raw = String(idOrUrl || "").trim();

    // Already a plain 11-char ID?
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

    // Try to extract ID from common URL forms
    try {
      const u = new URL(raw);
      // youtu.be/<id>
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
      // youtube.com/watch?v=<id>
      if (u.searchParams.get("v") && /^[a-zA-Z0-9_-]{11}$/.test(u.searchParams.get("v"))) {
        return u.searchParams.get("v");
      }
      // youtube.com/embed/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex(p => p.toLowerCase() === "embed");
      if (embedIdx >= 0 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
      // youtube.com/shorts/<id>
      const shortsIdx = parts.findIndex(p => p.toLowerCase() === "shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[shortsIdx + 1])) {
        return parts[shortsIdx + 1];
      }
    } catch {
      // not a URL, fall through
    }
    return ""; // failed to parse
  }, [idOrUrl]);

  if (!videoId) {
    return (
      <div className={`aspect-video w-full grid place-items-center border border-slate-200 rounded ${className}`}>
        <span className="text-sm text-slate-500">Invalid YouTube URL or ID</span>
      </div>
    );
  }

  const src = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className={`aspect-video w-full overflow-hidden rounded ${className}`}>
      <iframe
        title={title}
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-full w-full"
      />
    </div>
  );
}