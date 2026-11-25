import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  classifyOutboundPartner,
  parseAttributionFromUrl,
  readAttributionCookie,
  serializeAttributionCookie
} from '../../lib/attribution.mjs';
import { resetTrackRateLimitForTests, trackHandlers } from '../../lib/server/trackHandler.mjs';

const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

test('first-party attribution captures UTM, fbclid, gclid and external referrers while ignoring own domains', () => {
  const fb = parseAttributionFromUrl(
    'https://gorgona-one.com/yachts?fbclid=IwAR12345&utm_campaign=miami_spring',
    'https://l.instagram.com/'
  );
  assert.equal(fb.utmSource, 'meta');
  assert.equal(fb.utmMedium, 'paid');
  assert.equal(fb.utmCampaign, 'miami_spring');
  assert.equal(fb.clickIdType, 'fbclid');
  assert.equal(fb.fbclid, 'IwAR12345');
  assert.equal(fb.landingPath, '/yachts');
  assert.equal(fb.referrerHost, 'l.instagram.com');

  const cookie = serializeAttributionCookie(fb);
  assert.match(cookie, /^me_attr=.*Max-Age=2592000; SameSite=Lax; Secure$/);
  const parsed = readAttributionCookie(`lang=ru; ${cookie.split(';')[0]}`);
  assert.equal(parsed.utmCampaign, 'miami_spring');
  assert.equal(parsed.clickIdType, 'fbclid');
  assert.equal(parsed.fbclid, 'IwAR12345');

  const ownNav = parseAttributionFromUrl('https://gorgona-one.com/rentals', 'https://gorgona-one.com/');
  assert.equal(ownNav, null);
});

test('outbound partner classifier maps all Miami Elio monetization partners & messengers and skips internal links', () => {
  assert.deepEqual(classifyOutboundPartner('https://www.viator.com/tours/Miami/123?uid=U00885857'), {
    eventName: 'partner_click',
    provider: 'viator',
    targetHost: 'viator.com'
  });
  assert.deepEqual(classifyOutboundPartner('https://partner.headout.com/miami'), {
    eventName: 'partner_click',
    provider: 'headout',
    targetHost: 'partner.headout.com'
  });
  assert.deepEqual(classifyOutboundPartner('https://www.yatr.co/charters'), {
    eventName: 'partner_click',
    provider: 'yatr',
    targetHost: 'yatr.co'
  });
  assert.deepEqual(classifyOutboundPartner('https://www.stay22.com/allez/roam'), {
    eventName: 'partner_click',
    provider: 'stay22',
    targetHost: 'stay22.com'
  });
  assert.deepEqual(classifyOutboundPartner('https://t.me/MIAMI_ELIO?text=Hi'), {
    eventName: 'telegram_click',
    provider: 'telegram',
    targetHost: 't.me'
  });
  assert.deepEqual(classifyOutboundPartner('https://wa.me/message/VO7GCPZCDKRZO1'), {
    eventName: 'whatsapp_click',
    provider: 'whatsapp',
    targetHost: 'wa.me'
  });
  assert.equal(classifyOutboundPartner('https://gorgona-one.com/rentals'), null);
  assert.equal(classifyOutboundPartner('https://miamielio.com/yachts'), null);
});

test('/api/track enforces origin, skips Android app WebView, persists zero-PII funnel events and forwards Meta CAPI', async () => {
  resetTrackRateLimitForTests();
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify({ events_received: 1 }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const env = {
    APP_ENV: 'production',
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'srv-secret-key',
    META_PIXEL_ID: '1234567890',
    META_CAPI_TOKEN: 'EAAG_test_token'
  };
  const handler = trackHandlers(env, { fetcher: fakeFetch, clock: () => 1700000000000 });

  // Cross-origin rejected
  const badOrigin = await handler.ingest(new Request('https://gorgona-one.com/api/track', {
    method: 'POST',
    headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
    body: JSON.stringify({ eventName: 'partner_click', provider: 'viator' })
  }));
  assert.equal(badOrigin.status, 403);

  // Android WebView strictly skipped (Google Play Data safety)
  const androidRes = await handler.ingest(new Request('https://gorgona-one.com/api/track', {
    method: 'POST',
    headers: {
      origin: 'https://gorgona-one.com',
      'user-agent': 'Mozilla/5.0 MiamiElioApp/1.4 Android',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ eventName: 'partner_click', provider: 'viator' })
  }));
  assert.equal(androidRes.status, 202);
  assert.equal(calls.length, 0);

  // Valid website partner click with fbclid cookie writes zero-PII Supabase row + fires Meta CAPI InitiateCheckout
  const attrCookie = serializeAttributionCookie({
    utmSource: 'meta',
    utmMedium: 'paid',
    utmCampaign: 'miami_yachts',
    clickIdType: 'fbclid',
    fbclid: 'IwAR_secret_fb_click',
    landingPath: '/yachts'
  }).split(';')[0];

  const okRes = await handler.ingest(new Request('https://gorgona-one.com/api/track', {
    method: 'POST',
    headers: {
      origin: 'https://gorgona-one.com',
      cookie: attrCookie,
      'cf-connecting-ip': '198.51.100.42',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      eventName: 'partner_click',
      provider: 'viator',
      targetHost: 'viator.com',
      pagePath: '/yachts',
      locale: 'ru'
    })
  }));
  assert.equal(okRes.status, 202);
  assert.equal(calls.length, 2);

  const supa = calls.find((c) => c.url.includes('/rest/v1/funnel_events'));
  assert.ok(supa, 'must insert into Supabase funnel_events');
  assert.equal(supa.body.event_name, 'partner_click');
  assert.equal(supa.body.provider, 'viator');
  assert.equal(supa.body.utm_source, 'meta');
  assert.equal(supa.body.click_id_type, 'fbclid');
  assert.equal(supa.body.device_type, 'mobile');
  assert.equal(JSON.stringify(supa.body).includes('IwAR_secret_fb_click'), false, 'raw fbclid must never be stored in funnel_events');

  const capi = calls.find((c) => c.url.includes('graph.facebook.com/v21.0/1234567890/events'));
  assert.ok(capi, 'must forward high-intent partner click to Meta CAPI when configured');
  assert.equal(capi.body.data[0].event_name, 'InitiateCheckout');
  assert.match(capi.body.data[0].user_data.fbc, /^fb\.1\.\d+\.IwAR_secret_fb_click$/);
});

test('SQL migration and client analytics enforce RLS lockdown and Android app exclusion', () => {
  const sql = read('supabase/migrations/20261124040000_funnel_attribution_and_events.sql');
  assert.match(sql, /create table if not exists public\.funnel_events/);
  assert.match(sql, /create table if not exists public\.booking_attributions/);
  assert.match(sql, /alter table public\.funnel_events enable row level security/);
  assert.match(sql, /alter table public\.booking_attributions enable row level security/);
  assert.match(sql, /revoke all on public\.funnel_events from public, anon, authenticated/);
  assert.match(sql, /create or replace function public\.funnel_metrics_summary_7d/);

  assert.match(read('lib/analytics.js'), /MiamiElioApp/);
  assert.match(read('app/components/ai/AiConversation.jsx'), /data-voice-mode-toggle="true"/);
  assert.doesNotMatch(read('lib/ai/analyticsCopy.mjs'), /AI Concierge|AI-консьерж/i);
});
