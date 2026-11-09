import { suite, test, eq, ok } from './harness.js';
import { parseState, emptyState } from '../js/store.js';

suite('store: loading saved data safely');

test('nothing saved → empty state', () => {
  eq(parseState(null), emptyState());
});

test('round-trips valid data', () => {
  const s = {
    version: 1,
    days: { '2026-11-09': { required: ['read'], completed: { read: { startedAt: 1, completedAt: 2 } } } },
    activeTimer: { taskId: 'read', dayKey: '2026-11-09', startedAt: 1, durationMs: 10, endsAt: 11, pausedRemainingMs: null },
  };
  eq(parseState(JSON.stringify(s)), s);
});

test('drops malformed days and timers instead of crashing', () => {
  const s = parseState(JSON.stringify({
    days: { 'not-a-date': {}, '2026-11-09': { required: 'x', completed: null } },
    activeTimer: { taskId: 3 },
  }));
  eq(s.days, { '2026-11-09': { required: [], completed: {} } });
  eq(s.activeTimer, null);
});

test('unreadable JSON throws so load() can keep a copy', () => {
  let threw = false;
  try { parseState('{oops'); } catch { threw = true; }
  ok(threw);
});
