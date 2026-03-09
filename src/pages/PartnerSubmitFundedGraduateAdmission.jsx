// src/pages/PartnerSubmitFundedGraduateAdmission.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { REGIONS } from "../data/regions";
import { FIELDS_OF_STUDY } from "../data/fieldsOfStudy";
import { saveLocalScholarship } from "../utils/scholarshipsLocal"; // reuse local fallback helper
import Quill from "quill";
import "quill/dist/quill.snow.css";

const API_BASE = (
  import.meta.env.VITE_SCHOLARSHIPS_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/+$/, "");

function isCloudfrontUrl(u = "") {
  return /^https:\/\/[^/]+\.cloudfront\.net\//i.test(String(u || ""));
}

function pickCloudfrontUrl(obj) {
  if (!obj || typeof obj !== "object") return "";
  return (
    obj.cloudfrontUrl ||
    obj.cloudFrontUrl ||
    obj.publicUrl ||
    obj.url ||
    obj.cdnUrl ||
    obj.cdnURL ||
    obj.location ||
    ""
  );
}

async function getUploadUrl({ fileName, contentType }) {
  if (!API_BASE) throw new Error("Missing API_BASE (VITE_SCHOLARSHIPS_API_BASE).");

  const res = await fetch(`${API_BASE}/api/scholarships/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, contentType }),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`upload-url HTTP ${res.status}: ${txt}`);

  let j = {};
  try {
    j = JSON.parse(txt);
  } catch {}

  const uploadUrl = j.uploadUrl;
  const publicUrl = pickCloudfrontUrl(j);

  if (!uploadUrl || !publicUrl) {
    throw new Error(`upload-url response missing fields. Got: ${txt}`);
  }

  return { uploadUrl, publicUrl };
}

async function putFileToS3(uploadUrl, file) {
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) {
    const txt = await put.text().catch(() => "");
    throw new Error(`PUT upload failed HTTP ${put.status}: ${txt}`);
  }
}

async function importHostedUrlToCloudfront(url) {
  if (!API_BASE) throw new Error("Missing API_BASE.");

  const res = await fetch(`${API_BASE}/api/scholarships/import-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`import-image HTTP ${res.status}: ${txt}`);

  let j = {};
  try {
    j = JSON.parse(txt);
  } catch {}

  const cf = pickCloudfrontUrl(j);
  if (!cf) throw new Error(`import-image 200 OK but no CloudFront URL. Got: ${txt}`);

  return { ...j, cloudfrontUrl: cf };
}

/** Graduate-only levels */
const LEVEL_OPTIONS = ["Masters", "PhD", "Masters / PhD"];

const FUNDING_OPTIONS = [
  "Full Funding",
  "Partial Funding",
  "Tuition Only",
  "Monthly Stipend",
  "Research Assistantship",
  "Teaching Assistantship",
  "Fellowship",
  "Grant",
];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

function getPartnerEmail() {
  try {
    const raw = localStorage.getItem("partnerAuth");
    if (!raw) return "";
    const obj = JSON.parse(raw);
    return obj.email || obj.userEmail || obj.username || obj.user || obj.name || "";
  } catch {
    return "";
  }
}

