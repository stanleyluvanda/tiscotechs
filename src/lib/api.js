// src/lib/api.js
const API_BASE = String(import.meta?.env?.VITE_API_BASE || "http://localhost:5001").replace(/\/+$/, "");

/** Build an absolute URL from a path or accept full URLs */
function toUrl(path) {
  if (/^https?:\/\//i.test(path)) return String(path);
  const p = String(path || "");
  return API_BASE + (p.startsWith("/") ? p : `/${p}`);
}

async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return {}; }
}

/** POST JSON — returns { ok, status, ...json } and NEVER throws */
export async function postJSON(path, body, init = {}) {
  try {
    const res = await fetch(toUrl(path), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      body: JSON.stringify(body ?? {}),
      ...init,
    });
    const json = await parseJsonSafe(res);
    return { ok: res.ok, status: res.status, ...json };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

/** GET JSON — returns { ok, status, ...json } and NEVER throws */
export async function getJSON(path, init = {}) {
  try {
    const res = await fetch(toUrl(path), {
      method: "GET",
      credentials: "include",
      ...(init || {}),
    });
    const json = await parseJsonSafe(res);
    return { ok: res.ok, status: res.status, ...json };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

export default { postJSON, getJSON };