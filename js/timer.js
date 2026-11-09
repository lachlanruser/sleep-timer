// Pure timer logic based on a stored end time (never on counting ticks), so a
// throttled page or a locked screen still shows the right time on return.
import { dayKey } from './dates.js';

export function startTimer(taskId, now, durationMs) {
  return {
    taskId,
    dayKey: dayKey(now), // counts for the day the timer *started*
    startedAt: now,
    durationMs,
    endsAt: now + durationMs,
    pausedRemainingMs: null,
  };
}

export const isPaused = (t) => t.pausedRemainingMs != null;

export function remainingMs(t, now) {
  if (isPaused(t)) return t.pausedRemainingMs;
  return Math.max(0, t.endsAt - now);
}

export function isDone(t, now) {
  return !isPaused(t) && now >= t.endsAt;
}

/** 0 at start → 1 when finished. */
export function progress(t, now) {
  return Math.min(1, Math.max(0, 1 - remainingMs(t, now) / t.durationMs));
}

export function pause(t, now) {
  if (isPaused(t)) return t;
  return { ...t, pausedRemainingMs: remainingMs(t, now) };
}

export function resume(t, now) {
  if (!isPaused(t)) return t;
  return { ...t, endsAt: now + t.pausedRemainingMs, pausedRemainingMs: null };
}

/** 'm:ss', rounding up so the display reads 0:00 only when finished. */
export function formatRemaining(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
