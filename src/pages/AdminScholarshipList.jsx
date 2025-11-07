// src/pages/AdminScholarshipList.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listScholarships, updateScholarship, deleteScholarship } from "../utils/scholarshipsApi";

export default function AdminScholarshipList() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending"); // default to pending
  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function load() {
    setLoading(true); setErr("");
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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, status, page]);
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search by title, provider, country…"
          className="w-full md:w-80 border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
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
      {!loading && !err && items.length === 0 && (
        <div className="mt-6 text-slate-600">No results.</div>
      )}

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
                  {s.deadline && (
                    <span className="ml-2 text-slate-500">Deadline: {s.deadline}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
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
    </div>
  );
}