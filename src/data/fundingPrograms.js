//src/data/fundingPrograms.js

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
    bannerUrl: "/images/Fulbright1.png",

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
      "Chevening Scholarships are the UK government’s flagship international awards for emerging leaders from around the world. They support outstanding individuals to pursue a one-year master’s degree at an eligible UK university while strengthening leadership capacity, professional networks, and long-term impact in their home countries. Beyond academic study, the programme is designed to help scholars build global connections, experience UK culture, and return home with the knowledge and influence to create positive change.",

    eligibility:
      "Applicants must usually be citizens of a Chevening-eligible country or territory, commit to returning to their home country for at least two years after the award, hold an undergraduate qualification suitable for entry to a UK master’s programme, and have at least 2,800 hours of work experience completed after undergraduate graduation. Applicants must also apply to three eligible UK university courses and secure an unconditional offer from at least one of them by the required deadline. Additional rules apply, including restrictions related to British citizenship, prior UK government-funded study, and certain employment or family affiliations.",

    funding:
      "Chevening Scholarships are generally fully funded and commonly cover full tuition fees, a monthly living allowance, return travel to the UK, and selected arrival or departure allowances. Scholars also gain access to networking, leadership, and enrichment opportunities during their time in the UK.",

    applicationProcess:
      "Applicants apply through the official Chevening application system during the annual application cycle. A strong application usually demonstrates leadership potential, professional achievement, networking ability, and a clear plan for future impact. Candidates should research and select three eligible one-year UK master’s courses, complete the Chevening application, and if shortlisted, attend an interview through the relevant local process. Successful applicants must later secure an unconditional offer from at least one chosen course by the programme deadline.",

    fundingType: ["Fully Funded"],
    amount: "Full tuition, living stipend, travel, and related allowances",

    studyCountries: ["UK"],
    eligibleCountries: ["Multiple"],

    studyLevel: ["Masters"],
    fields: ["All fields"],

    tags: ["Leadership"],

    officialUrl: "https://www.chevening.org/",
    logoUrl: "",
    bannerUrl: "/images/Chevening.png",

    isRecurring: true,
    featured: true
  },

  {
    id: "commonwealth-scholarship",
  title: "Commonwealth Scholarships and Fellowships",
  provider: "Commonwealth Scholarship Commission",
  type: "scholarship_program",
  category: "Government / International",

  summary:
    "Commonwealth Scholarships and Fellowships support talented individuals across the Commonwealth through postgraduate study, research, professional fellowships, and development-focused academic opportunities.",

  description:
    "Commonwealth Scholarships and Fellowships combine sustainable development goals with the UK’s wider international interests by supporting future innovators, researchers, professionals, and leaders from across the Commonwealth, while also attracting outstanding talent to UK universities. Since the first group of 175 scholars from 18 countries arrived in the UK in 1960, more than 34,000 individuals have received Commonwealth support. Over time, the programme has expanded and adapted to the needs of today’s 56-nation Commonwealth. These awards are designed to act as a catalyst for sustainable development by supporting candidates of exceptional ability, especially those from disadvantaged backgrounds in low and middle income countries.",

  eligibility:
    "Eligibility depends on the specific scholarship or fellowship route. In general, applicants are expected to be citizens of eligible Commonwealth countries or territories, meet the academic or professional requirements of the specific programme, and demonstrate strong potential to contribute to sustainable development in their home country. Some awards are open only to candidates from low and middle income countries, some focus on least developed countries and vulnerable states, and some programmes depend on nomination through an approved nominating agency. Professional Fellowships and Startup-focused opportunities may also require relevant work experience, sector involvement, or evidence of innovation potential.",

  funding:
    "Funding varies by programme, but many Commonwealth Scholarships are fully funded and may cover tuition fees, living allowance, travel costs, and other approved academic or professional support. Shared Master’s Scholarships are jointly funded with participating UK universities, while some fellowships and specialist programmes provide sector-based professional development support rather than standard degree funding. Most scholarships are funded by the UK Foreign, Commonwealth & Development Office (FCDO) and are designed to support excellence in UK higher education while advancing development impact and the UN Sustainable Development Goals.",

  applicationProcess:
    "Application procedures depend on the programme type. Some awards, such as Master’s Scholarships and PhD Scholarships, usually require nomination through a recognised nominating agency. Others, such as Shared Master’s Scholarships, involve selected UK universities and approved courses, while Distance Learning Master’s Scholarships are designed for students who may not be able to travel outside their home country. Professional Fellowships and Startup Fellowship routes have their own application and host requirements. Applicants should first identify the specific Commonwealth programme that matches their academic level, country category, and professional goals, then follow the official application guidance for that route.",

  fundingType: ["Fully Funded", "Fellowship", "Shared Funding"],
  amount: "Varies by programme; often includes tuition, stipend, travel, and approved support",

  studyCountries: ["UK", "Distance Learning / Home Country"],
  eligibleCountries: ["Eligible Commonwealth countries"],

  studyLevel: ["Masters", "PhD", "Professional Fellowship", "Startup Fellowship"],
  fields: ["Multiple fields"],

  tags: ["Development", "International Students", "Commonwealth", "Leadership"],

  officialUrl: "https://cscuk.fcdo.gov.uk/",
  logoUrl: "",
  bannerUrl: "/images/Commonwealth.png",

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
      "DAAD Scholarships are among the most recognized international study opportunities in Germany. The German Academic Exchange Service supports a wide range of academic pathways, including postgraduate study, doctoral training, research, and academic exchange. DAAD programmes are designed to promote international academic cooperation, strengthen research capacity, and support talented students and scholars from around the world who want to study or conduct research at German institutions.",

    eligibility:
      "Eligibility varies by scholarship programme, academic level, and country of origin. In general, applicants are expected to hold the academic qualifications required for the programme they seek, demonstrate strong academic performance, and meet any language, research, or institutional requirements attached to that specific scholarship. Some DAAD awards are designed for master’s students, some for doctoral candidates or researchers, and others for academic staff or professionals. Applicants should always review the exact criteria for the specific DAAD opportunity they intend to pursue.",

    funding:
      "DAAD funding varies by programme but may include a monthly stipend, travel support, health insurance, research or study allowances, and in some cases tuition-related support or additional academic benefits. Some DAAD scholarships are fully funded, while others offer partial support depending on the award structure.",

    applicationProcess:
      "Applicants usually apply through the DAAD portal, the host university, or another official route named in the scholarship call. The process generally involves identifying a suitable programme, reviewing the official eligibility criteria, preparing academic transcripts and supporting documents, and submitting the application before the stated deadline. For research-based awards, applicants may also need a research proposal, supervisor contact, or host institution confirmation. The exact process depends on the specific DAAD scholarship.",

    fundingType: ["Fully Funded", "Partial"],
    amount: "Varies by programme",

    studyCountries: ["Germany"],
    eligibleCountries: ["Multiple"],

    studyLevel: ["Masters", "PhD"],
    fields: ["All fields"],

    officialUrl: "https://www.daad.de/",
    logoUrl: "",
    bannerUrl: "/images/DAAD Scholarships.png",

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
  },

  {
  id: "swiss-government-excellence-scholarships",
  title: "Swiss Government Excellence Scholarships",
  provider: "Swiss Confederation (FCS/ESKAS)",
  type: "scholarship_program",
  category: "Government / Research / Arts",

  summary:
    "Fully funded Swiss government scholarships supporting research, PhD, postdoctoral studies, and arts master's programs in Switzerland.",

  description:
    "The Swiss Government Excellence Scholarships support highly qualified international students, researchers, and artists by providing opportunities to undertake research, doctoral studies, postdoctoral work, or artistic master's degrees at Swiss universities and recognized institutions. These scholarships aim to promote international exchange, research collaboration, and academic excellence while strengthening global cooperation. The program prioritizes candidates who demonstrate strong academic performance, research potential, and the ability to contribute to their home countries after completing their studies.",

  eligibility:
    "Eligibility varies by scholarship type but generally requires a strong academic background and relevant qualifications. Applicants must typically meet age limits, hold the required degree (Bachelor’s, Master’s, or PhD depending on category), and submit a detailed research or study plan. For research-based scholarships, applicants must secure a Swiss academic supervisor and obtain a formal letter of support. Priority is given to candidates who have not previously studied or conducted research in Switzerland. Additional country-specific eligibility rules apply.",

  funding:
    "Research, PhD, and art scholarships provide approximately CHF 1,920 per month, while postdoctoral scholarships provide CHF 3,500 per month. The funding covers basic living expenses but is not considered a salary. Additional benefits may include health insurance (for non-EU/EFTA students), a return flight allowance (for eligible countries), a rental deposit contribution, and a public transport travel card. Tuition fees are generally not covered and must be paid by the student where applicable.",

  applicationProcess:
    "Applicants must apply through the Swiss representation (embassy or consulate) in their home country. The application includes a detailed CV, academic transcripts, a motivation letter, a research proposal or portfolio, and recommendation letters. For research and doctoral pathways, a confirmed Swiss academic supervisor and a letter of support are mandatory. Applications are evaluated based on academic excellence, research quality, and potential for future collaboration. Selection is highly competitive and country-specific deadlines apply.",

  fundingType: ["Fully Funded"],
  amount: "CHF 1,920 – CHF 3,500 per month + additional benefits",

  studyCountries: ["Switzerland"],
  eligibleCountries: ["Country-specific"],

  studyLevel: ["Research Fellowship", "PhD", "Postdoctoral", "Masters (Arts)"],
  fields: ["All fields", "Arts"],

  tags: ["Research", "International Students", "Government Scholarship"],

  officialUrl: "https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants/swiss-government-excellence-scholarships.html",
  logoUrl: "",
  bannerUrl: "/images/Swiss Excellence.png",

  isRecurring: true,
  featured: true
},
{
  id: "swedish-institute-scholarship-global-professionals",
  title: "Swedish Institute Scholarship for Global Professionals",
  provider: "Swedish Institute",
  type: "scholarship_program",
  category: "Government / Information Source",

  summary:
    "A Swedish government scholarship information source for global professionals seeking fully funded master's study opportunities in Sweden. Users should check the official page for current status, open calls, closed cycles, and expected future application dates.",

  description:
    "The Swedish Institute Scholarship for Global Professionals is a major scholarship opportunity for experienced professionals from selected countries who want to pursue eligible master's programmes in Sweden. This page should be treated as an information source where applicants can check whether the scholarship is currently open, closed, or expected to reopen. The scholarship supports full-time one- or two-year master's studies in Sweden and is designed for individuals with work experience, leadership potential, and a strong commitment to contributing to sustainable development in their home countries and regions. It also connects recipients to the SI Network for Global Professionals and the Sweden Alumni Network.",

  eligibility:
    "Eligibility depends on the official call for the relevant cycle. In general, applicants are usually expected to be citizens of an eligible country, apply to an SI-eligible master's programme in Sweden, be liable to pay tuition fees, and demonstrate both work experience and leadership experience. Some applicants must meet specific work-hour requirements depending on their country group. Applicants are generally not eligible if they already hold or are currently pursuing a degree in Sweden, have already received a Swedish Institute scholarship for studies in Sweden, or hold citizenship or residency statuses that make them ineligible under the programme rules. Because criteria can change, users should always confirm the current rules on the official Swedish Institute website.",

  funding:
    "When open for a given cycle, the scholarship is generally fully funded and may include full tuition fee coverage paid directly to the university, a monthly living allowance, a travel grant, and access to Swedish Institute leadership and alumni networks. The award typically does not cover application fees, family member costs, insurance in all cases, or changes to the awarded study programme. Exact benefits should always be confirmed on the official page for the current cycle.",

  applicationProcess:
    "Applicants should first apply for eligible master's programmes in Sweden through University Admissions, then submit a separate scholarship application to the Swedish Institute during the official scholarship application window if the call is open. Required documents generally include a CV, proof of work and leadership experience, letters of reference, proof of identity, and a motivation statement. Because opening periods, deadlines, and programme lists may change from year to year, this page should be used mainly as a trusted source to check whether applications are open, closed, or expected to reopen and to review the latest official instructions.",

  fundingType: ["Fully Funded", "Information Source"],
  amount: "Varies by official scholarship cycle; typically includes tuition, monthly allowance, and travel grant",

  studyCountries: ["Sweden"],
  eligibleCountries: ["Selected countries only"],

  studyLevel: ["Masters"],
  fields: [
    "Governance",
    "Public Health",
    "Entrepreneurship and Innovation",
    "STEM",
    "Other eligible English-taught master's programmes"
  ],

  tags: [
    "Government Scholarship",
    "Leadership",
    "Masters",
    "Information Source",
    "Check Official Opening Dates"
  ],

  officialUrl: "https://si.se/en/apply/scholarships/swedish-institute-scholarships-for-global-professionals/",
  logoUrl: "",
  bannerUrl: "/images/Swedish Institute.png",

  isRecurring: true,
  featured: false
},
{
  id: "australia-awards-scholarships",
  title: "Australia Awards Scholarships",
  provider: "Australian Government / DFAT",
  type: "scholarship_program",
  category: "Government / Development",

  summary:
    "Prestigious long-term Australian government scholarships for students from participating developing countries to undertake undergraduate or postgraduate study in Australia.",

  description:
    "Australia Awards are prestigious and transformational opportunities offered by the Australian Government to emerging leaders from developing countries. Australia Awards Scholarships are long-term awards administered by the Department of Foreign Affairs and Trade (DFAT) and are designed to support full-time study at participating Australian universities and TAFE institutions. The program aims to build the skills, knowledge, and leadership capacity of recipients so they can return home and contribute to the development, prosperity, and resilience of their countries. The scholarships form part of Australia’s broader development assistance and long-standing educational engagement with partner countries.",

  eligibility:
    "Eligibility depends on the applicant’s country of citizenship and residency, as well as country-specific priority sectors and selection rules. In general, applicants must be citizens of a participating country, meet the academic and admissions requirements of their intended Australian programme, and satisfy the specific criteria published for their country profile. Applicants are also normally required to commit to returning to their home country after completing the scholarship and to comply with Australia Awards policy conditions, including a post-award return requirement.",

  funding:
    "Australia Awards Scholarships are generally fully funded and may include full tuition fees, return air travel, an establishment allowance, a contribution to living expenses, an introductory academic program, overseas student health cover, possible pre-course English training, supplementary academic support, and in some cases support for required fieldwork connected to research study.",

  applicationProcess:
    "Applicants should first check whether their country participates in the scholarship programme and then review the specific country profile for opening and closing dates, priority areas, and detailed eligibility rules. Some countries allow online applications through OASIS, while others may require hard-copy applications. Applicants must prepare the required supporting documents, such as CVs, referee reports, and academic records, and submit them by the country-specific deadline. All applicants should read the Australia Awards Scholarships Policy Handbook before applying.",

  fundingType: ["Fully Funded"],
  amount: "Full tuition, travel, living support, health cover, and related award benefits",

  studyCountries: ["Australia"],
  eligibleCountries: ["Participating countries only"],

  studyLevel: ["Undergraduate", "Masters", "PhD", "TAFE / Technical Study"],
  fields: ["Country-specific priority fields"],

  tags: ["Government Scholarship", "Development", "Leadership"],

  officialUrl: "https://www.australiaawardsafrica.org/",
  logoUrl: "",
  bannerUrl: "/images/Australia Awards.png",

  isRecurring: true,
  featured: true
},
{
  id: "australia-awards-pacific-scholarships",
  title: "Australia Awards Pacific Scholarships",
  provider: "Australian Government / DFAT",
  type: "scholarship_program",
  category: "Government / Regional Development",

  summary:
    "Regional scholarships for students from participating Pacific countries to study at selected tertiary institutions in the Pacific region.",

  description:
    "Australia Awards Pacific Scholarships provide people from participating Pacific developing countries with opportunities to study at selected education institutions in the Pacific region. The purpose of the programme is to help recipients build the knowledge and skills needed to drive positive change and support the development of their home countries. These scholarships are part of Australia’s regional development assistance and are designed to respond to country-specific education and workforce needs across the Pacific.",

  eligibility:
    "Applicants must generally be citizens of and resident in a participating Pacific country, meet the specific eligibility criteria of their country and host institution, and satisfy immigration requirements for study in the host country. They must not hold another scholarship during the award period, must not be transferring from another scholarship, and must not have recently held an Australian Government scholarship within the restricted period. Additional restrictions may apply regarding permanent residence, marital connections to Australian or New Zealand citizens or residents, and country-specific study fields or institutional pathways.",

  funding:
    "Financial support varies by country and institution but generally includes return airfare, compulsory academic fees, an establishment allowance, and a living allowance. In some cases, the living allowance may be adjusted where family circumstances are recognized by the programme. The exact entitlements depend on the country arrangement and institution of enrolment.",

  applicationProcess:
    "Applicants should consult the relevant Australian diplomatic mission or country contact for their citizenship country to confirm current offerings, participating institutions, eligibility, and priority study areas. Applications are managed through country-specific channels, and detailed guidance is available from the relevant scholarship office or diplomatic mission. Applicants should also review the Australia Awards Pacific Scholarships Policy Handbook before applying.",

  fundingType: ["Fully Funded", "Regional Scholarship"],
  amount: "Varies by country and institution; generally includes travel, fees, and living support",

  studyCountries: ["Pacific region institutions"],
  eligibleCountries: [
    "Federated States of Micronesia",
    "Fiji",
    "Kiribati",
    "Marshall Islands",
    "Nauru",
    "Niue",
    "Palau",
    "Papua New Guinea",
    "Samoa",
    "Solomon Islands",
    "Tonga",
    "Tuvalu",
    "Vanuatu"
  ],

  studyLevel: ["Technical", "Undergraduate", "Postgraduate"],
  fields: ["Country-specific priority fields"],

  tags: ["Pacific", "Regional Development", "Government Scholarship"],

  officialUrl: "https://www.dfat.gov.au/people-to-people/australia-awards",
  logoUrl: "",
  bannerUrl: "/images/Australia Awards Pacific.png",

  isRecurring: true,
  featured: false
},
{
  id: "john-allwright-fellowship",
  title: "John Allwright Fellowship",
  provider: "ACIAR / Australia Awards",
  type: "fellowship",
  category: "Government / Research",

  summary:
    "Competitive postgraduate research fellowship for scientists and economists connected to ACIAR projects, supporting Masters by Research or PhD study in Australia.",

  description:
    "The John Allwright Fellowship is a merit-based postgraduate research programme for scientists and economists from partner countries who are currently or recently involved in ACIAR research projects. It supports recipients to undertake formal postgraduate qualifications at Australian tertiary institutions, usually through a Masters by Research or PhD. The programme aims to strengthen scientific research capability, deepen institutional links, and help partner countries build high-quality, development-relevant research capacity. In addition to the standard Australia Awards benefits, fellows receive additional pastoral and professional support through ACIAR-linked structures.",

  eligibility:
    "Applicants must generally be citizens of the country in which they are working, must not hold Australian citizenship or permanent residency, and must be employed on a permanent or long-term basis. They must be scientists or economists actively involved in an ACIAR research project or small research activity within the relevant period, hold qualifications equivalent to at least an Australian bachelor’s degree in a relevant field, and secure the required endorsements from their employer, project leaders, and primary supervisor. Research proposals should also address gender equity and social inclusion, climate change, and development relevance.",

  funding:
    "John Allwright Fellows receive the standard Australia Awards scholarship benefits, which generally include full tuition fees, return air travel, establishment allowance, contribution to living expenses, overseas student health cover, academic support, and where applicable, fieldwork support. Additional benefits may include pastoral care, networking support, and alumni development opportunities provided through ACIAR and related support facilities.",

  applicationProcess:
    "Applications are submitted through the Online Australia Scholarships Information System (OASIS). Applicants must select the ACIAR John Allwright Fellowships award program and upload the required supporting documents, including proof of citizenship, academic records, research proposal, endorsement letters, and supervisor documentation. The fellowship has its own intake dates, and applicants should carefully review the official guidance, FAQs, and OASIS instructions before submitting.",

  fundingType: ["Fully Funded", "Research Fellowship"],
  amount: "Australia Awards scholarship package plus ACIAR support benefits",

  studyCountries: ["Australia"],
  eligibleCountries: ["ACIAR partner countries only"],

  studyLevel: ["Masters by Research", "PhD"],
  fields: ["Agriculture", "Fisheries", "Food Systems", "Economics", "Climate-related research"],

  tags: ["Research", "Agriculture", "Climate Change", "Government Fellowship"],

  officialUrl: "https://www.aciar.gov.au/",
  logoUrl: "",
  bannerUrl: "/images/John Allwright Fellowship.png",

  isRecurring: true,
  featured: false
},
{
  id: "australia-awards-short-courses",
  title: "Australia Awards Short Courses",
  provider: "Australian Government / DFAT",
  type: "fellowship",
  category: "Government / Professional Development",

  summary:
    "Intensive short-term training programs for selected groups to address technical and professional skills gaps in partner countries.",

  description:
    "Australia Awards Short Courses are targeted programmes of intensive study or training designed to address specific technical, policy, or soft-skills needs among selected participant groups. These courses are generally less than three months in duration and are delivered by approved Australian higher education providers or registered training organisations either in Australia or in partner countries. The programmes are designed as practical development tools rather than long-term academic degrees.",

  eligibility:
    "Eligibility varies depending on the partner country, the technical theme of the course, and the target participant group defined by the relevant DFAT post or programme. Applicants are generally selected as part of specific cohorts identified for leadership, sector strengthening, institutional development, or policy implementation.",

  funding:
    "Funding arrangements vary by course and delivery model, but the programme generally covers approved training-related costs connected to the short course structure.",

  applicationProcess:
    "Australia Awards Short Courses are managed by DFAT overseas posts. Applicants should monitor the relevant DFAT post, Australia Awards office, or official programme channels for country-specific announcements, nomination processes, and application instructions.",

  fundingType: ["Short Course", "Professional Development"],
  amount: "Varies by programme",

  studyCountries: ["Australia", "Partner countries"],
  eligibleCountries: ["Country-specific"],

  studyLevel: ["Professional Training", "Short Course"],
  fields: ["Technical and professional development fields"],

  tags: ["Short Course", "Skills Development", "Government Program"],

  officialUrl: "https://www.dfat.gov.au/people-to-people/australia-awards",
  logoUrl: "",
  bannerUrl: "/images/Australia Awards Short Courses.png",

  isRecurring: true,
  featured: false
},
{
  id: "australia-for-asean-scholarships",
  title: "Australia for ASEAN Scholarships",
  provider: "Australian Government",
  type: "scholarship_program",
  category: "Government / Regional Leadership",

  summary:
    "Prestigious scholarships for the next generation of leaders from ASEAN member states.",

  description:
    "Australia for ASEAN Scholarships are prestigious international awards offered by the Australian Government to emerging leaders from ASEAN member states. They are part of Australia’s broader effort to strengthen regional partnerships, support human capital development, and build long-term people-to-people links across Southeast Asia and Australia.",

  eligibility:
    "Eligibility depends on the official scholarship round and programme guidance for ASEAN member states. Applicants should consult the official source for participating countries, eligible study areas, current call details, and application requirements.",

  funding:
    "Award coverage depends on the official scholarship cycle and programme design. Applicants should verify current benefits directly through the official source.",

  applicationProcess:
    "Applicants should monitor the official Australia Awards or Australian Government scholarship channels for current openings, participating ASEAN member states, eligible programmes, and application instructions.",

  fundingType: ["Scholarship", "Information Source"],
  amount: "Varies by official scholarship cycle",

  studyCountries: ["Australia"],
  eligibleCountries: ["ASEAN member states"],

  studyLevel: ["Varies"],
  fields: ["Country-specific or programme-specific"],

  tags: ["ASEAN", "Leadership", "Information Source"],

  officialUrl: "https://www.dfat.gov.au/people-to-people/australia-awards",
  logoUrl: "",
  bannerUrl: "/images/Australia for ASEAN.png",

  isRecurring: true,
  featured: false
},
{
  id: "overview-of-scholarships-in-japan",
  title: "Overview of Scholarships in Japan",
  provider: "Study in Japan / JASSO",
  type: "database",
  category: "Government / Information Source",

  summary:
    "A general information source explaining major scholarship routes in Japan, including MEXT, JASSO, local government scholarships, and private foundation support.",

  description:
    "This page serves as a broad information source for international students exploring scholarships in Japan. It explains that scholarships in Japan are often intended to provide partial support for tuition, living expenses, or other major study costs rather than covering every expense in full. It also introduces the main funding pathways available to international students, including the Japanese Government (MEXT) Scholarship, JASSO scholarships, scholarships from local governments and local international associations, and private foundation scholarships. Users should treat this page as a starting point for understanding the Japanese scholarship landscape and then follow the relevant official programme pages for current application guidance.",

  eligibility:
    "Eligibility depends on the specific scholarship route. Some awards are aimed at students applying before arrival in Japan, while others are only available after entering a Japanese institution. Requirements can vary by study level, age, nationality, academic performance, language ability, region, and institution. Users should always confirm the latest official conditions for the scholarship category they plan to pursue.",

  funding:
    "Scholarship support in Japan varies widely. Some programmes provide full government-funded support, while many others offer partial support for tuition, living costs, or both. Applicants should prepare a full financial plan and should not rely only on scholarships to cover all study-abroad costs.",

  applicationProcess:
    "Applicants should first identify which scholarship category matches their study level, timing, and eligibility. They should then consult the relevant official source, such as the MEXT scholarship route, JASSO, their intended Japanese institution, or the relevant local or private scholarship provider. Because many scholarship details change by year, institution, and country, this page should be used mainly as a reference point for locating the right official application channel.",

  fundingType: ["Information Source", "Scholarship Database"],
  amount: "Varies by scholarship type",

  studyCountries: ["Japan"],
  eligibleCountries: ["Varies by scholarship type"],

  studyLevel: ["Undergraduate", "Masters", "PhD", "Research", "Japanese Language", "Technical", "Professional"],
  fields: ["All fields"],

  tags: ["Japan", "Information Source", "Scholarship Overview"],

  officialUrl: "https://www.studyinjapan.go.jp/en/",
  logoUrl: "",
  bannerUrl: "/images/Japan Scholarships Overview.png",

  isRecurring: true,
  featured: false
},
{
  id: "japanese-government-mext-scholarship",
  title: "Japanese Government (MEXT) Scholarship",
  provider: "Ministry of Education, Culture, Sports, Science and Technology (MEXT)",
  type: "scholarship_program",
  category: "Government",

  summary:
    "A major Japanese government scholarship covering multiple study tracks for international students, including research, undergraduate, teacher training, Japanese studies, college of technology, specialized training, and YLP routes.",

  description:
    "The Japanese Government (MEXT) Scholarship is one of the main scholarship routes for international students who want to study in Japan. MEXT has invited international students to study in Japan at state expense since 1954. The programme includes seven categories: Research Students, Teacher Training Students, Undergraduate Students, Japanese Studies Students, College of Technology Students, Specialized Training College Students, and Young Leaders Program (YLP) Students. Depending on the category, applicants may apply through a Japanese embassy or consulate abroad, or through a Japanese university. The exact type, eligibility details, and recruitment timing can vary by country, institution, and scholarship category.",

  eligibility:
    "Eligibility differs by MEXT category. For example, Research Students are generally required to be under 35 and eligible for admission to a Japanese graduate school; Teacher Training Students must generally be under 35 and have significant active teaching experience; Undergraduate, College of Technology, and Specialized Training applicants are generally expected to be under 25 and meet prior schooling requirements; Japanese Studies applicants must be enrolled in a Japanese-language or Japan-related undergraduate programme outside Japan; and YLP applicants are generally expected to be under 40 with practical professional experience. Applicants should always check the latest official guidelines because detailed requirements may be updated or specified more precisely for each cycle.",

  funding:
    "MEXT scholarships generally include a monthly stipend, tuition exemption, and round-trip travel support. The monthly stipend differs by category: research students are shown in the 2025–2026 pamphlet at about ¥143,000 to ¥145,000 per month, undergraduate and related long-term study categories at about ¥117,000 per month, and YLP students at about ¥242,000 per month. Tuition is exempted and round-trip travel expenses are generally provided. :contentReference[oaicite:2]{index=2}",

  applicationProcess:
    "There are two main application routes. Under embassy recommendation, applicants are screened first by a Japanese embassy or consulate, usually through document review, written tests, and interviews. Under university recommendation, selected Japanese universities recommend candidates to MEXT, but not all universities have recommendation quotas. Application requirements, scholarship periods, and arrival timing can differ depending on the route and scholarship category, so applicants should confirm details either with the Japanese embassy in their country or with the intended Japanese university. :contentReference[oaicite:3]{index=3}",

  fundingType: ["Fully Funded"],
  amount: "Monthly stipend + tuition exemption + round-trip travel",

  studyCountries: ["Japan"],
  eligibleCountries: ["Country-specific by route and category"],

  studyLevel: [
    "Research",
    "Teacher Training",
    "Undergraduate",
    "Japanese Studies",
    "College of Technology",
    "Specialized Training",
    "Young Leaders Program"
  ],
  fields: ["All fields", "Category-specific"],

  tags: ["Japan", "Government Scholarship", "MEXT"],

  officialUrl: "https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/",
  logoUrl: "",
  bannerUrl: "/images/MEXT Scholarship.png",

  isRecurring: true,
  featured: true
},
{
  id: "jasso-scholarships-japan",
  title: "JASSO Scholarships",
  provider: "Japan Student Services Organization (JASSO)",
  type: "scholarship_program",
  category: "Government / Student Support",

  summary:
    "JASSO offers support for privately financed international students in Japan and exchange students studying in Japan under institutional agreements.",

  description:
    "The Japan Student Services Organization (JASSO) provides two major scholarship routes for international students. The first is the Monbukagakusho Honors Scholarship for Privately Financed International Students, which supports privately financed students enrolled in universities, graduate schools, junior colleges, colleges of technology, specialized training colleges, preparatory courses, and Japanese language institutions in Japan. The second is the Student Exchange Support Program (Scholarship for Study in Japan under Agreement), which supports qualified students accepted by Japanese institutions under exchange agreements or similar arrangements with their home institutions. :contentReference[oaicite:4]{index=4}",

  eligibility:
    "For the Honors Scholarship, applicants must generally be privately financed international students with strong academic performance and financial need, and must normally hold Student residence status. Additional conditions may include grade point requirements, language standards, limits on remittances from family, and restrictions on receiving other scholarships at the same time. For the Student Exchange Support Program, students must usually be accepted by a Japanese institution under a formal exchange arrangement, show academic merit and good character, demonstrate financial need, and return to their home institution after the exchange period. :contentReference[oaicite:5]{index=5} :contentReference[oaicite:6]{index=6}",

  funding:
    "For the 2025 fiscal year pamphlet, the Honors Scholarship is listed at ¥48,000 per month for graduate schools, undergraduate universities, junior colleges, colleges of technology, specialized training colleges, preparatory Japanese language courses by private universities and junior colleges, advanced courses, and university preparatory courses, while Japanese language institutions are listed at ¥30,000 per month. The Student Exchange Support Program is listed at ¥80,000 per month for eligible exchange students. :contentReference[oaicite:7]{index=7} :contentReference[oaicite:8]{index=8}",

  applicationProcess:
    "Applications for the Honors Scholarship are generally handled through the student’s Japanese school, which may recommend eligible applicants to JASSO. Some applicants may also be selected through the Examination for Japanese University Admission for International Students (EJU) reservation route before arriving in Japan. For the Student Exchange Support Program, applicants should contact their current university or the host Japanese institution under the exchange agreement for details. Since school-level recommendation and quota systems can differ, applicants should always confirm the procedure directly with the relevant institution. :contentReference[oaicite:9]{index=9}",

  fundingType: ["Scholarship", "Exchange Support"],
  amount: "¥30,000–¥80,000 per month depending on scheme",

  studyCountries: ["Japan"],
  eligibleCountries: ["Varies by programme"],

  studyLevel: ["Language Study", "Undergraduate", "Masters", "PhD", "Research", "Exchange"],
  fields: ["All fields"],

  tags: ["Japan", "JASSO", "Student Support", "Exchange"],

  officialUrl: "https://www.jasso.go.jp/en/",
  logoUrl: "",
  bannerUrl: "/images/JASSO Scholarships.png",

  isRecurring: true,
  featured: false
},
{
  id: "rhodes-scholarship",
  title: "Rhodes Scholarship",
  provider: "Rhodes Trust",
  type: "scholarship_program",
  category: "Prestigious / Leadership / Information Source",

  summary:
    "A fully funded postgraduate scholarship for exceptional young leaders from around the world to study full-time at the University of Oxford.",

  description:
    "The Rhodes Scholarship is one of the world’s most prestigious postgraduate awards. It offers outstanding young people from around the world the opportunity to undertake full-time postgraduate study at the University of Oxford while joining an international community committed to leadership, service, and global understanding. The scholarship is fully funded and is designed not only to support academic excellence, but also to develop public-spirited leaders who seek to make a positive difference in the world. Scholars usually study in Oxford for two or more years and may apply for most full-time postgraduate courses offered by the University of Oxford.",

  eligibility:
    "Eligibility depends on the constituency through which the applicant applies, so candidates must check the official Rhodes eligibility rules for their country or region. In general, applicants are expected to demonstrate outstanding academic achievement, strong character, commitment to service, leadership potential, and sustained achievement outside the classroom. The detailed criteria and age or nationality requirements may vary slightly by constituency, so applicants should always confirm the latest official conditions before applying.",

  funding:
    "The Rhodes Scholarship is fully funded. It covers University of Oxford course fees and provides an annual stipend for living expenses. For the 2025–26 academic year, the stipend is listed as £20,400 per year (£1,700 per month). The Rhodes Trust also covers the Oxford application fee, student visa fee, International Health Surcharge, two economy-class flights to and from the UK, and a settling-in allowance. Additional assistance may also be available for scholars continuing to a second course in Oxford, including visa-related support.",

  applicationProcess:
    "Applicants must apply through the Rhodes Scholarship constituency for their country or region and should carefully review the official application guidance before starting. The process is competitive and usually requires academic records, references, personal statements, and evidence of leadership, service, and achievement. Because application periods open and close on a yearly cycle, applicants should use the official Rhodes website to confirm whether applications are currently open, closed, or expected to reopen for the next Oxford entry year.",

  fundingType: ["Fully Funded", "Information Source"],
  amount: "Oxford fees + stipend + visa, health surcharge, flights, and settling-in support",

  studyCountries: ["United Kingdom"],
  eligibleCountries: ["Constituency-specific"],

  studyLevel: ["Postgraduate", "Masters", "DPhil / PhD"],
  fields: ["Most full-time postgraduate courses at Oxford"],

  tags: ["Oxford", "Leadership", "Prestigious Scholarship", "Information Source"],

  officialUrl: "https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/",
  logoUrl: "",
  bannerUrl: "/images/Rhodes.png",

  isRecurring: true,
  featured: true
}



];