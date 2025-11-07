// src/pages/ScholarshipDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Footer from "../components/Footer";

// API only if explicitly provided via env; otherwise stay offline
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/+$/, "");

/* Render server-provided HTML (or partner HTML).
   If you later accept untrusted HTML, sanitize it first. */
function RichHtml({ html }) {
  if (!html) return null;
  return (
    <div
      className="rich-html prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ---- Local fallback helpers ---- */
const LOCAL_KEYS = ["partnerScholarships", "scholarships", "postedScholarships"];
const CATALOG_CACHE_KEY = "scholarship_catalog_cache"; // optional list cache

function tryJson(getter) {
  try { return getter(); } catch { return null; }
}

// Some entries may be wrapped like { data: {...} }
function unwrap(item) {
  return item && item.data && typeof item.data === "object" ? item.data : item;
}

// Collect all plausible identifiers for one item
function candidateIds(item, storeKey, index) {
  const x = unwrap(item) || {};
  const ids = [
    x.id,
    x.scholarshipId,
    x.localId,
    x.clientId,
    x._id,
    x.key,
    x.uid,
    x.sid,
  ]
    .filter(Boolean)
    .map((v) => v.toString());
  // Deterministic fallback id so list/detail can agree without a real id
  ids.push(`local_${storeKey}_${index}`);
  return ids;
}

// (Optional) scan a small number of localStorage arrays (serverless convenience)
function scanAllLocalForId(want) {
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i) || "";
    // Skip obvious non-arrays / noisy keys
    if (!/scholar|post|list|cache|store/i.test(k)) continue;
    const arr = tryJson(() => JSON.parse(localStorage.getItem(k) || "null"));
    if (!Array.isArray(arr)) continue;
    for (let j = 0; j < arr.length; j += 1) {
      const ids = candidateIds(arr[j], k, j);
      if (ids.includes(want)) return unwrap(arr[j]) || arr[j];
    }
  }
  return null;
}

function loadLocalByIdOrIndex(idStr) {
  const want = idStr.toString();

  // 0) Try the catalog cache (the list page can write exactly what it rendered)
  const cacheMap = tryJson(() =>
    JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "{}")
  ) || {};
  if (cacheMap && cacheMap[want]) {
    const cand = unwrap(cacheMap[want]) || cacheMap[want];
    return cand;
  }
  // Also try any value in the cache map that matches by alternate id fields
  for (const v of Object.values(cacheMap)) {
    const cand = unwrap(v) || v;
    const ids = candidateIds(cand, "cache", -1);
    if (ids.includes(want)) return cand;
  }

  // 1) Exact match against known id fields OR deterministic fallback id
  for (const k of LOCAL_KEYS) {
    const arr = tryJson(() => JSON.parse(localStorage.getItem(k) || "[]")) || [];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i += 1) {
      const ids = candidateIds(arr[i], k, i);
      if (ids.includes(want)) return unwrap(arr[i]) || arr[i];
    }
  }

  // 2) If numeric-like, allow index fallback (legacy convenience)
  if (/^\d+$/.test(want)) {
    const idx = Number(want);
    for (const k of LOCAL_KEYS) {
      const arr = tryJson(() => JSON.parse(localStorage.getItem(k) || "[]"));
      if (Array.isArray(arr) && arr[idx]) return unwrap(arr[idx]) || arr[idx];
    }
  }

  // 3) Last resort: lightly scan other local arrays (keeps existing logic intact)
  const probed = scanAllLocalForId(want);
  if (probed) return probed;

  return null;
}

