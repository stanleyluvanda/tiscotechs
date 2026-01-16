// src/pages/AdminScholarshipList.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listScholarships, updateScholarship, deleteScholarship } from "../utils/scholarshipsApi";

/* ---- Simple modal for “Preview” ---- */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          {children}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* Safe HTML print (server already stores HTML for description/eligibility/benefits/howToApply) */
function RichHtml({ html }) {
  if (!html) return null;
  return <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function AdminScholarshipList() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending"); // default to pending
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ✅ Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { items, total } = await listScholarships({ q, status, page, pageSize });
      setItems(Array.isArray(items) ? items : []);
      setTotal(Number(total || 0));
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, [q, status, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function setStatusAction(id, next) {
    try {
      await updateScholarship(id, { status: next }); // API or local fallback
      await load();
    } catch (e) {
      alert("Failed to update: " + e.message);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this scholarship?")) return;
    try {
      await deleteScholarship(id); // API or local fallback
      await load();
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  }

  function preview(s) {
    setPreviewItem(s);
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin · Scholarships</h1>
        <Link
          to="/admin/scholarships/new"
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
        >
          + New Scholarship
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by title, provider, country…"
          className="w-full md:w-80 border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
          title="Filter by status"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading && <div className="mt-6 text-slate-600">Loading…</div>}
      {err && <div className="mt-6 text-red-600">Error: {err}</div>}
      {!loading && !err && items.length === 0 && <div className="mt-6 text-slate-600">No results.</div>}

      <ul className="mt-6 grid gap-3">
        {items.map((s) => (
          <li key={s.id} className="border border-slate-200 rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{s.title}</div>
                <div className="text-sm text-slate-600">
                  {s.provider}
                  {s.country ? ` • ${s.country}` : ""}
                  {s.level ? ` • ${s.level}` : ""}
                  {s.field ? ` • ${s.field}` : ""}
                  {s.fundingType
                    ? ` • ${Array.isArray(s.fundingType) ? s.fundingType.join(", ") : s.fundingType}`
                    : ""}
                </div>
                <div className="mt-1 text-xs">
                  <span className="px-2 py-0.5 rounded-full border text-slate-700">
                    Status: <b>{s.status || "pending"}</b>
                  </span>
                  {s.deadline && <span className="ml-2 text-slate-500">Deadline: {s.deadline}</span>}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {/* ✅ Row 1: Edit/Delete + new Preview/View */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => preview(s)}
                    className="text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50"
                  >
                    Preview
                  </button>

                  <Link
                    to={`/scholarship/${s.id}`}
                    className="text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50"
                  >
                    View
                  </Link>

                  <Link
                    to={`/admin/scholarships/${s.id}/edit`}
                    className="text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => remove(s.id)}
                    className="text-sm border border-red-300 text-red-700 rounded px-3 py-1.5 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>

                {/* Row 2: Approve/Reject/Mark Pending (unchanged) */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatusAction(s.id, "approved")}
                    className="text-xs border border-green-300 text-green-700 rounded px-2 py-1 hover:bg-green-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setStatusAction(s.id, "rejected")}
                    className="text-xs border border-amber-300 text-amber-700 rounded px-2 py-1 hover:bg-amber-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setStatusAction(s.id, "pending")}
                    className="text-xs border border-slate-300 text-slate-700 rounded px-2 py-1 hover:bg-slate-50"
                  >
                    Mark Pending
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded border border-slate-300 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <div className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </div>
          <button
            className="px-3 py-1.5 text-sm rounded border border-slate-300 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* ✅ Preview modal */}
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
                <div className="mt-2">
                  <RichHtml html={previewItem.description} />
                </div>
              </section>
            )}

            {previewItem.eligibility && (
              <section>
                <h4 className="text-base font-semibold">Eligibility</h4>
                <div className="mt-2">
                  <RichHtml html={previewItem.eligibility} />
                </div>
              </section>
            )}

            {previewItem.benefits && (
              <section>
                <h4 className="text-base font-semibold">Benefits</h4>
                <div className="mt-2">
                  <RichHtml html={previewItem.benefits} />
                </div>
              </section>
            )}

            {previewItem.howToApply && (
              <section>
                <h4 className="text-base font-semibold">How to Apply</h4>
                <div className="mt-2">
                  <RichHtml html={previewItem.howToApply} />
                </div>
              </section>
            )}

            {/* ✅ Internal notes (admin-only in Preview) */}
            {previewItem.notes ? (
              <section>
                <h4 className="text-base font-semibold">Notes (internal)</h4>
                <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                  {previewItem.notes}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}