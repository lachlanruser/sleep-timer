// Pure helpers for the per-day completion record:
// days = { 'YYYY-MM-DD': { required: [taskIds], completed: { taskId: { startedAt, completedAt } } } }
// `required` is snapshotted when a day is first written, so adding a task later
// never changes whether an old day counted as complete.

/** Returns a new `days` object with the timer's task recorded for the day it started. */
export function recordCompletion(days, timer, completedAt, taskIds) {
  const key = timer.dayKey;
  const day = days[key] ?? { required: [...taskIds], completed: {} };
  if (day.completed[timer.taskId]) return days; // first completion wins
  return {
    ...days,
    [key]: {
      ...day,
      completed: {
        ...day.completed,
        [timer.taskId]: { startedAt: timer.startedAt, completedAt },
      },
    },
  };
}

export function completedIds(days, key) {
  return new Set(Object.keys(days[key]?.completed ?? {}));
}

export function isDayComplete(day) {
  return !!day && day.required.length > 0 && day.required.every((id) => day.completed[id]);
}
