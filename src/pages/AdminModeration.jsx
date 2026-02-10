// src/pages/AdminModeration.jsx
import { useEffect, useMemo, useState } from "react";
import useNoIndex from "../lib/useNoIndex";

/**
 * Admin Moderation UI (queue + filters + cursor + detail + actions)
 * - NO admin email input (email is resolved from env/adminAuth/querystring)
 * - Uses ModerationHandler:
 *    GET  /api/moderation/queue?status=open&limit=30&cursor=...&scope=...&adminEmail=...
 *    GET  /api/moderation/item?itemId=...&adminEmail=...
 *    POST /api/moderation/action  { adminEmail, action, itemId, itemType, postId, scope, adminNote, sk? }
 *
 * NOTE: Your Lambda currently requires allowlisted email (ADMIN_EMAILS).
 * Best cross-device/browser: set VITE_ADMIN_EMAIL in Amplify env vars.
 */

const RAW_BASE =
  (import.meta.env.VITE_MODERATION_API_BASE &&
    String(import.meta.env.VITE_MODERATION_API_BASE).trim()) ||
  ""; // empty => same-origin

const BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

function buildUrl(path) {
  const p = String(path || "");
  if (!BASE) return p.startsWith("/") ? p : `/${p}`;
  return `${BASE}${p.startsWith("/") ? p : `/${p}`}`;
}

