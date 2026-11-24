"use client";
import { useEffect } from 'react';
import { classifyOutboundPartner, parseAttributionFromUrl, readAttributionCookie, serializeAttributionCookie } from '../../lib/attribution.mjs';
import { trackEvent } from '../../lib/analytics';

// Cloudflare Web Analytics & first-party website attribution for the web only.
// The Miami Elio Android app declares no analytics in Google Play Data safety,
// so neither the beacon nor first-party tracking ever runs inside its WebView
// (User-Agent "MiamiElioApp/…" or data-app="android").
export function isMiamiElioApp(userAgent = '', appMarker = '') {
  return /\bMiamiElioApp\//.test(userAgent) || appMarker === 'android' || appMarker === 'ios';
}

const LANDING_SESSION_KEY = 'me_landing_tracked';

export function AnalyticsBeacon({ token }) {
  useEffect(() => {
    if (isMiamiElioApp(navigator.userAgent, document.documentElement.dataset.app)) return undefined;
    // Honor browser Global Privacy Control (US CCPA/CPRA opt-out of ad sharing & marketing cookies).
    const gpcOptOut = Boolean(navigator.globalPrivacyControl);

    // 1. Optional Cloudflare Web Analytics beacon (web only, skipped under GPC opt-out).
    if (!gpcOptOut && token && !document.querySelector('script[data-cf-beacon]')) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
      document.body.appendChild(script);
    }

    // 2. First-party UTM / fbclid / gclid / referrer capture (30-day cookie, skipped under GPC).
    if (!gpcOptOut) {
      try {
        const fresh = parseAttributionFromUrl(window.location.href, document.referrer || '');
        const existing = readAttributionCookie(document.cookie || '');
        // Prefer fresh campaign/ad click attribution over older referral; otherwise keep existing.
        const shouldWrite = Boolean(
          fresh && (!existing || fresh.clickIdType || fresh.utmSource)
        );
        if (shouldWrite) {
          document.cookie = serializeAttributionCookie(fresh, { secure: window.location.protocol === 'https:' });
        }
        const activeAttr = shouldWrite ? fresh : existing;
        if (activeAttr && !window.sessionStorage?.getItem(LANDING_SESSION_KEY)) {
          window.sessionStorage?.setItem(LANDING_SESSION_KEY, '1');
          trackEvent('page_landing', {
            pagePath: window.location.pathname,
            attribution: activeAttr
          });
        }
      } catch {
        /* ignore restricted storage environments */
      }
    }

    // 3. Global passive outbound partner & messenger click tracker (covers every
    //    catalog page, footer link, and ELIO+ Guide card automatically).
    function onDocumentClick(event) {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const anchor = target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('/') || href.startsWith('#')) return;
      const classified = classifyOutboundPartner(href);
      if (!classified) return;
      trackEvent(classified.eventName, {
        provider: classified.provider,
        targetHost: classified.targetHost,
        pagePath: window.location.pathname
      });
    }

    document.addEventListener('click', onDocumentClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', onDocumentClick, { capture: true });
    };
  }, [token]);

  return null;
}
