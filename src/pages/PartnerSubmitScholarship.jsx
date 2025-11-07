// src/pages/PartnerSubmitScholarship.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { REGIONS } from "../data/regions";
import { FIELDS_OF_STUDY } from "../data/fieldsOfStudy";
import { saveLocalScholarship } from "../utils/scholarshipsLocal"; // ⬅️ local fallback helper
import Quill from "quill";
import "quill/dist/quill.snow.css";

// Normalize API base (empty string if not set) and strip trailing slashes
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/+$/, "");

/** Match the same values you filter on in Scholarship.jsx */
const LEVEL_OPTIONS = [
  "Undergraduate",
  "Masters",
  "PhD",
  "Undergraduate / Masters",
  "Masters / PhD",
];

/** Standardized funding choices (same vocabulary your filters expect) */
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

/** Quill toolbar/modules (shared) */
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

/* ---- Helper: get the logged-in partner's email (from localStorage.partnerAuth) ---- */
function getPartnerEmail() {
  try {
    const raw = localStorage.getItem("partnerAuth");
    if (!raw) return "";
    const obj = JSON.parse(raw);
    return (
      obj.email ||
      obj.userEmail ||
      obj.username ||
      obj.user ||
      obj.name ||
      ""
    );
  } catch {
    return "";
  }
}

