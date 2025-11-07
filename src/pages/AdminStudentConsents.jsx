// src/pages/AdminStudentConsents.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* ---------- tiny utils ---------- */
function safeParse(j) { try { return JSON.parse(j || ""); } catch { return null; } }
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

const CATEGORIES = [
  { key: "scholarshipAlerts",      label: "Scholarship Alerts" },
  { key: "applicationTips",        label: "University Application Tips" },
  { key: "programRecommendations", label: "Program Recommendation" },
  { key: "applicationInvitation",  label: "University Application Invitation" },
];
const ALL_KEYS = CATEGORIES.map(c => c.key);

/* Load all students + their consent from localStorage (tolerant to shapes) */
function loadAllConsents() {
  const users = safeParse(localStorage.getItem("users")) || [];
  const byIdMap = safeParse(localStorage.getItem("consentsByUserId")) || {};
  return users
    .filter(u => (u.role || "student").toLowerCase() === "student")
    .map(u => {
      const perKey   = safeParse(localStorage.getItem(`studentConsent:${u.id}`)) || null;
      const fromMap  = byIdMap[u.id] || null;
      const fromUser = u.consent || u.emailConsent || {};
      const consent = {
        scholarshipAlerts:      !!(fromMap?.scholarshipAlerts      ?? perKey?.scholarshipAlerts      ?? fromUser?.scholarshipAlerts),
        applicationTips:        !!(fromMap?.applicationTips        ?? perKey?.applicationTips        ?? fromUser?.applicationTips),
        programRecommendations: !!(fromMap?.programRecommendations ?? perKey?.programRecommendations ?? fromUser?.programRecommendations),
        applicationInvitation:  !!(fromMap?.applicationInvitation  ?? perKey?.applicationInvitation  ?? fromUser?.applicationInvitation),
      };
      const updatedAt = fromMap?.updatedAt || perKey?.updatedAt || fromUser?.updatedAt || u.updatedAt || null;
      return {
        id: u.id,
        name: u.name || "Student",
        email: u.email || u.username || "",
        university: u.university || "",
        faculty: u.faculty || "",
        consent,
        updatedAt,
      };
    });
}

