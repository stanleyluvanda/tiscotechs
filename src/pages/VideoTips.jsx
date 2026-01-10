// src/pages/VideoTips.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import YouTubeEmbed from "../components/YouTubeEmbed";
import { fetchPosts } from "../lib/postsApi"; // ✅ SERVER-backed (cross-browser)

// Small helpers
function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

function loadCurrentUser() {
  try {
    const raw =
      sessionStorage.getItem("currentUser") ||
      localStorage.getItem("currentUser") ||
      "{}";
    const u = JSON.parse(raw);
    return u && typeof u === "object" ? u : {};
  } catch {
    return {};
  }
}

export default function VideoTips() {
  const navigate = useNavigate();
  const user = loadCurrentUser();

  // ✅ SERVER source of truth (not localStorage)
  const [videoPosts, setVideoPosts] = useState([]);

  // ✅ Fetch from server so it's visible across devices/browsers
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // same scope you verified in browser
        const data = await fetchPosts({ scope: "admin-video-posts" });

        // postsApi might return {posts:[...]} OR [...]
        const arr = Array.isArray(data) ? data : data?.posts || [];
        if (cancelled) return;

        setVideoPosts(Array.isArray(arr) ? arr : []);
      } catch (e) {
        console.error("[VideoTips] fetch failed:", e);
        if (!cancelled) setVideoPosts([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Same audience logic as in StudentDashboard (students/both + continent targeting)
  const visibleVideos = useMemo(() => {
    const meCont = (user?.continent || "").trim().toLowerCase();

    return (videoPosts || [])
      .filter((p) => String(p?.type || "").toLowerCase().trim() === "video")
      .filter((p) => {
        const audience = String(p?.audience || "students").toLowerCase().trim();
        const includesStudents = audience === "students" || audience === "both";
        if (!includesStudents) return false;

        const va = p?.videoAudience || { scope: "all" };
        if (va.scope === "continent") {
          const list = Array.isArray(va.continents) ? va.continents : [];
          const hasMe = list.some(
            (c) => String(c || "").trim().toLowerCase() === meCont
          );
          return hasMe;
        }
        // scope: "all" or anything else means all students
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [videoPosts, user?.continent]);

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <main className="max-w-6xl mx-auto px-3 lg:px-5 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
              Video Tips for International Students
            </h1>
            <p className="mt-1 text-sm md:text-base text-slate-600">
              These videos offer high-value academic guidance and essential
              insights for international students, particularly those preparing
              to pursue educational opportunities in the United States.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 bg-white hover:bg-slate-50 whitespace-nowrap"
          >
            ← Back to dashboard
          </button>
        </div>

        {/* Grid of videos */}
        {visibleVideos.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
            No video tips are available for your audience yet.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {visibleVideos.map((v) => (
              <article
                key={v.id || v.createdAt}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col hover:border-slate-300 transition-colors"
              >
                <div className="aspect-video w-full border-b border-slate-100">
                  {/* ✅ tolerant: accepts videoUrlOrId OR videoId OR videoUrl */}
                  <YouTubeEmbed
                    idOrUrl={v.videoUrlOrId || v.videoId || v.videoUrl}
                    title={v.title || "Video tip"}
                  />
                </div>

                <div className="px-3 py-2 flex-1 flex flex-col">
                  <h2 className="text-sm font-semibold text-slate-900 line-clamp-2">
                    {v.title || "Video tip"}
                  </h2>

                  {v.shortDescription && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-3">
                      {v.shortDescription}
                    </p>
                  )}

                  <div className="mt-2 text-[11px] text-slate-500">
                    Posted{" "}
                    {v.createdAt
                      ? new Date(v.createdAt).toLocaleString()
                      : "recently"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}