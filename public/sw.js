/* Minimal service worker for GORGONA ONE.
 *
 * Primary purpose: make the app installable to the Home Screen. Chrome / Android
 * only fire `beforeinstallprompt` (the one-tap install path in InstallPrompt.jsx)
 * once a service worker with a fetch handler is controlling the page, so without
 * this file there is no installation experience on Android or desktop Chrome.
 *
 * It stays deliberately conservative: the concierge depends on live data, so we
 * are network-first and never cache API responses or page HTML. The only cached
 * item is a homepage shell used as an offline fallback for navigations, so an
 * installed launch never lands on the browser's error page.
 */

const CACHE = 'gorgona-shell-v1';
const OFFLINE_SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Only intervene on top-level page navigations; everything else (API calls,
  // assets) passes straight through to the network untouched.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_SHELL)));
  }
});
