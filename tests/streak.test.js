import { suite, test, eq } from './harness.js';
import { computeStreaks } from '../js/streak.js';
import { recordCompletion } from '../js/history.js';
import { startTimer } from '../js/timer.js';
import { dayKey, addDays } from '../js/dates.js';

const IDS = ['meditate', 'read', 'journal', 'stretch'];

// Build days directly from keys (all tasks, or a subset).
function day(ids = IDS, required = IDS) {
  return { required: [...required], completed: Object.fromEntries(ids.map((id) => [id, { startedAt: 0, completedAt: 0 }])) };
}
function daysFrom(keys, partial = {}) {
  const d = {};
  for (const k of keys) d[k] = day();
  for (const [k, ids] of Object.entries(partial)) d[k] = day(ids);
  return d;
}
function range(startKey, n) { return Array.from({ length: n }, (_, i) => addDays(startKey, i)); }

suite('streak: counting and missed days');

test('no history', () => {
  eq(computeStreaks({}, '2026-11-09'), { current: 0, best: 0, todayComplete: false });
});

test('three nights in a row including tonight', () => {
  eq(computeStreaks(daysFrom(range('2026-11-07', 3)), '2026-11-09'), { current: 3, best: 3, todayComplete: true });
});

test('tonight not done yet keeps the streak alive', () => {
  eq(computeStreaks(daysFrom(range('2026-11-06', 3)), '2026-11-09'), { current: 3, best: 3, todayComplete: false });
});

test('a missed day breaks the streak (strict, no grace)', () => {
  const days = daysFrom([...range('2026-11-01', 4), ...range('2026-11-07', 2)]); // gap on 5th and 6th
  eq(computeStreaks(days, '2026-11-08'), { current: 2, best: 4, todayComplete: true });
});

test('missing last night resets current to 0, best is kept', () => {
  const days = daysFrom(range('2026-11-01', 5)); // 1st–5th; nothing on 6th–8th
  eq(computeStreaks(days, '2026-11-08'), { current: 0, best: 5, todayComplete: false });
});

test('a partly done day counts as missed', () => {
  const days = daysFrom(range('2026-11-06', 3), { '2026-11-07': ['meditate', 'read', 'journal'] });
  eq(computeStreaks(days, '2026-11-08'), { current: 1, best: 1, todayComplete: true });
});

test('a cancelled timer never reaches the record, so it cannot count', () => {
  // Only completions are recorded; a day with 3 completions + 1 cancel is incomplete.
  const days = daysFrom([], { '2026-11-09': ['meditate', 'read', 'journal'] });
  eq(computeStreaks(days, '2026-11-09').todayComplete, false);
});

test('streak across month and year boundaries', () => {
  eq(computeStreaks(daysFrom(range('2026-12-29', 5)), '2027-01-02').current, 5);
  eq(computeStreaks(daysFrom(range('2028-02-27', 4)), '2028-03-01').current, 4); // leap day
});

test('best streak is the longest run anywhere in history', () => {
  const days = daysFrom([...range('2026-01-01', 10), ...range('2026-03-01', 3), ...range('2026-11-08', 2)]);
  eq(computeStreaks(days, '2026-11-09'), { current: 2, best: 10, todayComplete: true });
});

suite('streak: the midnight boundary');

test('routine finishing after midnight still counts for that evening', () => {
  let days = daysFrom(range('2026-11-07', 2)); // 7th, 8th complete
  // 9th: three tasks before midnight, Stretch started 11:55 pm, finishes 12:05 am on the 10th.
  for (const id of ['meditate', 'read', 'journal']) {
    days = recordCompletion(days, startTimer(id, new Date(2026, 10, 9, 22, 0).getTime(), 1), new Date(2026, 10, 9, 22, 1).getTime(), IDS);
  }
  days = recordCompletion(days, startTimer('stretch', new Date(2026, 10, 9, 23, 55).getTime(), 600_000), new Date(2026, 10, 10, 0, 5).getTime(), IDS);
  eq(computeStreaks(days, '2026-11-10'), { current: 3, best: 3, todayComplete: false }, 'checked just after midnight');
});

test('a task started just after midnight belongs to the new day', () => {
  let days = daysFrom(range('2026-11-08', 1), { '2026-11-09': ['meditate', 'read', 'journal'] });
  days = recordCompletion(days, startTimer('stretch', new Date(2026, 10, 10, 0, 1).getTime(), 1), new Date(2026, 10, 10, 0, 11).getTime(), IDS);
  eq(computeStreaks(days, '2026-11-10'), { current: 0, best: 1, todayComplete: false }, '9th incomplete breaks it');
});

suite('streak: DST and time zones');

// Build a nightly routine at 10:30 pm local time in a given zone.
function nightlyIn(timeZone, startUtcMs, nights) {
  let days = {};
  for (let i = 0; i < nights; i++) {
    const ms = startUtcMs + i * 86_400_000;
    const key = dayKey(ms, timeZone);
    for (const id of IDS) days = recordCompletion(days, { taskId: id, dayKey: key, startedAt: ms }, ms + 1, IDS);
  }
  return days;
}

test('streak continues through US DST changes (spring and fall)', () => {
  // 10:30 pm New York ≈ 02:30/03:30 UTC next day; ±1h shift never changes the date.
  const spring = nightlyIn('America/New_York', Date.UTC(2026, 2, 5, 3, 0), 7); // 4–10 Mar
  eq(computeStreaks(spring, '2026-03-10').current, 7);
  const fall = nightlyIn('America/New_York', Date.UTC(2026, 9, 29, 2, 30), 7); // 28 Oct–3 Nov
  eq(computeStreaks(fall, '2026-11-03').current, 7);
});

test('streak continues through Australian DST change', () => {
  const syd = nightlyIn('Australia/Sydney', Date.UTC(2026, 9, 1, 12, 0), 7); // ~10–11 pm, 1–7 Oct
  eq(computeStreaks(syd, '2026-10-07').current, 7);
});

test('moving time zone mid-streak (London → New York) keeps nightly keys consecutive', () => {
  let days = nightlyIn('Europe/London', Date.UTC(2026, 10, 1, 22, 0), 3); // 1–3 Nov, 10 pm London
  const ny = nightlyIn('America/New_York', Date.UTC(2026, 10, 5, 3, 0), 3); // 4–6 Nov, 10 pm New York
  days = { ...days, ...ny };
  eq(Object.keys(days).sort(), range('2026-11-01', 6));
  eq(computeStreaks(days, '2026-11-06').current, 6);
});

test('stored day keys never change after a time-zone move', () => {
  const days = nightlyIn('Australia/Sydney', Date.UTC(2026, 10, 1, 11, 0), 2);
  const before = JSON.stringify(days);
  computeStreaks(days, '2026-11-02');
  eq(JSON.stringify(days), before);
});

suite('streak: tasks added later');

test('adding a 5th task keeps old 4-task days complete', () => {
  const days = daysFrom(range('2026-11-06', 3));
  const five = [...IDS, 'breathe'];
  days['2026-11-09'] = day(five, five);
  eq(computeStreaks(days, '2026-11-09'), { current: 4, best: 4, todayComplete: true });
  days['2026-11-09'] = day(IDS, five); // only the old 4 done tonight
  eq(computeStreaks(days, '2026-11-09'), { current: 3, best: 3, todayComplete: false });
});
