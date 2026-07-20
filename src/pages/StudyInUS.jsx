// src/pages/StudyInUS.jsx
import React, { useEffect, useState } from "react";
//import React from "react";
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";

/* ---------- tiny UI helpers ---------- */

function Section({ id, title, children }) {
  return (
    <section
      id={id}
      className="
  -mx-4
  bg-[#f3f6fb]
  rounded-none
  border-y border-slate-200
  ring-0 outline-none
  shadow-none
  p-4
  font-['Times_New_Roman',Times,serif]
  scroll-mt-40
  sm:mx-0
  sm:rounded-2xl
  sm:border-0
  sm:p-6
"
    >
      <h2 className="break-words text-2xl font-bold leading-tight tracking-[-0.01em] text-[#4B1F73] sm:text-3xl">{title}</h2>

      <div className="mt-4 break-words text-base leading-8 text-slate-800 [&_li]:pl-1 [&_p+p]:mt-4 [&_ul]:mt-4 [&_ul]:space-y-3 sm:text-[18px] sm:text-justify">
        {children}
      </div>
    </section>
  );
}
     


function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-white/25 bg-white/5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">
      {children}
    </span>
  );
}




/* ---------- Calendly URL (opens in new tab) ---------- */
const CALENDLY_URL =
  "https://calendly.com/stanleyluvanda/consultation-60-minutes?hide_event_type_details=1&hide_gdpr_banner=1&background_color=f3f6fb&text_color=0f172a&primary_color=2563eb";


const guides = [
  {
    title: "How to Write and Structure a Winning Statement of Purpose",
    category: "Application Documents",
    emoji: "📝",
    time: "12 min read",
    link: "/scholarship-tips/how-to-write-winning-sop",
  },
  {
    title: "How to Get Strong Recommendation Letters",
    category: "Letters & References",
    emoji: "📬",
    time: "9 min read",
    link: "/scholarship-tips/recommendation-letters",
  },
  {
    title: "How to Write a Research Proposal",
    category: "Research Writing",
    emoji: "🔬",
    time: "11 min read",
    link: "/scholarship-tips/research-proposal#what",
  },
  {
    title: "How to Write a Winning Scholarship CV",
    category: "Application Documents",
    emoji: "📄",
    time: "8 min read",
    link: "/scholarship-tips/scholarship-cv#difference",
  },
  {
    title: "Scholarship Interview Questions & Answers",
    category: "Interview Preparation",
    emoji: "🎤",
    time: "13 min read",
    link: "/scholarship-tips/interview-preparation",
  },
  {
    title: "Fully Funded Master’s and PhD Application Guide",
    category: "Planning",
    emoji: "🎓",
    time: "15 min read",
    link: "/scholarship-tips/fully-funded-masters-phd-guide",
  },
  {
  title: "STEM MBA Universities & Programs Guide",
  category: "STEM MBA",
  emoji: "💼",
  time: "10 min read",
  link: "/stem-mba-guide#universities",
},
  {
  title: "What Is a Fellowship? A Complete Guide for International Students",
  category: "Fellowships",
  emoji: "🏆",
  time: "14 min read",
  link: "/fellowship-guide#find",
},
  {
    title: "Staying on Track Abroad: What International Students Should Know",
    category: "Study Abroad",
    emoji: "🌍",
    time: "14 min read",
    link: "/scholarship-tips/staying-on-track-abroad",
  },
];




  function TocStrip() {
  return (
    <div className="mb-12 flex flex-wrap items-center gap-2 rounded-md border border-[#DCD4C2] bg-[#F1ECE0] px-5 py-4">
      <span className="block text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#766F60]">
  On this page
    </span>
      
      {[
        ["#admissions", "Admissions"],
        ["#funding", "Funding"],
        ["#visa", "Visa"],
        ["#stem", "STEM and OPT"],
        ["#campus", "Campus Life"],
        ["#culture", "English & Culture"],
      ].map(([href, label]) => (
        <a
          key={href}
          href={href}
          className="border-r border-[#DCD4C2] px-3 text-sm font-medium text-[#3B4A63] last:border-r-0 hover:text-[#B6542C]"
        >
          {label}
        </a>
      ))}
    </div>
  );
}



