"use client";

import { useEffect } from 'react';
import { isMiamiElioApp } from './AnalyticsBeacon';

// Registers the conservative offline-shell service worker (/sw.js) on the
// public web so Chrome/Edge/Android fire `beforeinstallprompt` for one-tap
// Home Screen installation. Never registers inside the native app WebViews.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in window.navigator)) return;
    if (isMiamiElioApp(window.navigator.userAgent, document.documentElement.dataset.app)) return;
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) return;

    const register = () => {
      window.navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    };

    if (document.readyState === 'complete') {
      register();
      return undefined;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
