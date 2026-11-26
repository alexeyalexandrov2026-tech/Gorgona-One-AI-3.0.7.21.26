// ===========================================================================
// First-party conversion & partner click tracking handler (/api/track).
//
// - Strictly same-origin, rate-limited, zero-PII persistence into Supabase
//   `public.funnel_events`.
// - Optional server-side Meta Conversions API (CAPI) forwarding when
//   META_PIXEL_ID + META_CAPI_TOKEN are configured in Cloudflare Secrets.
// - Never throws or blocks guest navigation; fails safe when offline.
// ===========================================================================

import { digest, json, readBody, RequestError, failure } from './dashboardCore.mjs';
import { normalizeLocale } from '../ai/locale.js';
import { readAttributionCookie, sanitizeAttribution } from '../attribution.mjs';

const ALLOWED_EVENTS = new Set([
  'page_landing',
  'partner_click',
  'telegram_click',
  'whatsapp_click',
  'elio_open',
  'lead_submit',
  'plan_submit',
  'ticket_click',
  'event_view',
  'voice_play'
]);

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 60;
const recentByIp = new Map();

async function resolveRuntimeEnv(env) {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cfEnv = getCloudflareContext()?.env;
    if (cfEnv && typeof cfEnv === 'object') return { ...env, ...cfEnv };
  } catch {
    /* local Node / test environment */
  }
  return env || process.env;
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  if (!origin) return env.APP_ENV !== 'production';
  try {
    const parsed = new URL(origin);
    if (env.APP_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return true;
    const reqUrl = new URL(request.url);
    if (parsed.origin === reqUrl.origin) return true;
    const allowed = new Set([
      'https://gorgona-one.com',
      'https://miamielio.com',
      'https://www.miamielio.com',
      ...String(env.PUBLIC_SITE_ORIGIN || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
    ]);
    return allowed.has(parsed.origin);
  } catch {
    return false;
  }
}

function hitRateLimit(key, now = Date.now()) {
  const cutoff = now - WINDOW_MS;
  const list = (recentByIp.get(key) || []).filter((ts) => ts > cutoff);
  if (list.length >= MAX_PER_WINDOW) {
    recentByIp.set(key, list);
    return true;
  }
  list.push(now);
  recentByIp.set(key, list);
  if (recentByIp.size > 500) {
    for (const [k, v] of recentByIp.entries()) {
      if (!v.some((ts) => ts > cutoff)) recentByIp.delete(k);
    }
  }
  return false;
}

function cleanStr(value, max = 120) {
  const s = String(value || '').replace(/[\r\n\t]+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}

function cleanPath(value) {
  const s = String(value || '').trim();
  if (!s.startsWith('/')) return null;
  return s.split('?')[0].split('#')[0].slice(0, 200) || '/';
}

const META_EVENT_MAP = Object.freeze({
  lead_submit: 'Lead',
  plan_submit: 'Lead',
  partner_click: 'InitiateCheckout',
  ticket_click: 'InitiateCheckout',
  telegram_click: 'Contact',
  whatsapp_click: 'Contact'
});

const OUTBOUND_TIMEOUT_MS = 4000;

export async function runBackgroundTask(promise) {
  const safe = Promise.resolve(promise).catch(() => {});
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = getCloudflareContext()?.ctx;
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(safe);
      return;
    }
  } catch {
    /* local Node / unit tests without Workers ctx */
  }
  await safe;
}

