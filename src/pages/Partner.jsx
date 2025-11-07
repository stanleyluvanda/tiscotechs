// src/pages/Partners.jsx
import { Link } from "react-router-dom";

export default function Partners() {
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section
        className="text-white"
        style={{ backgroundColor: "#0A4595", fontFamily: '"Open Sans", Arial, sans-serif' }}
      >
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-extrabold">List Your Scholarship</h1>
          <p className="mt-3 text-white/90 max-w-3xl">
            ScholarsKnowledge partners with universities, foundations, and organizations to help
            students achieve their education and career goals through transparent, student-friendly
            scholarships.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/partner/signup"
              className="inline-block rounded-lg bg-white text-[#0A4595] px-5 py-3 font-semibold hover:bg-white/90"
            >
              Scholarship Provider Sign Up
            </Link>
            <Link
              to="/partner/login"
              className="inline-block rounded-lg border border-white/70 text-white px-5 py-3 font-semibold hover:bg-white/10"
            >
              Provider Login
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT / REQUIREMENTS */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">Why partner with ScholarsKnowledge?</h2>
            <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2">
              <li>Reach motivated students globally with clean, structured listings.</li>
              <li>Standardized fields so your opportunity appears in the right searches.</li>
              <li>Fair, student-first guidelines that reduce friction and boost completions.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">Listing requirements</h2>
            <p className="mt-2 text-slate-700">All scholarships must follow these rules:</p>
            <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2">
              <li><span className="font-medium">No essays required</span> as part of the listing on our site.</li>
              <li><span className="font-medium">No application fees</span> of any kind.</li>
              <li><span className="font-medium">No sensitive personal data</span> (e.g., bank details, SSN, national IDs) collected on our forms.</li>
              <li>Clear eligibility, benefits, deadline, and official application URL.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 pb-10">
        <h2 className="text-2xl font-bold text-slate-900 text-center">How it works</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <Step
            num="1"
            title="Create your provider account"
            text="Sign up as a scholarship provider to access your portal."
          />
          <Step
            num="2"
            title="Submit your scholarship"
            text="Add title, country, level, field, funding, and details (eligibility, benefits, how to apply)."
          />
          <Step
            num="3"
            title="Publish & manage"
            text="Your listing appears in search and filters. Update or archive anytime."
          />
        </div>
      </section>

      {/* CTA CARD */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900">Ready to list your scholarship?</h3>
            <p className="mt-1 text-slate-700">
              Join trusted institutions helping students find fair, fee-free funding.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/partner/signup"
              className="rounded-lg bg-[#0A4595] text-white px-5 py-3 font-semibold hover:opacity-90"
            >
              Provider Sign Up
            </Link>
            <Link
              to="/partner/login"
              className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
            >
              Provider Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ num, title, text }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-white"
           style={{ backgroundColor: "#0A4595" }}>
        {num}
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-slate-700">{text}</p>
    </div>
  );
}