export default function PartnerSubmitScholarship() {
  const [form, setForm] = useState({
    title: "",
    provider: "",
    continent: "All",   // UI only; not sent
    country: "Multiple",
    level: "",
    field: "",
    fundingType: [],
    deadline: "",
    link: "",
    partnerApplyUrl: "",
    // Rich HTML captured from Quill editors:
    description: "",
    eligibility: "",
    benefits: "",
    howToApply: "",
    // Optional amount (shows publicly if provided)
    amount: "",
    // Internal notes (not public)
    notes: "",
    // NEW: image fields
    imageUrl: "",   // hosted URL (preferred if present)
    imageData: "",  // base64 data URL from local upload (fallback)
  });

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgPreview, setImgPreview] = useState("");

  const partnerEmail = getPartnerEmail();

  /** ===== Country options depend on selected continent ===== */
  const countryOptions = useMemo(() => {
    if (form.continent === "All") {
      const set = new Set();
      for (const list of Object.values(REGIONS)) list.forEach((c) => set.add(c));
      return ["Multiple", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }
    return ["Multiple", ...(REGIONS[form.continent] || [])];
  }, [form.continent]);

  /** ===== Basic input handlers ===== */
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      if (name === "continent") return { ...f, continent: value, country: "Multiple" };
      return { ...f, [name]: value };
    });
  };

  const toggleFunding = (v) => {
    setForm((f) => {
      const has = f.fundingType.includes(v);
      return { ...f, fundingType: has ? f.fundingType.filter((x) => x !== v) : [...f.fundingType, v] };
    });
  };

  /** ===== Quill editors (four) — host refs & instances ===== */
  const descHostRef = useRef(null);
  const eligHostRef = useRef(null);
  const beneHostRef = useRef(null);
  const howHostRef = useRef(null);

  const descQuillRef = useRef(null);
  const eligQuillRef = useRef(null);
  const beneQuillRef = useRef(null);
  const howQuillRef = useRef(null);

  // Initialize Quill editors once (guard against React StrictMode double-invoke)
  useEffect(() => {
    const init = (host, key, placeholder) => {
      if (!host) return null;
      if (host.dataset.inited === "1" || host.__quill) return host.__quill;

      const q = new Quill(host, {
        theme: "snow",
        placeholder,
        modules: quillModules,
      });
      host.dataset.inited = "1";
      host.__quill = q;

      // Keep form state (HTML) in sync as user types
      q.on("text-change", () => {
        setForm((f) => ({ ...f, [key]: q.root.innerHTML }));
      });
      return q;
    };

    descQuillRef.current = init(
      descHostRef.current,
      "description",
      "Write a clear, concise description of the scholarship…"
    );
    eligQuillRef.current = init(
      eligHostRef.current,
      "eligibility",
      "Who can apply? Add bullet points for clarity."
    );
    beneQuillRef.current = init(
      beneHostRef.current,
      "benefits",
      "What does the scholarship cover? Use bullets or numbers."
    );
    howQuillRef.current = init(
      howHostRef.current,
      "howToApply",
      "Steps to apply. You can insert links to external sites."
    );

    ["description", "eligibility", "benefits", "howToApply"].forEach((k) =>
      setForm((f) => ({ ...f, [k]: f[k] ?? "" }))
    );

    return () => {
      descQuillRef.current = null;
      eligQuillRef.current = null;
      beneQuillRef.current = null;
      howQuillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ===== Image upload (to data URL for payload/local fallback) ===== */
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
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        setImgPreview(dataUrl);
        setForm((f) => ({ ...f, imageData: dataUrl }));
        setUploadingImg(false);
      };
      reader.onerror = () => {
        setUploadingImg(false);
        setErr("Failed to read the selected image.");
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingImg(false);
      setErr("Failed to process the selected image.");
    }
  };

  const clearImage = () => {
    setImgPreview("");
    setForm((f) => ({ ...f, imageData: "" }));
  };

  /** ===== Submit (API-first, then local fallback) ===== */
  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    // Validate required
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

    const payload = {
      title: form.title,
      provider: form.provider,
      country: form.country,
      level: form.level,
      field: form.field,
      fundingType: form.fundingType,
      deadline: form.deadline,
      link: form.link,
      partnerApplyUrl: form.partnerApplyUrl,
      description: form.description,   // HTML
      eligibility: form.eligibility,   // HTML
      benefits: form.benefits,         // HTML
      howToApply: form.howToApply,     // HTML
      amount: form.amount,
      notes: form.notes,
      // ✅ image: prefer hosted URL if provided; otherwise data URL
      imageUrl: (form.imageUrl || "").trim(),
      imageData: form.imageData || "",
      // linkage + defaults
      partnerEmail: String(partnerEmail),
      createdAt: Date.now(),
      // ✅ DEFAULT TO PENDING (required)
      status: "pending",
    };

    // 1) Try backend first if API_BASE present
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/scholarships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setMsg(`Saved! Scholarship #${data?.id ?? ""} created.`);
        setErr("");
        resetFormAndEditors();
        return; // ✅ done
      } catch (apiErr) {
        console.warn("Submit via API failed; falling back to localStorage:", apiErr);
        // continue to local fallback
      }
    }

    // 2) Fallback to localStorage: write to the UNIFIED store used by Admin list
    try {
      // use the same key the admin list reads in fallback mode
      const saved = saveLocalScholarship(payload, "scholarships_local");
      setMsg(`Scholarship submitted (saved locally). ${saved?.id ? `#${saved.id}` : ""}`);
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
      amount: "",
      notes: "",
      imageUrl: "",
      imageData: "",
    });
    setImgPreview("");
    [descQuillRef, eligQuillRef, beneQuillRef, howQuillRef].forEach((r) => {
      if (r.current) r.current.setContents([]);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef3ff] via-white to-[#f5f7fb]">
      {/* wider container */}
      <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Submit a Scholarship</h1>
        <p className="mt-1 text-slate-600">
          Partners and universities can list their opportunities here.
        </p>

        {/* Bordered card around the whole form & messages (matches login style) */}
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {/* a bit more breathing room */}
          <div className="p-6 md:p-8">

            {/* Heads-up if not logged in as partner */}
            {!partnerEmail && (
              <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800">
                You’re not logged in as a Partner. Please{" "}
                <a href="/partner/login" className="underline">log in</a> to submit and manage your listings.
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
              {/* Top grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-medium">Title *</div>
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    required
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Provider *</div>
                  <input
                    name="provider"
                    value={form.provider}
                    onChange={onChange}
                    required
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                {/* Continent + Country */}
                <label className="block">
                  <div className="text-sm font-medium">Continent</div>
                  <select
                    name="continent"
                    value={form.continent}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    {["All", ...Object.keys(REGIONS)].map((c) => (
                      <option key={c} value={c}>{c}</option>
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
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                {/* Level */}
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
                      <option key={lv} value={lv}>{lv}</option>
                    ))}
                  </select>
                </label>

                {/* Field of Study */}
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
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Deadline</div>
                  <input
                    type="date"
                    name="deadline"
                    value={form.deadline}
                    onChange={onChange}
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Provider URL</div>
                  <input
                    name="link"
                    value={form.link}
                    onChange={onChange}
                    placeholder="https://example.edu/scholarship"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <label className="block md:col-span-2">
                  <div className="text-sm font-medium">Apply on Partner URL</div>
                  <input
                    name="partnerApplyUrl"
                    value={form.partnerApplyUrl}
                    onChange={onChange}
                    placeholder="https://example.edu/apply"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                {/* Optional amount */}
                <label className="block md:col-span-2">
                  <div className="text-sm font-medium">Maximum Award Amount (optional)</div>
                  <input
                    name="amount"
                    value={form.amount}
                    onChange={onChange}
                    placeholder="e.g., Up to $10,000 or Up to €8,500"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    This will appear on the public scholarship page if provided.
                  </p>
                </label>
              </div>

              {/* NEW: Logo/Banner section with subtle background */}
              <div className="bg-slate-50/60 p-4 rounded-lg border border-slate-200">
                <div className="text-sm font-medium">Logo / Banner</div>
                <p className="mt-1 text-xs text-slate-600">
                  Add a hosted image URL (preferred) or upload a file. This appears above the “At a glance” card on the details page.
                </p>

                {/* URL input */}
                <label className="block mt-3">
                  <div className="text-sm font-medium">Hosted Image URL</div>
                  <input
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={onChange}
                    placeholder="https://example.edu/logo.png"
                    className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </label>

                <div className="my-3 text-center text-xs text-slate-500">— or —</div>

                {/* File picker */}
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center px-3 py-2 border border-slate-300 rounded cursor-pointer text-sm hover:bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPickImage}
                      className="hidden"
                    />
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

                {/* Preview */}
                {imgPreview ? (
                  <div className="mt-3">
                    <div className="text-xs text-slate-600 mb-1">Preview</div>
                    <img
                      src={imgPreview}
                      alt="Selected preview"
                      className="max-h-32 rounded border border-slate-200"
                    />
                  </div>
                ) : form.imageUrl ? (
                  <div className="mt-3">
                    <div className="text-xs text-slate-600 mb-1">Preview</div>
                    <img
                      src={form.imageUrl}
                      alt="Image preview"
                      className="max-h-32 rounded border border-slate-200"
                      onError={() => setErr("Could not load the hosted image URL.")}
                    />
                  </div>
                ) : null}
              </div>

              {/* Funding Type — multi-select as checkboxes */}
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

              {/* Editors section with subtle background */}
              <div className="space-y-6 bg-slate-50/60 p-4 rounded-lg border border-slate-200">
                <div>
                  <div className="text-sm font-medium">Scholarship Description</div>
                  <div
                    ref={descHostRef}
                    className="mt-2 bg-white border border-slate-300 rounded"
                    style={{ minHeight: 180 }}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium">Eligibility (HTML ok)</div>
                  <div
                    ref={eligHostRef}
                    className="mt-2 bg-white border border-slate-300 rounded"
                    style={{ minHeight: 160 }}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium">Benefits (HTML ok)</div>
                  <div
                    ref={beneHostRef}
                    className="mt-2 bg-white border border-slate-300 rounded"
                    style={{ minHeight: 160 }}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium">How to Apply (HTML ok)</div>
                  <div
                    ref={howHostRef}
                    className="mt-2 bg-white border border-slate-300 rounded"
                    style={{ minHeight: 160 }}
                  />
                </div>
              </div>

              <label className="block">
                <div className="text-sm font-medium">Notes (internal)</div>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={onChange}
                  rows="3"
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </label>

              <div className="pt-2">
                <button className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
                  Submit Scholarship
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}