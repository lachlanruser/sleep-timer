import { suite, test, eq, ok } from './harness.js';
import * as T from '../js/timer.js';

const MIN = 60_000;
const t0 = new Date(2026, 10, 9, 21, 0, 0).getTime(); // 9 Nov 2026, 9:00 pm local

suite('timer: end-time based countdown');

test('start stores an end time, not a tick count', () => {
  const t = T.startTimer('read', t0, 10 * MIN);
  eq(t.endsAt, t0 + 10 * MIN);
  eq(T.remainingMs(t, t0), 10 * MIN);
  eq(t.pausedRemainingMs, null);
});

test('remaining time is correct after a long throttled gap', () => {
  const t = T.startTimer('read', t0, 10 * MIN);
  eq(T.remainingMs(t, t0 + 7 * MIN + 30_000), 2 * MIN + 30_000);
});

test('completes when returning long after the end (locked screen)', () => {
  const t = T.startTimer('meditate', t0, 5 * MIN);
  ok(!T.isDone(t, t0 + 5 * MIN - 1), 'not done 1 ms before');
  ok(T.isDone(t, t0 + 5 * MIN), 'done exactly at end');
  ok(T.isDone(t, t0 + 3 * 60 * MIN), 'done hours later');
  eq(T.remainingMs(t, t0 + 3 * 60 * MIN), 0, 'never negative');
});

test('pause freezes remaining time; resume moves the end time', () => {
  let t = T.startTimer('journal', t0, 5 * MIN);
  t = T.pause(t, t0 + 2 * MIN);
  eq(T.remainingMs(t, t0 + 50 * MIN), 3 * MIN, 'frozen while paused');
  ok(!T.isDone(t, t0 + 50 * MIN), 'paused timer never completes');
  t = T.resume(t, t0 + 50 * MIN);
  eq(t.endsAt, t0 + 53 * MIN);
  eq(T.remainingMs(t, t0 + 51 * MIN), 2 * MIN);
});

test('pause and resume are idempotent', () => {
  let t = T.startTimer('journal', t0, 5 * MIN);
  const p1 = T.pause(t, t0 + MIN);
  const p2 = T.pause(p1, t0 + 4 * MIN);
  eq(p2.pausedRemainingMs, 4 * MIN);
  eq(T.resume(t, t0 + MIN), t, 'resume on a running timer is a no-op');
});

test('progress runs 0 → 1 and clamps', () => {
  const t = T.startTimer('read', t0, 10 * MIN);
  eq(T.progress(t, t0), 0);
  eq(T.progress(t, t0 + 5 * MIN), 0.5);
  eq(T.progress(t, t0 + 99 * MIN), 1);
});

test('counts for the day the timer started, even across midnight', () => {
  const lateStart = new Date(2026, 10, 9, 23, 55).getTime();
  const t = T.startTimer('stretch', lateStart, 10 * MIN);
  eq(t.dayKey, '2026-11-09');
  ok(T.isDone(t, new Date(2026, 10, 10, 0, 5).getTime()));
  const afterMidnight = T.startTimer('stretch', new Date(2026, 10, 10, 0, 1).getTime(), 10 * MIN);
  eq(afterMidnight.dayKey, '2026-11-10');
});

test('formatRemaining rounds up to whole seconds', () => {
  eq(T.formatRemaining(10 * MIN), '10:00');
  eq(T.formatRemaining(5 * MIN - 1), '5:00');
  eq(T.formatRemaining(61_000), '1:01');
  eq(T.formatRemaining(1), '0:01');
  eq(T.formatRemaining(0), '0:00');
  eq(T.formatRemaining(-500), '0:00');
});
