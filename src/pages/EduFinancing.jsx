// src/pages/EduInfo.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";


/* ---------- Calendly URL (opens in new tab) ---------- */
const CALENDLY_URL =
  "https://calendly.com/stanleyluvanda/consultation-60-minutes?hide_event_type_details=1&hide_gdpr_banner=1&background_color=f3f6fb&text_color=0f172a&primary_color=2563eb";

export default function EduFinancing() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "EduFinancing | ScholarsKnowledge";
  }, []);

  const openCalendly = (e) => {
    e.preventDefault();
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
  };

  

  // ✅ Premium “glass” cards: no border at rest, subtle outline only on hover
const cardClass =
  "rounded-2xl border border-transparent bg-white/80 backdrop-blur " +
  "p-6 shadow-sm ring-0 hover:ring-1 hover:ring-slate-200/35 " +
  "hover:shadow-md transition text-justify";

const miniCardClass =
  "rounded-xl border border-transparent bg-white/80 backdrop-blur " +
  "p-4 shadow-sm ring-0 hover:ring-1 hover:ring-slate-200/35 " +
  "hover:shadow-md transition text-justify"; 

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#f9fbff] via-white to-[#f2f6ff]">
      {/* ✅ FULL-WIDTH HERO (sharp background + clear text) */}
      <header className="relative w-full overflow-hidden min-h-[50vh] md:min-h-[62vh] flex items-center">
        {/* ✅ Background image (local first; if it’s low-res/missing, use a sharp U.S. campus fallback) */}
        <img
          src="/images/edufinancing-hero.jpg"
          alt="United States university campus"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          onError={(e) => {
            // ✅ HIGH-RES fallback (sharp, professional, U.S. campus)
            e.currentTarget.src =
              "https://images.pexels.com/photos/28412565/pexels-photo-28412565.jpeg?cs=srgb&dl=pexels-mingyang-liu-301813241-28412565.jpg&fm=jpg";
          }}
        />

        {/* ✅ Contrast overlay (makes text pop while keeping image visible) */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/55 via-slate-900/45 to-slate-900/30" />

        {/* Content */}
        <div className="relative w-full max-w-6xl mx-auto px-4 py-12 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
            EduFinancing
          </h1>

          <p className="mt-5 text-base md:text-lg text-white/95 max-w-4xl mx-auto leading-relaxed drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]">
            International students can finance education in destinations like the{" "}
            <span className="font-semibold">United States</span> through a smart
            mix of{" "}
            <span className="font-semibold text-white">
              MPOWER Financing educational loans
            </span>
            , <span className="font-semibold text-white">scholarships</span>,{" "}
            <span className="font-semibold text-white">low-cost universities</span>, and{" "}
            <span className="font-semibold text-white">personal savings</span>. This page
            explains your options and how to combine them for the strongest outcome.
          </p>

          {/* badges */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 drop-shadow">
              Loans
            </span>
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 drop-shadow">
              Scholarships
            </span>
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 drop-shadow">
              Low-cost Schools
            </span>
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 drop-shadow">
              Savings Strategy
            </span>
          </div>
        </div>
      </header>

      {/*<div className="max-w-6xl mx-auto px-4 py-10 flex-grow">*/}
      <div className="max-w-7xl mx-auto px-4 py-10 flex-grow">
        {/* 2-column layout: main + right sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MAIN CONTENT */}
          <main className="md:col-span-2 space-y-6">



            {/* NEW INTRODUCTION CARD */}
      <section className={cardClass}>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
          Higher Education Funding for international students
        </h2>
        <p className="mt-2 text-slate-600 leading-relaxed">
          Studying abroad is a major academic and financial decision, and for many
          international students, access to the right funding information is just as
          important as choosing the right university or academic program. A strong
          financing plan can reduce uncertainty, improve application confidence, and
          help students identify realistic pathways toward achieving their educational
          goals.
        </p>
        <p className="mt-3 text-slate-600 leading-relaxed">
          This page is designed to help students understand the major funding options
          available, including scholarships, loans, personal savings, affordable
          universities, and university-funded opportunities. By looking at these
          options together, students can build a more practical and sustainable plan
          for financing their studies.
        </p>
      </section>


      {/* NEW INTRODUCTION CARD */}
      <section className={cardClass}>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
          Mixing Funding Options for a Personalized Financial Strategy
        </h2>
        <p className="mt-2 text-slate-600 leading-relaxed">
         Every student’s financial situation is unique, and it is rare—if not impossible—for one person to secure all available funding opportunities at once. 
         Instead, most students build a personalized financial plan by combining whichever options they qualify for. 
         Educational loans,Scholarships, personal savings, low‑cost universities, and university‑funded programs can be mixed in different ways to create a strategy that aligns with individual circumstances, 
         academic goals, and family resources.
        </p>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Some students may secure strong scholarships but have limited savings. 
          Others may choose a low‑cost university to reduce tuition while relying on departmental assistantships for additional support. 
          Many students combine modest family savings with partial scholarships and program‑level funding to keep their expenses manageable. 
          The strength of this approach lies in its flexibility: each component contributes to lowering costs, and even securing one or two of these options can significantly reduce financial pressure.
        </p>
        <p className="mt-3 text-slate-600 leading-relaxed">
          This mix‑and‑match model empowers students to pursue an international education without relying on a single source of funding. 
          It also helps families plan more confidently, knowing that multiple pathways exist to make higher education affordable. 
          Whether a student secures one opportunity or several, combining available resources creates a practical, sustainable, and realistic financial strategy that supports long‑term academic and personal success.
        </p>
      </section>

            {/* Card: Financing Options */}
            <section className={cardClass}>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                Key Financing Options
              </h2>
              <p className="mt-2 text-slate-600">
                Financing an international education often requires a strategic blend of resources tailored to each student’s background, eligibility, and long‑term goals. 
                Understanding the major pathways available can help you plan more confidently, compare opportunities, and make informed decisions that support both your academic journey and financial well‑being. 
                The options below represent the most common and reliable avenues students use to fund their studies, each offering distinct advantages depending on your circumstances.
              </p>

              
              <div className="mt-4 grid grid-cols-1 gap-4">
  <div className={miniCardClass}>
    <div className="text-sm uppercase tracking-wide text-[#0076CE] font-semibold">
      MPOWER Financing
    </div>
    <p className="mt-2 text-sm text-slate-700">
      MPOWER Financing provides an accessible pathway for international students who may not qualify for traditional loans. 
      Its model is specifically designed to remove common barriers—no co‑signer, no collateral, and no U.S. credit history required. 
      This makes it particularly valuable for students coming from countries where credit systems differ or where securing a guarantor is difficult. 
      MPOWER also offers fixed interest rates, career support, and scholarship opportunities, making it a comprehensive option for students seeking predictable and transparent financing.
    </p>
  </div>

  <div className={miniCardClass}>
    <div className="text-sm uppercase tracking-wide text-emerald-700 font-semibold">
      Scholarships
    </div>
    <p className="mt-2 text-sm text-slate-700">
      Scholarships remain one of the most impactful ways to reduce the overall cost of education. 
      They are awarded based on academic merit, financial need, leadership, community involvement, or specific fields of study. 
      Opportunities come from universities, government bodies, private foundations, and global organizations committed to expanding access to higher education. 
      Because scholarships do not require repayment, 
      they significantly lower financial pressure and can complement other funding sources to create a more sustainable financial plan.
    </p>
  </div>

  <div className={miniCardClass}>
    <div className="text-sm uppercase tracking-wide text-indigo-700 font-semibold">
      Personal Savings
    </div>
    <p className="mt-2 text-sm text-slate-700">
      Personal and family savings continue to play a central role in education financing. Even partial savings can reduce the amount a student needs to borrow, 
      improve financial flexibility, and provide a buffer for unexpected expenses such as housing, textbooks, or health insurance. 
      For many families, combining savings with scholarships or low‑interest loans creates a balanced approach that supports long‑term financial stability..
    </p>
  </div>

  <div className={miniCardClass}>
    <div className="text-sm uppercase tracking-wide text-amber-700 font-semibold">
      Low-cost Universities
    </div>
    <p className="mt-2 text-sm text-slate-700">
      Choosing an affordable university—particularly public institutions or colleges located in smaller, less expensive cities—can dramatically reduce the total cost of attendance. 
      These institutions often offer high‑quality academic programs at a fraction of the cost of major metropolitan or private universities. For students aiming to minimize debt while still earning a reputable degree, 
      low‑cost universities represent a strategic and financially responsible option. 
      When combined with scholarships or assistantships, they can make studying abroad significantly more attainable.
    </p>
  </div>

  <div className={miniCardClass}>
    {/*</div><div className="text-sm uppercase tracking-wide text-amber-700 font-semibold">*/}
    <div className="text-sm uppercase tracking-wide text-purple-900 font-semibold">
      University‑Funded Programs
    </div>
    <p className="mt-2 text-sm text-slate-700">
      Beyond traditional scholarship searches—which can be highly competitive and limited in availability—students should also explore funding opportunities embedded directly within their academic programs. 
      Many universities allocate substantial financial support at the department, faculty, or college level to attract strong applicants and support their academic progression. These opportunities may include tuition waivers, 
      departmental scholarships, research assistantships, teaching assistantships, graduate fellowships, or program‑specific grants tied to a particular field of study.

      Unlike general scholarships, these forms of support are often linked to the program you apply to, meaning your academic background, research interests, or professional experience can significantly strengthen your eligibility. 
      Students who proactively engage with departments, review program‑level funding pages, or inquire during the admissions process often discover opportunities that are not widely advertised. For many international students, 
      university‑funded programs represent a realistic and strategic pathway to securing partial or full financial support while gaining valuable academic or research experience.
    </p>
  </div>
</div>

            </section>

            {/* Card: Strategy Combos */}
            <section className={cardClass}>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                Optimizing Your Funding Strategy
              </h2>
              <p className="mt-2 text-slate-600">
                Designing a sustainable funding plan is just as important as choosing the right academic program. 
                Most students benefit from combining multiple financial resources to reduce overall costs, maintain flexibility, 
                and keep their budget predictable throughout their studies. By strategically blending loans, scholarships, savings, 
                and institutional choices, you can create a balanced approach that supports both your academic goals and long‑term financial well‑being. 
                The combinations below illustrate practical, student‑friendly strategies that maximize affordability while minimizing debt.
              </p>

              <div className="mt-4 space-y-4">
                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      MPOWER Financing + Scholarships
                    </h3>
                    <span className="text-xs rounded-full bg-sky-50 text-sky-700 px-2 py-1 border border-sky-100">
                      Balanced Cost
                  </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Pairing an MPOWER loan with external or university‑based scholarships offers a strong, cost‑efficient strategy. 
                    The loan provides reliable coverage for tuition and mandatory fees, while scholarships directly reduce the amount you need to borrow. 
                    This combination is especially effective for students who secure partial funding but still require a predictable financing option to close the gap. 
                    It ensures stability, lowers long‑term repayment obligations, and allows you to focus on your studies rather than financial uncertainty.
                  </p>
                </div>

                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      MPOWER Financing + Personal Savings
                    </h3>
                    <span className="text-xs rounded-full bg-emerald-50/80 text-emerald-700 px-2 py-1 border border-transparent ring-0">
                     Lower Debt
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Using personal or family savings to cover living expenses—such as housing, food, transportation, 
                    and books—while relying on an MPOWER loan for academic costs creates a balanced and manageable financial plan. 
                    This approach minimizes the need for larger loans, reduces interest accumulation, and provides greater control over your monthly budget. 
                    It is particularly beneficial for students who have some savings but still require structured support for tuition and fees.
                  </p>
                </div>

                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      MPOWER Financing + Low-cost Universities
                    </h3>
                    <span className="text-xs rounded-full bg-amber-50/80 text-amber-700 px-2 py-1 border border-transparent ring-0">
                       Smart Choice
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Combining a flexible MPOWER loan with enrollment at an affordable university—especially public institutions or colleges in low‑cost regions—significantly reduces the total cost of your degree. 
                    This strategy keeps tuition manageable while ensuring you still have access to quality academic programs. 
                    For many international students, this pairing offers the best of both worlds: accessible financing and a degree that remains financially sustainable long after graduation.
                  </p>
                </div>

                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      MPOWER Financing + University‑Funded Programs
                    </h3>
                    <span className="text-xs rounded-full bg-violet-50/80 text-violet-700 px-2 py-1 border border-transparent ring-0">
                      Strategic Leverage
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Combining an MPOWER loan with university‑funded opportunities creates one of the most powerful and sustainable financing strategies for international students. 
                    Many academic departments, faculties, and colleges offer program‑specific funding such as tuition waivers, departmental scholarships, research assistantships, 
                    teaching assistantships, or competitive fellowships tied directly to the student’s field of study. 
                    These opportunities are often overlooked because they are not always listed in general scholarship databases and may only be visible on program pages or through direct communication with faculty.

                    By securing partial funding from the university—whether through a merit award, assistantship, or program‑level grant—you significantly reduce your tuition burden. 
                    An MPOWER loan can then be used to cover the remaining tuition balance or essential academic expenses without requiring a co‑signer or U.S. credit history. 
                    This combination provides both academic and financial advantages: students gain valuable professional or research experience through university‑funded roles while maintaining predictable financing for the remainder of their costs. 
                    For many applicants, this blended approach transforms a competitive program into an affordable and strategically beneficial option.
                  </p>
                </div>

                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      MPOWER Financing + Scholarships + Personal Savings
                    </h3>
                    <span className="text-xs rounded-full bg-rose-50/80 text-rose-700 px-2 py-1 border border-transparent ring-0">
                           Holistic Affordability
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Combining an MPOWER loan with scholarships and personal savings creates one of the most balanced and financially resilient strategies for international students. 
                    Each component plays a distinct role: scholarships reduce the total amount you need to borrow, personal or family savings help cover living expenses without relying on high‑interest credit, and the MPOWER loan provides stable, 
                    predictable funding for tuition and academic fees—without requiring a co‑signer, collateral, or U.S. credit history.

                    This three‑part approach distributes financial responsibility across multiple sources, significantly lowering long‑term repayment obligations while keeping your monthly budget manageable. 
                    Scholarships directly reduce your financial burden, savings offer flexibility for day‑to‑day costs, and the loan ensures you have guaranteed coverage for essential academic expenses. 
                    For students who have partial funding but still need structured support, this combination offers both security and affordability. It allows you to focus on your academic goals with confidence, 
                    knowing that your financial plan is diversified, sustainable, and aligned with long‑term financial well‑being.
                  </p>
                </div>

                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      MPOWER Financing + Scholarships + Personal Savings + Low‑Cost Universities
                    </h3>
                    <span className="text-xs rounded-full bg-cyan-50/80 text-cyan-700 px-2 py-1 border border-transparent ring-0">
                         Comprehensive Affordability Strategy
                      </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Combining an MPOWER loan with scholarships, personal savings, and enrollment at a low‑cost university creates one of the most financially sustainable pathways for international students. 
                    Each component contributes a unique layer of support: scholarships reduce the total amount you need to borrow, personal or family savings help cover living expenses without relying on high‑interest credit, 
                    and choosing an affordable institution significantly lowers tuition from the outset. The MPOWER loan then provides predictable, reliable funding to cover any remaining academic costs—without requiring a co‑signer, collateral, or U.S. credit history.

                    This four‑part strategy distributes financial responsibility across multiple sources, dramatically reducing long‑term repayment obligations while keeping your budget stable throughout your studies. 
                    Scholarships and low‑cost universities work together to minimize tuition, savings offer flexibility for day‑to‑day expenses, and the MPOWER loan ensures you have guaranteed coverage for essential academic fees. 
                    For students seeking maximum affordability without compromising educational quality, this combination offers a realistic, balanced, and highly strategic approach. It empowers you to pursue your degree with confidence, 
                    knowing your financial plan is diversified, resilient, and aligned with long‑term financial well‑being.
                  </p>
                </div>

                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      MPOWER Financing + Scholarships + Personal Savings + Low‑Cost Universities + University‑Funded Programs
                    </h3>
                    <span className="text-xs rounded-full bg-fuchsia-50/80 text-fuchsia-700 px-2 py-1 border border-transparent ring-0">
                       Ultimate Comprehensive Strategy
                  </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Combining an MPOWER loan with scholarships, personal savings, low‑cost universities, and university‑funded programs creates the most robust, affordable, and sustainable financing pathway for international students. 
                    This multi‑layered approach strategically reduces costs at every stage—before, during, and after enrollment—while ensuring that students have predictable, reliable funding throughout their academic journey.

                    Scholarships and university‑funded programs work together to significantly lower tuition obligations. Scholarships reduce the upfront cost, while program‑level opportunities—such as departmental awards, teaching or research assistantships, 
                    tuition waivers, and competitive fellowships—provide additional financial support that is often tied directly to the student’s academic strengths or field of study. 
                    These institutional opportunities are especially valuable because they may not appear in general scholarship databases and are frequently awarded to strong applicants within specific programs.

                   Personal or family savings add another layer of stability by covering living expenses such as housing, food, transportation, and books. This reduces reliance on loans for day‑to‑day costs and helps students maintain a manageable monthly budget. 
                   Choosing a low‑cost university—particularly a public institution or one located in a more affordable region—further minimizes the total cost of attendance, ensuring that tuition remains within a reasonable range even before additional funding is applied.

                   Finally, an MPOWER loan provides predictable and accessible financing to cover any remaining academic expenses without requiring a co‑signer, collateral, or U.S. credit history. This ensures that students can confidently enroll in their chosen program, 
                   knowing that the essential portion of their tuition and fees is fully supported.

                    Together, these five components create a comprehensive, diversified funding plan that dramatically reduces long‑term repayment obligations, enhances financial flexibility, and keeps higher education accessible. 
                    For both students and parents, this strategy offers peace of mind: academic goals can be pursued without overwhelming financial strain, and the investment in education remains sustainable, strategic, and aligned with long‑term success.
                  </p>
                </div>

                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      Scholarships + Personal Savings + Low‑Cost Universities + University‑Funded Programs
                    </h3>
                    <span className="text-xs rounded-full bg-lime-50/80 text-lime-700 px-2 py-1 border border-transparent ring-0">
                        Debt-Free Pathway
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    For students and families seeking to avoid educational debt entirely, combining scholarships, personal savings, low‑cost universities, and university‑funded programs 
                    offers one of the most financially responsible and sustainable pathways to earning a degree abroad. This strategy reduces costs at every stage—tuition, living expenses, 
                    and academic fees—while ensuring that students still access reputable, high‑quality academic programs.

                   Scholarships serve as the foundation of this approach by directly lowering tuition and, in some cases, covering additional academic expenses. 
                   When paired with university‑funded opportunities—such as departmental awards, merit‑based grants, teaching or research assistantships, and program‑specific fellowships—students can significantly reduce or even eliminate their tuition obligations. 
                   These institutional opportunities are often tied to academic performance, research interests, or program‑level priorities, making them especially valuable for motivated applicants.

                   Personal or family savings add another layer of stability by covering essential living costs such as housing, meals, transportation, and books. 
                   Even modest savings can make a meaningful difference, helping students avoid reliance on loans or high‑interest credit for day‑to‑day expenses. 
                   Choosing a low‑cost university—particularly a public institution or one located in a more affordable region—further reduces the financial burden by keeping tuition and living costs at a manageable level from the outset.

                   Together, these four components create a comprehensive, debt‑free funding model that supports both academic success and long‑term financial well‑being. 
                   Students benefit from reduced financial pressure, greater independence, and the freedom to focus fully on their studies, internships, and career development. For parents, 
                   this approach offers peace of mind: their child can pursue an international education without accumulating long‑term debt, while still accessing strong academic programs and meaningful opportunities for growth.
                  </p>
                </div>


                <div className={miniCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      Full MPOWER Financing Educational Loan
                    </h3>
                    <span className="text-xs rounded-full bg-indigo-50/80 text-indigo-700 px-2 py-1 border border-transparent ring-0">
                  Maximum Coverage
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    When scholarships, savings, or institutional funding are limited, a full MPOWER education loan can still make it possible to pursue a top‑tier degree. 
                    This option provides comprehensive coverage for tuition and, in some cases, living expenses, allowing students to enroll in competitive programs without financial barriers. 
                    While it involves a greater repayment commitment, it remains a viable and empowering pathway for students who prioritize academic excellence and long‑term career opportunities.
                  </p>
                </div>
              </div>
            </section>

            {/* Card: How We Help */}
            <section className={cardClass}>
               <h2 className="text-xl md:text-2xl font-bold text-slate-900">
  How We Support You
</h2>

<p className="mt-2 text-slate-600">
  At <span className="font-semibold text-[#0076CE]">ScholarsKnowledge</span>, we are committed to helping international students make informed, confident, and financially sustainable decisions about their education. Through strategic partnerships with 
  <span className="font-medium"> MPOWER Financing</span> and trusted global scholarship providers, we guide you toward credible funding opportunities and practical tools that support both your academic journey and long‑term goals.
</p>

{/*<ul className="mt-4 space-y-2 text-slate-700">*/}
<ul className="mt-4 space-y-2 text-slate-700 text-justify">
  <li className="flex gap-2">
    <span className="text-[#0076CE]">•</span> Access curated, verified scholarships tailored to international students.
  </li>
  <li className="flex gap-2">
    <span className="text-[#0076CE]">•</span> Navigate directly to MPOWER’s loan application experience when structured financing is needed.
  </li>
  <li className="flex gap-2">
    <span className="text-[#0076CE]">•</span> Learn how to balance scholarships, savings, university‑funded programs, and—when appropriate—educational loans to build a realistic financial plan.
  </li>
  <li className="flex gap-2">
    <span className="text-[#0076CE]">•</span> Explore practical, student‑focused content designed to support your academic success, career development, and financial well‑being.
  </li>
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
                  className="rounded-full border border-transparent ring-0 hover:ring-1 hover:ring-slate-200/35
                             text-[#0076CE] px-5 py-2 text-sm font-semibold hover:bg-blue-50/60 transition"
                >
                  Learn about MPOWER FINANCING Education loans
                </a>
              </div>
            </section>
          </main>

          {/* SIDEBAR (Right) */}
          <aside className="md:col-span-1">
            {/*<div className="md:sticky md:top-24 space-y-6">*/}
              <div className="space-y-6">
              {/* Image Card */}
              <div className={`${cardClass} p-4`}>
                <img
                  src="/images/edufinancing-side.jpg"
                  alt="EduFinancing students"
                  className="w-full h-48 object-cover rounded-xl"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.pexels.com/photos/6147161/pexels-photo-6147161.jpeg?cs=srgb&dl=pexels-keira-burton-6147161.jpg&fm=jpg";
                  }}
                />
                <p className="mt-3 text-sm text-slate-600">{/* optional */}</p>
              </div>
               {/* FINANCIAL STRATEGY CONSULTATION CARD */}
<div className={`${cardClass} p-4`}>
  <img
    src="/images/OneOnOne Funding consultation.png"
    alt="Financial funding strategy consultation"
    className="w-full h-auto rounded-xl"
  />

  <div className="mt-4">
    <h3 className="text-lg font-bold text-slate-900 text-center">
      Financial &amp; Funding Strategy Consultation
    </h3>

    <p className="mt-2 text-sm text-slate-600 leading-relaxed text-center">
      Get personalized guidance on combining scholarships, savings,
      affordable universities, university-funded opportunities, and
      education loans into a practical strategy.
    </p>

    <div className="mt-4 flex justify-center">
  <button
    onClick={openCalendly}
    className="inline-flex items-center justify-center rounded-xl bg-[#F4A000] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#db9000]"
  >
    Book Consultation
  </button>
</div>
     </div>
   </div>


   {/* GOOGLE ADS AREA */}
<div className="space-y-6">
  <div className={`${cardClass} p-4`}>
    {/*<GoogleSidebarAd slot="4919459228" />*/}
    <GoogleSidebarAd slot="4919459228" minHeight={600} />
  </div>

  <div className={`${cardClass} p-4`}>
    {/*<GoogleSidebarAd slot="4919459228" />*/}
    <GoogleSidebarAd slot="4919459228" minHeight={800} />
  </div>

  <div className={`${cardClass} p-4`}>
    {/*<GoogleSidebarAd slot="4919459228" />*/}
    <GoogleSidebarAd slot="4919459228" minHeight={1200} />
  </div>
</div>

    

  
              
             </div>
  
          </aside>
        </div>
      </div>

      {/* ✅ FULL-WIDTH CTA (edge-to-edge, like About page) */}
      <section className="w-full mt-6">
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
      <footer className="bg-slate-900 text-slate-300 py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm">
            © {new Date().getFullYear()} ScholarsKnowledge. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm">{/* optional links */}</div>
        </div>
      </footer>
    </div>
  );
}