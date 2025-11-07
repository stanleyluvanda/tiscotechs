// src/pages/About.jsx
import { useEffect, useState } from "react";

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "About Us | ScholarsKnowledge";
  }, []);

  return (
    <div className="bg-gradient-to-br from-[#f9fbff] via-white to-[#f2f6ff] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Page Header */}
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">
            About ScholarsKnowledge
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
            ScholarsKnowledge is a global academic platform built to connect{" "}
            <span className="font-semibold">students, lecturers, and partners</span> 
            through knowledge-sharing, financing opportunities, and collaborative growth.  
            Our mission is to remove barriers to education by empowering academic communities worldwide.
          </p>
        </header>

        {/* Mission Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
          <p className="mt-3 text-slate-700 leading-relaxed">
            We believe education transforms lives. At ScholarsKnowledge, our mission is to 
            create a digital ecosystem where every student can access academic resources, 
            financial aid, and career support—while lecturers, universities, and partners 
            can share, collaborate, and empower the next generation of global learners.
          </p>
        </section>

        {/* Who We Serve */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">For Students</h3>
            <p className="mt-2 text-slate-600 text-sm">
              ScholarsKnowledge is your **study hub**—offering notes, assignments, past papers, 
              and an academic marketplace. Students also discover scholarships and education loans 
              to fund their studies globally.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">For Lecturers</h3>
            <p className="mt-2 text-slate-600 text-sm">
              Lecturers manage and share academic materials, interact with students in dedicated 
              university and global academic platforms, and build collaborative teaching environments.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">For Partners</h3>
            <p className="mt-2 text-slate-600 text-sm">
              Universities, scholarship providers, and education finance partners like{" "}
              <span className="text-[#0A4595] font-medium">MPOWER Financing</span> collaborate 
              with us to help international students achieve their educational and career goals.
            </p>
          </div>
        </section>

        {/* EduFinancing Section */}
        <section className="rounded-2xl border border-slate-200 bg-[#fdfdfd] p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">EduFinancing</h2>
          <p className="mt-3 text-slate-700">
            Education should be accessible regardless of financial background. That’s why ScholarsKnowledge 
            partners with MPOWER Financing and global scholarship providers to bring international students 
            affordable options including:
          </p>
          <ul className="mt-4 space-y-2 text-slate-700 list-disc list-inside">
            <li>MPOWER Financing education loans (no co-signer or collateral required)</li>
            <li>Scholarships from universities, organizations, and foundations</li>
            <li>Personal savings strategies to reduce debt</li>
            <li>Low-cost universities & colleges as alternative pathways</li>
          </ul>
        </section>

        {/* Our Vision */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Our Vision</h2>
          <p className="mt-3 text-slate-700 leading-relaxed">
            We envision a world where learning is **borderless**—a platform where a student in Africa 
            can access resources from North America, collaborate with peers in Asia, and apply to 
            scholarships in Europe—all in one place. ScholarsKnowledge is building this bridge for 
            the next generation of learners.
          </p>
        </section>

        {/* Call to Action */}
        <section className="text-center bg-gradient-to-r from-[#0A4595] to-[#1a73e8] text-white rounded-2xl p-10 shadow-md">
          <h2 className="text-3xl font-extrabold">Join the Global Learning Community</h2>
          <p className="mt-3 text-white/90 max-w-2xl mx-auto">
            Whether you are a student striving for academic success, a lecturer shaping future leaders, 
            or a partner empowering opportunities, ScholarsKnowledge is your platform to grow, share, 
            and achieve together.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a
              href="/student-sign-up"
              className="rounded-full bg-white text-[#0A4595] px-5 py-2 font-semibold hover:bg-slate-100"
            >
              Student Sign Up
            </a>
            <a
              href="/lecturer-sign-up"
              className="rounded-full border border-white text-white px-5 py-2 font-semibold hover:bg-[#0a3d83]"
            >
              Lecturer Sign Up
            </a>
            <a
              href="/partners"
              className="rounded-full bg-[#fbbc04] text-slate-900 px-5 py-2 font-semibold hover:opacity-90"
            >
              Partner with Us
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-6 text-center text-sm mt-12">
        © {new Date().getFullYear()} ScholarsKnowledge. All Rights Reserved.
      </footer>
    </div>
  );
}