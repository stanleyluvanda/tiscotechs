// src/pages/STEMMBA.jsx

//import { useEffect } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const ADS_APPROVED = false;
const ADSENSE_CLIENT = "ca-pub-2132263917593964";
const DEFAULT_AD_SLOT = "8562818627";

const quickCards = [
  {
    label: "Traditional MBA",
    tone: "red",
    title: "Usually not STEM",
    body:
      "A general MBA is normally considered a business degree, not a STEM degree, unless the university has officially assigned a STEM-eligible CIP code to the specific MBA program.",
  },
  {
    label: "STEM-Designated MBA",
    tone: "green",
    title: "Possible at many universities",
    body:
      "Some MBA programs qualify as STEM-designated because their curriculum includes substantial quantitative, analytical, technology, data, or management science content.",
  },
  {
    label: "International Student Impact",
    tone: "blue",
    title: "May support STEM OPT",
    body:
      "For eligible F-1 students, a STEM-designated MBA may support the 24-month STEM OPT extension after the standard 12-month OPT period, if all requirements are met.",
  },
];

const specializations = [
  {
    title: "Business Analytics",
    body:
      "Business Analytics uses data to improve decisions in marketing, finance, operations, pricing, customer strategy, and performance management. Coursework may include statistics, predictive modelling, data visualisation, optimisation, and decision analysis.",
  },
  {
    title: "Data Analytics",
    body:
      "Data Analytics concentrations usually go deeper into collecting, cleaning, interpreting, and communicating data. Students may work with databases, dashboards, statistical software, machine learning tools, and business intelligence platforms.",
  },
  {
    title: "Information Systems",
    body:
      "Information Systems connects business leadership with enterprise technology. Typical topics include systems analysis, databases, cybersecurity, cloud platforms, digital governance, IT strategy, and technology project management.",
  },
  {
    title: "Technology Management",
    body:
      "Technology Management prepares students to lead innovation, digital products, technical teams, and technology-driven change. It often combines strategy, product development, analytics, innovation management, and organisational leadership.",
  },
  {
    title: "Supply Chain Analytics",
    body:
      "Supply Chain Analytics applies quantitative tools to sourcing, inventory, logistics, transportation, production, and risk management. Students may study forecasting, optimisation, simulation, procurement analytics, and global operations.",
  },
  {
    title: "Operations Analytics",
    body:
      "Operations Analytics examines how organisations can improve efficiency, quality, capacity, scheduling, and service delivery. It often relies on optimisation, modelling, process analysis, and data-based operational decisions.",
  },
  {
    title: "Quantitative Finance",
    body:
      "Quantitative Finance emphasises mathematical and analytical methods used in valuation, risk, portfolio management, derivatives, forecasting, and financial decision-making. Not every finance track is STEM, so the official CIP code remains important.",
  },
  {
    title: "Management Science",
    body:
      "Management Science uses mathematics, statistics, optimisation, simulation, and decision theory to solve complex business problems. It is one of the most clearly quantitative business disciplines.",
  },
  {
    title: "Digital Transformation",
    body:
      "Digital Transformation explores how organisations redesign products, processes, and customer experiences through technology. Courses may cover digital strategy, platform business models, automation, analytics, and change management.",
  },
  {
    title: "AI and Business Strategy",
    body:
      "AI-focused business pathways examine how organisations use machine learning, automation, generative AI, and intelligent systems. Strong programs also address governance, ethics, implementation risk, and measurable business value.",
  },
  {
    title: "Product Analytics",
    body:
      "Product Analytics combines customer behaviour, experimentation, metrics, data visualisation, and product strategy. Students may learn how to evaluate adoption, retention, pricing, and digital product performance.",
  },
  {
    title: "Financial Analytics",
    body:
      "Financial Analytics applies data tools to planning, forecasting, risk, investment analysis, fraud detection, and performance measurement. STEM status depends on the quantitative content and the university's official classification.",
  },
];

