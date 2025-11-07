// src/pages/AdminScholarshipForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { REGIONS } from "../data/regions";
import { FIELDS_OF_STUDY } from "../data/fieldsOfStudy";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5000";

/* ---------- tiny local fallback helpers ---------- */
const LS_KEY = "scholarships_local";
function lsReadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function lsWriteAll(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}
function lsFindById(id) {
  const all = lsReadAll();
  return all.find(x => String(x.id) === String(id));
}
function nextLocalId() {
  const all = lsReadAll();
  const max = all.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
  return max + 1;
}

/* ---------------- Markdown-ish <-> HTML helpers (lightweight) ---------------- */
function mdToHtml(src = "") {
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = (s) =>
    s
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  const lines = (src || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  const flushParas = (buf) => {
    if (!buf.length) return;
    const text = buf.join("\n").trim();
    if (text) blocks.push(`<p>${inline(esc(text))}</p>`);
    buf.length = 0;
  };

  while (i < lines.length) {
    if (/^\s*[-*]\s+/.test(lines[i])) {
      const ul = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        ul.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(`<ul>${ul.map(li => `<li>${inline(esc(li))}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(lines[i])) {
      const ol = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        ol.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(`<ol>${ol.map(li => `<li>${inline(esc(li))}</li>`).join("")}</ol>`);
      continue;
    }
    const paraBuf = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraBuf.push(lines[i]);
      i++;
    }
    flushParas(paraBuf);
    while (i < lines.length && /^\s*$/.test(lines[i])) i++;
  }

  return blocks.join("\n");
}

/* Very small/naive HTML -> md-ish (for prefill when editing) */
function htmlToMd(html = "") {
  let s = html || "";
  s = s
    .replace(/<\/li>\s*<li>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "")
    .replace(/<ul[^>]*>/gi, "")
    .replace(/<\/ul>/gi, "")
    .replace(/<ol[^>]*>/gi, "")
    .replace(/<\/ol>/gi, "");
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "");
  s = s.replace(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  s = s.replace(/<(b|strong)>/gi, "**").replace(/<\/(b|strong)>/gi, "**");
  s = s.replace(/<(i|em)>/gi, "*").replace(/<\/(i|em)>/gi, "*");
  s = s.replace(/<\/?[^>]+>/g, "");
  s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return s.trim();
}

/* ---------------- Small rich textarea with toolbar ---------------- */
function SimpleEditor({ label, value, onChange, placeholder }) {
  const id = label.replace(/\s+/g, "_") + "_ta";

  const applyAroundSelection = (before, after) => {
    const ta = document.getElementById(id);
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    const text = value || "";
    const selected = text.slice(selectionStart, selectionEnd) || "";
    const next = text.slice(0, selectionStart) + before + selected + after + text.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = selectionStart + before.length + selected.length + after.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const makeBold = () => applyAroundSelection("**", "**");
  const makeItalic = () => applyAroundSelection("*", "*");
  const makeLink = () => {
    const url = prompt("Enter URL (include https://)");
    if (!url) return;
    const ta = document.getElementById(id);
    const { selectionStart, selectionEnd } = ta;
    const sel = (value || "").slice(selectionStart, selectionEnd) || "link text";
    const md = `[${sel}](${url})`;
    const next = (value || "").slice(0, selectionStart) + md + (value || "").slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = selectionStart + md.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const prefixLines = (prefixBuilder) => {
    const ta = document.getElementById(id);
    const { selectionStart, selectionEnd } = ta;
    const text = value || "";
    const startLine = text.lastIndexOf("\n", selectionStart - 1) + 1;
    const endLine = text.indexOf("\n", selectionEnd);
    const sliceEnd = endLine === -1 ? text.length : endLine;
    const block = text.slice(startLine, sliceEnd);
    let n = 1;
    const nextBlock = block
      .split("\n")
      .map(l => {
        if (!l.trim()) return l;
        const pref = prefixBuilder(n);
        n += 1;
        return `${pref}${l.replace(/^\s*([-*]|\d+\.)\s+/, "")}`;
      })
      .join("\n");
    const next = text.slice(0, startLine) + nextBlock + text.slice(sliceEnd);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(startLine, startLine + nextBlock.length);
    });
  };

  const bulletify = () => prefixLines(() => "- ");
  const numberify = () => {
    let idx = 1;
    return prefixLines(() => `${idx++}. `);
  };

  const hasFormatting = (s = "") =>
    /(^\s*[-*]\s+)|(^\s*\d+\.\s+)|(\[.+\]\(https?:\/\/[^\s)]+\))|(\*\*.+\*\*)|(\*.+\*)/m.test(s);

  return (
    <label className="block">
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={makeBold} className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50">Bold</button>
        <button type="button" onClick={makeItalic} className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50">Italic</button>
        <button type="button" onClick={bulletify} className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50">• Bullets</button>
        <button type="button" onClick={numberify} className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50">1. Numbered</button>
        <button type="button" onClick={makeLink} className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50">Link</button>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
        placeholder={placeholder}
        className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {hasFormatting(value) && (
        <div
          className="mt-2 rounded border border-slate-200 bg-white p-3 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: mdToHtml(value || "") }}
        />
      )}
      <p className="mt-1 text-xs text-slate-500">
        Supports bullets (- ), numbered lists (1. ), **bold**, *italic*, and links [label](https://url).
      </p>
    </label>
  );
}

/* ============================= Page ============================= */
const LEVEL_OPTIONS = [
  "Undergraduate",
  "Masters",
  "PhD",
  "Undergraduate / Masters",
  "Masters / PhD",
];

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

export default function AdminScholarshipForm() {
  const { id } = useParams(); // "new" or numeric id
  const isNew = id === "new";
  const navigate = useNavigate();

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
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
    amount: "",
    description_src: "",
    eligibility_src: "",
    benefits_src: "",
    howToApply_src: "",
    status: "pending",
    notes: "",
  });

  // continent -> countries list
  const countryOptions = useMemo(() => {
    if (form.continent === "All") {
      const set = new Set();
      for (const list of Object.values(REGIONS)) list.forEach(c => set.add(c));
      return ["Multiple", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
    }
    return ["Multiple", ...(REGIONS[form.continent] || [])];
  }, [form.continent]);

  useEffect(() => {
    let alive = true;
    if (isNew) return;

    const numId = Number(id);
    if (!Number.isFinite(numId)) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scholarships/${numId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setForm((f) => ({
          ...f,
          title: data.title || "",
          provider: data.provider || "",
          country: data.country || "Multiple",
          level: data.level || "",
          field: data.field || "",
          fundingType: Array.isArray(data.fundingType) ? data.fundingType : [],
          deadline: data.deadline || "",
          link: data.link || "",
          partnerApplyUrl: data.partnerApplyUrl || "",
          amount: data.amount || "",
          description_src: htmlToMd(data.description || ""),
          eligibility_src: htmlToMd(data.eligibility || ""),
          benefits_src: htmlToMd(data.benefits || ""),
          howToApply_src: htmlToMd(data.howToApply || ""),
          status: data.status || "pending",
          notes: data.notes || "",
        }));
      } catch (e) {
        // Fallback: load from localStorage
        const local = lsFindById(numId);
        if (local) {
          setForm((f) => ({
            ...f,
            title: local.title || "",
            provider: local.provider || "",
            country: local.country || "Multiple",
            level: local.level || "",
            field: local.field || "",
            fundingType: Array.isArray(local.fundingType) ? local.fundingType : [],
            deadline: local.deadline || "",
            link: local.link || "",
            partnerApplyUrl: local.partnerApplyUrl || "",
            amount: local.amount || "",
            description_src: htmlToMd(local.description || ""),
            eligibility_src: htmlToMd(local.eligibility || ""),
            benefits_src: htmlToMd(local.benefits || ""),
            howToApply_src: htmlToMd(local.howToApply || ""),
            status: local.status || "pending",
            notes: local.notes || "",
          }));
        } else if (alive) {
          setErr(`Failed to load: ${e.message}`);
        }
      }
    })();

    return () => { alive = false; };
  }, [id, isNew]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      if (name === "continent") return { ...f, continent: value, country: "Multiple" };
      return { ...f, [name]: value };
    });
  };

  const setSrc = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleFunding = (v) => {
    setForm((f) => {
      const has = f.fundingType.includes(v);
      return { ...f, fundingType: has ? f.fundingType.filter(x => x !== v) : [...f.fundingType, v] };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");

    if (!form.title.trim() || !form.provider.trim()) {
      setErr("Please provide both Title and Provider.");
      return;
    }
    if (!form.level) {
      setErr("Please select an Academic Level.");
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
      amount: form.amount,
      description: mdToHtml(form.description_src),
      eligibility: mdToHtml(form.eligibility_src),
      benefits: mdToHtml(form.benefits_src),
      howToApply: mdToHtml(form.howToApply_src),
      notes: form.notes,
      status: form.status,
    };

    try {
      let res;
      if (isNew) {
        res = await fetch(`${API_BASE}/api/scholarships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const numId = Number(id);
        res = await fetch(`${API_BASE}/api/scholarships/${numId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMsg(`Saved! Scholarship #${data.id} ${isNew ? "created" : "updated"}.`);
      setTimeout(() => navigate("/admin/scholarships"), 300);
    } catch (e2) {
      // Fallback: persist to localStorage so you can keep working without server
      const all = lsReadAll();
      if (isNew) {
        const idLocal = nextLocalId();
        all.push({ id: idLocal, ...payload });
        lsWriteAll(all);
        setMsg(`Saved locally! Scholarship #${idLocal} created.`);
      } else {
        const numId = Number(id);
        const idx = all.findIndex(x => String(x.id) === String(numId));
        if (idx >= 0) all[idx] = { id: numId, ...payload };
        else all.push({ id: numId, ...payload });
        lsWriteAll(all);
        setMsg(`Saved locally! Scholarship #${numId} updated.`);
      }
      setTimeout(() => navigate("/admin/scholarships"), 300);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? "New Scholarship" : `Add Scholarship #${id}`}</h1>
        <Link to="/admin/scholarships" className="text-blue-600 hover:underline text-sm">← Back to list</Link>
      </div>

      {msg && (
        <div className="mt-4 p-3 rounded bg-green-50 border border-green-200 text-green-700">{msg}</div>
      )}
      {err && (
        <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-700">{err}</div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-6">
        {/* ——— form fields unchanged ——— */}
        {/* Title / Provider */}
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

          {/* Level & Field */}
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
              {["Undergraduate","Masters","PhD","Undergraduate / Masters","Masters / PhD"].map((lv) => (
                <option key={lv} value={lv}>{lv}</option>
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
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          {/* Deadline / Links / Amount */}
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
          <label className="block md:col-span-2">
            <div className="text-sm font-medium">Maximum Award Amount (optional)</div>
            <input
              name="amount"
              value={form.amount}
              onChange={onChange}
              placeholder="e.g., Up to $10,000"
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </label>
        </div>

        {/* Funding */}
        <div>
          <div className="text-sm font-medium mb-1">Funding Type (choose all that apply)</div>
          <div className="flex flex-wrap gap-2">
            {FUNDING_OPTIONS.map((ft) => (
              <label key={ft} className="inline-flex items-center gap-2 border border-slate-300 rounded px-2 py-1 text-sm">
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
        <div className="space-y-6 bg-slate-50/60 p-4 rounded-lg border border-slate-200">
          <SimpleEditor label="Scholarship Description" value={form.description_src} onChange={setSrc("description_src")} placeholder="Describe the scholarship. Use - for bullets, 1. for numbered items." />
          <SimpleEditor label="Eligibility" value={form.eligibility_src} onChange={setSrc("eligibility_src")} placeholder="Who can apply? Use - for bullets." />
          <SimpleEditor label="Benefits" value={form.benefits_src} onChange={setSrc("benefits_src")} placeholder="What does it cover? Use - for bullets." />
          <SimpleEditor label="How to Apply" value={form.howToApply_src} onChange={setSrc("howToApply_src")} placeholder="Steps to apply. You can add links like [site](https://example.com)." />
        </div>

        {/* Status & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-sm font-medium">Status</div>
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              {["pending","approved","rejected"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-sm font-medium">Notes (internal)</div>
            <textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              rows={3}
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="pt-2">
          <button className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
            {isNew ? "Create Scholarship" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}