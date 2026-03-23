// src/pages/FundedGraduateAdmission.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { REGIONS } from "../data/regions";
import { FIELDS_OF_STUDY } from "../data/fieldsOfStudy";
import { shouldSendTrackOnce } from "../lib/trackGate";
import {
  listFundedGraduateAdmissions,
  readFundedAdmissionsCache,
  getFundedGraduateAdmissionById, // used for hover/click prefetch to feel instant
} from "../utils/scholarshipsApi";

import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";

const CONTINENT_NAMES = Object.keys(REGIONS);

/* Build a quick lookup: country (lowercase) -> continent */
const COUNTRY_TO_CONTINENT = (() => {
  const map = {};
  for (const [cont, countries] of Object.entries(REGIONS)) {
    countries.forEach((c) => {
      map[String(c).toLowerCase()] = cont;
    });
  }
  return map;
})();

// Compact dropdown options (shown as checkboxes inside the popover)
const LEVEL_OPTIONS = [
  "Undergraduate",
  "Masters",
  "PhD",
  "Undergraduate / Masters",
  "Masters / PhD",
];

// --- helpers ---
function stripHtml(html = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}
function truncate(s = "", n = 180) {
  const t = s.trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/** Apply client-side filters/sort/pagination (used after fetching approved list) */
function filterSortPaginate({
  list,
  q,
  continent,
  country,
  field,
  funding,
  levels,
  sort,
  page,
  pageSize,
}) {
  let out = Array.isArray(list) ? list.slice() : [];

  // Search (title/provider/country/field/description)
  if (q.trim()) {
    const qq = q.trim().toLowerCase();
    out = out.filter((s) => {
      const hay =
        [
          s.title,
          s.provider,
          s.country,
          s.field,
          s.level,
          stripHtml(s.description || ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
      return hay.includes(qq);
    });
  }

  // Continent filter
  if (continent && continent !== "All") {
    out = out.filter((s) => {
      const direct = String(s.continent || "").trim();
      if (direct && direct !== "All") {
        return direct === continent;
      }
      const cName = String(s.country || "").toLowerCase();
      if (!cName) return false;
      const inferred = COUNTRY_TO_CONTINENT[cName];
      return inferred === continent;
    });
  }

  // Country
  if (country && country !== "All") {
    out = out.filter(
      (s) => String(s.country || "").toLowerCase() === country.toLowerCase()
    );
  }

  // Field
  if (field && field !== "All") {
    out = out.filter(
      (s) => String(s.field || "").toLowerCase() === field.toLowerCase()
    );
  }

  // Level (multi)
  if (levels && levels.length > 0) {
    const setLv = new Set(levels.map((x) => x.toLowerCase()));
    out = out.filter((s) => setLv.has(String(s.level || "").toLowerCase()));
  }

  // Funding
  if (funding && funding !== "All") {
    const fNeedle = funding.toLowerCase();
    out = out.filter((s) => {
      const val = s.fundingType || s.funding;
      if (!val) return false;
      if (Array.isArray(val))
        return val.some((v) => String(v).toLowerCase() === fNeedle);
      return String(val).toLowerCase() === fNeedle;
    });
  }

  // Sort
  if (sort === "newest") {
    out.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  } else if (sort === "deadlineAsc") {
    out.sort(
      (a, b) =>
        new Date(a.deadline || "2100-01-01") -
        new Date(b.deadline || "2100-01-01")
    );
  } else if (sort === "deadlineDesc") {
    out.sort(
      (a, b) =>
        new Date(b.deadline || "1900-01-01") -
        new Date(a.deadline || "1900-01-01")
    );
  } else if (sort === "title") {
    out.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""))
    );
  }

  const total = out.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return { items: out.slice(start, end), total };
}

