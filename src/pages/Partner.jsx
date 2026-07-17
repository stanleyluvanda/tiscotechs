// src/pages/Partners.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Partners() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title =
      "Partner With ScholarsKnowledge | List Scholarships and Funding Opportunities";
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* HERO */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0F2A47] via-[#0A4595] to-[#07366F] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white" />
          <div className="absolute -bottom-40 left-10 h-[520px] w-[520px] rounded-full border border-white" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F1DCA6]">
              For universities, foundations and funding providers
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-[58px]">
              List your opportunity where qualified students are looking
            </h1>

            <div className="mt-5 h-1 w-24 rounded-full bg-[#C9962C]" />

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
              ScholarsKnowledge helps universities, foundations, governments,
              nonprofit organizations, and education partners publish
              scholarships, fellowships, and university-funded admission
              opportunities in a clear, structured, student-friendly format.
            </p>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Standard listings are free. Providers can manage opportunities,
              track student engagement, and optionally sponsor selected listings
              for greater visibility.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/partner/signup"
                className="rounded-md bg-[#C9962C] px-6 py-3 text-sm font-bold text-[#0A1D33] transition hover:bg-[#D8AB4B]"
              >
                Create a Provider Account
              </Link>

              <Link
                to="/partner/login"
                className="rounded-md border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
              >
                Provider Login
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-[#F1DCA6]" />
                Free standard listings
              </span>

              <span className="inline-flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-[#F1DCA6]" />
                Provider dashboard
              </span>

              <span className="inline-flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-[#F1DCA6]" />
                Engagement tracking
              </span>
            </div>
          </div>

          {/* LISTING PREVIEW */}
          <div className="rounded-2xl border border-white/20 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Opportunity preview
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  How a published listing may appear
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Approved
              </span>
            </div>

            <div className="pt-5">
              <div className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-[#0A4595]">
                Featured Scholarship
              </div>

              <h2 className="text-xl font-bold leading-7 text-[#0F2A47]">
                Global Leadership Scholarship for International Students
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-600">
                Example International University
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-y border-slate-200 py-5">
                <PreviewField label="Funding" value="Full Funding" />
                <PreviewField label="Deadline" value="October 6, 2026" />
                <PreviewField label="Level" value="Master’s / PhD" />
                <PreviewField label="Country" value="United Kingdom" />
              </dl>

              <div className="mt-5 rounded-lg bg-[#0A4595] px-4 py-3 text-center text-sm font-bold text-white">
                View Opportunity
              </div>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Structured fields help opportunities appear in relevant student
                searches and filters.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* INTRODUCTION */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 border-b border-slate-200 pb-14 md:grid-cols-[230px_1fr] md:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
                Partner With Us
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#0F2A47]">
                Connect your opportunities with global learners
              </h2>
            </div>

            <div className="max-w-3xl">
              <p className="text-base leading-8 text-slate-600">
                ScholarsKnowledge works with credible institutions and
                organizations that provide scholarships, fellowships, grants,
                assistantships, tuition waivers, and admission-linked financial
                support.
              </p>

              <p className="mt-5 text-base leading-8 text-slate-600">
                Our structured publishing system helps students understand who
                can apply, what support is available, when applications close,
                and where to submit an official application. Providers retain
                control of their listings and can update or archive them from
                their dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SCHOLARSKNOWLEDGE */}
      <section className="bg-[#F7F4EC] px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
              Why ScholarsKnowledge
            </p>

            <h2 className="mx-auto mt-3 max-w-3xl font-serif text-3xl font-semibold text-[#0F2A47] md:text-4xl">
              Built so the right students can find the right opportunity
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Clear information, structured search fields, and student-first
              publishing standards make opportunities easier to discover and
              understand.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-0">
            <FeatureColumn
              number="01"
              icon={<GlobeIcon />}
              title="Reach students globally"
              text="Make your scholarship, fellowship, or funded program visible to students searching across countries, study levels, academic fields, and funding categories."
            />

            <FeatureColumn
              number="02"
              icon={<FilterIcon />}
              title="Structured and searchable"
              text="Standardized fields place your opportunity in the relevant filters, helping qualified students find it without searching through unstructured announcements."
              divided
            />

            <FeatureColumn
              number="03"
              icon={<HeartIcon />}
              title="Student-first presentation"
              text="Clear eligibility, funding, deadlines, and application instructions reduce confusion and help students make informed application decisions."
              divided
            />
          </div>
        </div>
      </section>

      {/* DASHBOARD ANALYTICS */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
                Provider Dashboard
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#0F2A47]">
                Understand how your opportunities perform
              </h2>

              <p className="mt-5 text-base leading-8 text-slate-600">
                Your provider dashboard gives you a clear view of how students
                engage with each opportunity you publish. No external tracking
                software or installation is required.
              </p>

              <div className="mt-8 rounded-xl border border-[#C9962C]/30 bg-[#F7F4EC] p-5">
                <h3 className="font-bold text-[#0F2A47]">
                  Per-listing and account-level insights
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Review individual opportunity performance and aggregated
                  engagement across scholarships, fellowships, and funded
                  admission listings.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <MetricCard
                icon={<EyeIcon />}
                title="Listing Views"
                text="See how many students opened and viewed an opportunity."
              />

              <MetricCard
                icon={<SendIcon />}
                title="Apply Clicks"
                text="Track how many students clicked the application action."
              />

              <MetricCard
                icon={<ExternalLinkIcon />}
                title="Website Visits"
                text="Monitor visits sent to your institution or program website."
              />
            </div>
          </div>
        </div>
      </section>

      {/* SPONSORED PLACEMENT */}
      <section className="bg-[#F7F4EC] px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
              Optional Sponsored Placement
            </p>

            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#0F2A47]">
              Give selected opportunities greater visibility
            </h2>

            <p className="mt-5 text-base leading-8 text-slate-600">
              Standard listings remain free. Providers may optionally sponsor a
              selected opportunity to place it prominently above matching search
              results while retaining its normal position in the public list.
            </p>

            <ul className="mt-7 space-y-4">
              <Perk text="Priority placement above relevant standard search results." />
              <Perk text="A clear Sponsored badge maintains transparency for students." />
              <Perk text="The listing still remains available in its regular list position." />
              <Perk text="Views, application clicks, and website visits continue to be tracked." />
            </ul>

            <p className="mt-6 text-sm leading-7 text-slate-500">
              Sponsorship is optional and selected individually for each
              opportunity.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Search results · Master’s · United Kingdom
            </p>

            <div className="mt-4 rounded-xl border border-[#C9962C] bg-[#F7F4EC] p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-bold leading-6 text-[#0F2A47]">
                  Global Leadership Scholarship 2027
                </h3>

                <span className="shrink-0 rounded bg-[#C9962C] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0A1D33]">
                  Sponsored
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                Example International University · Full Funding · Deadline
                October 6, 2026
              </p>
            </div>

            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              All Opportunities
            </p>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <SearchResult
                title="International Graduate Research Award"
                meta="Example University · Research funding"
              />

              <SearchResult
                highlighted
                title="Global Leadership Scholarship 2027"
                meta="Example International University · Full Funding"
              />

              <SearchResult
                title="International Scholars Fellowship"
                meta="Global Education Foundation · Fellowship"
              />
            </div>

            <p className="mt-3 text-xs text-slate-500">
              The same opportunity remains in the standard list.
            </p>
          </div>
        </div>
      </section>

      {/* LISTING STANDARDS */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
              Listing Standards
            </p>

            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#0F2A47]">
              Requirements for every published opportunity
            </h2>

            <p className="mt-5 text-base leading-8 text-slate-600">
              These standards protect students, improve listing quality, and
              help maintain trust across the ScholarsKnowledge platform.
            </p>

            <div className="mt-8 border-l-4 border-[#C9962C] bg-[#F7F4EC] p-5">
              <p className="text-sm leading-7 text-slate-700">
                Submissions may be reviewed before publication. Incomplete,
                misleading, expired, or unverifiable opportunities may be
                rejected or removed.
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            <StandardRule
              status="restricted"
              title="No application fees"
              text="Students must not be charged a fee to access or apply for the listed funding opportunity."
            />

            <StandardRule
              status="restricted"
              title="No confidential data collection"
              text="Bank account details, Social Security numbers, national identification numbers, and similar sensitive data must not be collected through ScholarsKnowledge forms."
            />

            <StandardRule
              status="restricted"
              title="No misleading scholarship claims"
              text="Funding amounts, benefits, eligibility requirements, and deadlines must be presented accurately."
            />

            <StandardRule
              status="approved"
              title="Verified opportunities only"
              text="The scholarship, fellowship, or funded academic program must be authentic and verifiable."
            />

            <StandardRule
              status="approved"
              title="Clear eligibility and funding details"
              text="Applicants must be able to understand who qualifies and what financial support is provided."
            />

            <StandardRule
              status="approved"
              title="Official opportunity and application links"
              text="Links must direct students to an official institution, provider, or authorized application page."
            />

            <StandardRule
              status="approved"
              title="Current contact information"
              text="Providers should maintain a reachable organizational contact and update listings when circumstances change."
            />
          </ul>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#F7F4EC] px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
              Getting Started
            </p>

            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#0F2A47] md:text-4xl">
              Three steps to publish an opportunity
            </h2>
          </div>

          <ol className="relative mt-14 grid gap-10 md:grid-cols-3">
            <div
              className="absolute left-[16.67%] right-[16.67%] top-6 hidden h-px bg-slate-300 md:block"
              aria-hidden="true"
            />

            <ProcessStep
              number="1"
              title="Create a provider account"
              text="Register your university, foundation, organization, or funding institution and access the provider dashboard."
            />

            <ProcessStep
              number="2"
              title="Submit your opportunity"
              text="Add the title, provider, country, study level, field, funding details, eligibility, benefits, deadline, and official links."
            />

            <ProcessStep
              number="3"
              title="Publish, manage and track"
              text="After approval, the listing appears in search and filters. Update it and review engagement from your dashboard."
            />
          </ol>
        </div>
      </section>

      {/* OPPORTUNITY TYPES */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
                What You Can Publish
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#0F2A47]">
                Multiple opportunity types, one provider account
              </h2>

              <p className="mt-5 text-base leading-8 text-slate-600">
                Providers can publish opportunities across the main funding
                categories available on ScholarsKnowledge.
              </p>
            </div>

            <div className="divide-y divide-slate-200 border-y border-slate-200">
              <OpportunityType
                title="Scholarships"
                text="Merit-based, need-based, government, university, foundation, and other verified student funding opportunities."
                route="/scholarships"
              />

              <OpportunityType
                title="Fellowships"
                text="Research, leadership, professional development, visiting scholar, and academic fellowship opportunities."
                route="/fellowships"
              />

              <OpportunityType
                title="University-Funded Admissions"
                text="Graduate programs offering scholarships, assistantships, tuition waivers, stipends, research support, or other admission-linked funding."
                route="/funded-graduate-admission"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-br from-[#0F2A47] to-[#0A1D33] px-4 py-16 text-center text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F1DCA6]">
            Join ScholarsKnowledge
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl font-semibold md:text-4xl">
            Ready to publish your scholarship or funding opportunity?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Join universities, foundations, and education organizations helping
            students find transparent, credible, and accessible funding
            opportunities.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/partner/signup"
              className="rounded-md bg-[#C9962C] px-6 py-3 text-sm font-bold text-[#0A1D33] transition hover:bg-[#D8AB4B]"
            >
              Create a Provider Account
            </Link>

            <Link
              to="/partner/login"
              className="rounded-md border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              Provider Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#0A1D33] px-4 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} ScholarsKnowledge. All Rights Reserved.
      </footer>
    </div>
  );
}

function PreviewField({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-[#0F2A47]">{value}</dd>
    </div>
  );
}

function FeatureColumn({ number, icon, title, text, divided = false }) {
  return (
    <article
      className={[
        divided
          ? "border-t border-slate-300 pt-8 md:border-l md:border-t-0 md:px-8 md:pt-0"
          : "md:pr-8",
      ].join(" ")}
    >
      <span className="font-serif text-sm font-semibold text-[#C9962C]">
        {number}
      </span>

      <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A4595]/10 text-[#0A4595]">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-[#0F2A47]">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function MetricCard({ icon, title, text }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0A4595]/30 hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A4595]/10 text-[#0A4595]">
        {icon}
      </div>

      <h3 className="mt-5 font-bold text-[#0F2A47]">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function Perk({ text }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A4595]/10 text-[#0A4595]">
        <CheckIcon className="h-3 w-3" />
      </span>

      <p className="text-sm leading-7 text-slate-600">{text}</p>
    </li>
  );
}

function SearchResult({ title, meta, highlighted = false }) {
  return (
    <div
      className={[
        "border-t border-slate-100 p-4 first:border-t-0",
        highlighted ? "bg-[#0A4595]/5" : "bg-white",
      ].join(" ")}
    >
      <h3
        className={[
          "text-sm font-semibold",
          highlighted ? "text-[#0A4595]" : "text-[#0F2A47]",
        ].join(" ")}
      >
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">{meta}</p>
    </div>
  );
}

function StandardRule({ status, title, text }) {
  const approved = status === "approved";

  return (
    <li className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={[
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          approved
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700",
        ].join(" ")}
      >
        {approved ? (
          <CheckIcon className="h-4 w-4" />
        ) : (
          <XIcon className="h-4 w-4" />
        )}
      </span>

      <div>
        <h3 className="text-sm font-bold text-[#0F2A47]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </li>
  );
}

function ProcessStep({ number, title, text }) {
  return (
    <li className="relative text-center md:text-left">
      <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0A4595] font-bold text-white ring-8 ring-[#F7F4EC] md:mx-0">
        {number}
      </div>

      <h3 className="mt-6 text-lg font-bold text-[#0F2A47]">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </li>
  );
}

function OpportunityType({ title, text, route }) {
  return (
    <div className="py-6 first:pt-0 last:pb-0">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-lg font-bold text-[#0F2A47]">{title}</h3>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            {text}
          </p>
        </div>

        <Link
          to={route}
          className="shrink-0 border-b-2 border-[#C9962C] pb-1 text-sm font-bold text-[#0A4595] transition hover:text-[#2E6E63]"
        >
          View examples
        </Link>
      </div>
    </div>
  );
}

/* Icons */

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

function GlobeIcon() {
  return (
    <svg {...iconProps} className="h-6 w-6">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20" />
      <path d="M12 2a15.3 15.3 0 0 0 0 20" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg {...iconProps} className="h-6 w-6">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg {...iconProps} className="h-6 w-6">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg {...iconProps} className={className} strokeWidth={3}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function XIcon({ className = "h-4 w-4" }) {
  return (
    <svg {...iconProps} className={className} strokeWidth={3}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}