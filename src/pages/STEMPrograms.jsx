// src/pages/STEMPrograms.jsx

/*import { useEffect } from "react";*/
import { Fragment, useEffect } from "react";
import Footer from "../components/Footer.jsx";
import { Link } from "react-router-dom";
const CAN_SHOW_ADS = false;

const stemCards = [
  {
    id: 1,
    title: "Agriculture, Food, and Animal Sciences",
    image: "/images/stem/agriculture-food-animal-sciences.jpg",
    description:
      "Programs in this area include agroecology, sustainable agriculture, animal sciences, agricultural animal breeding, animal health, animal nutrition, dairy science, livestock management, poultry science, food science, food technology, plant sciences, agronomy, horticultural science, plant breeding, plant protection, pest management, soil science, and related veterinary science fields.",
  },
  {
    id: 2,
    title: "Environmental, Natural Resources, and Conservation Studies",
    image: "/images/stem/environmental-natural-resources.jpg",
    description:
      "This group includes environmental studies, environmental science, natural resources and conservation, water and marine resources management, forest sciences, urban forestry, wildlife and fisheries science, and other conservation-focused scientific fields.",
  },
  {
    id: 3,
    title: "Computer Science, Artificial Intelligence, and Information Technology",
    image: "/images/stem/computer-science-ai.jpg",
    description:
      "This is one of the largest STEM areas and includes computer science, artificial intelligence, information technology, informatics, computer programming, data processing, information science, systems analysis, web and multimedia design, database administration, computer graphics, simulation, networking, system administration, cybersecurity, information assurance, IT project management, and related computing fields.",
  },
  {
    id: 4,
    title: "Engineering",
    image: "/images/stem/engineering.jpg",
    description:
      "Engineering fields broadly qualify across many specializations. These include aerospace, astronautical, agricultural, architectural, biomedical, ceramic, chemical, civil, computer, electrical, telecommunications, engineering mechanics, engineering physics, engineering science, environmental engineering, materials engineering, mechanical engineering, metallurgical engineering, mining and mineral engineering, marine engineering, nuclear engineering, ocean engineering, petroleum engineering, systems engineering, textile engineering, polymer/plastics engineering, construction engineering, forest engineering, industrial engineering, manufacturing engineering, operations research, geological engineering, robotics, automation engineering, biochemical engineering, biosystems engineering, electrical and computer engineering, and energy systems engineering.",
  },
  {
    id: 5,
    title: "Engineering Technologies and Applied Technical Fields",
    image: "/images/stem/engineering-technologies.jpg",
    description:
      "These programs are more application-oriented and include architectural engineering technology, civil engineering technology, electronics technology, laser and optical technology, telecommunications technology, biomedical technology, robotics technology, automation technology, environmental engineering technology, manufacturing engineering technology, chemical engineering technology, semiconductor manufacturing technology, quality control technology, safety technology, mechanical engineering technology, petroleum technology, construction engineering technology, computer engineering technology, drafting and design technology, nanotechnology, and energy systems technology.",
  },
  {
    id: 6,
    title: "Biological and Biomedical Sciences",
    image: "/images/stem/biological-biomedical-sciences.jpg",
    description:
      "This category includes biology, biomedical sciences, biochemistry, biophysics, molecular biology, plant biology, cell biology, microbiology, immunology, virology, genetics, genomics, physiology, pathology, pharmacology, toxicology, bioinformatics, computational biology, biotechnology, ecology, marine biology, epidemiology, molecular medicine, neuroscience, and related biological science fields.",
  },
  {
    id: 7,
    title: "Mathematics, Statistics, and Quantitative Sciences",
    image: "/images/stem/mathematics-statistics.jpg",
    description:
      "Programs in this category include mathematics, applied mathematics, computational mathematics, financial mathematics, mathematical biology, statistics, mathematical statistics, probability, applied statistics, and other quantitative analytical fields.",
  },
  {
    id: 8,
    title: "Physical Sciences",
    image: "/images/stem/physical-sciences.jpg",
    description:
      "These include astronomy, astrophysics, atmospheric science, meteorology, chemistry, geosciences, hydrology, oceanography, physics, optical sciences, nuclear physics, materials science, and related physical science disciplines.",
  },
  {
    id: 9,
    title: "Interdisciplinary STEM and Computational Programs",
    image: "/images/stem/interdisciplinary-stem.jpg",
    description:
      "Some interdisciplinary programs are also included, such as biological and physical sciences, systems science, mathematics and computer science, cognitive science, human biology, computational science, human-computer interaction, marine sciences, sustainability studies, and nutrition sciences.",
  },
  {
    id: 10,
    title: "Psychology and Behavioral Research with Strong Quantitative/Scientific Focus",
    image: "/images/stem/behavioral-cognitive-sciences.jpg",
    description:
      "Certain research-oriented psychology fields may qualify, including cognitive psychology, psycholinguistics, comparative psychology, developmental psychology, experimental psychology, behavioral neuroscience, psychometrics, quantitative psychology, and psychopharmacology.",
  },
  {
    id: 11,
    title: "Data, Geographic, and Quantitative Social Science Fields",
    image: "/images/stem/data-quantitative-social-sciences.jpg",
    description:
      "Some highly quantitative social science and applied data fields may be STEM-designated, including econometrics, quantitative economics, geographic information science and cartography, business statistics, actuarial science, management science, and other management sciences and quantitative methods programs.",
  },
  {
    id: 12,
    title: "Health, Medical, and Pharmaceutical Sciences",
    image: "/images/stem/health-pharmaceutical-sciences.jpg",
    description:
      "Selected health and biomedical research fields may qualify, including medical science, cytotechnology, clinical laboratory science, pharmaceutics, medicinal and pharmaceutical chemistry, drug development, pharmacoeconomics, pharmaceutical sciences, environmental health, health physics, and medical informatics.",
  },
  {
    id: 13,
    title: "Forensics, Security, and Applied Scientific Investigation",
    image: "/images/stem/forensics-security-sciences.jpg",
    description:
      "Some specialized applied science programs are also on the list, such as cyber/computer forensics, forensic science and technology, and other investigation-oriented technical fields.",
  },
];


