// src/pages/About.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "About Us | ScholarsKnowledge";
  }, []);

  // ✅ Premium glass cards (no border at rest, subtle outline on hover)
  const cardClass =
    "rounded-2xl border border-transparent bg-white/80 backdrop-blur " +
    "p-8 shadow-sm ring-0 hover:ring-1 hover:ring-slate-200/35 " +
    "hover:shadow-md transition";

  const miniCardClass =
    "rounded-2xl border border-transparent bg-white/80 backdrop-blur " +
    "p-6 shadow-sm ring-0 hover:ring-1 hover:ring-slate-200/35 " +
    "hover:shadow-md transition text-center";

  return (
    <div className="bg-gradient-to-br from-[#f9fbff] via-white to-[#f2f6ff] min-h-screen">
      {/* ✅ FULL-WIDTH HERO (edge-to-edge + premium height) */}
      <header className="relative w-full overflow-hidden border-b border-slate-200 min-h-[60vh] md:min-h-[72vh] flex items-center">
        {/* Background image (edge-to-edge) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2400&q=80')",
          }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/55 to-slate-900/30" />

        {/* Content container stays centered */}
        <div className="relative w-full max-w-6xl mx-auto px-4 py-12 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            About ScholarsKnowledge
          </h1>

          <p className="mt-5 text-base md:text-lg text-white/90 max-w-4xl mx-auto leading-relaxed">
            {/*ScholarsKnowledge is a global academic platform built to connect*/}
            ScholarsKnowledge LLC is a global academic platform committed to expanding access to education and strengthening academic communities worldwide. 
            {" "}
            <span className="font-semibold text-white">
              {/*students, lecturers, and partners*/}
              We provide a secure digital platform where students, lecturers, institutions, and education‑finance partners connect through knowledge‑sharing, academic resources, and equitable funding opportunities.
            </span>{" "}
            {/*through knowledge-sharing, financing opportunities, and collaborative
            growth. Our mission is to remove barriers to education by empowering
            academic communities worldwide.*/}
            Our mission is to remove barriers to education by delivering transparent, responsible, and sustainable services that support learning, collaboration, and global academic growth.
          </p>

          {/* subtle badges */}
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

      {/* ✅ Everything else stays inside the max container */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Mission Section (CENTERED) */}
        <section className={`${cardClass} text-center`}>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Our Mission
          </h2>
          <p className="mt-3 text-slate-700 leading-relaxed max-w-4xl mx-auto">
            We believe education transforms lives. At ScholarsKnowledge, our
            mission is to create a digital ecosystem where every student can
            access academic resources, financial aid, and career support—while
            lecturers, universities, and partners can share, collaborate, and
            empower the next generation of global learners.
          </p>
        </section>

        {/* Vision Section (CENTERED) */}
        <section className={`${cardClass} text-center`}>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Our Vision
          </h2>
          <p className="mt-3 text-slate-700 leading-relaxed max-w-4xl mx-auto">
            We envision a world where learning is{" "}
            <span className="font-semibold">borderless</span>—a platform where a
            student in Africa can access resources from North America,
            collaborate with peers in Asia, and apply to scholarships in
            Europe—all in one place. ScholarsKnowledge is building this bridge
            for the next generation of learners.
          </p>
        </section>

        {/* Who We Serve */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className={miniCardClass}>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50/70 flex items-center justify-center text-2xl">
              🎓
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-slate-900">
              For Students
            </h3>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed">
              ScholarsKnowledge is your{" "}
              <span className="font-semibold">study hub</span>—offering notes,
              assignments, past papers, and an academic marketplace. Students
              also discover scholarships and education loans to fund their
              studies globally.
            </p>
          </div>

          <div className={miniCardClass}>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-purple-50/70 flex items-center justify-center text-2xl">
              👩‍🏫
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-slate-900">
              For Lecturers
            </h3>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed">
              Lecturers manage and share academic materials, interact with
              students in dedicated university and global academic platforms,
              and build collaborative teaching environments.
            </p>
          </div>

          <div className={miniCardClass}>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50/70 flex items-center justify-center text-2xl">
              🤝
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-slate-900">
              For Partners
            </h3>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed">
              Universities, scholarship providers, and education finance
              partners like{" "}
              <span className="text-[#0A4595] font-semibold">
                MPOWER Financing
              </span>{" "}
              collaborate with us to help international students achieve their
              educational and career goals.
            </p>
          </div>
        </section>

        {/* EduFinancing */}
        <section className={cardClass}>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 text-center">
            EduFinancing
          </h2>
          <p className="mt-3 text-slate-700 max-w-4xl mx-auto text-center">
            Education should be accessible regardless of financial background.
            That’s why ScholarsKnowledge partners with MPOWER Financing and
            global scholarship providers to bring international students
            affordable options including:
          </p>

          <div className="mt-6 max-w-3xl mx-auto">
            <ul className="space-y-2 text-slate-700 list-disc list-inside">
              <li>
                MPOWER Financing education loans (no co-signer or collateral
                required)
              </li>
              <li>Scholarships from universities, organizations, and foundations</li>
              <li>Personal savings strategies to reduce debt</li>
              <li>Low-cost universities & colleges as alternative pathways</li>
            </ul>
          </div>
        </section>

        {/* Founder & CEO */}
        <section className={cardClass}>
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Founder & CEO
            </h2>
            <p className="mt-2 text-slate-600 max-w-3xl mx-auto">
              ScholarsKnowledge is built with a mission to expand access to
              education and strengthen global academic communities.
            </p>
          </div>

          <div className="mt-6 grid md:grid-cols-[220px_1fr] gap-6 items-center">
            <div className="mx-auto md:mx-0">
              <div className="relative">
                <img
                  src="/images/founderr.png"
                  alt="Founder and CEO"
                  loading="eager"
                  decoding="async"
                  className="h-52 w-52 rounded-3xl object-cover shadow-sm ring-1 ring-slate-200/35
                             brightness-[1.06] contrast-[1.06] saturate-[1.06]"
                  style={{ imageRendering: "auto", transform: "translateZ(0)" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>

            <div className="text-center md:text-left">
              <div className="text-lg font-extrabold text-slate-900">
                Stanley Raphael Luvanda
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Founder & CEO, ScholarsKnowledge
              </div>
              <p className="mt-3 text-slate-700 leading-relaxed">
                Building ScholarsKnowledge to help students and lecturers share
                academic resources, connect across borders, and access financing
                opportunities. Focused on creating a trusted platform that
                supports learning, collaboration, and global academic growth.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                <Link
                  to="/student-sign-up"
                  className="rounded-full px-4 py-2 text-sm transition hover:bg-slate-50
                             border border-transparent ring-0 hover:ring-1 hover:ring-slate-200/35"
                >
                  Join as Student
                </Link>
                <Link
                  to="/lecturer-sign-up"
                  className="rounded-full px-4 py-2 text-sm transition hover:bg-slate-50
                             border border-transparent ring-0 hover:ring-1 hover:ring-slate-200/35"
                >
                  Join as Lecturer
                </Link>
              </div>
            </div>
          </div>

          {/*div className="mt-6 text-xs text-slate-500 text-center">
            Tip: Put the image at{" "}
            <span className="font-mono">public/images/founder.jpg</span> (or
            update the path above).
          </div>*/}
        </section>
      </div>

      {/* ✅ FULL-WIDTH CTA (edge-to-edge) */}
      <section className="w-full">
        <div className="text-center bg-gradient-to-r from-[#0A4595] to-[#1a73e8] text-white p-10 shadow-md rounded-none">
          <h2 className="text-3xl font-extrabold">
            Join the Global Learning Community
          </h2>
          <p className="mt-3 text-white/90 max-w-2xl mx-auto">
            Whether you are a student striving for academic success, a lecturer
            shaping future leaders, or a partner empowering opportunities,
            ScholarsKnowledge is your platform to grow, share, and achieve
            together.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              to="/student-sign-up"
              className="rounded-full bg-white text-[#0A4595] px-5 py-2 font-semibold hover:bg-slate-100"
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
              className="rounded-full bg-[#fbbc04] text-slate-900 px-5 py-2 font-semibold hover:opacity-90"
            >
              Partner with Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-6 text-center text-sm mt-12">
        © {new Date().getFullYear()} ScholarsKnowledge. All Rights Reserved.
      </footer>
    </div>
  );
}