const universities = [
  {
    name: "Harvard Business School",
    note:
      "Offers management education with strong analytical and quantitative elements. Students should verify the current MBA STEM classification directly with the school before relying on it for immigration planning.",
    url: "https://www.hbs.edu/mba/",
  },
  {
    name: "Carnegie Mellon University — Tepper School of Business",
    note:
      "Known for analytics, technology, quantitative decision-making, operations, and management science strengths within business education.",
    url: "https://www.cmu.edu/tepper/programs/mba/",
  },
  {
    name: "University of Rochester — Simon Business School",
    note:
      "Frequently recognized for quantitative business education, analytics, finance, economics, and data-driven management training.",
    url: "https://simon.rochester.edu/programs/full-time-mba",
  },
  {
    name: "University of Chicago — Booth School of Business",
    note:
      "Strong emphasis on economics, analytics, quantitative methods, finance, data, and evidence-based decision-making.",
    url: "https://www.chicagobooth.edu/mba",
  },
  {
    name: "Purdue University — Daniels School of Business",
    note:
      "Business programs may include analytics, technology, operations, supply chain, and quantitative business training.",
    url: "https://business.purdue.edu/mba/",
  },
  {
    name: "Arizona State University — W. P. Carey School of Business",
    note:
      "Offers business programs with analytics, technology, supply chain, data, and quantitative management options.",
    url: "https://wpcarey.asu.edu/mba-programs/full-time",
  },
  {
    name: "University of Texas at Dallas — Naveen Jindal School of Management",
    note:
      "Known for analytics, information systems, technology management, supply chain, finance, and data-heavy business programs.",
    url: "https://jindal.utdallas.edu/mba/full-time-mba/",
  },
  {
    name: "Northeastern University — D'Amore-McKim School of Business",
    note:
      "Business programs may include analytics, technology, experiential learning, and data-oriented concentrations.",
    url: "https://damore-mckim.northeastern.edu/programs/full-time-mba/",
  },
  {
    name: "University of Notre Dame — Mendoza College of Business",
    note:
      "Offers business education with analytical and quantitative components; students should verify the exact STEM designation by program.",
    url: "https://mendoza.nd.edu/graduate-programs/mba/",
  },
  {
    name: "University of Wisconsin–Madison",
    note:
      "Business programs may include analytics, finance, technology, operations, and quantitative decision-making pathways.",
    url: "https://business.wisc.edu/graduate/mba/full-time/",
  },
  {
    name: "University of California, Davis — Graduate School of Management",
    note:
      "MBA and graduate management programs may include analytics, technology, innovation, and quantitative business training.",
    url: "https://gsm.ucdavis.edu/full-time-mba",
  },
  {
    name: "University of Connecticut School of Business",
    note:
      "Offers business programs that may include analytics, operations, information systems, and data-centered management options.",
    url: "https://www.business.uconn.edu/",
  },
  {
  name: "University of Pennsylvania — Wharton School",
  note:
    "Known for finance, analytics, leadership, and data-driven management. Students should verify the current STEM designation for their specific MBA pathway.",
  url: "https://mba.wharton.upenn.edu/",
},
{
  name: "Stanford Graduate School of Business",
  note:
    "Offers MBA education emphasizing innovation, entrepreneurship, leadership, and quantitative business decision-making.",
  url: "https://www.gsb.stanford.edu/programs/mba",
},
{
  name: "Columbia Business School",
  note:
    "Business education with strengths in analytics, finance, technology, and evidence-based management.",
  url: "https://academics.gsb.columbia.edu/mba",
},
{
  name: "University of California, Berkeley — Haas School of Business",
  note:
    "Known for innovation, technology, entrepreneurship, and analytical business education.",
  url: "https://mba.haas.berkeley.edu/",
},
{
  name: "University of Michigan — Ross School of Business",
  note:
    "Offers MBA pathways emphasizing analytics, operations, technology, and data-driven leadership.",
  url: "https://michiganross.umich.edu/graduate/full-time-mba",
},
{
  name: "University of Massachusetts Dartmouth — Charlton College of Business",
  note:
    "Graduate business education with quantitative, technology, and management-focused coursework.",
  url: "https://www.umassd.edu/charlton/",
},
{
  name: "Duke University — Fuqua School of Business",
  note:
    "Internationally recognized for analytics, leadership, healthcare, finance, and technology-oriented management education.",
  url: "https://www.fuqua.duke.edu/programs/daytime-mba",
},
{
  name: "New York University — Stern School of Business",
  note:
    "Offers MBA concentrations in analytics, technology, finance, and digital innovation.",
  url: "https://www.stern.nyu.edu/programs-admissions/full-time-mba",
},
{
  name: "University of Virginia — Darden School of Business",
  note:
    "MBA programs emphasize analytics, consulting, operations, and data-informed leadership.",
  url: "https://www.darden.virginia.edu/mba",
},
{
  name: "Cornell University — SC Johnson College of Business",
  note:
    "Graduate management education with strengths in analytics, technology, operations, and finance.",
  url: "https://business.cornell.edu/mba/",
},
{
  name: "UCLA — Anderson School of Management",
  note:
    "Offers MBA education combining technology, entrepreneurship, analytics, and global business.",
  url: "https://www.anderson.ucla.edu/degrees/full-time-mba",
},
{
  name: "University of North Carolina — Kenan-Flagler Business School",
  note:
    "Known for analytics, consulting, operations, finance, and technology-focused management education.",
  url: "https://www.kenan-flagler.unc.edu/programs/mba/full-time-mba/",
},
{
  name: "University of Southern California — Marshall School of Business",
  note:
    "Offers MBA pathways in analytics, technology management, entrepreneurship, and innovation.",
  url: "https://www.marshall.usc.edu/programs/mba-programs/full-time-mba",
},
{
  name: "Washington University in St. Louis — Olin Business School",
  note:
    "Business education emphasizing analytics, operations, finance, and technology-enabled decision-making.",
  url: "https://olin.wustl.edu/EN-US/graduate/full-time-mba",
},
{
  name: "The Ohio State University — Fisher College of Business",
  note:
    "MBA programs with strengths in operations, analytics, supply chain, finance, and leadership.",
  url: "https://fisher.osu.edu/graduate/mba/full-time-mba",
},
{
  name: "Indiana University — Kelley School of Business",
  note:
    "Offers MBA concentrations in analytics, digital technology, finance, marketing, and operations.",
  url: "https://kelley.iu.edu/programs/full-time-mba/",
},
{
  name: "Rice University — Jones Graduate School of Business",
  note:
    "Graduate business education featuring analytics, finance, entrepreneurship, and technology management.",
  url: "https://business.rice.edu/mba/full-time-mba",
},
{
  name: "Georgetown University — McDonough School of Business",
  note:
    "MBA programs combining analytics, global business, finance, and technology strategy.",
  url: "https://msb.georgetown.edu/mba/full-time/",
},
{
  name: "Vanderbilt University — Owen Graduate School of Management",
  note:
    "Business education emphasizing analytics, operations, finance, healthcare, and leadership.",
  url: "https://business.vanderbilt.edu/mba/",
},
{
  name: "University of Georgia — Terry College of Business",
  note:
    "Graduate management education with analytics, finance, supply chain, and quantitative business training.",
  url: "https://www.terry.uga.edu/mba/full-time/",
},
{
  name: "Southern Methodist University — Cox School of Business",
  note:
    "Offers MBA pathways in business analytics, finance, strategy, and technology management.",
  url: "https://www.smu.edu/cox/graduate/full-time-mba",
},
{
  name: "Boston University — Questrom School of Business",
  note:
    "MBA curriculum integrating analytics, digital business, finance, and innovation.",
  url: "https://www.bu.edu/questrom/degree-programs/full-time-mba/",
},
{
  name: "University of Pittsburgh — Joseph M. Katz Graduate School of Business",
  note:
    "Graduate business programs emphasizing analytics, information systems, finance, and operations.",
  url: "https://business.pitt.edu/katz/mba/",
},
{
  name: "George Washington University School of Business",
  note:
    "Offers MBA education with concentrations in analytics, project management, finance, and consulting.",
  url: "https://business.gwu.edu/academics/programs/mba",
},
{
  name: "Rutgers Business School",
  note:
    "Known for business analytics, supply chain management, finance, and technology-focused business education.",
  url: "https://www.business.rutgers.edu/mba",
},
{
  name: "Iowa State University — Ivy College of Business",
  note:
    "Graduate business education with strengths in analytics, information systems, supply chain, and finance.",
  url: "https://www.ivybusiness.iastate.edu/",
},
{
  name: "William & Mary — Raymond A. Mason School of Business",
  note:
    "MBA programs emphasizing analytics, consulting, finance, and strategic management.",
  url: "https://mason.wm.edu/graduate/mba/",
},
{
  name: "Babson College",
  note:
    "Internationally recognized for entrepreneurship, innovation, analytics, and business leadership.",
  url: "https://www.babson.edu/mba/",
},
{
  name: "Fordham University — Gabelli School of Business",
  note:
    "Business programs with strengths in analytics, finance, information systems, and management.",
  url: "https://www.fordham.edu/gabelli-school-of-business/",
},
{
  name: "University of Miami — Herbert Business School",
  note:
    "MBA pathways covering analytics, finance, healthcare, entrepreneurship, and technology management.",
  url: "https://herbert.miami.edu/",
},
{
  name: "Case Western Reserve University — Weatherhead School of Management",
  note:
    "Known for analytics, operations, innovation, and technology-driven business education.",
  url: "https://weatherhead.case.edu/",
},
{
  name: "Syracuse University — Whitman School of Management",
  note:
    "Graduate business education emphasizing analytics, entrepreneurship, finance, and management.",
  url: "https://whitman.syracuse.edu/",
},
{
  name: "University of Delaware — Lerner College of Business and Economics",
  note:
    "Offers graduate business programs with analytics, finance, economics, and information systems.",
  url: "https://lerner.udel.edu/",
},
{
  name: "Pace University — Lubin School of Business",
  note:
    "Business education including analytics, finance, information systems, and management.",
  url: "https://www.pace.edu/lubin",
},
{
  name: "University of North Texas — G. Brint Ryan College of Business",
  note:
    "Graduate programs featuring analytics, operations, information systems, and supply chain management.",
  url: "https://cob.unt.edu/",
},
{
  name: "University of Maryland — Robert H. Smith School of Business",
  note:
    "MBA education emphasizing analytics, information systems, finance, and digital innovation.",
  url: "https://www.rhsmith.umd.edu/",
},
{
  name: "Binghamton University — School of Management",
  note:
    "Graduate management education with quantitative analysis, finance, accounting, and operations.",
  url: "https://www.binghamton.edu/som/",
},
{
  name: "University of San Diego — Knauss School of Business",
  note:
    "Business programs integrating analytics, technology, entrepreneurship, and global management.",
  url: "https://www.sandiego.edu/business/",
},
{
  name: "Yale School of Management",
  note:
    "MBA curriculum emphasizing leadership, analytics, global business, innovation, and evidence-based decision-making.",
  url: "https://som.yale.edu/programs/mba",
},

  // Continue adding the remaining universities...
];
const checks = [
  {
    title: "Confirm the exact CIP code",
    body:
      "Do not rely only on the phrase “STEM MBA.” Ask the admissions office or international student office for the exact CIP code assigned to your MBA program.",
  },
  {
    title: "Verify the current STEM status",
    body:
      "STEM designation can change. Confirm the status for the exact intake year and campus where you plan to enroll.",
  },
  {
    title: "Check whether your track matters",
    body:
      "Some schools may classify the full MBA as STEM-designated, while others may tie STEM eligibility to a concentration, pathway, or selected coursework.",
  },
  {
    title: "Ask about STEM OPT support",
    body:
      "International students should ask whether the school has experience supporting STEM OPT paperwork, employer verification, and related student advising.",
  },
  {
    title: "Review employer requirements",
    body:
      "STEM OPT requires eligible employment with an E-Verify employer and completion of required training-plan documentation.",
  },
  {
    title: "Get confirmation in writing",
    body:
      "Before making a final decision, save written confirmation from the university about the program’s STEM designation and CIP code.",
  },
  {
    title: "Review the actual curriculum",
    body:
      "Read the required courses and credit structure carefully. A marketing label is not enough; the curriculum should show meaningful analytics, technology, quantitative, or management science content.",
  },
  {
    title: "Confirm the status for your cohort",
    body:
      "Universities revise curricula and classifications. Ask whether the STEM designation applies to your admission year, campus, and exact MBA format.",
  },
];

