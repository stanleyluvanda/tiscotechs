
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";

const guides = [
  {
    title: "How to Write and structurer a Winning Statement of Purpose",
    category: "Application Documents",
    emoji: "📝",
    time: "12 min read",
    img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80",
    desc: "The one place the committee hears your voice. Learn structure, examples, and common mistakes.",
    link: "/scholarship-tips/how-to-write-winning-sop",
  },
  {
    title: "How to Get Strong Recommendation Letters",
    category: "Letters & References",
    emoji: "📬",
    time: "9 min read",
    img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&q=80",
    desc: "Learn who to ask, how to brief them, and what to send before the deadline.",
    link: "/scholarship-tips/recommendation-letters",
  },
  {
    title: "How to Write a Research Proposal",
    category: "Research Writing",
    emoji: "🔬",
    time: "11 min read",
    img: "/images/Research Proposals.webp",
    desc: "Build a strong proposal for PhD and research Master's scholarship applications.",
    link: "/scholarship-tips/research-proposal#what",
  },
  {
    title: "How to Write a Winning Scholarship CV",
    category: "Application Documents",
    emoji: "📄",
    time: "8 min read",
    img: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=900&q=80",
    desc: "Understand how a scholarship CV differs from a job CV and what committees expect.",
    link: "/scholarship-tips/scholarship-cv#difference",
  },
  {
    title: "Scholarship Interview Questions & Answers",
    category: "Interview Preparation",
    emoji: "🎤",
    time: "13 min read",
    img: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=900&q=80",
    desc: "Prepare for the most common scholarship interview questions with stronger answers.",
    link: "/scholarship-tips/interview-preparation",
  },
  {
    title: "Scholarship Application Timeline",
    category: "Planning",
    emoji: "📅",
    time: "7 min read",
    img: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&q=80",
    desc: "A month-by-month plan for preparing applications without last-minute pressure.",
    link: "#",
  },
  {
  title: "Fully Funded Master's & PhD Application Guide",
  category: "Planning",
  emoji: "🎓",
  time: "15 min read",
  img: "/images/Scholarship1.webp",
  desc: "A complete step-by-step guide to finding, preparing for, and winning fully funded Master's and PhD scholarships worldwide.",
  link: "/scholarship-tips/fully-funded-masters-phd-guide",
},
{
  title: "STEM MBA Universities & Programs Guide",
  category: "STEM MBA",
  emoji: "💼",
  time: "12 min read",
  img: "/images/mbaSTEM.webp",
  desc: "Discover what makes an MBA STEM-designated, which specializations commonly qualify, how STEM designation may affect post-graduation work opportunities, and what every international student should verify before applying.",
  link: "/stem-mba-guide#universities",
},

{
  title: "What Is a Fellowship? A Complete Guide for International Students",
  category: "Fellowships",
  emoji: "🏆",
  time: "14 min read",
  img: "https://www.scholarsknowledge.com/images/fellowship-guide.png",
  desc: "Learn what fellowships are, how they differ from scholarships, the major fellowship programmes worldwide, and how to prepare a competitive fellowship application.",
  link: "/fellowship-guide#find",
},
{
  title: "Staying On Track Abroad: What International Students Must Do",
  category: "Study Abroad",
  emoji: "🌍",
  time: "14 min read",
  img: "/images/Scholarship1.webp",
  desc: "Learn how to maintain your student status, avoid common visa mistakes, work legally, manage your finances, and stay academically compliant while studying abroad.",
  link: "/scholarship-tips/staying-on-track-abroad",
},
];

