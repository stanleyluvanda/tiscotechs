// src/pages/About.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "About Us | ScholarsKnowledge";
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ✅ FULL-WIDTH HERO — keep current hero image and wording */}
      <header className="relative flex min-h-[60vh] w-full items-center overflow-hidden border-b border-slate-200 md:min-h-[72vh]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2400&q=80')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/55 to-slate-900/30" />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 text-center text-white">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            About ScholarsKnowledge
          </h1>

          <p className="mx-auto mt-5 max-w-4xl text-base leading-relaxed text-white/90 md:text-lg">
            ScholarsKnowledge LLC is a global academic platform committed to expanding access to education and strengthening academic communities worldwide.{" "}
            <span className="font-semibold text-white">
              We provide a secure digital platform where students, lecturers, institutions, and education-finance partners connect through knowledge-sharing, academic resources, and equitable funding opportunities.
            </span>{" "}
            Our mission is to remove barriers to education by delivering transparent, responsible, and sustainable services that support learning, collaboration, and global academic growth.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              Knowledge-sharing
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              EduFinancing
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              Global Community
            </span>
          </div>
        </div>
      </header>

      {/* MISSION / VISION — Claude editorial format adapted to JSX */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 border-b border-slate-200 pb-12 md:grid-cols-[220px_1fr] md:gap-10">
            <h2 className="font-serif text-2xl font-semibold text-[#0F2A47]">
              Our Mission
            </h2>

            <p className="max-w-3xl text-base leading-8 text-slate-600">
              We believe education transforms lives. At ScholarsKnowledge, our
              mission is to create a digital ecosystem where every student can
              access academic resources, financial aid, and career support—while
              lecturers, universities, and partners can share, collaborate, and
              empower the next generation of global learners.
            </p>
          </div>

          <div className="grid gap-4 pt-12 md:grid-cols-[220px_1fr] md:gap-10">
            <h2 className="font-serif text-2xl font-semibold text-[#0F2A47]">
              Our Vision
            </h2>

            <p className="max-w-3xl text-base leading-8 text-slate-600">
              We envision a world where learning is{" "}
              <span className="font-semibold text-[#0F2A47]">borderless</span>
              —a platform where a student in Africa can access resources from
              North America, collaborate with peers in Asia, and apply to
              scholarships in Europe—all in one place. ScholarsKnowledge is
              building this bridge for the next generation of learners.
            </p>
          </div>
        </div>
      </section>

      {/* WHO WE SERVE — same icons, Claude divided layout */}
      <section className="bg-[#F7F4EC] px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
            Who We Serve
          </div>

          <h2 className="mb-12 font-serif text-3xl font-semibold text-[#0F2A47]">
            Built around three roles, one platform
          </h2>

          <div className="grid gap-8 md:grid-cols-3 md:gap-0">
            <div className="md:pr-8">
              <span className="mb-4 block font-serif text-sm font-semibold text-[#C9962C]">
                01
              </span>

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50/80 text-2xl">
                🎓
              </div>

              <h3 className="text-lg font-bold text-[#0F2A47]">
                For Students
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                ScholarsKnowledge is your{" "}
                <span className="font-semibold">study hub</span>—offering notes,
                assignments, past papers, and an academic marketplace. Students
                also discover scholarships and education loans to fund their
                studies globally.
              </p>
            </div>

            <div className="border-t border-slate-300 pt-8 md:border-l md:border-t-0 md:px-8 md:pt-0">
              <span className="mb-4 block font-serif text-sm font-semibold text-[#C9962C]">
                02
              </span>

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50/80 text-2xl">
                👩‍🏫
              </div>

              <h3 className="text-lg font-bold text-[#0F2A47]">
                For Lecturers
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Lecturers manage and share academic materials, interact with
                students in dedicated university and global academic platforms,
                and build collaborative teaching environments.
              </p>
            </div>

            <div className="border-t border-slate-300 pt-8 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <span className="mb-4 block font-serif text-sm font-semibold text-[#C9962C]">
                03
              </span>

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50/80 text-2xl">
                🤝
              </div>

              <h3 className="text-lg font-bold text-[#0F2A47]">
                For Partners
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Universities, scholarship providers, and education finance
                partners like{" "}
                <span className="font-semibold text-[#0A4595]">
                  MPOWER Financing
                </span>{" "}
                collaborate with us to help international students achieve their
                educational and career goals.
              </p>
            </div>
          </div>

          <hr className="my-14 border-slate-300/80" />

          {/* EDUFINANCING — Claude format, current wording preserved */}
          <div className="grid gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
                EduFinancing
              </div>

              <h2 className="font-serif text-3xl font-semibold text-[#0F2A47]">
                EduFinancing
              </h2>

              <p className="mt-4 text-base leading-8 text-slate-600">
                Education should be accessible regardless of financial background.
                That’s why ScholarsKnowledge partners with MPOWER Financing and
                global scholarship providers to bring international students
                affordable options including:
              </p>
            </div>

            <ul className="divide-y divide-slate-300/80 text-sm text-slate-700">
              <li className="flex gap-3 py-4 first:pt-0">
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9962C]" />
                <span>
                  MPOWER Financing education loans (no co-signer or collateral
                  required)
                </span>
              </li>

              <li className="flex gap-3 py-4">
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9962C]" />
                <span>
                  Scholarships from universities, organizations, and foundations
                </span>
              </li>

              <li className="flex gap-3 py-4">
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9962C]" />
                <span>Personal savings strategies to reduce debt</span>
              </li>

              <li className="flex gap-3 py-4 last:pb-0">
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9962C]" />
                <span>Low-cost universities & colleges as alternative pathways</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FOUNDER — remove photo, use Claude-style initials avatar */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
            Leadership
          </div>

          <h2 className="mb-10 font-serif text-3xl font-semibold text-[#0F2A47]">
            Founder & CEO
          </h2>

          <div className="flex flex-col gap-7 border-y border-slate-200 py-10 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[3px] border-[#F1DCA6] bg-[#0F2A47] font-serif text-2xl font-semibold text-[#F1DCA6]">
              SL
            </div>

            <div>
              <p className="text-lg font-bold text-[#0F2A47]">
                Stanley Raphael Luvanda
              </p>

              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#2E6E63]">
                Founder & CEO, ScholarsKnowledge
              </p>

              <p className="mt-4 text-base leading-8 text-slate-600">
                Building ScholarsKnowledge to help students and lecturers share
                academic resources, connect across borders, and access financing
                opportunities. Focused on creating a trusted platform that
                supports learning, collaboration, and global academic growth.
              </p>

              <div className="mt-5 flex flex-wrap gap-6">
                <Link
                  to="/student-sign-up"
                  className="border-b-2 border-[#C9962C] text-sm font-bold text-[#0F2A47] transition hover:text-[#2E6E63]"
                >
                  Join as Student
                </Link>

                <Link
                  to="/lecturer-sign-up"
                  className="border-b-2 border-[#C9962C] text-sm font-bold text-[#0F2A47] transition hover:text-[#2E6E63]"
                >
                  Join as Lecturer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — Claude format adapted to existing routes */}
      <section className="bg-gradient-to-br from-[#0F2A47] to-[#0A1D33] px-4 py-16 text-center text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-serif text-3xl font-semibold">
            Join the Global Learning Community
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Whether you are a student striving for academic success, a lecturer
            shaping future leaders, or a partner empowering opportunities,
            ScholarsKnowledge is your platform to grow, share, and achieve
            together.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/student-sign-up"
              className="rounded-md bg-[#C9962C] px-6 py-3 text-sm font-bold text-[#0A1D33] transition hover:bg-[#d8ab4b]"
            >
              Student Sign Up
            </Link>

            <Link
              to="/lecturer-sign-up"
              className="rounded-md border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              Lecturer Sign Up
            </Link>

            <Link
              to="/partner"
              className="rounded-md border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              Partner with Us
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#0A1D33] px-4 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} ScholarsKnowledge. All Rights Reserved.
      </footer>
    </div>
  );
}
