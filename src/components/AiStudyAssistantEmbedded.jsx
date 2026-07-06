//src/components/AiStudyAssistantEmbedded.jsx
import React, { useMemo, useState } from "react";
import {
  callAssistAIChunked,
  sanitizeSimpleAiHtml,
  cleanAiPlainText,
} from "../utils/aiAssist";
import {
  extractPdfPages,
  detectPdfChapters,
  formatPdfPagesForNotes,
} from "../utils/pdfExtractor";

const ACTIONS = [
  { label: "Summarize", action: "summarize", mode: "html" },
  { label: "Improve Writing", action: "improve-writing", mode: "html" },
  { label: "Key Points", action: "create-key-points", mode: "html" },
  { label: "Simplify", action: "simplify-explanation", mode: "html" },
  {
    label: "Generate MCQs",
    action: "generate-quiz-questions",
    mode: "text",
    extra: { questionType: "multiple-choice", questionCount: 5 },
  },
  {
    label: "Analytical Questions",
    action: "generate-quiz-questions",
    mode: "text",
    extra: { questionType: "short-answer", questionCount: 5 },
  },
];

export default function AiStudyAssistantEmbedded() {
  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);

  const [pdfPages, setPdfPages] = useState([]);
  const [pageFrom, setPageFrom] = useState("");
  const [pageTo, setPageTo] = useState("");
  const [pdfChapters, setPdfChapters] = useState([]);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState("");
  const [extractingFile, setExtractingFile] = useState(false);

  const [busyAction, setBusyAction] = useState("");
  const [response, setResponse] = useState("");
  const [responseMode, setResponseMode] = useState("text");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const sourceText = useMemo(() => {
    return [question, notes].map((v) => String(v || "").trim()).filter(Boolean).join("\n\n");
  }, [question, notes]);

  const canRun = sourceText.trim().length >= 10 && !busyAction;

  const handleFiles = async (e) => {
  const selected = Array.from(e.target.files || []);

  setFiles(selected);
  setError("");

  try {
    setExtractingFile(true);

    for (const file of selected) {
      const name = String(file.name || "").toLowerCase();

      // TXT
      if (file.type === "text/plain" || name.endsWith(".txt")) {
        const text = await file.text();

        setNotes((prev) => {
          const current = String(prev || "").trim();

          return `${current}

--- Extracted from ${file.name} ---

${text.trim()}`.trim();
        });
      }

      // PDF
      if (file.type === "application/pdf" || name.endsWith(".pdf")) {
        const pages = await extractPdfPages(file);
const detectedChapters = detectPdfChapters(pages);
console.log("Detected PDF chapters:", detectedChapters);

setPdfPages(pages);
setPdfChapters(detectedChapters);
setSelectedChapterIndex("");

if (pages.length > 0) {
  setPageFrom("1");
  setPageTo(String(Math.min(5, pages.length)));
}
      }
    }
  } catch (err) {
    console.error(err);
    setError("Unable to extract text from the uploaded file.");
  } finally {
    setExtractingFile(false);
  }
};

const useSelectedPdfPages = () => {
  const from = Math.max(1, Number(pageFrom || 1));
  const to = Math.min(pdfPages.length, Number(pageTo || pageFrom || 1));

  if (!pdfPages.length || from > to) {
    setError("Select a valid PDF page range.");
    return;
  }

  const selectedText = formatPdfPagesForNotes(pdfPages, from, to);

  setNotes((prev) => {
    const current = String(prev || "").trim();

    return `${current}

--- PDF pages ${from}-${to} ---

${selectedText}`.trim();
  });
};

  const runAction = async (item) => {
    if (!sourceText.trim()) {
      setError("Add a question or paste notes first.");
      return;
    }

    try {
      setBusyAction(item.label);
      setError("");
      setResponse("");
      setResponseMode(item.mode);

      const result = await callAssistAIChunked(item.action, sourceText, item.extra || {});

      if (item.mode === "html") {
        setResponse(sanitizeSimpleAiHtml(result));
      } else {
        setResponse(cleanAiPlainText(result));
      }
    } catch (e) {
      setResponseMode("text");
      setError(e?.message || "AI request failed.");
      setResponse("");
    } finally {
      setBusyAction("");
    }
  };
  const copyResponse = async () => {
  if (!response) return;

  try {
    await navigator.clipboard.writeText(response);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  } catch {
    setError("Unable to copy response.");
  }
};

const clearResponse = () => {
  setResponse("");
  setError("");
  setResponseMode("text");
};

