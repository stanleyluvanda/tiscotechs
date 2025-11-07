// src/pages/admin/AdminVideoPostForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import YouTubeEmbed from "../../components/YouTubeEmbed";

/* ------------------ YouTube helper ------------------ */
function extractYouTubeId(input = "") {
  const s = String(input).trim();
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,     // ...watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/,   // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/,  // /shorts/ID
    /^([A-Za-z0-9_-]{11})$/,          // raw ID
  ];
  for (const rx of patterns) {
    const m = s.match(rx);
    if (m && m[1]) return m[1];
  }
  return null;
}

/* ------------------ CONTINENTS (match registration) ------------------ */
const REG_CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
];

/* ------------------ Page ------------------ */
export default function AdminVideoPostForm() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [videoUrlOrId, setVideoUrlOrId] = useState("");
  const [audience, setAudience] = useState("students"); // "students" | "lecturers" | "both"
  const [saving, setSaving] = useState(false);

  // Student scope: "all" or "continent"
  const [scope, setScope] = useState("all");
  const [continents, setContinents] = useState([]);

  // Always show the full registration continents
  const continentOptions = useMemo(() => REG_CONTINENTS.slice(), []);

  /* ---------- Admin gate ---------- */
  useEffect(() => {
    const isAuthed = !!localStorage.getItem("adminAuth");
    if (!isAuthed) navigate("/admin/login", { replace: true });
  }, [navigate]);

  /* ---------- helpers ---------- */
  const toggleContinent = (c) => {
    setContinents((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const resetScopeFields = (nextScope = "all") => {
    setScope(nextScope);
    setContinents([]);
  };

  /* ---------- Save ---------- */
  async function handleSave(e) {
    e.preventDefault();

    const id = extractYouTubeId(videoUrlOrId);
    if (!id) {
      alert("That doesn't look like a valid YouTube URL or 11-character ID.");
      return;
    }

    const includesStudents = audience === "students" || audience === "both";
    if (includesStudents && scope === "continent" && continents.length === 0) {
      alert("Pick at least one continent, or switch scope to All students.");
      return;
    }

    setSaving(true);
    try {
      const raw = localStorage.getItem("videoPosts") || "[]";
      const posts = JSON.parse(raw) || [];

      const videoAudience = !includesStudents
        ? { scope: "all" } // irrelevant when only lecturers
        : scope === "all"
        ? { scope: "all" }
        : { scope: "continent", continents: continents.slice() };

      const newPost = {
        id: Date.now().toString(),
        type: "video",
        title: title.trim() || null,
        videoUrlOrId: id,
        createdByRole: "admin",
        audience,          // "students" | "lecturers" | "both"
        videoAudience,     // {scope:"all"} OR {scope:"continent", continents:[...]}
        createdAt: new Date().toISOString(),
      };

      posts.push(newPost);
      localStorage.setItem("videoPosts", JSON.stringify(posts));
      window.dispatchEvent(new Event("videoPosts:updated"));

      // reset
      setTitle("");
      setVideoUrlOrId("");
      setAudience("students");
      resetScopeFields("all");

      alert("Video post saved!");
      navigate("/admin/dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to save the video post.");
    } finally {
      setSaving(false);
    }
  }

  const includesStudents = audience === "students" || audience === "both";

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">New Video Post</h1>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="text-sm text-slate-600 hover:underline"
          >
            Back
          </button>
        </div>
        <p className="text-slate-600 mt-1">
          Paste a YouTube URL or the 11-character Video ID, choose who should see it, and publish.
        </p>

        {/* Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
            <div className="text-sm font-semibold text-slate-800">Video details</div>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title (optional)</label>
              <input
                className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                placeholder="Intro to the platform"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* YouTube URL/ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                YouTube URL or 11-character ID{" "}
                <span className="text-slate-400">
                  (e.g. https://youtu.be/EW_TfUnT9c0 or EW_TfUnT9c0)
                </span>
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                placeholder="https://youtu.be/xxxxxxxxxxx"
                value={videoUrlOrId}
                onChange={(e) => setVideoUrlOrId(e.target.value)}
              />
            </div>

            {/* Audience */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                value={audience}
                onChange={(e) => {
                  const val = e.target.value;
                  setAudience(val);
                  if (val === "lecturers") resetScopeFields("all");
                }}
              >
                <option value="students">Students</option>
                <option value="lecturers">Lecturers</option>
                <option value="both">Both</option>
              </select>
            </div>

            {/* Student scope */}
            {includesStudents && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">Student Scope</div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Scope</label>
                    <select
                      className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      value={scope}
                      onChange={(e) => resetScopeFields(e.target.value)}
                    >
                      <option value="all">All students</option>
                      <option value="continent">By continent</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose whether this video targets every student or specific continents.
                    </p>
                  </div>

                  {scope === "continent" && (
                    <div>
                      <label className="block text-sm text-slate-700 mb-2">Select continent(s)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {continentOptions.map((c) => (
                          <label
                            key={c}
                            className="flex items-center gap-2 text-sm bg-white rounded-lg border border-slate-200 px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={continents.includes(c)}
                              onChange={() => toggleContinent(c)}
                            />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live preview */}
            {videoUrlOrId ? (
              <div className="mt-2">
                <div className="text-sm font-medium text-slate-700 mb-2">Preview</div>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <YouTubeEmbed idOrUrl={videoUrlOrId} title={title || "Video Preview"} />
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 text-white px-5 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Publish Video Post"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className="rounded-xl border border-slate-300 bg-white text-slate-700 px-4 py-2 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Videos targeted “By continent” will only appear to students whose profile continent matches your selection.
        </div>
      </div>
    </div>
  );
}