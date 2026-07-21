"use client";

import { useEffect } from 'react';

// Registers the service worker that makes GORGONA ONE installable to the Home
// Screen. Chrome / Android only fire `beforeinstallprompt` (the one-tap install
// path used by InstallPrompt) once a service worker with a fetch handler is
// controlling the page, so this registration is what unlocks installability on
// Android and desktop Chrome. iOS "Add to Home Screen" works without it, but the
// worker also gives every platform a graceful offline shell.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed', err);
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
