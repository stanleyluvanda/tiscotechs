import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";

const NAVY = "#0B2D5F";
const GOLD = "#C8951F";

function PullQuote({ label, children }) {
  return (
    <div className="my-8 rounded-r-xl border-l-4 border-[#C8951F] bg-[#FBF5E6] px-7 py-6">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#C8951F]">
        {label}
      </div>
      <p className="font-serif text-2xl italic leading-10 text-slate-950">
        {children}
      </p>
    </div>
  );
}

function DoDont() {
  return (
    <div className="my-8 grid gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-green-800">
          Fellowship
        </h3>
        <ul className="mt-5 space-y-5 text-[15px] leading-7 text-slate-900">
          {[
            "Awarded based on future potential and what you will do with the award",
            "Usually comes with structured programme components",
            "Often requires essays, references, proposal, and interview",
            "May require a service commitment after completion",
            "Typically merit-based, not need-based",
            "Usually short-term: weeks to a few years",
            "Provides stipend, travel, living expenses, and professional development",
          ].map((x) => (
            <li key={x} className="pl-7 before:absolute before:-ml-7 before:font-bold before:text-green-700 before:content-['✓']">
              {x}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-red-800">
          Scholarship
        </h3>
        <ul className="mt-5 space-y-5 text-[15px] leading-7 text-slate-900">
          {[
            "Awarded based on past achievement — grades, test scores, awards",
            "Usually reduces or eliminates tuition with fewer structured programme requirements",
            "Can be need-based or merit-based, or both",
            "No service commitment in most cases",
            "Typically does not include mentorship or professional development",
            "Can be renewable year to year across an entire degree",
            "Primarily covers tuition, sometimes accommodation and living costs",
          ].map((x) => (
            <li key={x} className="pl-7 before:absolute before:-ml-7 before:font-bold before:text-red-800 before:content-['×']">
              {x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StepBlock({ n, title, children }) {
  return (
    <div className="my-9 grid grid-cols-[56px_1fr] gap-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0B2D5F] font-serif text-xl font-bold text-white">
        {n}
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-950">{title}</h3>
        <p className="mt-3 text-lg leading-9 text-slate-700">{children}</p>
      </div>
    </div>
  );
}

function FellowshipCard({ color, name, country, badge, meta, text, selects, opens, closes }) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 text-white" style={{ background: color }}>
        <div>
          <h3 className="font-serif text-2xl font-bold">{name}</h3>
          <p className="mt-2 text-sm text-white/85">{country}</p>
        </div>
        <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
          {badge}
        </span>
      </div>

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {meta.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {label}
              </div>
              <div className="mt-3 font-bold text-slate-950">{value}</div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-lg leading-8 text-slate-700">{text}</p>

        <div className="mt-6">
          <div className="text-sm font-bold uppercase tracking-wider text-[#0B2D5F]">
            ✓ What it selects for
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selects.map((x) => (
              <span key={x} className="rounded-full border border-[#F0D9A0] bg-[#FBF5E6] px-4 py-2 text-sm font-medium text-[#7A5A0E]">
                {x}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-dashed border-slate-200 pt-5 md:grid-cols-2">
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">📂 Opens</div>
            <div className="mt-2 font-bold text-slate-950">{opens}</div>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">🔒 Deadline</div>
            <div className="mt-2 font-bold text-slate-950">{closes}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FellowshipGuide() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm lg:px-10">
        <Link to="/scholarship-tips" className="text-[#0B2D5F] hover:underline">
          ← Back to guides
        </Link>
        <span className="mx-4 font-semibold">Tips & Guides › What Is a Fellowship? A Complete Guide for International Students</span>
      </div>

      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-10 lg:grid-cols-[180px_minmax(0,1fr)_180px] lg:px-6">
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-6">
            <GoogleSidebarAd className="w-full" minHeight={600} />
            <GoogleSidebarAd className="w-full" minHeight={600} />
          </div>
        </aside>

        <div className="mx-auto w-full max-w-6xl">
          <GoogleSidebarAd className="mb-8 w-full" minHeight={120} />

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_330px]">
            <article className="max-w-4xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C8951F]">
                Fellowships
              </p>

              <h1 className="mt-6 font-serif text-5xl font-bold leading-tight text-slate-950 md:text-6xl">
                What Is a Fellowship?{" "}
                <span className="italic text-[#0B2D5F]">
                  A Complete Guide for International Students
                </span>
              </h1>

              <div className="mt-7 flex items-center gap-5 border-y border-slate-200 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B2D5F] font-serif font-bold text-white">
                  SK
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-950">ScholarsKnowledge Editorial</div>
                  <div className="text-sm text-slate-500">
                    Updated June 2026 · International students — all levels
                  </div>
                </div>
                <span className="rounded-full bg-[#0B2D5F] px-4 py-2 text-sm font-bold text-white">
                  14 min read
                </span>
              </div>

              <p className="mt-10 text-2xl leading-[2.1] text-[#0B2D5F] first-letter:float-left first-letter:mr-4 first-letter:font-serif first-letter:text-8xl first-letter:font-bold">
                The word "fellowship" appears constantly in the world of international education — on university websites, in scholarship databases, in advisor emails — and yet most students remain uncertain about what a fellowship actually is, how it differs from a scholarship, and whether it is something they should be pursuing. This guide answers all of it, drawing on guidance from Columbia University, Harvard, SFSU, ProFellow, and current program data, so you can decide whether a fellowship belongs in your funding strategy.
              </p>

              {/*<div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">*/}
                <div className="-mx-4 mt-8 overflow-hidden rounded-none border-y border-slate-200 bg-slate-50 shadow-sm sm:mx-0 sm:rounded-2xl sm:border">
  {/*<img
    src="/images/fellowship-guide.png"
    alt="International students researching fellowship and funding opportunities"
    className="h-[260px] w-full object-cover md:h-[420px]"
    loading="eager"
  />*/}
  <img
  src="/images/fellowship-guide.png"
  alt="International students researching fellowship and funding opportunities"
  className="h-[260px] w-full object-cover sm:h-[340px] md:h-[420px]"
  loading="eager"
/>
</div>

              <section id="what" className="pt-14">
                <h2 className="border-b border-slate-200 pb-4 font-serif text-3xl font-bold">
                  What is a fellowship — really?
                </h2>

                <p className="mt-8 text-xl leading-10 text-slate-700">
                  At its core, a fellowship is a <strong>competitive, merit-based, funded opportunity to do something exceptional</strong> — and that definition is deliberately broad, because fellowships themselves are enormously varied. Unlike scholarships, which are essentially financial aid tied to academic record, a fellowship is an investment in a person who shows specific promise for future impact in their field.
                </p>

                <p className="mt-6 text-xl leading-10 text-slate-700">
                  Here is how some of the world's leading fellowship offices put it:
                </p>

                <PullQuote label="Columbia University — Office of Undergraduate Research">
                  "Fellowship is a generic term that encompasses globally and nationally competitive grants, scholarships, and similar funding opportunities. Typically, fellowships fund study, research, or teaching in the U.S. or abroad."
                </PullQuote>

                <PullQuote label="Harvard — Office of Finance FAQ">
                  "A fellowship is any amount paid or allowed to, or for the benefit of, an individual to aid such individual in the pursuit of study or research."
                </PullQuote>

                <PullQuote label="ProFellow — Fellowship Database">
                  "A fellowship is a funded opportunity to do something exceptional. It is funded, competitive, merit-based, short-term, and exceptional."
                </PullQuote>

                <p className="mt-8 text-xl leading-10 text-slate-700">
                  What this means in practice: a fellowship is a short-to-medium-term programme that funds a proposed activity — research, teaching, graduate study, community work, professional development — and selects recipients based on demonstrated <em>potential</em> rather than past grades alone.
                </p>
              </section>

              <GoogleSidebarAd className="my-10 w-full" minHeight={250} />

              <section id="difference" className="pt-10">
                <h2 className="border-b border-slate-200 pb-4 font-serif text-3xl font-bold">
                  Fellowship vs scholarship — the key difference
                </h2>

                <DoDont />

                <p className="mt-8 text-xl leading-10 text-slate-700">
                  It is worth noting that the distinction is not always clean. The Rhodes Scholarship is, technically, a scholarship — but it operates like a fellowship: highly competitive, selecting for extraordinary all-round potential, with structured expectations for leadership, service, and long-term impact.
                </p>
              </section>

              <section id="types" className="pt-12">
                <h2 className="border-b border-slate-200 pb-4 font-serif text-3xl font-bold">
                  Types of fellowships available
                </h2>

                <p className="mt-8 text-xl leading-10 text-slate-700">
                  The range of fellowship programmes is much wider than most students realize. Here is a breakdown of the main categories and what each one typically involves.
                </p>

                {[
                  ["01", "Graduate fellowships", "Provide financial support — stipends, tuition waivers, or both — to students pursuing a Master's or doctoral degree. Can be awarded by the university itself or by external organizations like NSF, AAUW, or Fulbright."],
                  ["02", "Research fellowships", "Fund a specific research project — laboratory work, fieldwork, archival research, or clinical trials — typically for undergraduate or graduate students, or for early-career scholars."],
                  ["03", "Postdoctoral fellowships", "For those who have recently completed a doctoral degree and want to extend their research profile before entering a permanent academic or industry position."],
                  ["04", "Professional and policy fellowships", "Place fellows in government agencies, NGOs, think tanks, international organizations, or companies for a fixed term."],
                  ["05", "Teaching fellowships", "Fund teaching placements — often English language teaching — in schools or universities abroad."],
                  ["06", "Study abroad and language fellowships", "Fund a semester, summer, or full year of international study or intensive language training."],
                  ["07", "Leadership and public service fellowships", "Focused on students and professionals with demonstrated commitment to social change, public service, or community impact."],
                  ["08", "Dissertation fellowships", "Provide a stipend — usually one academic year — specifically for doctoral students in the final writing phase."],
                ].map(([n, title, text]) => (
                  <StepBlock key={n} n={n} title={title}>
                    {text}
                  </StepBlock>
                ))}
              </section>

              <section id="pay" className="pt-12">
                <h2 className="border-b border-slate-200 pb-4 font-serif text-3xl font-bold">
                  What fellowships pay for
                </h2>

                <p className="mt-8 text-xl leading-10 text-slate-700">
                  Fellowship funding packages vary widely, but the most comprehensive programmes cover far more than tuition alone.
                </p>

                <div className="mt-6 divide-y divide-slate-200">
                  {[
                    ["Stipend for living expenses", "Monthly payments covering rent, food, transport, and daily costs."],
                    ["Tuition coverage", "Some fellowships pay full tuition and mandatory fees."],
                    ["Housing", "Many summer programmes provide free on-campus housing."],
                    ["Health insurance", "Common in U.S.-based fellowships."],
                    ["Travel and airfare", "International fellowships typically cover round-trip airfare."],
                    ["Research and conference funding", "Dedicated budgets for lab supplies, fieldwork, archival research, and conference costs."],
                    ["Mentorship and professional development", "Access to senior scholars, industry leaders, workshops, and networks."],
                  ].map(([title, text]) => (
                    <div key={title} className="grid grid-cols-[24px_1fr] gap-4 py-5">
                      <div className="mt-1 h-5 w-5 rounded border-2 border-[#0B2D5F]" />
                      <p className="text-lg leading-8 text-slate-700">
                        <strong className="text-slate-950">{title}:</strong> {text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <GoogleSidebarAd className="my-10 w-full" minHeight={250} />

              <section id="examples" className="pt-12">
                <h2 className="border-b border-slate-200 pb-4 font-serif text-3xl font-bold">
                  Notable fellowships for international students (2026)
                </h2>

                <p className="mt-8 text-xl leading-10 text-slate-700">
                  The following are among the most significant and widely known fellowship programmes available to international students.
                </p>

                <FellowshipCard
                  color="#2856D9"
                  name="Fulbright Foreign Student Program"
                  country="United States — U.S. State Department"
                  badge="Govt. Fellowship"
                  meta={[
                    ["Covers", "Tuition + stipend + health + airfare"],
                    ["Level", "Masters or PhD"],
                    ["Countries", "160+ eligible"],
                  ]}
                  text="The world's most recognized international fellowship. Administered through U.S. embassies and binational Fulbright Commissions."
                  selects={["Academic merit", "Cross-cultural potential", "Leadership", "Home-country impact"]}
                  opens="February – April"
                  closes="May – October"
                />

                <FellowshipCard
                  color="#087F5B"
                  name="AAUW International Fellowship"
                  country="United States — American Association of University Women"
                  badge="Women in STEM"
                  meta={[
                    ["Stipend", "$20,000 (Masters) / $25,000 (PhD)"],
                    ["Level", "Masters or PhD"],
                    ["Eligibility", "Women, non-US citizen"],
                  ]}
                  text="Awarded to women who are not U.S. citizens or permanent residents, pursuing full-time graduate study at U.S. institutions."
                  selects={["Women in STEM", "Academic excellence", "Future contribution to women's empowerment"]}
                  opens="August"
                  closes="November 1"
                />

                <FellowshipCard
                  color="#6D28D9"
                  name="Hubert H. Humphrey Fellowship"
                  country="United States — U.S. Department / IIE"
                  badge="Mid-career professionals"
                  meta={[
                    ["Covers", "Tuition + stipend + housing + travel"],
                    ["Duration", "10 months"],
                    ["Level", "Mid-career professionals"],
                  ]}
                  text="A non-degree programme funded by the U.S. State Department for experienced professionals from developing and transitioning countries."
                  selects={["Professional track record", "Leadership", "Public service commitment", "Home-country return"]}
                  opens="February"
                  closes="May – June"
                />

                <FellowshipCard
                  color="#174A86"
                  name="NSF Graduate Research Fellowship"
                  country="United States — National Science Foundation"
                  badge="STEM research"
                  meta={[
                    ["Stipend", "$37,000/year"],
                    ["Tuition", "$16,000/year allowance"],
                    ["Duration", "3 years over 5"],
                  ]}
                  text="One of the most valuable graduate fellowships available in the United States, supporting exceptional early-career researchers in STEM fields."
                  selects={["Research potential", "Intellectual merit", "Broader societal impact"]}
                  opens="August"
                  closes="October"
                />

                <FellowshipCard
                  color="#D97706"
                  name="Knight-Hennessy Scholars (Stanford)"
                  country="United States — Stanford University"
                  badge="Graduate — all fields"
                  meta={[
                    ["Covers", "Full tuition + living stipend"],
                    ["Level", "Any Stanford graduate program"],
                    ["Cohort size", "~100 scholars/year globally"],
                  ]}
                  text="One of the world's largest fully endowed graduate fellowships, funding scholars across all Stanford graduate and professional schools."
                  selects={["Independent thinking", "Collaborative spirit", "Motivation to serve", "Leadership in your field"]}
                  opens="September"
                  closes="October"
                />


                {/* CHEVENING FELLOWSHIPS */}
<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

  <div className="bg-gradient-to-r from-sky-700 to-blue-900 px-8 py-8 text-white">
    <div className="flex items-start justify-between gap-6">
      <div>
        <h3 className="font-serif text-4xl font-bold">
          Chevening Fellowships
        </h3>

        <p className="mt-2 text-lg text-blue-100">
          United Kingdom — UK Foreign, Commonwealth & Development Office (FCDO)
        </p>
      </div>

      <span className="rounded-full bg-white/20 px-5 py-2 font-semibold">
        Leadership & Policy
      </span>
    </div>
  </div>

  <div className="p-8">

    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl bg-slate-50 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Duration
        </p>
        <p className="mt-3 text-2xl font-bold">
          Short-term Fellowship
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Focus
        </p>
        <p className="mt-3 text-2xl font-bold">
          Leadership & Professional Development
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Host Country
        </p>
        <p className="mt-3 text-2xl font-bold">
          United Kingdom
        </p>
      </div>
    </div>

    <div className="mt-8 space-y-6 text-lg leading-9 text-slate-700">

      <p>
        Chevening Fellowships bring together experienced professionals from
        around the world for fully funded short-term academic and professional
        programmes in the United Kingdom. The initiative helps build lasting
        international partnerships while strengthening leadership skills and
        professional networks.
      </p>

      <p>
        Fellowships are designed for mid-career leaders who have already
        established themselves professionally and are positioned to influence
        policy, research, public service, education, business, or other sectors
        in their home countries.
      </p>

    </div>

    <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50 p-7">
      <h4 className="text-xl font-bold text-blue-900">
        Why universities host Chevening Fellowships
      </h4>

      <ul className="mt-5 space-y-3 text-slate-700">
        <li>• Support internationalisation and strategic academic priorities.</li>
        <li>• Increase institutional visibility in global markets.</li>
        <li>• Strengthen dialogue on international policy and development issues.</li>
        <li>• Build long-term relationships with Chevening alumni worldwide.</li>
        <li>• Expand global impact through collaborations across more than 140 countries and territories.</li>
        <li>• Develop bespoke short courses, research programmes, and executive training.</li>
      </ul>
    </div>

    <div className="mt-10">

      <h4 className="text-xl font-bold text-slate-900">
        Current host institutions
      </h4>

      <div className="mt-6 grid gap-4 md:grid-cols-2">

        <div className="rounded-xl border p-4">British Library</div>
        <div className="rounded-xl border p-4">CLORE Leadership Programme</div>
        <div className="rounded-xl border p-4">Coventry University</div>
        <div className="rounded-xl border p-4">Cranfield Defence Academy</div>
        <div className="rounded-xl border p-4">King's College London</div>
        <div className="rounded-xl border p-4">London School of Economics</div>
        <div className="rounded-xl border p-4">University of Dundee</div>
        <div className="rounded-xl border p-4">University of Oxford</div>
        <div className="rounded-xl border p-4">University of Westminster</div>

      </div>

    </div>

  </div>

</div>
              </section>
              <GoogleSidebarAd
              className="my-10 w-full"
              minHeight={250}
             />

              <section id="apply" className="pt-12">
                <h2 className="border-b border-slate-200 pb-4 font-serif text-3xl font-bold">
                  How to prepare a strong fellowship application
                </h2>

                <p className="mt-8 text-xl leading-10 text-slate-700">
                  Fellowship selection committees are not looking for the most decorated applicant — they are looking for the one who shows the clearest, most credible vision of what they will do with the opportunity.
                </p>

                <h3 className="mt-8 text-xl font-bold text-[#0B2D5F]">
                  What every strong application needs
                </h3>

                <ul className="mt-5 list-disc space-y-5 pl-8 text-xl leading-10 text-slate-700">
                  <li><strong>A proposal or personal statement with a clear, specific purpose:</strong> The more specific and original, the more credible.</li>
                  <li><strong>Strong, specific recommendation letters:</strong> Your recommenders need to show evidence, not only praise.</li>
                  <li><strong>Evidence of potential, not just performance:</strong> Show how your past experience leads logically to the work you are proposing.</li>
                  <li><strong>Tailored language:</strong> Read the fellowship's mission statement and selection criteria word by word.</li>
                </ul>

                <div className="my-8 rounded-r-xl border-l-4 border-[#1A4A8A] bg-blue-50 p-6 text-lg leading-8 text-[#0B2D5F]">
                  <strong>Start earlier than you think you need to.</strong> A typical application timeline: 12 months out — identify 3–5 target fellowships. 9 months out — research requirements. 6 months out — request recommendations. 4 months out — draft. 2 months out — revise. 1 month out — finalize and submit.
                </div>

                <h3 className="mt-8 text-xl font-bold text-[#0B2D5F]">
                  What fellowship committees are actually looking for
                </h3>

                <ul className="mt-5 list-disc space-y-4 pl-8 text-xl leading-9 text-slate-700">
                  <li>Excellence in coursework and academic preparation.</li>
                  <li>Active participation in research, professional work, or community engagement.</li>
                  <li>Evidence of giving back to communities you belong to.</li>
                  <li>A credible record that predicts future potential.</li>
                  <li>Work samples, writing, or demonstrations of ability in your field.</li>
                </ul>
              </section>

              <section id="find" className="pt-12">
                <h2 className="border-b border-slate-200 pb-4 font-serif text-3xl font-bold">
                  How to find the right fellowship for you
                </h2>

                <ul className="mt-6 list-disc space-y-5 pl-8 text-xl leading-10 text-slate-700">
                  <li><strong>Start with your goals, not the award:</strong> Map your goals first, then find fellowships that fund those goals.</li>
                  <li><strong>Go to your campus fellowship or scholarship office:</strong> Many run workshops, review drafts, and conduct practice interviews.</li>
                  <li><strong>Use ProFellow.com:</strong> A large database of fellowship programs across fields and countries.</li>
                  <li><strong>Ask your professors and supervisors:</strong> Faculty know what fellowships exist in your field.</li>
                  <li><strong>Look at your target graduate program’s departmental pages:</strong> Many internal fellowships are announced through departments.</li>
                  <li><strong>Apply even if you are not sure you will win:</strong> Even an unsuccessful application can sharpen your goals.</li>
                </ul>
              </section>

              <GoogleSidebarAd className="mt-10 w-full" minHeight={250} />
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-8">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    In this article
                  </h3>
                  <div className="mt-6 space-y-4 text-base leading-7 text-slate-700">
                    {[
                      ["#what", "What is a fellowship — really?"],
                      ["#difference", "Fellowship vs scholarship — the key difference"],
                      ["#types", "Types of fellowships available"],
                      ["#pay", "What fellowships pay for"],
                      ["#examples", "Notable fellowships for international students"],
                      ["#apply", "How to prepare a strong application"],
                      ["#find", "How to find the right fellowship for you"],
                    ].map(([href, label]) => (
                      <a key={href} href={href} className="block hover:text-[#0B2D5F]">
                        {label}
                      </a>
                    ))}
                  </div>
                </div>

                <GoogleSidebarAd className="w-full" minHeight={300} />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    More guides
                  </h3>
                  <div className="mt-6 space-y-5 text-base">
                    <Link to="/scholarship-tips/how-to-write-winning-sop" className="block hover:text-[#0B2D5F]">
                      <span className="block text-xs font-bold uppercase tracking-widest text-[#C8951F]">Application Documents</span>
                      How to Write a Winning Statement of Purpose
                    </Link>
                    <Link to="/scholarship-tips/recommendation-letters" className="block border-t border-slate-200 pt-5 hover:text-[#0B2D5F]">
                      <span className="block text-xs font-bold uppercase tracking-widest text-[#C8951F]">Letters & References</span>
                      How to Get Strong Recommendation Letters
                    </Link>
                    <Link to="/scholarship-tips/research-proposal" className="block border-t border-slate-200 pt-5 hover:text-[#0B2D5F]">
                      <span className="block text-xs font-bold uppercase tracking-widest text-[#C8951F]">Research Writing</span>
                      How to Write a Research Proposal
                    </Link>
                  </div>
                </div>

                <GoogleSidebarAd className="w-full" minHeight={600} />
              </div>
            </aside>
          </div>

          <GoogleSidebarAd className="mt-10 w-full" minHeight={120} />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-6">
            <GoogleSidebarAd className="w-full" minHeight={600} />
            <GoogleSidebarAd className="w-full" minHeight={600} />
          </div>
        </aside>
      </section>

      <section className="w-full bg-[#0B2D5F] px-6 py-20 text-center text-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-serif text-4xl font-bold">
            Ready to explore fellowship opportunities?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Discover verified fellowship opportunities, research funding,
            graduate programs, and international academic opportunities through ScholarsKnowledge.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/fellowship" className="rounded-full bg-[#C8951F] px-8 py-4 font-bold text-[#0B2D5F]">
              Browse Fellowships
            </Link>
            <Link to="/student-sign-up" className="rounded-full border border-white px-8 py-4 font-bold text-white">
              Join Free
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-slate-200 bg-slate-100">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Fellowship Guide
              </h3>
              <div className="mt-6 space-y-3 text-slate-700">
                <a href="#what" className="block hover:text-[#0B2D5F]">What is a Fellowship?</a>
                <a href="#difference" className="block hover:text-[#0B2D5F]">Fellowship vs Scholarship</a>
                <a href="#types" className="block hover:text-[#0B2D5F]">Types of Fellowships</a>
                <a href="#apply" className="block hover:text-[#0B2D5F]">How to Apply</a>
              </div>
            </div>

            <div className="text-center">
              <h2 className="font-serif text-4xl font-bold">
                <span className="text-[#0B2D5F]">Scholars</span>
                <span className="text-[#C8951F]">Knowledge</span>
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Helping students discover verified fellowships, scholarships,
                graduate opportunities, and expert application guidance.
              </p>
            </div>

            <div className="lg:text-right">
              <Link to="/privacy-policy" className="block hover:text-[#0B2D5F]">Privacy Policy</Link>
              <Link to="/terms-of-use" className="mt-3 block hover:text-[#0B2D5F]">Terms of Use</Link>
              <Link to="/contact" className="mt-3 block hover:text-[#0B2D5F]">Contact</Link>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-300 pt-8 text-center text-slate-500">
            © 2026 ScholarsKnowledge. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}