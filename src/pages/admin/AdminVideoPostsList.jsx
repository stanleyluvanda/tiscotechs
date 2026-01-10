// src/pages/admin/AdminVideoPostsList.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import YouTubeEmbed from "../../components/YouTubeEmbed";
import { fetchPosts, deletePost } from "../../lib/postsApi.js";

const VIDEO_SCOPE = "admin-video-posts";

function formatWhen(v) {
  const d =
    typeof v === "number"
      ? new Date(v)
      : typeof v === "string"
      ? new Date(v)
      : new Date(NaN);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—";
}

// Best-effort to find the video field regardless of backend naming
function getVideoValue(p) {
  return (
    p?.videoUrlOrId ||
    p?.videoUrl ||
    p?.videoURL ||
    p?.videoId ||
    p?.youtubeId ||
    p?.youtubeID ||
    p?.idOrUrl ||
    p?.url ||
    ""
  );
}

// Your posts store may use "Video" or "video" (or no type at all).
function isVideoPost(p) {
  const t = String(p?.type || p?.postType || "").toLowerCase();
  // If backend doesn’t set type, we still keep items that have a video field.
  return t === "video" || !!getVideoValue(p);
}

export default function AdminVideoPostsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [previewId, setPreviewId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // gate
  useEffect(() => {
    const isAuthed = !!localStorage.getItem("adminAuth");
    if (!isAuthed) navigate("/admin/login", { replace: true });
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const list = await fetchPosts({ scope: VIDEO_SCOPE });
      const onlyVideos = (Array.isArray(list) ? list : []).filter(isVideoPost);
      setItems(onlyVideos);
    } catch (e) {
      console.error("[AdminVideoPostsList] fetch failed", e);
      setErrMsg(e?.message || "Failed to load video posts from backend.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ta = typeof a?.createdAt === "number" ? a.createdAt : new Date(a?.createdAt || 0).getTime();
      const tb = typeof b?.createdAt === "number" ? b.createdAt : new Date(b?.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [items]);

  const remove = async (id) => {
    if (!id) return;
    if (!confirm("Delete this video post?")) return;

    try {
      await deletePost(id);
      setItems((prev) => prev.filter((p) => String(p?.id) !== String(id)));
      if (previewId === id) setPreviewId(null);
    } catch (e) {
      console.error("[AdminVideoPostsList] delete failed", e);
      alert(e?.message || "Failed to delete video post.");
    }
  };

  const copy = async (text) => {
    const val = String(text ?? "");
    try {
      await navigator.clipboard.writeText(val);
      alert("Copied!");
    } catch {
      alert(val); // fallback: show text to copy
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Video Posts</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/posts/video-new"
            className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            + New Video Post
          </Link>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="text-sm text-slate-600 hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={load}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        {errMsg ? <div className="text-sm text-red-700">{errMsg}</div> : null}
      </div>

      {loading ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          Loading…
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          No videos yet. Click “New Video Post” to add one.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">YouTube ID/URL</th>
                <th className="px-4 py-3 text-left">Audience</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const vid = getVideoValue(p);
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      {p.title || <span className="text-slate-500 italic">(untitled)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                        {String(vid || "")}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {p.audience ? <span className="capitalize">{String(p.audience)}</span> : "—"}
                    </td>
                    <td className="px-4 py-3">{formatWhen(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                          onClick={() => setPreviewId(previewId === p.id ? null : p.id)}
                        >
                          {previewId === p.id ? "Hide" : "Preview"}
                        </button>
                        <button
                          className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                          onClick={() => copy(vid)}
                          title="Copy ID/URL"
                        >
                          Copy
                        </button>
                        <button
                          className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
                          onClick={() => copy(`https://youtu.be/${String(vid ?? "")}`)}
                          title="Copy share link"
                        >
                          Copy Link
                        </button>
                        <button
                          className="rounded border border-red-200 text-red-700 px-2 py-1 hover:bg-red-50"
                          onClick={() => remove(p.id)}
                        >
                          Delete
                        </button>
                      </div>

                      {previewId === p.id && (
                        <div className="mt-3">
                          <div className="aspect-video w-full max-w-xl overflow-hidden rounded-lg border border-slate-100">
                            <YouTubeEmbed idOrUrl={vid} title={p.title || "Video Preview"} />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}