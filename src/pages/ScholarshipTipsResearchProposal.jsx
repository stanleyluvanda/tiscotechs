//ScholarshipTipsResearchProposal.jsx//
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd";



export default function ScholarshipTipsResearchProposal() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="text-sm text-slate-500">
          <Link to="/home" className="hover:text-blue-900">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/scholarship-tips" className="hover:text-blue-900">
            Scholarship Tips
          </Link>
          <span className="mx-2">›</span>
          <span>Research Proposal</span>
        </div>

        <div className="mt-10 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800">
          Research Writing
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
          How to Write a Research Proposal for Scholarship Applications
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
          PhD and research master&apos;s applications often require a proposal
          that proves you can frame, plan, and execute independent academic
          research. This guide shows you how to build one clearly.
        </p>

        {/* DESKTOP TOP-RIGHT GOOGLE AD */}
<div className="hidden xl:block">
  <div className="absolute right-4 top-[220px] w-[320px]">
    <GoogleSidebarAd className="h-[280px]" />
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
        Updated June 2026 · Applies to Rhodes, Chevening, Fulbright & more
      </p>
    </div>
  </div>

  <span className="whitespace-nowrap rounded-full bg-[#163A70] px-4 py-2 text-sm font-bold text-white">
    11 min read
  </span>
</div>

        {/* HERO IMAGE + RIGHT RESPONSIVE GOOGLE AD */}
        <div className="mt-8 mb-2 flex items-start gap-8">
          <div className="max-w-[720px] flex-1">
            <img
  src="https://images.unsplash.com/photo-1532094349884-543559244d98?w=1200&q=80"
  alt="PhD student working on research in a university library"
  className="h-[280px] w-full rounded-2xl object-cover shadow-sm md:h-[380px]"
/>
          </div>

          <div className="hidden w-[320px] shrink-0 xl:block">
  <GoogleSidebarAd />