const faqs = [
  {
    q: "Is every MBA in the United States a STEM program?",
    a:
      "No. A traditional MBA is generally not a STEM program. Only a specific MBA that the university has officially classified under a STEM-eligible CIP code should be treated as STEM-designated.",
  },
  {
    q: "Can an international student get STEM OPT after an MBA?",
    a:
      "Possibly. The degree must be STEM-designated, the student must meet F-1 OPT requirements, and the employer must satisfy STEM OPT rules, including E-Verify and training-plan obligations.",
  },
  {
    q: "Is Business Analytics usually STEM?",
    a:
      "Business Analytics is commonly associated with STEM-designated graduate business programs because it often includes statistics, predictive modelling, data management, and quantitative decision-making.",
  },
  {
    q: "Is Finance automatically STEM?",
    a:
      "No. Quantitative finance, financial analytics, econometrics, and data-heavy finance pathways may be STEM-designated, but traditional finance is not automatically STEM.",
  },
  {
    q: "Is Marketing automatically STEM?",
    a:
      "Traditional marketing is usually not STEM. Marketing analytics, consumer analytics, or data-driven marketing may qualify at some universities depending on the official program classification.",
  },
  {
    q: "Is an Executive MBA STEM?",
    a:
      "Some Executive MBA programs may be STEM-designated, but many are not. Verify the exact program, campus, format, and CIP code.",
  },
  {
    q: "Can an online MBA be STEM-designated?",
    a:
      "Academically, some online MBAs may carry a STEM classification. International students must separately confirm whether the delivery format supports their visa and employment goals.",
  },
  {
    q: "Can a part-time MBA be STEM-designated?",
    a:
      "Yes, but STEM status and F-1 eligibility are separate questions. Confirm both with the university before applying.",
  },
  {
    q: "Does accreditation make an MBA STEM?",
    a:
      "No. Accreditation evaluates academic quality, while STEM designation depends on the program's official classification and CIP code.",
  },
  {
    q: "Do I need a technical undergraduate degree?",
    a:
      "Not always. Many programs admit students from business, economics, social sciences, engineering, and other backgrounds, although quantitative preparation may be expected.",
  },
  {
    q: "Can I change concentration and keep STEM status?",
    a:
      "That depends on the school. A concentration change may affect the program classification, so ask the international office before making changes.",
  },
  {
    q: "Does a STEM MBA guarantee a job in the United States?",
    a:
      "No. It may expand work-authorisation options for eligible students, but it does not guarantee employment, sponsorship, permanent residence, or visa approval.",
  },
  {
    q: "Can similar MBA titles have different STEM status?",
    a:
      "Yes. Universities can assign different CIP codes to programs with similar names because their curricula and classifications differ.",
  },
  {
    q: "Is an MBA in Supply Chain STEM?",
    a:
      "Some supply chain MBA pathways are STEM-designated because they include forecasting, optimisation, logistics analytics, and operations research. Others are not.",
  },
  {
    q: "Does STEM designation guarantee three years of work authorisation?",
    a:
      "No. Eligible students may first receive standard OPT and may later qualify for the 24-month STEM extension. Each stage has separate requirements.",
  },
];

