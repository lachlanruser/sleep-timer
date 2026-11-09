// Offline support: precache the whole app and serve it cache-first.
// IMPORTANT: bump CACHE_VERSION on every deploy, or phones keep the old version.
const CACHE_VERSION = 'v2';
const CACHE = `sleep-timer-${CACHE_VERSION}`;

const FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/config.js',
  'js/dates.js',
  'js/timer.js',
  'js/store.js',
  'js/history.js',
  'js/streak.js',
  'js/pie.js',
  'js/wakelock.js',
  'js/chime.js',
  'js/icons.js',
  'js/effects.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sleep-timer-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // App launches (any ?query, e.g. ?fast) get the cached page. Other pages
  // (e.g. tests/) go to the network as normal.
  const appRoot = new URL('./', self.location).pathname;
  if (req.mode === 'navigate') {
    if (url.pathname !== appRoot && url.pathname !== `${appRoot}index.html`) return;
    event.respondWith(
      caches.match('index.html', { cacheName: CACHE }).then((hit) => hit || fetch(req)),
    );
    return;
  }

  event.respondWith(
    caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit || fetch(req)),
  );
});
