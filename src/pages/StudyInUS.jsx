// src/pages/StudyInUS.jsx
import React from "react";
import { Link } from "react-router-dom";

/* ---------- tiny UI helpers ---------- */
function Section({ title, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-slate-700">{children}</div>
    </section>
  );
}
function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

/* ---------- Calendly URL (opens in new tab) ---------- */
const CALENDLY_URL =
  "https://calendly.com/stanleyluvanda/consultation-60-minutes?hide_event_type_details=1&hide_gdpr_banner=1&background_color=f3f6fb&text_color=0f172a&primary_color=2563eb";

export default function StudyInUS() {
  const openCalendly = (e) => {
    e.preventDefault();
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* HERO (soft blue -> soft red gradient + faint border) */}
        <header
          className="
            rounded-2xl border border-slate-100 p-5 shadow-sm
            bg-[linear-gradient(180deg,#eef6ff_0%,#fdfbff_55%,#fff5f5_100%)]
          "
        >
          <h1 className="text-2xl font-bold text-slate-900">Study in The U.S</h1>
          <p className="mt-1 text-slate-700">
            Are you in <b>Africa</b>, <b>Asia</b>, <b>Europe</b>, and want to study in the U.S.? We’ve
            got you covered with important information about U.S. higher learning education—
            admissions, funding, visas, campus life, and more.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>Admissions</Pill>
            <Pill>Funding</Pill>
            <Pill>Visas</Pill>
            <Pill>Campus Life</Pill>
            <Pill>STEM &amp; OPT</Pill>
          </div>

          {/* Small booking link right after the pill row (light green) */}
          <div className="mt-3">
            <button
              onClick={openCalendly}
              className="inline-flex items-center rounded-md border border-green-200 bg-green-100 px-3 py-2 text-xs font-medium text-green-800 hover:bg-green-200"
            >
              Book consultation appointment
            </button>
          </div>
        </header>

        {/* LAYOUT: main content + right sidebar images */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* LEFT — content */}
          <div className="space-y-6">
            <Section title="What is studying in the U.S. like?">
              <p>
                U.S. universities are credit-based and highly flexible. You’ll combine required
                core courses with electives that let you specialize, switch tracks, or add a
                concentration. Classes are interactive—expect weekly readings, labs, group
                projects, and graded assignments throughout the term, rather than a single
                final exam.
              </p>
              <p className="mt-2">
                Professors hold office hours where you can discuss coursework or research ideas
                one-on-one. Academic integrity is a major priority: proper citation and original
                work are essential. Most campuses offer extensive support: writing and tutoring
                centers, international student advisors, career services, counseling, and student
                clubs—great for building networks and settling in.
              </p>
              <p className="mt-2">
                Many international students work on-campus during the academic year (subject to
                visa rules) and pursue internships via CPT/OPT. STEM programs can unlock extended
                training time after graduation, a key pathway into U.S. industry and research labs.
              </p>
            </Section>

            <Section title="How to prepare before coming to the U.S.">
              <ul className="list-disc pl-5 space-y-1">
                <li>Collect transcripts, degree certificates, and certified translations.</li>
                <li>Budget for tuition + living + insurance; plan housing early (on-campus vs. off-campus).</li>
                <li>Complete required vaccinations; consider travel insurance; bring an international debit/credit card.</li>
                <li>Learn campus basics: LMS (Canvas/Blackboard), email, ID card, library, and banking setup.</li>
              </ul>
            </Section>

            <Section title="Cost-effective options (public universities & tuition strategies)">
              <p>
                Public universities in smaller cities often cost less than large coastal metros.
                Look for graduate assistantships (RA/TA), merit scholarships, tuition waivers, or
                in-state tuition pathways where available. Always confirm current tuition/fees on
                each university’s website, and compare housing and local cost of living when
                evaluating offers.
              </p>
            </Section>

            <Section title="STEM programs directory">
              <p>
                STEM stands for <b>Science, Technology, Engineering, and Mathematics</b>. Programs
                officially classified as STEM may qualify for a <b>24-month STEM OPT extension</b>
                after the initial 12-month OPT. Common STEM fields include:
              </p>
              <ul className="list-disc pl-5 mt-2 grid md:grid-cols-2 gap-x-8">
                <li>Computer Science, Data Science, AI/ML</li>
                <li>Electrical, Mechanical, Civil, Chemical Engineering</li>
                <li>Biology, Biochemistry, Biotechnology</li>
                <li>Mathematics, Statistics, Applied Math</li>
                <li>Environmental Science, Geosciences</li>
                <li>Information Systems (if STEM-designated)</li>
              </ul>
            </Section>

            <Section title="Advantages of STEM programs for international students">
              <ul className="list-disc pl-5 space-y-1">
                <li>Up to 36 months total OPT (12 + 24 STEM extension if eligible).</li>
                <li>High employer demand; research funding and assistantships are common.</li>
                <li>Strong pathways to industry, national labs, and startups.</li>
              </ul>
            </Section>

            <Section title="How to select an academic program">
              <ul className="list-disc pl-5 space-y-1">
                <li>Match curriculum to your goals; verify prerequisites and any bridge courses.</li>
                <li>Check faculty research groups, labs, placement reports, and alumni outcomes.</li>
                <li>Compare funding (RA/TA), class size, city cost of living, and internship pipelines.</li>
              </ul>
            </Section>

            <Section title="Why consider U.S. graduate programs (Master’s & PhD)">
              <ul className="list-disc pl-5 space-y-1">
                <li>Flexible coursework + research with extensive lab infrastructure.</li>
                <li>Assistantships/tuition waivers are more common at the graduate level.</li>
                <li>Direct collaboration with industry; strong internship and co-op pathways.</li>
              </ul>
            </Section>

            <Section title="English proficiency (recommended tests)">
              <ul className="list-disc pl-5 space-y-1">
                <li>Common options: TOEFL iBT, IELTS Academic, Duolingo English Test (DET).</li>
                <li>Meet or exceed program minimums; higher scores often help with TA positions.</li>
                <li>Some schools waive scores for prior English-medium degrees—confirm per program.</li>
              </ul>
            </Section>

            <Section title="Visas & timelines (high level)">
              <ul className="list-disc pl-5 space-y-1">
                <li>Typical intakes: Fall (Aug/Sep), Spring (Jan), and some Summer (May) starts.</li>
                <li>After admission & I-20, pay the SEVIS fee and book your F-1 visa interview.</li>
                <li>Arrive before program start; complete check-in/orientation with the international office.</li>
              </ul>
            </Section>

            {/* Book a consultation — OPEN NEW TAB */}
            <Section title="Book a 1-hour consultation ($50)">
              <p>
                Get personalized guidance on programs, funding, applications, and visas. Click the
                button below to choose a time—your Calendly will open in a new tab, with times shown
                in <b>your local timezone</b>.
              </p>
              <div className="mt-3">
                <button
                  onClick={openCalendly}
                  className="rounded-xl bg-blue-600 text-white px-5 py-3 text-sm font-medium hover:bg-blue-700 shadow-sm"
                >
                  Check availability &amp; book ($50 / 60 min)
                </button>
              </div>
            </Section>

            <div className="pt-2">
              <Link to="/" className="text-blue-600 underline">Back to Home</Link>
            </div>
          </div>

          {/* RIGHT — image card (faint border). 
              We guarantee “campus + U.S. flag” by overlaying a small flag on a campus photo. */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              {/* First image: campus building + visible U.S. flag (overlay) */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                {/* Campus building */}
                <img
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1460518451285-97b6aa326961?auto=format&fit=crop&w=1600&q=80"
                  alt="U.S. university campus building"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80";
                  }}
                />
                {/* U.S. flag overlay (always visible) */}
                <div
                  className="absolute bottom-3 right-3 flex items-center"
                  aria-label="U.S. flag"
                >
                  {/* simple “pole” */}
                  <div className="h-16 w-[3px] bg-neutral-700/80 shadow-sm md:h-20"></div>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg"
                    alt="United States flag"
                    className="ml-1 h-12 w-auto rounded-[2px] shadow-md ring-1 ring-white/80 md:h-14"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Second image: students */}
              <div className="mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl">
                <img
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80"
                  alt="Students cheering"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1200&q=80";
                  }}
                />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}