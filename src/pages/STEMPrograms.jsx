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
      "This group includes environmental studies, environmental science, natural resources and conservation, water and marine resources management, forest sciences, urban forestry, wildlife and fisheries science, and other conservation focused scientific fields.",
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
      "These programs are more application oriented and include architectural engineering technology, civil engineering technology, electronics technology, laser and optical technology, telecommunications technology, biomedical technology, robotics technology, automation technology, environmental engineering technology, manufacturing engineering technology, chemical engineering technology, semiconductor manufacturing technology, quality control technology, safety technology, mechanical engineering technology, petroleum technology, construction engineering technology, computer engineering technology, drafting and design technology, nanotechnology, and energy systems technology.",
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
      "Some interdisciplinary programs are also included, such as biological and physical sciences, systems science, mathematics and computer science, cognitive science, human biology, computational science, human computer interaction, marine sciences, sustainability studies, and nutrition sciences.",
  },
  {
    id: 10,
    title: "Psychology and Behavioral Research with Strong Quantitative/Scientific Focus",
    image: "/images/stem/behavioral-cognitive-sciences.jpg",
    description:
      "Certain research oriented psychology fields may qualify, including cognitive psychology, psycholinguistics, comparative psychology, developmental psychology, experimental psychology, behavioral neuroscience, psychometrics, quantitative psychology, and psychopharmacology.",
  },
  {
    id: 11,
    title: "Data, Geographic, and Quantitative Social Science Fields",
    image: "/images/stem/data-quantitative-social-sciences.jpg",
    description:
      "Some highly quantitative social science and applied data fields may be STEM designated, including econometrics, quantitative economics, geographic information science and cartography, business statistics, actuarial science, management science, and other management sciences and quantitative methods programs.",
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
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "STEM Programs for International Students | ScholarsKnowledge";
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7F3] text-slate-900">
      {/* HERO */}
      <header className="relative overflow-hidden text-white">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/stem/stem-hero-bg.jpg')" }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#102E3B]/95 via-[#174A56]/78 to-[#285F67]/48" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(228,187,93,0.22),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-24 lg:px-8 lg:py-28">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E7C76F]">
              DHS CIP code categories
            </p>

            <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              STEM Programs for International Students
            </h1>

            <div className="mt-5 h-1 w-24 bg-[#D4AF37]" />

            <p className="mt-7 max-w-4xl text-base leading-8 text-white/90 md:text-lg md:leading-9">
              For international students exploring U.S. study opportunities, some academic
              programs may fall under the U.S. Department of Homeland Security (DHS) STEM
              Designated Degree Program List. In general, STEM designated programs are in
              science, technology, engineering, mathematics, and related quantitative or
              research based fields.
            </p>

            <p className="mt-5 max-w-4xl border-l-4 border-[#D4AF37] pl-5 text-base leading-8 text-white/85">
              Students enrolled in eligible programs may qualify for additional practical
              training benefits after graduation, depending on their visa category, school
              reporting, and the exact CIP code assigned by the university.
            </p>
          </div>
        </div>
      </header>

      {/* INTRODUCTION */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
                Understanding STEM designation
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#143D49]">
                Confirm the classification before you enroll
              </h2>
            </div>

            <div>
              <p className="max-w-4xl text-base leading-8 text-slate-600">
                Because STEM eligibility is determined by the official CIP code attached to
                the specific academic program, students should always confirm the exact
                program classification directly with the university before making a final
                decision.
              </p>

              <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
                <InfoRow
                  number="01"
                  title="What to verify"
                  text="Confirm the exact degree title, official CIP code, and whether the university classifies the program as STEM designated."
                />

                <InfoRow
                  number="02"
                  title="Why it matters"
                  text="STEM classification can affect academic planning, options after graduation, and how international students evaluate long term study opportunities."
                />

                <InfoRow
                  number="03"
                  title="Best practice"
                  text="Ask the university admissions office or international office to confirm the program classification in writing before enrollment."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-14 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-16">
          <main className="min-w-0">
            <section>
              <div className="border-b border-slate-300 pb-10">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
                  Program categories
                </p>

                <h2 className="mt-3 font-serif text-3xl font-semibold text-[#143D49] md:text-4xl">
                  Main STEM Program Groupings
                </h2>

                <p className="mt-5 max-w-4xl text-base leading-8 text-slate-600">
                  The DHS STEM list covers a broad range of disciplines. The categories
                  below help international students understand the main academic areas
                  commonly associated with STEM designated study in the United States.
                </p>

                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3">
                  {stemCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => scrollToCategory(card.id)}
                      className="border-b-2 border-transparent pb-1 text-sm font-semibold text-[#1F6670] transition hover:border-[#D4AF37] hover:text-[#143D49]"
                    >
                      Category {card.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-8 min-h-0">
                <ResponsiveSidebarAd slotId="8562818627" />
              </div>

              <div>
                {stemCards.map((card, index) => (
                  <Fragment key={card.id}>
                    <article
                      id={`stem-category-${card.id}`}
                      className="scroll-mt-24 border-b border-slate-300 py-12 first:pt-0"
                    >
                      <div className="grid gap-8 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[330px_minmax(0,1fr)]">
                        <div className="relative min-h-[220px] overflow-hidden bg-slate-200">
                          <img
                            src={card.image}
                            alt={card.title}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#102E3B]/70 via-transparent to-transparent" />
                          <span className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-[0.14em] text-white">
                            Category {card.id}
                          </span>
                        </div>

                        <div className="flex flex-col justify-center">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B28625]">
                            STEM category {card.id}
                          </p>

                          <h3 className="mt-3 font-serif text-2xl font-semibold leading-snug text-[#143D49]">
                            {card.title}
                          </h3>

                          <p className="mt-5 text-base leading-8 text-slate-600">
                            {card.description}
                          </p>

                          <p className="mt-6 border-l-2 border-[#D4AF37] pl-4 text-sm leading-7 text-slate-500">
                            Review the exact CIP code with the university before enrollment.
                          </p>
                        </div>
                      </div>
                    </article>

                    {(index + 1) % 2 === 0 && index !== stemCards.length - 1 ? (
                      <div className="my-8 min-h-0">
                        <ResponsiveSidebarAd slotId="8562818627" />
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </div>
            </section>

            {/* GUIDANCE */}
            <section className="py-16">
              <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
                    Student guidance
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-semibold text-[#143D49]">
                    How International Students Should Use This Information
                  </h2>
                </div>

                <div>
                  <div className="grid gap-10 md:grid-cols-2">
                    <GuidanceList
                      title="Before applying"
                      items={[
                        "Review whether your intended field fits a STEM designated area.",
                        "Check the program structure, research focus, and quantitative content.",
                        "Compare how universities classify similar programs.",
                      ]}
                    />

                    <GuidanceList
                      title="Before enrollment"
                      items={[
                        "Ask for the exact CIP code assigned to the degree program.",
                        "Confirm current STEM status with the international office.",
                        "Do not rely only on the program title or department name.",
                      ]}
                    />
                  </div>

                  <div className="mt-10 border-l-4 border-[#D4AF37] bg-[#F4F0E5] px-6 py-5">
                    <p className="text-base leading-8 text-slate-700">
                      <span className="font-semibold text-[#143D49]">Important note:</span>{" "}
                      A program name alone does not determine STEM eligibility. Two
                      universities may offer similar degree titles but assign different CIP
                      codes. The final reference point is the official university assigned
                      CIP code for the specific program.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div
              id="stem-inline-ad"
              className="w-full min-h-0"
              aria-hidden="true"
              style={{ background: "transparent" }}
            />
          </main>

          {/* SIDEBAR */}
          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-8">
              <ResponsiveSidebarAd slotId="8562818627" />

              <nav className="border-y border-slate-300 py-6">
                <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-[#2E6E63]">
                  Explore related opportunities
                </p>

                <div className="mt-5 divide-y divide-slate-200">
                  <SidebarLink to="/stem-mba-guide#universities">
                    STEM MBA Universities
                  </SidebarLink>
                  <SidebarLink to="/study-in-us">Study in The U.S</SidebarLink>
                  <SidebarLink to="/funded-graduate-admission">
                    Funded Graduate Admission
                  </SidebarLink>
                  <SidebarLink to="/scholarship">
                    Scholarships Directory
                  </SidebarLink>
                </div>
              </nav>

              <ResponsiveSidebarAd slotId="8562818627" />
            </div>
          </aside>
        </div>
      </div>

      {/* CTA */}
      <section className="w-full bg-gradient-to-r from-[#143D49] via-[#1F5963] to-[#2E6E63] text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center lg:px-8">
          <h3 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            Explore STEM study and funding opportunities
          </h3>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/85">
            Use STEM field information together with scholarships, fellowships,
            and university funded graduate programs when planning your next step.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/scholarship"
              className="w-full rounded-md bg-[#D4AF37] px-6 py-3 text-center text-sm font-bold text-[#143D49] transition hover:bg-[#E2C25C] sm:w-auto"
            >
              Browse Scholarships
            </Link>

            <Link
              to="/fellowship"
              className="rounded-md bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#143D49] transition hover:bg-[#E2C25C]"
            >
              Browse Fellowships
            </Link>

            <Link
              to="/funded-graduate-admission"
              className="rounded-md bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#143D49] transition hover:bg-[#E2C25C]"
            >
              University Funded Programs
            </Link>

            <Link
              to="/student-sign-up"
              className="rounded-md border border-white/50 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Join Free
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <FooterColumn
              title="STEM Programs"
              links={[
                ["#stem-category-1", "Agriculture and Food Sciences"],
                ["#stem-category-3", "Computer Science and AI"],
                ["#stem-category-4", "Engineering"],
                ["#stem-category-7", "Mathematics and Statistics"],
                ["#stem-category-12", "Health and Pharmaceutical Sciences"],
                ["#stem-category-13", "Forensics and Security Sciences"],
              ]}
            />

            <FooterColumn
              title="More STEM Categories"
              links={[
                ["#stem-category-5", "Engineering Technologies"],
                ["#stem-category-6", "Biological and Biomedical Sciences"],
                ["#stem-category-8", "Physical Sciences"],
                ["#stem-category-9", "Interdisciplinary STEM"],
                ["#stem-category-10", "Psychology and Behavioral Research"],
                ["#stem-category-11", "Data and Quantitative Social Sciences"],
              ]}
            />

            <div className="md:text-right">
              <h2 className="font-serif text-3xl font-semibold text-[#143D49]">
                Scholars<span className="text-[#B28625]">Knowledge</span>
              </h2>

              <p className="mt-4 leading-8 text-slate-600">
                Helping students discover verified scholarships, fellowships,
                funded graduate opportunities, STEM programs, and expert
                application guidance.
              </p>

              <div className="mt-6 flex flex-wrap justify-start gap-5 text-sm text-slate-500 md:justify-end">
                <Link to="/privacy-policy" className="hover:text-[#143D49]">
                  Privacy Policy
                </Link>
                <Link to="/terms-of-use" className="hover:text-[#143D49]">
                  Terms of Use
                </Link>
                <Link to="/contact" className="hover:text-[#143D49]">
                  Contact
                </Link>
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

function InfoRow({ number, title, text }) {
  return (
    <div className="grid gap-3 py-6 sm:grid-cols-[70px_190px_minmax(0,1fr)] sm:items-start">
      <span className="font-serif text-sm font-semibold text-[#B28625]">
        {number}
      </span>
      <h3 className="font-semibold text-[#143D49]">{title}</h3>
      <p className="text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function GuidanceList({ title, items }) {
  return (
    <div>
      <h3 className="font-serif text-2xl font-semibold text-[#143D49]">
        {title}
      </h3>

      <ul className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
        {items.map((item) => (
          <li key={item} className="flex gap-3 py-4 text-sm leading-7 text-slate-600">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarLink({ to, children }) {
  return (
    <Link
      to={to}
      className="block py-4 text-sm font-semibold leading-6 text-[#143D49] transition hover:text-[#2E6E63]"
    >
      {children}
    </Link>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>

      <div className="mt-5 space-y-4 text-slate-700">
        {links.map(([href, label]) => (
          <a key={href} href={href} className="block hover:text-[#143D49]">
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}