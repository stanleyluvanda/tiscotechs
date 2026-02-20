// src/pages/PartnerDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadLocalScholarships } from "../utils/scholarshipsLocal"; // ← fallback

// Prefer a dedicated scholarships base if you have it, otherwise use your existing vars.
const API_BASE = (
  import.meta.env.VITE_SCHOLARSHIPS_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/+$/, "");

/* ---- Content types ---- */
const CT_SCH = "SCHOLARSHIP";
const CT_FGA = "FUNDED_GRAD_ADMISSION";

/* ---- tiny helper to load partnerAuth (email) ---- */
function loadPartner() {
  try {
    return JSON.parse(localStorage.getItem("partnerAuth") || "null");
  } catch {
    return null;
  }
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
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
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
  return (
    <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/* -------- Local fallback for FUNDED_GRAD_ADMISSION (safe scan) -------- */
function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function loadLocalFundedGraduateAdmissions() {
  // Try common keys first
  const preferredKeys = [
    "fundedGraduateAdmissions",
    "fundedGraduateAdmission",
    "fundedAdmissions",
    "partnerFundedGraduateAdmissions",
    "funded_grad_admissions",
  ];

  const merged = [];

  for (const k of preferredKeys) {
    const v = safeJsonParse(localStorage.getItem(k) || "null");
    if (Array.isArray(v)) merged.push(...v);
    else if (v && Array.isArray(v.items)) merged.push(...v.items);
  }

  // Light scan: any key mentioning funded/admission
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i) || "";
    if (!/funded|admission|grad/i.test(k)) continue;
    const v = safeJsonParse(localStorage.getItem(k) || "null");
    if (Array.isArray(v)) merged.push(...v);
    else if (v && Array.isArray(v.items)) merged.push(...v.items);
  }

  // Normalize: unwrap {data:{...}} if present
  const out = merged
    .map((x) => (x && x.data && typeof x.data === "object" ? x.data : x))
    .filter(Boolean);

  // If contentType exists, keep only FUNDED_GRAD_ADMISSION
  const hasAnyCt = out.some((x) => x && x.contentType);
  return hasAnyCt ? out.filter((x) => x.contentType === CT_FGA) : out;
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const partner = loadPartner();
  const email = partner?.email || partner?.username || partner?.user || "";

  // Scholarships
  const [items, setItems] = useState([]);
  // Funded grad admissions
  const [fgaItems, setFgaItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewKind, setPreviewKind] = useState(CT_SCH); // which list is being previewed

  useEffect(() => {
    if (!email) {
      navigate("/partner/login", { replace: true });
      return;
    }

    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      const emailLower = String(email || "").toLowerCase().trim();

      // ---------- API fetch helper ----------
      async function fetchMineFromApi(contentType) {
        const params = new URLSearchParams();
        params.set("partnerEmail", emailLower);
        params.set("contentType", contentType);

        const url = `${API_BASE}/api/scholarships?` + params.toString();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        // extra safety: keep only mine + right contentType (if backend returns mixed)
        return list.filter((s) => {
          const pe = String(s.partnerEmail || s.postedByEmail || s.email || "")
            .toLowerCase()
            .trim();
          const ct = String(s.contentType || "").trim();
          const ctOk = ct ? ct === contentType : true;
          return pe && pe === emailLower && ctOk;
        });
      }

      try {
        if (API_BASE) {
          // Fetch both in parallel
          const [schMine, fgaMine] = await Promise.all([
            fetchMineFromApi(CT_SCH),
            fetchMineFromApi(CT_FGA),
          ]);

          if (!alive) return;

          setItems(schMine);
          setFgaItems(fgaMine);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("[PartnerDashboard] API fetch failed, falling back to local:", e);
        // fall through to local
      }

      // ---------- Local fallback ----------
      try {
        const allSch = loadLocalScholarships();
        const mineSch = allSch.filter((s) => {
          const pe = String(s.postedByEmail || s.partnerEmail || "").toLowerCase().trim();
          const ct = String(s.contentType || "").trim();
          const ctOk = ct ? ct === CT_SCH : true; // if older items have no contentType
          return emailLower && pe === emailLower && ctOk;
        });

        const allFga = loadLocalFundedGraduateAdmissions();
        const mineFga = allFga.filter((s) => {
          const pe = String(s.postedByEmail || s.partnerEmail || "").toLowerCase().trim();
          const ct = String(s.contentType || "").trim();
          const ctOk = ct ? ct === CT_FGA : true;
          return emailLower && pe === emailLower && ctOk;
        });

        if (!alive) return;
        setItems(mineSch);
        setFgaItems(mineFga);
        setErr("");
      } catch (e) {
        if (!alive) return;
        setErr(`Failed to load: ${e?.message || String(e)}`);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [email, navigate]);

  const filteredScholarships = useMemo(() => {
    let list = items.slice();

    if (statusFilter !== "all") {
      list = list.filter(
        (s) => String(s.status || "pending").toLowerCase() === statusFilter
      );
    }

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((s) =>
        [s.title, s.provider, s.country, s.level, s.field]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      );
    }

    return list;
  }, [items, statusFilter, q]);

  const filteredFga = useMemo(() => {
    let list = fgaItems.slice();

    if (statusFilter !== "all") {
      list = list.filter(
        (s) => String(s.status || "pending").toLowerCase() === statusFilter
      );
    }

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((s) =>
        [s.title, s.provider, s.country, s.level, s.field]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      );
    }

    return list;
  }, [fgaItems, statusFilter, q]);

  async function setStatusFor(kind, id, status) {
    if (!API_BASE) {
      if (kind === CT_SCH) setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
      else setFgaItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
      return;
    }

    try {
      // same endpoint; backend should apply by id
      const res = await fetch(`${API_BASE}/api/scholarships/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();

      if (kind === CT_SCH) setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      else setFgaItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch (e) {
      alert(`Failed to update status: ${e.message}`);
    }
  }

  async function removeFor(kind, id) {
    if (!API_BASE) {
      if (kind === CT_SCH) setItems((prev) => prev.filter((it) => it.id !== id));
      else setFgaItems((prev) => prev.filter((it) => it.id !== id));
      return;
    }

    if (!confirm("Delete this item? This cannot be undone.")) return;

    try {
      const res = await fetch(`${API_BASE}/api/scholarships/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (kind === CT_SCH) setItems((prev) => prev.filter((it) => it.id !== id));
      else setFgaItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  function preview(kind, item) {
    setPreviewKind(kind);
    setPreviewItem(item);
    setPreviewOpen(true);
  }

  const schEmpty = !loading && !err && filteredScholarships.length === 0;
  const fgaEmpty = !loading && !err && filteredFga.length === 0;

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

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/partner/submit-scholarship"
            className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            + Add Scholarship
          </Link>

          {/* If you already have a route for funded grad submission, keep it.
              If not, you can change this path later. */}
          <Link
            to="/partner/submit-funded-graduate-admission"
            className="rounded bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            title="Submit a university-funded graduate program opportunity"
          >
            + Add Funded Grad Program
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
        ) : null}

        {/* =========================
            Scholarships section
           ========================= */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">My Scholarships</h2>
            <span className="text-xs text-slate-500">
              {filteredScholarships.length} item{filteredScholarships.length === 1 ? "" : "s"}
            </span>
          </div>

          {schEmpty ? (
            <div className="py-8 text-center text-slate-600">No scholarships found.</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
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
                  {filteredScholarships.map((it) => (
                    <tr key={it.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{it.title}</div>
                        <div className="text-slate-500">
                          {it.country || "Multiple"} • {it.level || "—"}
                        </div>
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
                            onClick={() => preview(CT_SCH, it)}
                            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                            title="Preview"
                          >
                            Preview
                          </button>

                          <Link
                            to={`/scholarship/${it.id}`}
                            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                            title="View public page"
                          >
                            View
                          </Link>

                          {it.status !== "archived" ? (
                            <button
                              onClick={() => setStatusFor(CT_SCH, it.id, "archived")}
                              className="rounded border border-amber-300 text-amber-700 px-2 py-1 hover:bg-amber-50"
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => setStatusFor(CT_SCH, it.id, "pending")}
                              className="rounded border border-green-300 text-green-700 px-2 py-1 hover:bg-green-50"
                            >
                              Unarchive
                            </button>
                          )}

                          <button
                            onClick={() => removeFor(CT_SCH, it.id)}
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

        {/* =========================
            Funded Graduate Programs section
           ========================= */}
        <div className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              My Funded Graduate Programs
            </h2>
            <span className="text-xs text-slate-500">
              {filteredFga.length} item{filteredFga.length === 1 ? "" : "s"}
            </span>
          </div>

          {fgaEmpty ? (
            <div className="py-8 text-center text-slate-600">
              No funded graduate programs found.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">University</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Deadline</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFga.map((it) => (
                    <tr key={it.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{it.title}</div>
                        <div className="text-slate-500">
                          {it.country || "Multiple"} • {it.level || "—"}
                        </div>
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
                            onClick={() => preview(CT_FGA, it)}
                            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                            title="Preview"
                          >
                            Preview
                          </button>

                          <Link
                            to={`/funded-graduate-admission/${it.id}`}
                            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                            title="View public page"
                          >
                            View
                          </Link>

                          {it.status !== "archived" ? (
                            <button
                              onClick={() => setStatusFor(CT_FGA, it.id, "archived")}
                              className="rounded border border-amber-300 text-amber-700 px-2 py-1 hover:bg-amber-50"
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => setStatusFor(CT_FGA, it.id, "pending")}
                              className="rounded border border-green-300 text-green-700 px-2 py-1 hover:bg-green-50"
                            >
                              Unarchive
                            </button>
                          )}

                          <button
                            onClick={() => removeFor(CT_FGA, it.id)}
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
                <h4 className="text-base font-semibold">
                  {previewKind === CT_FGA ? "Program Description" : "Scholarship Description"}
                </h4>
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
          </div>
        ) : null}
      </Modal>
    </div>
  );
}