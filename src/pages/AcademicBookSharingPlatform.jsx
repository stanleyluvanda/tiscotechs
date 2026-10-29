//src/pages/AcademicBookSharingPlatform.jsx//
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchMySharedAcademicBooks,
  fetchSavedAcademicBooks,
  saveAcademicBook,
  unsaveAcademicBook,
  fetchAcademicBooks,
  requestAcademicBookUploadUrl,
  uploadAcademicBookPdf,
  publishAcademicBook,
  requestAcademicBookCoverUploadUrl,
  uploadAcademicBookCover,
  requestAcademicBookReadUrl,
} from "../lib/academicBooksApi";
import Session from "supertokens-web-js/recipe/session";
import { generateAcademicBookCover } from "../utils/academicBookCover";


const SUBJECTS = [
  "Agriculture",
  "Artificial Intelligence",
  "Arts & Humanities",
  "Business Studies",
  "Computer Science",
  "Economics",
  "Engineering",
  "Law",
  "Medicine & Health",
  "Natural Sciences",
  "Philosophy",
  "Political Science",
  "Social Sciences",
];
const BOOK_SUBCATEGORIES = {
  "Artificial Intelligence": [
    "Introduction to Artificial Intelligence",
    "Machine Learning",
    "Deep Learning",
    "Neural Networks",
    "Natural Language Processing",
    "Large Language Models (LLMs)",
    "Generative Artificial Intelligence",
    "Computer Vision",
    "Reinforcement Learning",
    "Supervised Learning",
    "Unsupervised Learning",
    "Self-Supervised Learning",
    "Transfer Learning",
    "Representation Learning",
    "Explainable Artificial Intelligence",
    "Responsible AI and AI Ethics",
    "AI Safety and Alignment",
    "AI Governance and Policy",
    "AI Evaluation and Benchmarking",
    "AI Agents and Multi-Agent Systems",
    "Robotics and Intelligent Systems",
    "Knowledge Representation and Reasoning",
    "Expert Systems",
    "Search Algorithms and Optimization",
    "Evolutionary Computation",
    "Fuzzy Logic",
    "Probabilistic Machine Learning",
    "Bayesian Networks",
    "Graph Neural Networks",
    "Speech Recognition and Processing",
    "Information Retrieval",
    "Recommender Systems",
    "Time Series Forecasting with AI",
    "AI in Healthcare",
    "AI in Finance and Banking",
    "AI in Education",
    "AI in Agriculture",
    "AI in Cybersecurity",
    "AI in Scientific Research",
    "AI Software Engineering",
    "MLOps and Model Deployment",
    "AI Infrastructure and Computing",
    "Other Artificial Intelligence",
  ],

"Business Studies": [
    "Accounting",
    "Financial Accounting",
    "Management Accounting",
    "Auditing",
    "Taxation",
    "Finance",
    "Corporate Finance",
    "Banking",
    "Investment Management",
    "Financial Markets",
    "Risk Management",
    "Insurance",
    "Business Administration",
    "Business Management",
    "Strategic Management",
    "Human Resource Management",
    "Organizational Behavior",
    "Leadership",
    "Marketing",
    "Digital Marketing",
    "Marketing Research",
    "Consumer Behavior",
    "Entrepreneurship",
    "Innovation Management",
    "International Business",
    "International Trade",
    "Operations Management",
    "Supply Chain Management",
    "Logistics",
    "Project Management",
    "Business Analytics",
    "Business Intelligence",
    "Management Information Systems",
    "E-Commerce",
    "Business Law",
    "Corporate Governance",
    "Business Ethics",
    "Sustainable Business",
    "Hospitality Management",
    "Tourism Management",
    "Real Estate Management",
    "Other Business Studies",
  ],
  "Computer Science": [
  "Algorithms",
  "Artificial Intelligence",
  "Big Data Analytics",
  "Bioinformatics",
  "Blockchain Technology",
  "Cloud Computing",
  "Compiler Design",
  "Computational Complexity",
  "Computer Architecture",
  "Computer Ethics",
  "Computer Graphics",
  "Computer Networks",
  "Computer Science Education",
  "Computer Theory",
  "Computer Vision",
  "Cryptography",
  "Cybersecurity",
  "Data Mining",
  "Data Science",
  "Data Structures",
  "Database Management",
  "Database Systems",
  "Deep Learning",
  "Digital Forensics",
  "Discrete Mathematics",
  "Distributed Systems",
  "Embedded Systems",
  "Formal Methods",
  "Game Development",
  "High-Performance Computing",
  "Human-Computer Interaction",
  "Image Processing",
  "Information Security",
  "Information Systems",
  "Information Technology",
  "Internet of Things",
  "Machine Learning",
  "Mobile Application Development",
  "Natural Language Processing",
  "Network Security",
  "Numerical Computing",
  "Operating Systems",
  "Other Computer Science Topics",
  "Parallel Computing",
  "Programming Languages",
  "Quantum Computing",
  "Robotics",
  "Scientific Computing",
  "Software Development",
  "Software Engineering",
  "Theory of Computation",
  "User Interface and User Experience Design",
  "Virtual Reality and Augmented Reality",
  "Web Development",
],


  Economics: [
    "Microeconomics",
    "Macroeconomics",
    "Econometrics",
    "Development Economics",
    "International Economics",
    "Financial Economics",
    "Monetary Economics",
    "Public Economics",
    "Labor Economics",
    "Agricultural Economics",
    "Environmental Economics",
    "Health Economics",
    "Behavioral Economics",
    "Economic History",
    "Other Economics",
  ],
Engineering: [
    "Aerospace Engineering",
    "Aeronautical Engineering",
    "Agricultural Engineering",
    "Architectural Engineering",
    "Automotive Engineering",
    "Biomedical Engineering",
    "Biochemical Engineering",
    "Biological Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Coastal Engineering",
    "Computer Engineering",
    "Construction Engineering",
    "Control Systems Engineering",
    "Electrical Engineering",
    "Electronics Engineering",
    "Environmental Engineering",
    "Energy Engineering",
    "Geotechnical Engineering",
    "Geological Engineering",
    "Industrial Engineering",
    "Manufacturing Engineering",
    "Marine Engineering",
    "Materials Engineering",
    "Mechanical Engineering",
    "Mechatronics Engineering",
    "Metallurgical Engineering",
    "Mining Engineering",
    "Nuclear Engineering",
    "Ocean Engineering",
    "Petroleum Engineering",
    "Power Systems Engineering",
    "Renewable Energy Engineering",
    "Robotics Engineering",
    "Software Engineering",
    "Structural Engineering",
    "Systems Engineering",
    "Telecommunications Engineering",
    "Transportation Engineering",
    "Water Resources Engineering",
    "Hydraulic Engineering",
    "Surveying and Geomatics Engineering",
    "Nanotechnology Engineering",
    "Engineering Design",
    "Engineering Mathematics",
    "Engineering Mechanics",
    "Engineering Management",
    "Engineering Safety and Reliability",
    "Sustainable Engineering",
    "Other Engineering",
  ],
Law: [
    "Administrative Law",
    "Admiralty and Maritime Law",
    "Agricultural Law",
    "Alternative Dispute Resolution",
    "Arbitration and Mediation",
    "Banking and Finance Law",
    "Business Law",
    "Child Protection Law",
    "Civil Law",
    "Civil Procedure",
    "Commercial Law",
    "Comparative Law",
    "Competition and Antitrust Law",
    "Constitutional Law",
    "Construction Law",
    "Consumer Protection Law",
    "Contract Law",
    "Corporate Law",
    "Criminal Law",
    "Criminal Procedure",
    "Criminology and Criminal Justice",
    "Cybersecurity Law",
    "Data Protection and Privacy Law",
    "Digital and Technology Law",
    "Education Law",
    "Employment and Labor Law",
    "Energy Law",
    "Environmental Law",
    "Evidence Law",
    "Family and Marriage Law",
    "Financial Regulation",
    "Health and Medical Law",
    "Human Rights Law",
    "Immigration and Refugee Law",
    "Insurance Law",
    "Intellectual Property Law",
    "International Criminal Law",
    "International Economic Law",
    "International Humanitarian Law",
    "International Law",
    "International Trade Law",
    "Jurisprudence and Legal Theory",
    "Land and Property Law",
    "Legal Ethics and Professional Responsibility",
    "Legal History",
    "Legal Research and Writing",
    "Media and Communications Law",
    "Military Law",
    "Natural Resources Law",
    "Public International Law",
    "Private International Law",
    "Real Estate Law",
    "Securities Law",
    "Sports Law",
    "Tax Law",
    "Tort Law",
    "Trusts and Estates Law",
    "Other Law",
  ],
"Medicine & Health": [
    "Anatomy",
    "Physiology",
    "Biochemistry",
    "Pathology",
    "Pharmacology",
    "Microbiology",
    "Immunology",
    "Genetics and Genomics",
    "Molecular Medicine",
    "Internal Medicine",
    "Family Medicine",
    "General Practice",
    "Emergency Medicine",
    "Critical Care Medicine",
    "Cardiology",
    "Dermatology",
    "Endocrinology",
    "Gastroenterology",
    "Hematology",
    "Infectious Diseases",
    "Nephrology",
    "Neurology",
    "Oncology",
    "Pulmonology",
    "Rheumatology",
    "Geriatric Medicine",
    "Pediatrics",
    "Neonatology",
    "Obstetrics and Gynecology",
    "Maternal and Child Health",
    "Reproductive Health",
    "Sexual Health",
    "General Surgery",
    "Cardiothoracic Surgery",
    "Neurosurgery",
    "Orthopedic Surgery",
    "Plastic and Reconstructive Surgery",
    "Pediatric Surgery",
    "Urology",
    "Anesthesiology",
    "Radiology and Medical Imaging",
    "Nuclear Medicine",
    "Radiation Oncology",
    "Ophthalmology",
    "Otolaryngology",
    "Dentistry and Oral Health",
    "Oral and Maxillofacial Surgery",
    "Psychiatry",
    "Psychology",
    "Clinical Psychology",
    "Mental Health",
    "Nursing",
    "Midwifery",
    "Pharmacy",
    "Clinical Pharmacy",
    "Pharmaceutical Sciences",
    "Public Health",
    "Epidemiology",
    "Biostatistics",
    "Global Health",
    "Community Health",
    "Environmental Health",
    "Occupational Health and Safety",
    "Health Promotion",
    "Health Education",
    "Health Policy",
    "Health Economics",
    "Health Systems Management",
    "Healthcare Administration",
    "Health Informatics",
    "Digital Health",
    "Telemedicine",
    "Medical Laboratory Sciences",
    "Biomedical Sciences",
    "Biomedical Engineering",
    "Medical Biotechnology",
    "Nutrition and Dietetics",
    "Food Science and Nutrition",
    "Physiotherapy",
    "Occupational Therapy",
    "Speech and Language Therapy",
    "Rehabilitation Medicine",
    "Sports Medicine",
    "Exercise Science",
    "Veterinary Medicine",
    "One Health",
    "Tropical Medicine",
    "Parasitology",
    "Toxicology",
    "Forensic Medicine",
    "Medical Ethics",
    "Evidence-Based Medicine",
    "Clinical Research",
    "Clinical Trials",
    "Other Medicine and Health",
  ],
 "Natural Sciences": [
    "Biology",
    "Cell Biology",
    "Molecular Biology",
    "Microbiology",
    "Genetics",
    "Genomics",
    "Biochemistry",
    "Biophysics",
    "Biotechnology",
    "Botany",
    "Zoology",
    "Ecology",
    "Evolutionary Biology",
    "Marine Biology",
    "Conservation Biology",
    "Environmental Biology",
    "Physiology",
    "Immunology",
    "Neuroscience",
    "Bioinformatics",
    "Chemistry",
    "Organic Chemistry",
    "Inorganic Chemistry",
    "Physical Chemistry",
    "Analytical Chemistry",
    "Environmental Chemistry",
    "Industrial Chemistry",
    "Medicinal Chemistry",
    "Computational Chemistry",
    "Polymer Chemistry",
    "Materials Chemistry",
    "Physics",
    "Classical Mechanics",
    "Quantum Mechanics",
    "Thermodynamics",
    "Statistical Physics",
    "Electromagnetism",
    "Optics and Photonics",
    "Nuclear Physics",
    "Particle Physics",
    "Atomic and Molecular Physics",
    "Condensed Matter Physics",
    "Plasma Physics",
    "Theoretical Physics",
    "Computational Physics",
    "Astrophysics",
    "Astronomy",
    "Cosmology",
    "Planetary Science",
    "Earth Science",
    "Geology",
    "Geophysics",
    "Geochemistry",
    "Mineralogy",
    "Petrology",
    "Paleontology",
    "Seismology",
    "Volcanology",
    "Hydrology",
    "Oceanography",
    "Atmospheric Science",
    "Meteorology",
    "Climatology",
    "Climate Science",
    "Environmental Science",
    "Environmental Monitoring",
    "Natural Resource Science",
    "Soil Science",
    "Geography",
    "Physical Geography",
    "Remote Sensing",
    "Geographic Information Systems (GIS)",
    "Mathematics",
    "Applied Mathematics",
    "Pure Mathematics",
    "Algebra",
    "Calculus",
    "Geometry",
    "Topology",
    "Number Theory",
    "Mathematical Analysis",
    "Differential Equations",
    "Numerical Analysis",
    "Probability Theory",
    "Statistics",
    "Mathematical Statistics",
    "Computational Mathematics",
    "Mathematical Modeling",
    "Operations Research",
    "Interdisciplinary Natural Sciences",
    "Other Natural Sciences",
  ],
"Social Sciences": [
    "Sociology",
    "Social Theory",
    "Social Research Methods",
    "Social Statistics",
    "Social Policy",
    "Social Work",
    "Social Welfare",
    "Social Psychology",
    "Cultural Sociology",
    "Economic Sociology",
    "Political Sociology",
    "Urban Sociology",
    "Rural Sociology",
    "Sociology of Education",
    "Sociology of Religion",
    "Sociology of Health and Medicine",
    "Gender Studies",
    "Women's Studies",
    "Masculinity Studies",
    "Family Studies",
    "Childhood Studies",
    "Youth Studies",
    "Aging and Gerontology",
    "Population Studies",
    "Demography",
    "Migration Studies",
    "Refugee Studies",
    "Anthropology",
    "Social Anthropology",
    "Cultural Anthropology",
    "Biological Anthropology",
    "Linguistic Anthropology",
    "Archaeology",
    "Ethnography",
    "Psychology",
    "Developmental Psychology",
    "Cognitive Psychology",
    "Behavioral Psychology",
    "Educational Psychology",
    "Industrial and Organizational Psychology",
    "Community Psychology",
    "Personality Psychology",
    "Experimental Psychology",
    "Cross-Cultural Psychology",
    "Human Geography",
    "Cultural Geography",
    "Economic Geography",
    "Urban Geography",
    "Rural Geography",
    "Population Geography",
    "Development Studies",
    "International Development",
    "Community Development",
    "Sustainable Development",
    "Poverty and Inequality Studies",
    "Globalization Studies",
    "Human Rights Studies",
    "Peace and Conflict Studies",
    "Security Studies",
    "Criminology",
    "Criminal Justice",
    "Penology and Corrections",
    "Victimology",
    "Media Studies",
    "Communication Studies",
    "Mass Communication",
    "Journalism Studies",
    "Digital Media and Society",
    "Information Society Studies",
    "Education Studies",
    "Comparative Education",
    "Higher Education Studies",
    "Education Policy",
    "Public Administration",
    "Governance Studies",
    "Public Policy",
    "Urban Studies",
    "Rural Development",
    "Regional Studies",
    "Area Studies",
    "African Studies",
    "Asian Studies",
    "European Studies",
    "American Studies",
    "Middle Eastern Studies",
    "Indigenous Studies",
    "Cultural Studies",
    "Ethnic and Racial Studies",
    "Religion and Society",
    "Science, Technology and Society",
    "Environmental Social Science",
    "Disaster and Risk Studies",
    "Social Network Analysis",
    "Interdisciplinary Social Sciences",
    "Other Social Sciences",
  ],
"Political Science": [
    "Introduction to Political Science",
    "Political Theory",
    "Political Philosophy",
    "History of Political Thought",
    "Comparative Politics",
    "Comparative Government",
    "Political Institutions",
    "Political Systems",
    "Political Behavior",
    "Political Psychology",
    "Political Sociology",
    "Political Culture",
    "Political Ideologies",
    "Political Parties and Party Systems",
    "Electoral Systems",
    "Elections and Voting Behavior",
    "Public Opinion",
    "Political Communication",
    "Political Campaigns",
    "Political Participation",
    "Democracy and Democratization",
    "Authoritarianism and Dictatorship",
    "Constitutional Politics",
    "Legislative Politics",
    "Executive Politics",
    "Judicial Politics",
    "Federalism and Decentralization",
    "Local Government and Politics",
    "Public Administration",
    "Public Policy",
    "Policy Analysis",
    "Policy Evaluation",
    "Public Sector Governance",
    "Good Governance",
    "Transparency and Accountability",
    "Corruption and Anti-Corruption Studies",
    "Political Economy",
    "International Political Economy",
    "Development Politics",
    "Politics of Development",
    "International Relations",
    "International Politics",
    "Foreign Policy",
    "Foreign Policy Analysis",
    "Diplomacy",
    "International Organizations",
    "Global Governance",
    "International Cooperation",
    "Regional Integration",
    "Geopolitics",
    "Geostrategy",
    "International Security",
    "National Security",
    "Security Studies",
    "Strategic Studies",
    "Defense and Military Policy",
    "Intelligence Studies",
    "Conflict Studies",
    "Peace Studies",
    "Peacebuilding and Conflict Resolution",
    "War and International Conflict",
    "Terrorism and Counterterrorism",
    "Human Rights and Politics",
    "Humanitarian Politics",
    "Migration and Refugee Politics",
    "Environmental Politics",
    "Climate Change Politics",
    "Energy Politics and Policy",
    "Gender and Politics",
    "Identity Politics",
    "Ethnicity and Politics",
    "Religion and Politics",
    "Nationalism",
    "Citizenship Studies",
    "Civil Society and Social Movements",
    "Political Activism",
    "Revolutions and Political Change",
    "Colonialism and Postcolonial Politics",
    "African Politics",
    "Asian Politics",
    "European Politics",
    "American Politics",
    "Middle Eastern Politics",
    "Latin American Politics",
    "Political Research Methods",
    "Quantitative Political Analysis",
    "Qualitative Political Analysis",
    "Political Data Analysis",
    "Political Risk Analysis",
    "Political Forecasting",
    "Digital Politics",
    "Technology and Politics",
    "Artificial Intelligence and Governance",
    "Cyber Politics and Cybersecurity Policy",
    "Other Political Science",
  ],
"Arts & Humanities": [
    "History",
    "World History",
    "African History",
    "Asian History",
    "European History",
    "American History",
    "Ancient History",
    "Medieval History",
    "Modern History",
    "Contemporary History",
    "Economic History",
    "Social History",
    "Cultural History",
    "Political History",
    "Military History",
    "Public History",
    "Art History",
    "History of Science and Technology",
    "Archaeology",
    "Heritage Studies",
    "Museum Studies",
    "Archival Studies",
    "Library and Information Science",
    "Literature",
    "English Literature",
    "African Literature",
    "American Literature",
    "British Literature",
    "World Literature",
    "Comparative Literature",
    "Classical Literature",
    "Contemporary Literature",
    "Literary Theory",
    "Literary Criticism",
    "Creative Writing",
    "Poetry",
    "Drama and Theatre",
    "Fiction and Narrative Studies",
    "Children's Literature",
    "Linguistics",
    "Applied Linguistics",
    "Sociolinguistics",
    "Psycholinguistics",
    "Historical Linguistics",
    "Computational Linguistics",
    "Phonetics and Phonology",
    "Syntax and Semantics",
    "Pragmatics",
    "Discourse Analysis",
    "Language Studies",
    "English Language Studies",
    "African Languages",
    "Foreign Languages",
    "Translation Studies",
    "Interpretation Studies",
    "Classical Studies",
    "Latin and Greek Studies",
    "Religious Studies",
    "Comparative Religion",
    "Theology",
    "Biblical Studies",
    "Islamic Studies",
    "Christian Studies",
    "Buddhist Studies",
    "Hindu Studies",
    "Indigenous Religions",
    "Religion and Society",
    "Visual Arts",
    "Fine Arts",
    "Painting",
    "Drawing",
    "Sculpture",
    "Photography",
    "Printmaking",
    "Digital Arts",
    "Graphic Design",
    "Illustration",
    "Animation",
    "Art and Design",
    "Design History",
    "Fashion Design",
    "Textile Design",
    "Interior Design",
    "Industrial Design",
    "Architecture",
    "Architectural History",
    "Architectural Theory",
    "Landscape Architecture",
    "Urban Design",
    "Music",
    "Music Theory",
    "Music History",
    "Musicology",
    "Ethnomusicology",
    "Music Composition",
    "Music Performance",
    "Music Education",
    "Performing Arts",
    "Theatre Studies",
    "Dance Studies",
    "Performance Studies",
    "Film Studies",
    "Cinema Studies",
    "Television Studies",
    "Media Arts",
    "Cultural Studies",
    "Popular Culture Studies",
    "Folklore Studies",
    "Mythology",
    "Gender and Cultural Studies",
    "Digital Humanities",
    "Humanities Research Methods",
    "Interdisciplinary Humanities",
    "Other Arts and Humanities",
  ],
Agriculture: [
    "Agriculture",
    "Agricultural Sciences",
    "Agronomy",
    "Crop Science",
    "Crop Production",
    "Crop Protection",
    "Plant Science",
    "Plant Breeding",
    "Plant Genetics",
    "Plant Biotechnology",
    "Plant Pathology",
    "Plant Physiology",
    "Seed Science and Technology",
    "Horticulture",
    "Pomology",
    "Olericulture",
    "Floriculture",
    "Soil Science",
    "Soil Fertility and Plant Nutrition",
    "Soil and Water Conservation",
    "Irrigation and Drainage",
    "Agricultural Water Management",
    "Agricultural Engineering",
    "Farm Machinery and Mechanization",
    "Precision Agriculture",
    "Smart Farming",
    "Digital Agriculture",
    "Agricultural Robotics",
    "Remote Sensing in Agriculture",
    "Geographic Information Systems in Agriculture",
    "Animal Science",
    "Animal Production",
    "Animal Nutrition",
    "Animal Breeding and Genetics",
    "Livestock Management",
    "Dairy Science",
    "Poultry Science",
    "Aquaculture",
    "Fisheries Science",
    "Fisheries Management",
    "Veterinary Science",
    "Animal Health and Welfare",
    "Agricultural Economics",
    "Agribusiness",
    "Agricultural Finance",
    "Agricultural Marketing",
    "Agricultural Trade",
    "Agricultural Policy",
    "Agricultural Development",
    "Agricultural Extension",
    "Rural Development",
    "Rural Sociology",
    "Farm Management",
    "Agricultural Entrepreneurship",
    "Agricultural Cooperatives",
    "Agricultural Supply Chain Management",
    "Food Science",
    "Food Technology",
    "Food Processing",
    "Food Preservation",
    "Food Safety",
    "Food Quality Assurance",
    "Food Security",
    "Nutrition and Food Systems",
    "Postharvest Technology",
    "Forestry",
    "Forest Management",
    "Forest Ecology",
    "Agroforestry",
    "Forest Conservation",
    "Natural Resource Management",
    "Land Use and Land Management",
    "Sustainable Agriculture",
    "Organic Agriculture",
    "Conservation Agriculture",
    "Climate-Smart Agriculture",
    "Agroecology",
    "Environmental Agriculture",
    "Agricultural Meteorology",
    "Climate Change and Agriculture",
    "Pest Management",
    "Integrated Pest Management",
    "Weed Science",
    "Entomology",
    "Nematology",
    "Agricultural Research Methods",
    "Agricultural Statistics",
    "Other Agriculture",
  ],
Philosophy: [
    "Philosophy",
    "Introduction to Philosophy",
    "History of Philosophy",
    "Ancient Philosophy",
    "Medieval Philosophy",
    "Modern Philosophy",
    "Contemporary Philosophy",
    "African Philosophy",
    "Asian Philosophy",
    "Western Philosophy",
    "Eastern Philosophy",
    "Islamic Philosophy",
    "Indian Philosophy",
    "Chinese Philosophy",
    "Greek Philosophy",
    "Metaphysics",
    "Ontology",
    "Epistemology",
    "Theory of Knowledge",
    "Logic",
    "Formal Logic",
    "Informal Logic",
    "Philosophical Logic",
    "Critical Thinking",
    "Ethics",
    "Normative Ethics",
    "Applied Ethics",
    "Metaethics",
    "Moral Philosophy",
    "Business Ethics",
    "Bioethics",
    "Medical Ethics",
    "Environmental Ethics",
    "Technology Ethics",
    "Artificial Intelligence Ethics",
    "Political Philosophy",
    "Social Philosophy",
    "Philosophy of Law",
    "Philosophy of Justice",
    "Philosophy of Human Rights",
    "Philosophy of Education",
    "Philosophy of Science",
    "Philosophy of Mathematics",
    "Philosophy of Physics",
    "Philosophy of Biology",
    "Philosophy of Technology",
    "Philosophy of Artificial Intelligence",
    "Philosophy of Mind",
    "Philosophy of Consciousness",
    "Philosophy of Psychology",
    "Philosophy of Language",
    "Philosophy of Religion",
    "Philosophy of History",
    "Philosophy of Culture",
    "Philosophy of Economics",
    "Philosophy of Social Science",
    "Aesthetics",
    "Philosophy of Art",
    "Philosophy of Literature",
    "Existentialism",
    "Phenomenology",
    "Hermeneutics",
    "Pragmatism",
    "Rationalism",
    "Empiricism",
    "Idealism",
    "Realism",
    "Materialism",
    "Naturalism",
    "Skepticism",
    "Stoicism",
    "Utilitarianism",
    "Deontology",
    "Virtue Ethics",
    "Analytic Philosophy",
    "Continental Philosophy",
    "Postmodern Philosophy",
    "Poststructuralism",
    "Critical Theory",
    "Feminist Philosophy",
    "Gender Philosophy",
    "Philosophy of Race",
    "Postcolonial Philosophy",
    "Comparative Philosophy",
    "Intercultural Philosophy",
    "Philosophical Anthropology",
    "Philosophy of Human Nature",
    "Philosophy of Free Will",
    "Philosophy of Action",
    "Philosophy of Time",
    "Philosophy of Space",
    "Philosophy of Causation",
    "Philosophy of Identity",
    "Philosophy of Personal Identity",
    "Philosophy of Death",
    "Philosophy of Happiness",
    "Philosophy of Life",
    "Philosophical Research Methods",
    "Other Philosophy",
  ],
};

