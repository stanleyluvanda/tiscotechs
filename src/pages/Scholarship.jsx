// src/pages/Scholarship.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { REGIONS } from "../data/regions";
import { FIELDS_OF_STUDY } from "../data/fieldsOfStudy";
import { listScholarships } from "../utils/scholarshipsApi"; // ✅ unified source (API + fallback)

const CONTINENT_NAMES = Object.keys(REGIONS);

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

  // Continent -> if present on item
  if (continent && continent !== "All") {
    out = out.filter((s) => (s.continent || "All") === continent);
  }

  // Country
  if (country && country !== "All") {
    out = out.filter((s) => String(s.country || "").toLowerCase() === country.toLowerCase());
  }

  // Field
  if (field && field !== "All") {
    out = out.filter((s) => String(s.field || "").toLowerCase() === field.toLowerCase());
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
      if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase() === fNeedle);
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
    out.sort((a, b) => new Date(a.deadline || "2100-01-01") - new Date(b.deadline || "2100-01-01"));
  } else if (sort === "deadlineDesc") {
    out.sort((a, b) => new Date(b.deadline || "1900-01-01") - new Date(a.deadline || "1900-01-01"));
  } else if (sort === "title") {
    out.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }

  const total = out.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return { items: out.slice(start, end), total };
}

export default function Scholarship() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [usedFallback, setUsedFallback] = useState(false); // informational banner

  // Filters / sorting / pagination
  const [q, setQ] = useState("");
  const [continent, setContinent] = useState("All");
  const [country, setCountry] = useState("All");
  const [field, setField] = useState("All");
  const [funding, setFunding] = useState("All");

  // ⭐ Level as multi-select stored in array, shown via compact dropdown
  const [levels, setLevels] = useState([]);
  const [levelOpen, setLevelOpen] = useState(false);

  // Default to NEWEST so fresh posts appear first
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 100;

  // Close the level dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!e.target.closest?.("[data-level-popover]")) {
        setLevelOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Country options depend on continent
  const countryOptions = useMemo(() => {
    if (continent === "All") {
      const set = new Set();
      for (const c of CONTINENT_NAMES) REGIONS[c].forEach((x) => set.add(x));
      return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }
    return ["All", ...REGIONS[continent]];
  }, [continent]);

  // Funding options inferred from current results
  const fundingOptions = useMemo(() => {
    const set = new Set();
    items.forEach((s) => {
      const val = s.fundingType || s.funding;
      if (!val) return;
      if (Array.isArray(val)) val.forEach((v) => v && set.add(String(v)));
      else set.add(String(val));
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const levelCsv = useMemo(
    () => (levels.length > 0 ? levels.join(",") : ""),
    [levels]
  );

  // ✅ Load from the unified source (API if present, otherwise local)
  //    Always request only APPROVED items; then apply your existing client filters.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");

      try {
        // Pull a generous page from the unified source (already merged admin/partner)
        const { items: baseItems } = await listScholarships({
          status: "approved",
          // We still pass q for a cheap server-side filter when API exists,
          // but we'll re-apply all filters client-side to keep current behavior identical.
          q,
          page: 1,
          pageSize: 1000,
        });

        if (!alive) return;

        const { items: filtered, total } = filterSortPaginate({
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

        setItems(filtered);
        setTotal(total);
        setUsedFallback(false); // we can't know from helper; keep banner off by default
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Failed to load scholarships");
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [q, continent, country, field, funding, levels, levelCsv, sort, page]);

  const resetFilters = () => {
    setQ("");
    setContinent("All");
    setCountry("All");
    setField("All");
    setFunding("All");
    setLevels([]);
    setSort("newest"); // keep newest as default
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Toggle a checkbox value in levels
  const toggleLevel = (val) => {
    setLevels((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
    setPage(1);
  };

  return (
    <div className="mx-auto px-4 py-8 max-w-[1056px]">
      <h1 className="text-2xl font-bold">Scholarships</h1>
      <p className="mt-1 text-slate-600">
        Browse scholarships from partner universities and external providers.
      </p>

      {/* Optional subtle banner if you want to surface fallback mode; left off by default */}
      {usedFallback && (
        <div className="mt-3 text-xs rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
          Showing scholarships from your device (offline/fallback mode).
        </div>
      )}

      {/* Controls */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3 items-start">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by title, provider, country…"
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm xl:col-span-2"
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

        {/* ⭐ Level multi-select as a compact dropdown */}
        <div className="relative" data-level-popover>
          <button
            type="button"
            onClick={() => setLevelOpen((o) => !o)}
            className="w-full text-left text-sm border border-slate-300 rounded px-3 py-2 hover:bg-slate-50 min-w-[160px] flex items-center justify-between gap-2"
            aria-haspopup="menu"
            aria-expanded={levelOpen ? "true" : "false"}
          >
            <span>
              Level{levels.length ? ` (${levels.length})` : ""}
            </span>
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
                        onChange={() => {
                          toggleLevel(opt);
                        }}
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

        <div className="flex gap-2 xl:col-span-2">
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
      {loading && <div className="mt-6 text-slate-600">Loading scholarships…</div>}
      {err && <div className="mt-6 text-red-600">{err}</div>}
      {!loading && !err && items.length === 0 && (
        <div className="mt-6 text-slate-600">No scholarships found.</div>
      )}

      {/* List */}
      <ul className="mt-6 grid gap-3">
        {items.map((s) => {
          const snippet = truncate(stripHtml(s.description || ""), 200);
          const fundingStr = Array.isArray(s.fundingType)
            ? s.fundingType.join(", ")
            : (s.fundingType || "");
          return (
            <li key={s.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-semibold">{s.title}</div>
                  <div className="mt-0.5 text-sm text-slate-600">
                    {s.provider}
                    {s.country ? ` • ${s.country}` : ""}
                    {s.level ? ` • ${s.level}` : ""}
                    {s.field ? ` • ${s.field}` : ""}
                    {fundingStr ? ` • ${fundingStr}` : ""}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {s.amount ? (
                    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                      Reward: {s.amount}
                    </div>
                  ) : null}
                  {s.deadline && (
                    <div className="text-xs text-slate-500">Deadline: {s.deadline}</div>
                  )}
                </div>
              </div>

              {/* Description snippet */}
              {snippet && (
                <p className="mt-3 text-sm text-slate-700">
                  {snippet}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/scholarship/${s.id}`}
                  className="text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50"
                >
                  View details
                </Link>
                {s.partnerApplyUrl && (
                  <a
                    href={s.partnerApplyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm border border-blue-600 text-blue-600 rounded px-3 py-1.5 hover:bg-blue-50"
                  >
                    Apply on Provider site
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
    </div>
  );
}