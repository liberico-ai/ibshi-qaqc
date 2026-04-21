// Service worker for IBSHI QAQC — handles app shell caching
// API request queueing is handled at application layer (offline-queue.js)

const CACHE_NAME = 'ibshi-qaqc-shell-v1';
const SHELL_ASSETS = ['/'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Remove old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Pass through API calls — queueing is handled by the app
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for navigation, cache fallback for app shell
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match('/').then(r => r || fetch(e.request))
      )
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