export default function ScholarshipTips() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const categories = [
    "All",
    "Application Documents",
    "Letters & References",
    "Research Writing",
    "Interview Preparation",
    "Planning",
  ];

  const filteredGuides =
    activeCategory === "All"
      ? guides
      : guides.filter((g) => g.category === activeCategory);

  return (
    <>
      <div
        className="fixed left-0 top-0 z-[9999] h-[3px] bg-[#D4AF37] transition-[width] duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      {/*<main className="min-h-screen bg-white text-slate-900">*/}
      <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
        {/* MAGAZINE HERO */}
        <section className="bg-[#163A70] text-white">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center lg:px-8">
            <p className="mx-auto inline-block border-b border-[#D4AF37] pb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
              ScholarsKnowledge — Tips & Guides
            </p>

            <h1 className="mx-auto mt-8 max-w-4xl font-serif text-4xl font-extrabold leading-tight md:text-6xl">
              Student&apos;s Resource Hub
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-blue-100 md:text-base">
              Practical, professional guides for international students preparing
              fully funded scholarship applications, Statements of Purpose, CVs,
              recommendation letters, research proposals, and interviews.
            </p>
          </div>

          <div className="border-t border-white/10 bg-white/5 px-4 py-5">
            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
              {[
                { number: "10+", label: "Guides" },
                { number: "Free", label: "Always" },
                { number: "150+", label: "Countries" },
                { number: "Jun 2026", label: "Updated" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-serif text-2xl font-bold text-[#D4AF37]">
                    {stat.number}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* GOOGLE ADS - TOP */}
<div className="mx-auto my-8 max-w-7xl px-4">
  <GoogleSidebarAd
    slot="8562818627"
    label=""
    className="bg-transparent"
    minHeight={250}
    keepPlaceholder={false}
  />
</div>
        {/* FEATURED GUIDE */}
        <section className="bg-white px-4 pt-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex items-center gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#D4AF37]">
                Featured Guide
              </p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/*<article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md md:grid md:grid-cols-2">*/}
              <article className="overflow-hidden rounded-none border-y border-slate-200 bg-white shadow-sm transition hover:shadow-md sm:rounded-2xl sm:border md:grid md:grid-cols-2">
              {/*<div className="relative min-h-[220px] bg-[#163A70] md:min-h-[340px]">*/}
              <div className="relative -mx-4 min-h-[240px] bg-[#163A70] sm:mx-0 md:min-h-[340px]">
                <img
                  src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80"
                  alt="Student writing a scholarship statement of purpose"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#163A70]/60 to-transparent" />
              </div>

              <div className="flex flex-col justify-center p-6 md:p-10">
                <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
                  Application Documents
                </span>

                <h2 className="mt-5 font-serif text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">
                  How to Write a Winning Statement of Purpose for Scholarship
                  Applications
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Your Statement of Purpose is where the committee hears your
                  voice directly. Learn how to structure your story, connect
                  your goals, and avoid common application mistakes.
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium text-slate-500">
                  <span>12 min read</span>
                  <span>•</span>
                  <span>Updated June 2026</span>
                </div>

                <Link
                  to="/scholarship-tips/how-to-write-winning-sop"
                  className="mt-7 inline-flex w-fit rounded-full bg-[#163A70] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#102b54]"
                >
                  Read Guide →
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* INTRO SECTION */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 border-b border-slate-200 pb-12 md:grid-cols-2">
            <div>
              <p className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#D4AF37]">
                <span className="h-[2px] w-6 bg-[#D4AF37]" />
                About this guide hub
              </p>

              <h2 className="font-serif text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">
                Winning a scholarship takes more than a good academic record
              </h2>

              <div className="mt-5 space-y-4 font-serif text-base leading-8 text-slate-700">
                <p>
                  Every year, thousands of talented international students apply
                  for fully funded scholarships and many are rejected, not
                  because they lack ability, but because they do not know how to
                  present themselves clearly.
                </p>
                <p>
                  {/*The scholarship application process is a specific skill. It
                  requires a strong SOP, well-briefed recommenders, a focused
                  research proposal, and interview answers that sound clear and
                  credible.*/}
                  The scholarship application process is a specific skill. It requires knowing how to write a Statement 
                  of Purpose that tells a story rather than lists a CV, how to choose and brief recommenders who will go 
                  beyond generic praise, how to craft a research proposal that convinces a committee you can think independently,
                   and how to walk into an interview and hold your own against candidates from 70 other countries.
                </p>
                <p>
                  <strong className="text-slate-900">
                    These guides exist to close that gap.
                  </strong>{" "}
                  Each one is written for international students who are applying to competitive, fully funded opportunities — the Rhodes, 
                  Chevening, Fulbright, Commonwealth, DAAD, Erasmus Mundus, Australian RTP, and university-specific awards worldwide. 
                  The advice here is practical, specific, and built on what actually works in competitive applications, not what sounds good in theory.
                </p>
                <p>
                 Whether you are just beginning to explore scholarship options or are two weeks from a submission deadline, start with the guide most 
                 relevant to where you are right now — and use the checklist at the end of each one to make sure nothing slips through.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="bg-[#163A70] px-5 py-4 font-serif text-lg font-bold text-white">
                What you will find in this hub
              </div>

              <div className="divide-y divide-slate-200">
                {guides.map((guide) => (
                  <Link
                    key={guide.title}
                    to={guide.link}
                    className="flex gap-4 p-4 transition hover:bg-[#FFF8E1]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl">
                      {guide.emoji}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {guide.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {guide.category} · {guide.time}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                number: "6–8 wks",
                title: "Minimum preparation time",
                desc: "Most competitive applications need proper drafting and review.",
              },
              {
                number: "3–5",
                title: "Scholarships to target",
                desc: "Focused applications outperform many weak submissions.",
              },
              {
                number: "5–8×",
                title: "Drafts for a strong SOP",
                desc: "Strong essays usually need several full revisions.",
              },
              {
                number: "70+",
                title: "Countries covered",
                desc: "Guidance applies to students applying worldwide.",
              },
            ].map((fact) => (
              <article
                key={fact.title}
                className="rounded-xl border border-slate-200 border-t-[#D4AF37] border-t-4 bg-white p-5 shadow-sm"
              >
                <div className="font-serif text-3xl font-bold text-[#163A70]">
                  {fact.number}
                </div>
                <h3 className="mt-2 text-sm font-extrabold text-slate-900">
                  {fact.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {fact.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* CATEGORY FILTERS */}
        <section className="bg-white px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    activeCategory === cat
                      ? "border-[#163A70] bg-[#163A70] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#163A70] hover:text-[#163A70]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* GUIDE GRID */}
        <section className="bg-white px-4 pb-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-serif text-3xl font-extrabold text-slate-900">
                All Guides
              </h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-500">
                {filteredGuides.length} articles
              </span>
            </div>

            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {filteredGuides.map((guide) => (
                <Link
                  key={guide.title}
                  to={guide.link}
                  /*className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"*/
                  className="group overflow-hidden rounded-none border-y border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:rounded-2xl sm:border"
                >
                  {/*<div className="relative h-52 overflow-hidden bg-[#163A70]">*/}
                    <div className="relative -mx-4 h-56 overflow-hidden bg-[#163A70] sm:mx-0 sm:h-52">
                    <img
                      src={guide.img}
                      alt={guide.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
                      {guide.category}
                    </span>
                  </div>

                  <div className="flex min-h-[220px] flex-col p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xl">{guide.emoji}</span>
                      <span className="text-xs font-medium text-slate-500">
                        {guide.time}
                      </span>
                    </div>

                    <h3 className="font-serif text-xl font-bold leading-snug text-slate-900">
                      {guide.title}
                    </h3>

                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                      {guide.desc}
                    </p>

                    <div className="mt-5 border-t border-slate-100 pt-4 text-sm font-bold text-[#163A70]">
                      Read guide →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
        {/* GOOGLE ADS - MID PAGE */}
<div className="mx-auto my-10 max-w-7xl px-4">
  <GoogleSidebarAd
    slot="8562818627"
    label=""
    className="bg-transparent"
    minHeight={250}
    keepPlaceholder={false}
  />
</div>

        {/* ROADMAP */}
        <section className="bg-slate-50 px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#D4AF37]">
                Application Roadmap
              </p>
              <h2 className="mt-3 font-serif text-3xl font-extrabold text-[#163A70]">
                Scholarship Application Roadmap
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                "Find Scholarships",
                "Prepare your CV",
                "Write your SOP",
                "Recommendation Letters",
                "Interview Preparation",
                "Submit Application",
              ].map((step, index) => (
                <button
                  key={step}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-[#D4AF37] hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#163A70] text-lg font-extrabold text-white group-hover:bg-[#D4AF37]">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#163A70]">{step}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Step {index + 1} of 6
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FREE RESOURCES */}
        <section className="bg-white px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#D4AF37]">
                Free Resources
              </p>
              <h2 className="mt-2 font-serif text-3xl font-extrabold text-[#163A70]">
                Free Scholarship Resources
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                "Scholarship Checklist",
                "SOP Template",
                "CV Template",
                "Recommendation Letter Template",
                "Application Timeline",
                "Research Proposal Template",
              ].map((resource) => (
                <article
                  key={resource}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#D4AF37] hover:shadow-md"
                >
                  <div className="text-3xl">📄</div>
                  <h3 className="mt-4 text-lg font-extrabold text-[#163A70]">
                    {resource}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    This resource can later become a downloadable PDF for
                    ScholarsKnowledge users.
                  </p>
                  <button
                    disabled
                    className="mt-5 rounded-lg border border-[#163A70] px-4 py-2 text-sm font-semibold text-[#163A70] disabled:opacity-70"
                  >
                    Coming Soon
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
       {/* GOOGLE ADS - BOTTOM */}
<div className="mx-auto my-10 max-w-7xl px-4">
  <GoogleSidebarAd
    slot="8562818627"
    label=""
    className="bg-transparent"
    minHeight={250}
    keepPlaceholder={false}
  />
</div>
        {/* NEWSLETTER */}
        <section className="bg-[#163A70] px-4 py-16 text-white">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#D4AF37]">
              Newsletter
            </p>

            <h2 className="mt-3 font-serif text-3xl font-extrabold">
              Never Miss Scholarship Deadlines
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100">
              Receive scholarship opportunities, application tips, funding
              updates, and new guides directly in your inbox.
            </p>

            <form
              className="mx-auto mt-8 flex max-w-2xl flex-col gap-4 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Enter your email address"
                className="h-12 flex-1 rounded-lg border border-white/20 bg-white px-4 text-slate-800 outline-none focus:border-[#D4AF37]"
              />

              <button
                type="submit"
                className="h-12 rounded-lg bg-[#D4AF37] px-8 font-bold text-[#163A70] transition hover:bg-yellow-400"
              >
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* COPYRIGHT */}
      <div className="bg-[#312E81] py-5">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-white">
            © {new Date().getFullYear()} ScholarsKnowledge. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}