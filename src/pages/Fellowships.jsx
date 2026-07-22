// src/pages/Fellowships.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { REGIONS } from "../data/regions";
import { FIELDS_OF_STUDY } from "../data/fieldsOfStudy";
import { shouldSendTrackOnce } from "../lib/trackGate";
import {
  listAllScholarships,
  readScholarshipsCache,
} from "../utils/scholarshipsApi";
import GoogleSidebarAd from "../components/GoogleSidebarAd";
import GoogleBannerAd from "../components/GoogleBannerAd";

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

const guides = [
  {
  title: "Scholarships & Funding Opportunities for International Students",
  category: "Scholarships",
  emoji: "🎓",
  time: "Browse",
  link: "/scholarships",
},
{
  title: "University-Funded Admission Opportunities for International Students",
  category: "University Funding",
  emoji: "🏫",
  time: "Browse",
  link: "/funded-graduate-admission",
},
  {
    title: "How to Write and structure a Winning Statement of Purpose",
    category: "Application Documents",
    emoji: "📝",
    time: "12 min read",
    link: "/scholarship-tips/how-to-write-winning-sop",
  },
  {
    title: "How to Get Strong Recommendation Letters",
    category: "Letters & References",
    emoji: "📬",
    time: "9 min read",
    link: "/scholarship-tips/recommendation-letters",
  },
  {
    title: "How to Write a Research Proposal",
    category: "Research Writing",
    emoji: "🔬",
    time: "11 min read",
    link: "/scholarship-tips/research-proposal#what",
  },
  {
    title: "How to Write a Winning Scholarship CV",
    category: "Application Documents",
    emoji: "📄",
    time: "8 min read",
    link: "/scholarship-tips/scholarship-cv#difference",
  },
  {
    title: "Scholarship Interview Questions & Answers",
    category: "Interview Preparation",
    emoji: "🎤",
    time: "13 min read",
    link: "/scholarship-tips/interview-preparation",
  },
  {
    title: "Fully Funded Master's & PhD Application Guide",
    category: "Planning",
    emoji: "🎓",
    time: "15 min read",
    link: "/scholarship-tips/fully-funded-masters-phd-guide",
  },
  {
  title: "STEM MBA Universities & Programs Guide",
  category: "STEM MBA",
  emoji: "💼",
  time: "12 min read",
  link: "/stem-mba-guide#universities",
},
  {
  title: "What Is a Fellowship? A Complete Guide for International Students",
  category: "Fellowships",
  emoji: "🏆",
  time: "14 min read",
  link: "/fellowship-guide#find",
},
  {
    title: "Staying On Track Abroad: What International Students Must Do",
    category: "Study Abroad",
    emoji: "🌍",
    time: "14 min read",
    link: "/scholarship-tips/staying-on-track-abroad",
  },
];

