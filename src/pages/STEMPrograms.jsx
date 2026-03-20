// src/pages/STEMPrograms.jsx

import Footer from "../components/Footer.jsx";
import { Link } from "react-router-dom";
import GoogleSidebarAd from "../components/GoogleSidebarAd.jsx";

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

function AdRail({ slot }) {
  return (
    <aside className="hidden xl:block xl:w-[160px] 2xl:w-[180px] shrink-0">
      <div className="sticky top-[170px]">
        <GoogleSidebarAd
          slot={slot}
          label=""
          minHeight={600}
          className="w-full"
          enabled={true}
          keepPlaceholder={true}
        />
      </div>
    </aside>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
      {children}
    </h2>
  );
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
  <div className="absolute inset-0 bg-[#0A4595]/65" />

  {/* Optional soft light effect */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.10),transparent_30%)]" />

  {/*<div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10 md:py-14 lg:py-16">*/}
  <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-26 pb-10 md:pt-14 md:pb-14 lg:pt-16 lg:pb-16">
    <div className="mx-auto max-w-5xl">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs sm:text-sm font-semibold text-white/95">
              STEM-Eligible Fields of Study (DHS CIP Code Categories)
            </div>

           <h1 className="mt-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-tight whitespace-normal sm:whitespace-nowrap">
  STEM Programs for International Students
</h1>

            <p className="mt-4 max-w-6xl text-xs sm:text-sm md:text-base lg:text-lg leading-6 md:leading-7 text-white/90 text-justify">
              For international students exploring U.S. study opportunities, some academic
              programs may fall under the U.S. Department of Homeland Security (DHS) STEM
              Designated Degree Program List. In general, STEM-designated programs are in
              science, technology, engineering, mathematics, and related quantitative or
              research-based fields.
            </p>

            <p className="mt-4 max-w-6xl text-xs sm:text-sm md:text-base lg:text-lg leading-6 md:leading-7 text-white/90 text-justify">
              Students enrolled in eligible programs may qualify for additional practical
              training benefits after graduation, depending on their visa category, school
              reporting, and the exact CIP code assigned by the university.
            </p>
          </div>
        </div>
      </section>

      {/* Main layout with invisible ad rails */}
      <div className="mx-auto max-w-[1500px] px-3 sm:px-4 lg:px-6 py-8 md:py-10">
        <div className="flex items-start gap-4 xl:gap-6">
          <AdRail slot="2515946722" />

          <main className="min-w-0 flex-1">
            {/* Intro card */}
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
              <SectionTitle>Understanding STEM Designation</SectionTitle>

              <p className="mt-4 text-sm sm:text-base text-slate-700 leading-7">
                Because STEM eligibility is determined by the official CIP code attached to
                the specific academic program, students should always confirm the exact
                program classification directly with the university before making a final
                decision.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">What to verify</div>
                  <p className="mt-2 text-sm text-slate-700 leading-6">
                    Confirm the exact degree title, official CIP code, and whether the
                    university classifies the program as STEM-designated.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Why it matters</div>
                  <p className="mt-2 text-sm text-slate-700 leading-6">
                    STEM classification can affect academic planning, post-graduation options,
                    and how international students evaluate long-term study opportunities.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Best practice</div>
                  <p className="mt-2 text-sm text-slate-700 leading-6">
                    Ask the university’s admissions or international office to confirm the
                    program classification in writing before enrollment.
                  </p>
                </div>
              </div>
            </section>

            {/* Grid of STEM cards */}
            <section className="mt-8">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <SectionTitle>Main STEM Program Groupings</SectionTitle>
                  <p className="mt-2 text-sm sm:text-base text-slate-600 leading-7 max-w-4xl">
                    The DHS STEM list covers a broad range of disciplines. The categories
                    below help international students understand the main academic areas
                    commonly associated with STEM-designated study in the United States.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {stemCards.map((card) => (
                  <article
                    key={card.id}
                    className="group overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition"
                  >
                    <div className="relative h-60 sm:h-72 md:h-80 overflow-hidden bg-slate-100">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                      <div className="absolute left-0 right-0 bottom-0 p-4 sm:p-5">
                        <div className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white/95 border border-white/20">
                          Category {card.id}
                        </div>
                        <h3 className="mt-3 text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug">
                          {card.title}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <p className="text-sm sm:text-base text-slate-700 leading-7">
                        {card.description}
                      </p>
                    </div>
                  </article>
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

            {/* Related links */}
            <section className="mt-8 rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6 md:p-8">
              <SectionTitle>Explore Related Opportunities</SectionTitle>

              <p className="mt-3 text-sm sm:text-base text-slate-700 leading-7">
                International students can use STEM field information together with funding,
                admissions, and university opportunity pages when planning their next step.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/study-in-us"
                  className="rounded-full border border-[#0A4595] text-[#0A4595] px-4 py-2 text-sm font-semibold hover:bg-blue-50"
                >
                  Study in The U.S
                </Link>

                <Link
                  to="/funded-graduate-admission"
                  className="rounded-full border border-[#0A4595] text-[#0A4595] px-4 py-2 text-sm font-semibold hover:bg-blue-50"
                >
                  Funded Graduate Admission
                </Link>

                <Link
                  to="/scholarship"
                  className="rounded-full bg-[#0A4595] text-white px-4 py-2 text-sm font-semibold hover:bg-[#083a7d]"
                >
                  Scholarships Directory
                </Link>
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

          <AdRail slot="2515946722" />
        </div>
      </div>

      <Footer />
    </div>
  );
}