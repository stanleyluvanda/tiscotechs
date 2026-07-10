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
      <h2 className="break-words text-2xl font-bold leading-tight text-[#4B1F73] sm:text-3xl">{title}</h2>

      <div className="mt-4 break-words text-base leading-8 text-slate-800 sm:text-[18px] sm:text-justify">
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
    title: "How to Write and structure a Winning Statement of Purpose",
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
    title: "Fully Funded Master's & PhD Application Guide",
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
    title: "Staying On Track Abroad: What International Students Must Do",
    category: "Study Abroad",
    emoji: "🌍",
    time: "14 min read",
    link: "/scholarship-tips/staying-on-track-abroad",
  },
];




  function TocStrip() {
  return (
    <div className="mb-12 flex flex-wrap items-center gap-2 rounded-md border border-[#DCD4C2] bg-[#F1ECE0] px-5 py-4">
      <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#766F60]">
        On this page
      </span>

      {[
        ["#admissions", "Admissions"],
        ["#funding", "Funding"],
        ["#visa", "Visa"],
        ["#stem", "STEM & OPT"],
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
    <div className="pt-2">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#766F60]">
        Related guides
      </p>

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
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#766F60]">
        On this page
      </p>

      <div className="mt-4 space-y-3">
       
        {[
  ["#what-us-study-like", "What Studying in the U.S. Is Like"],
  ["#why-us-graduate-programs", "Why Choose U.S. Graduate Programs"],
  ["#prepare-before-us", "How to Prepare Before Arrival"],
  ["#admissions", "Admissions Requirements"],
  ["#funding", "Funding & Financial Aid"],
  ["#cost-effective-options", "Cost-Effective Study Options"],
  ["#visa", "Student Visa Process"],
  ["#f1-visa-interview", "F-1 Visa Interview Preparation"],
  ["#campus", "Campus Life"],
  ["#arrival-checklist", "Arrival Checklist"],
  ["#stem", "STEM Programs Directory"],
  ["#stem-advantages", "Benefits of STEM Programs"],
  ["#select-academic-program", "Selecting an Academic Program"],
  ["#culture", "English Proficiency"],
  ["#english-accent-barriers", "Accent & Communication"],
  ["#cultural-shocks", "Cultural Adjustment"],
  ["#first-90-days", "Build Cultural Confidence"],
  ["#book-consultation", "Book a 1-Hour Consultation"],
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
          src="/images/studyinus-hero.png"
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
              Destination Guide — United States
            </span>
          </div>

          <h1 className="max-w-3xl break-words font-serif text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-7xl">
            Study in <span className="italic font-normal text-[#C9A24B]">the U.S.</span>
          </h1>

          <div className="mt-6 max-w-2xl space-y-4 text-sm leading-7 text-white/85 sm:mt-7 sm:text-[16px] sm:leading-8">
            <p>
              Studying in the United States is a major decision. You need to understand which schools fit you, what it actually costs, how the visa process works, and what life looks like after arrival.
            </p>
            <p>
              This guide brings admissions, funding, visas, STEM/OPT, English preparation, and campus life into one practical pathway for students coming from anywhere in the world.
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
              Book consultation appointment →
            </button>
            <span className="font-mono text-[11px] tracking-wide text-white/55">
              $50 · 60 minutes · 1-on-1
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
    Studying in the United States is one of the most rewarding academic
    opportunities available to international students. Whether you are planning
    to pursue a Bachelor's, Master's, or PhD, understanding the admissions
    process, scholarships, funding opportunities, student visas, academic
    culture, and campus life is essential for making informed decisions.
  </p>

  <p className="mt-5 break-words text-base leading-8 text-slate-700 sm:mt-6 sm:text-[21px] sm:leading-10">
    This comprehensive ScholarsKnowledge guide brings together everything you
    need in one place—from choosing the right university and preparing strong
    applications to understanding funding, OPT, STEM programs, English
    proficiency, and adapting successfully to life in the United States.
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
          Updated June 2026 · International Students Guide
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
    src="/images/Study in the USA with diversity.png"
    alt="Study in USA for international students"
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
  Studying in the United States is shaped by a flexible, credit‑based academic system that allows students to 
  design pathways aligned with their goals.Programs combine required foundational courses with a broad selection 
  of electives, enabling specialization, interdisciplinary exploration, or adjustments in academic focus over time. 
  Classroom environments emphasize active learning through weekly readings, laboratory sessions, group projects, presentations, 
  and continuous assessment rather than relying solely on a final examination.
</p>

<p className="mt-2">
  Faculty members maintain dedicated office hours, offering opportunities for one‑on‑one academic support, discussion of course material, 
  and engagement in research interests. Academic integrity is a core expectation across all institutions, requiring students to produce original work,
   follow proper citation standards, and uphold ethical scholarship. Universities also provide extensive support services—including writing and tutoring centers, 
   international student advising, career development offices, counseling services, and student organizations—to help students build community and succeed academically.
</p>

<p className="mt-2">
  International students often participate in on‑campus employment during the academic year in accordance with visa regulations,
   and many pursue internships through Curricular Practical Training (CPT) or Optional Practical Training (OPT). 
  Students enrolled in STEM‑designated programs may qualify for extended post‑completion training, offering valuable pathways into U.S. industries, 
  research institutions, and innovation‑driven sectors.
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

  <p className="mb-2">
    For international students, pursuing a graduate degree in the United States—whether a Master’s or PhD—often provides far greater academic, financial, and 
    professional benefits than enrolling in an undergraduate program. Graduate education in the U.S. is designed to develop advanced expertise, research 
    capability, and industry readiness, making it a strategic choice for students seeking meaningful career advancement. Unlike undergraduate programs, which 
    are typically more expensive and offer limited funding for international students, graduate programs frequently provide assistantships, tuition waivers, 
    and research opportunities that significantly reduce the cost of study. The structure of U.S. graduate education also emphasizes specialization, 
    innovation, and collaboration with industry, giving students access to cutting‑edge laboratories, interdisciplinary coursework, and high‑impact 
    professional networks. For students aiming to strengthen their academic profile, enhance employability, or transition into research‑intensive or 
    technology‑driven careers, U.S. graduate programs offer a more practical, financially sustainable, and academically rewarding pathway.
  </p>

  <ul className="list-disc pl-5 space-y-1">

    <li>
      <b>Flexible coursework and advanced research opportunities:</b> Graduate programs allow students to tailor their studies through elective courses, 
      concentrations, and interdisciplinary options. Master’s and PhD students gain access to extensive laboratory infrastructure, faculty‑led research 
      groups, and specialized facilities that are rarely available at the undergraduate level.
    </li>

    <li>
      <b>Greater access to funding and tuition support:</b> Assistantships, tuition waivers, fellowships, and research positions are far more common at the 
      graduate level. These opportunities can significantly reduce or fully cover tuition while providing valuable teaching or research experience—benefits 
      that are rarely available to international undergraduate students.
    </li>

    <li>
      <b>Stronger pathways to industry and research careers:</b> Graduate students often collaborate directly with industry partners, national laboratories, 
      and innovation hubs. Many programs integrate internships, co‑ops, and applied research projects that prepare students for high‑demand roles in 
      technology, engineering, science, business analytics, and other advanced fields.
    </li>

    <li>
      <b>Higher return on investment (ROI):</b> A U.S. Master’s or PhD typically leads to stronger career outcomes, higher earning potential, and access to 
      specialized roles that require advanced training. For many students, the combination of funding opportunities and career advancement makes graduate 
      study more cost‑effective than pursuing a four‑year undergraduate degree abroad.
    </li>

    <li>
      <b>Professional maturity and academic readiness:</b> Students entering graduate programs often bring prior academic or work experience, enabling them 
      to engage more deeply with research, innovation, and advanced coursework. This maturity enhances classroom discussions, collaboration, and overall 
      academic performance.
    </li>

    <li>
      <b>Enhanced immigration and training benefits:</b> Graduate STEM programs often qualify for up to 36 months of Optional Practical Training (OPT), 
      providing extended time for professional experience in the U.S. This makes graduate study particularly attractive for students seeking industry exposure 
      or research careers.
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
{/*<Section title="How to prepare before coming to the U.S.">*/}
  <p className="mb-2">
    Preparing to study in the United States requires a thoughtful combination of academic planning, financial readiness, and immigration compliance. 
    Before departure, students must ensure that their application materials, funding strategies, and visa processes are fully aligned with university and 
    federal requirements. Because these steps can be complex—especially for first‑time international applicants—ScholarsKnowledge provides structured, 
    research‑driven guidance to help students navigate admissions expectations, secure funding opportunities, and complete visa procedures with confidence.
  </p>

  <ul className="list-disc pl-5 space-y-1">

    <li>
      <b>Admissions preparation:</b> Gather all essential academic documents, including official transcripts, degree certificates, standardized test scores 
      (if required), and certified translations. Review program prerequisites, confirm application deadlines, and prepare strong supporting materials such 
      as statements of purpose and recommendation letters. These documents are critical for admission decisions, enrollment verification, and academic placement.
    </li>

    <li>
      <b>Funding and financial planning:</b> Develop a comprehensive financial strategy that accounts for tuition, housing, meals, transportation, health 
      insurance, and personal expenses. Compare funding opportunities such as merit scholarships, research or teaching assistantships (RA/TA), tuition 
      waivers, and external fellowships. Once admitted, carefully review your I‑20 financial requirements and secure accommodation early—whether on‑campus 
      or off‑campus—to ensure a stable living arrangement upon arrival.
    </li>

    <li>
      <b>Visa preparation and timelines:</b> After receiving your admission offer and Form I‑20, pay the SEVIS I‑901 fee and schedule your F‑1 visa interview 
      as early as possible, as appointment availability varies by country and season. Prepare all required documents, including financial proof, academic 
      records, and admission letters. Plan to arrive in the U.S. within the permitted entry window and complete mandatory international student check‑in, 
      orientation, and immigration compliance steps upon arrival.
    </li>

    <li>
      <b>Health and travel readiness:</b> Complete all required vaccinations and review your university’s health compliance guidelines. Consider obtaining 
      travel insurance for additional protection during transit. Bring an international debit or credit card to manage initial expenses before opening a 
      U.S. bank account.
    </li>

    <li>
      <b>Campus systems and onboarding:</b> Familiarize yourself with essential campus platforms such as the learning management system (Canvas or Blackboard), 
      your student email, ID card procedures, library access, and academic support services. Understanding these systems in advance helps you transition smoothly 
      into your academic environment and reduces the stress of your first weeks on campus.
    </li>

  </ul>
</Section>
<GoogleSidebarAd className="my-2" />






<Section id="admissions" title="Admissions: Understanding Requirements and Academic Fit">
  <p className="mb-2">
    The admissions process is the foundation of your academic journey in the United States. Selecting the right program and preparing a strong application 
    ensures that you enter an environment aligned with your academic strengths, professional goals, and long‑term aspirations. Because U.S. universities 
    evaluate applicants holistically, students must understand each component of the application and how it contributes to demonstrating academic readiness 
    and program fit.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      Review program prerequisites carefully, including required coursework, GPA expectations, and any standardized tests such as the GRE, GMAT, TOEFL, or IELTS.
    </li>
    <li>
      Prepare strong supporting documents—statements of purpose, recommendation letters, CV/resume, and writing samples—tailored to the program’s academic focus.
    </li>
    <li>
      Research faculty interests, departmental strengths, and available research groups to ensure alignment with your academic and professional goals.
    </li>
    <li>
      Track application deadlines for each university, noting that competitive programs often have earlier priority deadlines for funding consideration.
    </li>
    <li>
      After admission, complete all required enrollment steps, including accepting the offer, submitting financial documentation, and requesting your Form I‑20.
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
<Section id="funding" title="Funding: Navigating Scholarships, Assistantships,Financial Aid, and Financial Planning">
  <p className="mb-2">
    Funding is one of the most important considerations for international students pursuing higher education in the United States. Understanding the full 
    cost of attendance—and the financial support options available—helps you make informed decisions and avoid unexpected expenses. Many U.S. universities 
    offer competitive funding packages, especially at the graduate level, that can significantly reduce or fully cover tuition costs.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      Explore institutional funding opportunities such as research assistantships (RA), teaching assistantships (TA), fellowships, and tuition waivers.
    </li>
    <li>
      Compare the total cost of attendance across universities, including tuition, housing, transportation, health insurance, and personal expenses.
    </li>
    <li>
      Review merit‑based scholarships and departmental awards, noting eligibility criteria and application deadlines.
    </li>
    <li>
      Consider cost‑effective options such as public universities in smaller cities, which often offer lower tuition and living expenses.
    </li>
    <li>
      Ensure your financial documentation meets university and visa requirements, as this is essential for receiving your I‑20 and securing your F‑1 visa.
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
<Section id="cost-effective-options" title="Cost-effective options (public universities & tuition strategies)">
{/*<Section title="Cost-effective options (public universities & tuition strategies)">*/}
  <p className="mb-2">
    The cost of studying in the United States varies widely depending on the state, city, and type of institution. Public universities—especially those located 
    in smaller or mid-sized cities across the Midwest, South, and interior regions—tend to offer the most affordable tuition and living expenses. In contrast, 
    universities in major coastal metropolitan areas such as New York, California, Massachusetts, or Washington often have significantly higher housing, 
    transportation, and daily living costs. While public institutions generally provide the most cost-effective pathways, certain private universities also 
    offer competitive affordability through generous merit scholarships, institutional grants, or need-based aid. Understanding these geographical and 
    institutional differences is essential for selecting a financially sustainable academic option.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      Prioritize public universities in smaller or mid-sized cities, as they typically offer lower tuition rates and more affordable living costs compared to 
      institutions in large coastal metropolitan areas. These regional public universities often deliver strong academic programs at a fraction of the cost.
    </li>

    <li>
      Consider private universities that provide substantial merit scholarships, tuition discounts, or institutional grants. Although private institutions 
      generally have higher base tuition, some become highly affordable when strong financial aid packages are awarded—sometimes matching or even beating 
      public university costs.
    </li>

    <li>
      Explore institutional funding opportunities such as graduate assistantships (RA/TA positions), merit-based scholarships, tuition waivers, and 
      departmental awards. These forms of support can significantly reduce or fully offset tuition while offering valuable academic or research experience.
    </li>

    <li>
      Review whether the institution offers pathways to in-state tuition eligibility for certain categories of students, such as graduate assistants, 
      long-term residents, or participants in specific academic programs. In-state tuition can reduce costs by thousands of dollars per year.
    </li>

    <li>
      Verify all tuition and fee information directly on each university’s official website, as costs vary widely by institution, program, and residency status. 
      When comparing offers, evaluate the total cost of attendance—including housing, transportation, food, books, and local cost of living—to determine the 
      most financially sustainable option.
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
<Section id="visa" title="Visas: Managing Timelines, Documentation, and Compliance">
  <p className="mb-2">
    The U.S. student visa process is structured and time‑sensitive, requiring careful preparation to ensure a smooth transition into your academic program. 
    Understanding each step—from receiving your I‑20 to completing post‑arrival requirements—helps you remain compliant with immigration regulations and 
    avoid delays that could affect your enrollment.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      U.S. universities typically offer Fall (Aug/Sep), Spring (Jan), and some Summer (May) intakes; visa timelines should be planned around these cycles.
    </li>
    <li>
      After receiving your Form I‑20, pay the SEVIS I‑901 fee and schedule your F‑1 visa interview as early as possible, as appointment availability varies.
    </li>
    <li>
      Prepare all required documents for your visa interview, including financial proof, academic records, admission letters, and passport‑sized photos.
    </li>
    <li>
      Upon visa approval, plan your travel within the permitted 30‑day entry window before your program start date.
    </li>
    <li>
      Complete mandatory international student check‑in, orientation, and immigration compliance steps immediately after arrival.
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
<Section id="f1-visa-interview" title="F-1 Visa Interview: Common Questions and How to Prepare">
{/*<Section title="F‑1 Visa Interview: Common Questions and How to Prepare">*/}
  <p className="mb-2">
    The F‑1 visa interview is a brief but important evaluation of your academic intentions, financial readiness, and long‑term plans. Consular officers ask 
    targeted questions to confirm that you are a genuine student who understands your program, can afford your studies, and intends to return home after 
    completing your degree. Preparing clear, confident responses helps you communicate your goals effectively and reduces interview anxiety.
  </p>

  <ul className="list-disc pl-5 space-y-4">

    <li>
      <b>Why do you want to study in the United States?</b>
      <div className="mt-1">
        Officers want to understand your academic motivation. Strong answers highlight the strengths of the U.S. education system—research facilities, 
        curriculum flexibility, faculty expertise, or industry connections—and explain how these align with your long‑term academic and professional goals.
      </div>
    </li>

    <li>
      <b>Your home country has good universities. Why not study there?</b>
      <div className="mt-1">
        This question tests whether your choice is intentional and academically justified. Explain the specific advantages of your chosen U.S. program, 
        such as specialized concentrations, advanced laboratories, interdisciplinary opportunities, or global industry exposure that may not be available 
        in your home country.
      </div>
    </li>

    <li>
      <b>Who is funding your education?</b>
      <div className="mt-1">
        Financial clarity is essential. You must clearly explain your funding sources—family support, personal savings, scholarships, assistantships, or 
        educational loans—and demonstrate that these resources are sufficient for the full duration of your program.
      </div>
    </li>

    <li>
      <b>What are your plans after graduation?</b>
      <div className="mt-1">
        Officers want to confirm that you intend to return home after completing your studies. Strong responses emphasize your career goals in your home 
        country and how the U.S. degree will enhance your professional opportunities and long‑term contributions.
      </div>
    </li>

    <li>
      <b>Why did you choose this university and program?</b>
      <div className="mt-1">
        Your answer should reflect genuine research—mentioning faculty expertise, curriculum strengths, research groups, or industry partnerships that 
        influenced your decision.
      </div>
    </li>

    <li>
      <b>Do you have relatives in the United States?</b>
      <div className="mt-1">
        Provide accurate information. This question helps officers understand your personal ties and ensure your intentions are academic, not immigration‑driven.
      </div>
    </li>

    <li>
      <b>How will this program help your career?</b>
      <div className="mt-1">
        Explain how the skills, knowledge, and training you will gain in the U.S. directly support your professional goals in your home country.
      </div>
    </li>

    <li>
      <b>Have you traveled abroad before?</b>
      <div className="mt-1">
        This question assesses your travel history and compliance with previous visas. Honest, concise answers are best.
      </div>
    </li>

    <li>
      <b>Where will you live in the U.S.?</b>
      <div className="mt-1">
        Officers expect you to have a clear housing plan—on‑campus residence, off‑campus apartment, or temporary accommodation arranged before arrival.
      </div>
    </li>

  </ul>

  <p className="mt-2">
    While every interview is unique, the key to success is clarity, honesty, and confidence. Your answers should reflect genuine academic purpose, 
    financial preparedness, and a clear understanding of your chosen program. Practicing these questions in advance helps you communicate effectively 
    and make a strong impression during your visa interview.
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
<Section id="campus" title="Campus Life: Academic Culture, Support Systems, and Student Integration">
  <p className="mb-2">
    Campus life in the United States is designed to support both academic success and personal development. Universities emphasize interactive learning, 
    academic integrity, and community engagement, creating an environment where students can grow intellectually and socially. Understanding campus culture 
    and available support services helps international students adapt more quickly and thrive throughout their studies.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      Expect interactive classrooms with discussions, group projects, presentations, and continuous assessment throughout the semester.
    </li>
    <li>
      Utilize faculty office hours for academic support, research discussions, and mentorship opportunities.
    </li>
    <li>
      Access campus resources such as writing centers, tutoring services, career development offices, and mental‑health counseling.
    </li>
    <li>
      Join student organizations, cultural associations,Community-based associations, and academic clubs to build networks and integrate into the campus community.
    </li>
    <li>
      Explore on‑campus employment opportunities and internships through CPT/OPT to gain practical experience in your field.
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
{/*<Section title="Arrival Checklist: Preparing for a Smooth Transition">*/}
  <p className="mb-2">
    The arrival phase marks the beginning of your academic experience in the United States. Completing essential tasks early ensures a smooth transition 
    and helps you settle into your new environment with confidence. This checklist supports first‑time travelers and returning students alike as they 
    navigate housing, health requirements, campus systems, and immigration compliance.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      Confirm your housing arrangements and move‑in details, whether on‑campus or off‑campus.
    </li>
    <li>
      Complete required health forms, immunization records, and insurance enrollment as instructed by your university.
    </li>
    <li>
      Attend international student orientation and complete mandatory check‑in with the international office.
    </li>
    <li>
      Set up your student ID card, campus email, learning management system access, and library account.
    </li>
    <li>
      Open a U.S. bank account, explore transportation options, and familiarize yourself with campus safety resources.
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
  <p className="mb-2">
    STEM refers to academic fields in <b>Science, Technology, Engineering, and Mathematics</b>. 
    Programs officially classified as STEM by the U.S. Department of Homeland Security may qualify international students for a <b>
      24‑month STEM OPT extension</b> after completing the initial 12‑month Optional Practical Training period. These programs are 
      designed to develop analytical, technical, and research-oriented skills that are highly valued across U.S. industries, research institutions, and innovation sectors.
  </p>

  <p className="mb-2">
    STEM‑designated degrees span a wide range of disciplines, from computational sciences and engineering to biological and environmental fields. 
    While each university determines which programs receive STEM classification, the categories below represent some of the most common areas recognized nationwide.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      <b>Computer and Information Sciences:</b> Computer Science, Data Science, Artificial Intelligence, Machine Learning, Cybersecurity, Software Engineering.
    </li>
    <li>
      <b>Engineering Disciplines:</b> Electrical Engineering, Mechanical Engineering, Civil Engineering, Chemical Engineering, Aerospace Engineering, Industrial Engineering.
    </li>
    <li>
      <b>Biological and Life Sciences:</b> Biology, Biochemistry, Biotechnology, Molecular Biology, Microbiology, Neuroscience.
    </li>
    <li>
      <b>Mathematics and Quantitative Fields:</b> Mathematics, Statistics, Applied Mathematics, Actuarial Science, Computational Mathematics,Economics.
    </li>
    <li>
      <b>Environmental and Earth Sciences:</b> Environmental Science, Environmental Engineering, Geosciences, Earth Systems Science, Atmospheric Science.
    </li>
    <li>
      <b>Information Systems (when STEM‑designated):</b> Certain Information Systems, Business Analytics, and Technology Management programs may qualify depending on institutional classification.
    </li>
  </ul>

  <p className="mt-2">
    Because STEM designation varies by institution, students should always verify a program’s official classification on the university’s website or through the international student office. Confirming STEM eligibility is essential for planning long‑term academic and career pathways, especially for those intending to pursue extended training or employment in the United States.
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
            {/*<Section title="Advantages of STEM programs for international students">*/}
  <ul className="list-disc pl-5 space-y-1">
    <li>
      STEM‑designated degrees provide international students with the opportunity to pursue up to 
      <b>36 months of Optional Practical Training (OPT)</b> in the United States—12 months of standard OPT 
      followed by a 24‑month STEM extension for eligible programs. This extended training period allows 
      students to gain substantial professional experience in their field.
    </li>
    <li>
      Employers across technology, engineering, research, and scientific sectors consistently demonstrate 
      strong demand for STEM graduates. Many universities offer robust research funding, laboratory 
      opportunities, and graduate assistantships that provide hands‑on experience while reducing the cost 
      of study.
    </li>
    <li>
      STEM programs offer well‑established pathways into industry roles, national research laboratories, 
      innovation hubs, and early‑stage startups. These environments enable students to apply technical 
      knowledge, contribute to cutting‑edge projects, and build competitive professional portfolios.
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
            {/*<Section title="How to select an academic program">*/}
  <p className="mb-2">
    Selecting the right academic program is one of the most important decisions in a student’s educational journey. The program you choose shapes your academic development, career opportunities, and long‑term professional direction. Because the process can feel overwhelming—especially when comparing curricula, faculty expertise, funding options, and career outcomes—students often benefit from structured guidance. ScholarsKnowledge provides clear, research‑driven support to help you evaluate programs confidently and make informed choices aligned with your goals.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      Evaluate the curriculum in detail to ensure it aligns with your academic interests and long‑term career goals. Review course descriptions, required prerequisites, and any bridge or foundation courses that may be necessary for students transitioning from different academic backgrounds.
    </li>
    <li>
      Research the faculty and their areas of expertise by exploring departmental profiles, active research groups, laboratories, and ongoing projects. Strong faculty mentorship, well‑funded labs, and clear research directions can significantly enhance your academic and professional development.
    </li>
    <li>
      Examine program outcomes by reviewing placement reports, internship statistics, and alumni career trajectories. These indicators provide insight into how effectively the program prepares graduates for industry roles, research positions, or further academic study.
    </li>
    <li>
      Compare available funding opportunities such as research assistantships (RA), teaching assistantships (TA), fellowships, and tuition waivers. Consider class sizes, faculty‑to‑student ratios, and the overall learning environment, as these factors influence academic support and engagement.
    </li>
    <li>
      Assess the cost of living in the city or region where the university is located, including housing, transportation, and daily expenses. Evaluate the strength of local internship pipelines, industry partnerships, and proximity to major employment hubs, as these elements can shape your practical training and career prospects.
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
  <p className="mb-2">
    English is the primary language of instruction at all accredited U.S. colleges and universities, making strong English proficiency essential for academic 
    success, classroom participation, research communication, and daily life. International students should prepare specifically in <b>academic English</b>, 
    which emphasizes reading comprehension, academic writing, listening to lectures, and speaking clearly in professional or classroom settings. In addition 
    to standardized tests, some U.S. universities offer <b>Intensive English Language Programs (IELP)</b> designed to help students strengthen their English 
    before beginning their degree. These programs may be offered <b>on‑campus or online</b>. On‑campus IELP can be expensive because students must travel to 
    the U.S. and attend classes prior to full program admission, often paying program (IELP) fees,housing and living costs during the language period. To reduce expenses, students 
    should ask whether the university provides <b>online IELP options</b>, which allow them to improve their English proficiency from home before traveling. 
    Preparing early—through structured study, practice tests, and exposure to academic materials—helps students meet or exceed university requirements and 
    strengthens their overall application.
  </p>

  <ul className="list-disc pl-5 space-y-1">

    <li>
      <b>Recommended English proficiency tests:</b> Commonly accepted options include the TOEFL iBT, IELTS Academic, and the Duolingo English Test (DET). 
      Each test evaluates academic reading, writing, listening, and speaking skills, though formats and scoring systems differ. Students should choose the 
      test that aligns with their strengths, test-taking style, and university requirements.
    </li>

    <li>
      <b>Meeting or exceeding minimum score requirements:</b> Every program sets its own minimum English proficiency score. Competitive applicants often 
      aim higher than the minimum, as strong scores can improve admission chances and may be required for teaching assistantships (TA positions), especially 
      in STEM fields where communication with students is essential.
    </li>

    <li>
      <b>Score waivers for English-medium education:</b> Some universities waive English test requirements for students who completed prior degrees in 
      English-speaking institutions or countries. However, waiver policies vary widely, so students must confirm requirements directly with each program 
      before assuming eligibility.
    </li>

    <li>
      <b>Preparing with academic English:</b> Students should focus on academic vocabulary, structured writing, critical reading, and listening to lectures 
      or academic discussions. Watching university lectures, reading scholarly articles, practicing timed essays, and engaging in English-speaking environments 
      can significantly improve performance on proficiency tests and overall readiness for U.S. academic life.
    </li>

    <li>
      <b>Understanding real-world expectations:</b> Beyond test scores, students will use English daily—for communicating with professors, participating in 
      group projects, writing research papers, interviewing for internships, and navigating campus life. Strong English proficiency is therefore not only 
      an admissions requirement but a practical necessity for academic and professional success in the United States.
    </li>

  </ul>
</Section>

<Section id="english-accent-barriers" title="English accent barriers and communication challenges">
{/*<Section title="English accent barriers and communication challenges">*/}
  <p className="mb-2">
    Even when international students have strong test scores in English, real‑world communication in the United States can feel challenging. American English 
    includes a wide range of regional accents, fast speech, slang, and idiomatic expressions that are rarely covered in textbooks or exam preparation. These 
    differences can affect understanding in lectures, group projects, and everyday interactions on and off campus. However, with consistent exposure and 
    intentional practice, students typically adapt and become increasingly confident communicators.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      <b>Regional accents and speed of speech:</b> The U.S. has many accents—Southern, Midwestern, Northeastern, West Coast, and more. Professors, classmates, 
      and community members may speak quickly, drop sounds, or use local expressions. At first, students may need to ask people to repeat themselves or speak 
      more slowly, which is completely acceptable and normal.
    </li>

    <li>
      <b>Slang, idioms, and informal language:</b> Phrases like “what’s up,” “hit me up,” or “that’s on me” can be confusing if students only learned formal 
      English. Similarly, idioms (“break the ice,” “hit the books,” “pull an all‑nighter”) appear frequently in conversation. Over time, exposure through 
      classmates, media, and campus life helps students decode and eventually use these expressions comfortably.
    </li>

    <li>
      <b>Listening in academic settings:</b> Understanding lectures, group discussions, and student presentations can be demanding, especially in the first 
      semester. Students may benefit from sitting closer to the front, recording lectures (if allowed), reviewing slides in advance, and asking follow‑up 
      questions during office hours to clarify key points.
    </li>

    <li>
      <b>Speaking confidence and accent self‑consciousness:</b> Many students worry that their own accent will be judged or misunderstood. In reality, U.S. 
      campuses are highly international, and multiple accents are common. The goal is clarity, not sounding “perfectly American.” With practice, students 
      learn to slow down, articulate clearly, and repeat or rephrase when needed.
    </li>

    <li>
      <b>Off‑campus communication:</b> Interactions with landlords, store staff, bus drivers, or coworkers may feel harder than talking with professors, who 
      are used to international students. Different speaking styles, background noise, and unfamiliar contexts can make listening more difficult. Over time, 
      students learn common phrases used in these settings and become more comfortable asking for clarification.
    </li>

    <li>
      <b>Practical strategies to improve understanding:</b> Listening to podcasts, news, and lectures in American English; watching movies or series with 
      subtitles; joining conversation groups; and speaking regularly with classmates all help train the ear. Repetition and daily exposure are more powerful 
      than occasional intensive study.
    </li>

    <li>
      <b>Becoming competent over time:</b> Most students notice a clear improvement after a few months of immersion. They begin to understand different accents, 
      anticipate common phrases, and respond more naturally. What once felt exhausting becomes routine, and English turns from a barrier into a tool for 
      connection, learning, and professional growth.
    </li>
  </ul>

  <p className="mt-2">
    Accent barriers and communication challenges are not signs of weakness—they are a normal part of using a second language in a new environment. With 
    patience, practice, and openness to learning, students develop strong, confident communication skills that serve them well in the U.S. and globally.
  </p>
</Section>
<GoogleSidebarAd
  slot="8562818627"
  label=""
  className="my-2 bg-transparent"
  minHeight={250}
  keepPlaceholder={false}
/>

<Section id="cultural-shocks" title="Cultural shocks for international students">
{/*<Section title="Cultural shocks for international students">*/}
  <p className="mb-2">
    Cultural shock describes the confusion, stress, or discomfort that many international students feel when they encounter a new social environment, 
    especially in the first weeks or months in the United States. Even well‑prepared students can be surprised by differences in classroom behavior, 
    social norms, daily routines, and expectations around independence and responsibility. Understanding these patterns in advance helps students interpret 
    what they experience not as personal failure, but as a normal stage of adjustment that gradually improves with time, exposure, and support.
  </p>

  <ul className="list-disc pl-5 space-y-1">
    <li>
      <b>Classroom culture and participation:</b> U.S. classrooms often emphasize discussion, critical thinking, and student participation. Professors may 
      expect students to ask questions, challenge ideas, and share opinions openly. For students from more lecture‑based or hierarchical systems, this can 
      feel uncomfortable or even disrespectful at first. Over time, observing peers, attending office hours, and asking clarifying questions helps students 
      adapt to this interactive style.
    </li>

    <li>
      <b>Individualism and independence:</b> American culture places strong value on personal responsibility, self‑expression, and independent decision‑making. 
      Students may be expected to manage their own schedules, advocate for themselves with professors or administrators, and make choices about courses, 
      housing, and finances. This level of autonomy can feel overwhelming initially but becomes empowering as students gain confidence.
    </li>

    <li>
      <b>Social norms and relationships:</b> Greetings, friendships, and professional relationships may feel more informal than in many other countries. 
      Students might call professors by their first names (if invited), interact casually with staff, or form friendships quickly but with less long‑term 
      obligation. Understanding that “friendly” does not always mean “deeply close” helps set realistic expectations for relationships.
    </li>

    <li>
      <b>Time, punctuality, and planning:</b> Punctuality is taken seriously in academic and professional settings. Arriving late to class, meetings, or 
      interviews may be viewed negatively. Students also find that deadlines are enforced strictly, and planning ahead is essential for assignments, 
      visa processes, and housing.
    </li>

    <li>
      <b>Daily life and off‑campus interactions:</b> Everyday tasks—such as shopping, using public transport, signing leases, or visiting banks—may involve 
      unfamiliar procedures and expectations. Students may feel uncertain about tipping, queuing, or how to ask for help. With time, observation and 
      asking polite questions help students navigate these systems more comfortably.
    </li>

    <li>
      <b>Emotional impact and adjustment:</b> Cultural shock often includes feelings of homesickness, frustration, or isolation. These emotions are normal. 
      Joining student organizations, cultural associations, religious communities, or interest‑based clubs can provide support networks that make the 
      transition easier and help students feel seen and understood.
    </li>

    <li>
      <b>Gradual adaptation:</b> Most students find that after a few months, what once felt strange becomes familiar. As they learn local norms, build 
      friendships, and succeed academically, their confidence grows. Cultural shock becomes an opportunity for personal growth and intercultural competence.
    </li>
  </ul>

  <p className="mt-2">
    Recognizing cultural shock as a normal, temporary phase allows students to approach it with patience rather than fear. Over time, they develop skills 
    that are valuable far beyond the classroom: adaptability, empathy, and the ability to work across cultures.
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
{/*<Section title="How to Build Cultural Confidence in the First 90 Days">*/}
  <p className="mb-2">
    The first 90 days in the United States are a critical adjustment period for international students. During this time, students encounter new academic 
    expectations, unfamiliar social norms, and diverse communication styles. While the transition can feel overwhelming, it is also the period when students 
    make the fastest progress in cultural understanding, language fluency, and personal confidence. By approaching these early months with intentional 
    strategies—such as active engagement, consistent practice, and openness to new experiences—students can build strong cultural competence and establish 
    a solid foundation for academic and social success throughout their studies.
  </p>

  <ul className="list-disc pl-5 space-y-1">

    <li>
      <b>Engage actively in campus orientation and welcome programs:</b> Orientation sessions introduce students to academic expectations, campus resources, 
      safety procedures, and cultural norms. Participating fully helps students understand how the university operates and provides early opportunities to 
      meet peers, faculty, and support staff.
    </li>

    <li>
      <b>Join student organizations and cultural groups:</b> Becoming part of clubs, associations, or interest-based groups helps students build friendships, 
      practice English in real conversations, and feel a sense of belonging. Cultural organizations also provide emotional support and familiarity during 
      the adjustment period.
    </li>

    <li>
      <b>Practice English daily in real-life settings:</b> Speaking with classmates, roommates, professors, and community members accelerates language 
      adaptation. Students should not fear making mistakes—consistent practice is the fastest way to improve listening comprehension, accent familiarity, 
      and speaking confidence.
    </li>

    <li>
      <b>Observe and learn local communication styles:</b> Paying attention to how Americans greet each other, express opinions, ask questions, or disagree 
      respectfully helps students understand social cues. Over time, students naturally adopt communication patterns that make interactions smoother and 
      more comfortable.
    </li>

    <li>
      <b>Use campus support services early:</b> Writing centers, tutoring services, counseling offices, and international student advisors are designed to 
      help students succeed. Seeking support early prevents small challenges from becoming larger obstacles and builds confidence in navigating university systems.
    </li>

    <li>
      <b>Explore the local community:</b> Visiting grocery stores, libraries, parks, cafés, and community events helps students understand daily life outside 
      campus. These experiences strengthen independence and reduce anxiety about off-campus interactions.
    </li>

    <li>
      <b>Build a routine that balances academics and well-being:</b> Establishing consistent study habits, sleep schedules, exercise routines, and social 
      activities helps students stay grounded. A balanced routine reduces stress and supports long-term cultural adjustment.
    </li>

    <li>
      <b>Reflect on progress and celebrate small wins:</b> Understanding a new accent, navigating public transportation, completing a group project, or 
      making a new friend are meaningful milestones. Recognizing these achievements helps students stay motivated and confident.
    </li>

    <li>
      <b>Stay open-minded and patient with yourself:</b> Cultural adaptation is not instant. Students should expect moments of confusion or discomfort, 
      but these experiences gradually diminish as familiarity grows. Patience, curiosity, and willingness to learn are key to building long-term cultural competence.
    </li>

  </ul>

  <p className="mt-2">
    By approaching the first 90 days with intentional engagement, consistent practice, and a willingness to step outside their comfort zone, international 
    students can transform early challenges into meaningful growth. These foundational months shape their confidence, communication skills, and overall 
    success throughout their academic journey in the United States.
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
            <Section id="book-consultation" title="Book a 1-hour consultation ($50)">
            {/*<Section title="Book a 1-hour consultation ($50)">*/}
              <p>
  Get personalized, one‑on‑one guidance on programs, funding, applications, and visas. When you book a consultation, you will meet with an advisor who will 
  review your academic background, career goals, and preferred study destinations to help you make informed decisions. During the session, you can expect 
  clear explanations of program requirements, scholarship opportunities, realistic timelines, and strategies for strengthening your application. You may also 
  discuss visa preparation, documentation, and common interview questions to ensure you feel confident and well‑prepared. Click the button below to choose a 
  time—your Calendly will open in a new tab, with all available slots automatically displayed in <b>your local timezone</b>.
</p>
              <div className="mt-3">
                <button
                  onClick={openCalendly}
                  className="rounded-sm bg-[#B6542C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#8E3F1F] shadow-sm"
                >
                  Check availability &amp; book ($50 / 60 min)
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
        src="/images/Study in the USA with diversity.png"
        alt="U.S. university campus building"
        loading="lazy"
      />
      <div className="absolute bottom-3 right-3 flex items-center">
        <img
          src="/images/study-usa-banner.png"
          alt="Study in USA"
          className="ml-1 h-16 w-auto rounded-md shadow-md md:h-20"
          loading="lazy"
        />
      </div>
    </div>

    <div className="mt-3 overflow-hidden rounded-none bg-white shadow-md ring-1 ring-slate-200 sm:rounded-2xl">
      <div className="aspect-[3/4] w-full overflow-hidden">
        <img
          className="h-full w-full object-cover"
          src="/images/OneOnOne Consultation.png"
          alt="One-on-one academic consultation"
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
          Book a One-on-One Consultation
        </h3>*/}
        <h3 className="mt-3 break-words text-lg font-extrabold leading-tight text-[#1E2A3D] sm:whitespace-nowrap lg:text-[1.22rem]">
  Book a One-on-One Consultation
</h3>

        <p className="mt-3 text-base leading-8 text-slate-800 sm:text-[18px]">
          Schedule a 1-hour consultation for <b>$50</b> and receive personalized
          guidance on all major aspects of studying in the United States,
          including admissions, academic program selection, funding,
          scholarships, visas, and preparation for campus life.
        </p>

        <div className="mt-4 grid gap-2 text-[15px] text-slate-700">
          <div className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>Admissions and application planning</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>Funding, scholarships, and assistantships</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>Visa preparation and interview guidance</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-blue-600">•</span>
            <span>Academic and campus-life transition support</span>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={openCalendly}
            className="w-full whitespace-nowrap rounded-sm bg-[#B6542C] px-4 py-3 text-[13px] md:text-sm font-semibold text-white shadow-sm transition hover:bg-[#8E3F1F]"
          >
            Check availability &amp; book ($50 / 60 min)
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
            Whether you are a student striving for academic success, a lecturer
            shaping future leaders, or a partner empowering opportunities,
            ScholarsKnowledge is your platform to grow, share, and achieve together.
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
