// src/utils/pdfExtractor.js

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts text from every page of a PDF.
 */
export async function extractPdfPages(file) {
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer,
  }).promise;

  const pages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const text = textContent.items
      .map((item) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({
      page: pageNum,
      text,
      preview: text.substring(0, 140),
    });
  }

  return pages;
}

export function formatPdfPagesForNotes(pages = [], from = 1, to = 1) {
  const start = Math.max(1, Number(from || 1));
  const end = Math.min(pages.length, Number(to || from || 1));

  return pages
    .filter((p) => p.page >= start && p.page <= end)
    .map((p) => {
      const cleaned = cleanPdfTextForNotes(p.text || "");

      return [
        `──────────────────────────────`,
        `PDF Page ${p.page}`,
        `──────────────────────────────`,
        cleaned || "[No readable text detected on this page.]",
      ].join("\n");
    })
    .join("\n\n");
}

export function detectPdfChapters(pages = []) {
  const tocChapters = extractCleanTocChapters(pages);
  const pageOffset = detectBookPageOffset(pages, tocChapters);

  return tocChapters.map((chapter, idx, arr) => {
    const nextChapter = arr[idx + 1];

    const bookEndPage = nextChapter
      ? nextChapter.bookStartPage - 1
      : null;

    const pdfStartPage = Math.max(
      1,
      chapter.bookStartPage + pageOffset
    );

    const pdfEndPage = bookEndPage
      ? Math.min(pages.length, bookEndPage + pageOffset)
      : pages.length;

    return {
      ...chapter,
      bookEndPage,
      pdfStartPage,
      pdfEndPage,
      startPage: pdfStartPage,
      endPage: pdfEndPage,
      label: `Chapter ${chapter.number} — ${chapter.title}`,
    };
  });
}

function extractCleanTocChapters(pages = []) {
  const tocPages = pages.slice(0, Math.min(pages.length, 20));
  const chapters = [];

  for (const page of tocPages) {
    const text = String(page.text || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) continue;

    const looksLikeToc =
      /\bcontents\b/i.test(text) ||
      /\bbrief contents\b/i.test(text) ||
      /\bchapter\s+1\b/i.test(text) ||
      /\b1\s+why\s+study\s+public\s+finance\b/i.test(text);

    if (!looksLikeToc) continue;

    const matches = findChapterRowsInTocText(text);

    for (const match of matches) {
      const duplicate = chapters.some(
        (c) =>
          String(c.number) === String(match.number) &&
          c.bookStartPage === match.bookStartPage
      );

      if (!duplicate) {
        chapters.push(match);
      }
    }
  }

  const clean = chapters
    .filter((c) => Number.isFinite(c.bookStartPage))
    .filter((c) => Number(c.number) >= 1 && Number(c.number) <= 50)
    .filter((c) => c.title && c.title.length >= 4 && c.title.length <= 90)
    .sort((a, b) => Number(a.number) - Number(b.number))
    .filter((c, idx, arr) => {
      if (idx === 0) return true;

      const prev = arr[idx - 1];

      return (
        Number(c.number) > Number(prev.number) &&
        c.bookStartPage > prev.bookStartPage
      );
    });

  return clean;
}

function findChapterRowsInTocText(text) {
  const rows = [];

  const cleanText = text
    .replace(/\bChaPtER\b/gi, "CHAPTER")
    .replace(/\bChAptEr\b/gi, "CHAPTER")
    .replace(/\bPaRt\b/gi, "PART")
    .replace(/\bP A r T\b/gi, "PART")
    .replace(/\s+/g, " ")
    .trim();

  const chapterPattern =
    /(?:CHAPTER\s*)?(\d{1,2})\s+([A-Z][A-Za-z0-9 ,:'’“”?.&()-]{3,80}?)\s+(\d{1,4})(?=\s+(?:CHAPTER\s*)?\d{1,2}\s+[A-Z]|\s+PART\s+[IVXLCDM]+|\s+Glossary|\s+References|\s+Index|$)/g;

  let match;

  while ((match = chapterPattern.exec(cleanText)) !== null) {
    const number = Number(match[1]);
    const title = cleanChapterTitle(match[2]);
    const bookStartPage = Number(match[3]);

    if (!Number.isFinite(number)) continue;
    if (!Number.isFinite(bookStartPage)) continue;

    if (/^\d+\.\d+/.test(title)) continue;
    if (/^(Preface|Contents|Glossary|References|Index)$/i.test(title)) continue;

    rows.push({
      type: "chapter",
      number: String(number),
      title,
      bookStartPage,
    });
  }

  return rows;
}

function detectBookPageOffset(pages = [], chapters = []) {
  const firstChapter = chapters.find(
    (c) => String(c.number) === "1" && Number.isFinite(c.bookStartPage)
  );

  if (!firstChapter) return 0;

  for (const page of pages) {
    const raw = String(page.text || "");
    const compact = raw.replace(/\s+/g, " ").trim().toLowerCase();

    const hasAca =
      compact.includes("patient protection and affordable care act") ||
      compact.includes("affordable care act");

    const hasChapterTitle =
      compact.includes("why study public finance");

    const hasQuestions =
      compact.includes("questions to keep in mind");

    const hasSectionList =
      compact.includes("1.1 the four questions of public finance") &&
      compact.includes("1.4 conclusion");

    const isNotToc =
      !compact.includes("contents") &&
      !compact.includes("brief contents") &&
      !compact.includes("preface");

    if (isNotToc && hasChapterTitle && (hasAca || hasQuestions || hasSectionList)) {
      return page.page - firstChapter.bookStartPage;
    }
  }

  return 0;
}
function cleanPdfTextForNotes(value) {
  let text = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\bChaPtER\b/gi, "CHAPTER")
    .replace(/\bChAptEr\b/gi, "CHAPTER")
    .replace(/\bPaRt\b/gi, "PART")
    .replace(/\bP A r T\b/gi, "PART")
    .replace(/\baPPlICatIon\b/gi, "APPLICATION")
    .replace(/\bEmPIRICal EvIdEnCE\b/gi, "EMPIRICAL EVIDENCE")
    .replace(/\baPPEndIx\b/gi, "APPENDIX")
    .trim();

  text = text
    .replace(/\s+(PART\s+[IVXLCDM]+)\s+/gi, "\n\n$1\n\n")
    .replace(/\s+(CHAPTER\s+\d+)\s+/gi, "\n\n$1 ")
    .replace(/\s+(\d+\.\d+)\s+/g, "\n\n$1 ")
    .replace(/\s+(APPLICATION)\s+/g, "\n\n$1\n")
    .replace(/\s+(EMPIRICAL EVIDENCE)\s+/g, "\n\n$1\n")
    .replace(/\s+(APPENDIX)\s+/g, "\n\n$1 ")
    .replace(/\s+(Highlights)\s+/gi, "\n\nHighlights\n")
    .replace(/\s+(Questions and Problems)\s+/gi, "\n\nQuestions and Problems\n")
    .replace(/\s+(Advanced Questions)\s+/gi, "\n\nAdvanced Questions\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function cleanChapterTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, "")
    .replace(/\s+\d{1,4}$/g, "")
    .trim();
}