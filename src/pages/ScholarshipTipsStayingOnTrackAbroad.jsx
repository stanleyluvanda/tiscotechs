//ScholarshipTipsStayingOnTrackAbroad.jsx//
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd";



const validStatus = [
  "Maintaining full-time enrollment every semester, based on your specific course-load minimum.",
  "Reporting any change of address to your school’s international office within the required window.",
  "Renewing your visa, permit, or residence document before it expires.",
  "Keeping your passport valid at all times, with enough remaining validity for your destination country.",
  "Attending classes and making documented academic progress.",
  "Informing your international student office before travel outside the country.",
];

const riskyStatus = [
  "Dropping below full-time enrollment without prior authorization.",
  "Taking a leave of absence without informing your international office.",
  "Letting your visa, permit, or passport expire while still in the country.",
  "Failing to update your address or contact details with immigration authorities.",
  "Being absent from your program for an extended, unreported period.",
  "Transferring schools or programs without following the correct transfer process.",
];

const permittedWork = [
  "On-campus employment, usually up to the allowed weekly limit during term time.",
  "Authorized internships directly tied to your program or degree requirements.",
  "Approved practical training, co-op, CPT, OPT, placement year, or equivalent schemes.",
  "University-approved assistantships, research positions, or teaching support roles.",
];

const riskyWork = [
  "Cash-in-hand work that is not declared or authorized.",
  "Working more hours than your visa or permit allows.",
  "Starting an internship before written authorization is approved.",
  "Doing gig work, delivery work, freelancing, or remote work without checking the rules first.",
];

const budgetRows = [
  ["Rent / housing", "$500 – $1,500+", "Share housing where appropriate; check lease rules before signing."],
  ["Food", "$250 – $600", "Cook regularly and use student discounts or campus food support."],
  ["Transport", "$30 – $150", "Use student transit passes where available."],
  ["Phone / internet", "$30 – $80", "Student-specific carrier plans are often cheaper than standard plans."],
  ["Books & supplies", "$50 – $150", "Buy used, rent, or use library reserve copies wherever possible."],
];

const countryNotes = [
  {
    flag: "🇺🇸",
    title: "United States",
    body: "F-1 visa holders are managed through SEVIS. Work authorization comes through CPT during studies or OPT after graduation. Your Designated School Official is your primary point of contact for status questions.",
  },
  {
    flag: "🇨🇦",
    title: "Canada",
    body: "Study permit holders may have work permissions attached to their permits, but conditions can change. Confirm current rules with IRCC or your Designated Learning Institution before working.",
  },
  {
    flag: "🇬🇧",
    title: "United Kingdom",
    body: "Student visa holders are typically limited during term time. Universities monitor attendance and compliance under Home Office reporting requirements.",
  },
  {
    flag: "🇩🇪",
    title: "Germany & EU",
    body: "Residence permit conditions vary by country. Local registration after arrival is mandatory in many EU countries, and work-day limits may apply.",
  },
  {
    flag: "🇫🇷",
    title: "France",
    body: "Student residence permits usually allow limited work. Renewal should be started well before expiry because appointment slots can fill quickly.",
  },
  {
    flag: "🇳🇱",
    title: "Netherlands & Nordics",
    body: "Rules vary significantly. Some countries require employer-held permits; others are more flexible. Always verify with your university international office.",
  },
];

const checklist = [
  "I know exactly what my visa or permit allows and does not allow regarding work.",
  "I have saved my international student office’s contact details and know who my advisor is.",
  "I have a basic monthly budget and an emergency buffer, even if small.",
  "I know my university’s minimum enrollment and GPA requirements for maintaining status.",
  "I have not taken on any cash-in-hand or unauthorized work, no matter how small.",
  "I check my visa, permit, and passport expiry dates at least twice a year.",
  "I know that any legal trouble, however minor it seems, must be reported to my international office immediately.",
];

export default function ScholarshipTipsStayingOnTrackAbroad() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="text-sm text-slate-500">
          <Link to="/home" className="hover:text-blue-900">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/scholarship-tips" className="hover:text-blue-900">Scholarship Tips</Link>
          <span className="mx-2">›</span>
          <span>Staying On Track Abroad</span>
        </div>

        <div className="mt-10 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800">
          Scholarship Tips &amp; Guides
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
          Staying On Track: What International Students Must Do{" "}
          <span className="italic text-[#163A70]">(and Avoid)</span>{" "}
          in the US, Canada &amp; Europe
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
          Getting the scholarship or admission letter is only the beginning. This guide covers what protects your status abroad — and the mistakes that can end an international student’s academic future.
        </p>

        {/* DESKTOP TOP-RIGHT GOOGLE AD */}
