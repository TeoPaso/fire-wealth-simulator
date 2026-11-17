/* FIRE Planner Italia — service worker (docs/SPEC.md §8).
 *
 * - Precache: the app shell, manifest and icons, plus EVERY file of the build when scripts/sw-precache.mjs has
 *   injected the build manifest (it runs after `npm run build`; the e2e script runs it too). Without the manifest,
 *   the page posts the URLs it loaded (app/components/pwa/ServiceWorker.tsx), so the first online visit is enough to
 *   work offline either way (the CSS, JS chunks and fonts of that visit were fetched before this worker took control).
 * - The cache name carries the build's content hash, so every deploy gets a fresh cache and old caches (and stale
 *   chunks) are deleted on activate; no hand-bumped version.
 * - Navigations: only the app's own page ('/' or '/index.html' under the scope, any query string) is handled, so
 *   other sites on the same origin are never cached or answered with this app. Network first, but the cached shell
 *   wins when the network fails, answers 5xx, or takes longer than NAV_TIMEOUT_MS while a shell is cached.
 * - Hashed build assets under /_next/static/: cache first. Worker scripts are answered with a URL-less copy, so the
 *   worker keeps the "#params=" fragment Turbopack's worker bootstrap reads. Manifest and icons: cache, refreshed in
 *   the background.
 * - Only successful same-origin GET responses are cached; redirected responses are stored without the redirect
 *   flag (a redirected response cannot answer a navigation). */

// Replaced at build time by scripts/sw-precache.mjs with { version, urls } (urls relative to the scope).
const BUILD = /* @precache-manifest */ null;

const CACHE_PREFIX = 'fire-planner-';
const CACHE_NAME = `${CACHE_PREFIX}${BUILD ? BUILD.version : 'v2-unversioned'}`;
const SCOPE = new URL(self.registration.scope);
const SCOPE_PATH = SCOPE.pathname; // '/' (or the basePath)
const SHELL_URL = new URL('./', SCOPE).href;
const CORE_URLS = ['./', 'manifest.json', 'icons/icon-192x192.png', 'icons/icon-512x512.png'].map((u) => new URL(u, SCOPE).href);
const STATIC_PREFIX = new URL('_next/static/', SCOPE).pathname;
const NAV_TIMEOUT_MS = 4000;

const isCore = (href) => CORE_URLS.includes(href);
const isStatic = (url) => url.origin === SCOPE.origin && url.pathname.startsWith(STATIC_PREFIX);
const isAppPage = (url) =>
  url.origin === SCOPE.origin && (url.pathname === SCOPE_PATH || url.pathname === `${SCOPE_PATH}index.html`);

/** A response that can be stored and later answer any request (no redirect flag). */
async function storable(response) {
  if (!response || !response.ok || response.type === 'opaque' || response.type === 'opaqueredirect') return null;
  if (!response.redirected) return response;
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

const isWorkerScript = (request) => request.destination === 'worker' || request.destination === 'sharedworker';

/**
 * A copy of `response` with no URL of its own. A worker takes its `location` from the URL of the response that
 * answered it, and a cached response carries the URL it was stored under, WITHOUT the fragment: Turbopack starts a
 * worker from `turbopack-worker-<hash>.js#params=<chunks>`, and with the fragment gone its bootstrap fails ("Missing
 * worker bootstrap config"). A response built here has no URL, so the browser uses the request's URL, fragment
 * included.
 */
function withoutUrl(response) {
  if (!response || response.type === 'error') return response;
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

async function put(cache, key, response) {
  const clean = await storable(response);
  if (clean) await cache.put(key, clean);
}

/** Fetches and caches each URL independently: one missing file must not abort the others. */
async function cacheUrls(urls, { onlyMissing = false } = {}) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    urls.map(async (href) => {
      try {
        if (onlyMissing && (await cache.match(href))) return;
        await put(cache, href, await fetch(href, { cache: onlyMissing ? 'default' : 'reload' }));
      } catch {
        // Offline or missing: it will be cached on its next successful fetch.
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  const urls = [...CORE_URLS, ...(BUILD ? BUILD.urls.map((u) => new URL(u, SCOPE).href) : [])];
  event.waitUntil(cacheUrls(urls).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME).map((n) => caches.delete(n)));
      if (BUILD) {
        // Keep only this build's files (plus the core URLs): nothing from older deploys piles up.
        const keep = new Set([...CORE_URLS, ...BUILD.urls.map((u) => new URL(u, SCOPE).href)]);
        const cache = await caches.open(CACHE_NAME);
        for (const request of await cache.keys()) {
          const url = new URL(request.url);
          if (isStatic(url) && !keep.has(url.href)) await cache.delete(request);
        }
      }
      await self.clients.claim();
    })(),
  );
});

// The page reports the same-origin build assets it loaded before this worker controlled it.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'precache' || !Array.isArray(data.urls)) return;
  const urls = data.urls
    .filter((u) => typeof u === 'string')
    .map((u) => new URL(u, SCOPE))
    .filter((url) => isStatic(url) || isCore(url.href))
    .map((url) => url.href);
  event.waitUntil(cacheUrls([...new Set(urls)], { onlyMissing: true }));
});

async function cachedShell() {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(SHELL_URL, { ignoreSearch: true })) || (await caches.match(SHELL_URL, { ignoreSearch: true }));
}

/** Network first; the cached shell when offline, on 5xx, or when the network is slow and a shell is cached. */
async function navigate(event) {
  const shell = await cachedShell();
  const network = fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await put(cache, SHELL_URL, response.clone());
    }
    return response;
  });
  // The update of the cached shell may finish after we answered from the cache.
  event.waitUntil(network.catch(() => undefined));
  if (!shell) {
    try {
      return await network;
    } catch {
      return Response.error();
    }
  }
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  try {
    const response = await Promise.race([network, timeout]);
    if (!response) return shell; // slow network
    if (response.status >= 500) return shell; // broken deploy or hosting outage: the app and the data are local
    return response;
  } catch {
    return shell; // offline
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin) return;

  if (request.mode === 'navigate') {
    // Other pages of the same origin (e.g. other projects on a shared github.io root) are not ours.
    if (isAppPage(url)) event.respondWith(navigate(event));
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) =>
            cached ||
            fetch(request).then(async (response) => {
              const cache = await caches.open(CACHE_NAME);
              await put(cache, request, response.clone());
              return response;
            }),
        )
        .then((response) => (isWorkerScript(request) ? withoutUrl(response) : response)),
    );
    return;
  }

  // Manifest and icons: serve from cache when available, refresh in the background.
  if (isCore(url.href) && url.href !== SHELL_URL) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then(async (response) => {
            const cache = await caches.open(CACHE_NAME);
            await put(cache, request, response.clone());
            return response;
          })
          .catch(() => cached);
        if (cached) event.waitUntil(network.catch(() => undefined));
        return cached || network;
      }),
    );
  }
});