export async function forwardMetaCapiEvent({ eventName, pagePath, provider, itemSlug, attribution, request, env, fetcher = fetch }) {
  // Honor US CCPA/CPRA Global Privacy Control (Sec-GPC: 1) opt-out of ad sharing.
  if (request?.headers?.get?.('sec-gpc') === '1') return false;
  const pixelId = String(env?.META_PIXEL_ID || '').trim();
  const token = String(env?.META_CAPI_TOKEN || '').trim();
  const metaName = META_EVENT_MAP[eventName];
  if (!pixelId || !token || !metaName) return false;

  const userData = {};
  const ip = request?.headers?.get?.('cf-connecting-ip');
  const ua = request?.headers?.get?.('user-agent');
  if (ip) userData.client_ip_address = ip;
  if (ua) userData.client_user_agent = ua.slice(0, 300);
  if (attribution?.fbclid && /^[A-Za-z0-9._-]{1,160}$/.test(attribution.fbclid)) {
    userData.fbc = `fb.1.${Date.now()}.${attribution.fbclid}`;
  }

  const origin = String(env?.PUBLIC_SITE_ORIGIN || 'https://gorgona-one.com').split(',')[0].trim().replace(/\/$/, '');
  const payload = {
    data: [
      {
        event_name: metaName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: `${origin}${pagePath || '/'}`,
        user_data: userData,
        custom_data: {
          ...(provider ? { content_category: provider } : {}),
          ...(itemSlug ? { content_name: itemSlug } : {})
        }
      }
    ]
  };
  if (env?.META_TEST_EVENT_CODE) payload.test_event_code = String(env.META_TEST_EVENT_CODE).trim();

  try {
    const res = await fetcher(`https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events`, {
      method: 'POST',
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    return Boolean(res?.ok);
  } catch {
    return false;
  }
}

async function supabaseServiceInsert(path, body, env, fetcher = fetch, prefer = 'return=minimal') {
  const baseUrl = String(env?.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!baseUrl || !serviceKey) return false;
  try {
    const res = await fetcher(`${baseUrl}${path}`, {
      method: 'POST',
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
        Prefer: prefer
      },
      body: JSON.stringify(body)
    });
    return Boolean(res?.ok);
  } catch {
    return false;
  }
}

export async function recordFunnelEvent(row, env, fetcher = fetch) {
  return supabaseServiceInsert('/rest/v1/funnel_events', row, env, fetcher, 'return=minimal');
}

export async function recordBookingAttribution(bookingId, attr, env, fetcher = fetch) {
  const clean = sanitizeAttribution(attr);
  if (!bookingId || !clean) return false;
  return supabaseServiceInsert(
    '/rest/v1/booking_attributions',
    {
      booking_id: bookingId,
      utm_source: clean.utmSource,
      utm_medium: clean.utmMedium,
      utm_campaign: clean.utmCampaign,
      utm_content: clean.utmContent,
      click_id_type: clean.clickIdType,
      landing_path: clean.landingPath,
      referrer_host: clean.referrerHost
    },
    env,
    fetcher,
    'resolution=ignore-duplicates,return=minimal'
  );
}

export function resetTrackRateLimitForTests() {
  recentByIp.clear();
}

export function trackHandlers(env = process.env, { fetcher = fetch, clock = () => Date.now() } = {}) {
  return {
    ingest: async (request) => {
      try {
        const runtimeEnv = await resolveRuntimeEnv(env);
        if (!allowedOrigin(request, runtimeEnv)) throw new RequestError(403, 'Forbidden');

        // Never track inside the Miami Elio Android app WebView (Google Play Data safety).
        const ua = request.headers.get('user-agent') || '';
        if (/\bMiamiElioApp\//.test(ua)) return json({ ok: true, skipped: 'app' }, 202);

        const rawIp = request.headers.get('cf-connecting-ip');
        const validIp = Boolean(rawIp && /^[a-f0-9:.]{3,64}$/i.test(rawIp));
        if (!validIp && runtimeEnv.APP_ENV === 'production') throw new RequestError(503, 'Service unavailable');
        const rateKey = await digest(validIp ? rawIp : 'local');
        if (hitRateLimit(rateKey, clock())) throw new RequestError(429, 'Too many requests');

        const body = await readBody(request, 4096);
        const eventName = String(body?.eventName || body?.event || '').trim();
        if (!ALLOWED_EVENTS.has(eventName)) throw new RequestError(400, 'Invalid event');

        const cookieAttr = readAttributionCookie(request.headers.get('cookie') || '');
        const bodyAttr = sanitizeAttribution(body?.attribution);
        const attr = bodyAttr || cookieAttr;
        const deviceType = body?.deviceType === 'mobile' || /Mobile|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';

        const row = {
          event_name: eventName,
          provider: cleanStr(body?.provider, 40)?.toLowerCase() || null,
          page_path: cleanPath(body?.pagePath),
          target_host: cleanStr(body?.targetHost, 120)?.toLowerCase() || null,
          item_slug: cleanStr(body?.itemSlug, 160),
          locale: normalizeLocale(body?.locale || 'en'),
          utm_source: attr?.utmSource || null,
          utm_medium: attr?.utmMedium || null,
          utm_campaign: attr?.utmCampaign || null,
          utm_content: attr?.utmContent || null,
          click_id_type: attr?.clickIdType || null,
          landing_path: attr?.landingPath || null,
          referrer_host: attr?.referrerHost || null,
          device_type: deviceType
        };

        await Promise.all([
          recordFunnelEvent(row, runtimeEnv, fetcher),
          forwardMetaCapiEvent({
            eventName,
            pagePath: row.page_path,
            provider: row.provider,
            itemSlug: row.item_slug,
            attribution: attr,
            request,
            env: runtimeEnv,
            fetcher
          })
        ]);

        return json({ ok: true }, 202);
      } catch (error) {
        return failure(error);
      }
    }
  };
}