const downloadResponse = () => {
  if (!response) return;

  const blob = new Blob([response], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ai-study-response.txt";

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            AI Study Assistant
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ask questions, paste notes, upload study files, and generate study materials.
          </p>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-5">
          <div>
            <label className="text-sm font-semibold text-slate-800">Question</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your study material..."
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-800">Paste Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste lecture notes, textbook sections, assignment instructions, or draft writing here..."
              rows={9}
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/*<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upload Files</h3>
                <p className="mt-1 text-xs text-slate-500">
                  PDF, DOCX, and TXT support will be connected in the next phase.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
  Choose files
  <input
    type="file"
    multiple
    accept=".pdf,.doc,.docx,.txt"
    onChange={handleFiles}
    className="hidden"
  />
</label>
</div>

{files.length > 0 && (
  <div className="mt-4 space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Selected files
    </p>

    {files.map((file, index) => (
      <div
        key={`${file.name}-${index}`}
        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <span className="min-w-0 truncate text-slate-700">
          {file.name}
        </span>

        <span className="shrink-0 text-xs text-slate-400">
          {(file.size / 1024).toFixed(1)} KB
        </span>
      </div>
    ))}
  </div>
)}

{extractingFile && (
  <p className="mt-3 text-xs font-semibold text-blue-700">
    Extracting file text...
  </p>
)}

{pdfPages.length > 0 && (
  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
    <h4 className="text-sm font-bold text-slate-900">
      PDF Pages Detected
    </h4>

    <p className="mt-1 text-xs text-slate-500">
      Select only the pages you want to study. This avoids sending an entire book to AI.
    </p>
    {pdfChapters.length > 0 && (
  <select
    value={selectedChapterIndex}
    onChange={(e) => {
      const value = e.target.value;
      setSelectedChapterIndex(value);

      if (value === "") return;

      const chapter = pdfChapters[Number(value)];

      setPageFrom(String(Math.max(1, chapter.pdfStartPage - 1)));
setPageTo(
  String(
    chapter.pdfEndPage
      ? Math.min(pdfPages.length, chapter.pdfEndPage + 1)
      : pdfPages.length
  )
);
    }}
    className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
  >
    <option value="">Select chapter or part</option>

    {pdfChapters.map((chapter, idx) => (
      <option key={`${chapter.type}-${chapter.number}-${idx}`} value={idx}>
        {chapter.label}
        {chapter.pdfEndPage
  ? ` — PDF pages ${chapter.pdfStartPage}-${chapter.pdfEndPage}`
  : ""}
      </option>
    ))}
  </select>
)}

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="text-xs font-semibold text-slate-600">
        From page
      </label>

      <input
        type="number"
        min="1"
        max={pdfPages.length}
        value={pageFrom}
        onChange={(e) => setPageFrom(e.target.value)}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
      />

      <label className="text-xs font-semibold text-slate-600">
        To page
      </label>

      <input
        type="number"
        min="1"
        max={pdfPages.length}
        value={pageTo}
        onChange={(e) => setPageTo(e.target.value)}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
      />

      <button
        type="button"
        onClick={useSelectedPdfPages}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
      >
        Add selected pages to notes
      </button>
    </div>

    <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
      {pdfPages.slice(0, 20).map((p) => (
        <div
          key={p.page}
          className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
        >
          <strong>Page {p.page}:</strong>{" "}
          {p.preview || "No readable text detected."}
        </div>
      ))}
    </div>

    {pdfPages.length > 20 && (
      <p className="mt-2 text-xs text-slate-400">
        Showing first 20 page previews only.
      </p>
    )}
  </div>
)}
</div>*/}
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Actions</h3>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={!canRun}
                  onClick={() => runAction(item)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    canRun
                      ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {busyAction === item.label ? "Working..." : item.label}
                </button>
              ))}
            </div>

            {!sourceText.trim() && (
              <p className="mt-2 text-xs text-slate-500">
                Enter a question or paste notes, then choose an AI action.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
    <h3 className="text-sm font-bold text-slate-900">
      AI Response
    </h3>

    {(response || error) && (
      <div className="flex items-center gap-2">
        {response && (
          <>
            <button
              type="button"
              onClick={copyResponse}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>

            <button
              type="button"
              onClick={downloadResponse}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download
            </button>
          </>
        )}

        <button
          type="button"
          onClick={clearResponse}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>
    )}
  </div>

            <div className="min-h-[180px] px-4 py-5 text-sm leading-6 text-slate-700">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                  {error}
                </div>
              ) : response ? (
                responseMode === "html" ? (
                  <div
                    className="max-w-none [&_p]:my-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:my-1"
                    dangerouslySetInnerHTML={{ __html: sanitizeSimpleAiHtml(response) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{response}</div>
                )
              ) : (
                <span className="text-slate-500">
                  AI response will appear here after you run an action.
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/*<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-bold text-slate-900">Books</h4>
              <p className="mt-1 text-xs text-slate-500">No textbook detected.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-bold text-slate-900">Detected Chapters</h4>
              <p className="mt-1 text-xs text-slate-500">None.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-bold text-slate-900">Study History</h4>
              <p className="mt-1 text-xs text-slate-500">Coming soon.</p>
            </div>*/}
          </div>
        </div>
      </section>
    </div>
  );
}