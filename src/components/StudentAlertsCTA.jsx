// src/components/StudentAlertsCTA.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getMyConsents, putMyConsents } from "../lib/consentsApi.js";

/* ---------- tiny local helpers (no external deps) ---------- */
function safeParse(json) {
  try {
    return JSON.parse(json || "");
  } catch {
    return null;
  }
}

const STORAGE_KEY = "userConsentsById_v1";

// ✅ Canonical keys (match Admin + backend)
const CONSENT_SCOPES = [
  { key: "scholarshipAlerts", label: "Scholarship Alerts" },
  { key: "applicationTips", label: "University Application Tips" },
  { key: "programRecommendations", label: "Program Recommendations" },
  { key: "applicationInvitation", label: "University Application Invitations" },
];

function loadAllConsents() {
  return safeParse(localStorage.getItem(STORAGE_KEY)) || {};
}

function getUserConsents(userId) {
  const all = loadAllConsents();
  const u = all[userId] || {};

  // Backward compatibility: plural -> singular
  if (u.applicationInvitations && !u.applicationInvitation) {
    u.applicationInvitation = u.applicationInvitations;
  }

  return u;
}

function setConsentLocal(userId, key, granted) {
  const all = loadAllConsents();
  const u = all[userId] || {};
  u[key] = { granted: !!granted, updatedAt: new Date().toISOString() };
  all[userId] = u;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("consents:updated"));
}

function setAllLocal(userId, nextObj) {
  const all = loadAllConsents();
  all[userId] = { ...(all[userId] || {}), ...(nextObj || {}) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("consents:updated"));
}

function toBooleans(localConsents) {
  const booleans = {};
  CONSENT_SCOPES.forEach((s) => {
    booleans[s.key] = !!localConsents?.[s.key]?.granted;
  });
  return booleans;
}

/* ---------- normalize server item -> local shape ---------- */
function serverItemToLocal(item) {
  if (!item) return null;

  const src = item?.consents || item?.consent || item?.choices || item || {};
  const next = {};

  CONSENT_SCOPES.forEach((s) => {
    const v = src?.[s.key];
    if (typeof v === "boolean") {
      next[s.key] = { granted: v, updatedAt: item?.updatedAt || new Date().toISOString() };
    } else if (v && typeof v === "object" && "granted" in v) {
      next[s.key] = {
        granted: !!v.granted,
        updatedAt: v.updatedAt || item?.updatedAt || "",
      };
    }
  });

  return next;
}

