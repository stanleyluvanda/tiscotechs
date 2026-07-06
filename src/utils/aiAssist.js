// src/utils/aiAssist.js

const AI_BASE = (import.meta.env.VITE_AI_API_BASE || "").replace(/\/+$/, "");

export async function callAssistAI(action, text, extra = {}) {
  const res = await fetch(`${AI_BASE}/api/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, text, ...extra }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "AI request failed");
  }

  return String(data?.result || "");
}

export function sanitizeSimpleAiHtml(html = "") {
  return String(html || "")
    .replace(/<(?!\/?(p|strong|br|ul|li)\b)[^>]*>/gi, "")
    .trim();
}

export function splitTextIntoChunks(text = "", maxChars = 3500) {
  const clean = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;

    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = para;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}

export async function callAssistAIChunked(action, text, extra = {}) {
  const source = String(text || "").trim();
  if (!source) return "";

  const chunks = splitTextIntoChunks(source, 3500);

  if (chunks.length <= 1) {
    return await callAssistAI(action, source, extra);
  }

  const results = [];

  for (const chunk of chunks) {
    const part = await callAssistAI(action, chunk, extra);

    if (part) {
      results.push(String(part).trim());
    }
  }

  return results.join("\n\n");
}

export function cleanAiPlainText(text = "") {
  return String(text || "")
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .replace(/<\/?(p|ol|ul|li|strong|br)\s*\/?>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}