export default function FundedGraduateAdmission() {
  // ✅ baseItems is the full approved list (cache → then API refresh)
  const [baseItems, setBaseItems] = useState(() => {
    const cached = readFundedAdmissionsCache("approved");
    return cached?.items || [];
  });

  const [loading, setLoading] = useState(() => {
    const cached = readFundedAdmissionsCache("approved");
    return !(cached?.items && cached.items.length > 0);
  });

  const [err, setErr] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);

  // Filters / sorting / pagination
  const [q, setQ] = useState("");
  const [continent, setContinent] = useState("All");
  const [country, setCountry] = useState("All");
  const [field, setField] = useState("All");
  const [funding, setFunding] = useState("All");
  const [searchParams] = useSearchParams();

  // Level multi-select stored in array, shown via compact dropdown
  const [levels, setLevels] = useState([]);
  const [levelOpen, setLevelOpen] = useState(false);

  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 100;

  // Close level dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!e.target.closest?.("[data-level-popover]")) {
        setLevelOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // ✅ AUTO-APPLY filters from URL query params (same behavior)
  useEffect(() => {
    const qpQ = (searchParams.get("q") || "").trim();
    const qpContinent = (searchParams.get("continent") || "").trim();
    const qpCountry = (searchParams.get("country") || "").trim();
    const qpField = (searchParams.get("field") || "").trim();
    const qpFunding = (searchParams.get("funding") || "").trim();
    const qpSort = (searchParams.get("sort") || "").trim();

    let changed = false;

    if (qpQ) {
      setQ(qpQ);
      changed = true;
    }

    if (qpContinent) {
      setContinent(qpContinent);
      setCountry("All");
      changed = true;
    }

    if (qpCountry) {
      const inferred = COUNTRY_TO_CONTINENT[qpCountry.toLowerCase()];
      if (inferred) setContinent(inferred);
      setCountry(qpCountry);
      changed = true;
    }

    if (qpField) {
      setField(qpField);
      changed = true;
    }

    if (qpFunding) {
      setFunding(qpFunding);
      changed = true;
    }

    if (qpSort) {
      setSort(qpSort);
      changed = true;
    }

    if (changed) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Country options depend on continent
  const countryOptions = useMemo(() => {
    if (continent === "All") {
      const set = new Set();
      for (const c of CONTINENT_NAMES) REGIONS[c].forEach((x) => set.add(x));
      return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }
    return ["All", ...REGIONS[continent]];
  }, [continent]);

  // Funding options inferred from baseItems
  const fundingOptions = useMemo(() => {
    const set = new Set();
    baseItems.forEach((s) => {
      const val = s.fundingType || s.funding;
      if (!val) return;
      if (Array.isArray(val)) val.forEach((v) => v && set.add(String(v)));
      else set.add(String(val));
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [baseItems]);

  const toggleLevel = (val) => {
    setLevels((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
    setPage(1);
  };

  const { items, total } = useMemo(() => {
    return filterSortPaginate({
      list: baseItems,
      q,
      continent,
      country,
      field,
      funding,
      levels,
      sort,
      page,
      pageSize,
    });
  }, [baseItems, q, continent, country, field, funding, levels, sort, page]);

  // ✅ Load approved list ONCE
  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");

      if (!baseItems || baseItems.length === 0) setLoading(true);

      try {
        const res = await listFundedGraduateAdmissions({
          status: "approved",
          contentType: "FUNDED_GRAD_ADMISSION", // ✅ ADD THIS
          q: "",
          page: 1,
          pageSize: 2000,
        });

        if (!alive) return;

        const next = Array.isArray(res?.items) ? res.items : [];
        setBaseItems(next);

        const source = res?.meta?.source || "api";
        setUsedFallback(source !== "api");

        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load funded graduate admissions");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetFilters = () => {
    setQ("");
    setContinent("All");
    setCountry("All");
    setField("All");
    setFunding("All");
    setLevels([]);
    setSort("newest");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Track interactions (same pattern; doesn't break anything)
  const trackItem = (id, type) => {
    try {
      const sid = String(id || "");
      const t = String(type || "").toLowerCase();
      if (!sid || !t) return;

      const gateKey = `fga:${sid}:${t}`;
      if (!shouldSendTrackOnce(gateKey)) return;

      // Reuse same track endpoint (works because item is still in same API)
      fetch(
        `${import.meta.env.VITE_SCHOLARSHIPS_API_BASE}/api/scholarships/${encodeURIComponent(
          sid
        )}/track`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: t }),
          keepalive: true,
        }
      ).catch(() => {});
    } catch {
      // silent
    }
  };

  // Instant feel: warm detail cache on hover (fire-and-forget)
  const prefetchDetail = (id) => {
    try {
      getFundedGraduateAdmissionById(id)?.catch?.(() => {});
    } catch {
      // ignore
    }
  };

  // AdSense content gate
  const canShowAds = !loading && items.length >= 4;

  return (
  <div className="mx-auto w-full px-3 sm:px-4 pt-0 pb-8">
  <div className="mx-auto w-full max-w-[1400px] flex items-start justify-center gap-4 xl:gap-6"> 

        {/* LEFT ADS */}
<aside className="hidden xl:block w-[200px] shrink-0 mt-[150px]">
  <GoogleSidebarAd
    slot="2515946722"
    enabled={canShowAds}
    keepPlaceholder={true}
    minHeight={450}
  />

  <div
    className="mt-8 sticky top-[280px] overflow-hidden"
    style={{ maxHeight: "calc(100vh - 260px - 24px)" }}
  >
    <GoogleSidebarAd
      slot="2515946722"
      enabled={canShowAds}
      keepPlaceholder={true}
      minHeight={450}
    />
  </div>
</aside>
        {/* CENTER FEED */}
        {/*<main className="w-full max-w-[1056px] shrink-0">*/}
        <main className="w-full min-w-0 max-w-[1056px] shrink">
          {/* FULL-WIDTH header banner */}
          <div
            className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-y border-slate-200 overflow-hidden"
            style={{
              backgroundImage: "url(/images/Scholarship1.webp)",
              backgroundSize: "cover",
              backgroundPosition: "left center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/55 to-slate-900/20" />

            {/*</div><div className="relative z-10 mx-auto max-w-[1400px] px-4 py-3 md:py-4">*/}
            <div className="relative z-10 mx-auto max-w-[1400px] px-3 sm:px-4 py-3 md:py-4">
              <div className="mx-auto max-w-[1056px]">
                
                <h2
  className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-white leading-tight text-center whitespace-nowrap"
  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}
>
  University-Funded programs opportunities for international students
</h2>

                <p
                  /*className="mt-2 text-sm md:text-base font-medium text-white/90"*/
                  className="mt-2 text-xs sm:text-sm md:text-base font-medium text-white/90 max-w-6xl"
                  style={{ textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}
                >
                  {/*Explore fully or partially funded graduate admissions offered directly by universities worldwide.*/}
                  Explore funded academic programs offered directly by universities worldwide, including programs that provide full or partial financial support for Bachelor,master's, and doctoral studies across a wide range of academic disciplines and research fields,and reduce overall graduate cost
                  </p>
                  
              </div>
            </div>
          </div>

          {usedFallback && (
            <div className="mt-3 text-xs rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              Showing cached opportunities for faster loading.
            </div>
          )}

          {/* Controls */}
          {/*<div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3 items-start">*/}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3 items-start">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, university, country…"
              /*className="w-full border border-slate-300 rounded px-3 py-2 text-sm xl:col-span-2"*/
              className="w-full min-w-0 border border-slate-300 rounded px-3 py-2 text-sm xl:col-span-2"
            />

            <select
              value={continent}
              onChange={(e) => {
                setContinent(e.target.value);
                setCountry("All");
                setPage(1);
              }}
              className="border border-slate-300 rounded px-3 py-2 text-sm"
              aria-label="Filter by continent"
            >
              {["All", ...CONTINENT_NAMES].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(1);
              }}
              className="border border-slate-300 rounded px-3 py-2 text-sm"
              aria-label="Filter by country"
            >
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={field}
              onChange={(e) => {
                setField(e.target.value);
                setPage(1);
              }}
              className="border border-slate-300 rounded px-3 py-2 text-sm"
              aria-label="Filter by field of study"
            >
              {["All", ...FIELDS_OF_STUDY].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            {/* Level multi-select */}
            <div className="relative" data-level-popover>
              <button
                type="button"
                onClick={() => setLevelOpen((o) => !o)}
                /*className="w-full text-left text-sm border border-slate-300 rounded px-3 py-2 hover:bg-slate-50 min-w-[160px] flex items-center justify-between gap-2"*/
                className="w-full text-left text-sm border border-slate-300 rounded px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2"
                aria-haspopup="menu"
                aria-expanded={levelOpen ? "true" : "false"}
              >
                <span>Level{levels.length ? ` (${levels.length})` : ""}</span>
                <span className="text-slate-500">▾</span>
              </button>

              {levelOpen && (
                <div
                  className="absolute z-30 mt-1 w-64 rounded border border-slate-200 bg-white shadow"
                  role="menu"
                  data-level-popover
                >
                  <div className="max-h-64 overflow-auto p-2 space-y-1">
                    {LEVEL_OPTIONS.map((opt) => {
                      const checked = levels.includes(opt);
                      return (
                        <label
                          key={opt}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="accent-blue-600"
                            checked={checked}
                            onChange={() => toggleLevel(opt)}
                          />
                          <span className="text-sm text-slate-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setLevels([])}
                      className="text-xs text-slate-600 underline"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setLevelOpen(false)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 hover:bg-slate-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/*<div className="flex gap-2 xl:col-span-2">*/}
            <div className="flex flex-col sm:flex-row gap-2 xl:col-span-2">
              <select
                value={funding}
                onChange={(e) => {
                  setFunding(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-300 rounded px-3 py-2 text-sm flex-1"
                aria-label="Funding type"
              >
                {fundingOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-300 rounded px-3 py-2 text-sm flex-1"
                aria-label="Sort by"
              >
                <option value="newest">Newest</option>
                <option value="deadlineAsc">Deadline (soonest)</option>
                <option value="deadlineDesc">Deadline (latest)</option>
                <option value="title">Title (A–Z)</option>
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="text-sm border border-slate-300 rounded px-3 py-2 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          {/* States */}
          {loading && (
            <div className="mt-6 text-slate-600">
              Loading funded graduate admissions…
            </div>
          )}
          {err && <div className="mt-6 text-red-600">{err}</div>}
          {!loading && !err && items.length === 0 && (
            <div className="mt-6 text-slate-600">No opportunities found.</div>
          )}

          {/* List */}
          <ul className="mt-6 grid gap-3">
            {items.map((s) => {
              const snippet = truncate(stripHtml(s.description || ""), 320);
              const fundingStr = Array.isArray(s.fundingType)
                ? s.fundingType.join(", ")
                : s.fundingType || "";

              const logo = s.providerLogoUrl || s.providerLogoData || "";

              return (
                <li key={s.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                  {/*<div className="flex items-start justify-between gap-4">*/}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/*<div className="min-w-0 flex items-start gap-3">*/}
                    {/*<div className="min-w-0 flex items-start gap-3 flex-1">*/}
                    <div className="min-w-0 flex-1 flex items-start gap-3">
                      {logo ? (
                        <img
                          src={logo}
                          alt={`${s.provider || "University"} logo`}
                          className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded bg-white border border-slate-200 object-contain p-1"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}

                      <div className="min-w-0">
                        <div className="text-base sm:text-lg font-semibold leading-snug break-words">{s.title}</div>
                       
                        <div className="mt-1 text-xs sm:text-sm text-slate-600 leading-6">
  {s.provider ? (
    <span className="font-semibold text-purple-800">{s.provider}</span>
  ) : null}

  {s.country ? (
    <span className="font-semibold text-purple-700">{" • "}{s.country}</span>
  ) : null}

  {s.level ? (
    <span className="font-semibold text-purple-700">{" • "}{s.level}</span>
  ) : null}

  {s.field ? (
    <span className="font-semibold text-purple-700">{" • "}{s.field}</span>
  ) : null}

  {fundingStr ? <span className="font-semibold text-blue-900">{" • "}{fundingStr}</span> : null}
</div>
</div>
</div>

                   

  <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
  {s.amount ? (
    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold whitespace-nowrap">
      Funding: {s.amount}
    </div>
  ) : null}
</div>
</div>
    {s.deadline && (
  <div className="mt-2 text-xs text-slate-500 leading-5 sm:text-right">
    Deadline: {s.deadline}
  </div>
)}

                 
                  {snippet && <p className="mt-3 text-sm leading-6 text-slate-700">{snippet}</p>}
                  <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2">
                    <Link
                      to={`/funded-graduate-admission/${s.id}`}
                      onMouseEnter={() => prefetchDetail(s.id)}
                      onMouseDown={() => prefetchDetail(s.id)}
                      onClick={() => trackItem(s.id, "view")}
                      /*className="text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50"*/
                      className="text-sm border border-slate-300 rounded px-3 py-2 hover:bg-slate-50 text-center"
                    >
                      View details
                    </Link>

                    {s.partnerApplyUrl && (
                      <a
                        href={s.partnerApplyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        /*className="text-sm border border-blue-600 text-blue-600 rounded px-3 py-1.5 hover:bg-blue-50"*/
                        className="text-sm border border-blue-600 text-blue-600 rounded px-3 py-2 hover:bg-blue-50 text-center"
                        onMouseDown={() => trackItem(s.id, "apply")}
                        onClick={() => trackItem(s.id, "apply")}
                      >
                        Apply on University site
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded border border-slate-300 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <div className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </div>
              <button
                className="px-3 py-1.5 text-sm rounded border border-slate-300 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </main>

       {/* RIGHT ADS */}
{/*<aside className="hidden xl:block w-[200px] shrink-0 pt-[150px]">*/}
<aside className="hidden xl:block w-[200px] shrink-0 mt-[150px]">
  <GoogleSidebarAd
    slot="2515946722"
    enabled={canShowAds}
    keepPlaceholder={true}
    minHeight={450}
  />

  <div
    className="mt-8 sticky top-[280px] overflow-hidden"
    style={{ maxHeight: "calc(100vh - 260px - 24px)" }}
  >
    <GoogleSidebarAd
      slot="2515946722"
      enabled={canShowAds}
      keepPlaceholder={true}
      minHeight={450}
    />
  </div>
</aside>
      </div>
    </div>
  );
}