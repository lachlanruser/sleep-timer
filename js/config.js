// The routine. Adding a task here adds a slice to the circle.
// `icon` is a name from js/icons.js. `sound` is reserved for V2 (per-task music); unused in V1.
export const TASKS = [
  { id: 'meditate', name: 'Meditate', minutes: 5, icon: 'lotus', sound: null },
  { id: 'read', name: 'Read', minutes: 10, icon: 'book', sound: null },
  { id: 'journal', name: 'Journal', minutes: 5, icon: 'pencil', sound: null },
  { id: 'stretch', name: 'Stretch', minutes: 10, icon: 'stretch', sound: null },
];

export const STORAGE_KEY = 'sleepTimer.v1';

// `?fast` in the URL: each minute lasts 2 seconds (for testing only).
export const FAST = new URLSearchParams(location.search).has('fast');

export function durationMs(task) {
  return task.minutes * (FAST ? 2_000 : 60_000);
}
