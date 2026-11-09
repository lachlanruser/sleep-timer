// The routine. Adding a task here adds a slice to the circle.
// `sound` is reserved for V2 (per-task music); unused in V1.
export const TASKS = [
  { id: 'meditate', name: 'Meditate', minutes: 5, sound: null },
  { id: 'read', name: 'Read', minutes: 10, sound: null },
  { id: 'journal', name: 'Journal', minutes: 5, sound: null },
  { id: 'stretch', name: 'Stretch', minutes: 10, sound: null },
];

export const STORAGE_KEY = 'sleepTimer.v1';

// `?fast` in the URL: each minute lasts 2 seconds (for testing only).
export const FAST = new URLSearchParams(location.search).has('fast');

export function durationMs(task) {
  return task.minutes * (FAST ? 2_000 : 60_000);
}
