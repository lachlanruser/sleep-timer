// Persistence in localStorage. Everything lives on the phone only.
import { STORAGE_KEY } from './config.js';

const SCHEMA_VERSION = 1;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyState() {
  return { version: SCHEMA_VERSION, days: {}, activeTimer: null };
}

/** Keeps only well-formed day records; never throws. */
export function sanitizeDays(days) {
  const out = {};
  if (!days || typeof days !== 'object') return out;
  for (const [key, day] of Object.entries(days)) {
    if (!DAY_KEY_RE.test(key) || !day || typeof day !== 'object') continue;
    const required = Array.isArray(day.required) ? day.required.filter((x) => typeof x === 'string') : [];
    const completed = {};
    if (day.completed && typeof day.completed === 'object') {
      for (const [id, rec] of Object.entries(day.completed)) {
        if (rec && typeof rec === 'object') completed[id] = rec;
      }
    }
    out[key] = { required, completed };
  }
  return out;
}

function sanitizeTimer(t) {
  if (!t || typeof t !== 'object') return null;
  const nums = ['startedAt', 'durationMs', 'endsAt'].every((k) => Number.isFinite(t[k]));
  if (!nums || typeof t.taskId !== 'string' || !DAY_KEY_RE.test(t.dayKey)) return null;
  return t;
}

/** Parses stored JSON into a valid state (pure; exported for tests). */
export function parseState(raw) {
  if (!raw) return emptyState();
  const s = JSON.parse(raw); // may throw: caller keeps a copy of the bad data
  if (!s || typeof s !== 'object') throw new Error('not an object');
  return {
    version: SCHEMA_VERSION,
    days: sanitizeDays(s.days),
    activeTimer: sanitizeTimer(s.activeTimer),
  };
}

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    return parseState(raw);
  } catch (e) {
    console.warn('Stored data unreadable; starting fresh and keeping a copy', e);
    try { if (raw) localStorage.setItem(`${STORAGE_KEY}.corrupt.${Date.now()}`, raw); } catch { /* full */ }
    return emptyState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save', e);
  }
}

/** Ask the browser not to evict our data under storage pressure (best effort). */
export function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch { /* unsupported */ }
}