function formatDateForDisplay(value) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PartnerSubmitFundedGraduateAdmission() {
  const [form, setForm] = useState({
    title: "",
    provider: "",
    continent: "All",
    country: "Multiple",
    level: "",
    field: "",
    fundingType: [],
    deadlineMode: "single",
    deadline: "",
    deadlineOpen: "",
    deadlineClose: "",
    link: "",
    partnerApplyUrl: "",

    description: "",
    eligibility: "",
    benefits: "",
    howToApply: "",
    additionalInformation: "",

    amount: "",
    notes: "",

    imageUrl: "",
    imageData: "",

    // ✅ include these from the start
    providerLogoUrl: "",
    providerLogoData: "",
  });

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgPreview, setImgPreview] = useState("");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");

  const partnerEmail = getPartnerEmail();

  const [importingHosted, setImportingHosted] = useState(false);
  const pendingHostedRef = useRef("");
  const importTimerRef = useRef(null);
  const lastImportedRef = useRef("");

  const [importingLogoHosted, setImportingLogoHosted] = useState(false);
  const pendingLogoHostedRef = useRef("");
  const logoImportTimerRef = useRef(null);
  const lastLogoImportedRef = useRef("");

  async function forceImportHostedUrl(rawUrl) {
    const raw = String(rawUrl || "").trim();
    if (!raw) return;

    const isHttp = /^https?:\/\//i.test(raw);
    if (!isHttp) return;

    if (isCloudfrontUrl(raw)) {
      setErr("");
      setImgPreview(raw);
      setForm((f) => ({ ...f, imageUrl: raw, imageData: "" }));
      return;
    }

    if (pendingHostedRef.current === raw) return;

    try {
      setErr("");
      setImportingHosted(true);
      pendingHostedRef.current = raw;

      const j = await importHostedUrlToCloudfront(raw);
      const cf = j?.cloudfrontUrl || j?.publicUrl || j?.cloudFrontUrl;
      if (!cf) throw new Error("Import succeeded but no CloudFront URL returned.");

      lastImportedRef.current = raw;

      setImgPreview(cf);
      setForm((f) => ({ ...f, imageUrl: cf, imageData: "" }));
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e || "Could not import hosted URL to CloudFront."));
    } finally {
      setImportingHosted(false);
      pendingHostedRef.current = "";
    }
  }

  async function forceImportLogoHostedUrl(rawUrl) {
    const raw = String(rawUrl || "").trim();
    if (!raw) return;

    const isHttp = /^https?:\/\//i.test(raw);
    if (!isHttp) return;

    if (isCloudfrontUrl(raw)) {
      setErr("");
      setLogoPreview(raw);
      setForm((f) => ({ ...f, providerLogoUrl: raw, providerLogoData: "" }));
      return;
    }

    if (pendingLogoHostedRef.current === raw) return;

    try {
      setErr("");
      setImportingLogoHosted(true);
      pendingLogoHostedRef.current = raw;

      const j = await importHostedUrlToCloudfront(raw);
      const cf = j?.cloudfrontUrl || j?.publicUrl || j?.cloudFrontUrl;
      if (!cf) throw new Error("Import succeeded but no CloudFront URL returned.");

      lastLogoImportedRef.current = raw;

      setLogoPreview(cf);
      setForm((f) => ({ ...f, providerLogoUrl: cf, providerLogoData: "" }));
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e || "Could not import hosted logo URL to CloudFront."));
    } finally {
      setImportingLogoHosted(false);
      pendingLogoHostedRef.current = "";
    }
  }

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErr("Please choose a valid image file (PNG/JPG/SVG).");
      return;
    }

    setErr("");
    setUploadingImg(true);

    try {
      if (!API_BASE) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          setImgPreview(dataUrl);
          setForm((f) => ({ ...f, imageData: dataUrl, imageUrl: "" }));
          setUploadingImg(false);
        };
        reader.onerror = () => {
          setUploadingImg(false);
          setErr("Failed to read the selected image.");
        };
        reader.readAsDataURL(file);
        return;
      }

      const safeName = (file.name || "image").replace(/[^\w.\-]+/g, "_");
      const j = await getUploadUrl({ fileName: safeName, contentType: file.type });

      if (!j?.uploadUrl || !j?.publicUrl) throw new Error("Missing uploadUrl/publicUrl from backend.");

      await putFileToS3(j.uploadUrl, file);

      setImgPreview(j.publicUrl);
      setForm((f) => ({ ...f, imageUrl: j.publicUrl, imageData: "" }));
    } catch (err2) {
      console.error(err2);
      setErr(String(err2?.message || err2 || "Image upload failed. Please try again."));
    } finally {
      setUploadingImg(false);
    }
  };

  const onPickLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErr("Please choose a valid logo image file (PNG/JPG/SVG).");
      return;
    }

    setErr("");
    setUploadingLogo(true);

    try {
      if (!API_BASE) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          setLogoPreview(dataUrl);
          setForm((f) => ({ ...f, providerLogoData: dataUrl, providerLogoUrl: "" }));
          setUploadingLogo(false);
        };
        reader.onerror = () => {
          setUploadingLogo(false);
          setErr("Failed to read the selected logo image.");
        };
        reader.readAsDataURL(file);
        return;
      }

      const safeName = (file.name || "logo").replace(/[^\w.\-]+/g, "_");
      const j = await getUploadUrl({ fileName: safeName, contentType: file.type });

      if (!j?.uploadUrl || !j?.publicUrl) throw new Error("Missing uploadUrl/publicUrl from backend.");

      await putFileToS3(j.uploadUrl, file);

      setLogoPreview(j.publicUrl);
      setForm((f) => ({ ...f, providerLogoUrl: j.publicUrl, providerLogoData: "" }));
    } catch (err2) {
      console.error(err2);
      setErr(String(err2?.message || err2 || "Logo upload failed. Please try again."));
    } finally {
      setUploadingLogo(false);
    }
  };

  const clearImage = () => {
    setImgPreview("");
    setForm((f) => ({ ...f, imageData: "", imageUrl: "" }));
  };

  const clearLogo = () => {
    setLogoPreview("");
    setForm((f) => ({ ...f, providerLogoData: "", providerLogoUrl: "" }));
  };

  const countryOptions = useMemo(() => {
    if (form.continent === "All") {
      const set = new Set();
      for (const list of Object.values(REGIONS)) list.forEach((c) => set.add(c));
      return ["Multiple", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }
    return ["Multiple", ...(REGIONS[form.continent] || [])];
  }, [form.continent]);

  const onChange = (e) => {
    const { name, value } = e.target;

    setForm((f) => {
      if (name === "continent") return { ...f, continent: value, country: "Multiple" };
      if (name === "imageUrl") return { ...f, imageUrl: value, imageData: "" };
      if (name === "providerLogoUrl") return { ...f, providerLogoUrl: value, providerLogoData: "" };
      return { ...f, [name]: value };
    });

    if (name === "imageUrl") setImgPreview("");
    if (name === "providerLogoUrl") setLogoPreview("");
  };

  useEffect(() => {
    const raw = String(form.imageUrl || "").trim();

    if (importTimerRef.current) clearTimeout(importTimerRef.current);
    if (!raw) return;

    if (isCloudfrontUrl(raw)) {
      setImgPreview(raw);
      return;
    }

    const isHttp = /^https?:\/\//i.test(raw);
    if (!isHttp) return;

    if (lastImportedRef.current === raw) return;

    importTimerRef.current = setTimeout(() => {
      forceImportHostedUrl(raw);
    }, 700);

    return () => {
      if (importTimerRef.current) clearTimeout(importTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.imageUrl]);

  useEffect(() => {
    const raw = String(form.providerLogoUrl || "").trim();

    if (logoImportTimerRef.current) clearTimeout(logoImportTimerRef.current);
    if (!raw) return;

    if (isCloudfrontUrl(raw)) {
      setLogoPreview(raw);
      return;
    }

    const isHttp = /^https?:\/\//i.test(raw);
    if (!isHttp) return;

    if (lastLogoImportedRef.current === raw) return;

    logoImportTimerRef.current = setTimeout(() => {
      forceImportLogoHostedUrl(raw);
    }, 700);

    return () => {
      if (logoImportTimerRef.current) clearTimeout(logoImportTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.providerLogoUrl]);

  const toggleFunding = (v) => {
    setForm((f) => {
      const has = f.fundingType.includes(v);
      return {
        ...f,
        fundingType: has ? f.fundingType.filter((x) => x !== v) : [...f.fundingType, v],
      };
    });
  };

  const descHostRef = useRef(null);
  const eligHostRef = useRef(null);
  const beneHostRef = useRef(null);
  const howHostRef = useRef(null);
  const additionalHostRef = useRef(null);

  const descQuillRef = useRef(null);
  const eligQuillRef = useRef(null);
  const beneQuillRef = useRef(null);
  const howQuillRef = useRef(null);
  const additionalQuillRef = useRef(null);

  useEffect(() => {
    const init = (host, key, placeholder) => {
      if (!host) return null;
      if (host.dataset.inited === "1" || host.__quill) return host.__quill;

      const q = new Quill(host, { theme: "snow", placeholder, modules: quillModules });
      host.dataset.inited = "1";
      host.__quill = q;

      q.on("text-change", () => {
        setForm((f) => ({ ...f, [key]: q.root.innerHTML }));
      });

      return q;
    };

    descQuillRef.current = init(descHostRef.current, "description", "Describe the funded graduate admission opportunity…");
    eligQuillRef.current = init(eligHostRef.current, "eligibility", "Who qualifies? Add bullet points for clarity.");
    beneQuillRef.current = init(beneHostRef.current, "benefits", "What is funded? Tuition, stipend, etc.");
    howQuillRef.current = init(howHostRef.current, "howToApply", "Steps to apply. Include links if needed.");
    additionalQuillRef.current = init(additionalHostRef.current,"additionalInformation","Add any extra information applicants should know.");

    ["description", "eligibility", "benefits", "howToApply","additionalInformation"].forEach((k) =>
      setForm((f) => ({ ...f, [k]: f[k] ?? "" }))
    );

    return () => {
      descQuillRef.current = null;
      eligQuillRef.current = null;
      beneQuillRef.current = null;
      howQuillRef.current = null;
      additionalQuillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!form.title.trim() || !form.provider.trim()) {
      setErr("Please provide both Title and Provider.");
      return;
    }
    if (!form.level) {
      setErr("Please select an Academic Level.");
      return;
    }
    if (!partnerEmail) {
      setErr("You must be logged in as a Partner to submit (missing partner email).");
      return;
    }

    if (importingHosted) {
      setErr("Please wait: importing hosted image URL to CloudFront…");
      return;
    }
    if (importingLogoHosted) {
      setErr("Please wait: importing provider logo URL to CloudFront…");
      return;
    }

    const imgUrl = String(form.imageUrl || "").trim();
    if (imgUrl && !isCloudfrontUrl(imgUrl)) {
      setErr("Banner Image URL must be CloudFront (wait for import) or upload the file.");
      return;
    }

    const logoUrl = String(form.providerLogoUrl || "").trim();
    if (logoUrl && !isCloudfrontUrl(logoUrl)) {
      setErr("Provider Logo URL must be CloudFront (wait for import) or upload the file.");
      return;
    }

    let finalDeadline = "";

if (form.deadlineMode === "single") {
  finalDeadline = form.deadline
    ? formatDateForDisplay(form.deadline)
    : "";
} else {
  const openText = form.deadlineOpen
    ? formatDateForDisplay(form.deadlineOpen)
    : "";
  const closeText = form.deadlineClose
    ? formatDateForDisplay(form.deadlineClose)
    : "";

  if (openText && closeText) {
    finalDeadline = `${openText} – ${closeText}`;
  } else if (openText) {
    finalDeadline = `Opens ${openText}`;
  } else if (closeText) {
    finalDeadline = `Closes ${closeText}`;
  }
}

    const payload = {
      // ✅ the differentiator
      contentType: "FUNDED_GRAD_ADMISSION",

      title: form.title,
      provider: form.provider,
      country: form.country,
      level: form.level,
      field: form.field,
      fundingType: form.fundingType,
      /*deadline: form.deadline,*/
      deadline: finalDeadline,
      link: form.link,
      partnerApplyUrl: form.partnerApplyUrl,

      description: form.description,
      eligibility: form.eligibility,
      benefits: form.benefits,
      howToApply: form.howToApply,
      additionalInformation: form.additionalInformation,


      amount: form.amount,
      notes: form.notes,

      imageUrl: imgUrl,
      imageData: form.imageData || "",

      providerLogoUrl: logoUrl,
      providerLogoData: form.providerLogoData || "",

      partnerEmail: String(partnerEmail),
      createdAt: Date.now(),
      status: "pending",
    };

    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/scholarships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const txt = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt}`);

        let data = {};
        try {
          data = JSON.parse(txt);
        } catch {}

        setMsg(`Saved! Funded Graduate Admission #${data?.id ?? ""} created.`);
        setErr("");
        resetFormAndEditors();
        return;
      } catch (apiErr) {
        console.warn("Submit via API failed; falling back to localStorage:", apiErr);
      }
    }

    try {
      const saved = saveLocalScholarship(payload, "scholarships_local");
      setMsg(
        `Submitted (saved locally). ${saved?.id ? `#${saved.id}` : ""}`
      );
      setErr("");
      resetFormAndEditors();
    } catch (localErr) {
      setErr(`Failed to submit: ${localErr?.message || "Unknown error"}`);
    }
  };

  function resetFormAndEditors() {
    setForm({
      title: "",
      provider: "",
      continent: "All",
      country: "Multiple",
      level: "",
      field: "",
      fundingType: [],
      deadline: "",
      link: "",
      partnerApplyUrl: "",
      description: "",
      eligibility: "",
      benefits: "",
      howToApply: "",
      additionalInformation: "",
      amount: "",
      notes: "",
      imageUrl: "",
      imageData: "",
      providerLogoUrl: "",
      providerLogoData: "",
    });

    setImgPreview("");
    lastImportedRef.current = "";
    pendingHostedRef.current = "";
    setImportingHosted(false);

    setLogoPreview("");
    lastLogoImportedRef.current = "";
    pendingLogoHostedRef.current = "";
    setImportingLogoHosted(false);

    if (importTimerRef.current) {
      clearTimeout(importTimerRef.current);
      importTimerRef.current = null;
    }
    if (logoImportTimerRef.current) {
      clearTimeout(logoImportTimerRef.current);
      logoImportTimerRef.current = null;
    }

    [descQuillRef, eligQuillRef, beneQuillRef, howQuillRef,additionalQuillRef].forEach((r) => {
      if (r.current) r.current.setContents([]);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef3ff] via-white to-[#f5f7fb]">
      <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Submit Funded Graduate Admission</h1>
        <p className="mt-1 text-slate-600">
          Partners and universities can list funded graduate admission opportunities here.
        </p>

        <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-6 md:p-8">
            {!partnerEmail && (
              <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800">
                You’re not logged in as a Partner. Please{" "}
                <a href="/partner/login" className="underline">
                  log in
                </a>{" "}
                to submit and manage your listings.
              </div>
            )}

            {msg && (
              <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-700">
                {msg}
              </div>
            )}
            {err && (
              <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700">
                {err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium">Program Title/Name *</div>
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    required
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">University name *</div>
                  <input
                    name="provider"
                    value={form.provider}
                    onChange={onChange}
                    required
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Continent</div>
                  <select
                    name="continent"
                    value={form.continent}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    {["All", ...Object.keys(REGIONS)].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Country</div>
                  <select
                    name="country"
                    value={form.country}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    {countryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Academic Level *</div>
                  <select
                    name="level"
                    value={form.level}
                    onChange={onChange}
                    required
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">— Select —</option>
                    {LEVEL_OPTIONS.map((lv) => (
                      <option key={lv} value={lv}>
                        {lv}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Field of Study</div>
                  <select
                    name="field"
                    value={form.field}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">— Select —</option>
                    {FIELDS_OF_STUDY.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>

                {/*<label className="block">
                  <div className="text-sm font-medium">Deadline</div>
                  <input
                    type="date"
                    name="deadline"
                    value={form.deadline}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>*/}

                {/*<label className="block">
  <div className="text-sm font-medium">Deadline</div>
  <input
    type="text"
    name="deadline"
    value={form.deadline}
    onChange={onChange}
    placeholder="e.g. December 1, 2026 – January 15, 2027"
    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
  />
  <p className="mt-1 text-xs text-slate-500">
    You may enter a single deadline or an application window.
  </p>
</label>*/}

<div className="block md:col-span-2">
  <div className="text-sm font-medium">Deadline</div>

  <div className="mt-2 flex flex-wrap gap-4">
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        type="radio"
        name="deadlineMode"
        value="single"
        checked={form.deadlineMode === "single"}
        onChange={onChange}
      />
      <span>Single deadline</span>
    </label>

    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        type="radio"
        name="deadlineMode"
        value="range"
        checked={form.deadlineMode === "range"}
        onChange={onChange}
      />
      <span>Open and close deadline</span>
    </label>
  </div>

  {form.deadlineMode === "single" ? (
    <div className="mt-3">
      <input
        type="date"
        name="deadline"
        value={form.deadline}
        onChange={onChange}
        className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
      />
    </div>
  ) : (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="block">
        <div className="text-xs text-slate-600 mb-1">Opening date</div>
        <input
          type="date"
          name="deadlineOpen"
          value={form.deadlineOpen}
          onChange={onChange}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <div className="text-xs text-slate-600 mb-1">Closing date</div>
        <input
          type="date"
          name="deadlineClose"
          value={form.deadlineClose}
          onChange={onChange}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </label>
    </div>
  )}

  <p className="mt-2 text-xs text-slate-500">
    Choose either one final deadline or an application window.
  </p>
</div>

                <label className="block">
                  <div className="text-sm font-medium">Provider URL</div>
                  <input
                    name="link"
                    value={form.link}
                    onChange={onChange}
                    placeholder="https://example.edu/grad-admissions"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block md:col-span-2">
                  <div className="text-sm font-medium">Apply URL (preferred)</div>
                  <input
                    name="partnerApplyUrl"
                    value={form.partnerApplyUrl}
                    onChange={onChange}
                    placeholder="https://example.edu/apply"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block md:col-span-2">
                  <div className="text-sm font-medium">Funding Summary (optional)</div>
                  <input
                    name="amount"
                    value={form.amount}
                    onChange={onChange}
                    placeholder="e.g., Full tuition + stipend, or Up to $25,000/year"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    This appears publicly if provided.
                  </p>
                </label>
              </div>

              {/* Provider Logo */}
              <div className="bg-slate-50/60 p-4 rounded-lg border border-slate-200">
                <div className="text-sm font-medium">Provider Logo</div>

                <label className="block mt-3">
                  <div className="text-sm font-medium">Hosted Logo URL</div>
                  <input
                    name="providerLogoUrl"
                    value={form.providerLogoUrl}
                    onChange={onChange}
                    onPaste={(e) => {
                      const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
                      setTimeout(() => forceImportLogoHostedUrl(pasted), 0);
                    }}
                    onBlur={() => forceImportLogoHostedUrl(form.providerLogoUrl)}
                    placeholder="https://example.edu/logo.png"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                  {(uploadingLogo || importingLogoHosted) && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      {importingLogoHosted ? "Importing hosted logo URL to CloudFront…" : "Processing logo…"}
                    </div>
                  )}
                </label>

                <div className="my-3 text-center text-xs text-slate-500">— or —</div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center px-3 py-2 border border-slate-300 rounded cursor-pointer text-sm hover:bg-white">
                    <input type="file" accept="image/*" onChange={onPickLogo} className="hidden" />
                    Choose Logo…
                  </label>
                  {uploadingLogo && <span className="text-xs text-slate-500">Processing logo…</span>}
                  {!!logoPreview && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="text-xs border border-slate-300 rounded px-2 py-1 hover:bg-white"
                    >
                      Remove logo
                    </button>
                  )}
                </div>

                {logoPreview ? (
                  <div className="mt-3">
                    <div className="text-xs text-slate-600 mb-1">Preview</div>
                    <img
                      src={logoPreview}
                      alt="Provider logo preview"
                      className="h-14 w-14 object-contain bg-white rounded border border-slate-200 p-1"
                    />
                    {isCloudfrontUrl(logoPreview) && (
                      <div className="mt-1 text-[11px] text-green-700">✅ CloudFront URL detected</div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Banner */}
              <div className="bg-slate-50/60 p-4 rounded-lg border border-slate-200">
                <div className="text-sm font-medium">Opportunity Banner</div>

                <label className="block mt-3">
                  <div className="text-sm font-medium">Hosted Image URL</div>
                  <input
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={onChange}
                    onPaste={(e) => {
                      const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
                      setTimeout(() => forceImportHostedUrl(pasted), 0);
                    }}
                    onBlur={() => forceImportHostedUrl(form.imageUrl)}
                    placeholder="https://example.edu/banner.png"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                  {(uploadingImg || importingHosted) && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      {importingHosted ? "Importing hosted URL to CloudFront…" : "Processing image…"}
                    </div>
                  )}
                </label>

                <div className="my-3 text-center text-xs text-slate-500">— or —</div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center px-3 py-2 border border-slate-300 rounded cursor-pointer text-sm hover:bg-white">
                    <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
                    Choose Image…
                  </label>
                  {uploadingImg && <span className="text-xs text-slate-500">Processing image…</span>}
                  {!!imgPreview && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="text-xs border border-slate-300 rounded px-2 py-1 hover:bg-white"
                    >
                      Remove image
                    </button>
                  )}
                </div>

                {imgPreview ? (
                  <div className="mt-3">
                    <div className="text-xs text-slate-600 mb-1">Preview</div>
                    <img
                      src={imgPreview}
                      alt="Banner preview"
                      className="max-h-32 rounded border border-slate-200"
                    />
                    {isCloudfrontUrl(imgPreview) && (
                      <div className="mt-1 text-[11px] text-green-700">✅ CloudFront URL detected</div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Funding Type */}
              <div>
                <div className="text-sm font-medium mb-1">Funding Type (choose all that apply)</div>
                <div className="flex flex-wrap gap-2">
                  {FUNDING_OPTIONS.map((ft) => (
                    <label
                      key={ft}
                      className="inline-flex items-center gap-2 border border-slate-300 rounded px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.fundingType.includes(ft)}
                        onChange={() => toggleFunding(ft)}
                      />
                      <span>{ft}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Editors */}
              {/*<div className="space-y-6 bg-slate-50/60 p-4 rounded-lg border border-slate-200">
                <div>
                  <div className="text-sm font-medium">Gradute Program Description</div>
                  <div
                    ref={descHostRef}
                    className="mt-2 bg-white border border-slate-300 rounded"
                    style={{ minHeight: 180 }}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium">Admission Eligibility</div>
                  <div
                    ref={eligHostRef}
                    className="mt-2 bg-white border border-slate-300 rounded"
                    style={{ minHeight: 160 }}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium">Benefits / Funding Details</div>
                  <div
                    ref={beneHostRef}
                    className="mt-2 bg-white border border-slate-300 rounded"
                    style={{ minHeight: 160 }}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium">How to Apply</div>
                  <div
                    ref={howHostRef}
                    className="mt-2 bg-white border border-slate-300 rounded"
                    style={{ minHeight: 160 }}
                  />
                </div>
              </div>*/}

              <div className="space-y-6 bg-slate-50/60 p-4 rounded-lg border border-slate-200">
  <div>
    <div className="text-sm font-medium">Gradute Program Description</div>
    <div
      ref={descHostRef}
      className="mt-2 bg-white border border-slate-300 rounded"
      style={{ minHeight: 180 }}
    />
  </div>

  <div>
    <div className="text-sm font-medium">Admission Eligibility</div>
    <div
      ref={eligHostRef}
      className="mt-2 bg-white border border-slate-300 rounded"
      style={{ minHeight: 160 }}
    />
  </div>

  <div>
    <div className="text-sm font-medium">Benefits / Funding Details</div>
    <div
      ref={beneHostRef}
      className="mt-2 bg-white border border-slate-300 rounded"
      style={{ minHeight: 160 }}
    />
  </div>

  <div>
    <div className="text-sm font-medium">How to Apply</div>
    <div
      ref={howHostRef}
      className="mt-2 bg-white border border-slate-300 rounded"
      style={{ minHeight: 160 }}
    />
  </div>

  <div>
    <div className="text-sm font-medium">Additional Information (optional)</div>
    <div
      ref={additionalHostRef}
      className="mt-2 bg-white border border-slate-300 rounded"
      style={{ minHeight: 160 }}
    />
  </div>
</div>

              {/*<label className="block">
                <div className="text-sm font-medium">Notes (internal)</div>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={onChange}
                  rows="3"
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </label>*/}

              <div className="pt-2">
                <button className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
                  Submit Funded Graduate Admission
                </button>
              </div>

              {/*<div className="text-[11px] text-slate-500">
                API Base: <span className="font-mono">{API_BASE || "(missing)"}</span>
              </div>*/}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}