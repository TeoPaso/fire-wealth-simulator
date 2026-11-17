'use client';

import { useEffect } from 'react';

/** Same-origin build assets this page has loaded so far (scripts, styles, fonts, worker chunks). */
function loadedAssetUrls(): string[] {
  const urls = new Set<string>();
  const add = (href: string | null | undefined) => {
    if (!href) return;
    try {
      const url = new URL(href, location.href);
      if (url.origin === location.origin && url.pathname.includes('/_next/static/')) urls.add(url.href);
    } catch {
      // Not a URL.
    }
  };
  for (const entry of performance.getEntriesByType('resource')) add(entry.name);
  document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((s) => add(s.src));
  document.querySelectorAll<HTMLLinkElement>('link[href]').forEach((l) => add(l.href));
  return [...urls];
}

/**
 * Registers /sw.js in production builds only (in development it would cache stale bundles). Registration runs
 * immediately in an effect: waiting for window 'load' would never fire after hydration (v1 bug UI-10).
 *
 * The CSS, JS chunks and fonts of the first visit are downloaded BEFORE the service worker controls the page, so
 * they never pass through its fetch handler: once it is active, the page tells it which assets it loaded (now and
 * again a few seconds later, when the lazy chunks and the analysis worker have loaded), so a single online visit is
 * enough to start offline (ROB-02). The build-time manifest (scripts/sw-precache.mjs) covers the rest.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let timer: number | undefined;
    let cancelled = false;
    const report = () => {
      const worker = navigator.serviceWorker.controller ?? null;
      navigator.serviceWorker.ready
        .then((registration) => {
          const target = worker ?? registration.active;
          if (!cancelled) target?.postMessage({ type: 'precache', urls: loadedAssetUrls() });
        })
        .catch(() => undefined);
    };
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        report();
        timer = window.setTimeout(report, 5000);
      })
      .catch((error: unknown) => {
        console.warn('[pwa] service worker registration failed', error);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