<div className="hidden xl:block">
  <div className="absolute right-4 top-[145px] w-[320px]">
    <GoogleSidebarAd className="h-[280px]" />
  </div>
</div>

        <div className="mt-8 flex max-w-[720px] items-center justify-between border-y border-slate-200 py-6">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#163A70] font-serif text-lg font-bold text-white">
              SK
            </div>

            <div className="ml-4 flex-1">
              <p className="font-bold text-slate-950">ScholarsKnowledge Editorial</p>
              <p className="text-sm text-slate-500">
                Updated June 2026 · For students in or heading to the US, Canada, UK &amp; Europe
              </p>
            </div>
          </div>

          <span className="whitespace-nowrap rounded-full bg-[#163A70] px-4 py-2 text-sm font-bold text-white">
            14 min read
          </span>
        </div>

        {/* HERO IMAGE + RIGHT RESPONSIVE GOOGLE AD */}
        <div className="mt-8 mb-2 flex items-start gap-8">
          <div className="max-w-[720px] flex-1">
            <img
              src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200&q=80"
              alt="International student walking on a university campus abroad"
              className="h-[280px] w-full rounded-2xl object-cover shadow-sm md:h-[380px]"
              onError={(e) => {
                e.currentTarget.src = "/images/Scholarship1.webp";
              }}
            />
          </div>

          {/* GOOGLE ADS - IMAGE RIGHT */}
<div className="hidden w-[320px] shrink-0 xl:block">
  <GoogleSidebarAd />
</div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="max-w-3xl">
            <section id="intro" className="mt-6">
              <p className="text-lg leading-9 text-slate-700 first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-6xl first-letter:font-bold first-letter:leading-none first-letter:text-[#163A70]">
                Getting the acceptance letter, the visa stamp, and the scholarship award is the hardest part — or so it feels. In reality, it is only the beginning. Every year, international students who worked incredibly hard to get to the US, Canada, the UK, or Europe lose their visa status, academic standing, or future immigration eligibility because they did not understand the rules that govern their stay.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="why">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Why this guide exists</h2>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                This guide is not meant to frighten you. It is meant to do something scholarship offices, university orientation sessions, and well-meaning friends often fail to do clearly enough: lay out, in plain language, what protects your ability to stay, study, and eventually build a career abroad — and what destroys it.
              </p>
              <p className="mt-5 text-lg leading-9 text-slate-700">
                Read this once when you arrive, and again at the start of every academic year. The principles apply broadly across the US, Canada, the UK, and the EU/Schengen area, though specific details vary by country.
              </p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-red-200 border-l-[6px] border-l-red-700 bg-red-50">
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-800">Critical</h3>
                  <p className="mt-3 text-base leading-8 text-slate-800">
                    A visa revocation, a criminal record, or a deportation order can follow you for the rest of your life and affect future visa applications to other countries. Treat this guide as seriously as you treat your scholarship offer letter.
                  </p>
                </div>
              </div>
            </section>

           {/* GOOGLE ADS - MID ARTICLE */}
<GoogleSidebarAd
  className="mx-auto my-10 max-w-[720px]"
