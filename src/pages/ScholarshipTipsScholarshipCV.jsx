//ScholarshipTipsScholarshipCV.jsx//
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd";

function ResponsiveAd({ slot, className = "" }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle) window.adsbygoogle.push({});
    } catch {}
  }, []);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default function ScholarshipTipsScholarshipCV() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="text-sm text-slate-500">
          <Link to="/home" className="hover:text-blue-900">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/scholarship-tips" className="hover:text-blue-900">Scholarship Tips</Link>
          <span className="mx-2">›</span>
          <span>Scholarship CV</span>
        </div>

        <div className="mt-10 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800">
          Application Documents
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
          How to Write a Winning and Appealing Scholarship CV
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
          A scholarship CV is not a job CV. Learn how to present academic
          achievement, research, leadership, service, and impact in a format
          scholarship committees can scan quickly.
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
        Updated June 2026 · Applies to Rhodes, Chevening, Fulbright & more
      </p>
    </div>
  </div>

  <span className="whitespace-nowrap rounded-full bg-[#163A70] px-4 py-2 text-sm font-bold text-white">
    8 min read
  </span>

</div>
        <div className="mt-8 mb-2 flex items-start gap-8">
          <div className="max-w-[720px] flex-1">
            <img
              src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80"
              alt="Student reviewing and writing a scholarship CV document"
              className="h-[280px] w-full rounded-2xl object-cover shadow-sm md:h-[380px]"
            />
          </div>

          <div className="hidden w-[320px] shrink-0 xl:block">
  <GoogleSidebarAd />
