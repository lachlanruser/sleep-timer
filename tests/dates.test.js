import { suite, test, eq } from './harness.js';
import { dayKey, addDays, daysBetween } from '../js/dates.js';

suite('dates: day keys and the midnight boundary');

test('local day key, midnight boundary', () => {
  eq(dayKey(new Date(2026, 10, 9, 23, 59, 59).getTime()), '2026-11-09');
  eq(dayKey(new Date(2026, 10, 10, 0, 0, 0).getTime()), '2026-11-10');
});

test('day key in explicit time zones (same instant, different days)', () => {
  const instant = Date.UTC(2026, 10, 9, 13, 30); // 13:30 UTC
  eq(dayKey(instant, 'Australia/Sydney'), '2026-11-10'); // 00:30 next day (AEDT, UTC+11)
  eq(dayKey(instant, 'Europe/London'), '2026-11-09');
  eq(dayKey(instant, 'America/Los_Angeles'), '2026-11-09'); // 05:30
  eq(dayKey(Date.UTC(2026, 10, 10, 7, 59), 'America/Los_Angeles'), '2026-11-09'); // 23:59 PST
});

test('addDays across month, year and leap day', () => {
  eq(addDays('2026-11-30', 1), '2026-12-01');
  eq(addDays('2026-12-31', 1), '2027-01-01');
  eq(addDays('2028-02-28', 1), '2028-02-29');
  eq(addDays('2027-02-28', 1), '2027-03-01');
  eq(addDays('2026-01-01', -1), '2025-12-31');
});

test('addDays is unaffected by DST changes (US, EU, AU)', () => {
  eq(addDays('2026-03-07', 1), '2026-03-08'); // US spring forward 8 Mar
  eq(addDays('2026-03-08', 1), '2026-03-09');
  eq(addDays('2026-03-29', 1), '2026-03-30'); // EU spring forward
  eq(addDays('2026-04-05', 1), '2026-04-06'); // AU fall back
  eq(addDays('2026-10-04', 1), '2026-10-05'); // AU spring forward
  eq(addDays('2026-11-01', 1), '2026-11-02'); // US fall back
});

test('daysBetween', () => {
  eq(daysBetween('2026-11-09', '2026-11-09'), 0);
  eq(daysBetween('2026-11-09', '2026-11-10'), 1);
  eq(daysBetween('2026-11-10', '2026-11-09'), -1);
  eq(daysBetween('2026-03-01', '2026-04-01'), 31); // spans US/EU DST
  eq(daysBetween('2026-12-31', '2027-01-01'), 1);
});

test('consecutive late-night instants across a DST night map to consecutive days', () => {
  // 11:30 pm Sydney on 3 and 4 Oct 2026 (AU DST starts 4 Oct at 2 am).
  const a = dayKey(Date.UTC(2026, 9, 3, 13, 30), 'Australia/Sydney'); // UTC+10 → 23:30 on 3 Oct
  const b = dayKey(Date.UTC(2026, 9, 4, 12, 30), 'Australia/Sydney'); // UTC+11 → 23:30 on 4 Oct
  eq([a, b], ['2026-10-03', '2026-10-04']);
  eq(daysBetween(a, b), 1);
});
