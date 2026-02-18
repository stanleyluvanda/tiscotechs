// src/pages/FundedGraduateAdmissionDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { shouldSendTrackOnce } from "../lib/trackGate";
import Footer from "../components/Footer";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";

// ✅ Same API base as scholarships (same Lambda)
const API_BASE = (
  import.meta.env.VITE_SCHOLARSHIPS_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/+$/, "");

/* Render server-provided HTML */
function RichHtml({ html }) {
  if (!html) return null;
  return (
    <div
      className="rich-html prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ---- Local fallback helpers (copied, unchanged semantics) ---- */
const LOCAL_KEYS = ["partnerScholarships", "scholarships", "postedScholarships"];
const CATALOG_CACHE_KEY = "scholarship_catalog_cache"; // unchanged key (safe)

function tryJson(getter) {
  try {
    return getter();
  } catch {
    return null;
  }
}

function unwrap(item) {
  return item && item.data && typeof item.data === "object" ? item.data : item;
}

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
  ids.push(`local_${storeKey}_${index}`);
  return ids;
}

function scanAllLocalForId(want) {
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i) || "";
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

  const cacheMap =
    tryJson(() => JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "{}")) ||
    {};
  if (cacheMap && cacheMap[want]) {
    const cand = unwrap(cacheMap[want]) || cacheMap[want];
    return cand;
  }
  for (const v of Object.values(cacheMap)) {
    const cand = unwrap(v) || v;
    const ids = candidateIds(cand, "cache", -1);
    if (ids.includes(want)) return cand;
  }

  for (const k of LOCAL_KEYS) {
    const arr = tryJson(() => JSON.parse(localStorage.getItem(k) || "[]")) || [];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i += 1) {
      const ids = candidateIds(arr[i], k, i);
      if (ids.includes(want)) return unwrap(arr[i]) || arr[i];
    }
  }

  if (/^\d+$/.test(want)) {
    const idx = Number(want);
    for (const k of LOCAL_KEYS) {
      const arr = tryJson(() => JSON.parse(localStorage.getItem(k) || "[]"));
      if (Array.isArray(arr) && arr[idx]) return unwrap(arr[idx]) || arr[idx];
    }
  }

  const probed = scanAllLocalForId(want);
  if (probed) return probed;

  return null;
}

/* =========================
   Recommendations helpers (copied, with a funded-content filter)
   ========================= */
const HABIT_KEY = "funded_grad_browse_habit_v1"; // separate habit key (isolated)

function normStr(x) {
  return String(x || "").toLowerCase().trim();
}

function tokenize(text) {
  return normStr(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length >= 3);
}

function safeParseArr(key, fallback = []) {
  const v = tryJson(() => JSON.parse(localStorage.getItem(key) || "null"));
  return Array.isArray(v) ? v : fallback;
}

function getAnyId(x) {
  return String(
    x?.id ??
      x?.scholarshipId ??
      x?.localId ??
      x?.clientId ??
      x?._id ??
      x?.key ??
      ""
  );
}

function trackViewHabit(item) {
  if (!item) return;
  const sid = getAnyId(item).trim();
  if (!sid) return;

  const event = {
    id: sid,
    ts: Date.now(),
    country: item.country || "",
    level: item.level || "",
    field: item.field || "",
    fundingType: Array.isArray(item.fundingType) ? item.fundingType : [],
    tokens: [...tokenize(item.title), ...tokenize(item.provider)],
  };

  const arr = safeParseArr(HABIT_KEY, []);
  const filtered = arr.filter((x) => String(x?.id) !== sid);
  filtered.unshift(event);
  localStorage.setItem(HABIT_KEY, JSON.stringify(filtered.slice(0, 100)));
}

function buildTasteProfile() {
  const events = safeParseArr(HABIT_KEY, []);
  const recent = events.slice(0, 30);

  const counts = {
    country: new Map(),
    level: new Map(),
    field: new Map(),
    funding: new Map(),
    tokens: new Map(),
    hasHistory: recent.length >= 3,
  };

  function bump(map, key, w = 1) {
    if (!key) return;
    const k = String(key);
    map.set(k, (map.get(k) || 0) + w);
  }

  recent.forEach((e, idx) => {
    const weight = Math.max(1, 6 - Math.floor(idx / 6));
    bump(counts.country, e.country, weight);
    bump(counts.level, e.level, weight);
    bump(counts.field, e.field, weight);
    (e.fundingType || []).forEach((f) => bump(counts.funding, f, weight));
    (e.tokens || []).forEach((t) => bump(counts.tokens, t, 1));
  });

  return counts;
}

