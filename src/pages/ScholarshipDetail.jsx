// src/pages/ScholarshipDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { shouldSendTrackOnce } from "../lib/trackGate";
import Footer from "../components/Footer";
import GoogleSidebarAd from "../components/GoogleSidebarAd";
import GoogleBannerAd from "../components/GoogleBannerAd";

// ✅ Scholarships Details MUST use the Scholarships API base
const API_BASE = (
  import.meta.env.VITE_SCHOLARSHIPS_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/+$/, "");

const AI_API_BASE = (
  import.meta.env.VITE_SCHOLARSHIP_AI_API_BASE || ""
).replace(/\/+$/, "");

/* Render server-provided HTML (or partner HTML).
   If you later accept untrusted HTML, sanitize it first. */
function RichHtml({ html }) {
  if (!html) return null;
  return (
    <div
      //className="rich-html prose-sm max-w-none text-justify"
      //className="rich-html max-w-none text-justify"
      className="rich-html max-w-none text-justify"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function HtmlResult({ html }) {
  if (!html) return null;
  return (
    <div
      //className="rich-html prose-sm max-w-none"
      className="rich-html max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ---- Local fallback helpers ---- */
const LOCAL_KEYS = ["partnerScholarships", "scholarships", "postedScholarships"];
const CATALOG_CACHE_KEY = "scholarship_catalog_cache";

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
   ✅ "You may also like" helpers (STRICT personalization)
   ========================= */
const HABIT_KEY = "scholarship_browse_habit_v1";

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
  if (
    candidate.country &&
    current?.country &&
    candidate.country === current.country
  )
    score += 4;

  const candFunding = new Set(
    Array.isArray(candidate.fundingType) ? candidate.fundingType : []
  );
  (Array.isArray(current?.fundingType) ? current.fundingType : []).forEach(
    (f) => {
      if (candFunding.has(f)) score += 2;
    }
  );

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

export default function ScholarshipDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  const [showBanner, setShowBanner] = useState(false);
  const [recs, setRecs] = useState([]);
  const [showAllTips, setShowAllTips] = useState(false);

  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const [aiSteps, setAiSteps] = useState("");
  const [aiStepsLoading, setAiStepsLoading] = useState(false);
  const [showAiSteps, setShowAiSteps] = useState(false);

  const trackScholarship = (sid, type) => {
    try {
      if (!API_BASE) return;

      const idSafe = String(sid || "").trim();
      const t = String(type || "").toLowerCase().trim();
      if (!idSafe || !t) return;

      /*const gateKey = `sch:${idSafe}:${t}`;*/
      const typePrefix =
  String(item?.contentType || "SCHOLARSHIP").toUpperCase() === "FELLOWSHIP"
    ? "fellowship"
    : "sch";

const gateKey = `${typePrefix}:${idSafe}:${t}`;
      if (!shouldSendTrackOnce(gateKey)) return;

      fetch(`${API_BASE}/api/scholarships/${encodeURIComponent(idSafe)}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: t }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // never break UI
    }
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");
      setItem(null);

      const useApi = Boolean(API_BASE);

      if (useApi) {
        try {
          const url = `${API_BASE}/api/scholarships/${encodeURIComponent(id)}`;
          const res = await fetch(url);

          if (res.status === 404) {
            throw new Error("NOT_FOUND");
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          if (!alive) return;
          setItem(data);
          return;
        } catch {
          // fallback to local
        }
      }

      const local = loadLocalByIdOrIndex(id);
      if (!alive) return;

      if (local) {
        setItem(local);
        return;
      }

      if (API_BASE) {
        setErr(
          `Not found. This ID (${id}) is not in localStorage, and the API request failed or returned 404.`
        );
      } else {
        setErr("Not found (local).");
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!showBanner) return;
    const onKey = (e) => {
      if (e.key === "Escape") setShowBanner(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showBanner]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!item) return;

      trackViewHabit(item);

      let list = [];

      if (API_BASE) {
        try {
          /*const res = await fetch(
            `${API_BASE}/api/scholarships?page=1&pageSize=200`
          );*/
          const currentType = String(item?.contentType || "SCHOLARSHIP").toUpperCase();

const res = await fetch(
  `${API_BASE}/api/scholarships?page=1&pageSize=200&contentType=${encodeURIComponent(currentType)}`
);
          if (res.ok) {
            const data = await res.json();
            list = Array.isArray(data?.items) ? data.items : [];
          }
        } catch {
          // ignore
        }
      }

      if (!list.length) {
        const merged = [];
        for (const k of LOCAL_KEYS) {
          const arr =
            tryJson(() => JSON.parse(localStorage.getItem(k) || "[]")) || [];
          if (Array.isArray(arr)) merged.push(...arr.map(unwrap));
        }
        list = merged.filter(Boolean);
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

  const scholarshipPayload = useMemo(() => {
    if (!item?.id) return null;

    return {
      id: item.id,
      title: item.title || "",
      country: item.country || "",
      level: item.level || "",
      deadline: item.deadline || "",
      description: item.description || "",
      eligibility: item.eligibility || "",
      benefits: item.benefits || "",
      howToApply: item.howToApply || "",
    };
  }, [item]);

  useEffect(() => {
    let cancelled = false;

    async function loadAiSummary() {
      if (!AI_API_BASE || !scholarshipPayload?.id) return;

      try {
        setAiSummaryLoading(true);

        const res = await fetch(`${AI_API_BASE}/api/scholarships/ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "generate-summary",
            id: scholarshipPayload.id,
            title: scholarshipPayload.title,
            country: scholarshipPayload.country,
            level: scholarshipPayload.level,
            deadline: scholarshipPayload.deadline,
            description: scholarshipPayload.description,
            eligibility: scholarshipPayload.eligibility,
            benefits: scholarshipPayload.benefits,
            howToApply: scholarshipPayload.howToApply,
          }),
        });

        if (!res.ok) {
          throw new Error(`AI summary HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled) {
          setAiSummary(data?.result || "");
        }
      } catch (err) {
        console.error("AI summary failed:", err);
        if (!cancelled) {
          setAiSummary("");
        }
      } finally {
        if (!cancelled) {
          setAiSummaryLoading(false);
        }
      }
    }

    loadAiSummary();

    return () => {
      cancelled = true;
    };
  }, [scholarshipPayload]);

  async function handleSimplifySteps() {
    if (!AI_API_BASE || !scholarshipPayload?.id) return;

    if (aiSteps && showAiSteps) {
      setShowAiSteps(false);
      return;
    }

    if (aiSteps && !showAiSteps) {
      setShowAiSteps(true);
      return;
    }

    try {
      setAiStepsLoading(true);

      const res = await fetch(`${AI_API_BASE}/api/scholarships/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "simplify-application-steps",
          scholarship: scholarshipPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI steps HTTP ${res.status}`);
      }

      const data = await res.json();
      setAiSteps(data?.result || "");
      setShowAiSteps(true);
    } catch (err) {
      console.error("AI simplified steps failed:", err);
      setAiSteps("");
      setShowAiSteps(false);
    } finally {
      setAiStepsLoading(false);
    }
  }

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
    additionalInformation,
    imageUrl,
    imageData,
    providerLogoUrl,
    providerLogoData,
  } = item;

  const bannerSrc = imageUrl || imageData || "";
  const logo = providerLogoUrl || providerLogoData || "";
  const contentType = String(item?.contentType || "SCHOLARSHIP").toUpperCase();
  const isFellowship = contentType === "FELLOWSHIP";

  const itemLabel = isFellowship ? "Fellowship" : "Scholarship";
  const itemLabelPlural = isFellowship ? "Fellowships" : "Scholarships";
  const backPath = isFellowship ? "/fellowship" : "/scholarship";
  const detailBasePath = isFellowship ? "/fellowship" : "/scholarship";

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
     
      <style>{` 
  .rich-html ul,
  .rich-html ol {
    padding-left: 1.65rem;
    margin: 0.5rem 0 0.75rem;
  }

  .rich-html ul {
    list-style-type: disc;
  }

  .rich-html ol {
    list-style-type: decimal;
    counter-reset: quill-ordered;
  }

  .rich-html li {
    margin: 0.25rem 0;
    padding-left: 0.15rem;
  }

  .rich-html p {
    margin: 0.5rem 0;
  }

  .rich-html a {
    text-decoration: underline;
  }

  /* Standard HTML pasted as <ul>/<ol>. */
  .rich-html ul > li {
    display: list-item;
    list-style-type: disc;
  }

  .rich-html ol > li:not([data-list]) {
    display: list-item;
    list-style-type: decimal;
  }

  /*
   * Quill 2 stores both bullet and numbered rows inside <ol>,
   * then distinguishes them with data-list.
   */
  .rich-html li[data-list="bullet"],
  .rich-html li[data-list="ordered"] {
    display: block;
    list-style: none !important;
    position: relative;
  }

  /* Prevent Quill's invisible UI span from producing its own marker. */
  .rich-html .ql-ui {
    display: none !important;
  }

  .rich-html li[data-list="bullet"]::before {
    content: "•";
    position: absolute;
    left: -1.15rem;
    top: 0.08rem;
    font-size: 1.1em;
    line-height: inherit;
  }

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
  {/*</div><div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4">*/}
  <div className="mx-auto w-full max-w-[1400px] px-0 sm:px-4">
    <div className="mx-auto w-full max-w-[1024px]">
      <main className="min-w-0">
              <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8 lg:pt-10">
                {/*<Link
                  to="/scholarship"
                  className="inline-flex items-center text-blue-700 hover:text-blue-800 hover:underline text-sm font-medium"
                >
                  ← Back to Scholarships
                </Link>*/}
                <Link
  to={backPath}
  className="inline-flex items-center text-blue-700 hover:text-blue-800 hover:underline text-sm font-medium"
>
  ← Back to {itemLabelPlural}
</Link>
              </div>

              {/*<div className="max-w-5xl mx-auto px-3 sm:px-4 pt-8 sm:pt-10 pb-4 sm:pb-6">*/}
              <div className="max-w-5xl mx-auto px-0 sm:px-4 pt-6 sm:pt-10 pb-4 sm:pb-6">
                {/*</div><div className="rounded-2xl bg-slate-50 border border-slate-200/40 shadow-none p-4 sm:p-6">*/}
                <div className="rounded-none sm:rounded-2xl bg-slate-50 border-y border-x-0 sm:border border-slate-200/40 shadow-none p-3 sm:p-6">
                 
                   <div className="flex flex-col sm:flex-row sm:items-start gap-4">
  {/* MOBILE ONLY */}
  <div className="sm:hidden min-w-0 flex-1">
    <div className="flex items-center gap-3">
      {logo ? (
        <img
          src={logo}
          alt={`${provider || "Provider"} logo`}
          className="h-14 w-14 shrink-0 rounded bg-white border border-slate-200 object-contain p-1"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}

      <div className="min-w-0">
        <div className="text-base font-semibold text-[#46166B] leading-6 break-words">
          {provider}
          {country ? ` • ${country}` : ""}
        </div>
      </div>
    </div>

    <h1 className="mt-3 text-xl font-bold leading-snug break-words">
      {title}
    </h1>

    {(level || field) && (
      <div className="mt-1 text-sm text-slate-600 leading-6">
        {level ? level : ""}
        {field ? `${level ? " • " : ""}${field}` : ""}
      </div>
    )}
  </div>

  {/* DESKTOP EXACTLY AS BEFORE */}
  <div className="hidden sm:flex sm:flex-row sm:items-start gap-4 min-w-0 flex-1">
    {/*{logo ? (
      <img
        src={logo}
        alt={`${provider || "Provider"} logo`}
        className="h-16 w-16 shrink-0 rounded bg-white border border-slate-200 object-contain p-1 mt-1"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    ) : null}*/}

    <div className="min-w-0 flex-1">
      <h1 className="text-2xl font-bold leading-snug break-words">
        {title}
      </h1>

      <div className="mt-1">
        <div className="text-lg font-semibold text-[#46166B] leading-6">
          {provider}
          {country ? ` • ${country}` : ""}
        </div>

        {(level || field) && (
          <div className="text-base text-slate-600 leading-6">
            {level ? level : ""}
            {field ? `${level ? " • " : ""}${field}` : ""}
          </div>
        )}
      </div>
    </div>
  </div>
</div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 text-sm">
                    {Array.isArray(fundingType) && fundingType.length > 0 && (
                      <span className="inline-flex flex-wrap items-center gap-2">
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
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="text-slate-500">Amount:</span>
                        <span className="font-medium">{amount}</span>
                      </span>
                    )}

                    {deadline && (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="text-slate-500">Deadline:</span>
                        <span className="font-medium break-words">{deadline}</span>
                      </span>
                    )}
                  </div>

                  {/*<div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-3">
                    {partnerApplyUrl && (
                      <a
                        href={partnerApplyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackScholarship(id, "apply")}
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
                        onClick={() => trackScholarship(id, "website")}
                        className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 text-center"
                      >
                        Visit website
                      </a>
                    )}
                  </div>*/}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

  <div className="flex flex-wrap gap-3">
    {partnerApplyUrl && (
      <a
        href={partnerApplyUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackScholarship(id, "apply")}
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
        onClick={() => trackScholarship(id, "website")}
        className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 text-center"
      >
        Visit website
      </a>
    )}
  </div>

  {(item.publishedBy || item.updatedAt) && (
    <div className="text-xs text-slate-500 sm:text-right">
      {item.updatedAt ? (
        <>
          Updated by{" "}
          <span className="font-semibold text-slate-700">
            {item.updatedBy || item.publishedBy}
          </span>
          {" • "}
          {new Date(item.updatedAt).toLocaleDateString()}
        </>
      ) : (
        <>
          Published by{" "}
          <span className="font-semibold text-slate-700">
            {item.publishedBy}
          </span>
          {" • "}
          {new Date(item.publishedAt).toLocaleDateString()}
        </>
      )}
    </div>
  )}

</div>
                </div>
              </div>

              <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-12 sm:pb-16">
  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-6">
    <div className="min-w-0 space-y-6">
      <section className="rounded-2xl bg-blue-50 border border-blue-100 p-4 sm:p-5">
        <h2 className="text-xl sm:text-2xl font-semibold text-[#4B1F6F]">
          Quick {itemLabel} Summary
        </h2>

        <div className="mt-3 text-sm sm:text-base leading-7">
          {aiSummaryLoading ? (
            <p className="text-slate-600">Generating summary...</p>
          ) : aiSummary ? (
            <HtmlResult html={aiSummary} />
          ) : (
            <p className="text-slate-600">
              AI summary is not available for this {itemLabel.toLowerCase()} yet.
            </p>
          )}
        </div>
      </section>

      {false && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          {/* Real Google AdSense in-article ad goes here */}
        </section>
      )}

      {bannerSrc && (
  /*<section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">*/
  <section className="rounded-none sm:rounded-2xl bg-white border-y border-x-0 sm:border border-slate-200 overflow-hidden">
    <button
      type="button"
      onClick={() => setShowBanner(true)}
      className="block w-full text-left"
    >
      <img
        src={bannerSrc}
        alt={`${provider || title} banner`}
        className="w-full h-auto object-cover"
        loading="lazy"
        decoding="async"
      />
    </button>
  </section>
)}







      {description && (
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#4B1F6F]">
            {itemLabel} Description
          </h2>
          <div className="mt-2 sm:mt-3 text-sm sm:text-base leading-7">
            <RichHtml html={description} />
          </div>
        </section>
      )}

      {eligibility && (
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#4B1F6F]">
            Eligibility & Requirements
          </h2>
          <div className="mt-2 sm:mt-3 text-sm sm:text-base leading-7">
            <RichHtml html={eligibility} />
          </div>
        </section>
      )}

      {benefits && (
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#4B1F6F]">
            Funding and Benefits
          </h2>
          <div className="mt-2 sm:mt-3 text-sm sm:text-base leading-7">
            <RichHtml html={benefits} />
          </div>
        </section>
      )}

      {howToApply && (
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#4B1F6F]">
            How to submit Application
          </h2>

          <div className="mt-2 sm:mt-3 text-sm sm:text-base leading-7">
            <RichHtml html={howToApply} />
          </div>

          <div className="mt-5 rounded-2xl bg-emerald-100 border border-emerald-300 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-[#4B1F6F]">
                  Summarized & Simplified Application Steps
                </h3>
                <p className="mt-0.5 text-sm text-slate-600">
                  Turn the application instructions into a shorter checklist.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSimplifySteps}
                disabled={aiStepsLoading}
                className="inline-flex items-center justify-center rounded-xl bg-[#0A4595] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#083a7d] disabled:opacity-60"
              >
                {aiStepsLoading
                  ? "Working..."
                  : aiSteps && showAiSteps
                  ? "Hide Steps"
                  : aiSteps && !showAiSteps
                  ? "Show Steps"
                  : "Simplify Steps"}
              </button>
            </div>

            <div className="mt-3 text-sm sm:text-base leading-6">
              {showAiSteps && aiSteps ? <HtmlResult html={aiSteps} /> : null}
            </div>
          </div>
        </section>
      )}

      {additionalInformation && (
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#4B1F6F]">
            Additional Information
          </h2>
          <div className="mt-2 sm:mt-3 text-sm sm:text-base leading-7">
            <RichHtml html={additionalInformation} />
          </div>
        </section>
      )}
    </div>

    {/*<aside className="space-y-6 lg:pl-2 lg:sticky lg:top-24 self-start">
      {bannerSrc && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
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
          <div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100">
            Click image to enlarge
          </div>
        </div>
      )}*/}
      <aside className="space-y-6 lg:pl-2 lg:sticky lg:top-24 self-start">
  {logo && (
    /*<div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">*/
    <div className="rounded-none sm:rounded-2xl bg-white border-y border-x-0 sm:border border-slate-200 overflow-hidden">
      <img
        src={logo}
        alt={`${provider || title} logo`}
        /*className="w-full h-auto object-contain bg-white p-6"*/
        className="block w-full h-auto object-contain bg-white p-4 sm:p-6"
        loading="lazy"
        decoding="async"
      />
    </div>
  )}

      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h3 className="text-base font-semibold -mx-5 -mt-5 mb-4">
          <span className="block w-full bg-orange-500 text-white py-2 rounded-t-2xl text-center">
            At a glance
          </span>
        </h3>

        <dl className="mt-3 text-sm text-slate-700">
          <dt className="font-bold">Provider/University</dt>
          <dd className="mb-3">{provider || "-"}</dd>

          <dt className="font-bold">Country</dt>
          <dd className="mb-3">{country || "-"}</dd>

          <dt className="font-bold">Level</dt>
          <dd className="mb-3">{level || "-"}</dd>

          <dt className="font-bold">Field</dt>
          <dd className="mb-3">{field || "-"}</dd>

          <dt className="font-bold">Deadline</dt>
          <dd className="mb-3">{deadline || "-"}</dd>

          {amount && (
            <>
              <dt className="font-bold">Max Amount</dt>
              <dd className="mb-3">{amount}</dd>
            </>
          )}
        </dl>

        {partnerApplyUrl && (
          <a
            href={partnerApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackScholarship(id, "apply")}
            className="mt-2 block rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 text-center"
          >
            Apply Now
          </a>
        )}
      </div>

    <GoogleSidebarAd
  className="w-full"
  minHeight={600}
/>

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-5 py-4">
          <h4 className="text-lg font-bold text-slate-900 text-center">
            {itemLabel} Tips for International Students
          </h4>
        </div>

        <div className="p-4 space-y-3">
          {[
            {
              heading: "📝 Start Early and Stay Organized",
              text: "Begin 6–12 months early. Track deadlines, documents, and submissions to allow time for strong essays and recommendations.",
            },
            {
              heading: "🌍 Understand Eligibility Requirements",
              text: "Carefully check nationality, level, field, and language criteria. Apply only where you qualify and confirm unclear details.",
            },
            {
              heading: "🧾 Prepare Strong Documents",
              text: "Keep updated transcripts, CV, passport, and test scores. Ensure accuracy and prepare certified translations if required.",
            },
            {
              heading: "✍️ Write a Compelling Personal Statement",
              text: "Clearly present your background, goals, and impact. Tailor each essay to the scholarship and avoid generic content.",
            },
            {
              heading: "🧑‍🏫 Secure Strong Recommendations",
              text: "Choose referees who know you well. Give them time and details so they can provide specific and meaningful recommendations.",
            },
            {
              heading: "🎯 Tailor Every Application",
              text: "Customize each application to reflect the scholarship’s mission and clearly show your alignment with its goals.",
            },
            {
              heading: "💬 Show Leadership and Impact",
              text: "Highlight leadership, community work, and measurable results that demonstrate your contribution to society.",
            },
            {
              heading: "💡 Be Clear About Your Goals",
              text: "Explain your academic path and how it connects to long-term impact and career objectives.",
            },
            {
              heading: "🔍 Proofread Carefully",
              text: "Review your application for clarity and errors. Ask others to check your work before submission.",
            },
            {
              heading: "📤 Submit Before the Deadline",
              text: "Avoid last-minute issues. Confirm all documents are uploaded correctly and keep submission proof.",
            },
            {
              heading: "📚 Apply to Multiple Scholarships",
              text: "Increase your chances by applying to several opportunities across governments, universities, and organizations.",
            },
            {
              heading: "🤝 Stay Professional",
              text: "Communicate clearly and respectfully. Use a formal tone and professional email address.",
            },
            {
              heading: "🔄 Keep Trying",
              text: "Rejections are common. Learn from feedback and continue applying with improved applications.",
            },
          ]
            .slice(0, showAllTips ? 13 : 5)
            .map((tip, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white border border-slate-200 px-4 py-3"
              >
                <p className="font-semibold text-slate-900 text-sm sm:text-base">
                  {tip.heading}
                </p>
                <p className="text-sm text-slate-700 mt-1 leading-6">
                  {tip.text}
                </p>
              </div>
            ))}

          <button
            type="button"
            onClick={() => setShowAllTips((v) => !v)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showAllTips ? "Show fewer tips" : "Show more tips"}
          </button>
        </div>
      </div>
    </aside>
  </div>

  {/*{recs.length > 0 && (
    <section className="mt-10 rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <div className="bg-slate-100 px-5 py-4">
        <h4 className="text-lg font-bold text-slate-900">
          You may also like the following programs
        </h4>
      </div>

      <div className="flex gap-3 overflow-x-auto p-4">
        {recs.map((s, idx) => {
          const sid = getAnyId(s) || String(idx);
          const label = s?.title || `Untitled ${itemLabel.toLowerCase()}`;

          return (
            <Link
  key={sid}
  to={`${detailBasePath}/${encodeURIComponent(sid)}`}
  className="w-[340px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white hover:shadow-md transition"
>
  {(s.imageUrl || s.imageData) && (
    <img
      src={s.imageUrl || s.imageData}
      alt={label}
      className="h-40 w-full object-cover"
      loading="lazy"
    />
  )}

  <div className="p-4">
    <h5 className="font-semibold text-slate-900 line-clamp-3 leading-6">
      {label}
    </h5>

    {s.country && (
      <p className="mt-2 text-sm text-slate-500">
        {s.country}
      </p>
    )}

    {Array.isArray(s.fundingType) &&
      s.fundingType.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {s.fundingType.slice(0, 2).map((f) => (
            <span
              key={f}
              className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-xs"
            >
              {f}
            </span>
          ))}
        </div>
      )}
  </div>
</Link>


          );
        })}
      </div>
    </section>
  )}*/}
  {recs.length > 0 && (
  <section className="mt-12 border-t border-slate-200 pt-8 w-full">
    <div className="mb-6 text-center">
      <h4 className="text-2xl font-bold text-slate-900">
        You may also like the following programs
      </h4>
    </div>

    <div className="flex gap-3 overflow-x-auto pb-4 px-1">
      {recs.map((s, idx) => {
        const sid = getAnyId(s) || String(idx);
        const label = s?.title || `Untitled ${itemLabel.toLowerCase()}`;
        const recImage =
          s.imageUrl ||
          s.imageData ||
          s.providerLogoUrl ||
          s.providerLogoData ||
          "";

        return (
          <Link
            key={sid}
            to={`${detailBasePath}/${encodeURIComponent(sid)}`}
            className="w-[300px] lg:w-[320px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {recImage && (
              <img
                src={recImage}
                alt={label}
                className="h-32 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            )}

            <div className="p-3">
              <h5 className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                {label}
              </h5>

              {s.country && (
                <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                  {s.country}
                </p>
              )}

              {Array.isArray(s.fundingType) && s.fundingType.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.fundingType.slice(0, 2).map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                    >
                      {f}
                    </span>
                  ))}
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
</div>

            </main>


          </div>
        </div>
      </div>
      

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

      <section className="bg-slate-900 px-4 py-10 text-white">
  <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">

    <div>
      <h3 className="text-lg font-bold">Scholarships</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <Link to="/scholarships" className="block hover:text-white">All Scholarships</Link>
        <Link to="/fellowships" className="block hover:text-white">Fellowships</Link>
        <Link to="/funded-graduate-admission" className="block hover:text-white">Funded Graduate Admissions</Link>
        <Link to="/scholarship-tips" className="block hover:text-white">Application Tips</Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">Funding</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <Link to="/scholarships?funding=Fully Funded" className="block hover:text-white">Fully Funded</Link>
        <Link to="/scholarships?funding=Partial Funding" className="block hover:text-white">Partial Funding</Link>
        <Link to="/scholarships?funding=Tuition Waiver" className="block hover:text-white">Tuition Waivers</Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">For Organizations</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <Link to="/partner-submit-scholarship" className="block hover:text-white">Post a Scholarship</Link>
        <Link to="/partner" className="block hover:text-white">Partner With Us</Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">ScholarsKnowledge</h3>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        Connecting students with trusted scholarship and funding opportunities
        from around the world.
      </p>
    </div>

  </div>
</section>

      <Footer />
    </div>
  );
}