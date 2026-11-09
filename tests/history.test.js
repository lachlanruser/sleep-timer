import { suite, test, eq, ok } from './harness.js';
import { recordCompletion, completedIds, isDayComplete } from '../js/history.js';
import { completedRuns } from '../js/pie.js';
import { startTimer } from '../js/timer.js';

const IDS = ['meditate', 'read', 'journal', 'stretch'];
const at = (h, m, d = 9) => new Date(2026, 10, d, h, m).getTime();

suite('history: per-day completion record');

test('records a completed task with a snapshot of required tasks', () => {
  const t = startTimer('read', at(21, 0), 600_000);
  const days = recordCompletion({}, t, at(21, 10), IDS);
  eq(days['2026-11-09'].required, IDS);
  eq(days['2026-11-09'].completed.read, { startedAt: at(21, 0), completedAt: at(21, 10) });
});

test('a timer crossing midnight counts for the evening it started', () => {
  const t = startTimer('stretch', at(23, 55), 600_000);
  const days = recordCompletion({}, t, at(0, 5, 10), IDS);
  ok(completedIds(days, '2026-11-09').has('stretch'));
  eq(completedIds(days, '2026-11-10').size, 0);
});

test('first completion wins; recording again is a no-op', () => {
  const t = startTimer('read', at(21, 0), 1);
  const d1 = recordCompletion({}, t, at(21, 1), IDS);
  const d2 = recordCompletion(d1, { ...t, startedAt: at(22, 0) }, at(22, 1), IDS);
  eq(d2, d1);
});

test('day is complete only when every required task is done', () => {
  let days = {};
  for (const id of IDS.slice(0, 3)) days = recordCompletion(days, startTimer(id, at(21, 0), 1), at(21, 1), IDS);
  ok(!isDayComplete(days['2026-11-09']), '3 of 4 is not complete');
  days = recordCompletion(days, startTimer('stretch', at(21, 30), 1), at(21, 31), IDS);
  ok(isDayComplete(days['2026-11-09']), '4 of 4 is complete');
  ok(!isDayComplete(undefined), 'missing day is not complete');
});

test('adding a task later does not change an old day', () => {
  let days = {};
  for (const id of IDS) days = recordCompletion(days, startTimer(id, at(21, 0), 1), at(21, 1), IDS);
  ok(isDayComplete(days['2026-11-09']));
  // Next week the user adds "breathe"; the old day keeps its 4-task snapshot.
  const newIds = [...IDS, 'breathe'];
  days = recordCompletion(days, startTimer('read', at(21, 0, 16), 1), at(21, 1, 16), newIds);
  ok(isDayComplete(days['2026-11-09']), 'old day still complete');
  eq(days['2026-11-16'].required, newIds);
});

suite('pie: completed slices join into runs');

test('runs of neighbours, wrapping around the circle', () => {
  eq(completedRuns([false, false, false, false]), []);
  eq(completedRuns([true, false, false, false]), [{ start: 0, length: 1 }]);
  eq(completedRuns([true, true, false, false]), [{ start: 0, length: 2 }]);
  eq(completedRuns([true, false, true, false]), [{ start: 0, length: 1 }, { start: 2, length: 1 }]);
  eq(completedRuns([true, false, false, true]), [{ start: 3, length: 2 }], 'stretch + meditate join across the top');
  eq(completedRuns([true, true, true, true]), [{ start: 0, length: 4 }]);
  eq(completedRuns([true, true, false, true, true]), [{ start: 3, length: 4 }], 'works for 5 tasks');
});
