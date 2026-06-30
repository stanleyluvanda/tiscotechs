
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";



const scholarshipLinks = {
  fulbright:
    "https://foreign.fulbrightonline.org/about/foreign-student-program",
  erasmus:
    "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters",
  daad:
    "https://www.daad.de/stipdb-redirect/",
  commonwealth:
    "https://cscuk.fcdo.gov.uk/",
  csc:
    "https://www.campuschina.org/",
};

const scholarshipProfiles = [
  {
  name: "Fulbright Foreign Student Program",
  location: "United States",
  level: "Master's / PhD",
  coverage: "Tuition, living stipend, travel, health benefits",
  bestFor: "Applicants with clear academic goals and public-service impact",
  selectsFor: [
    "Leadership",
    "Academic fit",
    "Public service",
    "Cross-cultural exchange",
  ],
  officialUrl: scholarshipLinks.fulbright,
},
  {
  name: "Erasmus Mundus Joint Masters",
  location: "Europe",
  level: "Master's",
  coverage: "Tuition, monthly allowance, travel support",
  bestFor: "Students targeting structured joint degrees across European universities",
  selectsFor: [
    "Academic excellence",
    "Program fit",
    "International motivation",
    "Career clarity",
  ],
  officialUrl: scholarshipLinks.erasmus,
},
  {
  name: "DAAD Scholarships",
  location: "Germany",
  level: "Master's / PhD",
  coverage: "Monthly stipend, insurance, travel allowance, possible tuition support",
  bestFor: "Applicants with strong academic records and development-oriented goals",
  selectsFor: [
    "Academic record",
    "Development relevance",
    "Motivation",
    "Feasibility",
  ],
  officialUrl: scholarshipLinks.daad,
},
  {
    name: "Commonwealth Scholarships",
    location: "United Kingdom",
    level: "Master's / PhD",
    coverage: "Tuition, stipend, airfare, thesis/research support where applicable",
    bestFor: "Applicants from eligible Commonwealth countries with development impact",
    selectsFor: ["Development impact", "Academic merit", "Leadership", "Return contribution"],
    officialUrl: scholarshipLinks.commonwealth,
  },
  {
    name: "Chinese Government Scholarship",
    location: "China",
    level: "Master's / PhD",
    coverage: "Tuition, accommodation, stipend, medical insurance",
    bestFor: "Students applying broadly across Chinese universities and programs",
    selectsFor: ["Academic readiness", "Program fit", "Recommendation strength", "Application completeness"],
    officialUrl: scholarshipLinks.csc,
  },
];

const applicationStages = [
  {
    title: "Identify the right programs before writing documents",
    body:
      "The biggest mistake is starting with documents before choosing programs. Your Statement of Purpose, CV, recommendation letters, and research proposal should all respond to the exact scholarship and university you are targeting.",
  },
  {
    title: "Study what each scholarship actually selects for",
    body:
      "A Fulbright application is not the same as a DAAD, Erasmus Mundus, Commonwealth, Chevening, CSC, or university-funded application. Each funder has a mission. Your application must show that your goals match that mission.",
  },
  {
    title: "Build one strong master file, then customize",
    body:
      "Create one master CV, one master achievement list, one core personal story, and one research or career direction. Then customize each application instead of rewriting everything from zero.",
  },
  {
    title: "Prepare recommenders early",
    body:
      "Strong recommendation letters need context. Give each recommender your CV, draft SOP, scholarship criteria, deadline, and a short list of evidence they can mention.",
  },
  {
    title: "Check eligibility and document rules before submission",
    body:
      "Many strong applicants are rejected before review because of missing transcripts, wrong file formats, expired tests, incomplete references, or essays that ignore the prompt.",
  },
];

const comparisonRows = [
  ["Fulbright", "United States", "Master's / PhD", "Leadership, academic fit, public service"],
  ["Erasmus Mundus", "Europe", "Master's", "Academic excellence and program fit"],
  ["DAAD", "Germany", "Master's / PhD", "Academic record and development relevance"],
  ["Commonwealth", "United Kingdom", "Master's / PhD", "Development impact and leadership"],
  ["CSC", "China", "Master's / PhD", "Academic readiness and complete documentation"],
];

