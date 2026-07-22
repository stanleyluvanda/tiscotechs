// src/pages/FundedGraduateAdmissionDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { shouldSendTrackOnce } from "../lib/trackGate";
import Footer from "../components/Footer";
import GoogleSidebarAd from "../components/GoogleSidebarAd";
import GoogleBannerAd from "../components/GoogleBannerAd";

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
      className="rich-html prose prose-sm sm:prose-sm md:prose-base max-w-none break-words text-justify"
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








function getYouTubeVideoId(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") || "";
      }

      const parts = parsed.pathname.split("/").filter(Boolean);

      if (
        ["embed", "shorts", "live"].includes(parts[0]) &&
        parts[1]
      ) {
        return parts[1];
      }
    }
  } catch {
    return "";
  }

  return "";
}

function YouTubeLiteEmbed({ videoId, title }) {
  const [activated, setActivated] = useState(false);

  if (!videoId) return null;

  if (activated) {
    return (
      <div className="aspect-video w-full overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title || "YouTube video"}
          loading="lazy"
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className="group relative block aspect-video w-full overflow-hidden bg-slate-100 text-left"
      aria-label={`Play ${title || "YouTube video"}`}
    >
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />

      <span className="absolute inset-0 bg-black/10 transition group-hover:bg-black/20" />

      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/75 text-white shadow-lg transition group-hover:scale-105">
          <span className="ml-1 text-2xl">▶</span>
        </span>
      </span>
    </button>
  );
}






export default function FundedGraduateAdmissionDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  const [showBanner, setShowBanner] = useState(false);
  const [recs, setRecs] = useState([]);
  const [showAllProgramTips, setShowAllProgramTips] = useState(false);
  const canShowAds = true;

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
        list = merged
          .filter(Boolean)
          .filter(
            (x) =>
              String(x?.contentType || "").toUpperCase() ===
              "FUNDED_GRAD_ADMISSION"
          );
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
    youtubeUrl,
    howToApply,
    additionalInformation,
    imageUrl,
    imageData,
    providerLogoUrl,
    providerLogoData,
  } = item;

  const bannerSrc = imageUrl || imageData || "";
  const logo = providerLogoUrl || providerLogoData || "";
  const youtubeVideoId = getYouTubeVideoId(youtubeUrl);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      {/*<style>{`
        .rich-html ul { list-style: disc; padding-left: 1.25rem; margin: 0.2rem 0 0.35rem; }
        .rich-html ol { list-style: decimal; padding-left: 1.25rem; margin: 0.15rem 0 0.25rem; }
        .rich-html li { display: list-item; margin: 0.12rem 0; }
        .rich-html p { margin: 0.12rem 0; }
        .rich-html a { text-decoration: underline; }
      `}</style>*/}

      <style>{`
  .rich-html ul,
  .rich-html ol { padding-left: 1.65rem; margin: 0.5rem 0 0.75rem;}

  .rich-html ul {list-style-type: disc;}

  .rich-html ol {list-style-type: decimal;counter-reset: quill-ordered;}

  .rich-html li {margin: 0.25rem 0;padding-left: 0.15rem;}

  .rich-html p {margin: 0.5rem 0;}

  .rich-html a {text-decoration: underline;}

  /* Normal HTML bullet lists */
  .rich-html ul > li {display: list-item;list-style-type: disc;}

  /* Normal HTML numbered lists */
  .rich-html ol > li:not([data-list]) {display: list-item; list-style-type: decimal;}

  /*
   * Quill 2 stores bullets and numbered items inside <ol>,
   * then identifies the intended type with data-list.
   */
  .rich-html li[data-list="bullet"],
  .rich-html li[data-list="ordered"] {
    display: block;
    list-style: none !important;
    position: relative;
  }

  /* Hide Quill's internal list marker element */
  .rich-html .ql-ui {
    display: none !important;
  }

  /* Quill bullet lists */
    .rich-html li[data-list="bullet"]::before {
  content: "•";
  position: absolute;
  left: -1.2rem;
  top: -0.02rem;
  font-size: 1.5em;
  font-weight: 700;
  line-height: 1;
}

  /* Quill numbered lists */
  .rich-html li[data-list="ordered"] {
    counter-increment: quill-ordered;
  }

  .rich-html li[data-list="ordered"]::before {
    content: counter(quill-ordered) ".";
    position: absolute;
    left: -1.65rem;
    top: 0;
    width: 1.35rem;
    text-align: right;
  }
`}</style>

      <div className="flex-1">
              <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-5">
  {/* Back link uses the full 1600px page container */}
  <div className="w-full pt-8 sm:pt-10 lg:pt-12">
    <Link
      to="/funded-graduate-admission"
      className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
    >
      ←Back
    </Link>
  </div>

  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[180px_minmax(0,1120px)_180px]">
    <aside className="hidden xl:block">
      <GoogleSidebarAd
        className="sticky top-24 w-full"
        minHeight={700}
      />
    </aside>

    {/*<main className="min-w-0 w-full">
<div className="max-w-5xl mx-auto px-0 sm:px-2 py-2 sm:py-5 lg:py-6">*/}
  <main className="min-w-0 w-full">