function RelatedGuideLinks() {
  return (
    <div className="pt-2">
      <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#766F60]">
        Related guides
     </p>

      <div className="mt-4 space-y-4">
        {guides.map((guide) => (
          <Link
            key={guide.title}
            to={guide.link}
            className="group block border-b border-[#DCD4C2] pb-4 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">
                {guide.emoji}
              </span>

              <div>
                <p className="text-sm font-bold leading-5 text-[#1E2A3D] group-hover:text-[#B6542C]">
                  {guide.title}
                </p>

                <p className="mt-1 text-xs text-[#766F60]">
                  {guide.category} · {guide.time}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
const res = await listAllScholarships({
  status: "approved",
  contentType: CONTENT_TYPE,
  q: "",
  pageSize: 100,
  view: "summary",
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
     /*<div className="min-h-screen bg-slate-50 pb-10">*/
    <div className="min-h-screen bg-slate-50 pb-10 overflow-x-hidden">
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
  <div className="pointer-events-none absolute right-4 top-4 hidden h-[150px] w-[520px] max-h-[150px] max-w-[520px] overflow-hidden lg:block">
    <GoogleBannerAd reserveSpace={false} />
  </div>

  <div className="max-w-[720px] lg:max-w-[58%]">
    <h1
      className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold leading-tight text-white"
      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}
    >
      Fellowships &amp; Funding Opportunities for International Students
    </h1>

    <p
      className="mt-3 text-sm sm:text-base font-medium text-white/90"
      style={{ textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}
    >
      Explore verified fellowships and funding opportunities offered by universities, foundations, governments, and accredited global providers.
    </p>
  </div>

      </div>
    </section>

    {/*</div><div className="mx-auto max-w-[1400px] px-3 sm:px-4 pt-6">*/}
      <div className="mx-auto max-w-[1400px] px-0 sm:px-4 pt-6">
      {usedFallback && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Showing cached fellowships for faster loading.
        </div>
      )}

      {/* FEATURED FELLOWSHIPS */}
      {featuredItems.length > 0 && (
        /*<section className="mb-5">*/
          <section className="mb-5 px-3 sm:px-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-amber-500">★</span>
            <h2 className="text-lg font-bold text-slate-900">Featured & Sponsored Fellowships</h2>
            <span className="hidden text-sm text-slate-500 sm:inline">
              Hand-picked opportunities from global providers
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
                {featuredItems.map((s) => {
  const logo = s.providerLogoUrl || s.providerLogoData || "";
  const bannerImage = s.imageUrl || s.imageData || "";
  const fundingStr = Array.isArray(s.fundingType)
    ? s.fundingType.join(", ")
    : s.fundingType || s.funding || "";

  const isPremium = s.featuredLevel === "PREMIUM_FEATURED";

  return (
                

                <article
  key={`featured-${s.id}`}
  className="w-[24.25%] min-w-[310px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
>
  <div className="px-4 pt-3">
    <span
      className={[
        "rounded-full px-2 py-1 text-[11px] font-semibold",
        isPremium
          ? "bg-amber-50 text-amber-700"
          : "bg-blue-50 text-blue-700",
      ].join(" ")}
    >
      {isPremium ? "Sponsored" : "Featured"}
    </span>
  </div>

  <div className="p-4">
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
  </div>

  {bannerImage && (
    <div className="h-48 w-full border-y border-slate-200 bg-slate-100">
      <img
        src={bannerImage}
        alt={`${s.provider || "Provider"} banner`}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  )}

  <div className="p-4">
    {fundingStr && (
      <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
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
  </div>
</article>



              );
            })}
          </div>
        </section>
      )}

      {/* Hero search bar */}
<div className="mt-4 rounded-xl border border-white/20 bg-white p-1.5 shadow-lg">
  {/*<div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(220px,1.4fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_100px]">*/}
    <button
  type="button"
  onClick={() => setMobileFiltersOpen((v) => !v)}
  className="flex w-full items-center justify-between rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white lg:hidden"
>
  <span>Search & Filter Fellowships</span>
  <span>{mobileFiltersOpen ? "▲" : "▼"}</span>
</button>

<div
  className={[
    "grid-cols-1 gap-2 lg:grid lg:grid-cols-[minmax(220px,1.4fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_100px]",
    mobileFiltersOpen ? "mt-2 grid" : "hidden lg:grid",
  ].join(" ")}
>
    <input
      value={q}
      onChange={(e) => {
        setQ(e.target.value);
        setPage(1);
      }}
      placeholder="Search fellowship, provider, country..."
      className="w-full min-w-0 rounded-lg border border-slate-300 px-4 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />

    <select
      value={continent}
      onChange={(e) => {
        setContinent(e.target.value);
        setCountry("All");
        setPage(1);
      }}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
          className="absolute z-30 mt-1 w-full sm:w-64 rounded-lg border border-slate-200 bg-white shadow"
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

    <select
      value={sort}
      onChange={(e) => {
        setSort(e.target.value);
        setPage(1);
      }}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    >
      <option value="newest">Sort by Newest</option>
      <option value="deadlineAsc">Deadline (soonest)</option>
      <option value="deadlineDesc">Deadline (latest)</option>
      <option value="title">Title (A–Z)</option>
    </select>

    <button
      type="button"
      onClick={resetFilters}
      className="rounded-lg bg-blue-700 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
    >
      Reset
    </button>
  </div>
</div>



      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden xl:block">
  <div className="sticky top-24">
    <GoogleSidebarAd className="w-full" minHeight={600} />
  </div>
</aside>

      

          <main className="min-w-0">
  {false && canShowAds && (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      {/* Google AdSense responsive banner */}
    </section>
  )}
        <div className="mt-4 px-3 sm:px-0">
  <h2 className="text-base font-bold text-slate-900">
    Explore all fellowship programs for your academic and career development:
    <span className="ml-2 text-sm font-normal text-slate-500">
      {total} opportunities found
    </span>
  </h2>
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
             
                const fullDescription =
  s.descriptionText || stripHtml(s.description || "");

const snippet = truncate(fullDescription, 170);

const fundingStr = Array.isArray(s.fundingType)
  ? s.fundingType.join(", ")
  : s.fundingType || "";
              const logo = s.providerLogoUrl || s.providerLogoData || "";
              const cardImage = s.imageUrl || s.imageData || logo || "";

              return [
  <li
    key={s.id}
    className="rounded-none border-y border-x-0 border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:rounded-xl sm:border sm:p-6"
  >
  <Link
    to={`/fellowship/${s.id}`}
    onClick={() => trackFellowship(s.id, "view")}
    className="mb-4 block text-xl font-semibold leading-tight text-slate-900 hover:text-blue-700 hover:underline sm:text-2xl"
  >
    {s.title}
  </Link>

  <div className="grid gap-4 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1fr)] lg:gap-6 lg:items-start">
    {/*</div><div className="-mx-4 overflow-hidden rounded-none border-y border-slate-200 bg-slate-100 sm:mx-0 sm:rounded-xl sm:border">*/}
      <div className="-mx-4 overflow-hidden rounded-none border-y border-slate-200 bg-slate-100 sm:mx-0 sm:rounded-none sm:border">
      {cardImage ? (
        <img
          src={cardImage}
          alt={`${s.title || "Fellowship"} image`}
          /*className="h-56 w-full rounded-none object-cover sm:h-48 sm:rounded-lg lg:h-52"*/
          className="block h-56 w-full rounded-none object-cover sm:h-48 lg:h-52"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        /*<div className="flex h-52 w-full items-center justify-center rounded-none bg-blue-50 text-2xl font-bold text-blue-700 sm:h-48 sm:rounded-lg lg:h-52">*/
          <div className="flex h-52 w-full items-center justify-center rounded-none bg-blue-50 text-2xl font-bold text-blue-700 sm:h-48 lg:h-52">
          SK
        </div>
      )}
    </div>

    <div className="flex min-h-full flex-col px-4 sm:px-0">
      <div className="space-y-3 text-base font-bold text-slate-900">
        {s.provider && (
          <div className="flex items-start gap-3">
            <span className="text-purple-700">🎓</span>
            <span>{s.provider}</span>
          </div>
        )}

        {s.country && (
          <div className="flex items-start gap-3">
            <span className="text-blue-700">📍</span>
            <span>{s.country}</span>
          </div>
        )}

        {s.deadline && (
          <div className="flex items-start gap-3 text-orange-700">
            <span>📅</span>
            <span>Deadline: {s.deadline}</span>
          </div>
        )}
      </div>
      {snippet && (
  <div className="mt-4 border-t border-slate-200 pt-4">
    <p className="text-base leading-7 text-slate-700">
      {snippet}
      {fullDescription.length > 170 && "... "}
      <Link
        to={`/fellowship/${s.id}`}
        onClick={() => trackFellowship(s.id, "view")}
        className="font-semibold text-blue-700 hover:underline"
      >
        Read more
      </Link>
    </p>
  </div>
)}



    </div>
  </div>

 </li>,

(index + 1) % 2 === 0 ? (
  <li key={`ad-${index}`} className="overflow-hidden">
    <GoogleBannerAd reserveSpace={false} />
  </li>
) : null,
];

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
          {/*<div className="space-y-4">*/}
             <div className="mt-12 space-y-4">
           

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
            <RelatedGuideLinks />
            <GoogleSidebarAd className="w-full" minHeight={600} />
          </div>
        </aside>
      </div>
    </div>

    {/* DISCLAIMER */}
<section className="mt-10 -mx-4 sm:mx-0 border-y border-amber-200 bg-amber-50 px-4 py-6 shadow-sm">
  <div className="mx-auto max-w-[1400px]">
    <h3 className="text-base font-bold text-amber-900">
      Disclaimer
    </h3>

    <p className="mt-2 text-sm leading-7 text-amber-900/90">
      The funding information presented on this page is provided for general
      informational purposes only. Eligibility criteria, application deadlines,
      study levels, participating countries, funding benefits, and application
      procedures may change without prior notice. Applicants are strongly
      advised to verify all information directly with the official university,
      scholarship provider, fellowship organization, or funding institution
      before submitting an application.
    </p>
  </div>
</section>

    {/* FELLOWSHIP CTA */}
{/*<section className="mt-16 bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 px-4 py-12 text-center text-white">*/}
<section className="mt-0 bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 px-4 py-12 text-center text-white">
  <h2 className="text-3xl font-extrabold">
    Advance Your Career with Global Fellowships
  </h2>

  <p className="mx-auto mt-4 max-w-3xl text-lg text-blue-100">
    Explore prestigious fellowships, research grants, leadership programs,
    and professional development opportunities offered by universities,
    governments, foundations, and international organizations worldwide.
  </p>

  <div className="mt-8 flex flex-wrap justify-center gap-4">
   
  </div>
</section>

{/* FELLOWSHIP FOOTER */}
<section className="bg-[#14213D] px-4 py-10 text-white">
  <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">

    <div>
      <h3 className="text-lg font-bold">Fellowships</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <Link to="/fellowships" className="block hover:text-white">
          All Fellowships
        </Link>
        <Link to="/scholarships" className="block hover:text-white">
          Scholarships
        </Link>
        <Link to="/funded-graduate-admission" className="block hover:text-white">
          Funded Graduate Admissions
        </Link>
        <Link to="/scholarship-tips" className="block hover:text-white">
          Application Tips
        </Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">Funding</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <Link to="/fellowships" className="block hover:text-white">
          Research Fellowships
        </Link>
        <Link to="/fellowships" className="block hover:text-white">
          Leadership Fellowships
        </Link>
        <Link to="/fellowships" className="block hover:text-white">
          Professional Fellowships
        </Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">For Organizations</h3>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <Link to="/partner-submit-scholarship" className="block hover:text-white">
          Post a Fellowship
        </Link>
        <Link to="/partner" className="block hover:text-white">
          Partner With Us
        </Link>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold">ScholarsKnowledge</h3>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        Connecting students, researchers, and professionals with trusted
        fellowship opportunities from around the world.
      </p>
    </div>

  </div>
</section>

{/* COPYRIGHT */}
<div className="bg-[#312E81] py-5">
  <div className="mx-auto max-w-7xl px-4 text-center">
    <p className="text-sm text-white">
      © 2026 ScholarsKnowledge
    </p>
  </div>
</div>
  </div>
)};
