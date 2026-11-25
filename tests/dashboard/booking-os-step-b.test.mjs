import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, ids } from './database.mjs';
import { provider, fixtureEnv } from './provider.mjs';
import { dashboardHandlers } from '../../lib/server/dashboardHandlers.mjs';
import { paymentQuoteHandlers, resetPayGuardsForTests } from '../../lib/server/paymentQuoteHandlers.mjs';
import { TERMS_VERSION } from '../../lib/legal/termsContent.mjs';
import { BOOKING_STEP_B_COPY } from '../../lib/legal/bookingStepBCopy.mjs';
import { generateQrMatrix, buildReservationIcs } from '../../lib/legal/passArtifacts.mjs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';

async function signStripeHeader(rawBody, secret, timestamp) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

test('Booking OS Step B: Stripe Identity 30-sec KYC, Flight-Synced Delivery logistics, and webhook sync', async () => {
  resetPayGuardsForTests();
  const db = await fixture();
  try {
    const dbFetch = provider(db);
    const identityCalls = [];

    const combinedFetch = async (input, options = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === 'https://api.stripe.com/v1/identity/verification_sessions' && options.method === 'POST') {
        const params = new URLSearchParams(String(options.body || ''));
        identityCalls.push(params);
        return Response.json({
          id: 'vs_test_elio_kyc_001',
          status: 'requires_input',
          url: 'https://verify.stripe.com/start/test_elio_kyc_001'
        });
      }
      if (url === 'https://api.stripe.com/v1/identity/verification_sessions/vs_test_elio_kyc_001') {
        return Response.json({
          id: 'vs_test_elio_kyc_001',
          status: 'verified',
          metadata: { quote_id: createdQuoteId }
        });
      }
      return dbFetch(input, options);
    };

    const env = {
      ...fixtureEnv,
      STRIPE_SECRET_KEY: 'sk_test_fixture_stepb_secret_123456',
      STRIPE_WEBHOOK_SECRET: 'whsec_fixture_stepb_secret_123456'
    };
    const dash = dashboardHandlers(env, combinedFetch);
    const quotes = paymentQuoteHandlers(env, combinedFetch);

    const bookRes = await dash.book(new Request('http://localhost/api/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        'cf-connecting-ip': '198.51.100.22'
      },
      body: JSON.stringify({
        name: 'Sofia Laurent',
        email: 'sofia@example.com',
        phone: '+17865550199',
        dates: '2026-12-22 → 2026-12-24 · OPF Private FBO',
        itemSlug: 'lamborghini-urus-se',
        itemTitle: 'Lamborghini Urus SE',
        kind: 'car',
        termsAccepted: true,
        termsVersion: TERMS_VERSION
      })
    }));
    const booking = await bookRes.json();
    assert.equal(booking.success, true);

    const created = await (await quotes.createQuote(new Request('http://localhost/api/dashboard/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: 'Bearer ' + ids.admin
      },
      body: JSON.stringify({
        bookingId: booking.bookingId,
        itemTitle: 'Lamborghini Urus SE',
        kind: 'car',
        supplierName: 'Miami Elio Fleet',
        serviceDates: '2026-12-22 · 15:00 EST',
        cancellationPolicy: 'Free cancellation up to 48h prior.',
        amountCents: 240000,
        clientName: 'Sofia Laurent',
        clientEmail: 'sofia@example.com',
        kycRequired: true
      })
    }))).json();

    const createdQuoteId = created.quote.id;
    const token = created.quote.publicToken;
    assert.equal(created.quote.kycRequired, true);
    assert.equal(created.quote.kycStatus, 'pending');

    // 1. Start 30-sec Stripe Identity KYC
    const kycStart = await quotes.startKyc(new Request(`http://localhost/api/pay/${token}/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    }), token);
    assert.equal(kycStart.status, 200);
    const kycData = await kycStart.json();
    assert.equal(kycData.sessionId, 'vs_test_elio_kyc_001');
    assert.equal(identityCalls[0].get('type'), 'document');
    assert.equal(identityCalls[0].get('options[document][require_matching_selfie]'), 'true');

    // 2. Return lookup marks KYC verified
    const afterKyc = await (await quotes.getPublicQuote(
      new Request(`http://localhost/api/pay/${token}?kyc_session_id=vs_test_elio_kyc_001`),
      token
    )).json();
    assert.equal(afterKyc.quote.kycStatus, 'verified');
    assert.ok(afterKyc.quote.kycVerifiedAt);

    // 3. Stripe Identity webhook also handles requires_input / verified cleanly
    const whBody = JSON.stringify({
      id: 'evt_stepb_kyc_verified',
      type: 'identity.verification_session.verified',
      data: { object: { id: 'vs_test_elio_kyc_001', metadata: { quote_id: createdQuoteId } } }
    });
    const nowSec = Math.floor(Date.now() / 1000);
    const whRes = await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': await signStripeHeader(whBody, env.STRIPE_WEBHOOK_SECRET, nowSec) },
      body: whBody
    }));
    assert.equal(whRes.status, 200);

    // 4. Guest submits Flight-Synced Delivery logistics
    const logRes = await quotes.updateLogistics(new Request(`http://localhost/api/pay/${token}/logistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flightNumber: 'aa 1245',
        arrivalAirport: 'OPF — Opa-Locka Private FBO',
        arrivalTime: 'Dec 22 · 14:40 EST',
        deliveryLocation: 'Fontainebleau Aviation Ramp, Hangar 3'
      })
    }), token);
    assert.equal(logRes.status, 200);
    const logData = await logRes.json();
    assert.equal(logData.flightNumber, 'AA 1245');
    assert.equal(logData.arrivalAirport, 'OPF — Opa-Locka Private FBO');

    const finalQuote = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token)).json();
    assert.equal(finalQuote.quote.flightNumber, 'AA 1245');
    assert.equal(finalQuote.quote.deliveryLocation, 'Fontainebleau Aviation Ramp, Hangar 3');
  } finally {
    await db.close();
  }
});

test('Booking OS Step B: ISO QR code matrix, RFC 5545 .ics calendar pass, and 16-language copy', () => {
  const qr = generateQrMatrix('https://gorgona-one.com/pay/ELIO-8K4M2P9Q');
  assert.ok(qr.size >= 25 && qr.size <= 41);
  // Top-left 7x7 finder pattern must have dark border and dark 3x3 center
  assert.equal(qr.grid[0][0], 1);
  assert.equal(qr.grid[0][6], 1);
  assert.equal(qr.grid[6][0], 1);
  assert.equal(qr.grid[3][3], 1);
  assert.equal(qr.grid[1][1], 0);

  const ics = buildReservationIcs({
    referenceCode: 'ELIO-8K4M2P9Q',
    itemTitle: 'Lamborghini Urus SE',
    supplierName: 'Miami Elio Fleet',
    serviceDates: '2026-12-22 · 15:00 EST',
    flightNumber: 'AA 1245',
    arrivalAirport: 'OPF — Opa-Locka Private FBO',
    deliveryLocation: 'Fontainebleau Aviation Ramp',
    kycStatus: 'verified',
    weatherShieldEnabled: true
  }, 'https://gorgona-one.com/pay/demo');
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /SUMMARY:MIAMI ELIO · Lamborghini Urus SE/);
  assert.match(ics, /Flight Sync: AA 1245/);
  assert.match(ics, /NOAA Weather Shield: Active/);
  assert.match(ics, /END:VCALENDAR/);

  const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
  const enKeys = Object.keys(BOOKING_STEP_B_COPY.en).sort();
  for (const lang of langs) {
    assert.ok(BOOKING_STEP_B_COPY[lang], `missing Step B copy for ${lang}`);
    assert.deepEqual(Object.keys(BOOKING_STEP_B_COPY[lang]).sort(), enKeys, lang);
    for (const key of enKeys) {
      const value = BOOKING_STEP_B_COPY[lang][key];
      assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
      assert.equal(/concierge|консьерж/i.test(value), false, `${lang}.${key} must not contain concierge wording`);
    }
  }
});
