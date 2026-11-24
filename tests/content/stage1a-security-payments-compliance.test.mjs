import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createStripeCheckoutSession } from '../../lib/server/paymentProviders.mjs';
import { paymentQuoteHandlers, resetPayGuardsForTests } from '../../lib/server/paymentQuoteHandlers.mjs';
import { emailPlanHandlers, resetEmailPlanRateLimitForTests } from '../../lib/server/emailPlanHandler.mjs';
import { whisperHandlers, resetWhisperRateLimitForTests } from '../../lib/server/whisperHandler.mjs';
import { trackHandlers, forwardMetaCapiEvent, resetTrackRateLimitForTests } from '../../lib/server/trackHandler.mjs';
import { sanitizeAttribution } from '../../lib/attribution.mjs';
import { buildPlanIcs } from '../../lib/ai/dayTimeline.mjs';
import { serializeJsonLd } from '../../lib/seo.mjs';
import { getPrivacySupplementCopy } from '../../lib/legal/privacySupplementCopy.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const LOCALES = ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];

test('Stripe Checkout uses Dynamic Payment Methods (no hardcoded card-only restriction)', async () => {
  let capturedBody = '';
  const fakeFetch = async (url, init) => {
    capturedBody = String(init.body || '');
    return new Response(JSON.stringify({ id: 'cs_test_dynamic', url: 'https://checkout.stripe.com/c/pay/cs_test_dynamic' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };
  const session = await createStripeCheckoutSession(
    { STRIPE_SECRET_KEY: 'sk_test_1234567890' },
    {
      quote: {
        id: '11111111-1111-4111-8111-111111111111',
        referenceCode: 'ELIO-2026-0001',
        itemTitle: 'Rolls-Royce Cullinan',
        supplierName: 'Miami Elio Fleet',
        serviceDates: 'Nov 28 - Nov 30',
        amountCents: 250000,
        currency: 'USD',
        clientEmail: 'guest@example.com'
      },
      token: 'tok123',
      origin: 'https://gorgona-one.com',
      idempotencyKey: 'quote-idem-key'
    },
    fakeFetch
  );
  assert.equal(session.sessionId, 'cs_test_dynamic');
  const params = new URLSearchParams(capturedBody);
  assert.equal(params.has('payment_method_types[0]'), false, 'must omit hardcoded card-only payment_method_types so Apple Pay / Google Pay / Link stay active');
  assert.equal(params.get('payment_method_options[card][request_three_d_secure]'), 'any');
});

test('signQuote fails closed in production when BOOKING_RATE_SECRET is missing or short', async () => {
  resetPayGuardsForTests();
  const handlers = paymentQuoteHandlers({
    APP_ENV: 'production',
    BOOKING_RATE_SECRET: 'short',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key'
  });
  const token = 'abcdef1234567890abcdef1234567890';
  const req = new Request(`https://gorgona-one.com/api/pay/${token}/sign`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://gorgona-one.com',
      'cf-connecting-ip': '203.0.113.10'
    },
    body: JSON.stringify({
      signerName: 'Alex Guest',
      agreeTerms: true,
      agreeEsign: true,
      agreeChargeback: true
    })
  });
  const res = await handlers.signQuote(req, token);
  assert.equal(res.status, 503);
});

test('emailPlan enforces IP-only rate limit and dedicated daily cap before exhausting owner alerts', async () => {
  resetEmailPlanRateLimitForTests();
  let reserveCalls = 0;
  let resendCalls = 0;
  const fakeFetch = async (url) => {
    const u = String(url);
    if (u.includes('dashboard_reserve_email')) {
      reserveCalls += 1;
      return new Response('true', { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (u.includes('api.resend.com')) {
      resendCalls += 1;
      return new Response(JSON.stringify({ id: 'email_1' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 200 });
  };
  const { send } = emailPlanHandlers({
    APP_ENV: 'test',
    RESEND_API_KEY: 're_test_key',
    NOTIFICATIONS_FROM_EMAIL: 'concierge@gorgona-one.com',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key'
  }, fakeFetch);
  const makeReq = (email) => new Request('https://gorgona-one.com/api/concierge/email-plan', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://gorgona-one.com',
      'cf-connecting-ip': '198.51.100.77'
    },
    body: JSON.stringify({
      email,
      locale: 'en',
      planText: 'Saturday in Miami: 12:00 Lunch at Milos South of Fifth, 16:00 Brickell Rooftop Sunset, 20:00 Dinner at Carbone.'
    })
  });
  for (let i = 0; i < 3; i += 1) {
    const r = await send(makeReq(`victim${i}@example.com`));
    assert.equal(r.status, 200);
  }
  const blocked = await send(makeReq('victim3@example.com'));
  assert.equal(blocked.status, 429);
  assert.equal(reserveCalls, 3);
  assert.equal(resendCalls, 3);
});

test('whisperHandler rejects oversized Content-Length before reading formData', async () => {
  resetWhisperRateLimitForTests();
  let formDataRead = false;
  const fakeReq = {
    url: 'https://gorgona-one.com/api/concierge/transcribe',
    headers: new Headers({
      origin: 'https://gorgona-one.com',
      'cf-connecting-ip': '198.51.100.88',
      'content-type': 'multipart/form-data; boundary=---test',
      'content-length': String(10 * 1024 * 1024)
    }),
    async formData() {
      formDataRead = true;
      return new FormData();
    }
  };
  const { transcribe } = whisperHandlers({ APP_ENV: 'test', OPENAI_API_KEY: 'sk-test' });
  const res = await transcribe(fakeReq);
  assert.equal(res.status, 413);
  assert.equal(formDataRead, false, 'oversized payload must be rejected before buffering multipart formData');
});

test('Meta CAPI honors Sec-GPC: 1 opt-out and sends Bearer token in Authorization header (never query string)', async () => {
  let capturedUrl = '';
  let capturedAuth = '';
  let fetchCount = 0;
  const fakeFetch = async (url, init) => {
    fetchCount += 1;
    capturedUrl = String(url);
    capturedAuth = init?.headers?.Authorization || init?.headers?.authorization || '';
    return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
  };
  const env = { META_PIXEL_ID: '123456789', META_CAPI_TOKEN: 'secret_capi_token' };

  const gpcReq = new Request('https://gorgona-one.com/api/track', {
    method: 'POST',
    headers: { 'sec-gpc': '1', 'cf-connecting-ip': '203.0.113.5' }
  });
  const gpcRes = await forwardMetaCapiEvent({ eventName: 'lead_submit', pagePath: '/', request: gpcReq, env, fetcher: fakeFetch });
  assert.equal(gpcRes, false);
  assert.equal(fetchCount, 0);

  const normalReq = new Request('https://gorgona-one.com/api/track', {
    method: 'POST',
    headers: { 'cf-connecting-ip': '203.0.113.6', 'user-agent': 'Mozilla/5.0' }
  });
  const okRes = await forwardMetaCapiEvent({ eventName: 'lead_submit', pagePath: '/', request: normalReq, env, fetcher: fakeFetch });
  assert.equal(okRes, true);
  assert.equal(capturedUrl.includes('access_token'), false, 'Meta token must never be placed in URL query string');
  assert.equal(capturedAuth, 'Bearer secret_capi_token');
});

test('trackHandlers rejects cross-site sec-fetch-site same-site and validates fbclid strictly', async () => {
  resetTrackRateLimitForTests();
  const { ingest } = trackHandlers({ APP_ENV: 'production' });
  const req = new Request('https://gorgona-one.com/api/track', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'sec-fetch-site': 'same-site',
      'cf-connecting-ip': '203.0.113.21'
    },
    body: JSON.stringify({ event: 'partner_click', pagePath: '/' })
  });
  const res = await ingest(req);
  assert.equal(res.status, 403);

  const validAttr = sanitizeAttribution({ fbclid: 'IwAR0_valid-id.123', clickIdType: 'fbclid' });
  assert.equal(validAttr.fbclid, 'IwAR0_valid-id.123');
  const injectedAttr = sanitizeAttribution({ fbclid: 'bad;inject\r\nfoo', clickIdType: 'fbclid' });
  assert.equal(injectedAttr.fbclid, null);
});

test('ICS escaping strips CR/LF and JSON-LD serializer escapes HTML/script breaking characters', () => {
  const ics = buildPlanIcs({
    sections: [
      {
        kind: 'dining',
        label: 'Dinner',
        href: '/restaurants-nightlife',
        candidates: [{ title: 'Milos\r\nINJECT:YES', href: '/restaurants-nightlife/milos' }]
      }
    ]
  }, null, 'en');
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.equal(/\r(?!\n)/.test(ics), false, 'no bare CR characters allowed in ICS output');
  assert.equal(ics.includes('INJECT\\:YES') || ics.includes('INJECT:YES'), true);
  assert.equal(ics.includes('\r\nINJECT:YES'), false, 'CRLF injection must be escaped into \\n');

  const safeJson = serializeJsonLd({ name: '</script><script>alert(1)</script>&\u2028\u2029' });
  assert.equal(safeJson.includes('</script>'), false);
  assert.equal(safeJson.includes('\\u003c/script\\u003e'), true);
  assert.equal(safeJson.includes('\\u2028'), true);
  assert.equal(safeJson.includes('\\u2029'), true);
});

test('privacy supplement copy exists for all 16 locales, voice.js avoids query-string API key, and security headers are present', () => {
  for (const locale of LOCALES) {
    const copy = getPrivacySupplementCopy(locale);
    assert.ok(copy.updated && copy.updated.length > 5, `missing updated for ${locale}`);
    assert.ok(copy.processorsTitle && copy.processorsTitle.length > 5, `missing processorsTitle for ${locale}`);
    assert.ok(copy.processorsBody && copy.processorsBody.length > 20, `missing processorsBody for ${locale}`);
    assert.ok(copy.usRightsTitle && copy.usRightsTitle.length > 5, `missing usRightsTitle for ${locale}`);
    assert.ok(copy.usRightsBody && copy.usRightsBody.length > 20, `missing usRightsBody for ${locale}`);
    assert.ok(copy.cookiesBody && copy.cookiesBody.length > 20, `missing cookiesBody for ${locale}`);
  }
  const voiceSrc = fs.readFileSync(path.join(ROOT, 'lib', 'ai', 'voice.js'), 'utf8');
  assert.equal(voiceSrc.includes('?key='), false, 'Google TTS API key must be passed in X-Goog-Api-Key header');
  assert.equal(voiceSrc.includes('X-Goog-Api-Key'), true);

  const mwSrc = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');
  assert.equal(mwSrc.includes('Cross-Origin-Opener-Policy'), true);
  assert.equal(mwSrc.includes('X-Permitted-Cross-Domain-Policies'), true);
});
