import { useState } from "react"; 
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* 1) HERO */}
      <section className="bg-gradient-to-br from-[#f0f6ff] via-white to-[#eef2ff]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: text */}
          <div>
            <p className="text-[#1a73e8] text-lg md:text-xl font-semibold">
              The global academic platform for students, lecturers, and knowledge sharing.
            </p>
            <h1 className="mt-2 text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
              Connecting students, lecturers, and partners for seamless academic progress.
            </h1>
            <p className="mt-4 text-slate-700 text-lg md:text-xl max-w-xl">
              One platform to organize,manage and share academic materials, and boost your learning experience—so students, lecturers, and partners move forward together.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/edufinancing" className="rounded-full bg-[#1a73e8] text-white px-5 py-3 font-semibold hover:opacity-90">
                Explore Education-Funding opportunities
              </Link>
              <Link to="/about" className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                Why ScholarsKnowledge
              </Link>
            </div>
          </div>

          {/* Right: hero visual */}
          <div className="relative">
            <img
               src="/images/students.jpg"
              alt="AI campus illustration"
              className="w-full rounded-2xl shadow-md"
              />
            <div className="absolute -top-4 -right-4 h-10 w-10 rounded-full bg-[#fbbc04]/90 shadow" />
          </div>
        </div>
      </section>

      {/* 2) TABS + CARDS */}
      <SectionTabs />

      {/* 3) Testimonial with logo (Mpower card links to EduInfo) */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12">
        <Link
          to="/eduinfo"
          className="block rounded-2xl border border-slate-200 hover:shadow-sm transition p-0"
          title="Learn more in EduInfo"
        >
          <div className="p-6 md:p-10 bg-white grid md:grid-cols-[100px_1fr] gap-6 items-center">
            <img src="/images/mpower.png" alt="Mpower Financing logo" className="w-20 h-20 object-contain opacity-80" />
            <blockquote className="text-lg text-slate-800">
              “ScholarsKnowledge partners with MPOWER Financing to help international students access trusted financial solutions.”
              <div className="mt-2 text-sm text-slate-500">— Learn More</div>
            </blockquote>
          </div>
        </Link>
      </section>

      {/* 4) Three pillars (centered titles) */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
        <h2 className="text-3xl font-bold text-slate-900 text-center">How we move learning forward.</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Pillar
            title="Empower Learners."
            text="Enable students and lecturers to focus on meaningful learning while technology simplifies routine academic tasks."
            centered
          />
          <Pillar
            title="Streamline Academics."
            text="From notes to workflows, ScholarsKnowledge organizes academic materials and reduces friction in teaching and learning."
            centered
          />
          <Pillar
            title="Insight-Driven Learning."
            text="Transform academic activity into actionable insights that guide smarter decisions and better outcomes."
            centered
          />
        </div>
      </section>

      {/* 5) Customer stories teaser (centered headings; custom CTAs; faint borders; no 'All Customer Stories') */}
      <section className="bg-[#f6f9ff]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-slate-900 text-center">Transforming Education.Academic innovation. Real-world impact. Inspiring Success.</h2>
          <p className="mt-2 text-slate-600 text-center">Explore how universities and learning communities leverage ScholarsKnowledge to achieve their goals.</p>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <StoryCard
  image="/images/submit-scholarship.jpg"
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

      {/* 6) Ready to talk? (now routes to /contact) */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 text-center">
        <h3 className="text-3xl font-bold text-slate-900">Ready to talk?</h3>
        <p className="mt-2 text-slate-600">We’ll help you plan the best path for your campus.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            to="/contact"
            className="rounded-full bg-[#1a73e8] text-white px-5 py-3 font-semibold hover:opacity-90"
          >
            Get in touch
          </Link>
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

function SectionTabs() {
  const TABS = ["All", "For Students", "For Lecturers", "EduFinancing", "Our Partners"];
  const [active, setActive] = useState("All");

  // 3 cards for each tab (titles centered, faint borders)
  const cardsAll = [
  {
    tag: "Lectures",
    title: "Notes,Assignments & Questions",
    text: "Share academics,Engage your students, and Boost academic productivity",
    image: "/images/for-lecturer.jpg",
  },
  {
    tag: "Global & University Academic Platforms",
    title: "Student-Lecturer Academic Interaction",
    text: "Interact locally and globally,initiate Topics,Comment and Reply academic Interactive threads.",
    image: "/images/for-students.jpg",
  },
  {
    tag: "Lecturers Management",
    title: "Manage your Academic Materials Inventory",
    text: "Save your lectural notes,Academic books,Assigments for now and future use.",
    image: "/images/academic-material-management.jpg",
  },
];

const cardsStudents = [
  {
    tag: "Students",
    title: "We are Your Study Hub",
    text: "Notes, Assigments,past papers,Announcements and help—organized by Academic program.",
    image: "/images/for-student1.jpg",
  },
  {
    tag: "University & Global Academic Platforms",
    title: "Local & Global students Interaction",
    text: "Post, share, and comment across academic fields.",
    image: "/images/for-students.jpg",
  },
  {
    tag: "Student Market Platform",
    title: "Students' Entrepeneurial Opportunities",
    text: "Discover and Supercharge your business potential while studying",
    image: "/images/business-ad.webp",
  },
];
  const cardsFinance = [
    {
      tag: "Lectures",
      title: "Notes,Assigment,Announcement & Questions",
      text: "Share with your students and Track Feedback",
      image: "/card-finance.png",
    },
    {
      tag: "Budgeting",
      title: "Resource Planning",
      text: "Forecast needs and align spend with outcomes.",
      image: "/story-2.png",
    },
    {
      tag: "Compliance",
      title: "Transparent Reporting",
      text: "Automate reports and reduce manual work.",
      image: "/story-3.png",
    },
  ];

  const cardsIT = [
    {
      tag: "Educational Loans",
      title: "Mpower Financing Loans",
      text: "ScholarsKnowledge partners with Mpower Financing to make global student achieve their career and education dreams",
      image: "/images/mpower-financing.png",
    },
    {
      tag: "Scholarships",
      title: "Explore Scholarships directly from Provider Institutions and Organizations",
      text: "ScholarKnowledge partners with Scholarship providers Educational institutions,Universities and Organization .",
      image: "/images/scholarship-edufinancing.jpg",
    },
    {
      tag: "College Budgeting",
      title: "Optimize your College Financing strategies",
      text: "Educational Loans+Scholarships+Private Saving=Optimal Financing Strategy",
      image: "/images/scholarship.jpg",
    },
  ];

  const cardsPolicy = [
    {
      tag: "Scholarship Institutions",
      title: "Submit and Manage Scholarships",
      text: "Universities,Colleges,Institutions and organizations can publish verified scholarships directly to students.",
      image: "/images/submit-scholarship.jpg",
    },
    {
      tag: "Education Loan Partners",
      title: "Student Loan Partnerships",
      text: "ScholarsKnowledge partners with MPOWER Financing to offer trusted loan access to global students.",
      image: "/images/mpower-financing.png",
    },
    {
      tag: "University & Colleges Collaborations",
      title: "Expand Student Opportunities",
      text: "Universities and Colleges collaborate with ScholarsKnowledge to give students access to shared Academic resources locally and  worldwide.",
      image: "/story-1.png",
    },
  ];

  const byTab = {
    All: cardsAll,
    "For Students": cardsStudents,
    "For Finance": cardsFinance,
    "EduFinancing": cardsIT,
    "Our Partners": cardsPolicy,
  };

  const cards = byTab[active] ?? cardsAll;

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
      {/* Tabs */}
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

      {/* Cards (centered titles, faint border, no 'Read story') */}
      <div className="mt-6 grid md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <article
            key={`${c.tag}-${c.title}`}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-sm transition"
          >
            <img src={c.image} alt="" className="w-full h-40 object-cover" />
            <div className="p-5 text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500">{c.tag}</div>
              <h3 className="mt-1 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-slate-600">{c.text}</p>
              {/* Intentionally no CTA here per your request */}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Pillar({ title, text, centered = false }) {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white">
      <h3 className={`text-lg font-semibold text-slate-900 ${centered ? "text-center" : ""}`}>{title}</h3>
      <p className={`mt-1 text-slate-600 ${centered ? "text-center" : ""}`}>{text}</p>
    </div>
  );
}

function StoryCard({ image, title, linkTo, linkText }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <img src={image} alt="" className="w-full h-40 object-cover" />
      <div className="p-4 text-center">
        <div className="font-semibold">{title}</div>
        {/* Centered CTAs for these three cards */}
        {linkTo && linkText && (
          <Link to={linkTo} className="mt-2 inline-block font-semibold text-[#1a73e8] hover:underline">
            {linkText}
          </Link>
        )}
      </div>
    </div>
  );
}