/* ---------- main CTA + modal ---------- */
export default function StudentAlertsCTA({ className = "" }) {
  const currentUser = useMemo(() => {
    return (
      safeParse(sessionStorage.getItem("currentUser")) ||
      safeParse(localStorage.getItem("currentUser")) ||
      {}
    );
  }, []);

  const userId = currentUser?.id;
  const isStudent = (currentUser?.role || "student").toLowerCase() === "student";

  const [open, setOpen] = useState(false);

  // Start from local cache so UI is instant
  const [consents, setConsents] = useState(() => (userId ? getUserConsents(userId) : {}));
  const [saving, setSaving] = useState(false);
  const [serverStatus, setServerStatus] = useState("");
  const [hydrated, setHydrated] = useState(false); // did we load from Dynamo yet?

  // Debounce server writes
  const saveTimer = useRef(null);
  const latestRef = useRef({ consents: null });

  // Keep in sync with local updates (if other parts update localStorage)
  useEffect(() => {
    const onUpdate = () => {
      if (!userId) return;
      setConsents(getUserConsents(userId));
    };
    window.addEventListener("consents:updated", onUpdate);
    return () => window.removeEventListener("consents:updated", onUpdate);
  }, [userId]);

  // ✅ IMPORTANT: hydrate from DynamoDB on mount (so purple card matches across browsers/devices)
  useEffect(() => {
    let alive = true;

    async function hydrateFromServer() {
      if (!userId || !isStudent) return;

      try {
        setServerStatus("Loading from server…");
        const data = await getMyConsents(userId); // your helper hits GET /api/consents?userId=...
        const item = data?.item || data?.consent || data || null;

        const nextLocal = serverItemToLocal(item);
        if (!nextLocal) {
          if (alive) {
            setHydrated(true);
            setServerStatus("");
          }
          return;
        }

        // Server wins: store into local cache + state
        setAllLocal(userId, nextLocal);

        if (alive) {
          setConsents({ ...getUserConsents(userId), ...nextLocal });
          setHydrated(true);
          setServerStatus("");
        }
      } catch (e) {
        if (alive) {
          // Don’t block UI; we’ll still show local cache
          setHydrated(true);
          setServerStatus("");
        }
      }
    }

    hydrateFromServer();
    return () => {
      alive = false;
    };
  }, [userId, isStudent]);

  // Also refresh from server when popup opens (so user sees freshest)
  useEffect(() => {
    let alive = true;

    async function refreshOnOpen() {
      if (!open || !userId || !isStudent) return;

      try {
        setServerStatus("Loading from server…");
        const data = await getMyConsents(userId);
        const item = data?.item || data?.consent || data || null;

        const nextLocal = serverItemToLocal(item);
        if (!nextLocal) {
          if (alive) setServerStatus("");
          return;
        }

        setAllLocal(userId, nextLocal);

        if (alive) {
          setConsents({ ...getUserConsents(userId), ...nextLocal });
          setServerStatus("");
        }
      } catch {
        if (alive) setServerStatus("");
      }
    }

    refreshOnOpen();
    return () => {
      alive = false;
    };
  }, [open, userId, isStudent]);

  if (!userId || !isStudent) return null;

  const grantedCount = CONSENT_SCOPES.reduce((n, s) => n + (consents[s.key]?.granted ? 1 : 0), 0);

  // ✅ Always save to Dynamo on any change (debounced)
  const scheduleServerSave = (nextConsents) => {
    if (!userId) return;
    latestRef.current = { consents: nextConsents };

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const snapshot = latestRef.current;
      try {
        setSaving(true);
        setServerStatus("Saving to server…");

        await putMyConsents({
          userId,
          // Helpful fields for admin list (safe if backend ignores)
          profile: {
            email: currentUser?.email || currentUser?.username || "",
            name: currentUser?.name || "",
            university: currentUser?.university || "",
            faculty: currentUser?.faculty || "",
          },
          visibleAcrossDevices: true, // always true now
          consents: toBooleans(snapshot.consents),
          consent: toBooleans(snapshot.consents), // legacy alias
          updatedAt: new Date().toISOString(),
        });

        setServerStatus("Saved.");
        setTimeout(() => setServerStatus(""), 900);
      } catch (e) {
        setServerStatus("Save failed (still saved on this device).");
      } finally {
        setSaving(false);
      }
    }, 350);
  };

  const toggle = (key, next) => {
    setConsentLocal(userId, key, next);

    const nextConsents = {
      ...consents,
      [key]: { granted: !!next, updatedAt: new Date().toISOString() },
    };
    setConsents(nextConsents);

    scheduleServerSave(nextConsents);
  };

  const selectAll = () => {
    const next = {};
    CONSENT_SCOPES.forEach((s) => {
      next[s.key] = { granted: true, updatedAt: new Date().toISOString() };
    });
    setAllLocal(userId, next);
    setConsents(next);
    scheduleServerSave(next);
  };

  const clearAll = () => {
    const next = {};
    CONSENT_SCOPES.forEach((s) => {
      next[s.key] = { granted: false, updatedAt: new Date().toISOString() };
    });
    setAllLocal(userId, next);
    setConsents(next);
    scheduleServerSave(next);
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
            <div className="mt-2 text-xs opacity-90">
              {!hydrated
                ? "Loading…"
                : grantedCount > 0
                ? `${grantedCount}/${CONSENT_SCOPES.length} selected`
                : "No alerts selected"}
              {" • Saved to account"}
            </div>
          </div>
        </div>
      </button>

      {/* POP-UP */}
      {open && (
        <div
          className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
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
              >
                ✕
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-200">
              {CONSENT_SCOPES.map((scope) => {
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
                      <div className="text-xs text-slate-500">{granted ? "Subscribed" : "Not subscribed"}</div>
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

            {(saving || serverStatus) && (
              <div className="mt-2 text-xs text-slate-500">
                {saving ? "Saving…" : serverStatus}
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              We’ll only email what you select. See our{" "}
              <a href="/privacy" className="underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      )}
    </>
  );
}