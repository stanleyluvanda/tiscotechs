// src/pages/AdminStudentConsents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listConsentsPublic } from "../lib/consentsApi.js";
import useNoIndex from "../lib/useNoIndex";

/* ---------- tiny utils ---------- */
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

/* ✅ Categories */
const CATEGORIES = [
  { key: "scholarshipAlerts", label: "Scholarship Alerts" },
  { key: "applicationTips", label: "University Application Tips" },
  { key: "programRecommendations", label: "Program Recommendation" },
  { key: "applicationInvitation", label: "University Application Invitation" },
];
const ALL_KEYS = CATEGORIES.map((c) => c.key);

/* tolerant normalizer */
function normalizeItemToRow(item) {
  const userId =
    item?.userId ||
    item?.id ||
    item?.studentId ||
    item?.user_id ||
    (typeof item?.PK === "string" && item.PK.startsWith("USER#") ? item.PK.slice(5) : "") ||
    "";

  const profile = item?.profile && typeof item.profile === "object" ? item.profile : null;

  const name =
    item?.name ||
    profile?.name ||
    item?.studentName ||
    item?.fullName ||
    "Student";

  const email =
    item?.email ||
    profile?.email ||
    item?.username ||
    item?.studentEmail ||
    "";

  const university =
    item?.university ||
    profile?.university ||
    item?.school ||
    "";

  const faculty =
    item?.faculty ||
    profile?.faculty ||
    item?.department ||
    "";

  const src = item?.consents || item?.consent || item?.choices || item || {};

  const consent = {
    scholarshipAlerts: !!(src?.scholarshipAlerts ?? item?.scholarshipAlerts),
    applicationTips: !!(src?.applicationTips ?? item?.applicationTips),
    programRecommendations: !!(src?.programRecommendations ?? item?.programRecommendations),
    applicationInvitation: !!(
      src?.applicationInvitation ??
      src?.applicationInvitations ??
      item?.applicationInvitation ??
      item?.applicationInvitations
    ),
  };

  const visibleAcrossDevices = !!(
    item?.visibleAcrossDevices ??
    item?.persistAcrossDevices ??
    item?.syncAcrossDevices
  );

  const updatedAt = item?.updatedAt || item?.updated_at || item?.lastUpdatedAt || null;

  return {
    id: userId || email || name,
    userId,
    name,
    email,
    university,
    faculty,
    consent,
    visibleAcrossDevices,
    updatedAt,
  };
}

function toCSV(rows) {
  const headers = [
    "userId",
    "name",
    "email",
    "university",
    "faculty",
    "visibleAcrossDevices",
    "scholarshipAlerts",
    "applicationTips",
    "programRecommendations",
    "applicationInvitation",
    "updatedAt",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];

  rows.forEach((r) => {
    lines.push(
      [
        r.userId || r.id,
        r.name,
        r.email,
        r.university,
        r.faculty,
        r.visibleAcrossDevices ? 1 : 0,
        r.consent.scholarshipAlerts ? 1 : 0,
        r.consent.applicationTips ? 1 : 0,
        r.consent.programRecommendations ? 1 : 0,
        r.consent.applicationInvitation ? 1 : 0,
        r.updatedAt || "",
      ]
        .map(esc)
        .join(",")
    );
  });

  return lines.join("\n");
}