</div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="max-w-3xl">
            <section id="difference" className="mt-6">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Scholarship CV vs job CV
              </h2>

              <p className="mt-6 font-serif text-2xl leading-10 text-slate-800 first-letter:float-left first-letter:mr-4 first-letter:font-serif first-letter:text-8xl first-letter:font-bold first-letter:leading-[0.85] first-letter:text-[#163A70]">
                A job CV sells your professional skills to an employer. A
                scholarship CV demonstrates academic achievement, intellectual
                potential, leadership, and commitment to public good. Committees
                are not only asking whether you can do a job. They are asking
                whether you are worth investing in.
              </p>

              <p className="mt-5 text-lg leading-9 text-slate-700">
                Most scholarship CVs are two to four pages. Length matters less
                than relevance. Every item should help the committee understand
                your academic preparation, leadership, service, research ability,
                or future potential.
              </p>

             <div className="mt-8 rounded-r-xl border border-blue-100 border-l-[6px] border-l-[#163A70] bg-blue-50 p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">
                  Key principle
                </h3>
                <p className="mt-3 text-base leading-8 text-[#163A70]">
                  A strong scholarship CV is not a list of everything you have
                  done. It is a carefully organized evidence file showing why
                  you match the scholarship’s mission.
                </p>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="sections">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Essential sections — in order
              </h2>

              {[
                [
                  "1",
                  "Header and contact details",
                  "Include your full name, email, phone number, city/country, LinkedIn or portfolio if relevant. Avoid unnecessary personal details unless required.",
                ],
                [
                  "2",
                  "Education",
                  "List your degrees, institutions, dates, GPA or classification if strong, thesis title, honors, and relevant coursework.",
                ],
                [
                  "3",
                  "Research experience",
                  "Include thesis work, research assistant roles, publications, conference papers, data projects, lab work, or independent research.",
                ],
                [
                  "4",
                  "Professional experience",
                  "Focus on roles related to the scholarship’s mission. Use evidence of responsibility, leadership, analysis, and measurable impact.",
                ],
                [
                  "5",
                  "Leadership and service",
                  "Scholarship committees value public contribution. Include student leadership, volunteering, community projects, mentoring, and advocacy.",
                ],
                [
                  "6",
                  "Awards, skills, and languages",
                  "Add academic awards, technical skills, software, languages, certifications, and other qualifications that support your application.",
                ],
              ].map(([num, title, text]) => (
                <div key={title} className="mt-8 grid grid-cols-[56px_1fr] gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#163A70] font-serif text-xl font-bold text-white">
                    {num}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">{title}</h3>
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

            <section id="examples">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                How to describe experience with evidence
              </h2>

              <p className="mt-6 text-lg leading-9 text-slate-700">
                Scholarship committees respond to evidence. Instead of writing
                broad claims such as “responsible for community outreach,” show
                what you did, who benefited, and what changed.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                  <h4 className="font-bold text-red-800">✗ Weak CV bullet</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>Helped students with scholarship applications.</li>
                    <li>Participated in community service activities.</li>
                    <li>Worked on research project for my department.</li>
                  </ul>
                </div>

                {/*<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">*/}
                <div className="rounded-r-xl border border-emerald-200 border-l-[6px] border-l-emerald-600 bg-emerald-50 p-6">
                  <h4 className="font-bold text-emerald-800">✓ Stronger CV bullet</h4>
                  <ul className="mt-5 space-y-3 leading-7 text-slate-800">
                    <li>
                      Mentored 18 final-year students on scholarship application
                      strategy, leading to 6 interview invitations.
                    </li>
                    <li>
                      Coordinated a financial literacy workshop for 120 rural
                      students in partnership with local educators.
                    </li>
                    <li>
                      Cleaned and analyzed survey data from 450 households for a
                      faculty-led study on youth employment.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="mistakes">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Common mistakes to avoid
              </h2>

              {[
                [
                  "Using a job CV format",
                  "Scholarship CVs should prioritize academics, research, leadership, and public service. Do not lead with unrelated job duties unless they support the scholarship mission.",
                ],
                [
                  "Listing duties without impact",
                  "A duty says what you were assigned. Impact shows what changed because of your work.",
                ],
                [
                  "Including everything",
                  "A scholarship CV should be selective. Remove old, minor, or unrelated items that distract from your strongest evidence.",
                ],
                [
                  "Ignoring the scholarship criteria",
                  "If the award values leadership, service, academic excellence, or research potential, your CV should visibly reflect those qualities.",
                ],
                [
                  "Weak formatting",
                  "Use clear headings, consistent dates, readable spacing, and bullet points. Committees often scan CVs quickly.",
                ],
              ].map(([title, text]) => (
                <div key={title} className="mt-7">
                  <h3 className="text-lg font-bold text-[#163A70]">{title}</h3>
                  <p className="mt-2 text-lg leading-8 text-slate-700">{text}</p>
                </div>
              ))}
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="checklist">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">
                Scholarship CV checklist
              </h2>

              <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {[
                  "My CV starts with education, research, or scholarship-relevant experience.",
                  "Every major bullet includes evidence, scale, or impact where possible.",
                  "I have removed unrelated details that do not support my application.",
                  "My headings are clear and easy to scan.",
                  "My dates and formatting are consistent.",
                  "My leadership and service experience are visible.",
                  "My CV reflects the scholarship’s stated selection criteria.",
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
                Ready to find scholarships that match your profile?
              </h3>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/80">
                Browse verified scholarships, fellowships, and funded graduate
                opportunities organized by destination, level, and deadline.
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
                  <a href="#difference" className="block hover:text-[#163A70]">
                    Scholarship CV vs job CV
                  </a>
                  <a href="#sections" className="block hover:text-[#163A70]">
                    Essential sections
                  </a>
                  <a href="#examples" className="block hover:text-[#163A70]">
                    Writing strong bullets
                  </a>
                  <a href="#mistakes" className="block hover:text-[#163A70]">
                    Common mistakes
                  </a>
                  <a href="#checklist" className="block hover:text-[#163A70]">
                    CV checklist
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  More Guides
                </h3>

                <div className="mt-5 space-y-5">
                  <Link to="/scholarship-tips/how-to-write-winning-sop" className="block border-b border-slate-100 pb-5 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Application Documents</p>
                    <p className="mt-2 text-sm font-semibold leading-6">How to Write a Winning Statement of Purpose</p>
                  </Link>

                  <Link to="/scholarship-tips/recommendation-letters" className="block border-b border-slate-100 pb-5 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Recommendation Letters</p>
                    <p className="mt-2 text-sm font-semibold leading-6">How to Get Strong Recommendation Letters</p>
                  </Link>

                  <Link to="/scholarship-tips/research-proposal" className="block hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Research Writing</p>
                    <p className="mt-2 text-sm font-semibold leading-6">How to Write a Research Proposal</p>
                  </Link>
                </div>
              </div>

              <GoogleSidebarAd
                    className="mx-auto max-w-[320px]"
                         />

              <div className="rounded-2xl border border-[#163A70] bg-[#163A70] p-6 text-white">
                <h3 className="font-serif text-xl font-bold">Browse scholarships</h3>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  Find fully funded opportunities across 150+ countries.
                </p>
                <Link to="/scholarship" className="mt-5 inline-flex rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-bold text-[#163A70]">
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
                <a href="#difference" className="block hover:text-[#163A70]">Scholarship CV vs job CV</a>
                <a href="#sections" className="block hover:text-[#163A70]">Essential sections</a>
                <a href="#examples" className="block hover:text-[#163A70]">Writing strong bullets</a>
                <a href="#mistakes" className="block hover:text-[#163A70]">Common mistakes</a>
                <a href="#checklist" className="block hover:text-[#163A70]">CV checklist</a>
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