// src/lib/trackGate.js
// "Count once per device/browser" guard using localStorage (persistent).
// Key example: sch:<id>:view  | sch:<id>:apply | sch:<id>:website

const PREFIX = "sk_track_once_v1:";

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore (private mode / storage blocked)
  }
}

/**
 * Returns true if we should send the track event.
 * Once it returns true for a key, it will return false forever (per device/browser).
 */
export function shouldSendTrackOnce(key) {
  const k = PREFIX + String(key || "");
  if (!k || k === PREFIX) return true;

  const seen = safeGet(k);
  if (seen) return false;

  safeSet(k, String(Date.now()));
  return true;
}