/>

            <hr className="my-12 border-slate-200" />

            <section id="why-came">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Remember why you came</h2>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                You did not travel thousands of miles, leave your family, and accept major financial sacrifice to lose focus after a few months abroad. You came to complete a specific academic program, on a specific timeline, tied to your visa, residence permit, or scholarship.
              </p>
              <p className="mt-5 text-lg leading-9 text-slate-700">
                Every decision abroad should pass a simple test: <strong className="text-slate-950">does this support or threaten my academic progress and legal status?</strong> If an opportunity, relationship, job, or social situation puts either of those at risk, it is not worth it.
              </p>

              <div className="mt-8 overflow-hidden rounded-xl border border-blue-100 border-l-[6px] border-l-[#163A70] bg-blue-50">
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">Key Insight</h3>
                  <p className="mt-3 text-base leading-8 text-[#163A70]">
                    Your conduct abroad does not only affect you. It affects whether future students from your school, country, or community are trusted with the same opportunity.
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="status">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Maintaining your legal status</h2>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                Your visa or residence permit comes with conditions. Violating them, even unintentionally, can result in your status being terminated, which may mean leaving the country quickly and possibly being barred from returning.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-800">✓ What keeps your status valid</h3>
                  <ul className="mt-5 space-y-3 text-base leading-7 text-slate-800">
                    {validStatus.map((item) => <li key={item}>✓ {item}</li>)}
                  </ul>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-800">⚠ What can terminate your status</h3>
                  <ul className="mt-5 space-y-3 text-base leading-7 text-slate-800">
                    {riskyStatus.map((item) => <li key={item}>⚠ {item}</li>)}
                  </ul>
                </div>
              </div>

              <p className="mt-8 text-lg leading-9 text-slate-700">
                If your academic plan changes, speak to your international student advisor before acting. Most status violations happen because students did not know they needed permission first.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="criminal">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Criminal activity — zero tolerance</h2>
              <div className="mt-8 overflow-hidden rounded-2xl border border-red-200 border-l-[6px] border-l-red-700 bg-red-50">
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-800">Zero tolerance</h3>
                  <p className="mt-3 text-base leading-8 text-slate-800">
                    Any criminal charge, even one that feels minor, can trigger visa review, revocation, deportation proceedings, and a permanent record affecting future visa applications.
                  </p>
                </div>
              </div>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                Students often underestimate issues such as shoplifting, fighting, driving under the influence, public intoxication, controlled substance possession, or fraud. Do not assume a misunderstanding will resolve quietly.
              </p>
              <p className="mt-5 text-lg leading-9 text-slate-700">
                If you are stopped, questioned, or detained, contact your university’s international student office and, where possible, a lawyer before making statements.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="work">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Unauthorized work — the most common mistake</h2>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                Unauthorized work is one of the most common status violations among international students. It is treated seriously because it directly violates the terms under which many students were admitted.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-800">✓ Generally permitted — check your visa</h3>
                  <ul className="mt-5 space-y-3 text-base leading-7 text-slate-800">
                    {permittedWork.map((item) => <li key={item}>✓ {item}</li>)}
                  </ul>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-800">⚠ High-risk work decisions</h3>
                  <ul className="mt-5 space-y-3 text-base leading-7 text-slate-800">
                    {riskyWork.map((item) => <li key={item}>⚠ {item}</li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl border border-amber-200 border-l-[6px] border-l-amber-700 bg-amber-50">
                <div className="p-6">
                  <h3 className="font-bold text-amber-800">Rule of thumb</h3>
                  <p className="mt-4 leading-8 text-slate-700">
                    If you are not sure whether a job is authorized, assume it is not authorized until your international student office confirms it in writing.
                  </p>
                </div>
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="money">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Managing your money responsibly</h2>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                Financial stress is one of the main reasons students make risky decisions abroad. Build a realistic budget early and speak to your university if funding changes unexpectedly.
              </p>

              <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[1fr_1fr_2fr] bg-[#163A70] text-sm font-bold uppercase tracking-widest text-white">
                    <div className="p-4">Budget item</div>
                    <div className="p-4">Typical range</div>
                    <div className="p-4">Practical note</div>
                  </div>
                  {budgetRows.map(([item, range, note]) => (
                    <div key={item} className="grid grid-cols-[1fr_1fr_2fr] border-t border-slate-200 odd:bg-slate-50">
                      <div className="p-4 font-bold text-slate-950">{item}</div>
                      <div className="p-4 text-slate-700">{range}</div>
                      <div className="p-4 text-slate-700">{note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-xl border border-blue-100 border-l-[6px] border-l-[#163A70] bg-blue-50">
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#163A70]">Emergency fund principle</h3>
                  <p className="mt-3 text-base leading-8 text-[#163A70]">
                    Keep at least one month of essential living costs untouched if possible. Visa fees, medical costs, and emergency travel are common reasons students fall into financial difficulty.
                  </p>
                </div>
              </div>
            </section>

            {/* GOOGLE ADS - BELOW ARTICLE BODY */}
<GoogleSidebarAd
  className="mx-auto my-10 max-w-[720px]"
/>
            <hr className="my-12 border-slate-200" />

            <section id="academic">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Academic standing matters too</h2>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                Your visa status is usually tied to maintaining good academic standing, not just enrollment. Falling below university requirements or failing to make satisfactory progress can trigger status review.
              </p>
              <p className="mt-5 text-lg leading-9 text-slate-700">
                If you are struggling, speak to your academic advisor and international student office early. Tutoring centers, writing centers, academic coaching, and mental health support exist because students need support before problems become permanent.
              </p>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="countries">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Country-specific notes</h2>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                The core principles apply broadly, but each destination has its own terminology and compliance system.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {countryNotes.map((country) => (
                  <div key={country.title} className="rounded-2xl border border-slate-200 border-t-4 border-t-[#163A70] bg-slate-50 p-5">
                    <div className="text-3xl">{country.flag}</div>
                    <h3 className="mt-3 font-serif text-xl font-bold text-slate-950">{country.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{country.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <hr className="my-12 border-slate-200" />

            <section id="reality">
              <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950">Final reality check</h2>
              <p className="mt-6 text-lg leading-9 text-slate-700">
                The students who have the smoothest experience abroad are usually the ones who manage their status, finances, and academic standing from day one — not the ones who wait until there is a problem.
              </p>

              <ul className="mt-8 space-y-4">
                {checklist.map((item) => (
                  <li key={item} className="flex gap-4 border-b border-slate-200 pb-4 text-lg leading-8 text-slate-700">
                    <span className="mt-2 h-5 w-5 shrink-0 rounded border-2 border-[#163A70]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            
            
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">In this guide</h3>
                <div className="mt-5 space-y-4 text-sm font-medium text-slate-700">
                  <a href="#why" className="block hover:text-[#163A70]">Why this guide exists</a>
                  <a href="#why-came" className="block hover:text-[#163A70]">Remember why you came</a>
                  <a href="#status" className="block hover:text-[#163A70]">Maintaining legal status</a>
                  <a href="#criminal" className="block hover:text-[#163A70]">Criminal activity</a>
                  <a href="#work" className="block hover:text-[#163A70]">Unauthorized work</a>
                  <a href="#money" className="block hover:text-[#163A70]">Money management</a>
                  <a href="#academic" className="block hover:text-[#163A70]">Academic standing</a>
                  <a href="#countries" className="block hover:text-[#163A70]">Country notes</a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">More guides</h3>
                <div className="mt-5 space-y-4">
                  <Link to="/scholarship-tips/fully-funded-masters-phd-guide" className="block border-b border-slate-100 pb-4 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Planning</p>
                    <p className="mt-1 text-sm font-semibold leading-6">Fully Funded Master&apos;s &amp; PhD Application Guide</p>
                  </Link>
                  <Link to="/scholarship-tips/how-to-write-winning-sop" className="block border-b border-slate-100 pb-4 hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Application Documents</p>
                    <p className="mt-1 text-sm font-semibold leading-6">How to Write a Winning Statement of Purpose</p>
                  </Link>
                  <Link to="/scholarship-tips/interview-preparation" className="block hover:text-[#163A70]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Interview</p>
                    <p className="mt-1 text-sm font-semibold leading-6">Scholarship Interview Questions &amp; Answers</p>
                  </Link>
                </div>
              </div>

             {/* GOOGLE ADS - SIDEBAR RESPONSIVE */}
<GoogleSidebarAd
  className="mx-auto mt-2 mb-0 max-w-[720px]"
/>

             
            </div>
          </aside>
        </div>
      </section>

      <section className="w-full bg-[#163A70] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center lg:px-8">
          <h3 className="font-serif text-4xl font-bold leading-tight">
            Need more guidance before you go?
          </h3>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/85">
            Browse verified scholarships, fellowships, and university-funded
            graduate programs organized by destination, degree level, and deadline.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/scholarship"
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              Browse Scholarships
            </Link>

            <Link
              to="/fellowship"
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              Browse Fellowships
            </Link>

            <Link
              to="/funded-graduate-admission"
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              University-Funded Programs
            </Link>

            <Link
              to="/student-sign-up"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              Join Free
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">In This Guide</h3>
              <div className="mt-5 space-y-4">
                <a href="#status" className="block hover:text-[#163A70]">Maintaining legal status</a>
                <a href="#work" className="block hover:text-[#163A70]">Unauthorized work</a>
                <a href="#money" className="block hover:text-[#163A70]">Money management</a>
                <a href="#countries" className="block hover:text-[#163A70]">Country notes</a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Share this guide</h3>
              <div className="mt-5 flex gap-3">
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 hover:border-[#163A70] hover:bg-white">🔗</button>
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 hover:border-[#163A70] hover:bg-white">✉</button>
              </div>
            </div>

            <div className="md:text-right">
              <h2 className="font-serif text-3xl font-bold text-[#163A70]">
                Scholars<span className="text-amber-500">Knowledge</span>
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                Helping students discover verified scholarships, fellowships, funded graduate opportunities, and expert application guidance.
              </p>
              <div className="mt-6 flex flex-wrap justify-start gap-5 text-sm text-slate-500 md:justify-end">
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Use</Link>
                <Link to="/contact">Contact</Link>
              </div>
              <p className="mt-8 text-sm text-slate-500">© 2026 ScholarsKnowledge. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}