function topKeys(map, n = 2) {
  if (!map || !(map instanceof Map)) return [];
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
    .filter(Boolean);
}

function overlapCount(setA, setB) {
  let c = 0;
  setA.forEach((x) => {
    if (setB.has(x)) c += 1;
  });
  return c;
}

function scoreAndGate(candidate, current, taste) {
  if (!candidate) return { ok: false, score: -Infinity };

  const cid = getAnyId(candidate);
  const curId = getAnyId(current);
  if (cid && curId && cid === curId) return { ok: false, score: -Infinity };

  const candTokens = new Set([
    ...tokenize(candidate.title),
    ...tokenize(candidate.provider),
  ]);
  const curTokens = new Set([
    ...tokenize(current?.title),
    ...tokenize(current?.provider),
  ]);
  const tokenOverlapWithCurrent = overlapCount(candTokens, curTokens);

  const tasteTopFields = topKeys(taste?.field, 2);
  const tasteTopTokens = new Set(topKeys(taste?.tokens, 8));
  const tokenOverlapWithTaste = overlapCount(candTokens, tasteTopTokens);

  const sameFieldAsCurrent =
    candidate.field && current?.field && candidate.field === current.field;

  const sameFieldAsTaste =
    candidate.field && tasteTopFields.includes(String(candidate.field));

  const hasStrongSignal =
    sameFieldAsCurrent ||
    sameFieldAsTaste ||
    tokenOverlapWithCurrent >= 2 ||
    tokenOverlapWithTaste >= 2;

  if (!hasStrongSignal) return { ok: false, score: -Infinity };

  let score = 0;

  if (sameFieldAsCurrent) score += 12;
  if (candidate.level && current?.level && candidate.level === current.level)
    score += 6;
  if (candidate.country && current?.country && candidate.country === current.country)
    score += 4;

  const candFunding = new Set(
    Array.isArray(candidate.fundingType) ? candidate.fundingType : []
  );
  (Array.isArray(current?.fundingType) ? current.fundingType : []).forEach((f) => {
    if (candFunding.has(f)) score += 2;
  });

  score += Math.min(8, tokenOverlapWithCurrent * 2);
  score += Math.min(6, tokenOverlapWithTaste);

  if (taste?.hasHistory) {
    if (taste?.field?.has(candidate.field))
      score += Math.min(6, taste.field.get(candidate.field));
    if (taste?.level?.has(candidate.level))
      score += Math.min(4, taste.level.get(candidate.level));
    if (taste?.country?.has(candidate.country))
      score += Math.min(4, taste.country.get(candidate.country));
  }

  const MIN_SCORE = taste?.hasHistory ? 14 : 16;
  if (score < MIN_SCORE) return { ok: false, score };

  return { ok: true, score };
}

export default function FundedGraduateAdmissionDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  const [showBanner, setShowBanner] = useState(false);
  const [recs, setRecs] = useState([]);

  // Track interactions (same endpoint, separate gate key namespace)
  const trackItem = (sid, type) => {
    try {
      if (!API_BASE) return;

      const idSafe = String(sid || "").trim();
      const t = String(type || "").toLowerCase().trim();
      if (!idSafe || !t) return;

      const gateKey = `fga:${idSafe}:${t}`;
      if (!shouldSendTrackOnce(gateKey)) return;

      fetch(`${API_BASE}/api/scholarships/${encodeURIComponent(idSafe)}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: t }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");

      // ✅ "instant feel": show local version immediately while API loads
      const local = loadLocalByIdOrIndex(id);
      if (alive && local) setItem(local);

      const useApi = Boolean(API_BASE);
      if (useApi) {
        try {
          const url = `${API_BASE}/api/scholarships/${encodeURIComponent(id)}`;
          const res = await fetch(url);

          if (res.status === 404) throw new Error("NOT_FOUND");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          if (!alive) return;

          // ✅ Safety: ensure this is actually a funded admission when your backend starts writing contentType
          const ct = String(data?.contentType || "SCHOLARSHIP").toUpperCase();
          if (ct !== "FUNDED_GRAD_ADMISSION") {
            // still allow render (backward-compat), but could show a soft message if desired
          }

          setItem(data);
          return;
        } catch {
          // fallback to local below
        }
      }

      if (!alive) return;

      if (!local) {
        if (API_BASE) {
          setErr(
            `Not found. This ID (${id}) is not in localStorage, and the API request failed or returned 404.`
          );
        } else {
          setErr("Not found (local).");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  // close lightbox on ESC
  useEffect(() => {
    if (!showBanner) return;
    const onKey = (e) => {
      if (e.key === "Escape") setShowBanner(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showBanner]);

  // Recommendations: keep them relevant (prefer contentType FUNDED_GRAD_ADMISSION)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!item) return;

      trackViewHabit(item);

      let list = [];

      if (API_BASE) {
        try {
          // ✅ Ask for funded type list once your Lambda supports contentType param
          const res = await fetch(
            `${API_BASE}/api/scholarships?page=1&pageSize=300&contentType=FUNDED_GRAD_ADMISSION`
          );
          if (res.ok) {
            const data = await res.json();
            list = Array.isArray(data?.items) ? data.items : [];
          }
        } catch {}
      }

      // fallback to local arrays
      if (!list.length) {
        const merged = [];
        for (const k of LOCAL_KEYS) {
          const arr =
            tryJson(() => JSON.parse(localStorage.getItem(k) || "[]")) || [];
          if (Array.isArray(arr)) merged.push(...arr.map(unwrap));
        }
        // ✅ filter funded only if field exists locally
        list = merged
          .filter(Boolean)
          .filter((x) => String(x?.contentType || "").toUpperCase() === "FUNDED_GRAD_ADMISSION");
      }

      const taste = buildTasteProfile();

      const ranked = list
        .map((x) => {
          const r = scoreAndGate(x, item, taste);
          return { x, ok: r.ok, s: r.score };
        })
        .filter((o) => o.ok)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
        .map((o) => o.x);

      if (!alive) return;
      setRecs(ranked);
    })();

    return () => {
      alive = false;
    };
  }, [item]);

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

  const canShowAds = Boolean(item);

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
    providerLogoUrl,
    providerLogoData,
  } = item;

  const bannerSrc = imageUrl || imageData || "";
  const logo = providerLogoUrl || providerLogoData || "";

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
        <div className="mx-auto w-full max-w-[1400px] px-4">
          <div className="grid grid-cols-1 2xl:grid-cols-[200px_minmax(0,1024px)_200px] 2xl:gap-6 items-start">
            {/* LEFT ADS */}
            <aside className="hidden 2xl:block pt-8">
              <div className="space-y-4">
                <div className="max-h-[250px] overflow-hidden">
                  {canShowAds && <GoogleSidebarAd />}
                </div>
                <div className="sticky top-[140px]">
                  {canShowAds && <GoogleSidebarAd />}
                </div>
              </div>
            </aside>

            {/* CENTER */}
            <main className="min-w-0">
              <div className="max-w-5xl mx-auto px-4 pt-8">
                <Link
                  to="/funded-graduate-admission"
                  className="text-blue-600 hover:underline text-sm"
                >
                  ← Back to Funded Graduate Admission
                </Link>
              </div>

              <div className="max-w-5xl mx-auto px-4 py-6">
                {/*<div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">*/}
                {/*<div className="rounded-2xl bg-slate-50 border border-transparent shadow-none p-6">*/}
                <div className="rounded-2xl bg-slate-50 border border-slate-200/60 shadow-none p-6">
                  <div className="flex items-start gap-4">
                    {logo ? (
                      <img
                        src={logo}
                        alt={`${provider || "University"} logo`}
                        /*className="h-14 w-14 shrink-0 rounded bg-white border border-slate-200 object-contain p-1"*/
                        /*className="h-14 w-14 shrink-0 rounded bg-slate-50 border border-transparent object-contain p-1"*/
                        className="h-18 w-18 shrink-0 rounded bg-white border border-slate-200 object-contain p-1"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold">{title}</h1>
                      <p className="mt-1 text-slate-600">
                        <span className="font-medium">{provider}</span>
                        {country ? ` • ${country}` : ""}
                        {level ? ` • ${level}` : ""}
                        {field ? ` • ${field}` : ""}
                      </p>
                    </div>
                  </div>

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
                        onClick={() => trackItem(id, "apply")}
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
                        onClick={() => trackItem(id, "website")}
                        className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        Visit website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="max-w-5xl mx-auto px-4 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {description && (
                      /*<section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">*/
                      <section className="rounded-2xl bg-slate-50 border border-transparent shadow-none p-6">
                        <h2 className="text-lg font-semibold">
                          Program Description
                        </h2>
                        <div className="mt-3">
                          <RichHtml html={description} />
                        </div>
                      </section>
                    )}

                    {eligibility && (
                      /*<section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">*/
                      <section className="rounded-2xl bg-slate-50 border border-transparent shadow-none p-6">
                        <h2 className="text-lg font-semibold">Program Eligibility & Requirements</h2>
                        <div className="mt-3">
                          <RichHtml html={eligibility} />
                        </div>
                      </section>
                    )}

                    {benefits && (
                      /*<section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">*/
                      <section className="rounded-2xl bg-slate-50 border border-transparent shadow-none p-6">
                        <h2 className="text-lg font-semibold">Funding Benefits</h2>
                        <div className="mt-3">
                          <RichHtml html={benefits} />
                        </div>
                      </section>
                    )}

                    {howToApply && (
                      /*<section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">*/
                      <section className="rounded-2xl bg-slate-50 border border-transparent shadow-none p-6">
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
                        <button
                          type="button"
                          onClick={() => setShowBanner(true)}
                          className="block w-full text-left"
                          title="Click to enlarge"
                        >
                          <img
                            src={bannerSrc}
                            alt={`${provider || title} banner`}
                            className="w-full h-auto object-contain bg-white"
                            loading="lazy"
                          />
                        </button>
                        <div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100">
                          Click image to enlarge
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-6">
                      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 text-center">
                        <h3 className="text-base font-semibold -mx-6 -mt-6 mb-4">
                          <span className="block w-full bg-orange-500 text-white py-2 rounded-t-2xl">
                            At a glance
                          </span>
                        </h3>

                        <dl className="mt-3 text-sm text-slate-700 text-left mx-auto max-w-xs">
                          <dt className="font-medium">University</dt>
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
                              <dt className="font-medium">Funding</dt>
                              <dd className="mb-3">{amount}</dd>
                            </>
                          )}
                        </dl>

                        {partnerApplyUrl && (
                          <a
                            href={partnerApplyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackItem(id, "apply")}
                            className="mt-2 inline-block rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                          >
                            Apply Now
                          </a>
                        )}
                      </div>
                    </div>

                    {recs.length > 0 && (
                      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-100 px-5 py-4">
                          <h4 className="text-lg font-bold text-slate-900 text-center">
                            You may also like
                          </h4>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {recs.map((s, idx) => {
                            const sid = getAnyId(s) || String(idx);
                            const label = s?.title || "Untitled opportunity";
                            return (
                              <Link
                                key={sid}
                                to={`/funded-graduate-admission/${encodeURIComponent(sid)}`}
                                className="block px-5 py-4 text-emerald-700 hover:bg-slate-50"
                              >
                                <span className="font-semibold">{label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </aside>
                </div>
              </div>
            </main>

            {/* RIGHT ADS */}
            <aside className="hidden 2xl:block pt-8">
              <div className="space-y-4">
                <div className="max-h-[250px] overflow-hidden">
                  {canShowAds && <GoogleSidebarAd />}
                </div>
                <div className="sticky top-[140px]">
                  {canShowAds && <GoogleSidebarAd />}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showBanner && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowBanner(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-700">
                  {provider || title}
                </div>
                <button
                  type="button"
                  onClick={() => setShowBanner(false)}
                  className="text-sm px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
              <div className="p-3 bg-slate-50">
                <img
                  src={bannerSrc}
                  alt={`${provider || title} banner enlarged`}
                  className="w-full h-auto object-contain rounded-lg bg-white"
                />
              </div>
            </div>
            <div className="mt-2 text-center text-[11px] text-white/80">
              Tip: press Esc to close
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}