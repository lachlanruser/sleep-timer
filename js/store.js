// Persistence in localStorage. Everything lives on the phone only.
import { STORAGE_KEY } from './config.js';

const SCHEMA_VERSION = 1;

export function emptyState() {
  return { version: SCHEMA_VERSION, days: {}, activeTimer: null };
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return emptyState();
    return { ...emptyState(), ...s, version: SCHEMA_VERSION };
  } catch {
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
