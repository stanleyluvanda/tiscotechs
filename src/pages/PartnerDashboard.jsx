// src/pages/PartnerDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadLocalScholarships } from "../utils/scholarshipsLocal"; // ← fallback

// ← Normalize API base (empty if not set) and strip trailing slashes
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/+$/, "");

/* ---- tiny helper to load partnerAuth (email) ---- */
function loadPartner() {
  try { return JSON.parse(localStorage.getItem("partnerAuth") || "null"); } catch { return null; }
}

/* ---- Simple modal for “Preview” ---- */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          {children}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button onClick={onClose} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}

/* Safe HTML print (server already stores HTML for description/eligibility/benefits/howToApply) */
function RichHtml({ html }) {
  if (!html) return null;
  return (
    <div
      className="prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const partner = loadPartner(); // { email, name, ... } depending on your login shape
  const email = partner?.email || partner?.username || partner?.user || ""; // best-effort

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    if (!email) {
      // If no partner auth, send to partner login
      navigate("/partner/login", { replace: true });
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");

      // Try API if configured; otherwise fall back to localStorage
      if (API_BASE) {
        try {
          const res = await fetch(`${API_BASE}/api/scholarships/mine?email=${encodeURIComponent(email)}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (alive) setItems(data.items || []);
          return;
        } catch (e) {
          // fall through to local storage
        } finally {
          if (alive) setLoading(false);
        }
      }

      // Serverless fallback (localStorage)
      try {
        const all = loadLocalScholarships();
        const mine = all.filter((s) =>
          email && String(s.postedByEmail || s.partnerEmail || "").toLowerCase() === email.toLowerCase()
        );
        if (alive) {
          setItems(mine);
          setErr("");
        }
      } catch (e) {
        if (alive) setErr(`Failed to load: ${e.message}`);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [email, navigate]);

  const filtered = useMemo(() => {
    let list = items.slice();
    if (statusFilter !== "all") {
      list = list.filter(s => (s.status || "pending") === statusFilter);
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(s =>
        [s.title, s.provider, s.country, s.level, s.field]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(needle))
      );
    }
    return list;
  }, [items, statusFilter, q]);

  async function setStatus(id, status) {
    // If no backend, update locally so the UI keeps working
    if (!API_BASE) {
      setItems(prev => prev.map(it => (it.id === id ? { ...it, status } : it)));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/scholarships/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setItems(prev => prev.map(it => (it.id === id ? updated : it)));
    } catch (e) {
      alert(`Failed to update status: ${e.message}`);
    }
  }

  async function remove(id) {
    // If no backend, remove locally
    if (!API_BASE) {
      setItems(prev => prev.filter(it => it.id !== id));
      return;
    }
    if (!confirm("Delete this scholarship? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/scholarships/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems(prev => prev.filter(it => it.id !== id));
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  function preview(item) {
    setPreviewItem(item);
    setPreviewOpen(true);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Local CSS for bullet lists in preview */}
      <style>{`
        .prose-sm ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0 0.75rem; }
        .prose-sm ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5rem 0 0.75rem; }
        .prose-sm li { display: list-item; margin: 0.25rem 0; }
        .prose-sm p { margin: 0.5rem 0; }
        .prose-sm a { text-decoration: underline; }
      `}</style>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Partner Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/partner/submit-scholarship"
            className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            + Add Scholarship
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            Signed in as <span className="font-medium">{email || "Unknown partner"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search my listings…"
              className="w-full sm:w-64 rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-600">Loading…</div>
        ) : err ? (
          <div className="py-12 text-center text-red-600">{err}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-600">No scholarships found.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Deadline</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-slate-500">{it.country || "Multiple"} • {it.level || "—"}</div>
                    </td>
                    <td className="py-2 pr-3">{it.provider}</td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                        {it.status || "pending"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{it.deadline || "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => preview(it)}
                          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                          title="Preview"
                        >
                          Preview
                        </button>
                        {/* Public view (uses your existing /scholarship/:id) */}
                        <Link
                          to={`/scholarship/${it.id}`}
                          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                          title="View public page"
                        >
                          View
                        </Link>
                        {/* Archive / Unarchive */}
                        {it.status !== "archived" ? (
                          <button
                            onClick={() => setStatus(it.id, "archived")}
                            className="rounded border border-amber-300 text-amber-700 px-2 py-1 hover:bg-amber-50"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => setStatus(it.id, "pending")}
                            className="rounded border border-green-300 text-green-700 px-2 py-1 hover:bg-green-50"
                          >
                            Unarchive
                          </button>
                        )}
                        {/* Delete */}
                        <button
                          onClick={() => remove(it.id)}
                          className="rounded border border-red-300 text-red-700 px-2 py-1 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewItem ? previewItem.title : "Preview"}
      >
        {previewItem ? (
          <div className="space-y-6">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{previewItem.provider}</span>
              {previewItem.country ? ` • ${previewItem.country}` : ""}
              {previewItem.level ? ` • ${previewItem.level}` : ""}
              {previewItem.field ? ` • ${previewItem.field}` : ""}
            </div>

            {previewItem.description && (
              <section>
                <h4 className="text-base font-semibold">Scholarship Description</h4>
                <div className="mt-2"><RichHtml html={previewItem.description} /></div>
              </section>
            )}
            {previewItem.eligibility && (
              <section>
                <h4 className="text-base font-semibold">Eligibility</h4>
                <div className="mt-2"><RichHtml html={previewItem.eligibility} /></div>
              </section>
            )}
            {previewItem.benefits && (
              <section>
                <h4 className="text-base font-semibold">Benefits</h4>
                <div className="mt-2"><RichHtml html={previewItem.benefits} /></div>
              </section>
            )}
            {previewItem.howToApply && (
              <section>
                <h4 className="text-base font-semibold">How to Apply</h4>
                <div className="mt-2"><RichHtml html={previewItem.howToApply} /></div>
              </section>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}