// Day keys are local calendar dates as 'YYYY-MM-DD' strings; the day ends at midnight.
// Arithmetic is done on the key itself (anchored at UTC noon), so DST changes and
// time-zone travel can never skip or duplicate a day.

const DAY_MS = 86_400_000;
const pad = (n) => String(n).padStart(2, '0');

/** Day key for a timestamp, in the device's local zone or an explicit IANA zone. */
export function dayKey(ms, timeZone) {
  if (timeZone) {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(ms));
  }
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function keyToUtcNoon(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 12);
}

export function addDays(key, n) {
  const d = new Date(keyToUtcNoon(key) + n * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Whole days from key `a` to key `b` (positive if b is later). */
export function daysBetween(a, b) {
  return Math.round((keyToUtcNoon(b) - keyToUtcNoon(a)) / DAY_MS);
}
