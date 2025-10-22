// src/components/StudentAlertsCTA.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ---------- tiny local helpers (no external deps) ---------- */
function safeParse(json) { try { return JSON.parse(json || ""); } catch { return null; } }
const STORAGE_KEY = "userConsentsById_v1";
const CONSENT_SCOPES = [
  { key: "scholarshipAlerts",        label: "Scholarship Alerts" },
  { key: "applicationTips",          label: "University Application Tips" },
  { key: "programRecommendations",   label: "Program Recommendations" },
  { key: "applicationInvitations",   label: "University Application Invitations" },
];

function loadAllConsents() {
  return safeParse(localStorage.getItem(STORAGE_KEY)) || {};
}
function getUserConsents(userId) {
  const all = loadAllConsents();
  return all[userId] || {};
}
function setConsent(userId, key, granted) {
  const all = loadAllConsents();
  const u = all[userId] || {};
  u[key] = { granted: !!granted, updatedAt: new Date().toISOString() };
  all[userId] = u;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("consents:updated"));
}

/* ---------- main CTA + modal ---------- */
export default function StudentAlertsCTA({ className = "" }) {
  // resolve current user (student)
  const currentUser = useMemo(() => {
    return safeParse(sessionStorage.getItem("currentUser")) ||
           safeParse(localStorage.getItem("currentUser")) || {};
  }, []);
  const userId = currentUser?.id;
  const isStudent = (currentUser?.role || "student").toLowerCase() === "student";

  const [open, setOpen] = useState(false);
  const [consents, setConsents] = useState(() => (userId ? getUserConsents(userId) : {}));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onUpdate = () => setConsents(getUserConsents(userId));
    window.addEventListener("consents:updated", onUpdate);
    return () => window.removeEventListener("consents:updated", onUpdate);
  }, [userId]);

  if (!userId || !isStudent) return null;

  const grantedCount = CONSENT_SCOPES.reduce(
    (n, s) => n + (consents[s.key]?.granted ? 1 : 0), 0
  );

  const toggle = (key, next) => {
    setConsent(userId, key, next);
    setConsents(prev => ({ 
      ...prev, 
      [key]: { granted: !!next, updatedAt: new Date().toISOString() } 
    }));
  };

  const selectAll = () => {
    setSaving(true);
    try {
      CONSENT_SCOPES.forEach(s => setConsent(userId, s.key, true));
      setConsents(Object.fromEntries(
        CONSENT_SCOPES.map(s => [s.key, { granted: true, updatedAt: new Date().toISOString() }])
      ));
    } finally { setSaving(false); }
  };
  const clearAll = () => {
    setSaving(true);
    try {
      CONSENT_SCOPES.forEach(s => setConsent(userId, s.key, false));
      setConsents(Object.fromEntries(
        CONSENT_SCOPES.map(s => [s.key, { granted: false, updatedAt: new Date().toISOString() }])
      ));
    } finally { setSaving(false); }
  };

  return (
    <>
      {/* PURPLE CTA CARD */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-2xl px-4 py-4 text-left shadow-sm border border-slate-200
                    bg-[rgb(102,0,102)] hover:brightness-110 text-white ${className}`}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none mt-0.5">🔔</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Click here for alerts</div>
            {/*<div className="text-sm opacity-90 mt-0.5">
              Choose which emails you want: scholarships, tips, program picks & invitations.
            </div>*/}
            <div className="mt-2 text-xs opacity-90">
              {grantedCount > 0 ? `${grantedCount}/${CONSENT_SCOPES.length} selected` : "No alerts selected"}
            </div>
          </div>
        </div>
      </button>

      {/* POP-UP (small page) */}
      {open && (
        <div
          className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4"
          role="dialog" aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-[92%] max-w-md rounded-2xl bg-white border border-slate-200 shadow-lg p-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="text-xl mt-0.5">📬</div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Email Alerts</div>
                <p className="text-sm text-slate-600">
                  Tick what you want to receive. You can uncheck anytime to opt out.
                </p>
              </div>
              <button
                className="ml-2 text-slate-500 hover:text-slate-900"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >✕</button>
            </div>

            <div className="mt-3 divide-y divide-slate-200">
              {CONSENT_SCOPES.map(scope => {
                const granted = !!consents[scope.key]?.granted;
                return (
                  <label key={scope.key} className="flex items-start gap-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={granted}
                      onChange={(e) => toggle(scope.key, e.target.checked)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{scope.label}</div>
                      <div className="text-xs text-slate-500">
                        {granted ? "Subscribed" : "Not subscribed"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Clear all
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto rounded bg-[rgb(102,0,102)] text-white px-4 py-1.5 text-sm hover:brightness-110"
              >
                Done
              </button>
            </div>

            {saving && <div className="mt-2 text-xs text-slate-500">Saving…</div>}

            <p className="mt-3 text-xs text-slate-500">
              We’ll only email what you select. See our{" "}
              <a href="/privacy" className="underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}