const mistakes = [
  [
    "Applying to scholarships before choosing a clear academic direction",
    "Fully funded applications are strongest when your target program, proposed goals, documents, and recommendation letters all point in the same direction.",
  ],
  [
    "Using one generic Statement of Purpose for every application",
    "Every scholarship has a different mission. Your final paragraph should make it obvious that the essay was written for that specific opportunity.",
  ],
  [
    "Treating the CV like a job resume",
    "A scholarship CV should foreground academic achievement, research, leadership, publications, awards, community impact, and relevant professional experience.",
  ],
  [
    "Asking recommenders too late",
    "A rushed letter is usually generic. Ask early and give your recommender enough evidence to write something specific.",
  ],
  [
    "Ignoring small instructions",
    "Word count, document naming, file format, referee submission rules, and deadline time zones matter. Scholarship systems often reject incomplete files automatically.",
  ],
  [
    "Applying everywhere without strategy",
    "Three to five well-matched applications are usually stronger than fifteen rushed applications with weak fit.",
  ],
];

const checklist = [
  "I have confirmed that I meet every eligibility requirement.",
  "My target program clearly matches my academic or professional goals.",
  "My SOP explains why this scholarship, this program, and this timing make sense.",
  "My CV is academic and scholarship-focused, not only job-focused.",
  "My recommenders have my CV, draft SOP, scholarship criteria, and deadline.",
  "My research proposal is narrow, feasible, and connected to faculty or program strengths.",
  "Every document follows the required word count, file format, and naming instructions.",
  "I have checked the deadline time zone and submitted before the final day.",
];

