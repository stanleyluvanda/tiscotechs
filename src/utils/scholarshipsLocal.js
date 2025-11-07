// src/utils/scholarshipsLocal.js
const KEYS = ["partnerScholarships", "scholarships", "postedScholarships"];

export function loadLocalScholarships() {
  const out = [];
  for (const k of KEYS) {
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]");
      if (Array.isArray(arr)) out.push(...arr);
    } catch {}
  }
  // normalize (include all fields ScholarshipDetail might render)
  return out.map((s) => ({
    id: s.id || s.scholarshipId || `sch_${Math.random().toString(36).slice(2)}`,
    title: s.title || s.name || "Untitled Scholarship",
    deadline: s.deadline || s.closeDate || s.dueDate || "",
    createdAt: s.createdAt || s.postedAt || s.created || s.timestamp || Date.now(),
    status: (s.status || "Open").toString(),
    partnerId: s.partnerId || s.ownerId || s.postedById || "",
    postedByEmail: s.postedByEmail || s.email || s.partnerEmail || "",
    orgName: s.orgName || s.organization || s.university || s.provider || "",

    description: s.description || s.summary || "",
    amount: s.amount || s.value || "",
    link: s.link || s.applyLink || s.url || "",

    // extra fields used by the detail page
    provider: s.provider || s.orgName || s.organization || s.university || "",
    country: s.country || "",
    level: s.level || "",
    field: s.field || "",
    fundingType: Array.isArray(s.fundingType)
      ? s.fundingType
      : s.fundingType
      ? [s.fundingType]
      : [],
    partnerApplyUrl: s.partnerApplyUrl || "",
    eligibility: s.eligibility || "",
    benefits: s.benefits || "",
    howToApply: s.howToApply || "",
    imageUrl: s.imageUrl || "",
    imageData: s.imageData || "",
  }));
}

export function saveLocalScholarship(s, preferredKey = "partnerScholarships") {
  const item = {
    id: s.id || `sch_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    title: s.title || "Untitled Scholarship",
    deadline: s.deadline || "",
    createdAt: s.createdAt || Date.now(),
    status: s.status || "Open",
    partnerId: s.partnerId || "",
    postedByEmail: s.partnerEmail || s.postedByEmail || "",
    orgName: s.orgName || s.provider || "",

    description: s.description || "",
    amount: s.amount || "",
    link: s.link || "",

    // ✅ store everything needed by the detail page
    provider: s.provider || s.orgName || "",
    country: s.country || "",
    level: s.level || "",
    field: s.field || "",
    fundingType: Array.isArray(s.fundingType)
      ? s.fundingType
      : s.fundingType
      ? [s.fundingType]
      : [],
    partnerApplyUrl: s.partnerApplyUrl || "",
    eligibility: s.eligibility || "",
    benefits: s.benefits || "",
    howToApply: s.howToApply || "",
    imageUrl: (s.imageUrl || "").trim(),
    imageData: s.imageData || "",
  };

  try {
    const arr = JSON.parse(localStorage.getItem(preferredKey) || "[]");
    arr.unshift(item);
    localStorage.setItem(preferredKey, JSON.stringify(arr));
    window.dispatchEvent(new Event("storage"));
  } catch {}
  return item;
}