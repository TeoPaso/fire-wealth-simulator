/* FIRE Planner Italia — service worker (docs/SPEC.md §8).
 * - precache the app shell, manifest and icons;
 * - cache-first for hashed build assets under /_next/static/ (immutable);
 * - network-first for navigations, falling back to the cached /index.html when offline;
 * - only successful (response.ok) same-origin GET responses are cached;
 * - old caches are deleted on activate. Bump CACHE_VERSION on every release that changes precached files. */
const CACHE_VERSION = 'v2.0.0-1';
const CACHE_NAME = `fire-planner-${CACHE_VERSION}`;
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // Cache each URL independently: one missing file must not abort the installation.
        Promise.all(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: 'reload' })
              .then((response) => (response.ok ? cache.put(url, response) : undefined))
              .catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name.startsWith('fire-planner-') && name !== CACHE_NAME).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function putInCache(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putInCache(request, response);
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/index.html'))
            .then((cached) => cached || caches.match('/'))
            .then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            putInCache(request, response);
            return response;
          }),
      ),
    );
    return;
  }

  // Manifest and icons: serve from cache when available, refresh in the background.
  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            putInCache(request, response);
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