function toCSV(rows) {
  const headers = [
    "id","name","email","university","faculty",
    "scholarshipAlerts","applicationTips","programRecommendations","applicationInvitation","updatedAt"
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  rows.forEach(r => {
    lines.push([
      r.id, r.name, r.email, r.university, r.faculty,
      r.consent.scholarshipAlerts ? 1 : 0,
      r.consent.applicationTips ? 1 : 0,
      r.consent.programRecommendations ? 1 : 0,
      r.consent.applicationInvitation ? 1 : 0,
      r.updatedAt || ""
    ].map(esc).join(","));
  });
  return lines.join("\n");
}

export default function AdminStudentConsents() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("any");         // legacy category filter
  const [onlyOptedIn, setOnlyOptedIn] = useState(true);    // master toggle
  const [optinFilter, setOptinFilter] = useState("any");   // 'any' | 'all' | categoryKey
  const [tick, setTick] = useState(0);

  const all = useMemo(() => loadAllConsents(), [tick]);

  const stats = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach(c => counts[c.key] = all.filter(r => r.consent[c.key]).length);
    const any = all.filter(r => Object.values(r.consent).some(Boolean)).length;
    return { total: all.length, any, counts };
  }, [all]);

  const rows = useMemo(() => {
    let arr = all.slice();

    // Search
    const s = q.trim().toLowerCase();
    if (s) {
      arr = arr.filter(r =>
        (r.name || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s) ||
        (r.university || "").toLowerCase().includes(s) ||
        (r.faculty || "").toLowerCase().includes(s)
      );
    }

    // Filtering logic
    if (onlyOptedIn) {
      // New behavior under "Only opted-in"
      if (optinFilter === "any") {
        // at least one opt-in
        arr = arr.filter(r => ALL_KEYS.some(k => r.consent[k]));
      } else if (optinFilter === "all") {
        // must have ALL four options true
        arr = arr.filter(r => ALL_KEYS.every(k => r.consent[k]));
      } else {
        // specific category key selected
        arr = arr.filter(r => !!r.consent[optinFilter]);
      }
      // while Only opted-in is on, ignore/disable the legacy category select
    } else {
      // Legacy category filter when the master toggle is off
      if (category !== "any") {
        arr = arr.filter(r => !!r.consent[category]);
      }
    }

    // Sort newest updates first
    arr.sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    return arr;
  }, [all, q, category, onlyOptedIn, optinFilter]);

  const copyEmails = async () => {
    const emails = rows.map(r => r.email).filter(Boolean);
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
    a.href = url; a.download = "student-consents.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      {/* widened container */}
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 space-y-4">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Student Alert Consents</h1>
            <span className="ml-auto text-sm text-slate-600">
              Total students: <b>{stats.total}</b> • Any opt-in: <b>{stats.any}</b>
            </span>
          </div>

          {/* Controls row — now with opt-in mode selector */}
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_auto_260px_auto]">
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search name, email, university…"
              className="border border-slate-200 rounded px-3 py-2 bg-white"
            />

            {/* Legacy category select (disabled when Only opted-in is active) */}
            <select
              value={category}
              onChange={e=>setCategory(e.target.value)}
              className="border border-slate-200 rounded px-2 py-2 bg-white disabled:opacity-50"
              title="Filter by category"
              disabled={onlyOptedIn}
            >
              <option value="any">Any category</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>

            {/* Master toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyOptedIn}
                onChange={e=>{
                  setOnlyOptedIn(e.target.checked);
                  // when turning on, default to "any"; when off, keep legacy select as-is
                  if (e.target.checked) setOptinFilter("any");
                }}
              />
              Only opted-in
            </label>

            {/* New: opt-in filter detail (Any/All/Specific) */}
            <select
              value={optinFilter}
              onChange={e=>setOptinFilter(e.target.value)}
              className="border border-slate-200 rounded px-2 py-2 bg-white disabled:opacity-50"
              title="Which opt-in to show"
              disabled={!onlyOptedIn}
            >
              <option value="any">Any (at least one)</option>
              <option value="all">All (all options)</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>

            <div className="flex gap-2">
              <button onClick={copyEmails} className="rounded border border-slate-200 px-3 py-2 bg-white hover:bg-slate-50 text-sm">
                Copy emails
              </button>
              <button onClick={exportCsv} className="rounded bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700">
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats pills */}
          <div className="mt-3 text-xs text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-2">
            {CATEGORIES.map(c => (
              <div key={c.key} className="rounded border border-slate-200 bg-white px-2 py-1">
                <span className="font-medium">{c.label}:</span> {stats.counts[c.key]}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-auto">
            {/* widen table for bigger container */}
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>University</Th>
                  <Th>Faculty</Th>
                  {CATEGORIES.map(c => <Th key={c.key} title={c.label}>{c.label}</Th>)}
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <Td>{r.name}</Td>
                    <Td className="text-blue-700 underline">
                      {r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : "—"}
                    </Td>
                    <Td>{r.university || "—"}</Td>
                    <Td>{r.faculty || "—"}</Td>
                    {CATEGORIES.map(c => (
                      <Td key={c.key} className="text-center">{r.consent[c.key] ? "✓" : "—"}</Td>
                    ))}
                    <Td>{fmtDate(r.updatedAt)}</Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6 + CATEGORIES.length} className="p-6 text-center text-slate-500">No matches.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Showing <b>{rows.length}</b> of <b>{stats.total}</b> students
            </div>
            <button onClick={()=>setTick(t=>t+1)} className="text-sm rounded border border-slate-200 px-3 py-1 bg-white hover:bg-slate-50">
              Refresh
            </button>
          </div>
        </Card>

        <div className="text-sm text-slate-600">
          Need to edit a single student? Open their profile in the Student Dashboard to change consent; this view is read-only.
        </div>
      </main>
    </div>
  );
}

/* ---------- light UI helpers (keeps this file drop-in) ---------- */
function Card({ className="", children }) {
  return (
    <div className={`w-full box-border rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
function Th({ children, title }) {
  return <th title={title} className="px-3 py-2 text-xs font-semibold text-slate-600">{children}</th>;
}
function Td({ children, className="" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}