</div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="max-w-3xl">
            <section id="what" className="mt-6">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                What a research proposal actually is
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A research proposal is a document — typically 1,000 to 2,500
                words — that argues that a specific research question is worth
                investigating, that you are the right person to investigate it,
                and that your proposed approach is credible and achievable
                within the program.
              </p>

                {/*<div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6">*/}
                <div className="mt-8 overflow-hidden rounded-xl border border-blue-100 border-l-[6px] border-l-[#163A70] bg-blue-50">
                  <div className="p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">
                  Common mistake
                </h3>
                <p className="mt-3 text-base leading-8 text-[#163A70]">
                  Applicants often write proposals that are too broad. “I will
                  study climate change and economic development in Africa” is
                  too general. A strong proposal is narrow enough to be studied
                  with clear data, methods, and scope.
                </p>
              </div>
               </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="structure">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                The six sections every strong proposal includes
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Committees are not expecting you to have completed the research
                already. They are evaluating whether you understand the field,
                whether your question is original, whether your methodology is
                appropriate, and whether you can realistically complete the
                project.
              </p>

              {[
                [
                  "1",
                  "Title and abstract",
                  "Write a clear title that names your question, population, and method. The abstract should summarize the gap, question, approach, and expected contribution.",
                ],
                [
                  "2",
                  "Introduction and background",
                  "Set the context. What is the broader field? What do we know already? What gap in existing knowledge will your research address?",
                ],
                [
                  "3",
                  "Research question and objectives",
                  "State your main research question clearly. Break it into two or three specific objectives that can be achieved within the program timeframe.",
                ],
                [
                  "4",
                  "Methodology",
                  "Describe your approach. Will your study be qualitative, quantitative, or mixed-methods? What data will you use? Why is this method appropriate?",
                ],
                [
                  "5",
                  "Expected contribution and significance",
                  "Explain who will benefit and how. Show the academic, policy, or practical value of the research without overstating the impact.",
                ],
                [
                  "6",
                  "Timeline and references",
                  "Give a realistic plan for completing each phase and include references for all cited academic work.",
                ],
              ].map(([num, title, text]) => (
                <div key={title} className="mt-8 grid grid-cols-[56px_1fr] gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#163A70] font-serif text-xl font-bold text-white">
                    {num}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">
                      {title}
                    </h3>
                    <p className="mt-4 text-lg leading-9 text-slate-700">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </section>

           <GoogleSidebarAd
  className="mx-auto my-10 max-w-[720px]"
/>

            <hr className="my-12 border-slate-200" />

            <section id="question">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                How to identify a strong research question
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                A good research question is specific, original, and feasible. It
                should not be so broad that it becomes impossible to answer, and
                it should not be so narrow that it has no academic or practical
                significance.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                  <h4 className="font-bold text-red-800">✗ Too broad</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>I will study poverty in Africa.</li>
                    <li>I will research climate change and development.</li>
                    <li>I will examine education problems in developing countries.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                  <h4 className="font-bold text-emerald-800">✓ Stronger</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>
                      I will examine whether mobile money adoption among
                      smallholder farmers in Tanzania mediates the relationship
                      between rainfall volatility and household income stability.
                    </li>
                    <li>
                      I will assess how school feeding programs affect attendance
                      among rural primary school students in Northern Ghana.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="methodology">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Writing the methodology section
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Your methodology should convince the reader that your question
                can actually be answered. Do not simply say “I will use mixed
                methods.” Explain what data you will collect, how you will
                collect it, what analytical framework you will use, and why that
                approach fits the question.
              </p>

              {/*</section><div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">*/}
                <div className="mt-8 overflow-hidden rounded-2xl border border-blue-200 border-l-[6px] border-l-[#163A70] bg-blue-50">
  <div className="p-6">
                <h4 className="font-bold text-[#163A70]">
                  Methodology checklist
                </h4>
                <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                  <li>What type of data will you use?</li>
                  <li>Where will the data come from?</li>
                  <li>What sample, population, or case will you study?</li>
                  <li>What analytical method will you apply?</li>
                  <li>Why is this method appropriate for your question?</li>
                  <li>What limitations should the committee know about?</li>
                </ul>
              </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="checklist">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Pre-submission checklist
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Before submitting your proposal, check that each section is clear,
                specific, and realistic.
              </p>

              <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {[
                  "My research question is specific and answerable.",
                  "I have identified a clear gap in the literature.",
                  "My methodology matches the research question.",
                  "I have explained what data or sources I will use.",
                  "My project is realistic within the program timeline.",
                  "I have not overstated the expected contribution.",
                  "My references are relevant and properly formatted.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 p-4 text-slate-700">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-[#163A70]" />
                    <span className="leading-7">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <GoogleSidebarAd
  className="mx-auto my-10 max-w-[720px]"
/>

            <div className="mt-14 rounded-3xl bg-[#163A70] p-8 text-center text-white">
              <h3 className="font-serif text-3xl font-bold">
                Found the scholarship to apply for?
              </h3>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/80">
                Browse research-focused scholarships, fully funded PhD
                opportunities, and graduate programs worldwide.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  to="/scholarship"
                  className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-[#163A70] hover:bg-amber-300"
                >
                  Browse Scholarships
                </Link>

                <Link
                  to="/student-sign-up"
                  className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white hover:border-white"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  In this article
                </h3>

                <div className="mt-5 space-y-4 text-sm text-slate-700">
                  <a href="#what" className="block hover:text-[#163A70]">
                    What a research proposal is
                  </a>
                  <a href="#structure" className="block hover:text-[#163A70]">
                    Six proposal sections
                  </a>
                  <a href="#question" className="block hover:text-[#163A70]">
                    Strong research question
                  </a>
                  <a href="#methodology" className="block hover:text-[#163A70]">
                    Methodology section
                  </a>
                  <a href="#checklist" className="block hover:text-[#163A70]">
                    Pre-submission checklist
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  More Guides
                </h3>

                <div className="mt-5 space-y-5">
                  <Link
                    to="/scholarship-tips/how-to-write-winning-sop"
                    className="block border-b border-slate-100 pb-5 hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Application Documents
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Write a Winning Statement of Purpose
                    </p>
                  </Link>

                  <Link
                    to="/scholarship-tips/recommendation-letters"
                    className="block border-b border-slate-100 pb-5 hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Recommendation Letters
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Get Strong Recommendation Letters
                    </p>
                  </Link>

                  <Link
                    to="/scholarship-tips/scholarship-cv"
                    className="block border-b border-slate-100 pb-5 hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Application Documents
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      How to Write a Winning Scholarship CV
                    </p>
                  </Link>

                  <Link
                    to="/scholarship-tips/interview-preparation"
                    className="block hover:text-[#163A70]"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Interviews
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6">
                      Scholarship Interview Preparation Guide
                    </p>
                  </Link>
                </div>
              </div>

              <GoogleSidebarAd
  className="mx-auto max-w-[320px]"
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
                <a href="#what" className="block hover:text-[#163A70]">
                  What is a Research Proposal?
                </a>
                <a href="#structure" className="block hover:text-[#163A70]">
                  The six essential sections
                </a>
                <a href="#question" className="block hover:text-[#163A70]">
                  Choosing a strong research question
                </a>
                <a href="#methodology" className="block hover:text-[#163A70]">
                  Writing the methodology
                </a>
                <a href="#checklist" className="block hover:text-[#163A70]">
                  Pre-submission checklist
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
                © {new Date().getFullYear()} ScholarsKnowledge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}