export default function FullyFundedMastersPhDApplicationGuide() {

  const [openFaq, setOpenFaq] = useState(null);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="text-sm text-slate-500">
          <Link to="/home" className="hover:text-blue-900">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/scholarship" className="hover:text-blue-900">Scholarship Tips</Link>
          <span className="mx-2">›</span>
          <span>Fully Funded Master's &amp; PhD Guide</span>
        </div>

        <div className="mt-10 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800">
          Scholarship Tips &amp; Guides
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
          Fully Funded{" "}
          <span className="italic text-[#163A70]">Master&apos;s &amp; PhD</span>{" "}
          Application Guide
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
          A complete end-to-end guide for international students applying for fully
          funded graduate study abroad — from choosing the right scholarships to
          preparing documents, approaching recommenders, and submitting a competitive
          application.
        </p>

        {/* DESKTOP TOP-RIGHT GOOGLE AD */}
<div className="hidden xl:block">
  <div className="absolute right-4 top-[145px] w-[320px]">
    <GoogleSidebarAd
      slot="8562818627"
      label=""
      className="bg-transparent"
      minHeight={280}
      keepPlaceholder={false}
    />
  </div>
</div>
        <div className="mt-8 flex max-w-[720px] items-center justify-between border-y border-slate-200 py-6">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#163A70] font-serif text-lg font-bold text-white">
              SK
            </div>

            <div className="ml-4 flex-1">
              <p className="font-bold text-slate-950">
                ScholarsKnowledge Editorial
              </p>

              <p className="text-sm text-slate-500">
                Updated June 2026 · Applies to Fulbright, Erasmus Mundus,
                DAAD, Commonwealth, CSC &amp; more
              </p>
            </div>
          </div>

          <span className="whitespace-nowrap rounded-full bg-[#163A70] px-4 py-2 text-sm font-bold text-white">
            15 min read
          </span>
        </div>

        {/* HERO IMAGE + RIGHT RESPONSIVE GOOGLE AD */}
        <div className="mt-8 mb-2 flex items-start gap-8">
          <div className="max-w-[720px] flex-1">
            <img
  src="/images/Scholarship1.webp"
  alt="International students graduating from a university abroad"
  className="h-[280px] w-full rounded-2xl object-cover shadow-sm md:h-[380px]"
/>
          </div>

          {/* GOOGLE ADS - IMAGE RIGHT */}
<div className="hidden w-[320px] shrink-0 xl:block">
  <GoogleSidebarAd
    slot="8562818627"
    label=""
    className="bg-transparent"
    minHeight={280}
    keepPlaceholder={false}
  />
</div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="max-w-3xl">
            <section id="possible" className="mt-6">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Is a fully funded Master&apos;s or PhD really possible?
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700 first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-6xl first-letter:font-bold first-letter:leading-none first-letter:text-[#163A70]">
                Yes. Fully funded graduate study is possible, but it is rarely won
                by simply having good grades. Competitive scholarships usually look
                for a clear academic direction, strong evidence of leadership or
                impact, a realistic future plan, and documents that explain why the
                opportunity is the right fit.
              </p>

              <p className="mt-5 text-lg leading-9 text-slate-700">
                A fully funded scholarship normally covers tuition and may also
                include a monthly stipend, health insurance, travel support, visa
                support, research funding, or settlement allowances. The exact package
                depends on the scholarship, country, university, and degree level.
              </p>

              <div className="mt-8 overflow-hidden rounded-xl border border-blue-100 border-l-[6px] border-l-[#163A70] bg-blue-50">
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">
                    Key Insight
                  </h3>

                  <p className="mt-3 text-base leading-8 text-[#163A70]">
                    The strongest applicants do not start by asking, “Where can I
                    get funding?” They start by asking, “Which programs and funders
                    are most aligned with my academic direction, leadership record,
                    and future contribution?”
                  </p>
                </div>
              </div>
            </section>
            <GoogleSidebarAd
                slot="8562818627"
                label=""
                 className="my-10 bg-transparent"
                 minHeight={250}
                keepPlaceholder={false}
               />

            <hr className="my-12 border-slate-200" />

            <section id="programs">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Stage 1 — Identify the right programs before writing documents
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Your application documents should be built around a target. Before
                writing your SOP or research proposal, identify the countries,
                universities, departments, supervisors, and scholarship programs that
                match your profile.
              </p>

              <div className="mt-8 grid gap-5">
                {applicationStages.map((stage, index) => (
                  <div key={stage.title} className="grid grid-cols-[56px_1fr] gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#163A70] font-serif text-xl font-bold text-white">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-950">
                        {stage.title}
                      </h3>
                      <p className="mt-4 text-lg leading-9 text-slate-700">
                        {stage.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-10 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
               />

            <hr className="my-12 border-slate-200" />

            <section id="scholarships">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Stage 2 — Understand what each scholarship selects for
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Fully funded scholarships are not interchangeable. Each program has
                a different purpose, selection culture, and evidence standard. Your
                application should reflect that difference.
              </p>

              <div className="mt-8 space-y-5">
                {scholarshipProfiles.map((item) => (
                  <div key={item.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="bg-[#163A70] px-5 py-4 text-white">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-2xl font-bold">
                            {item.name}
                          </h3>
                          <p className="mt-1 text-sm text-white/75">
                            {item.location}
                          </p>
                        </div>

                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                          {item.level}
                        </span>

                             </div>
                    </div>

                    <div className="p-5">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Coverage
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                            {item.coverage}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Best for
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                            {item.bestFor}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
    Selects for
  </p>

  <div className="mt-2 flex flex-wrap gap-2">
    {item.selectsFor.map((tag) => (
      <span
        key={tag}
        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
      >
        {tag}
      </span>
    ))}
  </div>
</div>

{/* Grid ends */}
</div>

{/* Official scholarship link */}
<div className="mt-5 border-t border-slate-200 pt-5">
  <a
    href={item.officialUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center rounded-full border border-[#163A70] px-4 py-2 text-sm font-bold text-[#163A70] transition hover:bg-[#163A70] hover:text-white"
  >
    Visit official scholarship page →
  </a>
</div>

{/* p-5 ends */}
</div>
                  </div>
                ))}
              </div>
            </section>
            <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-10 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
           />

            <hr className="my-12 border-slate-200" />

            <section id="comparison">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Quick comparison of major fully funded scholarships
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Use this comparison to decide which scholarships deserve the most
                attention in your application strategy.
              </p>

              <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[1.1fr_1fr_1fr_2fr] bg-[#163A70] text-sm font-bold uppercase tracking-widest text-white">
                    <div className="p-4">Scholarship</div>
                    <div className="p-4">Destination</div>
                    <div className="p-4">Level</div>
                    <div className="p-4">Main selection emphasis</div>
                  </div>

                  {comparisonRows.map(([name, destination, level, emphasis]) => (
                    <div
                      key={name}
                      className="grid grid-cols-[1.1fr_1fr_1fr_2fr] border-t border-slate-200 odd:bg-slate-50"
                    >
                      <div className="p-4 font-bold text-slate-950">{name}</div>
                      <div className="p-4 text-slate-700">{destination}</div>
                      <div className="p-4 text-slate-700">{level}</div>
                      <div className="p-4 text-slate-700">{emphasis}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-10 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
           />

            <hr className="my-12 border-slate-200" />

            <section id="documents">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Stage 3 — Build the documents every strong application needs
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Most fully funded Master&apos;s and PhD applications require a
                combination of academic records, essays, recommendation letters, and
                supporting documents. PhD and research Master&apos;s applications may
                also require a research proposal or supervisor contact.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-blue-200 border-l-[6px] border-l-[#163A70] bg-blue-50">
                  <div className="p-6">
                    <h3 className="font-bold text-[#163A70]">
                      Key Insight — your documents must agree with each other
                    </h3>

                    <p className="mt-4 leading-8 text-slate-700">
                      Your SOP, CV, recommendation letters, and research proposal
                      should not feel like separate documents from different people.
                      They should reinforce the same academic direction and future
                      contribution.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-red-200 border-l-[6px] border-l-red-700 bg-red-50">
                  <div className="p-6">
                    <h3 className="font-bold text-red-800">
                      Common Mistake — writing documents too broadly
                    </h3>

                    <p className="mt-4 leading-8 text-slate-700">
                      Statements like “I want to contribute to development” are too
                      general. Committees need to see the specific field, problem,
                      population, method, institution, and pathway you are targeting.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-200 border-l-[6px] border-l-emerald-700 bg-emerald-50">
                <div className="p-6">
                  <h3 className="font-bold text-emerald-800">
                    Pro Tip — create a scholarship evidence bank
                  </h3>

                  <p className="mt-4 leading-8 text-slate-700">
                    Before drafting essays, create a document with your strongest
                    academic achievements, leadership examples, research projects,
                    awards, publications, work impact, volunteer work, and future
                    goals. This makes every application faster and more specific.
                  </p>
                </div>
              </div>
            </section>
           <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-10 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
           />

            <hr className="my-12 border-slate-200" />

            <section id="mistakes">
  <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
    Common mistakes that weaken fully funded applications
  </h2>

  {[
    [
      "1. Applying to scholarships you are not eligible for",
      "Before writing any document, confirm citizenship, degree level, academic background, work experience, age limits, and country-specific rules.",
    ],
    [
      "2. Using the same SOP everywhere",
      "A fully funded application must be customized. Committees can tell when you only changed the scholarship name.",
    ],
    [
      "3. Ignoring the scholarship’s mission",
      "Rhodes, Chevening, Fulbright, DAAD, Commonwealth, Erasmus Mundus, and RTP do not select candidates for exactly the same reasons.",
    ],
    [
      "4. Submitting vague goals",
      "Saying you want to help your country is not enough. Name the problem, the people affected, and the realistic path you plan to take.",
    ],
    [
      "5. Waiting too long to contact recommenders",
      "Strong recommendation letters require time, context, and specific examples. Ask early and brief your recommenders properly.",
    ],
  ].map(([title, text]) => (
    <div key={title} className="mt-7">
      <h3 className="text-lg font-bold text-[#163A70]">{title}</h3>
      <p className="mt-2 text-lg leading-8 text-slate-700">{text}</p>
    </div>
  ))}
</section>

            <hr className="my-12 border-slate-200" />

            <section id="faq">
  <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
    Frequently asked questions
  </h2>

  <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
    {[
      [
        "Can I get a fully funded Master’s scholarship with a low GPA?",
        "Yes, but it depends on the scholarship. Some programs are highly grade-focused, while others weigh leadership, work experience, research fit, or development impact more heavily. A lower GPA must be balanced by strong evidence elsewhere.",
      ],
      [
        "Do I need admission before applying for a scholarship?",
        "It depends. Some scholarships require a university offer first, while others combine scholarship and admission review. Always check the official scholarship instructions before applying.",
      ],
      [
        "How many scholarships should I apply for?",
        "A focused list of 3–5 strong matches is usually better than 15 weak applications. Quality matters more than volume.",
      ],
      [
        "Do PhD applicants need to contact supervisors first?",
        "Often yes, especially for research-based programs in Australia, Canada, the UK, and Europe. Some structured scholarship programs do not require it at the first stage.",
      ],
      [
        "When should I start preparing?",
        "Start at least three months before the deadline. Six months is better if you need test scores, transcripts, supervisor contact, or a research proposal.",
      ],
    ].map(([question, answer], index) => {
      const isOpen = openFaq === index;

      return (
        <div key={question} className="py-5">
          <button
            type="button"
            onClick={() => setOpenFaq(isOpen ? null : index)}
            className="flex w-full items-center justify-between gap-6 text-left"
          >
            <span className="text-lg font-bold text-slate-950">
              {question}
            </span>

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl font-bold text-[#163A70]">
              {isOpen ? "−" : "+"}
            </span>
          </button>

          {isOpen && (
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
              {answer}
            </p>
          )}
        </div>
      );
    })}
  </div>
</section>
  <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-10 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
           />
            <hr className="my-12 border-slate-200" />

            <section id="checklist">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Final checklist before you submit
              </h2>

              <ul className="mt-8 space-y-4">
                {checklist.map((item) => (
                  <li
                    key={item}
                    className="flex gap-4 border-b border-slate-200 pb-4 text-lg leading-8 text-slate-700"
                  >
                    <span className="mt-2 h-5 w-5 shrink-0 rounded border-2 border-[#163A70]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
            <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-10 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

            <div className="mt-14 rounded-2xl bg-[#163A70] p-8 text-center text-white">
              <h3 className="font-serif text-3xl font-bold">
                Ready to find a fully funded opportunity?
              </h3>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/75">
                Browse scholarships, fellowships, and funded graduate programs
                organized by destination, level, and deadline.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/scholarship"
                  className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#163A70]"
                >
                  Browse Scholarships
                </Link>

                <Link
                  to="/scholarship-tips"
                  className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white"
                >
                  More Guides
                </Link>
              </div>
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  In this guide
                </h3>

                <div className="mt-5 space-y-4 text-sm font-medium text-slate-700">
                  <a href="#possible" className="block hover:text-[#163A70]">
                    Is full funding possible?
                  </a>

                  <a href="#programs" className="block hover:text-[#163A70]">
                    Identify the right programs
                  </a>

                  <a href="#scholarships" className="block hover:text-[#163A70]">
                    What scholarships select for
                  </a>

                  <a href="#comparison" className="block hover:text-[#163A70]">
                    Quick comparison
                  </a>

                  <a href="#documents" className="block hover:text-[#163A70]">
                    Build your documents
                  </a>

                  <a href="#mistakes" className="block hover:text-[#163A70]">
                    Common mistakes
                  </a>

                  <a href="#checklist" className="block hover:text-[#163A70]">
                    Final checklist
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  More guides
                </h3>

                <div className="mt-5 space-y-4">
                  <Link
                      to="/scholarship-tips/how-to-write-winning-sop"
                      className="block border-b border-slate-100 pb-4 hover:text-[#163A70]"
                        >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Application Documents
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6">
                      How to Write a Winning Statement of Purpose
                    </p>
                  </Link>

                  <Link
                    to="/scholarship-tips/recommendation-letters"
                    className="block border-b border-slate-100 pb-4 hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Letters
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6">
                      How to Get Strong Recommendation Letters
                    </p>
                  </Link>

                  <Link
                    to="/scholarship-tips/research-proposal"
                    className="block hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Research
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6">
                      How to Write a Research Proposal
                    </p>
                  </Link>
                </div>
              </div>

              {/* GOOGLE ADS - SIDEBAR RESPONSIVE */}
              <ResponsiveAd
                slot="XXXXXXXXXX"
                className="mx-auto mt-2 mb-0 max-w-[720px]"
              />

              <div className="rounded-2xl border border-[#163A70] bg-[#163A70] p-6 text-white">
                <h3 className="font-serif text-xl font-bold">
                  Browse scholarships
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/75">
                  Find fully funded opportunities across 150+ countries.
                </p>

                <Link
                  to="/scholarship"
                  className="mt-5 inline-flex rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-bold text-[#163A70]"
                >
                  Explore now →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <footer className="w-full border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                In This Guide
              </h3>

              <div className="mt-5 space-y-4">
                <a href="#possible" className="block hover:text-[#163A70]">
                  Is full funding possible?
                </a>

                <a href="#programs" className="block hover:text-[#163A70]">
                  Identify the right programs
                </a>

                <a href="#scholarships" className="block hover:text-[#163A70]">
                  What scholarships select for
                </a>

                <a href="#documents" className="block hover:text-[#163A70]">
                  Build your documents
                </a>

                <a href="#checklist" className="block hover:text-[#163A70]">
                  Final checklist
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Share this guide
              </h3>

              <div className="mt-5 flex gap-3">
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 hover:border-[#163A70] hover:bg-white">
                  🔗
                </button>

                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 hover:border-[#163A70] hover:bg-white">
                  ✉
                </button>
              </div>
            </div>

            <div className="md:text-right">
              <h2 className="font-serif text-3xl font-bold text-[#163A70]">
                Scholars<span className="text-amber-500">Knowledge</span>
              </h2>

              <p className="mt-4 leading-8 text-slate-600">
                Helping students discover verified scholarships, fellowships,
                funded graduate opportunities, and expert application guidance.
              </p>

              <div className="mt-6 flex flex-wrap justify-start gap-5 text-sm text-slate-500 md:justify-end">
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Use</Link>
                <Link to="/contact">Contact</Link>
              </div>

              <p className="mt-8 text-sm text-slate-500">
                © 2026 ScholarsKnowledge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
