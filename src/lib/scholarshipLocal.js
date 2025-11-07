// src/lib/scholarshipLocal.js
const LS_KEY = "scholarships_local";

/* ------- read/write helpers ------- */
export function lsReadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
export function lsWriteAll(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}
export function nextLocalId() {
  const all = lsReadAll();
  const max = all.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
  return max + 1;
}
export function lsFindById(id) {
  return lsReadAll().find(x => String(x.id) === String(id));
}

/* ------- mutations ------- */
export function lsCreate(payload) {
  const id = nextLocalId();
  const rec = { id, ...payload };
  const all = lsReadAll();
  all.push(rec);
  lsWriteAll(all);
  return rec;
}

export function lsUpdate(id, partial) {
  const all = lsReadAll();
  const idx = all.findIndex(x => String(x.id) === String(id));
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...partial, id: Number(id) };
    lsWriteAll(all);
    return all[idx];
  }
  // if missing, create
  const rec = { id: Number(id), ...partial };
  all.push(rec);
  lsWriteAll(all);
  return rec;
}

export function lsRemove(id) {
  const next = lsReadAll().filter(x => String(x.id) !== String(id));
  lsWriteAll(next);
}

/* ------- queries ------- */
export function lsQuery({ q = "", status = "all", page = 1, pageSize = 20 } = {}) {
  let data = lsReadAll();

  if (status !== "all") data = data.filter(x => (x.status || "pending") === status);

  if (q) {
    const s = q.toLowerCase();
    data = data.filter(x =>
      (x.title || "").toLowerCase().includes(s) ||
      (x.provider || "").toLowerCase().includes(s) ||
      (x.country || "").toLowerCase().includes(s)
    );
  }

  const total = data.length;
  const start = (page - 1) * pageSize;
  const items = data.slice(start, start + pageSize);
  return { items, total };
}