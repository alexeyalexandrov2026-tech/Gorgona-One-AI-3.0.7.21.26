// ===========================================================================
// First-party marketing attribution (UTM / fbclid / gclid / landing path)
// and outbound partner link classification.
// Pure module (no DOM or Next.js imports) so server handlers, client beacons,
// and Node unit tests share one canonical definition.
// ===========================================================================

export const ATTRIBUTION_COOKIE = 'me_attr';
export const ATTRIBUTION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const OWN_HOSTS = new Set([
  'gorgona-one.com',
  'www.gorgona-one.com',
  'miamielio.com',
  'www.miamielio.com',
  'localhost',
  '127.0.0.1'
]);

const CLICK_ID_KEYS = ['fbclid', 'gclid', 'ttclid', 'msclkid'];

function cleanText(value, max = 80) {
  const s = String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
  if (!s) return null;
  return s.slice(0, max);
}

function cleanPath(value) {
  const s = String(value || '').trim();
  if (!s.startsWith('/')) return null;
  return s.split('?')[0].split('#')[0].slice(0, 200) || '/';
}

function cleanHost(rawUrl) {
  try {
    const host = new URL(String(rawUrl || '')).hostname.toLowerCase().replace(/^www\./, '');
    return host ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

export function sanitizeAttribution(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const clickIdType = CLICK_ID_KEYS.includes(raw.clickIdType) ? raw.clickIdType : null;
  const out = {
    utmSource: cleanText(raw.utmSource ?? raw.utm_source, 80),
    utmMedium: cleanText(raw.utmMedium ?? raw.utm_medium, 80),
    utmCampaign: cleanText(raw.utmCampaign ?? raw.utm_campaign, 120),
    utmContent: cleanText(raw.utmContent ?? raw.utm_content, 120),
    clickIdType,
    // Keep raw fbclid strictly validated & optional for Meta CAPI fbc matching; never stored in funnel_events.
    fbclid: clickIdType === 'fbclid' && /^[A-Za-z0-9._-]{1,160}$/.test(String(raw.fbclid || '').trim())
      ? String(raw.fbclid).trim()
      : null,
    landingPath: cleanPath(raw.landingPath ?? raw.landing_path),
    referrerHost: cleanText(raw.referrerHost ?? raw.referrer_host, 120)
  };
  const hasSignal = Boolean(
    out.utmSource || out.utmMedium || out.utmCampaign || out.clickIdType || out.referrerHost || out.landingPath
  );
  return hasSignal ? out : null;
}

export function parseAttributionFromUrl(urlStr, referrerStr = '') {
  try {
    const url = new URL(String(urlStr || 'https://gorgona-one.com/'));
    const params = url.searchParams;
    const utmSource = cleanText(params.get('utm_source'), 80);
    const utmMedium = cleanText(params.get('utm_medium'), 80);
    const utmCampaign = cleanText(params.get('utm_campaign'), 120);
    const utmContent = cleanText(params.get('utm_content'), 120);
    let clickIdType = null;
    let fbclid = null;
    for (const key of CLICK_ID_KEYS) {
      const v = cleanText(params.get(key), 160);
      if (v) {
        clickIdType = key;
        if (key === 'fbclid') fbclid = v;
        break;
      }
    }
    const rawRefHost = cleanHost(referrerStr);
    const referrerHost = rawRefHost && !OWN_HOSTS.has(rawRefHost) && !OWN_HOSTS.has(`www.${rawRefHost}`)
      ? rawRefHost
      : null;

    const hasCampaignSignal = Boolean(utmSource || utmMedium || utmCampaign || clickIdType || referrerHost);
    if (!hasCampaignSignal) return null;

    return sanitizeAttribution({
      utmSource: utmSource || (clickIdType === 'fbclid' ? 'meta' : clickIdType === 'gclid' ? 'google' : clickIdType === 'ttclid' ? 'tiktok' : null),
      utmMedium: utmMedium || (clickIdType ? 'paid' : referrerHost ? 'referral' : null),
      utmCampaign,
      utmContent,
      clickIdType,
      fbclid,
      landingPath: url.pathname || '/',
      referrerHost
    });
  } catch {
    return null;
  }
}

export function readAttributionCookie(cookieHeader = '') {
  const raw = String(cookieHeader || '');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name !== ATTRIBUTION_COOKIE) continue;
    const val = part.slice(idx + 1).trim();
    try {
      return sanitizeAttribution(JSON.parse(decodeURIComponent(val)));
    } catch {
      return null;
    }
  }
  return null;
}

export function serializeAttributionCookie(attr, { secure = true } = {}) {
  const clean = sanitizeAttribution(attr);
  if (!clean) return '';
  const compact = Object.fromEntries(Object.entries(clean).filter(([, v]) => v !== null));
  const encoded = encodeURIComponent(JSON.stringify(compact));
  return `${ATTRIBUTION_COOKIE}=${encoded}; Path=/; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; SameSite=Lax${secure ? '; Secure' : ''}`;
}

const PARTNER_RULES = [
  [/^(?:t\.me|telegram\.me|telegram\.org)$/i, 'telegram_click', 'telegram'],
  [/^(?:wa\.me|api\.whatsapp\.com|whatsapp\.com)$/i, 'whatsapp_click', 'whatsapp'],
  [/(?:^|\.)viator\.com$/i, 'partner_click', 'viator'],
  [/(?:^|\.)headout\.com$/i, 'partner_click', 'headout'],
  [/(?:^|\.)yatr\.co$/i, 'partner_click', 'yatr'],
  [/(?:^|\.)stay22\.com$/i, 'partner_click', 'stay22'],
  [/(?:^|\.)(?:ticketnetwork\.com|tn-cloud\.net)$/i, 'partner_click', 'ticketnetwork'],
  [/(?:^|\.)(?:ovago\.com|dpbolvw\.net|kqzyfj\.com|tkqlhce\.com|jdoqocy\.com|anrdoezrs\.net)$/i, 'partner_click', 'ovago'],
  [/(?:^|\.)privatejetfinder\.com$/i, 'partner_click', 'privatejetfinder'],
  [/(?:^|\.)resy\.com$/i, 'partner_click', 'resy'],
  [/(?:^|\.)sevenrooms\.com$/i, 'partner_click', 'sevenrooms'],
  [/(?:^|\.)opentable\.com$/i, 'partner_click', 'opentable'],
  [/(?:^|\.)exploretock\.com$/i, 'partner_click', 'tock'],
  [/(?:^|\.)dice\.fm$/i, 'partner_click', 'dice'],
  [/(?:^|\.)booking\.com$/i, 'partner_click', 'booking'],
  [/(?:^|\.)expedia\.com$/i, 'partner_click', 'expedia'],
  [/(?:^|\.)vrbo\.com$/i, 'partner_click', 'vrbo'],
  [/(?:^|\.)airbnb\.com$/i, 'partner_click', 'airbnb']
];

export function classifyOutboundPartner(href) {
  try {
    const url = new URL(String(href || ''));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!host || OWN_HOSTS.has(host) || OWN_HOSTS.has(`www.${host}`)) return null;
    for (const [pattern, eventName, provider] of PARTNER_RULES) {
      if (pattern.test(host)) {
        return { eventName, provider, targetHost: host.slice(0, 120) };
      }
    }
    return {
      eventName: 'partner_click',
      provider: host.split('.')[0].slice(0, 40) || 'external',
      targetHost: host.slice(0, 120)
    };
  } catch {
    return null;
  }
}