function FactRow() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {[
        ["20 hrs", "Max weekly on-campus work during term time under F-1 status"],
        ["12 + 24", "Months of OPT, with STEM extension for eligible majors"],
        ["Office hrs", "Weekly faculty time built into nearly every course"],
      ].map(([number, label]) => (
        <div key={number} className="rounded-md bg-[#1E2A3D] p-5 text-white">
          <div className="font-serif text-3xl font-bold text-[#C9A24B]">
            {number}
          </div>

          <p className="mt-2 text-sm leading-6 text-white/70">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}


/* ==========================================================
   Related Scholarship Guides
========================================================== */

function RelatedGuideLinks() {
  return (
    /*<div className="pt-2">*/
      <div className="rounded-md border border-[#DCD4C2] bg-[#F1ECE0] p-5">
      {/*<p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#766F60]">
        Related guides
      </p>*/}
      <div className="-mx-5 -mt-5 mb-4 rounded-t-md bg-[#D8CBB3] px-5 py-3">
  <p className="w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A4235]">
    Related guides
  </p>
</div>

      <div className="mt-4 space-y-4">
        {guides.map((guide) => (
          <Link
            key={guide.title}
            to={guide.link}
            className="group block border-b border-[#DCD4C2] pb-4 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">
                {guide.emoji}
              </span>

              <div>
                <p className="text-sm font-bold leading-5 text-[#1E2A3D] group-hover:text-[#B6542C]">
                  {guide.title}
                </p>

                <p className="mt-1 text-xs text-[#766F60]">
                  {guide.category} · {guide.time}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SidebarOnThisPage() {
  return (
    <div className="rounded-md border border-[#DCD4C2] bg-[#F1ECE0] p-5">
      {/*<p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#766F60]">
        On this page
      </p>*/}
     <div className="-mx-5 -mt-5 mb-4 bg-[#D8CBB3] px-5 py-3">
  <p className="w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A4235]">
    On this page
  </p>
</div>
      
      <div className="mt-4 space-y-3">
       
        {[
  ["#what-us-study-like", "What Studying in the U.S. Is Like"],
  ["#why-us-graduate-programs", "Why Choose U.S. Graduate Programs"],
  ["#prepare-before-us", "How to Prepare Before Arrival"],
  ["#admissions", "Admissions Requirements"],
  ["#funding", "Funding and Financial Aid"],
  ["#cost-effective-options", "Cost-Effective Study Options"],
  ["#visa", "Student Visa Process"],
  ["#f1-visa-interview", "F-1 Visa Interview Preparation"],
  ["#campus", "Campus Life"],
  ["#arrival-checklist", "Arrival Checklist"],
  ["#stem", "STEM Programs Directory"],
  ["#stem-advantages", "Benefits of STEM Programs"],
  ["#select-academic-program", "Selecting an Academic Program"],
  ["#culture", "English Proficiency"],
  ["#english-accent-barriers", "Accent and Communication"],
  ["#cultural-shocks", "Cultural Adjustment"],
  ["#first-90-days", "Build Cultural Confidence"],
  ["#book-consultation", "Book a One Hour Consultation"],
].map(([href, label]) => (
  <a
    key={href}
    href={href}
    className="block text-sm font-semibold text-[#1E2A3D] hover:text-[#B6542C]"
  >
    {label}
  </a>
))}






      </div>
    </div>
  );
}


/* ==========================================================
   Main Component
========================================================== */





export default function StudyInUS() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", onScroll);
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const openCalendly = (e) => {
    e.preventDefault();
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF7F0] text-[#3D3A33]">
      {/* FULL-WIDTH EDITORIAL HERO */}
      <header className="relative flex min-h-[520px] w-full items-center overflow-hidden bg-[#1E2A3D] sm:min-h-[560px]">
         <img
          src="/images/studyinus-hero.webp"
          alt="Travel to the United States for university"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2400&q=80";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E2A3D]/95 via-[#1E2A3D]/85 to-[#1E2A3D]/20" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px w-10 bg-[#C9A24B]" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9A24B]">
              Destination Guide: United States
            </span>
          </div>

          <h1 className="max-w-3xl break-words font-serif text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-7xl">
            Study in <span className="italic font-normal text-[#C9A24B]">the U.S.</span>
          </h1>

          <div className="mt-6 max-w-2xl space-y-4 text-sm leading-7 text-white/85 sm:mt-7 sm:text-[16px] sm:leading-8">
            <p>
              Studying in the United States is a significant academic and financial decision. A strong plan begins with understanding which institutions fit your goals, what attendance will realistically cost, how the visa process works, and what daily life may look like after arrival.
            </p>
            <p>
              This guide brings admissions, funding, visas, STEM and OPT, English preparation, and campus life together in one practical pathway for students applying from around the world.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Pill>Admissions</Pill>
            <Pill>Funding</Pill>
            <Pill>Visas</Pill>
            <Pill>Campus Life</Pill>
            <Pill>STEM &amp; OPT</Pill>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={openCalendly}
              className="inline-flex items-center rounded-sm bg-[#B6542C] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8E3F1F]"
            >
              Book a consultation appointment →
            </button>
            <span className="font-mono text-[11px] tracking-wide text-white/55">
              $50 · 60 minutes · Individual session
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* LEFT — content */}
          <div className="space-y-12">
            <TocStrip />

            <section className="mb-12">
  <h1 className="break-words font-serif text-3xl font-bold leading-tight text-[#1E2A3D] sm:text-5xl">
    Do You Want to Study in the United States?
  </h1>

  <p className="mt-5 break-words text-base leading-8 text-slate-700 sm:mt-6 sm:text-[21px] sm:leading-10">
    A degree from a United States institution can provide access to rigorous
    academic training, diverse research environments, and professional networks
    that extend across many industries. Students considering a bachelor’s,
    master’s, or doctoral program should evaluate much more than university
    rankings. Admissions expectations, funding, visa requirements, academic
    culture, location, and student support all shape the quality and affordability
    of the experience.
  </p>

  <p className="mt-5 break-words text-base leading-8 text-slate-700 sm:mt-6 sm:text-[21px] sm:leading-10">
    This ScholarsKnowledge guide presents those decisions as a connected process.
    It explains how to identify suitable programs, prepare credible applications,
    compare financial offers, understand STEM and OPT opportunities, strengthen
    academic English, and adjust thoughtfully to campus and community life in the
    United States.
  </p>

  <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-slate-600">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#163A70] text-lg font-bold text-white">
        SK
      </div>

      <div>
        <p className="font-semibold text-slate-900">
          ScholarsKnowledge Editorial
        </p>

        <p>
          Updated June 2026 · Guide for International Students
        </p>
      </div>
    </div>

    <span className="rounded-full bg-[#163A70] px-4 py-2 font-semibold text-white">
      18 min read
    </span>
  </div>
</section>
{/* MOBILE STUDY USA IMAGE */}
<div className="-mx-4 mt-8 overflow-hidden border-y border-slate-200 bg-white sm:hidden">
  <img
    src="/images/Study-in-the-USA-with-diversity.webp"
    alt="International students studying in the United States"
    className="h-auto w-full object-cover"
    loading="lazy"
  />
</div>

<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>



            {/*<Section title="What is studying in the U.S. like?">*/}
              <Section id="what-us-study-like" title="What is studying in the U.S. like?">
  <p>
    Studying in the United States usually involves a credit based academic system
    that gives students room to combine required courses with electives. This
    structure allows many students to deepen a specialization, explore related
    disciplines, or refine their academic direction as their interests develop.
    Learning is typically continuous throughout the semester and may include
    assigned readings, laboratory work, problem sets, presentations, group
    projects, class participation, and several forms of assessment.
  </p>

  <p>
    The classroom culture often expects students to contribute actively rather
    than listen passively. Asking questions, discussing evidence, and presenting
    a reasoned position are considered part of academic development. Faculty
    members generally hold office hours where students can seek clarification,
    discuss research interests, and receive guidance on coursework. These
    conversations can become especially valuable for students who hope to join a
    research group or pursue graduate study.
  </p>

  <p>
    Academic integrity is treated as a central responsibility. Students are
    expected to submit original work, acknowledge sources accurately, and follow
    institutional rules on collaboration and the use of digital tools. Most
    universities also provide writing centers, tutoring, libraries, career
    services, counseling, disability support, and international student advising.
    Using these services early is a normal and productive part of university life.
  </p>

  <p>
    International students may work on campus within the limits of F-1 status and
    may become eligible for Curricular Practical Training or Optional Practical
    Training when the experience is connected to their field of study. Students
    in qualifying STEM programs may also be eligible for an additional period of
    practical training after graduation.
  </p>
  <FactRow />
</Section>
           <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-8 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>


 {/*<Section title="Why consider U.S. graduate programs (Master’s & PhD)">*/}
  <Section id="why-us-graduate-programs" title="Why consider U.S. graduate programs (Master’s & PhD)">
  <p>
    A graduate degree in the United States can be particularly valuable for
    students seeking advanced disciplinary knowledge, research experience, or a
    transition into a specialized profession. Master’s and doctoral programs are
    usually more focused than undergraduate degrees and often connect coursework
    with laboratories, research centers, professional practice, and faculty
    mentorship. The strongest programs are not simply prestigious. They offer a
    clear academic fit, credible supervision, appropriate resources, and outcomes
    that support the student’s future plans.
  </p>

  <ul className="list-disc pl-5">
    <li>
      <b>Focused academic development:</b> Graduate students can often select
      concentrations, electives, and research topics that match their interests.
      This depth is useful for students preparing for doctoral research,
      professional certification, policy work, or technically demanding careers.
    </li>

    <li>
      <b>Access to research and specialized facilities:</b> Many departments
      provide laboratories, archives, data resources, field projects, and faculty
      led research groups. The quality of supervision and the relevance of these
      resources should be examined carefully before applying.
    </li>

    <li>
      <b>More substantial funding possibilities:</b> Teaching assistantships,
      research assistantships, fellowships, tuition support, and departmental
      awards are more common in graduate education than in undergraduate study.
      Funding is competitive and should never be assumed, but a strong package can
      make graduate study considerably more affordable.
    </li>

    <li>
      <b>Connections to professional practice:</b> Programs may include
      internships, consulting projects, clinical experience, cooperative
      education, or partnerships with employers and public institutions. These
      opportunities help students connect academic knowledge with practical
      problems.
    </li>

    <li>
      <b>Stronger preparation for specialized careers:</b> A well chosen master’s
      or doctoral degree can improve access to roles that require advanced
      analysis, research ability, technical judgment, or subject expertise.
      Students should compare employment outcomes and not rely only on broad claims
      about salary or return on investment.
    </li>

    <li>
      <b>Extended practical training in eligible fields:</b> Graduates of
      qualifying STEM programs may receive up to 36 months of Optional Practical
      Training, subject to current immigration rules and employer requirements.
      This period can provide valuable professional experience, but it should be
      viewed as training connected to the degree rather than guaranteed employment.
    </li>
  </ul>
</Section>   
      <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-8 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

            
<Section id="prepare-before-us" title="How to prepare before coming to the U.S.">
  <p>
    Preparation for study in the United States should begin well before travel.
    Academic documents, funding, immigration requirements, housing, health
    records, and campus systems are closely connected. Treating them as one plan
    reduces avoidable delays and gives students a clearer picture of what they
    must complete before departure.
  </p>

  <ul className="list-disc pl-5">
    <li>
      <b>Organize academic records:</b> Collect official transcripts, degree
      certificates, test results, certified translations, and any course
      descriptions requested by the program. Confirm that names and dates are
      consistent across all documents.
    </li>

    <li>
      <b>Prepare application materials carefully:</b> Statements of purpose,
      recommendation letters, a curriculum vitae, writing samples, and research
      proposals should be tailored to the program. Each document should explain
      academic preparation, relevant experience, and the reasons the program is a
      logical next step.
    </li>

    <li>
      <b>Build a realistic financial plan:</b> Estimate tuition, mandatory fees,
      health insurance, housing, food, transportation, books, and initial setup
      costs. Compare scholarships, assistantships, fellowships, family support,
      savings, and other legitimate sources of funding before accepting an offer.
    </li>

    <li>
      <b>Manage visa steps in sequence:</b> After receiving an admission offer and
      Form I-20, review the information for accuracy, pay the SEVIS I-901 fee, and
      schedule the F-1 visa interview. Keep copies of financial records, academic
      documents, admission materials, and payment confirmations.
    </li>

    <li>
      <b>Prepare for health and travel requirements:</b> Complete vaccinations and
      health forms required by the university. Review insurance coverage, arrange
      temporary access to money, and keep essential documents in carry on luggage.
    </li>

    <li>
      <b>Learn the university’s systems:</b> Activate student email, review the
      learning platform, understand registration procedures, and identify the
      international office, library, writing center, and academic advising unit.
      Familiarity with these services makes the first weeks more manageable.
    </li>
  </ul>
</Section>
<GoogleSidebarAd className="my-2" />






<Section id="admissions" title="Admissions: Understanding Requirements and Academic Fit">
  <p>
    Admission to a United States university is not determined by a single factor.
    Departments usually consider academic preparation, the relevance of previous
    study, evidence of intellectual ability, written materials, recommendations,
    and the applicant’s fit with the program. A thoughtful application therefore
    requires both accurate documentation and a clear explanation of purpose.
  </p>

  <ul className="list-disc pl-5">
    <li>
      Review prerequisites, minimum grades, required coursework, language scores,
      and any GRE, GMAT, portfolio, writing sample, or professional experience
      requirements.
    </li>
    <li>
      Tailor the statement of purpose, curriculum vitae, recommendation letters,
      and research materials to the academic priorities of each program.
    </li>
    <li>
      Examine faculty interests, laboratories, research centers, course offerings,
      and recent departmental work to determine whether the program genuinely fits
      your goals.
    </li>
    <li>
      Track regular, priority, and funding deadlines separately. Applications
      submitted after an internal funding deadline may still be considered for
      admission but not for the strongest financial support.
    </li>
    <li>
      After admission, read every condition attached to the offer and complete
      enrollment, financial documentation, transcript verification, and Form I-20
      requests by the stated dates.
    </li>
  </ul>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

{/*<Section title="Funding: Navigating Scholarships, Assistantships, and Financial Planning">*/}
<Section id="funding" title="Funding: Scholarships, Assistantships, Financial Aid, and Planning">
  <p>
    Funding should be evaluated with the same care as academic quality. The most
    useful comparison is the net amount a student must pay after confirmed awards,
    not the advertised scholarship value alone. Students should calculate the full
    cost of attendance and distinguish guaranteed support from funding that depends
    on future performance, available positions, or annual renewal.
  </p>

  <ul className="list-disc pl-5">
    <li>
      Investigate research assistantships, teaching assistantships, fellowships,
      tuition remission, departmental scholarships, and institution wide awards.
    </li>
    <li>
      Compare tuition, mandatory fees, health insurance, housing, food,
      transportation, books, and personal expenses across every offer.
    </li>
    <li>
      Confirm whether an award is renewable, taxable, tied to employment, or
      dependent on maintaining a particular grade point average.
    </li>
    <li>
      Ask departments when assistantship decisions are made and whether newly
      admitted international students are normally considered.
    </li>
    <li>
      Ensure that financial evidence satisfies both university requirements for
      Form I-20 issuance and consular expectations for the F-1 visa process.
    </li>
  </ul>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>
<Section id="cost-effective-options" title="Affordable options (public universities and tuition strategies)">
  <p>
    The price of study in the United States varies substantially by institution,
    degree level, location, and living arrangement. A university with moderate
    tuition in a high cost city may be more expensive overall than a university
    with higher tuition in a less expensive region. Students should therefore
    compare total annual cost rather than tuition alone.
  </p>

  <ul className="list-disc pl-5">
    <li>
      Consider public universities in smaller and medium sized cities, where rent,
      transportation, and daily expenses may be lower than in major coastal
      metropolitan areas.
    </li>

    <li>
      Review private universities with substantial institutional aid. A higher
      published tuition price can become competitive when a university provides a
      strong scholarship or fellowship package.
    </li>

    <li>
      Compare graduate assistantships, tuition remission, departmental awards,
      and paid research opportunities. Read the appointment terms carefully to
      understand workload, duration, and renewal conditions.
    </li>

    <li>
      Check whether an assistantship changes the tuition rate or provides access
      to a reduced institutional rate. Eligibility rules differ widely and should
      be confirmed directly with the university.
    </li>

    <li>
      Use official university estimates and construct a personal budget that
      includes deposits, winter clothing, household items, transportation,
      technology, and travel. These initial costs are often missing from informal
      comparisons.
    </li>
  </ul>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>


{/*<Section title="Visas: Managing Timelines, Documentation, and Compliance">*/}
<Section id="visa" title="Visas: Timelines, Documentation, and Compliance">
  <p>
    The F-1 student visa process follows a defined sequence, but appointment
    availability and administrative processing can vary by country and season.
    Students should begin promptly after receiving Form I-20 and should rely on
    official instructions from the university and United States government
    agencies.
  </p>

  <ul className="list-disc pl-5">
    <li>
      Confirm the program start date and arrival instructions for the fall,
      spring, or summer intake listed on Form I-20.
    </li>
    <li>
      Pay the SEVIS I-901 fee, complete the required visa application, and schedule
      the F-1 interview as early as permitted.
    </li>
    <li>
      Prepare a valid passport, Form I-20, fee receipts, admission documents,
      academic records, and credible evidence of funding.
    </li>
    <li>
      Plan travel within the entry period permitted for new F-1 students and avoid
      purchasing inflexible tickets before the visa is issued.
    </li>
    <li>
      After arrival, complete university check in, maintain full time enrollment,
      update required address information, and consult the international office
      before changing programs, employment, or enrollment status.
    </li>
  </ul>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>
<Section id="f1-visa-interview" title="F-1 Visa Interview: Common Questions and Preparation">
  <p>
    The F-1 visa interview is usually brief, so applicants must explain their
    academic purpose, financial preparation, and future plans clearly. Responses
    should be truthful, specific to the chosen program, and consistent with the
    documents submitted. Memorized speeches are less persuasive than direct
    answers grounded in the applicant’s actual circumstances.
  </p>

  <ul className="list-disc pl-5 space-y-4">
    <li>
      <b>Why do you want to study in the United States?</b>
      <div className="mt-1">
        Explain the academic reasons for choosing the United States, such as a
        particular curriculum, research environment, professional method, or area
        of specialization. Connect those features to your prior preparation and
        future plans.
      </div>
    </li>

    <li>
      <b>Why not study in your home country?</b>
      <div className="mt-1">
        Acknowledge the value of education at home, then identify the specific
        academic features of the chosen program that are not readily available to
        you locally. Avoid general claims that one country is simply better.
      </div>
    </li>

    <li>
      <b>Why did you choose this university and program?</b>
      <div className="mt-1">
        Refer to concrete features such as courses, faculty expertise, facilities,
        research groups, accreditation, or professional partnerships. Your answer
        should show that the decision followed serious research.
      </div>
    </li>

    <li>
      <b>Who will fund your education?</b>
      <div className="mt-1">
        Identify each legitimate source of support and explain how the available
        funds will cover tuition and living expenses. The answer must be consistent
        with bank records, sponsorship letters, scholarships, or assistantship
        documents.
      </div>
    </li>

    <li>
      <b>What will you do after graduation?</b>
      <div className="mt-1">
        Describe a credible professional or academic plan connected to your home
        country or broader career path. Explain how the degree will contribute to
        that plan without making promises you cannot support.
      </div>
    </li>

    <li>
      <b>How will this program support your career?</b>
      <div className="mt-1">
        Identify the knowledge, research methods, technical skills, or professional
        exposure you expect to gain and explain where those capabilities will be
        useful after graduation.
      </div>
    </li>

    <li>
      <b>Do you have relatives in the United States?</b>
      <div className="mt-1">
        Answer accurately and briefly. Family connections should not be concealed,
        and they do not replace the need to explain a genuine academic purpose.
      </div>
    </li>

    <li>
      <b>Where will you live?</b>
      <div className="mt-1">
        State the confirmed or planned housing arrangement and show that you have
        considered distance, cost, and arrival timing.
      </div>
    </li>
  </ul>

  <p>
    Effective preparation means understanding your own application rather than
    rehearsing identical answers from the internet. Review your admission offer,
    Form I-20, financial plan, academic history, and program details so that your
    responses remain clear and consistent.
  </p>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

{/*<Section title="Campus Life: Academic Culture, Support Systems, and Student Integration">*/}
<Section id="campus" title="Campus Life: Academic Culture, Support, and Student Integration">
  <p>
    Campus life in the United States extends beyond classes. Academic departments,
    student organizations, support offices, libraries, recreation facilities, and
    community events all contribute to the student experience. International
    students benefit most when they participate deliberately while maintaining a
    manageable academic routine.
  </p>

  <ul className="list-disc pl-5">
    <li>
      Prepare for discussion based classes, group assignments, presentations, and
      frequent assessment throughout the semester.
    </li>
    <li>
      Use faculty office hours to ask substantive questions, discuss research, and
      seek guidance before academic difficulties become serious.
    </li>
    <li>
      Learn how to access writing support, tutoring, career services, counseling,
      disability services, and international student advising.
    </li>
    <li>
      Join academic societies, cultural associations, volunteer groups, and other
      organizations that reflect your interests and help you build relationships.
    </li>
    <li>
      Seek authorized campus employment or practical training only after checking
      the applicable F-1 rules with the designated school official.
    </li>
  </ul>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

<Section id="arrival-checklist" title="Arrival Checklist: Preparing for a Smooth Transition">
  <p>
    The first days after arrival involve practical tasks that affect immigration
    status, registration, housing, health, and daily life. Completing them in a
    clear order helps students settle more quickly and reduces the likelihood of
    missing an institutional deadline.
  </p>

  <ul className="list-disc pl-5">
    <li>
      Confirm the move in date, address, transportation from the airport, and any
      temporary accommodation needed before permanent housing becomes available.
    </li>
    <li>
      Complete international student check in and provide the university with the
      immigration documents it requests.
    </li>
    <li>
      Submit health and immunization records, enroll in required insurance, and
      identify nearby medical services and emergency contacts.
    </li>
    <li>
      Activate the student identification card, email, learning platform, library
      access, and any required authentication applications.
    </li>
    <li>
      Review the academic calendar, registration status, classroom locations,
      payment deadlines, and orientation schedule.
    </li>
    <li>
      Arrange banking, communication, food, transportation, and personal safety
      needs without sharing sensitive documents or financial information with
      unverified individuals.
    </li>
  </ul>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

            

            
            

            {/*<Section title="STEM programs directory">*/}
              <Section id="stem" title="STEM programs directory">
  <p>
    STEM refers to fields in <b>Science, Technology, Engineering, and Mathematics</b>.
    For immigration purposes, a degree must have an eligible Classification of
    Instructional Programs code to support an application for the 24 month STEM
    extension after the initial 12 months of Optional Practical Training. A
    program’s title alone does not determine eligibility.
  </p>

  <p>
    STEM classified degrees are available across computational, engineering,
    mathematical, biological, physical, environmental, and selected business
    disciplines. Common areas include the following:
  </p>

  <ul className="list-disc pl-5">
    <li>
      <b>Computer and information sciences:</b> Computer Science, Data Science,
      Artificial Intelligence, Machine Learning, Cybersecurity, and Software
      Engineering.
    </li>
    <li>
      <b>Engineering:</b> Electrical, Mechanical, Civil, Chemical, Aerospace,
      Biomedical, Environmental, and Industrial Engineering.
    </li>
    <li>
      <b>Biological and life sciences:</b> Biology, Biochemistry, Biotechnology,
      Molecular Biology, Microbiology, and Neuroscience.
    </li>
    <li>
      <b>Mathematics and quantitative disciplines:</b> Mathematics, Statistics,
      Applied Mathematics, Actuarial Science, Econometrics, and Computational
      Methods.
    </li>
    <li>
      <b>Physical, environmental, and earth sciences:</b> Physics, Chemistry,
      Environmental Science, Geoscience, Atmospheric Science, and Earth Systems.
    </li>
    <li>
      <b>Selected management and information programs:</b> Some Business
      Analytics, Information Systems, Financial Analytics, and Technology
      Management degrees may qualify when the assigned program code is eligible.
    </li>
  </ul>

  <p>
    Students should verify the exact program code on Form I-20 and ask the
    university’s international student office whether the degree is currently
    eligible for the STEM extension. This confirmation is more reliable than
    marketing language on a general program page.
  </p>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

           <Section id="stem-advantages" title="Advantages of STEM programs for international students">
  <ul className="list-disc pl-5">
    <li>
      Eligible graduates may apply for 12 months of Optional Practical Training
      and, when all requirements are satisfied, a further 24 month STEM extension.
      This creates additional time for structured professional training related to
      the degree.
    </li>
    <li>
      STEM departments often have strong links to laboratories, research centers,
      technology firms, public agencies, and technical employers. These links may
      support research appointments, internships, applied projects, and graduate
      assistantships.
    </li>
    <li>
      Training in quantitative reasoning, experimentation, computing, and problem
      solving can be useful across many sectors. Students should still compare the
      curriculum, faculty, placement evidence, and local employment environment of
      each program rather than assuming that every STEM degree produces the same
      outcome.
    </li>
  </ul>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

            
<Section id="select-academic-program" title="How to select an academic program">
  <p>
    Program selection should begin with academic fit and end with a realistic
    assessment of cost, supervision, location, and outcomes. Rankings can provide
    context, but they cannot determine whether a curriculum, faculty group, or
    financial package is appropriate for an individual student.
  </p>

  <ul className="list-disc pl-5">
    <li>
      Read the curriculum closely and identify required courses, electives,
      prerequisites, capstone requirements, thesis options, and opportunities for
      independent research.
    </li>
    <li>
      Study faculty profiles, current projects, recent publications, laboratories,
      and supervision capacity. For research degrees, the availability of a
      suitable mentor may be more important than the university’s overall ranking.
    </li>
    <li>
      Review graduation rates, internship access, employer relationships, doctoral
      placements, and alumni outcomes. Look for evidence that is specific to the
      department and degree.
    </li>
    <li>
      Compare the net cost after confirmed funding, the duration of support, the
      expected workload of any assistantship, and the conditions for renewal.
    </li>
    <li>
      Consider class size, access to advising, local cost of living,
      transportation, climate, community support, and proximity to relevant
      industries or research institutions.
    </li>
  </ul>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

           
            {/*<Section title="English proficiency (recommended tests)">*/}
            <Section id="culture" title="English proficiency (recommended tests)">
  <p>
    English proficiency affects much more than admission. Students use academic
    English to follow lectures, interpret complex readings, write papers, present
    arguments, collaborate with classmates, and communicate with supervisors.
    Preparation should therefore focus on the practical language demands of the
    degree, not only the minimum test score.
  </p>

  <p>
    Commonly accepted examinations include TOEFL iBT, IELTS Academic, and the
    Duolingo English Test. Acceptance and minimum scores vary by institution,
    department, and degree level. Some universities also require higher speaking
    scores for teaching assistantships or may offer an intensive English program
    before full enrollment. Students should confirm whether such a program is
    available online or requires additional residence and living expenses in the
    United States.
  </p>

  <ul className="list-disc pl-5">
    <li>
      <b>Choose an accepted examination:</b> Review the official requirements of
      every program before registering. A test accepted by one university may not
      be accepted by another department within the same institution.
    </li>
    <li>
      <b>Aim beyond the minimum when possible:</b> A stronger score may support a
      competitive application and can be important for positions that involve
      teaching, presentations, or extensive written work.
    </li>
    <li>
      <b>Verify waiver rules:</b> Some institutions waive testing for applicants
      educated in English, but the qualifying countries, institutions, and length
      of prior study differ considerably.
    </li>
    <li>
      <b>Practice academic communication:</b> Read scholarly articles, summarize
      arguments, listen to lectures, write timed responses, and explain technical
      ideas aloud. These activities build skills that remain useful after the test.
    </li>
    <li>
      <b>Prepare for daily communication:</b> Students also need English for
      housing, banking, health care, employment interviews, and community life.
      Regular conversation practice improves confidence and comprehension.
    </li>
  </ul>
</Section>

<Section id="english-accent-barriers" title="English accents and communication challenges">
  <p>
    Strong examination scores do not always make everyday communication
    immediately easy. Speech in the United States varies by region, age,
    profession, and social setting. Lectures may be fast, informal conversation
    may include unfamiliar expressions, and background noise can make ordinary
    tasks more demanding during the first months.
  </p>

  <ul className="list-disc pl-5">
    <li>
      <b>Variation in accent and pace:</b> Professors, classmates, and community
      members may pronounce words differently or speak more quickly than the audio
      used in language tests. Asking someone to repeat or rephrase is appropriate.
    </li>
    <li>
      <b>Informal vocabulary:</b> Idioms and conversational expressions often make
      sense only in context. Students can record unfamiliar phrases and check their
      meaning later rather than pretending to understand.
    </li>
    <li>
      <b>Academic listening:</b> Reviewing slides before class, sitting where audio
      is clear, taking structured notes, and attending office hours can improve
      comprehension. Recording should occur only when the instructor permits it.
    </li>
    <li>
      <b>Confidence in speaking:</b> An accent is not a deficiency. Clear pacing,
      organized ideas, and willingness to rephrase usually matter more than
      imitating a particular form of American pronunciation.
    </li>
    <li>
      <b>Communication outside campus:</b> Housing, transport, shopping, banking,
      and health care involve vocabulary that may not appear in academic courses.
      Familiarity grows through repeated use and observation.
    </li>
    <li>
      <b>Consistent practice:</b> News, podcasts, lectures, conversation groups,
      and regular discussion with classmates help students recognize different
      voices and respond more naturally over time.
    </li>
  </ul>

  <p>
    Communication usually becomes easier as students gain exposure and confidence.
    The objective is not to erase an accent, but to understand others, express ideas
    clearly, and participate fully in academic and professional settings.
  </p>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

<Section id="cultural-shocks" title="Cultural adjustment for international students">
  <p>
    Cultural adjustment refers to the emotional and practical process of learning
    how to function in a new social environment. Students may initially feel
    excited, uncertain, tired, or isolated as they encounter unfamiliar classroom
    expectations, communication styles, routines, and responsibilities. These
    reactions are common and usually change as experience and support increase.
  </p>

  <ul className="list-disc pl-5">
    <li>
      <b>Classroom participation:</b> Students may be expected to ask questions,
      evaluate arguments, and contribute to discussion. Respectful disagreement is
      often interpreted as engagement rather than disobedience.
    </li>
    <li>
      <b>Personal responsibility:</b> Universities expect students to monitor
      deadlines, communicate with instructors, seek assistance, and make informed
      choices about courses, housing, and finances.
    </li>
    <li>
      <b>Social relationships:</b> Conversation may feel informal and friendly,
      but closeness usually develops gradually. Students should allow relationships
      to grow through repeated contact and shared activities.
    </li>
    <li>
      <b>Time and punctuality:</b> Classes, appointments, interviews, and submission
      deadlines are generally treated as firm commitments. Planning ahead becomes
      especially important when transport or weather is unpredictable.
    </li>
    <li>
      <b>Daily routines:</b> Leasing housing, using public transport, understanding
      tipping, buying insurance, or visiting a bank may require unfamiliar
      procedures. University staff and trusted community organizations can help.
    </li>
    <li>
      <b>Emotional wellbeing:</b> Homesickness, frustration, and loneliness should
      not be ignored. Counseling, student groups, cultural associations, faith
      communities, and regular contact with supportive people can reduce isolation.
    </li>
  </ul>

  <p>
    Adjustment does not require abandoning one’s identity. It involves learning how
    local systems operate, deciding which practices are useful, and developing the
    confidence to work respectfully across cultures.
  </p>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

<Section id="first-90-days" title="How to Build Cultural Confidence in the First 90 Days">
  <p>
    The first 90 days provide an important foundation for academic habits,
    relationships, communication, and personal wellbeing. Students do not need to
    master every system immediately, but regular participation and early use of
    support services can prevent small uncertainties from becoming serious
    obstacles.
  </p>

  <ul className="list-disc pl-5">
    <li>
      <b>Participate fully in orientation:</b> Learn the academic rules, safety
      procedures, immigration responsibilities, campus services, and communication
      channels used by the university.
    </li>
    <li>
      <b>Introduce yourself to key people:</b> Meet instructors, academic advisers,
      international student staff, classmates, and residence personnel before you
      urgently need their assistance.
    </li>
    <li>
      <b>Join a small number of meaningful groups:</b> Academic clubs, cultural
      associations, sports, volunteering, and professional societies can provide
      community without overwhelming the study schedule.
    </li>
    <li>
      <b>Practice English in ordinary situations:</b> Brief conversations with
      classmates, neighbors, staff, and local residents develop listening ability
      and confidence more effectively than waiting until speech feels perfect.
    </li>
    <li>
      <b>Use academic support early:</b> Writing centers, tutoring, libraries,
      counseling, and office hours are most useful before a problem becomes urgent.
    </li>
    <li>
      <b>Learn the local environment:</b> Identify grocery stores, transport routes,
      health services, banks, safe walking areas, and emergency contacts.
    </li>
    <li>
      <b>Create a sustainable routine:</b> Protect time for study, sleep, exercise,
      meals, communication with family, and social activity. A stable routine
      improves both academic performance and emotional adjustment.
    </li>
    <li>
      <b>Review progress without harsh judgment:</b> Notice practical achievements,
      identify what remains confusing, and ask for specific help. Adaptation is a
      gradual learning process rather than a test of personal worth.
    </li>
  </ul>

  <p>
    Students who engage consistently, seek support, and remain patient with
    themselves usually become more confident as the semester progresses. The first
    months are not only a period of adjustment; they are also an opportunity to
    develop independence, intercultural judgment, and durable academic habits.
  </p>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

            {/* Book a consultation — OPEN NEW TAB */}
            <Section id="book-consultation" title="Book a one hour consultation ($50)">
  <p>
    Receive individual guidance on program selection, funding, applications, and
    visa preparation. During the consultation, an adviser will review your academic
    background, professional goals, preferred destinations, and current stage of
    preparation. The discussion can cover realistic program options, application
    documents, scholarship and assistantship strategies, financial planning,
    immigration documentation, and interview preparation. Use the button below to
    select an available time. Calendly will open in a new tab and display times in
    <b>your local timezone</b>.
  </p>
  <div className="mt-3">
    <button
      onClick={openCalendly}
      className="rounded-sm bg-[#B6542C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#8E3F1F] shadow-sm"
    >
      Check availability and book ($50 / 60 min)
    </button>
  </div>
</Section>

            <div className="pt-2">
              <Link to="/" className="text-blue-600 underline">
                Back to Home
              </Link>
            </div>
          </div>

          
          

{/* RIGHT — consultation card + ads */}
<aside className="space-y-6 lg:sticky lg:top-24">
  
  <div className="-mx-4 overflow-hidden rounded-none border-y border-[#DCD4C2] bg-white sm:mx-0 sm:rounded-md sm:border">
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
      <img
        className="h-full w-full object-cover"
        src="/images/Study-in-the-USA-with-diversity.webp"
        alt="University campus in the United States"
        loading="lazy"
      />
    </div>

    <div className="mt-3 overflow-hidden rounded-none bg-white shadow-md ring-1 ring-slate-200 sm:rounded-2xl">
      <div className="aspect-[3/4] w-full overflow-hidden">
        <img
          className="h-full w-full object-cover"
          src="/images/OneOnOne Consultation.webp"
          alt="Individual academic consultation"
          loading="lazy"
        />
      </div>

      <div className="bg-[#f8fafc] px-5 py-5 font-['Times_New_Roman',Times,serif]">
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            Personalized Guidance
          </div>
        </div>

        {/*<h3 className="mt-3 text-2xl font-bold leading-tight text-[#4B1F73]">
          Book an Individual Consultation
        </h3>*/}
        <h3 className="mt-3 break-words text-lg font-extrabold leading-tight text-[#1E2A3D] sm:whitespace-nowrap lg:text-[1.22rem]">
  Book an Individual Consultation
</h3>

        <p className="mt-3 text-base leading-8 text-slate-800 sm:text-[18px]">
          Schedule a one hour consultation for <b>$50</b> and receive individual
          guidance on studying in the United States. The session can address
          admissions, program selection, funding, scholarships, visa preparation,
          and the transition to campus life.
        </p>

        <div className="mt-4 grid gap-2 text-[15px] text-slate-700">
          <div className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>Admissions and application planning</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>Funding, scholarships, and graduate assistantships</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>Visa preparation and interview guidance</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>Academic planning and campus life preparation</span>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={openCalendly}
            className="w-full whitespace-nowrap rounded-sm bg-[#B6542C] px-4 py-3 text-[13px] md:text-sm font-semibold text-white shadow-sm transition hover:bg-[#8E3F1F]"
          >
            Check availability and book ($50 / 60 min)
          </button>
        </div>
      </div>
    </div>
  </div>

   {/* Related guides + invisible responsive ads */}
  <RelatedGuideLinks />
  <SidebarOnThisPage />

  <GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-8 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

</aside>
        </div>
      </main>

      {/* ✅ MOVE CTA OUTSIDE <main> so it can touch both edges */}
      <section className="mt-10 w-full bg-[#16140F] text-white">
        {/* keep inner content aligned with the site */}
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12 text-center">
          <h2 className="text-3xl font-extrabold">
            Join the Global Learning Community
          </h2>
          <p className="mt-3 text-white/90 max-w-2xl mx-auto">
            Students, lecturers, and institutional partners can use
            ScholarsKnowledge to exchange academic resources, discover educational
            opportunities, and contribute to a more connected learning community.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              to="/student-sign-up"
              className="w-full rounded-full bg-white px-5 py-2 text-center font-semibold text-[#1E2A3D] hover:bg-slate-100 sm:w-auto"
            >
              Student Sign Up
            </Link>

            <Link
              to="/lecturer-sign-up"
              className="rounded-full border border-white text-white px-5 py-2 font-semibold hover:bg-[#0a3d83]"
            >
              Lecturer Sign Up
            </Link>

            <Link
              to="/partner"
              className="w-full rounded-full bg-[#C9A24B] px-5 py-2 text-center font-semibold text-slate-900 hover:opacity-90 sm:w-auto"
            >
              Partner with Us
            </Link>
          </div>
        </div>
      </section>
      {showBackToTop && (
  <button
    onClick={scrollToTop}
    aria-label="Back to top"
    className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#163A70] text-white shadow-lg transition hover:bg-[#0F2B52]"
  >
    ↑
  </button>
)}
    </div>
  );
}