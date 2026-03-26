import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import {
  fundingPrograms,
  featuredFundingPrograms
} from "../utils/fundingPrograms";

const HERO_IMAGE = "/images/edufinancing-side.jpg";
const SECTION_LEFT_IMAGE = "/images/funding-programs/funding-overview.jpg";
const SECTION_BOTTOM_IMAGE = "/images/OneOnOne Funding consultation.png";
const SPOTLIGHT_FALLBACK_1 = "/images/Fulbright1.png";
const SPOTLIGHT_FALLBACK_2 = "/images/Chevening.png";
const SPOTLIGHT_FALLBACK_3 = "/images/Commonwealth.png";
const SPOTLIGHT_FALLBACK_4 = "/images/Daad1.png";

function getTypeIcon(type) {
  if (type === "scholarship_program") return "🎓";
  if (type === "loan_provider") return "💰";
  if (type === "database") return "🔎";
  return "🌍";
}

function getTypeBadgeClasses(type) {
  if (type === "scholarship_program") return "bg-blue-600 text-white";
  if (type === "loan_provider") return "bg-emerald-600 text-white";
  if (type === "database") return "bg-violet-600 text-white";
  return "bg-[#0A4595] text-white";
}

function getTypeSoftClasses(type) {
  if (type === "scholarship_program") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (type === "loan_provider") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (type === "database") {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function FundingPrograms() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    return fundingPrograms.filter((item) => {
      const q = search.trim().toLowerCase();

      const matchSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.provider?.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q);

      const matchType = type === "all" || item.type === type;

      return matchSearch && matchType;
    });
  }, [search, type]);

  const spotlightPrograms = useMemo(() => {
  const base = featuredFundingPrograms.length
    ? featuredFundingPrograms
    : fundingPrograms;

  return base.slice(0, 4);
}, []);

  const featuredGrid = useMemo(() => {
    const base = featuredFundingPrograms.length
      ? featuredFundingPrograms
      : fundingPrograms;

    return base.slice(0, 6);
  }, []);

  const leftIntroText =
    "Funding programs include scholarships, fellowships, grants, loans, and trusted search platforms that help students reduce the cost of study. Explore the options below to discover opportunities by provider, funding type, and destination country. Always visit the official source before applying so you can verify the latest eligibility, deadlines, and benefits.";

  return (
    <>
      <div className="bg-[#f7f8fb]">
        {/* FULL-WIDTH HERO */}
        <section className="w-full px-0 pt-4 sm:pt-6">
          <div className="w-full overflow-hidden border-y border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] min-h-[340px] lg:min-h-[430px]">
              <div className="relative min-h-[260px] lg:min-h-full">
                <img
                  src={HERO_IMAGE}
                  alt="Students exploring funding opportunities"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/5 to-transparent" />
              </div>

              <div className="relative bg-[#0A4B78] text-white flex items-center">
                <div className="hidden lg:block absolute left-[-110px] top-0 h-full w-[220px] rounded-r-[220px] bg-[#0A4B78]" />
                <div className="relative z-10 w-full px-6 py-10 sm:px-8 lg:px-12">
                  <h1 className="text-[28px] sm:text-[34px] lg:text-[42px] leading-tight font-extrabold tracking-tight">
                    Funding Programs for International Students
                  </h1>

                  <p className="mt-5 max-w-xl text-[15px] sm:text-[17px] leading-7 text-white/90">
                    Discover scholarships, fellowships, financial aid, and
                    global funding platforms to support your academic journey.
                  </p>

                  <div className="mt-6">
                    <div className="inline-block border-b-[3px] border-[#D6B25E] pb-2">
                      <span className="text-sm sm:text-base font-semibold text-white">
                        Explore trusted funding opportunities
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT WITH NATURAL SIDE SPACE FOR AUTO ADS */}
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
          {/* FILTERS BELOW HERO */}
          <section className="mt-2">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setType("all")}
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  type === "all"
                    ? "bg-[#0A4595] text-white border-[#0A4595]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                🌍 All
              </button>

              <button
                onClick={() => setType("scholarship_program")}
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  type === "scholarship_program"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300"
                }`}
              >
                🎓 Scholarships
              </button>

              <button
                onClick={() => setType("loan_provider")}
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  type === "loan_provider"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300"
                }`}
              >
                💰 Loans
              </button>

              <button
                onClick={() => setType("database")}
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  type === "database"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-300"
                }`}
              >
                🔎 Databases
              </button>
            </div>
          </section>

          {/* CONTINUATION SECTION */}
       <section className="mt-8 max-w-[1160px] mx-auto bg-[#f7f8fb]">
            <div className="text-center">
              <h2
                className="text-[42px] sm:text-[54px] leading-none font-medium text-[#A57900]"
                style={{ fontFamily: '"Brush Script MT", "Segoe Script", cursive' }}
              >
                Explore popular funding options
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-8 lg:gap-10 items-start">
              {/* LEFT LARGE INTRO BLOCK */}
              <div>
                <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <img
                    src={SECTION_LEFT_IMAGE}
                    alt="Students learning about scholarships and funding programs"
                    className="h-[260px] sm:h-[360px] w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div className="mt-5">
                  <h3 className="text-[30px] sm:text-[36px] leading-tight font-extrabold text-[#0A4B78]">
                    Explore available funding sources and plan your next steps
                  </h3>

                  <p className="mt-4 text-[17px] leading-8 text-slate-700 max-w-4xl">
                    {leftIntroText}
                  </p>
                </div>

                {/* NEW LARGE IMAGE UNDER TEXT */}
                <div className="mt-6 overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <img
                    src={SECTION_BOTTOM_IMAGE}
                    alt="Students exploring next steps for scholarships and funding programs"
                    className="h-[260px] sm:h-[340px] lg:h-[420px] w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>

              {/* RIGHT SPOTLIGHT PROGRAMS */}
              <div className="lg:border-l lg:border-slate-300 lg:pl-8 space-y-8">
                {spotlightPrograms.map((item, index) => {
                  const fallbackImage =
  index === 0
    ? SPOTLIGHT_FALLBACK_1
    : index === 1
    ? SPOTLIGHT_FALLBACK_2
    : index === 2
    ? SPOTLIGHT_FALLBACK_3
    : SPOTLIGHT_FALLBACK_4;

                  return (
                    <Link
                      key={item.id}
                      to={`/funding-programs/${item.id}`}
                      className="group block"
                    >
                     <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[150px_1fr] gap-4 items-start">
                        <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
                          <img
                            src={item.bannerUrl || item.logoUrl || fallbackImage}
                            alt={item.title}
                            className="h-[130px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = fallbackImage;
                            }}
                          />
                        </div>

                        <div>
                          <div
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getTypeSoftClasses(
                              item.type
                            )}`}
                          >
                            <span>{getTypeIcon(item.type)}</span>
                            <span>
                              {item.type === "scholarship_program"
                                ? "Scholarship Program"
                                : item.type === "loan_provider"
                                ? "Loan Provider"
                                : item.type === "database"
                                ? "Funding Database"
                                : "Funding Option"}
                            </span>
                          </div>

                          <h3 className="mt-3 text-[28px] leading-tight font-extrabold text-[#0A4B78] group-hover:text-[#0A4595]">
                            {item.title}
                          </h3>

                          <p className="mt-3 text-[17px] leading-8 text-slate-700">
                            {item.summary ||
                              "Explore this funding option and review the official source for the latest information."}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SEARCH */}
          {/*<section className="mt-8">
            <div className="border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <label
                htmlFor="funding-search"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Search funding programs
              </label>
              <input
                id="funding-search"
                type="text"
                placeholder="Search scholarships, fellowships, loans, grants, or funding databases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-[#0A4595] focus:ring-2 focus:ring-[#0A4595]/10"
              />
            </div>
          </section>*/}

          {/* NATURAL IN-CONTENT SPACE FOR AUTO ADS */}
          <section className="mt-8">
            <div className="min-h-[120px]" aria-hidden="true" />
          </section>

          {/* FEATURED GRID */}
          <section className="mt-10 max-w-[1160px] mx-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[24px] sm:text-[28px] font-extrabold text-slate-900">
                Featured funding programs
              </h2>
              <div className="text-sm text-slate-500">
                Trusted and widely recognized options
              </div>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
              {featuredGrid.map((item) => (
                <Link
                  key={item.id}
                  to={`/funding-programs/${item.id}`}
                  className="group relative overflow-hidden border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="absolute right-3 top-3 text-4xl opacity-[0.06]">
                    {getTypeIcon(item.type)}
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeClasses(
                      item.type
                    )}`}
                  >
                    <span>{getTypeIcon(item.type)}</span>
                    <span>
                      {item.type === "scholarship_program"
                        ? "Scholarship"
                        : item.type === "loan_provider"
                        ? "Loan"
                        : item.type === "database"
                        ? "Database"
                        : "Funding"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[22px] leading-tight font-extrabold text-slate-900 group-hover:text-[#0A4595]">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {item.provider}
                  </p>

                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {item.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* NATURAL MID-PAGE SPACE FOR AUTO ADS */}
          <section className="mt-8">
            <div className="min-h-[140px]" aria-hidden="true" />
          </section>

          {/* ALL PROGRAMS */}
         <section className="mt-10 max-w-[1160px] mx-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[24px] sm:text-[28px] font-extrabold text-slate-900">
                All funding programs
              </h2>
              <div className="text-sm text-slate-500">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="border border-slate-200 bg-white p-8 text-center shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  No matching funding programs found
                </h3>
                <p className="mt-2 text-slate-600">
                  Try another keyword or switch to a different category.
                </p>
              </div>
            ) : (
             <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-5">
                {filtered.map((item) => (
                  <Link
                    key={item.id}
                    to={`/funding-programs/${item.id}`}
                   className="group relative overflow-hidden border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="absolute right-3 top-3 text-4xl opacity-[0.06]">
                      {getTypeIcon(item.type)}
                    </div>

                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getTypeSoftClasses(
                        item.type
                      )}`}
                    >
                      <span>{getTypeIcon(item.type)}</span>
                      <span>
                        {item.type === "scholarship_program"
                          ? "Scholarship"
                          : item.type === "loan_provider"
                          ? "Loan"
                          : item.type === "database"
                          ? "Database"
                          : "Funding"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-[22px] leading-tight font-extrabold text-slate-900 group-hover:text-[#0A4595]">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {item.provider}
                    </p>

                    <p className="mt-4 text-sm leading-7 text-slate-700 line-clamp-3">
                      {item.summary}
                    </p>
                  </Link>
                ))}
              </div>
            )}

            {/* DISCLAIMER */}
            <div className="mt-8 border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h3 className="text-base font-bold text-amber-900">
                Disclaimer
              </h3>
              <p className="mt-2 text-sm leading-7 text-amber-900/90">
                Funding information on this page is provided for general
                guidance only. Eligibility, deadlines, study levels,
                participating countries, benefits, and application procedures
                may change at any time. Students should always verify details
                directly from the official provider website before applying.
              </p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </>
  );
}