// src/pages/Home.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* 1) HERO */}
      <section
  className="relative overflow-hidden bg-cover bg-center"
  style={{
    backgroundImage: "url('/images/welcome.webp')",
  }}
>
  <div className="absolute inset-0 bg-black/55" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[#FFAF0F] text-xl md:text-2xl font-semibold drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
              Empowering global academic collaboration and making educational resources accessible to students and faculty worldwide.
            </p>

            <h1 className="mt-2 text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.65)]">
              Digital Academic Hub connecting students, lecturers, and partners for seamless academic progress.
            </h1>

            <p className="mt-4 text-white/95 text-lg md:text-xl max-w-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              One platform to organize, manage and share academic materials, and boost your learning experience—so students, lecturers, and partners move forward together.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/edufinancing"
                className="rounded-full bg-[#1a73e8] text-white px-5 py-3 font-semibold hover:opacity-90"
              >
                Explore Education-Funding opportunities
              </Link>

              <Link
                to="/about"
                className="rounded-full bg-white/20 backdrop-blur border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/30"
              >
                Why ScholarsKnowledge
              </Link>
            </div>
          </div>
          <div />
        </div>
      </section>

      {/* Social links just below hero content */}
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pb-8 pt-1">
        <SocialIcons className="flex flex-wrap items-center justify-center gap-3 sm:gap-4" />
      </div>

      {/* Trusted by Universities Worldwide */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pb-12">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
            Trusted by Universities Worldwide
          </h2>
        </div>

        <div className="mt-6 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
          <img
            src="/images/world-map-network.png"
            alt="Global university network connecting universities worldwide"
            width="1600"
            height="600"
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>

        <p className="mt-6 text-center text-lg text-slate-600 max-w-4xl mx-auto">
          Thousands of lecturers and students across 150+ countries use our platform
          to share knowledge and collaborate on research that shapes the future of
          education.
        </p>
      </section>

      {/* Fixed social icons on right margin */}
      <SocialIcons className="fixed right-3 md:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2" />

      {/* 2) TABS + CARDS */}
      <SectionTabs />

      {/* 3) MPOWER section */}
      <section className="w-full" style={{ backgroundColor: "#FFFAEE" }}>
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#2f4ea2]">
              Funding for international students
            </h2>
          </div>

          <Link
            to="/eduinfo"
            className="mt-6 block rounded-2xl border border-slate-200 hover:shadow-sm transition p-0 bg-white/80"
            title="Learn more in EduInfo"
          >
            <div className="p-6 md:p-10 grid md:grid-cols-[120px_1fr] gap-6 items-center">
              <img
                src="/images/mpower.png"
                alt="Mpower Financing logo"
                className="w-24 h-24 object-contain opacity-90"
                loading="lazy"
              />
              <blockquote className="text-lg text-slate-800">
                “ScholarsKnowledge partners with MPOWER Financing to help international students access trusted financial solutions.”
                <div className="mt-2 text-sm text-slate-500">— Learn More</div>
              </blockquote>
            </div>
          </Link>
        </div>
      </section>

      {/* 4) Three pillars */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
        <h2 className="text-3xl font-bold text-slate-900 text-center">
          How we move learning forward.
        </h2>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Pillar
            image="/images/Empoering learners.webp"
            imageAlt="Students learning together"
            title="Empower Learners."
            text="Enable students and lecturers to focus on meaningful learning while technology simplifies routine academic tasks."
            centered
          />
          <Pillar
            image="/images/Streamline  academics.webp"
            imageAlt="Organized academic workflow"
            title="Streamline Academics."
            text="From notes to workflows, ScholarsKnowledge organizes academic materials and reduces friction in teaching and learning."
            centered
          />
          <Pillar
            image="/images/How we forward learning.webp"
            imageAlt="Learning insights and analytics"
            title="Insight-Driven Learning."
            text="Transform academic activity into actionable insights that guide smarter decisions and better outcomes."
            centered
          />
        </div>
      </section>

      {/* Funded graduate programs */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/scholarship.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-slate-950/55" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-14">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white text-center">
            Funded graduate programs opportunities for international students
          </h2>
          <p className="mt-2 text-white/90 text-center max-w-3xl mx-auto">
            Access a curated selection of verified, university-funded graduate admission opportunities
            sourced directly from accredited institutions worldwide.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StoryCard
              image="/images/USfundedprogram.jpg"
              title="University-Funded graduate programs in the U.S."
              linkTo="/funded-graduate-admission?country=United%20States"
              linkText="Explore U.S. funded graduate programs"
            />
            <StoryCard
              image="/images/FundedprogranCanada.jpg"
              title="University-Funded graduate programs in Canada"
              linkTo="/funded-graduate-admission?country=Canada"
              linkText="Explore Canada funded graduate programs"
            />
            <StoryCard
              image="/images/FundedprogramUK.png"
              title="University-Funded graduate programs in the UK"
              linkTo="/funded-graduate-admission?country=United%20Kingdom"
              linkText="Explore UK funded graduate programs"
            />
            <StoryCard
              image="/images/FundedprogramEurope.jpg"
              title="University-Funded graduate programs in Europe"
              linkTo="/funded-graduate-admission?continent=Europe"
              linkText="Explore Europe funded graduate programs"
            />
          </div>
        </div>
      </section>

      {/* 5) Customer stories teaser */}
      <section className="bg-[#f6f9ff]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            Transforming Education. Academic innovation. Real-world impact. Inspiring Success.
          </h2>
          <p className="mt-2 text-slate-600 text-center">
            Explore how universities and learning communities leverage ScholarsKnowledge to achieve their goals.
          </p>

          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <StoryCard
              image="/images/Submit scholarships.webp"
              title="Scholarships Providers"
              linkTo="/partner/signup"
              linkText="Submit a Scholarship"
            />
            <StoryCard
              image="/images/istockphoto-2105100634-612x612.webp"
              title="Join students community around the world"
              linkTo="/student-sign-up"
              linkText="Student Sign Up"
            />
            <StoryCard
              image="/images/streamline-academic-sharing.jpg"
              title="Streamline Academics sharing"
              linkTo="/lecturer-sign-up"
              linkText="Lecturer Sign Up"
            />
          </div>
        </div>
      </section>

      {/* Scholarships by Destination */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/scholarships-destinations-bg.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-slate-950/55" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-14">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white text-center">
            Scholarships by Study Destination
          </h2>
          <p className="mt-2 text-white/90 text-center max-w-3xl mx-auto">
            Browse curated and verified scholarship opportunities carefully organized by major study destinations
            — the United States, Canada, the United Kingdom, and Europe.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StoryCard
              image="/images/scholarships-us.png"
              title="Scholarships in the U.S."
              linkTo="/scholarship?country=United%20States"
              linkText="Explore U.S. Scholarships"
            />
            <StoryCard
              image="/images/scholarships-canada.png"
              title="Scholarships in Canada"
              linkTo="/scholarship?country=Canada"
              linkText="Explore Canada Scholarships"
            />
            <StoryCard
              image="/images/scholarships-uk.png"
              title="Scholarships in the UK"
              linkTo="/scholarship?country=United%20Kingdom"
              linkText="Explore UK Scholarships"
            />
            <StoryCard
              image="/images/scholarships-europe.png"
              title="Scholarships in Europe"
              linkTo="/scholarship?continent=Europe"
              linkText="Explore Europe Scholarships"
            />
          </div>
        </div>
      </section>

      {/* 6) Ready to talk? */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 text-center">
        <h3 className="text-3xl font-bold text-slate-900">Ready to talk?</h3>
        <p className="mt-2 text-slate-600">
          Send us a message using the contact form — share your question, partnership idea, or support request, and we’ll respond as soon as possible.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            to="/contact"
            className="rounded-full bg-[#1a73e8] text-white px-5 py-3 font-semibold hover:opacity-90"
          >
            Contact Us
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full mt-0">
        <div className="text-center bg-gradient-to-r from-[#0A4595] to-[#1a73e8] text-white p-10 shadow-md rounded-none">
          <h2 className="text-3xl font-extrabold">Join the Global Learning Community</h2>
          <p className="mt-3 text-white/90 max-w-2xl mx-auto">
            Whether you are a student striving for academic success, a lecturer shaping future leaders,
            or a partner empowering opportunities, ScholarsKnowledge is your platform to grow, share,
            and achieve together.
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

          <div className="mt-3 flex justify-center gap-6 text-xs text-white/95">
            <Link to="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms-of-use" className="hover:underline">
              Terms of Use
            </Link>
          </div>
        </div>
      </section>

      {/* 7) Footer */}
      <footer className="bg-blue-900 text-white py-6 text-center text-sm">
        © {new Date().getFullYear()} ScholarsKnowledge
      </footer>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function SocialIcons({ className = "" }) {
  return (
    <div className={className}>
      <a
        href="https://www.facebook.com/profile.php?id=61579563119393"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
        title="Facebook"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white text-base font-bold shadow-md hover:scale-105 transition"
      >
        f
      </a>

      <a
        href="https://www.youtube.com/@scholarsknowledge5765"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube"
        title="YouTube"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-md hover:scale-105 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M21.8 8.001a2.75 2.75 0 0 0-1.936-1.946C18.137 5.5 12 5.5 12 5.5s-6.137 0-7.864.555A2.75 2.75 0 0 0 2.2 8.001 28.44 28.44 0 0 0 1.75 12c0 1.352.15 2.688.45 3.999a2.75 2.75 0 0 0 1.936 1.946C5.863 18.5 12 18.5 12 18.5s6.137 0 7.864-.555a2.75 2.75 0 0 0 1.936-1.946c.3-1.311.45-2.647.45-3.999 0-1.352-.15-2.688-.45-3.999ZM10 15.5v-7l6 3.5-6 3.5Z" />
        </svg>
      </a>
    </div>
  );
}

function SectionTabs() {
  const TABS = ["All", "For Students", "For Lecturers", "EduFinancing", "Our Partners"];
  const [active, setActive] = useState("All");

  const cardsAll = [
    {
      tag: "Lectures",
      title: "Notes, Assignments & Questions",
      text: "Share academics, engage your students, and boost academic productivity.",
      image: "/images/Lectures.webp",
    },
    {
      tag: "Global & University Academic Platforms",
      title: "Student-Lecturer Academic Interaction",
      text: "Interact locally and globally, initiate topics, comment, and reply to academic threads.",
      image: "/images/studentimage.webp",
    },
    {
      tag: "Lecturers Management",
      title: "Manage your Academic Materials Inventory",
      text: "Save your lecture notes, academic books, and assignments for now and future use.",
      image: "/images/academic-material-management.webp",
    },
  ];

  const cardsStudents = [
    {
      tag: "Students",
      title: "We are Your Study Hub",
      text: "Notes, assignments, past papers, announcements, and help—organized by academic program.",
      image: "/images/for-student1.webp",
    },
    {
      tag: "University & Global Academic Platforms",
      title: "Local & Global Students Interaction",
      text: "Post, share, and comment across academic fields.",
      image: "/images/for-students.webp",
    },
    {
      tag: "Student Market Platform",
      title: "Students' Entrepreneurial Opportunities",
      text: "Discover and supercharge your business potential while studying.",
      image: "/images/business-ad.webp",
    },
  ];

  const cardsLecturers = [
    {
      tag: "Lecturers",
      title: "Share Notes, Assignments & Announcements",
      text: "Post academic materials, communicate with students, and support classroom engagement.",
      image: "/images/Lectures.webp",
    },
    {
      tag: "Academic Interaction",
      title: "Engage Students Across Platforms",
      text: "Create academic conversations through posts, comments, replies, and topic discussions.",
      image: "/images/studentimage.webp",
    },
    {
      tag: "Materials Management",
      title: "Organize Academic Resources",
      text: "Manage lecture notes, academic books, assignments, and other teaching resources in one place.",
      image: "/images/academic-material-management.webp",
    },
  ];

  const cardsEduFinancing = [
    {
      tag: "Scholarships",
      title: "Explore Scholarships directly from Provider Institutions and Organizations",
      text: "ScholarsKnowledge partners with scholarship providers, educational institutions, universities, and organizations.",
      image: "/images/scholarship-edufinancing.webp",
    },
    {
      tag: "College Budgeting",
      title: "Optimize your College Financing Strategies",
      text: "Educational loans + scholarships + private savings = optimal financing strategy.",
      image: "/images/scholarship.webp",
    },
  ];

  const cardsPartners = [
    {
      tag: "Scholarship Institutions",
      title: "Submit and Manage Scholarships",
      text: "Universities, colleges, institutions, and organizations can publish verified scholarships directly to students.",
      image: "/images/Submit scholarships.webp",
    },
    {
      tag: "Education Loan Partners",
      title: "Student Loan Partnerships",
      text: "ScholarsKnowledge partners with MPOWER Financing to offer trusted loan access to global students.",
      image: "/images/mpower-financing.webp",
    },
    {
      tag: "University & Colleges Collaborations",
      title: "Expand Student Opportunities",
      text: "Universities and colleges collaborate with ScholarsKnowledge to give students access to shared academic resources locally and worldwide.",
      image: "/images/collaboration image.webp",
    },
  ];

  const byTab = {
    All: cardsAll,
    "For Students": cardsStudents,
    "For Lecturers": cardsLecturers,
    EduFinancing: cardsEduFinancing,
    "Our Partners": cardsPartners,
  };

  const cards = byTab[active] ?? cardsAll;

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-3 py-2 rounded-full text-sm border ${
              active === t
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <article
            key={`${c.tag}-${c.title}`}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-sm transition"
          >
            <img
              src={c.image}
              alt=""
              className="w-full h-40 object-cover"
              loading="lazy"
            />
            <div className="p-5 text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {c.tag}
              </div>
              <h3 className="mt-1 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-slate-600">{c.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Pillar({ image, imageAlt, title, text, centered = false }) {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white">
      {image ? (
        <div className="w-full h-44 mb-5 overflow-hidden rounded-xl">
          <img
            src={image}
            alt={imageAlt || title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <h3 className={`text-lg font-semibold text-slate-900 ${centered ? "text-center" : ""}`}>
        {title}
      </h3>

      <p className={`mt-1 text-slate-600 ${centered ? "text-center" : ""}`}>
        {text}
      </p>
    </div>
  );
}

function StoryCard({ image, title, linkTo, linkText }) {
  return (
    <div className="rounded-2xl bg-white overflow-hidden">
      <img
        src={image}
        alt=""
        className="w-full h-40 object-cover"
        loading="lazy"
      />

      <div className="p-4 text-center">
        <div className="font-semibold">{title}</div>
        {linkTo && linkText && (
          <Link
            to={linkTo}
            className="mt-2 inline-block font-semibold text-[#1a73e8] hover:underline"
          >
            {linkText}
          </Link>
        )}
      </div>
    </div>
  );
}