/**
 * MAAR AI service worker.
 *
 * Scope: cache the app shell (HTML, JS, CSS, fonts, branding, background
 * image) so the app still opens offline and the person can read, search,
 * and export their locally-stored conversations. It deliberately never
 * caches /api/* — generation always requires the network, and we never
 * want a stale streamed response served from cache.
 */
const CACHE_NAME = 'maar-ai-shell-v2';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/logo.svg',
  '/logo-compact.svg',
  '/favicon.svg',
  '/background.jpg',
  '/background-tiny.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      // Best-effort: if a single asset fails (e.g. offline first install), don't block activation.
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept the streaming chat API or any cross-origin request.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.method !== 'GET') return;

  // Navigations: try the network first (fresh app shell), fall back to cache when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Static assets: cache-first, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