export default function ScholarshipDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");
      setItem(null);

      const useApi = Boolean(API_BASE); // only if explicitly configured

      if (useApi) {
        try {
          const res = await fetch(`${API_BASE}/api/scholarships/${id}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!alive) return;
          setItem(data);
          return;
        } catch {
          // fall through to local
        }
      }

      // Local-only or API failed: search in local stores
      const local = loadLocalByIdOrIndex(id);
      if (alive) {
        if (local) setItem(local);
        else setErr("Not found (local).");
      }
    })();

    return () => { alive = false; };
  }, [id]);

  if (err) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-red-600">{err}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-slate-600">
        Loading…
      </div>
    );
  }

  const {
    title,
    provider,
    country,
    level,
    field,
    fundingType,
    deadline,
    link,
    partnerApplyUrl,
    amount,
    description,
    eligibility,
    benefits,
    howToApply,
    imageUrl,
    imageData,
  } = item;

  const bannerSrc = imageUrl || imageData || "";

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <style>{`
        .rich-html ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0 0.75rem; }
        .rich-html ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5rem 0 0.75rem; }
        .rich-html li { display: list-item; margin: 0.25rem 0; }
        .rich-html p { margin: 0.5rem 0; }
        .rich-html a { text-decoration: underline; }
      `}</style>

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-8">
          <Link to="/scholarship" className="text-blue-600 hover:underline text-sm">
            ← Back to Scholarships
          </Link>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-slate-600">
              <span className="font-medium">{provider}</span>
              {country ? ` • ${country}` : ""}
              {level ? ` • ${level}` : ""}
              {field ? ` • ${field}` : ""}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {Array.isArray(fundingType) && fundingType.length > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span className="text-slate-500">Funding:</span>
                  <span className="inline-flex flex-wrap gap-1">
                    {fundingType.map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5"
                      >
                        {f}
                      </span>
                    ))}
                  </span>
                </span>
              )}
              {amount && (
                <span className="inline-flex items-center gap-2">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-medium">{amount}</span>
                </span>
              )}
              {deadline && (
                <span className="inline-flex items-center gap-2">
                  <span className="text-slate-500">Deadline:</span>
                  <span className="font-medium">{deadline}</span>
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              {partnerApplyUrl && (
                <a
                  href={partnerApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Apply Now
                </a>
              )}
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Provider Page
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {description && (
                <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold">Scholarship Description</h2>
                  <div className="mt-3">
                    <RichHtml html={description} />
                  </div>
                </section>
              )}

              {eligibility && (
                <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold">Eligibility</h2>
                  <div className="mt-3">
                    <RichHtml html={eligibility} />
                  </div>
                </section>
              )}

              {benefits && (
                <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold">Benefits</h2>
                  <div className="mt-3">
                    <RichHtml html={benefits} />
                  </div>
                </section>
              )}

              {false && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-slate-500">
                  <div className="mx-auto max-w-full" style={{ minHeight: "120px" }}>
                    Ad Space (95px tall)
                  </div>
                </div>
              )}

              {howToApply && (
                <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold">How to Apply</h2>
                  <div className="mt-3">
                    <RichHtml html={howToApply} />
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              {bannerSrc && (
                <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                  <img
                    src={bannerSrc}
                    alt={`${provider || title} banner`}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700">At a glance</h3>
                <dl className="mt-3 text-sm text-slate-700">
                  <dt className="font-medium">Provider</dt>
                  <dd className="mb-3">{provider || "-"}</dd>

                  <dt className="font-medium">Country</dt>
                  <dd className="mb-3">{country || "-"}</dd>

                  <dt className="font-medium">Level</dt>
                  <dd className="mb-3">{level || "-"}</dd>

                  <dt className="font-medium">Field</dt>
                  <dd className="mb-3">{field || "-"}</dd>

                  <dt className="font-medium">Deadline</dt>
                  <dd className="mb-3">{deadline || "-"}</dd>

                  {amount && (
                    <>
                      <dt className="font-medium">Max Amount</dt>
                      <dd className="mb-3">{amount}</dd>
                    </>
                  )}
                </dl>
                {partnerApplyUrl && (
                  <a
                    href={partnerApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                  >
                    Apply Now
                  </a>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}