"use client";
import { useEffect } from 'react';

// Cloudflare Web Analytics for the website only. The Miami Elio Android app
// declares no analytics in Google Play Data safety, so the beacon is never
// loaded inside its WebView (User-Agent "MiamiElioApp/…" or data-app="android").
export function isMiamiElioApp(userAgent = '', appMarker = '') {
  return /\bMiamiElioApp\//.test(userAgent) || appMarker === 'android';
}

export function AnalyticsBeacon({ token }) {
  useEffect(() => {
    if (!token || isMiamiElioApp(navigator.userAgent, document.documentElement.dataset.app)) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
    document.body.appendChild(script);
  }, [token]);
  return null;
}
