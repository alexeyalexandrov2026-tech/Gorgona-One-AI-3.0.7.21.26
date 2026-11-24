// First-party zero-PII website analytics & partner attribution client.
// Never sends analytics inside the Miami Elio Android app WebView
// (Google Play Data safety declares no analytics in the app).

import { readAttributionCookie } from './attribution.mjs';

function isAndroidAppRuntime() {
  if (typeof window === 'undefined') return true;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const appMarker = typeof document !== 'undefined' ? document.documentElement?.dataset?.app || '' : '';
  return /\bMiamiElioApp\//.test(ua) || appMarker === 'android';
}

function activeLocale() {
  try {
    const match = /(?:^|;\s*)lang=([a-z]{2})/i.exec(document.cookie || '');
    return match ? match[1].toLowerCase() : 'en';
  } catch {
    return 'en';
  }
}

export function trackEvent(eventName, payload = {}) {
  if (isAndroidAppRuntime()) return;
  try {
    const body = JSON.stringify({
      eventName,
      provider: payload.provider || null,
      targetHost: payload.targetHost || null,
      itemSlug: payload.itemSlug || payload.eventSlug || null,
      pagePath: payload.pagePath || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      locale: payload.locale || activeLocale(),
      deviceType: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
      attribution: payload.attribution || readAttributionCookie(typeof document !== 'undefined' ? document.cookie : '')
    });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/track', blob)) return;
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {});
  } catch {
    /* never interrupt guest navigation */
  }
}

export function trackEventView(eventSlug) {
  trackEvent('event_view', { itemSlug: eventSlug, provider: 'ticketnetwork' });
}

export function trackTicketClick(eventSlug, providerSlug) {
  trackEvent('ticket_click', { itemSlug: eventSlug, provider: providerSlug || 'ticketnetwork' });
}

export function trackProviderClick(providerSlug) {
  trackEvent('partner_click', { provider: providerSlug });
}