{/* Banner above the funded opportunity title */}
<div className="mx-auto w-full max-w-5xl px-0 sm:px-2 pt-4 pb-2">
  <GoogleBannerAd className="mx-auto w-full max-w-[970px]" />
</div>

<div className="max-w-5xl mx-auto px-0 sm:px-2 py-2 sm:py-5 lg:py-6">
                {/*</div><div className="rounded-2xl bg-slate-50 border border-slate-200/60 shadow-none p-4 sm:p-5 lg:p-6">*/}
                {/*</div><div className="rounded-none sm:rounded-2xl bg-slate-50 border-x-0 sm:border border-slate-200/60 shadow-none p-3 sm:p-5 lg:p-6">*/}
                <div className="px-3 sm:px-5 lg:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Mobile only: logo + university name */}
                    <div className="flex items-center gap-3 sm:hidden">
                      {logo ? (
                        <img
                          src={logo}
                          alt={`${provider || "University"} logo`}
                          className="h-14 w-14 shrink-0 rounded bg-white border border-slate-200 object-contain p-1"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}

                      {provider ? (
                        <div className="min-w-0 text-lg font-bold text-[#4B1F6F] leading-snug break-words">
                          {provider}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight break-words">
                        {title}
                      </h1>
                      <p className="mt-1 text-sm sm:text-base text-slate-600 break-words">
                        <span className="hidden sm:inline font-medium">
                          {provider}
                        </span>
                        <span className="hidden sm:inline">
                          {country ? ` • ${country}` : ""}
                          {level ? ` • ${level}` : ""}
                          {field ? ` • ${field}` : ""}
                        </span>

                        <span className="sm:hidden">
                          {country || ""}
                          {level ? ` • ${level}` : ""}
                          {field ? ` • ${field}` : ""}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 text-sm">
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

                  {/*<div className="mt-4 flex flex-col sm:flex-row gap-3">
                    {partnerApplyUrl && (
                      <a
                        href={partnerApplyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackItem(id, "apply")}
                        className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 text-center"
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
                        className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 text-center"
                      >
                        Visit website
                      </a>
                    )}
                  </div>*/}
                  {/*<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">*/}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex flex-col sm:flex-row gap-3">
    {partnerApplyUrl && (
      <a
        href={partnerApplyUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackItem(id, "apply")}
        className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 text-center"
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
        className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 text-center"
      >
        Visit website
      </a>
    )}
  </div>

  {(item?.publishedBy || item?.updatedAt) && (

    <div className="text-sm text-slate-500 whitespace-nowrap sm:ml-auto sm:text-right">
      {item?.updatedAt ? (
        <>
          Updated by{" "}
          <span className="font-semibold text-slate-700">
            {item?.updatedBy || item?.publishedBy}
          </span>
          {" • "}
          {new Date(item.updatedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </>
      ) : (
        <>
          Published by{" "}
          <span className="font-semibold text-slate-700">
            {item?.publishedBy}
          </span>
          {" • "}
          {new Date(item.publishedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </>
      )}
    </div>
  )}
</div>


                </div>
              </div>

              {/*<div className="max-w-5xl mx-auto px-0 sm:px-2 pb-10 sm:pb-12 lg:pb-16">*/}
              <div className="max-w-5xl mx-auto px-0 sm:px-2 pb-10 sm:pb-12 lg:pb-16">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-5 lg:gap-6">
                  <div className="min-w-0 space-y-3 lg:space-y-2">
                    {description && (
                      /*<section className="rounded-2xl bg-slate-50 border border-transparent shadow-none px-4 sm:px-5 lg:px-6 py-3">*/
                        <section className="rounded-none sm:rounded-2xl bg-slate-50 border border-transparent shadow-none px-3 sm:px-5 lg:px-6 py-3">
                        <h2
                          className="text-2xl font-semibold text-[#4B1F6F]"
                          style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        >
                          Program Description
                        </h2>
                        <div className="mt-2">
                          <RichHtml html={description} />
                        </div>
                      </section>
                    )}

                    {bannerSrc && (
                      <section className="bg-white shadow-sm border-y border-x-0 sm:border border-slate-200 overflow-hidden mx-0 sm:mx-5 lg:mx-6">
                        {/*<section className="rounded-none sm:rounded-2xl bg-white shadow-sm border-y border-x-0 sm:border border-slate-200 overflow-hidden mx-0 sm:mx-5 lg:mx-6">*/}                       
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
                            decoding="async"
                          />
                        </button>
                        {/*<div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100">
                          Click image to enlarge
                        </div>*/}
                      </section>
                    )}

                    {eligibility && (
                      <section className="rounded-2xl bg-slate-50 border border-transparent shadow-none px-4 sm:px-5 lg:px-6 py-3">
                        <h2
                          className="text-2xl font-semibold text-[#4B1F6F]"
                          style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        >
                          Program Eligibility & Requirements
                        </h2>
                        <div className="mt-2">
                          <RichHtml html={eligibility} />
                        </div>
                      </section>
                    )}

                    {benefits && (
                      <section className="rounded-2xl bg-slate-50 border border-transparent shadow-none px-4 sm:px-5 lg:px-6 py-3">
                        <h2
                          className="text-2xl font-semibold text-[#4B1F6F]"
                          style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        >
                          Funding Benefits
                        </h2>
                        <div className="mt-2">
                          <RichHtml html={benefits} />
                        </div>
                      </section>
                    )}

                    {youtubeVideoId && (
                    <section className="overflow-hidden bg-slate-50 px-3 py-2 sm:px-5 lg:px-6">
                       <YouTubeLiteEmbed
                       videoId={youtubeVideoId}
                       title={`${title || "Funded graduate admission"} video`}
                       />
                    </section>
                      )}

                    {howToApply && (
                      <section className="rounded-2xl bg-slate-50 border border-transparent shadow-none px-4 sm:px-5 lg:px-6 py-3">
                        <h2
                          className="text-2xl font-semibold text-[#4B1F6F]"
                          style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        >
                          How to Apply
                        </h2>
                        <div className="mt-2">
                          <RichHtml html={howToApply} />
                        </div>
                      </section>
                    )}

                    {additionalInformation && (
                      <section className="rounded-2xl bg-slate-50 border border-transparent shadow-none px-4 sm:px-5 lg:px-6 py-3">
                        <h2
                          className="text-xl sm:text-2xl font-semibold text-[#4B1F6F] leading-tight"
                          style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        >
                          Additional Information
                        </h2>
                        <div className="mt-2">
                          <RichHtml html={additionalInformation} />
                        </div>
                      </section>
                    )}

                    <div className="pt-2 sm:pt-3">
                      <div className="border-t border-slate-200 pt-4 sm:pt-5">
                        <h4 className="text-base sm:text-xl font-bold text-center text-[#0A4595] underline underline-offset-4">
                          Tips for Program Selection
                        </h4>

                        <div className="mt-4 space-y-3">
                          {[
                            {
                              heading: "Confirm the true funding scope",
                              text: "Review the offer carefully to see whether it covers tuition only or also includes living expenses, insurance, research support, and the full duration of study. A program described as funded may still leave significant costs for the student.",
                            },
                            {
                              heading: "Consider STEM designation and confirm with admissions",
                              text: "Where possible, prioritize programs that fall under STEM-designated fields, as they may offer extended practical training opportunities after graduation depending on visa regulations. If you are unsure whether your program qualifies, review the ",
                              linkText: "STEM Programs page",
                              linkUrl: "/stem-programs",
                              extra:
                                " for guidance, and always confirm details directly with the university’s admissions or program office before making a final decision.",
                            },
                            {
                              heading: "Prioritize fit over name recognition",
                              text: "A well-known university is not always the best choice. The stronger option is the one that aligns clearly with your academic background, professional goals, research interests, and long-term direction after graduation.",
                            },
                            {
                              heading: "Examine faculty and supervision quality",
                              text: "For research-based programs, faculty fit matters greatly. Look at supervisor interests, publications, current projects, and lab activity. Strong academic alignment can shape mentorship quality, funding continuity, and publication opportunities.",
                            },
                            {
                              heading: "Measure affordability beyond tuition",
                              text: "Even where tuition is covered, daily life can still be expensive. Compare housing, food, transportation, insurance, and local living costs before deciding. A more affordable city may provide a stronger and more sustainable student experience.",
                            },
                            {
                              heading: "Understand the obligations behind support",
                              text: "Some funding packages include teaching, grading, research, or departmental service responsibilities. Clarify the expected workload early so you can judge whether the balance between funding and academic pressure is realistic.",
                            },
                            {
                              heading: "Assess value through outcomes",
                              text: "Look beyond admission and ask what the program leads to. Strong options usually offer research exposure, practical training, internships, alumni networks, and credible career pathways that continue to add value after graduation.",
                            },
                          ].map((tip, idx) => (
                            <div key={idx} className="px-0">
                              <p className="text-[13px] sm:text-sm font-semibold text-[#163b66]">
                                {idx + 1}. {tip.heading}
                              </p>
                              <p className="mt-1 text-[12px] sm:text-[13px] leading-5 sm:leading-6 text-slate-700 text-justify">
                                {tip.text}
                                {tip.linkText && (
                                  <>
                                    <Link
                                      to={tip.linkUrl}
                                      className="text-[#0A4595] font-semibold hover:underline"
                                    >
                                      {tip.linkText}
                                    </Link>
                                    {tip.extra}
                                  </>
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-5 lg:space-y-6">
                    {bannerSrc && (
                         <div className="rounded-none sm:rounded-2xl bg-white shadow-sm border-y border-x-0 sm:border border-slate-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowBanner(true)}
                          className="block w-full text-left"
                          title="Click to enlarge"
                        >
                          <img
                            src={logo || bannerSrc}
                            alt={`${provider || "University"} logo`}
                            /*className="w-full h-auto object-contain bg-white"*/
                            className="block w-full h-auto object-contain bg-white"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                        <div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100">
                          {/*Click image to enlarge*/}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 sm:p-5 lg:p-6">
                      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6 text-center">
                        <h3 className="text-base font-semibold -mx-4 sm:-mx-5 lg:-mx-6 -mt-4 sm:-mt-5 lg:-mt-6 mb-4">
                          <span className="block w-full bg-orange-500 text-white py-2 rounded-t-2xl">
                            At a glance
                          </span>
                        </h3>

                        <dl className="mt-3 text-sm text-slate-700 text-left mx-auto w-full max-w-xs break-words">
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
                            className="mt-2 inline-block w-full sm:w-auto rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 text-center"
                          >
                            Apply Now
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Sidebar Google Ad */}
<GoogleSidebarAd className="w-full" minHeight={300} />
                    
                    {recs.filter(
  (s) =>
    s.featured === true ||
    s.featuredLevel === "FEATURED" ||
    s.featuredLevel === "PREMIUM_FEATURED"
).length > 0 && (
  <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
    <div className="bg-slate-100 px-5 py-4">
      <h4 className="text-base font-bold text-slate-900 text-center">
        Featured Funded Opportunities
      </h4>
    </div>

    <div className="divide-y divide-slate-200">
      {recs
        .filter(
          (s) =>
            s.featured === true ||
            s.featuredLevel === "FEATURED" ||
            s.featuredLevel === "PREMIUM_FEATURED"
        )
        .slice(0, 5)
        .map((s, idx) => {
          const sid = getAnyId(s) || String(idx);
          const label = s?.title || "Untitled opportunity";
          const logoSrc =
            s.providerLogoUrl ||
            s.providerLogoData ||
            s.imageUrl ||
            s.imageData ||
            "";

          return (
            <Link
              key={sid}
              to={`/funded-graduate-admission/${encodeURIComponent(sid)}`}
              onClick={() => {
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }, 0);
              }}
              className="flex items-center gap-3 px-4 sm:px-5 py-4 text-emerald-700 hover:bg-slate-50"
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={s.provider || label}
                  className="h-10 w-10 shrink-0 rounded border border-slate-200 bg-white object-contain p-1"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-emerald-50 text-xs font-bold text-emerald-700">
                  SK
                </div>
              )}

              <span className="text-sm font-semibold leading-snug break-words">
              {label}
                </span>
            </Link>
          );
        })}
    </div>
  </div>
)}
<GoogleSidebarAd
  className="w-full"
  minHeight={600}
/>

                  </aside>
                </div>
              </div>
            </main>
            <aside className="hidden xl:block">
                  <GoogleSidebarAd className="sticky top-24 w-full" minHeight={700} />
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
          <div
            className="max-w-5xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
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
              <div className="p-2 sm:p-3 bg-slate-50 max-h-[75vh] overflow-auto">
                <img
                  src={bannerSrc}
                  alt={`${provider || title} banner enlarged`}
                  className="w-full h-auto object-contain rounded-lg bg-white"
                  decoding="async"
                />
              </div>
            </div>
            <div className="mt-2 text-center text-[11px] text-white/80">
              Tip: press Esc to close
            </div>
          </div>
        </div>
      )}

      {/* You may also like */}
{recs.length > 0 && (
  /*<section className="mt-10">*/
  
    <section className="mt-8 mb-16 border-t border-slate-200 pt-6">
    {/*<div className="mb-4">*/}
      <div className="mb-6 text-center">
      {/*<h2 className="text-2xl font-bold text-slate-900">*/}
      <h2 className="text-3xl font-bold text-slate-900">
        You may also like
      </h2>
      <p className="text-sm text-slate-500">
        Similar funded admission opportunities
      </p>
    </div>

    <div className="mx-auto flex max-w-[1600px] gap-3 overflow-x-auto pb-4 px-1 justify-center">
      {recs.slice(0, 6).map((r) => {
        const sid = getAnyId(r);
        const recBanner =
          r.imageUrl ||
          r.imageData ||
          r.providerLogoUrl ||
          r.providerLogoData ||
          "";

        return (
          
            <Link
  key={sid}
  to={`/funded-graduate-admission/${sid}`}
  onClick={() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }}
  className="w-[260px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
>
            {recBanner && (
              <img
                src={recBanner}
                alt={r.title}
                /*className="h-44 w-full object-cover"*/
                className="h-32 w-full object-cover"
              />
            )}

            {/*<div className="p-4">*/}
              <div className="p-3">
              {/*<h3 className="line-clamp-2 font-bold text-slate-900">*/}
                <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                {r.title}
              </h3>

              {/*<p className="mt-2 text-sm text-slate-600">*/}
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                {r.provider}
                {r.country ? ` • ${r.country}` : ""}
              </p>

              {r.amount && (
                <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {r.amount}
                </div>
              )}
            </div>
          </Link>
         );
      })}
</div>

    <div className="mt-8">
      <GoogleBannerAd className="mx-auto w-full max-w-[970px]" />
    </div>
  </section>
)}

{/* UNIVERSITY-FUNDED FOOTER */}
<section className="bg-[#0F4C5C] px-4 py-10 text-white">
  <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">

    <div>
      <h3 className="text-lg font-bold">Funded Opportunities</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-200">
        <Link to="/funded-graduate-admission" className="block hover:text-white">
          All Opportunities
        </Link>
        <Link to="/scholarships" className="block hover:text-white">
          Scholarships
        </Link>
        <Link to="/fellowships" className="block hover:text-white">
          Fellowships
        </Link>
        <Link to="/scholarship-tips" className="block hover:text-white">
          Application Tips
        </Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">Funding Types</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-200">
        <Link to="/funded-graduate-admission" className="block hover:text-white">
          Assistantships
        </Link>
        <Link to="/funded-graduate-admission" className="block hover:text-white">
          Tuition Waivers
        </Link>
        <Link to="/funded-graduate-admission" className="block hover:text-white">
          University Grants
        </Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">For Universities</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-200">
        <Link to="/partner-submit-scholarship" className="block hover:text-white">
          Post an Opportunity
        </Link>
        <Link to="/partner" className="block hover:text-white">
          Partner With Us
        </Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">ScholarsKnowledge</h3>
      <p className="mt-4 text-sm leading-6 text-slate-200">
        Connecting international students with trusted university-funded
        graduate admission opportunities around the world.
      </p>
    </div>

  </div>
</section>




      <Footer />
    </div>
  );
}