export default function AdminStudentConsents() {
  useNoIndex();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("any");
  const [onlyOptedIn, setOnlyOptedIn] = useState(true);
  const [optinFilter, setOptinFilter] = useState("any");
  const [tick, setTick] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadFirstPage() {
      setLoading(true);
      setError("");
      setItems([]);
      setCursor("");
      setHasMore(false);

      try {
        const data = await listConsentsPublic({ limit: 200, cursor: null });

        const list = data?.items || data?.rows || data?.results || data?.data || [];
        const nextCursor = data?.nextCursor || data?.cursor || data?.next || "";

        const normalized = Array.isArray(list) ? list.map(normalizeItemToRow) : [];
        if (!alive) return;

        const seen = new Set();
        const deduped = [];
        for (const r of normalized) {
          const key = r.userId || r.id;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          deduped.push(r);
        }

        setItems(deduped);
        setCursor(nextCursor || "");
        setHasMore(!!nextCursor);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load consents.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadFirstPage();
    return () => {
      alive = false;
    };
  }, [tick]);

  const loadMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    setError("");

    try {
      const data = await listConsentsPublic({ limit: 200, cursor: cursor || null });

      const list = data?.items || data?.rows || data?.results || data?.data || [];
      const nextCursor = data?.nextCursor || data?.cursor || data?.next || "";

      const normalized = Array.isArray(list) ? list.map(normalizeItemToRow) : [];

      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.userId || x.id));
        const add = normalized.filter((x) => {
          const k = x.userId || x.id;
          return k && !seen.has(k);
        });
        return [...prev, ...add];
      });

      setCursor(nextCursor || "");
      setHasMore(!!nextCursor);
    } catch (e) {
      setError(e?.message || "Failed to load more.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = items.length;
    const counts = {};
    CATEGORIES.forEach((c) => {
      counts[c.key] = items.filter((r) => r.consent[c.key]).length;
    });
    const any = items.filter((r) => Object.values(r.consent).some(Boolean)).length;
    const visible = items.filter((r) => r.visibleAcrossDevices).length;
    return { total, any, visible, counts };
  }, [items]);

  const rows = useMemo(() => {
    let arr = items.slice();

    const s = q.trim().toLowerCase();
    if (s) {
      arr = arr.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(s) ||
          (r.email || "").toLowerCase().includes(s) ||
          (r.university || "").toLowerCase().includes(s) ||
          (r.faculty || "").toLowerCase().includes(s)
      );
    }

    if (onlyOptedIn) {
      if (optinFilter === "any") {
        arr = arr.filter((r) => ALL_KEYS.some((k) => r.consent[k]));
      } else if (optinFilter === "all") {
        arr = arr.filter((r) => ALL_KEYS.every((k) => r.consent[k]));
      } else {
        arr = arr.filter((r) => !!r.consent[optinFilter]);
      }
    } else {
      if (category !== "any") {
        arr = arr.filter((r) => !!r.consent[category]);
      }
    }

    arr.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    return arr;
  }, [items, q, category, onlyOptedIn, optinFilter]);

  const copyEmails = async () => {
    const emails = rows.map((r) => r.email).filter(Boolean);
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      alert(`Copied ${emails.length} email(s) to clipboard.`);
    } catch {
      alert("Could not copy to clipboard in this browser.");
    }
  };

  const exportCsv = () => {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-consents.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 space-y-4">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Student Alert Consents</h1>

            <span className="ml-auto text-sm text-slate-600">
              Total loaded: <b>{stats.total}</b> • Any opt-in: <b>{stats.any}</b> • Visible across devices:{" "}
              <b>{stats.visible}</b>
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Data source: DynamoDB via{" "}
              <code className="px-1 py-0.5 bg-slate-100 rounded">GET /api/consents</code>
            </span>
            <span className="ml-auto text-xs text-slate-500">
              <Link to="/admin/dashboard" className="underline">
                Back to Admin Dashboard
              </Link>
            </span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_auto_260px_auto]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, university…"
              className="border border-slate-200 rounded px-3 py-2 bg-white"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-slate-200 rounded px-2 py-2 bg-white disabled:opacity-50"
              title="Filter by category"
              disabled={onlyOptedIn}
            >
              <option value="any">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyOptedIn}
                onChange={(e) => {
                  setOnlyOptedIn(e.target.checked);
                  if (e.target.checked) setOptinFilter("any");
                }}
              />
              Only opted-in
            </label>

            <select
              value={optinFilter}
              onChange={(e) => setOptinFilter(e.target.value)}
              className="border border-slate-200 rounded px-2 py-2 bg-white disabled:opacity-50"
              title="Which opt-in to show"
              disabled={!onlyOptedIn}
            >
              <option value="any">Any (at least one)</option>
              <option value="all">All (all options)</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={copyEmails}
                className="rounded border border-slate-200 px-3 py-2 bg-white hover:bg-slate-50 text-sm"
              >
                Copy emails
              </button>
              <button
                onClick={exportCsv}
                className="rounded bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <div key={c.key} className="rounded border border-slate-200 bg-white px-2 py-1">
                <span className="font-medium">{c.label}:</span> {stats.counts[c.key]}
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
          {loading && <div className="mt-3 text-sm text-slate-600">Loading…</div>}
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[1300px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>University</Th>
                  <Th>Faculty</Th>
                  <Th title="Student saved to DynamoDB">Visible across devices</Th>
                  {CATEGORIES.map((c) => (
                    <Th key={c.key} title={c.label}>
                      {c.label}
                    </Th>
                  ))}
                  <Th>Updated</Th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId || r.id} className="border-t border-slate-100">
                    <Td>{r.name}</Td>
                    <Td className="text-blue-700 underline">
                      {r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : "—"}
                    </Td>
                    <Td>{r.university || "—"}</Td>
                    <Td>{r.faculty || "—"}</Td>
                    <Td className="text-center">{r.visibleAcrossDevices ? "✓" : "—"}</Td>
                    {CATEGORIES.map((c) => (
                      <Td key={c.key} className="text-center">
                        {r.consent[c.key] ? "✓" : "—"}
                      </Td>
                    ))}
                    <Td>{fmtDate(r.updatedAt)}</Td>
                  </tr>
                ))}

                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7 + CATEGORIES.length} className="p-6 text-center text-slate-500">
                      No matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Showing <b>{rows.length}</b> of <b>{stats.total}</b> loaded{hasMore ? " (more available)" : ""}
            </div>

            <div className="flex items-center gap-2">
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="text-sm rounded border border-slate-200 px-3 py-1 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  Load more
                </button>
              )}

              <button
                onClick={() => setTick((t) => t + 1)}
                className="text-sm rounded border border-slate-200 px-3 py-1 bg-white hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </Card>

        <div className="text-sm text-slate-600">
          This view is read-only. “Visible across devices” means the student has a saved row in DynamoDB.
        </div>
      </main>
    </div>
  );
}

/* ---------- light UI helpers ---------- */
function Card({ className = "", children }) {
  return (
    <div className={`w-full box-border rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
function Th({ children, title }) {
  return (
    <th title={title} className="px-3 py-2 text-xs font-semibold text-slate-600">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}