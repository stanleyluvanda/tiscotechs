// src/pages/EduInfo.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function EduFinancing() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "EduFinancing | ScholarsKnowledge";
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-10 flex-grow">
        {/* Page header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            EduFinancing
          </h1>
          <p className="mt-3 text-slate-600 max-w-3xl">
            International students can finance education in destinations like the United States
            through a smart mix of{" "}
            <span className="font-semibold text-[#0076CE]">MPOWER Financing educational loans</span>,{" "}
            <span className="font-semibold">scholarships</span>,{" "}
            <span className="font-semibold">low-cost universities</span>, and{" "}
            <span className="font-semibold">personal savings</span>. This page explains your options and
            how to combine them for the strongest outcome.
          </p>
        </header>

        {/* 2-column layout: main + right sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MAIN CONTENT */}
          <main className="md:col-span-2 space-y-6">
            {/* Card: Financing Options */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Key Financing Options</h2>
              <p className="mt-2 text-slate-600">
                Depending on eligibility and personal circumstances, most students rely on one or a blend of these:
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm uppercase tracking-wide text-[#0076CE] font-semibold">
                    MPOWER Financing
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Designed for international students—no co-signer, collateral, or U.S. credit history required.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm uppercase tracking-wide text-emerald-700 font-semibold">
                    Scholarships
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Merit- and need-based awards offered by universities, private organizations, and foundations.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm uppercase tracking-wide text-indigo-700 font-semibold">
                    Personal Savings
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Family and personal funds to reduce borrowing and improve flexibility.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm uppercase tracking-wide text-amber-700 font-semibold">
                    Low-cost Universities
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Affordable universities and colleges help minimize loan burden while still achieving your academic goals.
                  </p>
                </div>
              </div>
            </section>

            {/* Card: Strategy Combos */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Optimizing Your Funding Strategy</h2>
              <p className="mt-2 text-slate-600">
                Combine sources to minimize costs and keep your budget predictable:
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">MPOWER Financing + Scholarships</h3>
                    <span className="text-xs rounded-full bg-blue-50 text-[#0076CE] px-2 py-1 border border-blue-200">
                      Balanced Cost
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Use an MPOWER loan to secure tuition/fees while scholarships reduce the amount you borrow.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">MPOWER Financing + Personal Savings</h3>
                    <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 border border-emerald-200">
                      Lower Debt
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Allocate savings to living costs and rely on the loan for academic expenses.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">MPOWER Financing + Low-cost Universities</h3>
                    <span className="text-xs rounded-full bg-amber-50 text-amber-700 px-2 py-1 border border-amber-200">
                      Smart Choice
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Pairing a flexible MPOWER loan with tuition at affordable institutions minimizes long-term repayment and keeps your education accessible.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Full MPOWER Financing Educational Loan</h3>
                    <span className="text-xs rounded-full bg-indigo-50 text-indigo-700 px-2 py-1 border border-indigo-200">
                      Maximum Coverage
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    When external funding is limited, a full education loan can still make a top-tier degree possible.
                  </p>
                </div>
              </div>
            </section>

            {/* Card: How We Help */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">How We Support You</h2>
              <p className="mt-2 text-slate-600">
                <span className="font-semibold text-[#0076CE]">ScholarsKnowledge</span> partners with{" "}
                <span className="font-medium">MPOWER Financing</span> and global scholarship providers to
                help international students access trusted financial solutions:
              </p>
              <ul className="mt-4 space-y-2 text-slate-700">
                <li className="flex gap-2"><span className="text-[#0076CE]">•</span> Explore and apply to curated scholarships.</li>
                <li className="flex gap-2"><span className="text-[#0076CE]">•</span> Direct links to MPOWER’s loan application experience.</li>
                <li className="flex gap-2"><span className="text-[#0076CE]">•</span> Balance savings, scholarships, and loans.</li>
                <li className="flex gap-2"><span className="text-[#0076CE]">•</span> Practical content to support your academic and career goals.</li>
              </ul>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/scholarship"
                  className="rounded-full bg-[#0A4595] text-white px-5 py-2 text-sm font-semibold hover:bg-[#0a3d83]"
                >
                  Browse Scholarships
                </Link>
                <a
                  href="https://www.mpowerfinancing.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#0076CE] text-[#0076CE] px-5 py-2 text-sm font-semibold hover:bg-blue-50"
                >
                  Learn about MPOWER FINANCING Education loans
                </a>
              </div>
            </section>
          </main>

          {/* SIDEBAR (Right) */}
          <aside className="md:col-span-1">
            <div className="md:sticky md:top-24 space-y-6">
              {/* Image Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?ixlib=rb-4.0.3&q=80&w=1080&fit=crop"
                  alt="EduFinancing students"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <p className="mt-3 text-sm text-slate-600">
                  {/*A visual story of student success through smart financing choices.*/}
                </p>
              </div>

              {/* Quick Tips */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">Quick Tips</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>Apply early—deadlines vary by school and provider.</li>
                  <li>Use scholarships and savings to reduce loan principal.</li>
                  <li>Create a monthly budget for living costs.</li>
                  <li>Compare repayment scenarios before committing.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm">
            © {new Date().getFullYear()} ScholarsKnowledge. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm">
            <Link to="/about" className="hover:text-white">About Us</Link>
            <Link to="/partners" className="hover:text-white">Partners</Link>
            <Link to="/scholarship" className="hover:text-white">Scholarships</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}