'use client';

import { useEffect } from 'react';

/**
 * Registers the offline app-shell service worker. Mounted once from the
 * root layout. Fails silently on browsers without SW support (e.g. some
 * in-app browsers) — the app still works online in that case, it just
 * won't be available offline.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-fatal: offline support simply won't be available.
      });
    }
  }, []);

  return null;
}
