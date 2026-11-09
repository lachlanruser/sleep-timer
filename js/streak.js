// Streak = consecutive days on which every required task was completed.
// Strict: any missed day ends it. Tonight not being done *yet* doesn't break it;
// the current streak counts back from today if today is complete, else from yesterday.
import { addDays, daysBetween } from './dates.js';
import { isDayComplete } from './history.js';

export function computeStreaks(days, todayKey) {
  const complete = Object.keys(days).filter((k) => isDayComplete(days[k])).sort();
  const set = new Set(complete);

  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of complete) {
    run = prev && daysBetween(prev, key) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }

  const todayComplete = set.has(todayKey);
  let cursor = todayComplete ? todayKey : addDays(todayKey, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return { current, best, todayComplete };
}
