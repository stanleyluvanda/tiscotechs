// src/pages/Fellowships.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { REGIONS } from "../data/regions";
import { FIELDS_OF_STUDY } from "../data/fieldsOfStudy";
import { shouldSendTrackOnce } from "../lib/trackGate";
import {
  listScholarships,
  readScholarshipsCache,
} from "../utils/scholarshipsApi";

const CONTENT_TYPE = "FELLOWSHIP";
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

const LEVEL_OPTIONS = [
  "Undergraduate",
  "Masters",
  "PhD",
  "Undergraduate / Masters",
  "Masters / PhD",
];

function stripHtml(html = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function truncate(s = "", n = 180) {
  const t = s.trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

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

  if (q.trim()) {
    const qq = q.trim().toLowerCase();
    out = out.filter((s) => {
      const hay = [
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

  if (country && country !== "All") {
    out = out.filter(
      (s) => String(s.country || "").toLowerCase() === country.toLowerCase()
    );
  }

  if (field && field !== "All") {
    out = out.filter(
      (s) => String(s.field || "").toLowerCase() === field.toLowerCase()
    );
  }

  if (levels && levels.length > 0) {
    const setLv = new Set(levels.map((x) => x.toLowerCase()));
    out = out.filter((s) => setLv.has(String(s.level || "").toLowerCase()));
  }

  if (funding && funding !== "All") {
    const fNeedle = funding.toLowerCase();
    out = out.filter((s) => {
      const val = s.fundingType || s.funding;
      if (!val) return false;
      if (Array.isArray(val)) {
        return val.some((v) => String(v).toLowerCase() === fNeedle);
      }
      return String(val).toLowerCase() === fNeedle;
    });
  }

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

export default function Fellowships() {
  const [baseItems, setBaseItems] = useState(() => {
    const cached = readScholarshipsCache("approved", CONTENT_TYPE);
    return cached?.items || [];
  });

  const [loading, setLoading] = useState(() => {
    const cached = readScholarshipsCache("approved", CONTENT_TYPE);
    return !(cached?.items && cached.items.length > 0);
  });

  const [err, setErr] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);

  const [q, setQ] = useState("");
  const [continent, setContinent] = useState("All");
  const [country, setCountry] = useState("All");
  const [field, setField] = useState("All");
  const [funding, setFunding] = useState("All");
  const [searchParams] = useSearchParams();

  const [levels, setLevels] = useState([]);
  const [levelOpen, setLevelOpen] = useState(false);

  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 100;

  useEffect(() => {
    function onDocClick(e) {
      if (!e.target.closest?.("[data-level-popover]")) {
        setLevelOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

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
  }, [searchParams]);

  const countryOptions = useMemo(() => {
    if (continent === "All") {
      const set = new Set();
      for (const c of CONTINENT_NAMES) {
        REGIONS[c].forEach((x) => set.add(x));
      }
      return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }
    return ["All", ...REGIONS[continent]];
  }, [continent]);

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

  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");

      if (!baseItems || baseItems.length === 0) setLoading(true);

      try {
        const res = await listScholarships({
          status: "approved",
          contentType: CONTENT_TYPE,
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
        setErr(e?.message || "Failed to load fellowships");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
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

  const trackFellowship = (id, type) => {
    try {
      const sid = String(id || "");
      const t = String(type || "").toLowerCase();
      if (!sid || !t) return;

      const gateKey = `sch:${sid}:${t}`;
      if (!shouldSendTrackOnce(gateKey)) return;

      fetch(
        `${import.meta.env.VITE_SCHOLARSHIPS_API_BASE}/api/scholarships/${encodeURIComponent(sid)}/track`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: t }),
          keepalive: true,
        }
      ).catch(() => {});
    } catch {
      // silent fail
    }
  };

  const canShowAds = !loading && items.length >= 4;

const featuredItems = useMemo(() => {
  const list = Array.isArray(baseItems) ? baseItems : [];

  return list
    .filter(
      (s) =>
        s.featured === true ||
        s.featuredLevel === "FEATURED" ||
        s.featuredLevel === "PREMIUM_FEATURED"
    )
    .sort((a, b) => {
      const rank = (x) =>
        x?.featuredLevel === "PREMIUM_FEATURED"
          ? 2
          : x?.featuredLevel === "FEATURED"
          ? 1
          : 0;

      return rank(b) - rank(a);
    })
    .slice(0, 8);
}, [baseItems]);

const popularDestinations = [
  { name: "United States", flag: "/images/flags/us.webp" },
  { name: "Canada", flag: "/images/flags/ca.webp" },
  { name: "United Kingdom", flag: "/images/flags/gb.webp" },
  { name: "Australia", flag: "/images/flags/au.webp" },
  { name: "Germany", flag: "/images/flags/de.webp" },
];

  return (
     <div className="min-h-screen bg-slate-50 pb-10">
    {false && canShowAds && (
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-4 py-4">
          <div className="mx-auto max-w-[970px]">
            {/* Real Google AdSense top banner goes here */}
          </div>
        </div>
      </section>
    )}

    {/* HERO */}
    <section
      className="relative border-b border-slate-200 bg-slate-900 bg-cover bg-center"
      style={{ backgroundImage: "url(/images/Scholarship1.webp)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-slate-900/20" />

      <div className="relative mx-auto max-w-[1400px] px-3 sm:px-4 py-5 lg:py-6">
        <div className="max-w-5xl">
          <h1
            className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold leading-tight text-white whitespace-nowrap"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}
          >
            Fellowships &amp; Funding Opportunities for International Students
          </h1>

          <p
            className="mt-3 text-sm sm:text-base font-medium text-white/90 whitespace-nowrap"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}
          >
            Explore verified fellowships and funding opportunities offered by universities, foundations, governments, and accredited global providers.
          </p>
        </div>

        {/* Hero search bar */}
        <div className="mt-4 rounded-xl border border-white/20 bg-white p-1.5 shadow-lg">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(260px,1.7fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_120px]">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, provider, country..."
              className="w-full min-w-0 rounded-lg border border-slate-300 px-4 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Countries" : c}
                </option>
              ))}
            </select>

            <div className="relative" data-level-popover>
              <button
                type="button"
                onClick={() => setLevelOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-1.5 text-left text-sm outline-none hover:bg-slate-50"
              >
                <span>{levels.length ? `Study Level (${levels.length})` : "All Study Levels"}</span>
                <span className="text-slate-500">▾</span>
              </button>

              {levelOpen && (
                <div
                  className="absolute z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow"
                  role="menu"
                  data-level-popover
                >
                  <div className="max-h-64 overflow-auto p-2 space-y-1">
                    {LEVEL_OPTIONS.map((opt) => {
                      const checked = levels.includes(opt);
                      return (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
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
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            <select
              value={funding}
              onChange={(e) => {
                setFunding(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {fundingOptions.map((f) => (
                <option key={f} value={f}>
                  {f === "All" ? "All Funding Types" : f}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setPage(1)}
              className="rounded-lg bg-blue-700 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </section>

    <div className="mx-auto max-w-[1400px] px-3 sm:px-4 pt-6">
      {usedFallback && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Showing cached fellowships for faster loading.
        </div>
      )}

      {/* FEATURED FELLOWSHIPS */}
      {featuredItems.length > 0 && (
        <section className="mb-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-amber-500">★</span>
            <h2 className="text-lg font-bold text-slate-900">Featured Fellowships</h2>
            <span className="hidden text-sm text-slate-500 sm:inline">
              Hand-picked opportunities from global providers
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {featuredItems.map((s) => {
              const logo = s.providerLogoUrl || s.providerLogoData || "";
              const fundingStr = Array.isArray(s.fundingType)
                ? s.fundingType.join(", ")
                : s.fundingType || s.funding || "";

              return (
                <article
                  key={`featured-${s.id}`}
                  className="w-[24.25%] min-w-[310px] shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {logo ? (
                      <img
                        src={logo}
                        alt={`${s.provider || "Provider"} logo`}
                        className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-blue-50 text-lg font-bold text-blue-700">
                        SK
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                        {s.title}
                      </h3>
                      {s.provider && (
                        <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                          {s.provider}
                        </p>
                      )}
                      {s.country && (
                        <p className="mt-1 text-xs text-slate-600">{s.country}</p>
                      )}
                    </div>
                  </div>

                  {fundingStr && (
                    <div className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {fundingStr}
                    </div>
                  )}

                  <Link
                    to={`/fellowship/${s.id}`}
                    onClick={() => trackFellowship(s.id, "view")}
                    className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    View details →
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-xl border border-purple-100 bg-gradient-to-b from-purple-50 to-white p-4 shadow-sm">
            <div className="mb-2 text-xs text-slate-400">Ad</div>
            <h3 className="text-lg font-extrabold leading-6 text-purple-900">
              Find global fellowship opportunities
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Discover research, leadership, and professional fellowships.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <select
                value={continent}
                onChange={(e) => {
                  setContinent(e.target.value);
                  setCountry("All");
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {["All", ...CONTINENT_NAMES].map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All Continents" : c}
                  </option>
                ))}
              </select>

              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {countryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All Countries" : c}
                  </option>
                ))}
              </select>

              <select
                value={field}
                onChange={(e) => {
                  setField(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {["All", ...FIELDS_OF_STUDY].map((f) => (
                  <option key={f} value={f}>
                    {f === "All" ? "All Study Fields" : f}
                  </option>
                ))}
              </select>

              <select
                value={funding}
                onChange={(e) => {
                  setFunding(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {fundingOptions.map((f) => (
                  <option key={f} value={f}>
                    {f === "All" ? "All Funding Types" : f}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="newest">Sort by Newest</option>
                <option value="deadlineAsc">Deadline (soonest)</option>
                <option value="deadlineDesc">Deadline (latest)</option>
                <option value="title">Title (A–Z)</option>
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </section>

          <div className="mt-4">
            <h2 className="text-base font-bold text-slate-900">All Fellowships</h2>
            <p className="text-xs text-slate-500">{total} opportunities found</p>
          </div>

          {loading && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
              Loading fellowships…
            </div>
          )}

          {err && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
              {err}
            </div>
          )}

          {!loading && !err && items.length === 0 && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
              No fellowships found.
            </div>
          )}

          <ul className="mt-3 grid gap-3">
            {items.map((s, index) => {
              const snippet = truncate(stripHtml(s.description || ""), 260);
              const fundingStr = Array.isArray(s.fundingType)
                ? s.fundingType.join(", ")
                : s.fundingType || "";
              const logo = s.providerLogoUrl || s.providerLogoData || "";

              return (
                <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex flex-1 items-start gap-3">
                      {logo ? (
                        <img
                          src={logo}
                          alt={`${s.provider || "Provider"} logo`}
                          className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1 sm:h-16 sm:w-16"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-blue-50 text-sm font-bold text-blue-700 sm:h-16 sm:w-16">
                          SK
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                          {s.title}
                        </h3>

                        <div className="mt-1 text-sm leading-6 text-slate-700">
                          {s.provider && (
                            <span className="font-semibold text-blue-950">{s.provider}</span>
                          )}
                          {s.country && (
                            <span className="font-semibold text-blue-950"> • {s.country}</span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                          {s.level && (
                            <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                              {s.level}
                            </span>
                          )}
                          {fundingStr && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                              {fundingStr}
                            </span>
                          )}
                          {s.deadline && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                              Deadline: {s.deadline}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      {s.amount && (
                        <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Reward: {s.amount}
                        </div>
                      )}
                    </div>
                  </div>

                  {snippet && (
                    <p className="mt-3 text-sm leading-6 text-slate-700">{snippet}</p>
                  )}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link
                      to={`/fellowship/${s.id}`}
                      onClick={() => trackFellowship(s.id, "view")}
                      className="rounded-lg border border-blue-200 px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      View Details
                    </Link>

                    {s.partnerApplyUrl && (
                      <a
                        href={s.partnerApplyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        Apply on Provider Site ↗
                      </a>
                    )}
                  </div>

                  {false && canShowAds && index === 1 && (
                    <div>{/* Real Google AdSense in-feed ad goes here */}</div>
                  )}
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <div className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </div>
              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </main>

        <aside className="hidden xl:block">
          <div className="space-y-4">
            <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 shadow-sm">
              <div className="mb-2 text-xs text-slate-400">Ad</div>
              <h3 className="text-lg font-extrabold leading-6 text-purple-900">
                Advance your academic career.
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Fellowships can support research, travel, leadership, and professional growth.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Popular Study Destinations</h3>

              <div className="mt-3 space-y-2">
                {popularDestinations.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setCountry(item.name);
                      const inferred = COUNTRY_TO_CONTINENT[item.name.toLowerCase()];
                      if (inferred) setContinent(inferred);
                      setPage(1);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <img
                      src={item.flag}
                      alt={item.name}
                      className="h-5 w-8 rounded border border-slate-200 object-cover"
                      loading="lazy"
                    />
                    <span>Study in {item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Fellowship Tips</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="font-semibold text-blue-800">
                  Prepare a clear research or leadership statement
                </div>
                <div className="font-semibold text-blue-800">
                  Check eligibility and nomination requirements early
                </div>
                <div className="font-semibold text-blue-800">
                  Collect strong recommendation letters
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
)};