function ResponsiveAd({ slotId = DEFAULT_AD_SLOT, className = "" }) {
  useEffect(() => {
    if (!ADS_APPROVED) return;

    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch {
      // AdSense may not be available in development or before approval.
    }
  }, []);

  if (!ADS_APPROVED) return null;

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div>
      {eyebrow ? (
        <div className="mb-3 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#163A70]">
          {eyebrow}
        </div>
      ) : null}

      <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>

      {children ? (
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
          {children}
        </p>
      ) : null}
    </div>
  );
}

function ToneCard({ card }) {
  const tone =
    card.tone === "red"
      ? "border-red-200 bg-red-50 text-red-800"
      : card.tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-blue-200 bg-blue-50 text-[#163A70]";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
      <div className="text-xs font-bold uppercase tracking-[0.16em]">{card.label}</div>
      <h3 className="mt-3 text-xl font-bold text-slate-950">{card.title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-700">{card.body}</p>
    </div>
  );
}

export default function STEMMBA() {
  const [showAllUniversities, setShowAllUniversities] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-[#163A70] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-5xl">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/90">
              MBA & STEM Designation — U.S. Guide
            </div>

            <h1 className="mt-6 max-w-5xl font-serif text-4xl font-bold leading-tight md:text-6xl">
              Is an MBA a STEM Program in the United States?
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/85">
              A traditional MBA is usually not a STEM program. However, many U.S.
              universities now offer STEM-designated MBA programs with strong analytics,
              technology, data, quantitative, and management science components.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#quick-answer"
                className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
              >
                Quick Answer
              </a>
              <a
                href="#check-before-applying"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                What to Check
              </a>
            </div>
          </div>
        </div>
      </section>

      <ResponsiveAd className="mx-auto max-w-[1100px] px-4 py-4" />
      {/* MBA INTRO — ALIGNED WITH MAIN ARTICLE CARD */}
<section className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6 lg:px-8">
  <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">

    {/* SAME COLUMN WIDTH AS THE MAIN ARTICLE */}
    {/*<div className="min-w-0">*/}
      <div className="min-w-0 xl:pr-8">
      <div className="w-fit rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#163A70]">
        MBA Admissions Guide
      </div>

      <h2 className="mt-8 font-serif text-[40px] font-bold leading-[1.12] text-slate-950 sm:text-5xl md:text-6xl">
  Looking for a{" "}
  <span className="italic text-[#163A70]">
    STEM-Designated
  </span>{" "}
  MBA in the United States?
</h2>

<p className="mt-6 text-lg leading-8 text-slate-700">
  Discover what makes an MBA STEM-designated, which specializations commonly
  qualify, how STEM designation may affect post-graduation work opportunities,
  and what every international student should verify before applying.
</p>

<div className="mt-8 flex max-w-[720px] items-center justify-between border-y border-slate-200 py-6">
  <div className="flex items-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#163A70] font-serif text-lg font-bold text-white">
      SK
    </div>

    <div className="ml-4 flex-1">
      <p className="font-bold text-slate-950">
        ScholarsKnowledge Editorial
      </p>

      <p className="text-sm text-slate-500">
        Updated July 2026 · Applies to STEM MBA programs across U.S. universities
      </p>
    </div>
  </div>

  <span className="whitespace-nowrap rounded-full bg-[#163A70] px-4 py-2 text-sm font-bold text-white">
    12 min read
  </span>
</div>

<p className="mt-6 text-lg leading-8 text-slate-700">
  A STEM-designated MBA combines the core principles of business administration
  with advanced quantitative, analytical, and technology-focused coursework.
  Unlike a traditional MBA, a STEM MBA may include subjects such as business
  analytics, data science, information systems, operations research, artificial
  intelligence, supply chain analytics, financial engineering, and technology
  management. These programs are designed to prepare graduates to solve complex
  business challenges using data-driven decision-making while developing strong
  leadership and strategic management skills.
</p>
<ResponsiveAd
  slotId="8562818627"
  className="my-8 w-full"
/>

<p className="mt-6 text-lg leading-8 text-slate-700">
  Over the past several years, many U.S. business schools have redesigned their
  MBA curricula to reflect the growing demand for professionals who can bridge
  business strategy with technology and analytics. As organizations increasingly
  rely on artificial intelligence, big data, automation, cloud computing, and
  digital transformation, employers are seeking graduates who understand both
  business leadership and quantitative problem-solving. In response, a growing
  number of universities have introduced STEM-designated MBA pathways that
  better align with the skills required in today's global economy.
</p>
<ResponsiveAd
  slotId="8562818627"
  className="my-8 w-full"
/>

<p className="mt-6 text-lg leading-8 text-slate-700">
  For international students, a STEM-designated MBA can provide additional
  practical advantages beyond the classroom. Depending on the university,
  program structure, and U.S. immigration regulations in effect at the time of
  graduation, eligible graduates may qualify for an extended period of Optional
  Practical Training (OPT), allowing them to gain more professional experience
  in the United States after completing their degree. Because STEM designation
  is assigned to individual academic programs rather than entire universities,
  applicants should always verify the current CIP code and STEM classification
  directly with each business school before submitting an application.
</p>

      <div className="mt-8">
  <img
    src="/images/mbaSTEM.webp"
    alt="International students studying in a modern STEM MBA classroom"
    className="block h-[320px] w-full rounded-2xl object-cover shadow-sm md:h-[420px]"
  />
</div></div>

    {/* RIGHT SIDEBAR */}
<aside className="hidden xl:block">
  <div className="sticky top-24 space-y-5">
    <ResponsiveAd />

    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">

  <div className="-mx-5 -mt-5 mb-5 rounded-t-lg bg-emerald-700 px-5 py-4 border-b border-emerald-800">
    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
      In This Guide
    </h3>
  </div>

  <div className="space-y-3 text-sm font-semibold text-slate-700">

  <a href="#quick-answer" className="block hover:text-[#163A70]">
    Quick answer
  </a>

  <a href="#how-it-works" className="block hover:text-[#163A70]">
    How STEM designation works
  </a>

  <a href="#why-stem-mba" className="block hover:text-[#163A70]">
    Why universities offer STEM MBAs
  </a>

  <a href="#benefits" className="block hover:text-[#163A70]">
    Benefits of a STEM MBA
  </a>

  <a href="#specializations" className="block hover:text-[#163A70]">
    STEM MBA specializations
  </a>

  <a href="#comparison" className="block hover:text-[#163A70]">
    STEM MBA vs Traditional MBA
  </a>

  <a href="#universities" className="block hover:text-[#163A70]">
    Universities offering STEM MBA programs
  </a>

  <a href="#check-before-applying" className="block hover:text-[#163A70]">
    What international students should check
  </a>

  <a href="#mistakes" className="block hover:text-[#163A70]">
    Common mistakes
  </a>

  <a href="#faq" className="block hover:text-[#163A70]">
    Frequently Asked Questions
  </a>

  <a href="#disclaimer" className="block hover:text-[#163A70]">
    Disclaimer
  </a>

</div>
    </div>

    <ResponsiveAd />
  </div>
</aside>

  </div>
</section>

      {/*<section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">*/}
        <section className="mx-auto max-w-[1400px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="min-w-0">
            <section id="quick-answer" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="Quick answer" title="MBA STEM status depends on the exact program">
                Students should not assume that every MBA is STEM-designated. The official
                answer depends on the university’s program classification, CIP code, and
                curriculum structure.
              </SectionTitle>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {quickCards.map((card) => (
                  <ToneCard key={card.title} card={card} />
                ))}
              </div>
            </section>

            <section id="how-it-works"
                className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              
              <SectionTitle eyebrow="How it works" title="How STEM MBA designation works">
                A STEM-designated MBA is not created by the title alone. It is usually tied
                to the official program classification used by the university and the
                curriculum behind the degree.
              </SectionTitle>

              <div className="mt-6 space-y-5 text-base leading-8 text-slate-700 sm:text-lg">
                <p>
                  In the United States, the STEM label is connected to the academic
                  classification assigned to a degree program, not simply to whether the
                  program sounds technical. Universities use Classification of Instructional
                  Programs codes, commonly called CIP codes, to describe the main academic
                  content of a program.
                </p>
                <p>
                  This is why two business schools can offer MBA programs with similar names
                  but different STEM outcomes. One school may build a large share of its
                  curriculum around analytics, optimisation, information systems, modelling,
                  and technology management, while another may emphasise leadership,
                  communication, and general strategy.
                </p>
                <p>
                  Program structures also vary. At some universities, the entire MBA is
                  STEM-designated. At others, only students in an approved concentration or
                  pathway receive the STEM-classified degree. Applicants should ask which
                  arrangement applies to their own cohort.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-bold text-slate-950">Whole-program designation</h3>
                  <p className="mt-3 leading-7 text-slate-700">
                    Some universities classify the entire MBA as STEM-designated because the
                    program includes substantial quantitative, analytics, operations,
                    technology, or data-driven management coursework.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-bold text-slate-950">Track or concentration designation</h3>
                  <p className="mt-3 leading-7 text-slate-700">
                    Other universities may connect STEM eligibility to a concentration such
                    as Business Analytics, Information Systems, Supply Chain Analytics, or
                    Technology Management.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 md:col-span-2">
                  <h3 className="font-bold text-amber-900">Important distinction</h3>
                  <p className="mt-3 leading-7 text-slate-800">
                    A program name alone does not determine STEM eligibility. The strongest
                    evidence is the university-assigned CIP code and written confirmation
                    from the admissions or international student office.
                  </p>
                </div>
              </div>
            </section>

            <section id="why-stem-mba"
                 className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="Why programs are changing" title="Why universities are creating STEM MBAs">
                Business decisions increasingly depend on data, digital systems, artificial
                intelligence, modelling, and technology-enabled operations.
              </SectionTitle>

              <div className="mt-6 space-y-5 text-base leading-8 text-slate-700 sm:text-lg">
                <p>
                  Employers increasingly expect managers to interpret dashboards, understand
                  data quality, evaluate technology investments, work with analytical teams,
                  and make evidence-based decisions. A manager may not need to become a
                  software engineer, but they often need enough technical fluency to lead
                  teams that use analytics, cloud systems, automation, cybersecurity, and AI.
                </p>
                <p>
                  STEM MBA programs respond by adding deeper quantitative content to the
                  traditional management curriculum. Students may study forecasting,
                  optimisation, database concepts, data visualisation, product analytics,
                  operations research, and technology strategy alongside finance, leadership,
                  marketing, and accounting.
                </p>
                <p>
                  This can prepare graduates for careers in consulting, technology, financial
                  analytics, supply chain, product management, business intelligence, risk,
                  operations, and digital transformation.
                </p>
              </div>
            </section>

            <section id="benefits"
              className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="Student value" title="Potential benefits of a STEM-designated MBA">
                The strongest reason to choose a STEM MBA is that the curriculum supports
                your academic and career goals. Immigration-related benefits should be one
                part of a broader decision.
              </SectionTitle>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {[
                  ["Stronger analytical confidence", "Learn to interpret models, question assumptions, and communicate quantitative findings."],
                  ["Technology-driven career preparation", "Build skills relevant to analytics, product, consulting, operations, and digital strategy."],
                  ["A broader management toolkit", "Combine leadership and commercial judgment with data, systems, and modelling skills."],
                  ["Possible STEM OPT advantages", "Eligible F-1 students may qualify for the 24-month STEM OPT extension after standard OPT."],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                    <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{body}</p>
                  </div>
                ))}
              </div>
            </section>

            <ResponsiveAd
  slotId="8562818627"
  className="my-8"
/>

            <section id="specializations"
               className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="Specializations" title="Common STEM-designated MBA areas">
                These areas are commonly associated with STEM-designated MBA programs, but
                students should still confirm the exact program classification at each
                university.
              </SectionTitle>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {specializations.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5"
                  >
                    <h3 className="text-lg font-bold text-[#163A70]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="comparison"
                 className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="Comparison" title="STEM MBA vs. non-STEM MBA">
                The academic experience may look similar in some courses, but the immigration
                and post-graduation work planning implications can be different for eligible
                F-1 students.
              </SectionTitle>

              <div className="mt-6 space-y-5 text-base leading-8 text-slate-700 sm:text-lg">
                <p>
                  A non-STEM MBA can still be academically rigorous and professionally
                  valuable. The usual difference is the amount and centrality of
                  quantitative, technological, and analytical coursework.
                </p>
                <p>
                  Someone seeking broad management preparation may prefer a traditional MBA.
                  Someone targeting analytics, fintech, technology consulting, product,
                  operations, or supply chain may benefit more from a STEM-focused curriculum.
                </p>
              </div>

              <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-[#163A70] text-sm font-bold text-white">
                    <div className="p-4">Topic</div>
                    <div className="p-4">Traditional MBA</div>
                    <div className="p-4">STEM-designated MBA</div>
                  </div>

                  {[
                    ["Program focus", "General management", "Management plus analytics, technology, quantitative, or data-heavy coursework"],
                    ["STEM status", "Usually not STEM", "May be STEM if officially classified by the university"],
                    ["OPT planning", "Usually standard OPT only", "May support STEM OPT extension if all requirements are met"],
                    ["What to verify", "Degree requirements and career fit", "CIP code, STEM status, employer rules, and international office guidance"],
                  ].map(([topic, traditional, stem]) => (
                    <div key={topic} className="grid grid-cols-[1.1fr_1fr_1fr] border-t border-slate-200 odd:bg-slate-50">
                      <div className="p-4 font-bold text-slate-950">{topic}</div>
                      <div className="p-4 text-slate-700">{traditional}</div>
                      <div className="p-4 text-slate-700">{stem}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <ResponsiveAd
  slotId="8562818627"
  className="my-8"
/>

            <section id="universities"
            className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="Universities" title="Universities with STEM-designated MBA options">
                Many U.S. business schools offer MBA programs or MBA pathways with STEM
                designation. Always verify the current status directly with the school.
              </SectionTitle>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
  {(showAllUniversities
    ? universities
    : universities.slice(0, 12)
  ).map((school) => (
    <div
  key={school.name}
  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:shadow-md"
>
  <h3 className="font-bold text-slate-900">
    {school.name}
  </h3>

  <p className="mt-3 text-sm leading-7 text-slate-700">
    {school.note}
  </p>

  <a
    href={school.url}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-4 inline-flex items-center text-sm font-semibold text-[#163A70] hover:underline"
  >
    Visit official MBA page →
  </a>
</div>
                ))}
              </div>
              {universities.length > 12 && (
  <div className="mt-8 text-center">
    <button
      type="button"
      onClick={() => setShowAllUniversities((v) => !v)}
      className="inline-flex items-center rounded-full border border-[#163A70] px-6 py-3 font-semibold text-[#163A70] transition hover:bg-[#163A70] hover:text-white"
    >
      {showAllUniversities
        ? "Show fewer universities"
        : `View all STEM MBA universities (${universities.length})`}
    </button>
  </div>
)}
            </section>

            <section id="check-before-applying" className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="Before applying" title="What international students should check">
                Before choosing a STEM MBA, verify the details that affect academic planning,
                OPT planning, employer eligibility, and long-term career strategy.
              </SectionTitle>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {checks.map((item, index) => (
                  <div key={item.title} className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#163A70] text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <ResponsiveAd
  slotId="8562818627"
  className="my-8"
/>

            <section id="mistakes"
                 className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="Avoid these errors" title="Common mistakes when evaluating a STEM MBA">
                Careful applicants verify details instead of relying on labels, rankings, or assumptions.
              </SectionTitle>

              <div className="mt-8 space-y-6">
                {[
                  ["Assuming the phrase “STEM MBA” is enough", "Ask for the exact CIP code and written confirmation from the school."],
                  ["Relying only on rankings", "Rankings do not explain STEM status, curriculum depth, employer rules, or student support."],
                  ["Ignoring the MBA format", "Full-time, part-time, executive, and online versions may have different classifications."],
                  ["Choosing STEM only for OPT", "The degree must also make sense academically, professionally, and financially."],
                  ["Failing to check employer rules", "STEM OPT involves E-Verify, training-plan, reporting, and qualifying-employment requirements."],
                  ["Assuming the designation never changes", "Confirm the current status for your own cohort before paying a deposit."],
                ].map(([title, body], index) => (
                  <div key={title} className="grid gap-4 sm:grid-cols-[42px_minmax(0,1fr)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#163A70] font-bold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                      <p className="mt-2 leading-7 text-slate-700">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="faq"
                  className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <SectionTitle eyebrow="FAQ" title="Common questions about STEM MBA programs" />

              <div className="mt-8 divide-y divide-slate-200">
                {faqs.map((faq) => (
                  <div key={faq.q} className="py-5">
                    <h3 className="text-lg font-bold text-slate-950">{faq.q}</h3>
                    <p className="mt-3 leading-7 text-slate-700">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="disclaimer"
                className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-amber-900">Disclaimer</h2>
              <p className="mt-3 leading-7 text-slate-800">
                This guide is for general educational purposes only. STEM designation, CIP
                codes, OPT eligibility, and immigration rules can change. Always verify
                information directly with the university, your international student office,
                and official government sources before making academic or immigration
                decisions.
              </p>
            </section>
          </article>
<aside className="hidden xl:block">
            <div className="sticky top-24 space-y-5">
              <ResponsiveAd />

              

               <ResponsiveAd
      slotId="8562818627"
      className="w-full"
    />

              <ResponsiveAd />
            </div>
          </aside>
        </div>
      </section>

      <section className="w-full bg-[#163A70] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center lg:px-8">
          <h3 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">
            Explore scholarships for MBA and STEM students
          </h3>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/85">
            Find scholarships, fellowships, and university-funded graduate opportunities
            that can support your business, analytics, and STEM-focused study plans.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/scholarship"
              className="w-full rounded-full bg-[#D4AF37] px-6 py-3 text-center text-sm font-bold text-[#163A70] transition hover:bg-amber-300 sm:w-auto"
            >
              Browse Scholarships
            </Link>

            <Link
              to="/funded-graduate-admission"
              className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#163A70] transition hover:bg-amber-300"
            >
              University-Funded Programs
            </Link>

            <Link
              to="/stem-programs"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              View STEM Programs
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                MBA & STEM Guide
              </h3>
              <div className="mt-5 space-y-4">
                <a href="#quick-answer" className="block hover:text-[#163A70]">
                  Quick Answer
                </a>
                <a href="#check-before-applying" className="block hover:text-[#163A70]">
                  What to Check Before Applying
                </a>
                <Link to="/stem-programs" className="block hover:text-[#163A70]">
                  STEM Programs
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Related Resources
              </h3>
              <div className="mt-5 space-y-4">
                <Link to="/study-in-us" className="block hover:text-[#163A70]">
                  Study in The U.S
                </Link>
                <Link to="/scholarship" className="block hover:text-[#163A70]">
                  Scholarships Directory
                </Link>
                <Link to="/funded-graduate-admission" className="block hover:text-[#163A70]">
                  Funded Graduate Admission
                </Link>
                <Link to="/fellowship" className="block hover:text-[#163A70]">
                  Fellowships
                </Link>
              </div>
            </div>

            <div className="md:text-right">
              <h2 className="font-serif text-3xl font-bold text-[#163A70]">
                Scholars<span className="text-amber-500">Knowledge</span>
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                Helping students discover verified scholarships, fellowships, funded
                graduate opportunities, STEM programs, and practical application guidance.
              </p>
              <div className="mt-6 flex flex-wrap justify-start gap-5 text-sm text-slate-500 md:justify-end">
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Use</Link>
                <Link to="/contact">Contact</Link>
              </div>
              <p className="mt-8 text-sm text-slate-500">
                © 2026 ScholarsKnowledge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}