async function readJson(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function resolveAdminEmail() {
  // 1) build-time env (recommended)
  const fromEnv = (import.meta.env.VITE_ADMIN_EMAIL &&
    String(import.meta.env.VITE_ADMIN_EMAIL).trim().toLowerCase()) || "";
  if (fromEnv) return fromEnv;

  // 2) localStorage adminAuth fallback (if you store email there)
  try {
    const raw = localStorage.getItem("adminAuth");
    if (raw) {
      const obj = JSON.parse(raw);
      const em = String(obj?.email || obj?.adminEmail || "").trim().toLowerCase();
      if (em) return em;
    }
  } catch {
    // ignore
  }

  // 3) URL param fallback (emergency)
  try {
    const qs = new URLSearchParams(window.location.search);
    const em = String(qs.get("adminEmail") || "").trim().toLowerCase();
    if (em) return em;
  } catch {
    // ignore
  }

  return "";
}

function fmtTime(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "";
  try {
    return new Date(n).toLocaleString();
  } catch {
    return String(ts);
  }
}

function short(s, n = 60) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export default function AdminModeration() {
  useNoIndex();
  const [status, setStatus] = useState("open"); // open|closed
  const [scope, setScope] = useState("all"); // all | student-marketplace | uni-academic-platform | global-academic-platform | ...
  const [pageSize, setPageSize] = useState(30);

  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([]); // for Back

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [reports, setReports] = useState([]);

  const [selected, setSelected] = useState(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemErr, setItemErr] = useState("");
  const [itemReports, setItemReports] = useState([]); // all reports for this itemId

  const [actionBusy, setActionBusy] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  const adminEmail = useMemo(() => resolveAdminEmail(), []);

  const canBack = cursorStack.length > 0;

  async function loadQueue({ reset = false, nextCursor = null } = {}) {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("status", status);
      qs.set("limit", String(pageSize));
      if (nextCursor) qs.set("cursor", String(nextCursor));
      if (scope && scope !== "all") qs.set("scope", scope);

      // still required by Lambda (not shown in UI)
      if (adminEmail) qs.set("adminEmail", adminEmail);

      const url = buildUrl(`/api/moderation/queue?${qs.toString()}`);
      const data = await readJson(
        await fetch(url, { method: "GET", credentials: "include" })
      );

      /*const rows = Array.isArray(data?.reports) ? data.reports : [];
      setReports(rows);*/
      const rowsRaw = Array.isArray(data?.reports) ? data.reports : [];

// ✅ UI fallback: enforce scope filter even if backend returns mixed scopes
const rows =
  scope && scope !== "all"
    ? rowsRaw.filter(
        (r) => String(r?.scope || "").trim().toLowerCase() === String(scope).trim().toLowerCase()
      )
    : rowsRaw;

setReports(rows);

      if (reset) {
        setCursor(data?.cursor || null);
        setCursorStack([]);
      } else {
        setCursor(data?.cursor || null);
      }

      // keep selection if still present
      if (selected?.itemId) {
        const still = rows.find((r) => String(r?.itemId) === String(selected.itemId));
        if (!still) {
          setSelected(null);
          setItemReports([]);
        }
      }
    } catch (e) {
      setErr(e?.message || "Failed to load moderation queue.");
      setReports([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadItem(itemId) {
    const id = String(itemId || "").trim();
    if (!id) return;

    setItemLoading(true);
    setItemErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("itemId", id);
      if (adminEmail) qs.set("adminEmail", adminEmail);

      const url = buildUrl(`/api/moderation/item?${qs.toString()}`);
      const data = await readJson(
        await fetch(url, { method: "GET", credentials: "include" })
      );

      setItemReports(Array.isArray(data?.reports) ? data.reports : []);
    } catch (e) {
      setItemErr(e?.message || "Failed to load item reports.");
      setItemReports([]);
    } finally {
      setItemLoading(false);
    }
  }

  async function runAction(action) {
    if (!selected?.itemId) return;
    if (!adminEmail) {
      alert(
        "Admin is not configured. Set VITE_ADMIN_EMAIL (recommended) or store email in adminAuth."
      );
      return;
    }

    setActionBusy(true);
    setItemErr("");
    try {
      // For marketplace moderation, your ModerationHandler should branch by scope.
      // For posts/comments/replies, it uses itemType/postId/sk.
      const body = {
        adminEmail,
        action, // publish | hide | remove | queue | dismissReports
        itemId: String(selected.itemId || "").trim(),
        itemType: String(selected.itemType || "post").trim(),
        postId: String(selected.postId || selected.itemId || "").trim(),
        scope: String(selected.scope || scope || "").trim(),
        adminNote: String(adminNote || "").trim(),
        // sk is required for comment/reply moderation in POSTS_TABLE branch
        sk: selected.sk || undefined,
      };

      const url = buildUrl("/api/moderation/action");
      await readJson(
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        })
      );

      // Refresh item + queue
      await loadItem(selected.itemId);
      await loadQueue({ reset: false, nextCursor: null });
      alert("Action applied.");
    } catch (e) {
      console.error("[AdminModeration] action failed:", e);
      alert(e?.message || "Action failed.");
    } finally {
      setActionBusy(false);
    }
  }

  function onSelectReport(r) {
    const row = r || {};
    setSelected(row);
    setAdminNote("");
    loadItem(row.itemId);
  }

  function onNext() {
    if (!cursor) return;
    setCursorStack((s) => [...s, cursorStack.length ? cursorStack[cursorStack.length - 1] : null].filter(Boolean));
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
    setSelected(null);
    setItemReports([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scope, pageSize]);

  useEffect(() => {
    loadQueue({ reset: true, nextCursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scope, pageSize]);

  const nextEnabled = !!cursor && !loading;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moderation</h1>
          <p className="text-slate-600 mt-1">
            Review reports and apply actions (publish, hide, remove, queue, dismiss reports).
          </p>
        </div>

        <button
          onClick={() => loadQueue({ reset: true, nextCursor: null })}
          className="rounded-full bg-slate-900 text-white px-5 py-2.5 font-semibold hover:opacity-90"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Scope</div>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="all">All</option>
              <option value="student-marketplace">Student Marketplace</option>
              <option value="uni-academic-platform">University Academic Platform</option>
              <option value="global-academic-platform">Global Academic Platform</option>
              <option value="student-dashboard">Student Dashboard</option>
              <option value="lecturer-dashboard">Lecturer Dashboard</option>
            </select>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Page size</div>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>
        </div>

        {!adminEmail ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Admin is not configured. Set <b>VITE_ADMIN_EMAIL</b> (recommended) or ensure
            <b> localStorage.adminAuth</b> contains an email. Otherwise Lambda returns “Forbidden”.
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {/* Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Queue</div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm disabled:opacity-50"
                onClick={() => {
                  if (!canBack) return;
                  const prev = cursorStack[cursorStack.length - 1] || null;
                  setCursorStack((s) => s.slice(0, -1));
                  loadQueue({ reset: false, nextCursor: prev });
                }}
                disabled={!canBack || loading}
              >
                Back
              </button>
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm disabled:opacity-50"
                onClick={() => {
                  if (!cursor) return;
                  setCursorStack((s) => [...s, cursorStack.length ? cursorStack[cursorStack.length - 1] : null].filter(Boolean));
                  loadQueue({ reset: false, nextCursor: cursor });
                }}
                disabled={!nextEnabled}
              >
                Next
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : reports.length === 0 ? (
              <div className="text-sm text-slate-600">No reports found.</div>
            ) : (
              reports.map((r) => {
                const active = String(selected?.sk) === String(r?.sk);
                return (
                  <button
                    key={`${r?.pk || ""}|${r?.sk || ""}`}
                    onClick={() => onSelectReport(r)}
                    className={[
                      "w-full text-left rounded-xl border px-4 py-3",
                      active ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {short(r?.reason || "report", 40)}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          • {fmtTime(r?.createdAt)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {String(r?.status || "").toLowerCase()}
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">Scope:</span>{" "}
                      {String(r?.scope || "-")}
                      {"  "}•{"  "}
                      <span className="font-semibold">Type:</span>{" "}
                      {String(r?.itemType || "-")}
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">ItemId:</span>{" "}
                      {short(r?.itemId, 60)}
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">Reported by:</span>{" "}
                      {String(r?.reportedByEmail || "-")}
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">Details:</span>{" "}
                      {short(r?.details, 90) || "-"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail + Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-lg font-semibold">Detail + Action</div>

          {!selected ? (
            <div className="mt-3 text-sm text-slate-600">Select a report from the queue.</div>
          ) : (
            <>
              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Item</div>
                    <div className="font-semibold text-slate-900">{selected.itemId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Scope</div>
                    <div className="font-semibold text-slate-900">{selected.scope || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Type</div>
                    <div className="font-semibold text-slate-900">{selected.itemType || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">PostId</div>
                    <div className="font-semibold text-slate-900">{selected.postId || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Reported by</div>
                    <div className="font-semibold text-slate-900">
                      {selected.reportedByEmail || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Reason</div>
                    <div className="font-semibold text-slate-900">{selected.reason || "-"}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm">
                  <div className="text-xs text-slate-500">Details</div>
                  <div className="text-slate-900">{selected.details || "-"}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold text-slate-900">Admin note (optional)</div>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
                  rows={3}
                  placeholder="Why you are taking this action…"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => runAction("publish")}
                  disabled={actionBusy}
                  className="rounded-full bg-emerald-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  onClick={() => runAction("hide")}
                  disabled={actionBusy}
                  className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Hide
                </button>
                <button
                  onClick={() => runAction("remove")}
                  disabled={actionBusy}
                  className="rounded-full bg-red-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Remove
                </button>
                <button
                  onClick={() => runAction("queue")}
                  disabled={actionBusy}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Queue
                </button>
                <button
                  onClick={() => runAction("dismissReports")}
                  disabled={actionBusy}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Dismiss reports
                </button>
              </div>

              {itemErr ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {itemErr}
                </div>
              ) : null}

              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">All reports for this item</div>
                {itemLoading ? (
                  <div className="mt-2 text-sm text-slate-600">Loading…</div>
                ) : itemReports.length === 0 ? (
                  <div className="mt-2 text-sm text-slate-600">No item reports found.</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {itemReports.map((r) => (
                      <div key={`${r?.pk || ""}|${r?.sk || ""}`} className="rounded-lg border border-slate-200 p-3">
                        <div className="text-xs text-slate-600">
                          {fmtTime(r?.createdAt)} • {String(r?.reportedByEmail || "-")}
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {String(r?.reason || "-")}
                        </div>
                        <div className="text-sm text-slate-700">{r?.details || "-"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}