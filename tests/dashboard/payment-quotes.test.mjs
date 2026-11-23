import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixture, ids, asUser } from './database.mjs';
import { provider, fixtureEnv } from './provider.mjs';
import { dashboardHandlers } from '../../lib/server/dashboardHandlers.mjs';
import { paymentQuoteHandlers } from '../../lib/server/paymentQuoteHandlers.mjs';
import { verifyStripeWebhookSignature } from '../../lib/server/paymentProviders.mjs';
import { formatTelegramNotification } from '../../lib/server/ownerNotificationText.mjs';
import {
  TERMS_VERSION,
  TERMS_SECTIONS,
  PARTNER_AGREEMENT_SECTIONS,
  ESIGN_CLAUSES,
  computeAgreementHash
} from '../../lib/legal/termsContent.mjs';
import { CHECKOUT_COPY } from '../../lib/legal/checkoutCopy.mjs';
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

test('payment quotes, ESIGN guardrail, private phone lock, Stripe 3DS2 & PayPal settlement, and clickwrap consent', async () => {
  const db = await fixture();
  try {
    const dbFetch = provider(db);
    const stripeRequests = [];
    const paypalRequests = [];

    const combinedFetch = async (input, options = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.startsWith('https://api.stripe.com/v1/checkout/sessions')) {
        const body = typeof options.body === 'string' ? options.body : '';
        stripeRequests.push({ url, method: options.method || 'GET', body });
        if ((options.method || 'GET') === 'POST') {
          return Response.json({ id: 'cs_test_elio_3ds2_001', url: 'https://checkout.stripe.com/c/pay/cs_test_elio_3ds2_001' });
        }
        return Response.json({
          id: 'cs_test_elio_3ds2_001',
          payment_status: 'paid',
          amount_total: 425000,
          currency: 'usd',
          payment_intent: 'pi_test_elio_001',
          metadata: { quote_id: createdQuoteId }
        });
      }
      if (url === 'https://api-m.sandbox.paypal.com/v1/oauth2/token') {
        return Response.json({ access_token: 'pp_test_token' });
      }
      if (url === 'https://api-m.sandbox.paypal.com/v2/checkout/orders') {
        const body = JSON.parse(options.body);
        paypalRequests.push(body);
        return Response.json({
          id: 'PP_ORDER_998877',
          links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=PP_ORDER_998877' }]
        });
      }
      if (url === 'https://api-m.sandbox.paypal.com/v2/checkout/orders/PP_ORDER_998877/capture') {
        return Response.json({
          id: 'PP_ORDER_998877',
          status: 'COMPLETED',
          purchase_units: [{
            custom_id: paypalQuoteId,
            payments: {
              captures: [{
                id: 'PP_CAPTURE_554433',
                status: 'COMPLETED',
                custom_id: paypalQuoteId,
                amount: { currency_code: 'USD', value: '1800.00' }
              }]
            }
          }]
        });
      }
      return dbFetch(input, options);
    };

    const env = {
      ...fixtureEnv,
      STRIPE_SECRET_KEY: 'sk_test_fixture_secret_key_123456',
      STRIPE_WEBHOOK_SECRET: 'whsec_fixture_secret_key_123456',
      PAYPAL_CLIENT_ID: 'pp_client_fixture_123',
      PAYPAL_CLIENT_SECRET: 'pp_secret_fixture_456',
      PAYPAL_ENV: 'sandbox',
      CONFIRMED_SUPPORT_PHONE: '+1 (305) 555-0199'
    };

    const dash = dashboardHandlers(env, combinedFetch);
    const quotes = paymentQuoteHandlers(env, combinedFetch);

    // 1. Booking with clickwrap consent persists private.booking_consents
    const bookRes = await dash.book(new Request('http://localhost/api/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        'cf-connecting-ip': '203.0.113.10'
      },
      body: JSON.stringify({
        name: 'Elena Carter',
        email: 'elena@example.com',
        phone: '+13055550111',
        dates: '2026-12-10 → 2026-12-12 · Pickup: Miami Beach',
        itemSlug: 'lamborghini-urus-se',
        itemTitle: 'Lamborghini Urus SE',
        kind: 'car',
        termsAccepted: true,
        termsVersion: TERMS_VERSION
      })
    }));
    assert.equal(bookRes.status, 200);
    const booking = await bookRes.json();
    assert.equal(booking.success, true);

    const consentRows = (await db.query('select booking_id, terms_version, ip_hash from private.booking_consents where booking_id=$1', [booking.bookingId])).rows;
    assert.equal(consentRows.length, 1);
    assert.equal(consentRows[0].terms_version, TERMS_VERSION);
    assert.match(consentRows[0].ip_hash, /^[a-f0-9]{64}$/);

    // 2. Non-service roles CANNOT read private tables
    await assert.rejects(() => asUser(db, ids.customer, 'select * from private.payment_quotes'));
    await assert.rejects(() => asUser(db, ids.partner, 'select * from private.booking_consents'));

    // 3. Non-admin cannot create quote
    const quotePayload = {
      bookingId: booking.bookingId,
      itemTitle: 'Lamborghini Urus SE',
      kind: 'car',
      supplierName: 'Sunset Exotics Miami',
      serviceDates: 'Dec 10 – Dec 12, 2026',
      cancellationPolicy: 'Free cancellation up to 48 hours prior to handover.',
      notes: 'Deliver to South Beach hotel valet at 11:00 AM.',
      amountCents: 425000,
      clientName: 'Elena Carter',
      clientEmail: 'elena@example.com',
      expiresHours: 24
    };
    const forbidden = await quotes.createQuote(new Request('http://localhost/api/dashboard/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: 'Bearer ' + ids.customer
      },
      body: JSON.stringify(quotePayload)
    }));
    assert.equal(forbidden.status, 403);

    // 4. Admin creates quote (and idempotent replay returns same quote)
    const createKey = crypto.randomUUID();
    const createReq = () => new Request('http://localhost/api/dashboard/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': createKey,
        Authorization: 'Bearer ' + ids.admin
      },
      body: JSON.stringify(quotePayload)
    });
    const createdRes = await quotes.createQuote(createReq());
    assert.equal(createdRes.status, 200);
    const created = await createdRes.json();
    assert.equal(created.replayed, false);
    assert.match(created.quote.referenceCode, /^ELIO-[A-Z0-9]{8}$/);
    const createdQuoteId = created.quote.id;
    const token = created.quote.publicToken;

    const replayRes = await quotes.createQuote(createReq());
    const replayed = await replayRes.json();
    assert.equal(replayed.replayed, true);
    assert.equal(replayed.quote.id, createdQuoteId);

    // 5. Public GET before payment NEVER leaks confirmedSupport phone
    const openRes = await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token);
    assert.equal(openRes.status, 200);
    const openData = await openRes.json();
    assert.equal(openData.quote.status, 'open');
    assert.equal(openData.confirmedSupport, null);
    assert.equal(JSON.stringify(openData).includes('555-0199'), false, 'private phone must never appear before payment');

    // 6. Hard server guardrail: checkout blocked before ESIGN
    const blockedCheckout = await quotes.startCheckout(new Request(`http://localhost/api/pay/${token}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'stripe' })
    }), token);
    assert.equal(blockedCheckout.status, 409);
    assert.equal((await blockedCheckout.json()).error, 'agreement_required');

    // 7. ESIGN rejects missing checkboxes, succeeds with full legal name & records SHA-256 hash
    const badSign = await quotes.signQuote(new Request(`http://localhost/api/pay/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Elena Carter', acceptedAgencyTerms: true, acceptedShieldTerms: false })
    }), token);
    assert.equal(badSign.status, 400);

    const signRes = await quotes.signQuote(new Request(`http://localhost/api/pay/${token}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '203.0.113.10',
        'user-agent': 'ElioTestBrowser/1.0'
      },
      body: JSON.stringify({ fullName: 'Elena Carter', acceptedAgencyTerms: true, acceptedShieldTerms: true })
    }), token);
    assert.equal(signRes.status, 200);
    const signed = await signRes.json();
    const expectedHash = await computeAgreementHash(openData.quote);
    assert.equal(signed.esignDocumentHash, expectedHash);

    // Still unpaid -> private phone still hidden
    const signedPublic = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token)).json();
    assert.equal(signedPublic.quote.status, 'signed');
    assert.equal(signedPublic.confirmedSupport, null);

    // 8. Stripe 3DS2 checkout unlocks after ESIGN
    const stripeRes = await quotes.startCheckout(new Request(`http://localhost/api/pay/${token}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'stripe' })
    }), token);
    assert.equal(stripeRes.status, 200);
    const stripeCheckout = await stripeRes.json();
    assert.equal(stripeCheckout.sessionId, 'cs_test_elio_3ds2_001');
    assert.ok(stripeRequests[0].body.includes('request_three_d_secure%5D=any'), 'Stripe Checkout must request 3DS2');
    assert.ok(stripeRequests[0].body.includes('unit_amount%5D=425000'));

    // 9. Stripe webhook verifies HMAC-SHA256 signature & rejects tampered / expired signatures
    const webhookPayload = JSON.stringify({
      id: 'evt_test_001',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_elio_3ds2_001',
          payment_status: 'paid',
          payment_intent: 'pi_test_elio_001',
          metadata: { quote_id: createdQuoteId }
        }
      }
    });
    const nowSec = Math.floor(Date.now() / 1000);
    assert.equal(await verifyStripeWebhookSignature(webhookPayload, await signStripeHeader(webhookPayload, env.STRIPE_WEBHOOK_SECRET, nowSec - 600), env.STRIPE_WEBHOOK_SECRET, nowSec), false);
    assert.equal(await verifyStripeWebhookSignature(webhookPayload, 't=' + nowSec + ',v1=' + '0'.repeat(64), env.STRIPE_WEBHOOK_SECRET, nowSec), false);

    const invalidWebhook = await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': `t=${nowSec},v1=${'f'.repeat(64)}` },
      body: webhookPayload
    }));
    assert.equal(invalidWebhook.status, 400);

    const validSig = await signStripeHeader(webhookPayload, env.STRIPE_WEBHOOK_SECRET, nowSec);
    const validWebhook = await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': validSig },
      body: webhookPayload
    }));
    assert.equal(validWebhook.status, 200);

    // 10. Paid quote unlocks Confirmed Reservation Pass + private 24/7 direct phone + owner notification!
    const paidData = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token)).json();
    assert.equal(paidData.quote.status, 'paid');
    assert.equal(paidData.confirmedSupport?.active, true);
    assert.equal(paidData.confirmedSupport?.phoneDisplay, '+1 (305) 555-0199');
    assert.equal(paidData.confirmedSupport?.phoneHref, 'tel:+13055550199');

    const notifEvents = (await db.query("select event_type, booking_id, title from private.notification_events where event_type='payment_confirmed'")).rows;
    assert.equal(notifEvents.length, 1);
    assert.equal(notifEvents[0].booking_id, booking.bookingId);
    assert.match(formatTelegramNotification(notifEvents[0]), /Оплата подтверждена/);

    // Paid quote cannot be cancelled
    const cancelPaid = await quotes.cancelQuote(new Request(`http://localhost/api/dashboard/quotes?id=${createdQuoteId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + ids.admin }
    }));
    assert.equal(cancelPaid.status, 409);

    // 11. Second quote via PayPal Business create + capture
    const ppCreate = await (await quotes.createQuote(new Request('http://localhost/api/dashboard/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: 'Bearer ' + ids.admin
      },
      body: JSON.stringify({ ...quotePayload, amountCents: 180000, itemTitle: '60ft Azimut Charter', kind: 'yacht' })
    }))).json();
    const paypalQuoteId = ppCreate.quote.id;
    const ppToken = ppCreate.quote.publicToken;
    await quotes.signQuote(new Request(`http://localhost/api/pay/${ppToken}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Elena Carter', acceptedAgencyTerms: true, acceptedShieldTerms: true })
    }), ppToken);
    const ppStart = await (await quotes.startCheckout(new Request(`http://localhost/api/pay/${ppToken}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'paypal' })
    }), ppToken)).json();
    assert.equal(ppStart.sessionId, 'PP_ORDER_998877');
    assert.equal(paypalRequests[0].purchase_units[0].amount.value, '1800.00');

    const ppCap = await quotes.capturePayPal(new Request(`http://localhost/api/pay/${ppToken}/paypal-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'PP_ORDER_998877' })
    }), ppToken);
    assert.equal(ppCap.status, 200);
    const ppPaid = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${ppToken}`), ppToken)).json();
    assert.equal(ppPaid.quote.status, 'paid');
    assert.equal(ppPaid.quote.paymentProvider, 'paypal');
    assert.equal(ppPaid.quote.providerPaymentId, 'PP_CAPTURE_554433');
  } finally {
    await db.close();
  }
});

test('16-language checkout copy, Florida non-insurance legal guardrails, and CSP fonts', () => {
  const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
  const enKeys = Object.keys(CHECKOUT_COPY.en).sort();
  for (const lang of langs) {
    assert.ok(CHECKOUT_COPY[lang], `missing checkout copy for ${lang}`);
    assert.deepEqual(Object.keys(CHECKOUT_COPY[lang]).sort(), enKeys, lang);
    for (const key of enKeys) {
      assert.ok(CHECKOUT_COPY[lang][key].trim().length > 0, `${lang}.${key} is empty`);
    }
  }

  const allLegal = JSON.stringify([TERMS_SECTIONS, PARTNER_AGREEMENT_SECTIONS, ESIGN_CLAUSES]);
  assert.match(allLegal, /626\.9541/);
  assert.match(allLegal, /Limited Payment Collection Agent/);
  assert.match(allLegal, /Miami-Dade County, Florida/);
  assert.match(allLegal, /NOT an insurance policy/);
  assert.ok(TERMS_SECTIONS.length >= 10);
  assert.ok(PARTNER_AGREEMENT_SECTIONS.length >= 8);

  // Public surfaces must NEVER render tel: links; only paid pass renders confirmedSupport.phoneHref
  for (const rel of [
    '../../app/components/BookingForm.jsx',
    '../../app/yachts/YachtContent.jsx',
    '../../app/terms/page.js',
    '../../app/partner-agreement/page.js'
  ]) {
    const src = fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
    assert.equal(src.includes('tel:'), false, `${rel} must not contain public tel: link`);
  }

  const mw = fs.readFileSync(new URL('../../middleware.js', import.meta.url), 'utf8');
  assert.match(mw, /https:\/\/fonts\.googleapis\.com/);
  assert.match(mw, /https:\/\/fonts\.gstatic\.com/);
  assert.match(mw, /'\/pay'/);
});
