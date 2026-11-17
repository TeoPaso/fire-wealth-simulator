'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js in production builds only (in development it would cache stale bundles). Registration runs
 * immediately in an effect: waiting for window 'load' would never fire after hydration (v1 bug UI-10).
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('[pwa] service worker registration failed', error);
    });
  }, []);
  return null;
}
