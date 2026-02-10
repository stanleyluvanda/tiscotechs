// AdminSupportInbox.jsx
import { useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useNoIndex from "../lib/useNoIndex";

const SUPPORT_API =
  (import.meta.env.VITE_SUPPORT_API_BASE &&
    String(import.meta.env.VITE_SUPPORT_API_BASE).trim()) ||
  "";

function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

/**
 * ✅ Support Inbox token resolution (safe + backward compatible)
 * Priority:
 *  1) localStorage["supportAdminAuth"] = { token: "..." }
 *  2) localStorage["adminAuth"].supportToken
 *  3) localStorage["adminAuth"].token or .accessToken (legacy)
 *  4) raw string stored in adminAuth (very old)
 */
function getAdminToken() {
  // 1) NEW sidecar token (recommended)
  const rawSupport = localStorage.getItem("supportAdminAuth");
  if (rawSupport) {
    const o = safeParse(rawSupport);
    const t = o && (o.token || o.accessToken);
    if (t) return String(t);

    // if it was stored as raw string
    if (typeof rawSupport === "string" && rawSupport.trim().length > 10) {
      return rawSupport.trim();
    }
  }

  // 2/3/4) Existing adminAuth (do not break anything else)
  const raw = localStorage.getItem("adminAuth");
  if (!raw) return "";
  const obj = safeParse(raw);

  // If adminAuth is an object, prefer supportToken if present
  if (obj && typeof obj === "object") {
    if (obj.supportToken) return String(obj.supportToken);
    if (obj.token || obj.accessToken) return String(obj.token || obj.accessToken);
    return "";
  }

  // If adminAuth was stored as raw string (legacy)
  return typeof raw === "string" ? raw : "";
}

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

/* ---------------- Read more helper ---------------- */

function MessageWithReadMore({ id, text, expanded, onOverflow }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    // detect real visual overflow (only meaningful when clamped)
    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    onOverflow(id, hasOverflow);
  }, [id, text, expanded, onOverflow]);

  return (
    <div
      ref={ref}
      className={`text-slate-800 whitespace-pre-wrap transition-all ${
        expanded ? "" : "line-clamp-5"
      }`}
    >
      {text}
    </div>
  );
}

/* ---------------- Main component ---------------- */

export default function AdminSupportInbox() {
  useNoIndex();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ Search + Topic filter
  const [q, setQ] = useState("");
  const [topicFilter, setTopicFilter] = useState("All");

  // per-message UI state
  const [expanded, setExpanded] = useState({});
  const [canExpand, setCanExpand] = useState({});

  const token = useMemo(() => getAdminToken(), []);

  useEffect(() => {
    if (!token) navigate("/admin/login", { replace: true });
  }, [token, navigate]);

  function toggleExpanded(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ✅ Once expandable, always expandable (so Read less never disappears)
  function handleOverflow(id, value) {
    setCanExpand((prev) => {
      if (prev[id]) return prev; // already known expandable
      if (!value) return prev; // still not expandable
      return { ...prev, [id]: true }; // lock it as expandable
    });
  }

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`${SUPPORT_API}/api/admin/support/messages`, {
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        throw new Error(j.error || "Failed to load messages");
      }

      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setErr(e.message || "Could not load support messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id, patch = {}) {
    try {
      const res = await fetch(
        `${SUPPORT_API}/api/admin/support/messages/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patch),
        }
      );

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        throw new Error(j.error || "Update failed");
      }

      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...(j.item || patch) } : x))
      );
    } catch (e) {
      alert(e.message || "Update failed");
    }
  }

  // ✅ Search + Topic filtering
  const filtered = items.filter((m) => {
    const topicOk =
      topicFilter === "All" || String(m.topic || "").trim() === topicFilter;

    if (!topicOk) return false;

    if (!q.trim()) return true;
    const s = q.toLowerCase();

    return (
      String(m.name || "").toLowerCase().includes(s) ||
      String(m.email || "").toLowerCase().includes(s) ||
      String(m.topic || "").toLowerCase().includes(s) ||
      String(m.message || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Support Inbox</h1>
          <p className="text-slate-600 mt-1">
            Messages submitted via the Contact page.
          </p>
        </div>

        <button
          onClick={load}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* ✅ Search + Topic dropdown */}
      <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, topic, message…"
          className="w-full md:flex-1 border border-slate-200 rounded px-3 py-2"
        />

        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="w-full md:w-64 border border-slate-200 rounded px-3 py-2 bg-white"
          title="Filter by topic"
        >
          <option value="All">All topics</option>
          <option value="General question">General question</option>
          <option value="Studying in the U.S.">Studying in the U.S.</option>
          <option value="Scholarships">Scholarships</option>
          <option value="Account / Login">Account / Login</option>
          <option value="Partnerships">Partnerships</option>
          <option value="Other">Other</option>
        </select>

        {loading && <span className="text-sm text-slate-500">Loading…</span>}
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </div>

      <div className="mt-6 grid gap-4">
        {filtered.length === 0 && !loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">
            No messages found.
          </div>
        )}

        {filtered.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-slate-900">
                    {m.name || "Unknown"}
                  </div>

                  <a
                    className="text-blue-600 underline text-sm"
                    href={`mailto:${m.email || ""}`}
                  >
                    {m.email || ""}
                  </a>

                  {m.topic && (
                    <span className="text-xs rounded-full border border-slate-200 px-2 py-0.5">
                      {m.topic}
                    </span>
                  )}

                  {m.status && (
                    <span className="text-xs rounded-full border border-slate-200 px-2 py-0.5">
                      {m.status}
                    </span>
                  )}

                  {!m.read && (
                    <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                      New
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 mt-1">{fmt(m.createdAt)}</div>

                {/* ✅ Message + Read more / less */}
                <div className="mt-3">
                  <MessageWithReadMore
                    id={m.id}
                    text={m.message || ""}
                    expanded={!!expanded[m.id]}
                    onOverflow={handleOverflow}
                  />

                  {canExpand[m.id] && (
                    <button
                      onClick={() => toggleExpanded(m.id)}
                      className="mt-1 text-sm text-blue-600 hover:underline"
                    >
                      {expanded[m.id] ? "Read less" : "Read more"}
                    </button>
                  )}
                </div>
              </div>

              {/* ✅ Buttons stay horizontal (no distortion) */}
              <div className="md:ml-auto flex items-center justify-end gap-2 whitespace-nowrap">
                <button
                  onClick={() => updateStatus(m.id, { read: true })}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Mark read
                </button>

                <button
                  onClick={() => updateStatus(m.id, { status: "in_progress", read: true })}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  In progress
                </button>

                <button
                  onClick={() => updateStatus(m.id, { status: "closed", read: true })}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}