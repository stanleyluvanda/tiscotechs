// src/data/fundingPrograms.js

export const FUNDING_PROGRAMS = [
  {
    id: "fulbright-foreign-student-program",
    title: "Fulbright Foreign Student Program",
    provider: "U.S. Department of State",
    type: "scholarship_program",
    category: "Government / International",

    summary:
      "Graduate funding opportunity for international students to study in the United States.",

    description:
      "The Fulbright Foreign Student Program enables graduate students, young professionals, and artists from abroad to study and conduct research in the United States.",

    eligibility:
      "Varies by country. Applicants apply through their home country’s Fulbright Commission or U.S. Embassy.",

    funding:
      "Typically covers tuition, living stipend, travel, and health benefits.",

    applicationProcess:
      "Apply through your country’s Fulbright office. Includes academic records, references, and personal statement.",

    fundingType: ["Fully Funded"],
    amount: "Tuition, stipend, travel",

    studyCountries: ["USA"],
    eligibleCountries: ["Country-specific"],

    studyLevel: ["Masters", "PhD"],
    fields: ["All fields"],

    tags: ["International Students"],

    officialUrl: "https://foreign.fulbrightonline.org/",
    logoUrl: "",
    bannerUrl: "",

    isRecurring: true,
    featured: true
  },

  {
    id: "chevening-scholarship",
    title: "Chevening Scholarship",
    provider: "UK Government",
    type: "scholarship_program",
    category: "Government",

    summary:
      "Fully funded UK government scholarship for future global leaders.",

    description:
      "Chevening offers fully funded scholarships for outstanding students worldwide to pursue a one-year master's degree in the UK.",

    eligibility:
      "Open to students from eligible countries with leadership potential and academic excellence.",

    funding:
      "Full tuition, monthly stipend, travel costs, and additional grants.",

    applicationProcess:
      "Apply online through the Chevening portal and submit required documents.",

    fundingType: ["Fully Funded"],
    amount: "Full funding",

    studyCountries: ["UK"],
    eligibleCountries: ["Multiple"],

    studyLevel: ["Masters"],
    fields: ["All fields"],

    tags: ["Leadership"],

    officialUrl: "https://www.chevening.org/",
    logoUrl: "",
    bannerUrl: "",

    isRecurring: true,
    featured: true
  },

  {
    id: "daad-scholarships",
    title: "DAAD Scholarships",
    provider: "German Government",
    type: "scholarship_program",
    category: "Government",

    summary:
      "Scholarships for international students to study in Germany.",

    description:
      "DAAD offers a wide range of scholarships for undergraduate, postgraduate, and doctoral studies in Germany.",

    eligibility:
      "Varies by program and country.",

    funding:
      "Monthly stipend, travel allowance, insurance, and tuition support.",

    applicationProcess:
      "Apply through DAAD portal or university depending on program.",

    fundingType: ["Fully Funded", "Partial"],
    amount: "Varies",

    studyCountries: ["Germany"],
    eligibleCountries: ["Multiple"],

    studyLevel: ["Masters", "PhD"],
    fields: ["All fields"],

    officialUrl: "https://www.daad.de/",
    logoUrl: "",
    bannerUrl: "",

    isRecurring: true,
    featured: true
  },

  {
    id: "mpower-financing",
    title: "MPOWER Financing",
    provider: "MPOWER",
    type: "loan_provider",
    category: "Financial Aid",

    summary:
      "Student loans for international students without collateral.",

    description:
      "MPOWER provides education loans to international students studying in the U.S. and Canada.",

    eligibility:
      "International students admitted to eligible universities.",

    funding:
      "Loan-based financing.",

    applicationProcess:
      "Apply online through MPOWER platform.",

    fundingType: ["Loan"],
    amount: "Up to program cost",

    studyCountries: ["USA", "Canada"],
    eligibleCountries: ["Multiple"],

    studyLevel: ["Undergraduate", "Masters"],
    fields: ["All fields"],

    officialUrl: "https://www.mpowerfinancing.com/",
    logoUrl: "",
    bannerUrl: "",

    isRecurring: true,
    featured: false
  },

  {
    id: "iefa-database",
    title: "IEFA (International Education Financial Aid)",
    provider: "IEFA",
    type: "database",
    category: "Resource",

    summary:
      "Search engine for scholarships and financial aid worldwide.",

    description:
      "IEFA provides a comprehensive database of scholarships, grants, and financial aid opportunities.",

    eligibility:
      "Open access platform.",

    funding:
      "Varies by listed program.",

    applicationProcess:
      "Search and apply via listed programs.",

    fundingType: ["Varies"],
    amount: "Varies",

    studyCountries: ["Global"],
    eligibleCountries: ["Global"],

    studyLevel: ["All"],
    fields: ["All fields"],

    officialUrl: "https://www.iefa.org/",
    logoUrl: "",
    bannerUrl: "",

    isRecurring: true,
    featured: false
  }
];