function BookDescription({ description, expanded, onToggle }) {
  const containerRef = useRef(null);
  const [visibleText, setVisibleText] = useState(description);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const text = String(description || "");
      /*const width = container.clientWidth;*/
      // Measure the actual available width beside the floated book cover.
const cover = container.closest("article")?.querySelector("button.float-left");

const width = cover
  ? Math.max(
      0,
      container.clientWidth -
        cover.getBoundingClientRect().width -
        parseFloat(window.getComputedStyle(cover).marginRight || "0")
    )
  : container.clientWidth;

      if (!width) return;

      const probe = document.createElement("span");
      const styles = window.getComputedStyle(container);

      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        width: `${width}px`,
        font: styles.font,
        lineHeight: styles.lineHeight,
        letterSpacing: styles.letterSpacing,
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        boxSizing: "border-box",
      });

      document.body.appendChild(probe);

      const lineHeight = parseFloat(styles.lineHeight);
      const maxHeight = lineHeight * 2 + 1;

      const fits = (value) => {
        probe.textContent = value;
        return probe.getBoundingClientRect().height <= maxHeight;
      };

      if (fits(text)) {
        setVisibleText(text);
        setHasOverflow(false);
      } else {
        let low = 0;
        let high = text.length;
        let best = 0;

        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          const candidate =
            text.slice(0, middle).trimEnd() + "... Read more";

          if (fits(candidate)) {
            best = middle;
            low = middle + 1;
          } else {
            high = middle - 1;
          }
        }

        setVisibleText(text.slice(0, best).trimEnd());
        setHasOverflow(true);
      }

      probe.remove();
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    return () => observer.disconnect();
  }, [description]);

  return (
    <div
      ref={containerRef}
      className="mt-3 min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600"
    >
     {expanded ? (
  <>
    {description}
    {" "}
    <button
      type="button"
      onClick={onToggle}
      className="inline text-sm font-semibold text-blue-700 hover:underline"
    >
      Read less
    </button>
  </>
) : (
        <>
          {visibleText}
          {hasOverflow && (
            <>
              {"..."}
              <button
                type="button"
                onClick={onToggle}
                className="inline font-semibold text-blue-700 hover:underline"
              >
                {" Read more"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function AcademicBookSharingPlatform() {
  const [activeSection, setActiveSection] = useState("Browse All Books");
  const [search, setSearch] = useState("");
  // Track which academic book descriptions are expanded.
const [expandedBookDescriptions, setExpandedBookDescriptions] = useState({});
  // Academic discipline and subcategory filtering
  const [selectedBookDiscipline, setSelectedBookDiscipline] = useState("All");
  const [selectedBookSubcategory, setSelectedBookSubcategory] = useState("All");
  // SuperTokens authentication state
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [authLoading, setAuthLoading] = useState(true);
// Current user's profile for the book-sharing editor
const [currentUser, setCurrentUser] = useState(null);
// Controls whether the book-sharing editor is expanded
const [showBookEditor, setShowBookEditor] = useState(false);
// Academic book title
const [bookTitle, setBookTitle] = useState("");
// Academic book author
const [bookAuthor, setBookAuthor] = useState("");
// Academic book description
const [bookDescription, setBookDescription] = useState("");
// Selected academic discipline for the shared book
const [bookDiscipline, setBookDiscipline] = useState("");
// Selected academic subcategory for the shared book
const [bookSubcategory, setBookSubcategory] = useState("");
// Selected academic book PDF file
const [bookFile, setBookFile] = useState(null);
// Error message for invalid academic book PDF files
const [bookFileError, setBookFileError] = useState("");
// Error message for academic book submission
const [bookSubmissionError, setBookSubmissionError] = useState("");
// Success message for academic book validation
const [bookSubmissionSuccess, setBookSubmissionSuccess] = useState("");
// Tracks the book upload and publishing process
const [bookSubmitting, setBookSubmitting] = useState(false);

// Displays the current upload or publishing stage
const [bookSubmissionStatus, setBookSubmissionStatus] = useState("");
// Confirms permission to share the academic book
const [hasBookSharingPermission, setHasBookSharingPermission] = useState(false);
// Reference to the PDF file input
const bookFileInputRef = useRef(null);
// Reference to the academic book rich-text editor
const bookDescriptionEditorRef = useRef(null);
const validateAcademicBook = () => {
  setBookSubmissionError("");
  setBookSubmissionSuccess("");
  if (!bookTitle.trim()) {
    setBookSubmissionError("Please enter the academic book title.");
    return false;
  }
  if (!bookAuthor.trim()) {
  setBookSubmissionError("Please enter the academic book author's name.");
  return false;
}

  const descriptionText =
    bookDescriptionEditorRef.current?.textContent?.trim() || "";

  if (!descriptionText) {
    setBookSubmissionError("Please enter the book description.");
    return false;
  }

  if (!bookDiscipline) {
    setBookSubmissionError("Please select an academic discipline.");
    return false;
  }

  if (!bookSubcategory) {
    setBookSubmissionError("Please select an academic subcategory.");
    return false;
  }

  if (!bookFile) {
    setBookSubmissionError(
  "Please attach an academic book PDF or PowerPoint presentation."
);
    return false;
  }

  if (!hasBookSharingPermission) {
    setBookSubmissionError(
      "Please confirm that you have permission to share this book."
    );
    return false;
  }

  return true;
};

// Open an academic book in the ScholarsKnowledge PDF reader.
// Open PDFs in the existing reader.
// Download PowerPoint presentations through the authenticated API.
const handleReadBook = async (book) => {
  const bookId = String(book.bookId || book.pk || "")
    .replace(/^BOOK#/, "");

  if (!bookId) {
    window.alert("Academic book ID is missing.");
    return;
  }

  const isPowerPoint = [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ].includes(book.contentType);

  // Preserve the existing PDF reader behavior.
  /*if (!isPowerPoint) {
    const readerPath =
      `/platform/books/read/${encodeURIComponent(bookId)}`;

    const readerTab = window.open(
      readerPath,
      "_blank",
      "noopener,noreferrer"
    );

    if (!readerTab) {
      console.warn(
        "The browser may have blocked the academic book reader tab."
      );
    }

    return;
  }*/
 // Open PDF books in the same browser tab.
if (!isPowerPoint) {
  const readerPath =
    `/platform/books/read/${encodeURIComponent(bookId)}`;

  window.location.assign(readerPath);
  return;
}

  // Open a blank tab immediately to avoid popup blockers
  // while the authenticated download URL is being requested.
  const downloadTab = window.open(
    "about:blank",
    "_blank"
  );

  if (!downloadTab) {
    window.alert(
      "Please allow pop-ups to download this PowerPoint presentation."
    );
    return;
  }

  try {
    const accessToken = await Session.getAccessToken();

    if (!accessToken) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const { readUrl } = await requestAcademicBookReadUrl({
      bookId,
      accessToken,
    });

    // S3 serves PowerPoint files as attachments.
    downloadTab.location.replace(readUrl);
  } catch (error) {
    downloadTab.close();

    console.error("PowerPoint download failed:", error);

    window.alert(
      error.message || "Unable to download this presentation."
    );
  }
};
const handleShareAcademicBook = async () => {
  if (bookSubmitting) return;

  if (!validateAcademicBook()) return;

  setBookSubmitting(true);
  setBookSubmissionError("");
  setBookSubmissionSuccess("");

  try {
    // 1. Obtain the current SuperTokens access token.
    const accessToken = await Session.getAccessToken();

    if (!accessToken) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    // 2. Identify the selected academic file format.
const isPdfFile = bookFile.name.toLowerCase().endsWith(".pdf");

// 3. Request a temporary S3 upload URL.
setBookSubmissionStatus("Preparing academic file upload...");

const { uploadUrl, bookId, objectKey } =
  await requestAcademicBookUploadUrl({
    fileName: bookFile.name,
    fileSize: bookFile.size,
    accessToken,
  });

// 4. Upload the selected PDF or PowerPoint directly to S3.
setBookSubmissionStatus("Uploading academic file...");

await uploadAcademicBookPdf({
  uploadUrl,
  file: bookFile,
});

// 5. Generate and upload a cover only for PDF files.
// PowerPoint presentations will use a default cover in the feed.
let coverKey;

if (isPdfFile) {
  setBookSubmissionStatus("Generating book cover...");

  const coverBlob = await generateAcademicBookCover(bookFile);

  setBookSubmissionStatus("Preparing cover upload...");

  const coverUpload = await requestAcademicBookCoverUploadUrl({
    bookId,
    fileSize: coverBlob.size,
    accessToken,
  });

  coverKey = coverUpload.coverKey;

  setBookSubmissionStatus("Uploading book cover...");

  await uploadAcademicBookCover({
    uploadUrl: coverUpload.uploadUrl,
    coverBlob,
  });
}

    // 4. Publish the book metadata to DynamoDB.
    setBookSubmissionStatus("Publishing academic book...");

await publishAcademicBook({
  bookId,
  objectKey,
  coverKey,
  title: bookTitle.trim(),
      author: bookAuthor.trim(),
      subject: bookDiscipline,
      subcategory: bookSubcategory,
      description:
        bookDescriptionEditorRef.current?.textContent?.trim() || "",
      accessToken,
    });

    // 5. Show confirmation.
    setBookSubmissionSuccess(
      "Your academic book has been published successfully."
    );

    // 6. Refresh the academic books feed.
try {
  const requestedFilterKey = publicBooksFilterKey;

  const result = await fetchAcademicBooks({
    limit: 20,
    subject: selectedBookDiscipline,
    subcategory: selectedBookSubcategory,
  });

  // Do not overwrite the feed if the user changed filters.
  if (publicBooksFilterKeyRef.current === requestedFilterKey) {
    setBooks(result.books);
    setBooksCursor(result.cursor);
    setBooksError("");
  }
} catch (refreshError) {
      console.error(
        "Book published, but feed refresh failed:",
        refreshError
      );
    }

  } catch (error) {
    console.error("Academic book submission failed:", error);

    setBookSubmissionError(
      error.message || "Unable to share the academic book."
    );
  } finally {
    setBookSubmitting(false);
    setBookSubmissionStatus("");
  }
};

useEffect(() => {
  let cancelled = false;

  async function checkAuthentication() {
    try {
      const hasSession = await Session.doesSessionExist();

      if (!cancelled) {
        setIsAuthenticated(hasSession);
      }
    } catch (error) {
      console.error("Academic Books session check failed:", error);

      if (!cancelled) {
        setIsAuthenticated(false);
      }
    } finally {
      if (!cancelled) {
        setAuthLoading(false);
      }
    }
  }

  checkAuthentication();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  if (authLoading) return;

  if (!isAuthenticated) {
    setCurrentUser(null);
    return;
  }

  try {
    const raw =
      sessionStorage.getItem("currentUser") ||
      localStorage.getItem("currentUser");

    const user = raw ? JSON.parse(raw) : null;

    setCurrentUser(
      user && typeof user === "object" && !Array.isArray(user)
        ? user
        : null
    );
  } catch (error) {
    console.error("Failed to load Academic Books user profile:", error);
    setCurrentUser(null);
  }
}, [authLoading, isAuthenticated]);

  // Academic Books API state
const [books, setBooks] = useState([]);
const [booksLoading, setBooksLoading] = useState(false);
const [booksError, setBooksError] = useState("");
const [booksCursor, setBooksCursor] = useState(null);
// Identifies the currently selected public book-feed filters.
const publicBooksFilterKey =
  JSON.stringify([selectedBookDiscipline, selectedBookSubcategory]);

// Allows asynchronous pagination requests to detect filter changes.
const publicBooksFilterKeyRef = useRef(publicBooksFilterKey);
publicBooksFilterKeyRef.current = publicBooksFilterKey;
// My Shared Books — separate authenticated feed state
const [mySharedBooks, setMySharedBooks] = useState([]);
const [mySharedBooksLoading, setMySharedBooksLoading] = useState(false);
const [mySharedBooksError, setMySharedBooksError] = useState("");
const [mySharedBooksCursor, setMySharedBooksCursor] = useState(null);
// Saved Books — separate authenticated feed state
const [savedBooks, setSavedBooks] = useState([]);
const [savedBooksLoading, setSavedBooksLoading] = useState(false);
const [savedBooksError, setSavedBooksError] = useState("");
const [savedBooksCursor, setSavedBooksCursor] = useState(null);
// Track saved book IDs and ongoing Save/Unsave requests.
const [savedBookIds, setSavedBookIds] = useState([]);
const [savingBookIds, setSavingBookIds] = useState([]);
// Load saved book IDs when the authenticated user opens the platform.
useEffect(() => {
  if (authLoading) return;

  if (!isAuthenticated) {
    setSavedBookIds([]);
    return;
  }

  let cancelled = false;

  async function initializeSavedBookIds() {
  try {
    const accessToken = await Session.getAccessToken();

    if (!accessToken) return;

    const allSavedIds = new Set();
    let cursor = null;

    do {
      const result = await fetchSavedAcademicBooks({
        limit: 20,
        cursor,
        accessToken,
      });

      if (cancelled) return;

      for (const book of result.books) {
        const bookId = String(book.bookId || book.pk || "")
          .replace(/^BOOK#/, "");

        if (bookId) {
          allSavedIds.add(bookId);
        }
      }

      cursor = result.cursor;
    } while (cursor && !cancelled);

    if (cancelled) return;

    setSavedBookIds([...allSavedIds]);
  } catch (error) {
    console.error("Failed to initialize saved book IDs:", error);
  }
}
  initializeSavedBookIds();

  return () => {
    cancelled = true;
  };
}, [authLoading, isAuthenticated]);
// Separate loading state for fetching additional book pages.
const [booksLoadingMore, setBooksLoadingMore] = useState(false);
const [mySharedBooksLoadingMore, setMySharedBooksLoadingMore] = useState(false);
const [savedBooksLoadingMore, setSavedBooksLoadingMore] = useState(false);

useEffect(() => {
  let cancelled = false;

  async function loadBooks() {
  setBooksLoading(true);
  setBooksError("");

  // Clear results and pagination from the previous filter.
  setBooks([]);
  setBooksCursor(null);

  try {
    const result = await fetchAcademicBooks({
      limit: 20,
      subject: selectedBookDiscipline,
      subcategory: selectedBookSubcategory,
    });

      if (cancelled) return;

      setBooks(result.books);
      setBooksCursor(result.cursor);
    } catch (error) {
      if (cancelled) return;

      console.error("Failed to load academic books:", error);
      setBooksError(error.message || "Unable to load academic books.");
    } finally {
      if (!cancelled) {
        setBooksLoading(false);
      }
    }
  }

  loadBooks();

  return () => {
    cancelled = true;
  };
}, [selectedBookDiscipline, selectedBookSubcategory]);

// Load books shared by the authenticated user.
useEffect(() => {
  if (activeSection !== "My Shared Books") return;

  let cancelled = false;

  async function loadMySharedBooks() {
    if (authLoading) return;

    if (!isAuthenticated) {
      setMySharedBooks([]);
      setMySharedBooksCursor(null);
      setMySharedBooksError(
        "Please log in to view your shared books."
      );
      return;
    }

    setMySharedBooksLoading(true);
    setMySharedBooksError("");

    try {
      const accessToken = await Session.getAccessToken();

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const result = await fetchMySharedAcademicBooks({
        limit: 20,
        accessToken,
      });

      if (cancelled) return;

      setMySharedBooks(result.books);
      setMySharedBooksCursor(result.cursor);
    } catch (error) {
      if (cancelled) return;

      console.error("Failed to load My Shared Books:", error);
      setMySharedBooksError(
        error.message || "Unable to load your shared books."
      );
    } finally {
      if (!cancelled) {
        setMySharedBooksLoading(false);
      }
    }
  }

  loadMySharedBooks();

  return () => {
    cancelled = true;
  };
}, [activeSection, authLoading, isAuthenticated]);

// Load books saved by the authenticated user.
useEffect(() => {
  if (activeSection !== "Saved Books") return;

  let cancelled = false;

  async function loadSavedBooks() {
    if (authLoading) return;

    if (!isAuthenticated) {
      setSavedBooks([]);
      setSavedBooksCursor(null);
      setSavedBooksError("Please log in to view your saved books.");
      return;
    }

    setSavedBooksLoading(true);
    setSavedBooksError("");

    try {
      const accessToken = await Session.getAccessToken();

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const result = await fetchSavedAcademicBooks({
        limit: 20,
        accessToken,
      });

      if (cancelled) return;

      setSavedBooks(result.books);
      setSavedBooksCursor(result.cursor);
      // Record the IDs of books returned by the Saved Books API.
setSavedBookIds((previousIds) => [
  ...new Set([
    ...previousIds,
    ...result.books
      .map((book) =>
        String(book.bookId || book.pk || "").replace(/^BOOK#/, "")
      )
      .filter(Boolean),
  ]),
]);
    } catch (error) {
      if (cancelled) return;

      console.error("Failed to load Saved Books:", error);
      setSavedBooksError(
        error.message || "Unable to load your saved books."
      );
    } finally {
      if (!cancelled) {
        setSavedBooksLoading(false);
      }
    }
  }

  loadSavedBooks();

  return () => {
    cancelled = true;
  };
}, [activeSection, authLoading, isAuthenticated]);



// Select the correct book feed without modifying the datasets.
const isMySharedBooks = activeSection === "My Shared Books";
const isSavedBooks = activeSection === "Saved Books";

const displayedBooks = isSavedBooks
  ? savedBooks
  : isMySharedBooks
    ? mySharedBooks
    : books;
// Search academic books already loaded in the current feed.
const searchTerm = search.trim().toLowerCase();

const filteredDisplayedBooks = searchTerm
  ? displayedBooks.filter((book) => {
      const searchableText = [
        book.title,
        book.author,
        book.subject,
        book.category,
        book.subcategory,
        book.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchTerm);
    })
  : displayedBooks;

const displayedBooksLoading = isSavedBooks
  ? savedBooksLoading
  : isMySharedBooks
    ? mySharedBooksLoading
    : booksLoading;

const displayedBooksError = isSavedBooks
  ? savedBooksError
  : isMySharedBooks
    ? mySharedBooksError
    : booksError;
  // Load the next page of books shared by the logged-in user.
const handleLoadMoreMySharedBooks = async () => {
  if (
    !mySharedBooksCursor ||
    mySharedBooksLoadingMore ||
    mySharedBooksLoading
  ) {
    return;
  }

  setMySharedBooksLoadingMore(true);
  setMySharedBooksError("");

  try {
    const accessToken = await Session.getAccessToken();

    if (!accessToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const result = await fetchMySharedAcademicBooks({
      limit: 20,
      cursor: mySharedBooksCursor,
      accessToken,
    });

    setMySharedBooks((previousBooks) => [
      ...previousBooks,
      ...result.books,
    ]);

    setMySharedBooksCursor(result.cursor);
  } catch (error) {
    console.error("Failed to load more shared books:", error);
    setMySharedBooksError(
      error.message || "Unable to load more shared books."
    );
  } finally {
    setMySharedBooksLoadingMore(false);
  }
};

// Load the next page of books saved by the logged-in user.
const handleLoadMoreSavedBooks = async () => {
  if (
    !savedBooksCursor ||
    savedBooksLoadingMore ||
    savedBooksLoading
  ) {
    return;
  }

  setSavedBooksLoadingMore(true);
  setSavedBooksError("");

  try {
    const accessToken = await Session.getAccessToken();

    if (!accessToken) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const result = await fetchSavedAcademicBooks({
      limit: 20,
      cursor: savedBooksCursor,
      accessToken,
    });

    setSavedBooks((previousBooks) => [
      ...previousBooks,
      ...result.books,
    ]);

    setSavedBooksCursor(result.cursor);
    // Track saved IDs from additional pages.
setSavedBookIds((previousIds) => [
  ...new Set([
    ...previousIds,
    ...result.books
      .map((book) =>
        String(book.bookId || book.pk || "").replace(/^BOOK#/, "")
      )
      .filter(Boolean),
  ]),
]);
  } catch (error) {
    console.error("Failed to load more saved books:", error);

    setSavedBooksError(
      error.message || "Unable to load more saved books."
    );
  } finally {
    setSavedBooksLoadingMore(false);
  }
};
// Save or unsave an academic book.
const handleToggleSaveBook = async (book) => {
  const bookId = String(book.bookId || book.pk || "").replace(/^BOOK#/, "");

  if (!bookId || savingBookIds.includes(bookId)) return;

  if (!isAuthenticated) {
    window.alert("Please log in to save academic books.");
    return;
  }

  const alreadySaved = savedBookIds.includes(bookId);

  setSavingBookIds((previous) => [...previous, bookId]);

  try {
    const accessToken = await Session.getAccessToken();

    if (!accessToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (alreadySaved) {
      await unsaveAcademicBook({ bookId, accessToken });

      setSavedBookIds((previous) =>
        previous.filter((id) => id !== bookId)
      );

      setSavedBooks((previous) =>
        previous.filter(
          (item) =>
            String(item.bookId || item.pk || "").replace(/^BOOK#/, "") !==
            bookId
        )
      );
    } else {
      await saveAcademicBook({ bookId, accessToken });

      setSavedBookIds((previous) =>
        previous.includes(bookId) ? previous : [...previous, bookId]
      );
    }
  } catch (error) {
    console.error("Failed to update saved book:", error);
    window.alert(error.message || "Unable to update saved book.");
  } finally {
    setSavingBookIds((previous) =>
      previous.filter((id) => id !== bookId)
    );
  }
};

// Load the next page of publicly shared academic books.
const handleLoadMoreBooks = async () => {
  if (!booksCursor || booksLoadingMore || booksLoading) {
    return;
  }

  const requestedFilterKey = publicBooksFilterKey;
  setBooksLoadingMore(true);


  try {
    const result = await fetchAcademicBooks({
  limit: 20,
  cursor: booksCursor,
  subject: selectedBookDiscipline,
  subcategory: selectedBookSubcategory,
});
// Ignore pagination results from a previous filter selection.
if (publicBooksFilterKeyRef.current !== requestedFilterKey) {
  return;
}

    setBooks((previousBooks) => [
      ...previousBooks,
      ...result.books,
    ]);

    setBooksCursor(result.cursor);
 } catch (error) {
    // Ignore errors from requests belonging to previous filters.
    if (publicBooksFilterKeyRef.current === requestedFilterKey) {
      console.error("Failed to load more academic books:", error);
      window.alert(
        error.message || "Unable to load more academic books."
      );
    }
  } finally {
    setBooksLoadingMore(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Full-width teal stripe below the advertising space */}
      <div
        className="h-[28px] w-full bg-[#B45353]"
        aria-label="ScholarsKnowledge announcements"
      />

      {/* Academic Book Sharing Platform content */}
      {/*<div className="px-3 py-5 sm:px-5">*/}
      <div className="px-3 pt-2 pb-5 sm:px-5">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">

        {/* LEFT SIDEBAR */}
        <aside className="h-fit overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#142C4E] to-[#244A72] p-5 text-white">
            {/*<div className="text-xl font-bold tracking-tight">
              Academic Library
            </div>
            <p className="mt-1 text-xs text-slate-200">
              ScholarsKnowledge Book Sharing
            </p>*/}
            <div className="flex items-center gap-2">
  <div className="whitespace-nowrap text-xl font-bold tracking-tight">
    Academic Library
  </div>

  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="30"
    height="30"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F5B94E"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    aria-hidden="true"
  >
    <path d="M12 7.5C9.5 5.8 6.5 5.3 3 6v12c3.5-.7 6.5-.2 9 1.5" />
    <path d="M12 7.5c2.5-1.7 5.5-2.2 9-1.5v12c-3.5-.7-6.5-.2-9 1.5" />
    <path d="M12 7.5v12" />
    <path d="M5.5 9c1.8-.2 3.4.1 4.7.9" />
    <path d="M18.5 9c-1.8-.2-3.4.1-4.7.9" />
  </svg>
</div>

<p className="mt-1 text-xs text-slate-200">
  ScholarsKnowledge Book Sharing
</p>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search academic books..."
              className="mt-4 w-full rounded-xl border border-white/20 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div className="p-4">
            <h3 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              My Academic books Library
            </h3>

            {["Browse All Books", "Saved Books", "My Shared Books"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveSection(item)}
                className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  activeSection === item
                    ? "bg-blue-50 font-semibold text-blue-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ))}

            <div className="my-4 border-t border-slate-100" />

            <h3 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Academic Disciplines
            </h3>

            <div className="space-y-3">
  {/* Academic discipline selector */}
  <select
    value={selectedBookDiscipline}
    onChange={(e) => {
      setActiveSection("Browse All Books");
      setSelectedBookDiscipline(e.target.value);
      setSelectedBookSubcategory("All");
    }}
    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
  >
    <option value="All">All Books</option>

    {SUBJECTS.map((subject) => (
      <option key={subject} value={subject}>
        {subject}
      </option>
    ))}
  </select>

  {/* Subcategory selector */}
  <div>
    <h4 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
      Academic Subcategories
    </h4>

    <select
      value={selectedBookSubcategory}
      onChange={(e) => {
        setActiveSection("Browse All Books");
        setSelectedBookSubcategory(e.target.value);
      }}
      disabled={selectedBookDiscipline === "All"}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
    >
      <option value="All">All</option>

      {(BOOK_SUBCATEGORIES[selectedBookDiscipline] || []).map(
        (subcategory) => (
          <option key={subcategory} value={subcategory}>
            {subcategory}
          </option>
        )
      )}
    </select>
  </div>
</div>
</div>


        </aside>

        {/* CENTER CONTENT */}
        <main className="min-w-0">

          {/* Academic book-sharing composer */}
{!authLoading && isAuthenticated && (
 <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-sm font-semibold text-sky-800">
        {currentUser?.avatarUrl ||
        currentUser?.photoURL ||
        currentUser?.profilePicture ? (
          <img
            src={
              currentUser.avatarUrl ||
              currentUser.photoURL ||
              currentUser.profilePicture
            }
            alt="Your profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <span>
            {String(
              currentUser?.name ||
              currentUser?.displayName ||
              currentUser?.email ||
              "U"
            )
              .charAt(0)
              .toUpperCase()}
          </span>
        )}
      </div>

      {showBookEditor ? (
  <input
    id="academic-book-title"
    type="text"
    value={bookTitle}
    onChange={(e) => setBookTitle(e.target.value)}
    placeholder="Enter the title of the academic book/resource to save and share"
    maxLength={250}
    aria-label="Book Title"
    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
  />
) : (
  <button
    type="button"
    onClick={() => setShowBookEditor(true)}
    className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-500 transition hover:bg-slate-100"
  >
    Save and Share an academic books and resources in PDF...
  </button>
)}
</div>

{showBookEditor && (
  <div className="mt-4">
    {/* Academic book author */}
    <div className="mb-4 space-y-2">
      <label
        htmlFor="academic-book-author"
        className="block text-sm font-medium text-slate-700"
      >
        Book/Resource Author
      </label>

      <input
        id="academic-book-author"
        type="text"
        value={bookAuthor}
        onChange={(e) => setBookAuthor(e.target.value)}
        placeholder="Enter the name of the book/resource author/instructor"
        maxLength={250}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>

    {/* Academic book description */}
    <div className="space-y-2">
  <label
    htmlFor="academic-book-description"
    className="block text-sm font-medium text-slate-700"
  >
    Academic Book/resources Description
  </label>
  {/* Description formatting toolbar */}
<div
  className="flex flex-wrap items-center gap-1 rounded-t-lg border border-slate-300 bg-slate-50 p-2"
  role="toolbar"
  aria-label="Book description formatting"
>
  <button
  type="button"
  title="Bold"
  aria-label="Bold"
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => {
    const editor = bookDescriptionEditorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand("bold", false, null);
    setBookDescription(editor.innerHTML);
  }}
  className="rounded px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
>
  B
</button>
  <button
  type="button"
  title="Italic"
  aria-label="Italic"
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => {
    const editor = bookDescriptionEditorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand("italic", false, null);
    setBookDescription(editor.innerHTML);
  }}
  className="rounded px-3 py-1.5 text-sm italic text-slate-700 hover:bg-slate-200"
>
  I
</button>

  <button
  type="button"
  title="Underline"
  aria-label="Underline"
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => {
    const editor = bookDescriptionEditorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand("underline", false, null);
    setBookDescription(editor.innerHTML);
  }}
  className="rounded px-3 py-1.5 text-sm underline text-slate-700 hover:bg-slate-200"
>
  U
</button>

  <span className="mx-1 h-5 border-l border-slate-300" />

  <button
  type="button"
  title="Bulleted List"
  aria-label="Bulleted List"
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => {
    const editor = bookDescriptionEditorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand("insertUnorderedList", false, null);
    setBookDescription(editor.innerHTML);
  }}
  className="rounded px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
>
  • List
</button>

 <button
  type="button"
  title="Numbered List"
  aria-label="Numbered List"
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => {
    const editor = bookDescriptionEditorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand("insertOrderedList", false, null);
    setBookDescription(editor.innerHTML);
  }}
  className="rounded px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
>
  1. List
</button>

  <span className="mx-1 h-5 border-l border-slate-300" />

  <button
  type="button"
  title="Insert Link"
  aria-label="Insert Link"
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => {
    const editor = bookDescriptionEditorRef.current;
    if (!editor) return;

    const urlInput = window.prompt(
      "Enter the website URL (https://...):"
    );

    if (urlInput === null) return;

    let url;

    try {
      url = new URL(urlInput.trim());

      if (
        url.protocol !== "https:" &&
        url.protocol !== "http:"
      ) {
        throw new Error("Unsupported protocol");
      }
    } catch {
      window.alert("Enter a valid http:// or https:// URL.");
      return;
    }

    // Create a clickable hyperlink without selecting text.
    const link = document.createElement("a");
    link.href = url.href;
    link.textContent = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "text-blue-600 underline";

    // Insert the link on a new line.
    const paragraph = document.createElement("div");
    paragraph.appendChild(link);

    editor.appendChild(paragraph);

    // Update the description state.
    setBookDescription(editor.innerHTML);

    // Return focus to the editor.
    editor.focus();

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }}
  className="rounded px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
>
  Link
</button>

</div> {/* End of description formatting toolbar */}

<div
  ref={bookDescriptionEditorRef}
  id="academic-book-description"
  contentEditable
  suppressContentEditableWarning
  role="textbox"
  aria-label="Book Description"
  aria-multiline="true"
  data-placeholder="Describe the academic book/resource, its subject, contents, and intended audience..."
  onInput={(e) => {
    setBookDescription(e.currentTarget.innerHTML);
  }}
  onClick={(e) => {
  const target = e.target;

  if (!(target instanceof Element)) return;

  const link = target.closest("a[href]");

  if (!link || !e.currentTarget.contains(link)) return;

  e.preventDefault();

  try {
    const url = new URL(link.href);

    if (
      url.protocol === "https:" ||
      url.protocol === "http:"
    ) {
      window.open(
        url.href,
        "_blank",
        "noopener,noreferrer"
      );
    }
  } catch (error) {
    console.error("Invalid academic book link:", error);
  }
}}
  className="min-h-[180px] w-full rounded-b-lg border border-t-0 border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:cursor-pointer [&_a]:text-blue-600 [&_a]:underline"
/>

  <p className="text-xs text-slate-500">
    Provide a clear description to help other students and lecturers
    understand the book.
  </p>
</div>

{/* Academic Discipline and Subcategory horizontal layout */}
<div className="mt-4 grid grid-cols-2 gap-3">
{/* Academic Discipline selection */}
<div className="min-w-0 space-y-2">
  <label
    htmlFor="academic-book-discipline"
    className="block text-sm font-medium text-slate-700"
  >
    Academic Discipline
  </label>

  <select
    id="academic-book-discipline"
    value={bookDiscipline}
    onChange={(e) => {setBookDiscipline(e.target.value);setBookSubcategory("");}}
    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
  >
    <option value="">Select Academic Discipline</option>

    {SUBJECTS.map((subject) => (
      <option key={subject} value={subject}>
        {subject}
      </option>
    ))}
  </select>
</div>
{/* Academic Subcategory selection */}
<div className="min-w-0 space-y-2">
  <label
    htmlFor="academic-book-subcategory"
    className="block text-sm font-medium text-slate-700"
  >
    Academic Subcategory
  </label>

  <select
    id="academic-book-subcategory"
    value={bookSubcategory}
    onChange={(e) => setBookSubcategory(e.target.value)}
    disabled={!BOOK_SUBCATEGORIES[bookDiscipline]}
    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
  >
    <option value="">Select Academic Subcategory</option>

    {(BOOK_SUBCATEGORIES[bookDiscipline] || []).map(
      (subcategory) => (
        <option key={subcategory} value={subcategory}>
          {subcategory}
        </option>
      )
    )}
  </select>
</div>
</div> {/* End of Academic Discipline and Subcategory horizontal layout */}
{/* Academic Book PDF and PowerPoint selection */}
<div className="mt-4 space-y-2">
  <label
    htmlFor="academic-book-file"
    className="block text-sm font-medium text-slate-700"
  >
    Academic Book File (PDF or PowerPoint)
  </label>

  <input
  ref={bookFileInputRef}
  id="academic-book-file"
  type="file"
    /*accept=".pdf,application/pdf"*/
    accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
    onChange={(e) => {
  const file = e.target.files?.[0] || null;

  setBookFileError("");

  if (!file) {
    setBookFile(null);
    return;
  }

  const maxFileSize = 25 * 1024 * 1024;

const fileName = file.name.toLowerCase();

const isPdf = fileName.endsWith(".pdf");
const isPowerPoint =
  fileName.endsWith(".ppt") || fileName.endsWith(".pptx");

if (!isPdf && !isPowerPoint) {
  setBookFile(null);
  setBookFileError(
    "Please select a PDF or PowerPoint file (.pdf, .ppt, .pptx)."
  );
  e.target.value = "";
  return;
}

if (file.size > maxFileSize) {
  setBookFile(null);
  setBookFileError(
    "The selected file must not exceed 25 MB."
  );
  e.target.value = "";
  return;
}

setBookFile(file);
}}
    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
  />

  <p className="text-xs text-slate-500">
  Select an academic book or presentation in PDF or PowerPoint
  format (.pdf, .ppt, .pptx), up to 25 MB. The file will
  not be uploaded until you submit it.
</p>
  {/* PDF validation error */}
{bookFileError && (
  <p role="alert" className="text-sm font-medium text-red-600">
    {bookFileError}
  </p>
)}
  {/* Selected PDF file information */}
{bookFile && (
  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
    <div className="flex items-center gap-3">
      <span className="text-xl" aria-hidden="true">
        📄
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">
          {bookFile.name}
        </p>

        <p className="mt-1 text-xs text-slate-500">
  File size: {(bookFile.size / (1024 * 1024)).toFixed(2)} MB
</p>
</div>

{/* Remove selected PDF */}
<button
  type="button"
  onClick={() => {
    setBookFile(null);
    setBookFileError("");

    if (bookFileInputRef.current) {
      bookFileInputRef.current.value = "";
    }
  }}
  className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
  aria-label="Remove selected PDF"
>
  Remove
</button>

</div>
</div>
)}

</div>

{/* Academic book copyright and sharing permission */}
<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
  <label className="flex cursor-pointer items-start gap-3">
    <input
      type="checkbox"
      checked={hasBookSharingPermission}
      onChange={(e) =>
        setHasBookSharingPermission(e.target.checked)
      }
      className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
    />

    <span className="text-sm leading-relaxed text-slate-700">
      I confirm that I own the rights to share this academic
      book, have permission from the copyright holder, or
      that the book is legally available for redistribution
      under an applicable open license or public-domain status.
    </span>
  </label>
</div>

{/* Academic book submission validation error */}
{bookSubmissionError && (
  <p
    role="alert"
    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
  >
    {bookSubmissionError}
  </p>
)}
{/* Academic book validation success message */}
{bookSubmissionSuccess && (
  <p
    role="status"
    className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
  >
    {bookSubmissionSuccess}
  </p>
)}

{/* Academic book editor action buttons */}
<div className="mt-4 flex flex-wrap items-center justify-end gap-3">

  {/* Cancel */}
  <button
    type="button"
    onClick={() => {
      setHasBookSharingPermission(false);
      setShowBookEditor(false);
    }}
    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
  >
    Cancel
  </button>

  {/* Share Academic Book */}
<button
  type="button"
  onClick={handleShareAcademicBook}
  disabled={bookSubmitting}
  className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
>
  {bookSubmitting
    ? bookSubmissionStatus || "Please wait..."
    : "Save and Share"}
</button>

</div>
  </div>
)}
  </section>
)}

          <section className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
  <h2 className="bg-blue-50 px-4 py-1 text-center text-lg font-semibold text-slate-900">
    {activeSection === "Browse All Books"
      ? selectedBookSubcategory !== "All"
        ? selectedBookSubcategory
        : selectedBookDiscipline !== "All"
          ? selectedBookDiscipline
          : "Browse All Books"
      : activeSection}
  </h2>

  <div className="px-5 pb-5">

            {search.trim() && (
              <p className="mt-2 text-sm text-slate-500">
                Search: {search}
              </p>
            )}

            <div className="mt-3">
  {displayedBooksLoading ? (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-12 text-center">
      <p className="text-sm text-slate-600">
  {isMySharedBooks
    ? "Loading your shared books..."
    : "Loading academic books..."}
</p>
    </div>
  ) : displayedBooksError ? (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-5 py-6"
    >
      <p className="font-semibold text-red-800">
  {isMySharedBooks
    ? "Unable to load your shared books"
    : "Unable to load academic books"}
</p>
      <p className="mt-2 text-sm text-red-700">
        {displayedBooksError}
      </p>
    </div>
  ) : filteredDisplayedBooks.length === 0 ? (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
      <p className="font-semibold text-slate-700">
  {isMySharedBooks
    ? "You have not shared any academic books yet"
    : isSavedBooks
      ? "You have no saved academic books yet"
      : booksCursor
        ? "No matching books found on this page"
        : selectedBookDiscipline !== "All"
          ? "No academic books found for this selection"
          : "No academic books available yet"}
</p>

<p className="mt-2 text-sm text-slate-500">
  {isMySharedBooks
    ? "Academic books you upload and share will appear here."
    : isSavedBooks
      ? "Books you save will appear here."
      : booksCursor
        ? "Additional books may be available. Click Load More Books to continue searching."
        : selectedBookDiscipline !== "All"
          ? "Try selecting another academic discipline or subcategory."
          : "Books shared by the academic community will appear here."}
</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4">
      {filteredDisplayedBooks.map((book) => (

    <article
  key={book.pk}
  className="overflow-hidden rounded-md border border-slate-200 bg-white p-4 shadow-sm"
>
  <div className="flow-root">

    {/* Book cover — left side, clickable to read PDF */}
<button
  type="button"
  onClick={() => handleReadBook(book)}
  title={`Read ${book.title || "Academic book"}`}
  aria-label={`Read ${book.title || "Academic book"}`}
  className="float-left mr-4 mb-2 w-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left transition hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  {book.coverUrl ? (
    <img
      src={book.coverUrl}
      alt={`Cover of ${book.title || "Academic book"}`}
      loading="lazy"
      className="h-40 w-full object-contain"
    />
  ) : (
    <div className="flex h-40 flex-col items-center justify-center gap-2 px-2 text-center">
  {[
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ].includes(book.contentType) ? (
    <>
      <span className="text-3xl font-bold text-orange-600">
        PPT
      </span>

      <span className="text-xs font-semibold text-slate-700">
        PowerPoint Presentation
      </span>

      <span className="text-[10px] uppercase tracking-wide text-slate-500">
        {book.contentType === "application/vnd.ms-powerpoint"
          ? "PPT"
          : "PPTX"}
      </span>
    </>
  ) : (
    <span className="text-xs text-slate-400">
      No cover available
    </span>
  )}
</div>
  )}
</button>

    {/* Book information — right side */}
      <div className="min-w-0">

      <h3 className="break-words text-sm font-semibold leading-6 text-slate-900">
  <button
    type="button"
    onClick={() => handleReadBook(book)}
    title={`Read ${book.title || "Academic book"}`}
    className="text-left transition hover:text-blue-700 hover:underline focus:outline-none focus:underline"
  >
    {book.title || "Untitled Book"}
  </button>
</h3>
      {book.author && (
        <p className="mt-2 break-words text-xs font-medium text-slate-700">
          Author: {book.author}
        </p>
      )}

      {(book.subject || book.category) && (
  <div className="mt-2 flex flex-wrap items-center gap-1 text-xs font-medium text-blue-700">
    <button
      type="button"
      onClick={() => {
        setActiveSection("Browse All Books");
        setSelectedBookDiscipline(book.subject || book.category);
        setSelectedBookSubcategory("All");
      }}
      className="hover:underline focus:outline-none focus:underline"
    >
      {book.subject || book.category}
    </button>

    {book.subcategory && (
      <>
        <span className="text-slate-500">:</span>

        <button
          type="button"
          onClick={() => {
            setActiveSection("Browse All Books");
            setSelectedBookDiscipline(book.subject || book.category);
            setSelectedBookSubcategory(book.subcategory);
          }}
          className="hover:underline focus:outline-none focus:underline"
        >
          {book.subcategory}
        </button>
      </>
    )}
  </div>
)}
      {book.description && (
  <BookDescription
    description={book.description}
    expanded={Boolean(
      expandedBookDescriptions[
        String(book.bookId || book.pk || "").replace(/^BOOK#/, "")
      ]
    )}
    onToggle={() => {
      const id = String(book.bookId || book.pk || "").replace(/^BOOK#/, "");

      setExpandedBookDescriptions((previous) => ({
        ...previous,
        [id]: !previous[id],
      }));
    }}
  />
)}
      {/* Save / Unsave academic book — hidden in My Shared Books */}
{!isMySharedBooks && (
  <div className="mt-2 flex items-center gap-3">
    <button
      type="button"
      onClick={() => handleToggleSaveBook(book)}
      disabled={savingBookIds.includes(
        String(book.bookId || book.pk || "").replace(/^BOOK#/, "")
      )}
      className="rounded-md border border-blue-700 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {savingBookIds.includes(
        String(book.bookId || book.pk || "").replace(/^BOOK#/, "")
      )
        ? "Updating..."
        : savedBookIds.includes(
            String(book.bookId || book.pk || "").replace(/^BOOK#/, "")
          )
          ? "Unsave Book"
          : "Save Book"}
    </button>
  </div>
)}

    </div>
  </div>
</article>
       ))}
    </div>
  )}

  {/* Load More — My Shared Books */}
  {isMySharedBooks &&
    !mySharedBooksLoading &&
    !mySharedBooksError &&
    mySharedBooksCursor && (
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleLoadMoreMySharedBooks}
          disabled={mySharedBooksLoadingMore}
          className="rounded-lg border border-blue-700 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mySharedBooksLoadingMore
            ? "Loading more books..."
            : "Load More Books"}
        </button>
      </div>
    )}

    {/* Load More — Saved Books */}
{isSavedBooks &&
  !savedBooksLoading &&
  !savedBooksError &&
  savedBooksCursor && (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={handleLoadMoreSavedBooks}
        disabled={savedBooksLoadingMore}
        className="rounded-lg border border-blue-700 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {savedBooksLoadingMore
          ? "Loading more books..."
          : "Load More Books"}
      </button>
    </div>
  )}

    {/* Load More — Browse All Books */}
{activeSection === "Browse All Books" &&
  !booksLoading &&
  !booksError &&
  booksCursor && (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={handleLoadMoreBooks}
        disabled={booksLoadingMore}
        className="rounded-lg border border-blue-700 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {booksLoadingMore
          ? "Loading more books..."
          : "Load More Books"}
      </button>
    </div>
  )}


</div>
</div>
          </section>
        </main>

        {/* RIGHT SIDEBAR */}
<div className="flex flex-col gap-1">

  {/* Library Features — upper-right card */}
  <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">

    <h2 className="bg-[#142C4E] px-2 py-4 text-center text-[13px] font-semibold tracking-tight text-white whitespace-nowrap">
      Academic Book Sharing Library
    </h2>

    <div className="p-5">
      <h3 className="text-base font-semibold text-slate-900">
        Academic Library Features
      </h3>

      <div className="mt-3 space-y-3 text-sm text-slate-600">
        <p>Browse academic disciplines</p>
        <p>Discover shared books</p>
        <p>Save books to your library space</p>
        <p>Participate in academic discussions</p>
      </div>
    </div>

  </section>

  {/* Responsible Academic Sharing — lower-right card */}
  <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">

    <h3 className="whitespace-nowrap text-sm font-semibold text-slate-900">
  Responsible Academic Sharing
</h3>

    <p className="mt-2 rounded-md bg-amber-50 px-2 py-2 text-xs leading-relaxed text-amber-800">
  Share books and educational materials only when you have
  permission to distribute them.
</p>

 </aside>

  {/* Students' links — below Responsible Academic Sharing */}
  <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
    <h3 className="w-full bg-sky-100 px-3 py-2 text-center text-sm font-semibold text-slate-900">
      Students' links
    </h3>

    <ul className="space-y-1.5 p-3 text-[13px]">
      <li>
        <Link
          to="/platform/university"
          className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-slate-800 hover:bg-slate-100"
        >
          University Academic Platform
        </Link>
      </li>

      <li>
        <Link
          to="/platform/country"
          className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-slate-800 hover:bg-slate-100"
        >
          Country Academic Platform
        </Link>
      </li>

      <li>
        <Link
          to="/platform/global"
          className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-slate-800 hover:bg-slate-100"
        >
          🌍 Global Academic Platform
        </Link>
      </li>

      <li>
        <Link
          to="/marketplace"
          className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-slate-800 hover:bg-slate-100"
        >
          Student Market Place
        </Link>
      </li>

      <li>
        <Link
          to="/student/video-tips"
          className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-slate-800 hover:bg-slate-100"
        >
          Video Tips
        </Link>
      </li>
    </ul>
  </section>

</div>

      </div>
    </div>
  </div>
  );
}