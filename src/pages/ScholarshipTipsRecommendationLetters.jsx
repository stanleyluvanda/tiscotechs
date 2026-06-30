//ScholarshipTipsRecommendations.jsx//
/*import { useEffect } from "react";*/
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd";

export default function ScholarshipTipsRecommendationLetters() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="text-sm text-slate-500">
          <Link to="/home" className="hover:text-blue-900">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/scholarship-tips" className="hover:text-blue-900">Scholarship Tips</Link>
          <span className="mx-2">›</span>
          <span>Recommendation Letters</span>
        </div>

        <div className="mt-10 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800">
          Letters & References
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
          How to Get Strong Recommendation Letters
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
          A weak recommendation letter can sink an otherwise strong scholarship
          application. Learn who to ask, how to brief them, and what to send
          before the deadline.
        </p>

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

    <div className="ml-4">
      <p className="font-bold text-slate-950">
        ScholarsKnowledge Editorial
      </p>

      <p className="text-sm text-slate-500">
        Updated June 2026 · Applies to all scholarship applications
      </p>
    </div>
  </div>

  <span className="whitespace-nowrap rounded-full bg-[#163A70] px-4 py-2 text-sm font-bold text-white">
    9 min read
  </span>

</div>

        <div className="mt-8 mb-2 flex items-start gap-8">
          <div className="max-w-[720px] flex-1">
            <img
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80"
              alt="Professor reviewing student documents to write a recommendation letter"
              className="h-[280px] w-full rounded-2xl object-cover shadow-sm md:h-[380px]"
            />
          </div>

         <div className="hidden w-[320px] shrink-0 xl:block">
  <GoogleSidebarAd />
</div>
</div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="max-w-3xl">
            <section id="why" className="mt-6">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Why recommendation letters matter so much
              </h2>

              <p className="mt-6 font-serif text-2xl leading-10 text-slate-800 first-letter:float-left first-letter:mr-4 first-letter:font-serif first-letter:text-8xl first-letter:font-bold first-letter:leading-[0.85] first-letter:text-[#163A70]">
  Most scholarship applicants spend most of their preparation time
  on the personal statement and very little time on recommendation
  letters. This is a serious mistake. For competitive scholarships,
  a recommendation letter carries major weight because it is where
  someone else confirms your academic ability, character, and
  potential.
</p>

              <div className="mt-8 rounded-r-xl border border-blue-100 border-l-4 border-l-[#163A70] bg-blue-50 p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">
                  Key insight
                </h3>
                <p className="mt-3 text-base leading-8 text-[#163A70]">
                  A committee reading “she is one of the best students I have
                  taught” learns almost nothing. A committee reading a specific
                  moment when you solved a real academic or professional problem
                  remembers that letter.
                </p>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="choose">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Step 1 — Choose the right recommenders
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                The strongest recommender is not always the most famous person
                you know. Choose someone who has worked closely with you and can
                speak with evidence about your academic ability, leadership,
                discipline, judgment, and potential.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                  <h4 className="font-bold text-emerald-800">✓ Strong choices</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>Professor who supervised your thesis</li>
                    <li>Supervisor from a relevant internship</li>
                    <li>Lecturer from a course central to your interests</li>
                    <li>Manager who can speak to leadership and impact</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                  <h4 className="font-bold text-red-800">✗ Avoid these</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>Famous names with no direct knowledge of your work</li>
                    <li>Family friends without academic context</li>
                    <li>Professors from large lectures only</li>
                    <li>Anyone who seems reluctant</li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="ask">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Step 2 — Ask early and ask properly
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Ask at least six to eight weeks before the deadline. When you
                ask, make it easy for the recommender to write a specific,
                evidence-based letter.
              </p>

              <div className="mt-8 rounded-r-2xl border border-blue-200 border-l-[6px] border-l-[#163A70] bg-blue-50 p-6">
  <h4 className="font-bold text-[#163A70]">
    What to send your recommender
  </h4>

  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
    <li>A short note explaining the scholarship and why you are applying</li>
    <li>The scholarship criteria and mission</li>
    <li>Your draft Statement of Purpose</li>
    <li>Three to five specific experiences you shared with them</li>
    <li>The submission deadline and format requirements</li>
  </ul>
</div>
            </section>

            <GoogleSidebarAd
               className="mx-auto my-10 max-w-[720px]"
             />

            <section id="brief">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Step 3 — Brief them on what to emphasize
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                This can feel uncomfortable, but recommenders expect it. Tell
                your recommender which parts of your work are most relevant to
                the scholarship. If the scholarship values leadership, remind
                them of a real moment where you demonstrated leadership. If it
                values research, point them to your strongest research work.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="followup">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Follow up with Appreciations
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Send a polite reminder two weeks before the deadline. One
                follow-up is appropriate. Two is acceptable. After submission,
                send a genuine thank-you and tell them the outcome. Recommenders
                who feel appreciated are more likely to support you again.
              </p>
            </section>

           <GoogleSidebarAd
  className="mx-auto my-10 max-w-[720px]"
/>

            <div className="mt-14 rounded-3xl bg-[#163A70] p-8 text-center text-white">
              <h3 className="font-serif text-3xl font-bold">
                Find the right scholarship to apply for
              </h3>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/80">
                Browse verified, fully funded scholarships organized by country,
                level of study, and deadline.
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
                  <a href="#why" className="block hover:text-[#163A70]">Why letters matter</a>
                  <a href="#choose" className="block hover:text-[#163A70]">Choose recommenders</a>
                  <a href="#ask" className="block hover:text-[#163A70]">Ask properly</a>
                  <a href="#brief" className="block hover:text-[#163A70]">Brief them</a>
                  <a href="#followup" className="block hover:text-[#163A70]">Follow up</a>
                </div>
              </div>

              {/* MORE GUIDES */}
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
      to="/scholarship-tips/research-proposal"
      className="block border-b border-slate-100 pb-5 hover:text-[#163A70]"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
        Research Writing
      </p>

      <p className="mt-2 text-sm font-semibold leading-6">
        How to Write a Research Proposal
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
      to="/scholarship-tips/motivation-letter-vs-sop"
      className="block border-b border-slate-100 pb-5 hover:text-[#163A70]"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
        Application Documents
      </p>

      <p className="mt-2 text-sm font-semibold leading-6">
        Motivation Letter vs Statement of Purpose — What's the Difference?
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

      {/* In this guide */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          In This Guide
        </h3>

        <div className="mt-5 space-y-4">
          <a href="#why" className="block hover:text-[#163A70]">
            Why recommendation letters matter
          </a>

          <a href="#choose" className="block hover:text-[#163A70]">
            Choose the right recommenders
          </a>

          <a href="#ask" className="block hover:text-[#163A70]">
            Ask early and ask properly
          </a>

          <a href="#brief" className="block hover:text-[#163A70]">
            Brief your recommender
          </a>

          <a href="#followup" className="block hover:text-[#163A70]">
            Follow up and say thank you
          </a>
        </div>
      </div>

      {/* Share */}
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

      {/* Brand */}
      <div className="md:text-right">
        <h2 className="font-serif text-3xl font-bold text-[#163A70]">
          Scholars<span className="text-amber-500">Knowledge</span>
        </h2>

        <p className="mt-4 leading-8 text-slate-600">
          Helping students discover verified scholarships,
          fellowships, funded graduate opportunities,
          and expert application guidance.
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