function ResponsiveSidebarAd({ slotId = "8562818627" }) {
  useEffect(() => {
    if (!CAN_SHOW_ADS) return;

    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch {
      // ignore
    }
  }, []);

  if (!CAN_SHOW_ADS) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-2132263917593964"
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
      {children}
    </h2>
  );
}

function scrollToCategory(id) {
  const node = document.getElementById(`stem-category-${id}`);
  if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function STEMPrograms() {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/stem/stem-hero-bg.jpg')" }}
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-[#0A4595]/70" />

        {/* Optional soft light effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_30%)]" />

        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-24 pb-12 md:pt-16 md:pb-16 lg:pt-20 lg:pb-20">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white/95 shadow-sm backdrop-blur">
              STEM-Eligible Fields of Study (DHS CIP Code Categories)
            </div>

            <h1 className="mt-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
              STEM Programs for International Students
            </h1>

            <p className="mt-5 max-w-5xl mx-auto text-sm sm:text-base lg:text-lg leading-7 text-white/90">
              For international students exploring U.S. study opportunities, some academic
              programs may fall under the U.S. Department of Homeland Security (DHS) STEM
              Designated Degree Program List. In general, STEM-designated programs are in
              science, technology, engineering, mathematics, and related quantitative or
              research-based fields.
            </p>

            <div className="mt-6 mx-auto max-w-5xl rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-left shadow-sm backdrop-blur sm:px-5">
              <p className="text-sm sm:text-base lg:text-lg leading-7 text-white/90">
                Students enrolled in eligible programs may qualify for additional practical
                training benefits after graduation, depending on their visa category, school
                reporting, and the exact CIP code assigned by the university.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Intro strip */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-[1500px] px-6 sm:px-8 lg:px-10 xl:px-12 py-7">
          <SectionTitle>Understanding STEM Designation</SectionTitle>

          <p className="mt-4 text-sm sm:text-base text-slate-700 leading-7 max-w-5xl">
            Because STEM eligibility is determined by the official CIP code attached to
            the specific academic program, students should always confirm the exact
            program classification directly with the university before making a final
            decision.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
              <div className="text-sm font-semibold text-[#0A4595]">What to verify</div>
              <p className="mt-2 text-sm text-slate-700 leading-6">
                Confirm the exact degree title, official CIP code, and whether the
                university classifies the program as STEM-designated.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
              <div className="text-sm font-semibold text-[#0A4595]">Why it matters</div>
              <p className="mt-2 text-sm text-slate-700 leading-6">
                STEM classification can affect academic planning, post-graduation options,
                and how international students evaluate long-term study opportunities.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
              <div className="text-sm font-semibold text-[#0A4595]">Best practice</div>
              <p className="mt-2 text-sm text-slate-700 leading-6">
                Ask the university’s admissions or international office to confirm the
                program classification in writing before enrollment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main layout */}
      <div className="mx-auto max-w-[1500px] px-6 sm:px-8 lg:px-10 xl:px-12 py-8 md:py-10">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-8 xl:gap-10 items-start">
          <main className="min-w-0 w-full">
            {/* Program groupings */}
            <section>
              <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
                <div className="flex flex-col gap-4">
                  <div>
                    <SectionTitle>Main STEM Program Groupings</SectionTitle>
                    <p className="mt-2 text-sm sm:text-base text-slate-600 leading-7 max-w-4xl">
                      The DHS STEM list covers a broad range of disciplines. The categories
                      below help international students understand the main academic areas
                      commonly associated with STEM-designated study in the United States.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                   {stemCards.map((card) => (
  <button
    key={card.id}
    type="button"
    onClick={() => scrollToCategory(card.id)}
    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#0A4595] hover:bg-blue-100 transition"
  >
    Category {card.id}
  </button>
))}
                  </div>
                  </div>
                  </div>
                
          
              <div className="my-0 min-h-0">
  <ResponsiveSidebarAd slotId="8562818627" />
</div>

              <div className="mt-6 space-y-5">
  {stemCards.map((card, index) => (
    <Fragment key={card.id}>
      <article
        id={`stem-category-${card.id}`}
        className="group scroll-mt-24 overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition"
      >
        <div className="grid grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)] lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[430px_minmax(0,1fr)]">
          <div className="relative h-56 sm:h-64 md:h-full min-h-[260px] overflow-hidden bg-slate-100">
            <img
              src={card.image}
              alt={card.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent md:bg-gradient-to-r md:from-black/35 md:via-black/10 md:to-transparent" />
            <div className="absolute left-4 top-4">
              <div className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white/95 border border-white/20">
                Category {card.id}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-6 lg:p-8 xl:p-9">
            <div className="mb-3 inline-flex w-fit items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0A4595]">
              STEM category {card.id}
            </div>

            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 leading-snug">
              {card.title}
            </h3>

            <p className="mt-3 text-sm sm:text-base text-slate-700 leading-7">
              {card.description}
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#0A4595]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A4595]" />
              <span>Review the exact CIP code with the university before enrollment.</span>
            </div>
          </div>
        </div>
      </article>

      {(index + 1) % 2 === 0 && index !== stemCards.length - 1 ? (
        <div className="my-0 min-h-0">
  <ResponsiveSidebarAd slotId="8562818627" />
</div>
      ) : null}
    </Fragment>
  ))}
</div>
            </section>

            {/* Guidance card */}
            <section className="mt-8 rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
              <SectionTitle>How International Students Should Use This Information</SectionTitle>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Before applying
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm sm:text-base text-slate-700 leading-7 list-disc pl-5">
                    <li>Review whether your intended field fits a STEM-designated area.</li>
                    <li>Check the program structure, research focus, and quantitative content.</li>
                    <li>Compare how universities classify similar programs.</li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Before enrollment
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm sm:text-base text-slate-700 leading-7 list-disc pl-5">
                    <li>Ask for the exact CIP code assigned to the degree program.</li>
                    <li>Confirm current STEM status with the international office.</li>
                    <li>Do not rely only on the program title or department name.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <p className="text-sm sm:text-base text-slate-800 leading-7">
                  <span className="font-semibold">Important note:</span> A program name alone
                  does not determine STEM eligibility. Two universities may offer similar
                  degree titles but assign different CIP codes. The final reference point is
                  the official university-assigned CIP code for the specific program.
                </p>
              </div>
            </section>

           
            {/* Invisible in-content ad container for future placement if needed */}
            <div
              id="stem-inline-ad"
              className="w-full min-h-0"
              aria-hidden="true"
              style={{ background: "transparent" }}
            />
          </main>

          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-5">
              <ResponsiveSidebarAd slotId="8562818627" />

              <div className="rounded-3xl bg-[#0A4595] text-white shadow-sm p-5">
                <h3 className="text-sm font-bold">Explore Related Opportunities</h3>

                <div className="mt-4 space-y-2">
                  <Link
  to="/stem-mba-guide#universities"
  className="block rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#0A4595] hover:bg-blue-50"
>
  STEM MBA Universities
</Link>
                  <Link
                    to="/study-in-us"
                    className="block rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                  >
                    Study in The U.S
                  </Link>
                  <Link
                    to="/funded-graduate-admission"
                    className="block rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                  >
                    Funded Graduate Admission
                  </Link>
                  <Link
                    to="/scholarship"
                    className="block rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#0A4595] hover:bg-blue-50"
                  >
                    Scholarships Directory
                  </Link>
                </div>
              </div>
               
      <ResponsiveSidebarAd slotId="8562818627" />
            </div>
          </aside>
        </div>
      </div>

     <section className="w-full bg-[#163A70] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center lg:px-8">
          <h3 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">
            Explore STEM study and funding opportunities
          </h3>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/85">
            Use STEM field information together with scholarships, fellowships,
            and university-funded graduate programs when planning your next step.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/scholarship"
              className="w-full rounded-full bg-[#D4AF37] px-6 py-3 text-center text-sm font-bold text-[#163A70] transition hover:bg-amber-300 sm:w-auto"
            >
              Browse Scholarships
            </Link>

            <Link
              to="/fellowship"
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              Browse Fellowships
            </Link>

            <Link
              to="/funded-graduate-admission"
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              University-Funded Programs
            </Link>

            <Link
              to="/student-sign-up"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              Join Free
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                STEM Programs
              </h3>
              <div className="mt-5 space-y-4">
                <a href="#stem-category-1" className="block hover:text-[#163A70]">
                  Agriculture and Food Sciences
                </a>
                <a href="#stem-category-3" className="block hover:text-[#163A70]">
                  Computer Science and AI
                </a>
                <a href="#stem-category-4" className="block hover:text-[#163A70]">
                  Engineering
                </a>
                <a href="#stem-category-7" className="block hover:text-[#163A70]">
                  Mathematics and Statistics
                </a>
                <a href="#stem-category-12" className="block hover:text-[#163A70]">
      Health & Pharmaceutical Sciences
    </a>

    <a href="#stem-category-13" className="block hover:text-[#163A70]">
      Forensics & Security Sciences
    </a>
              </div>
            </div>

            <div>
  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
    More STEM Categories
  </h3>

  <div className="mt-5 space-y-4">
    <a href="#stem-category-5" className="block hover:text-[#163A70]">
      Engineering Technologies
    </a>

    <a href="#stem-category-6" className="block hover:text-[#163A70]">
      Biological & Biomedical Sciences
    </a>

    <a href="#stem-category-8" className="block hover:text-[#163A70]">
      Physical Sciences
    </a>

    <a href="#stem-category-9" className="block hover:text-[#163A70]">
      Interdisciplinary STEM
    </a>

    <a href="#stem-category-10" className="block hover:text-[#163A70]">
      Psychology & Behavioral Research
    </a>

    <a href="#stem-category-11" className="block hover:text-[#163A70]">
      Data & Quantitative Social Sciences
    </a>

    
  </div>
</div>

            <div className="md:text-right">
              <h2 className="font-serif text-3xl font-bold text-[#163A70]">
                Scholars<span className="text-amber-500">Knowledge</span>
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                Helping students discover verified scholarships, fellowships,
                funded graduate opportunities, STEM programs, and expert
                application guidance.
              </p>
              <div className="mt-6 flex flex-wrap justify-start gap-5 text-sm text-slate-500 md:justify-end">
                 <Link to="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
          <Link to="/terms-of-use" className="hover:underline">Terms of Use</Link>
                <Link to="/contact">Contact</Link>
              </div>
              <p className="mt-8 text-sm text-slate-500">
                © 2026 ScholarsKnowledge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}