// src/data/internationalStudentNews.js

export const INTERNATIONAL_STUDENT_NEWS = [
  {
    id: "news-001",
    slug: "sample-us-f1-student-policy-update",
    title: "Sample U.S. F-1 Student Policy Update",
    excerpt:
      "This is sample content showing how an international student policy update will appear on ScholarsKnowledge.",
    country: "United States",
    countryCode: "US",
    category: "Visa & Immigration",
    importance: "Critical",
    status: "published",

    image:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80",

    publishedAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-07-22T10:00:00.000Z",

    publishedBy: "ScholarsKnowledge",

    summary:
      "This demonstration article shows how ScholarsKnowledge can explain a policy development affecting international students in the United States.",

    whatChanged: `
      <p>This section will explain the policy or education-system change in clear language.</p>
      <p>The final published article should rely on an official government, embassy, immigration, or university source.</p>
    `,

    whoIsAffected: [
      "Prospective international students",
      "Current F-1 students",
      "Students preparing visa applications",
    ],

    effectiveDate: "To be confirmed from the official source",

    studentActions: [
      "Review the official announcement.",
      "Confirm whether the change applies to your application.",
      "Contact the appropriate university international student office when necessary.",
    ],

    officialSourceName: "Official source to be added",
    officialSourceUrl: "",

    relatedCountries: ["United States"],
    tags: ["F-1", "Student visa", "United States"],
  },

  {
    id: "news-002",
    slug: "sample-canada-study-permit-update",
    title: "Sample Canada Study Permit Update",
    excerpt:
      "A demonstration of how a Canadian study-permit update can be summarized for prospective international students.",
    country: "Canada",
    countryCode: "CA",
    category: "Visa & Immigration",
    importance: "Important",
    status: "published",

    image:
      "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1600&q=80",

    publishedAt: "2026-07-21T14:00:00.000Z",
    updatedAt: "2026-07-21T14:00:00.000Z",

    publishedBy: "ScholarsKnowledge",

    summary:
      "This sample shows the structure for explaining a study-permit development affecting students planning to study in Canada.",

    whatChanged: `
      <p>The full article will explain the change, the previous position, and the new requirement.</p>
    `,

    whoIsAffected: [
      "New study-permit applicants",
      "Students applying to Canadian institutions",
    ],

    effectiveDate: "To be confirmed from the official source",

    studentActions: [
      "Check the latest official study-permit requirements.",
      "Review financial and admission documentation carefully.",
    ],

    officialSourceName: "Official source to be added",
    officialSourceUrl: "",

    relatedCountries: ["Canada"],
    tags: ["Canada", "Study permit", "International students"],
  },

  {
    id: "news-003",
    slug: "sample-uk-international-student-work-rights-update",
    title: "Sample UK International Student Work-Rights Update",
    excerpt:
      "This sample demonstrates how changes to international student employment conditions could be presented.",
    country: "United Kingdom",
    countryCode: "GB",
    category: "Work Rights",
    importance: "Information",
    status: "published",

    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=80",

    publishedAt: "2026-07-20T09:30:00.000Z",
    updatedAt: "2026-07-20T09:30:00.000Z",

    publishedBy: "ScholarsKnowledge",

    summary:
      "This demonstration article shows how ScholarsKnowledge can explain student work-rights developments in the United Kingdom.",

    whatChanged: `
      <p>The final article will describe the applicable work rules and identify the students affected.</p>
    `,

    whoIsAffected: [
      "Current international students",
      "Students considering study in the United Kingdom",
    ],

    effectiveDate: "To be confirmed from the official source",

    studentActions: [
      "Check the work conditions attached to your immigration permission.",
      "Ask your institution for guidance before changing employment arrangements.",
    ],

    officialSourceName: "Official source to be added",
    officialSourceUrl: "",

    relatedCountries: ["United Kingdom"],
    tags: ["United Kingdom", "Student work", "International education"],
  },
];

export function getPublishedInternationalStudentNews() {
  return INTERNATIONAL_STUDENT_NEWS.filter(
    (article) => article.status === "published"
  ).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() -
      new Date(a.publishedAt).getTime()
  );
}

export function getInternationalStudentNewsBySlug(slug) {
  return INTERNATIONAL_STUDENT_NEWS.find(
    (article) =>
      article.status === "published" && article.slug === slug
  );
}