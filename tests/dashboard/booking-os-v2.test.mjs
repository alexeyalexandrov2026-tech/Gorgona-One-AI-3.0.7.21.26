import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, ids, asUser } from './database.mjs';
import { provider, fixtureEnv } from './provider.mjs';
import { dashboardHandlers } from '../../lib/server/dashboardHandlers.mjs';
import { paymentQuoteHandlers, resetPayGuardsForTests } from '../../lib/server/paymentQuoteHandlers.mjs';
import { TERMS_VERSION } from '../../lib/legal/termsContent.mjs';
import { BOOKING_OS_COPY } from '../../lib/legal/bookingOsCopy.mjs';
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

test('Booking OS 2.0: Split-Pay individual links, Refundable Deposit Pre-Auth + 1-click Release, 24h Price Lock, and All-In Breakdown', async () => {
  resetPayGuardsForTests();
  const db = await fixture();
  try {
    const dbFetch = provider(db);
    const stripeCalls = [];
    const cancelledIntents = [];
    const sessionStore = new Map();
    let seq = 0;

    const combinedFetch = async (input, options = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === 'https://api.stripe.com/v1/checkout/sessions' && (options.method || 'GET') === 'POST') {
        seq += 1;
        const body = String(options.body || '');
        const params = new URLSearchParams(body);
        const sessionId = `cs_test_bos2_${seq}`;
        const piId = `pi_test_bos2_${seq}`;
        const rec = {
          id: sessionId,
          status: 'complete',
          payment_status: params.get('payment_intent_data[capture_method]') === 'manual' ? 'unpaid' : 'paid',
          amount_total: Number(params.get('line_items[0][price_data][unit_amount]')),
          currency: 'usd',
          payment_intent: piId,
          metadata: {
            quote_id: params.get('metadata[quote_id]'),
            checkout_kind: params.get('metadata[checkout_kind]'),
            share_token: params.get('metadata[share_token]') || ''
          }
        };
        sessionStore.set(sessionId, rec);
        stripeCalls.push({ body, params, sessionId, piId });
        return Response.json({ id: sessionId, url: `https://checkout.stripe.com/c/pay/${sessionId}` });
      }
      if (url.startsWith('https://api.stripe.com/v1/checkout/sessions/') && (options.method || 'GET') === 'GET') {
        const sid = url.split('/').pop();
        return Response.json(sessionStore.get(sid) || { error: { message: 'not found' } });
      }
      if (url.startsWith('https://api.stripe.com/v1/payment_intents/') && url.endsWith('/cancel') && options.method === 'POST') {
        const piId = url.split('/').slice(-2, -1)[0];
        cancelledIntents.push(piId);
        return Response.json({ id: piId, status: 'canceled' });
      }
      if (url === 'https://api-m.sandbox.paypal.com/v1/oauth2/token') {
        return Response.json({ access_token: 'pp_bos2_token' });
      }
      if (url === 'https://api-m.sandbox.paypal.com/v2/checkout/orders') {
        const body = JSON.parse(options.body);
        const unit = body.purchase_units[0];
        const oid = `PP_SHARE_${++seq}`;
        sessionStore.set(oid, { customId: unit.custom_id, value: unit.amount.value });
        return Response.json({
          id: oid,
          links: [{ rel: 'payer-action', href: `https://www.sandbox.paypal.com/checkoutnow?token=${oid}` }]
        });
      }
      if (url.startsWith('https://api-m.sandbox.paypal.com/v2/checkout/orders/') && url.endsWith('/capture')) {
        const oid = url.split('/').slice(-2, -1)[0];
        const saved = sessionStore.get(oid);
        return Response.json({
          id: oid,
          status: 'COMPLETED',
          purchase_units: [{
            custom_id: saved.customId,
            payments: {
              captures: [{
                id: `PP_CAP_${oid}`,
                status: 'COMPLETED',
                custom_id: saved.customId,
                amount: { currency_code: 'USD', value: saved.value }
              }]
            }
          }]
        });
      }
      return dbFetch(input, options);
    };

    const env = {
      ...fixtureEnv,
      STRIPE_SECRET_KEY: 'sk_test_fixture_bos2_secret_123456',
      STRIPE_WEBHOOK_SECRET: 'whsec_fixture_bos2_secret_123456',
      PAYPAL_CLIENT_ID: 'pp_client_bos2',
      PAYPAL_CLIENT_SECRET: 'pp_secret_bos2',
      PAYPAL_ENV: 'sandbox',
      CONFIRMED_SUPPORT_PHONE: '+1 (786) 492-8880'
    };

    const dash = dashboardHandlers(env, combinedFetch);
    const quotes = paymentQuoteHandlers(env, combinedFetch);

    // 1. Create booking
    const bookRes = await dash.book(new Request('http://localhost/api/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        'cf-connecting-ip': '198.51.100.12'
      },
      body: JSON.stringify({
        name: 'Marcus Sterling',
        email: 'marcus@example.com',
        phone: '+17865550101',
        dates: '2026-12-18 → 2026-12-20 · Miami Beach',
        itemSlug: 'lamborghini-urus-se',
        itemTitle: 'Lamborghini Urus SE',
        kind: 'car',
        termsAccepted: true,
        termsVersion: TERMS_VERSION
      })
    }));
    const booking = await bookRes.json();
    assert.equal(booking.success, true);

    // 2. Non-service roles CANNOT read private.payment_quote_shares
    await assert.rejects(() => asUser(db, ids.customer, 'select * from private.payment_quote_shares'));
    await assert.rejects(() => asUser(db, ids.partner, 'select * from private.payment_quote_shares'));

    // 3. Admin creates Booking OS 2.0 quote:
    //    $2,600.01 split 3 ways (verifies exact penny remainder distribution: 86667 + 86667 + 86667),
    //    Wait: use $2,600.02 -> 86668 + 86667 + 86667 = 260002 cents!
    //    Plus All-In Line Items, $1,500 Refundable Deposit Hold, $250 24h Price Lock, NOAA Weather Shield.
    const createRes = await quotes.createQuote(new Request('http://localhost/api/dashboard/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: 'Bearer ' + ids.admin
      },
      body: JSON.stringify({
        bookingId: booking.bookingId,
        itemTitle: '60ft Azimut Flybridge Yacht',
        kind: 'yacht',
        supplierName: 'Biscayne Marine Charters',
        serviceDates: 'Dec 18, 2026 · 14:00 – 18:00',
        cancellationPolicy: 'Free cancellation up to 48h; NOAA Weather Shield auto-reschedule or 100% refund.',
        notes: 'Includes USCG captain, steward, ice, bottled water & Seabob.',
        amountCents: 260002,
        clientName: 'Marcus Sterling',
        clientEmail: 'marcus@example.com',
        expiresHours: 12,
        splitWays: 3,
        depositCents: 150000,
        priceLockCents: 25000,
        weatherShieldEnabled: true,
        lineItems: [
          { label: '4-Hour Charter Base Rate', amountCents: 210000, category: 'base' },
          { label: 'USCG Captain & Steward', amountCents: 30000, category: 'crew' },
          { label: 'Miami Beach Marina & FL Tax', amountCents: 20002, category: 'tax' }
        ]
      })
    }));
    assert.equal(createRes.status, 200);
    const created = await createRes.json();
    const quoteId = created.quote.id;
    const token = created.quote.publicToken;
    assert.equal(created.quote.splitWays, 3);
    assert.equal(created.quote.shares.length, 3);
    assert.deepEqual(
      created.quote.shares.map((s) => s.amountCents),
      [86668, 86667, 86667],
      'Split-Pay shares must sum to exact amountCents down to the penny'
    );
    assert.equal(created.quote.depositCents, 150000);
    assert.equal(created.quote.depositStatus, 'pending');
    assert.equal(created.quote.priceLockCents, 25000);
    assert.equal(created.quote.priceLockStatus, 'pending');
    assert.equal(created.quote.weatherShieldEnabled, true);
    assert.equal(created.quote.lineItems.length, 3);

    // 4. Sign ESIGN before any payment / pre-auth unlocks
    const signRes = await quotes.signQuote(new Request(`http://localhost/api/pay/${token}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '198.51.100.12',
        'user-agent': 'ElioTest/2.0'
      },
      body: JSON.stringify({ fullName: 'Marcus Sterling', acceptedAgencyTerms: true, acceptedShieldTerms: true })
    }), token);
    assert.equal(signRes.status, 200);

    // 5. Guest triggers 24-Hour Price Lock (Stripe manual capture hold)
    const lockRes = await quotes.startCheckout(new Request(`http://localhost/api/pay/${token}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'stripe', checkoutKind: 'price_lock' })
    }), token);
    assert.equal(lockRes.status, 200);
    const lockCheckout = await lockRes.json();
    assert.equal(lockCheckout.checkoutKind, 'price_lock');
    const lockCall = stripeCalls[stripeCalls.length - 1];
    assert.equal(lockCall.params.get('payment_intent_data[capture_method]'), 'manual');
    assert.equal(lockCall.params.get('payment_method_types[0]'), 'card');
    assert.equal(lockCall.params.get('line_items[0][price_data][unit_amount]'), '25000');

    // Return from Stripe locks price & extends expiry to >= 24h from now
    const afterLock = await (await quotes.getPublicQuote(
      new Request(`http://localhost/api/pay/${token}?provider=stripe&kind=price_lock&session_id=${lockCheckout.sessionId}`),
      token
    )).json();
    assert.equal(afterLock.quote.priceLockStatus, 'locked');
    assert.ok(afterLock.quote.priceLockUntil);
    assert.ok(new Date(afterLock.quote.expiresAt).getTime() > Date.now() + 23 * 3600 * 1000);

    // 6. Guest places Refundable Security Deposit Pre-Auth ($1,500 manual capture hold)
    const depRes = await quotes.startCheckout(new Request(`http://localhost/api/pay/${token}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'stripe', checkoutKind: 'deposit' })
    }), token);
    assert.equal(depRes.status, 200);
    const depCheckout = await depRes.json();
    const depCall = stripeCalls[stripeCalls.length - 1];
    assert.equal(depCall.params.get('payment_intent_data[capture_method]'), 'manual');
    assert.equal(depCall.params.get('line_items[0][price_data][unit_amount]'), '150000');

    const afterDep = await (await quotes.getPublicQuote(
      new Request(`http://localhost/api/pay/${token}?provider=stripe&kind=deposit&session_id=${depCheckout.sessionId}`),
      token
    )).json();
    assert.equal(afterDep.quote.depositStatus, 'held');
    assert.ok(afterDep.quote.depositHeldAt);

    // 7. Group Split-Pay: Share #1 via Stripe return, Share #2 via PayPal Business, Share #3 via Stripe webhook!
    const [share1, share2, share3] = afterDep.quote.shares;

    // Share #1 (Stripe)
    const s1Start = await (await quotes.startCheckout(new Request(`http://localhost/api/pay/${token}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'stripe', checkoutKind: 'share', shareToken: share1.shareToken, payerName: 'Marcus Sterling' })
    }), token)).json();
    assert.equal(s1Start.shareIndex, 1);
    const afterS1 = await (await quotes.getPublicQuote(
      new Request(`http://localhost/api/pay/${token}?provider=stripe&kind=share&share=${share1.shareToken}&session_id=${s1Start.sessionId}`),
      token
    )).json();
    assert.equal(afterS1.quote.paidSharesCount, 1);
    assert.equal(afterS1.quote.paidAmountCents, 86668);
    assert.equal(afterS1.quote.status, 'signed', 'Quote must stay signed until 100% of shares are paid');
    assert.equal(afterS1.confirmedSupport, null, 'Private 24/7 phone must stay locked until 100% funded');

    // Share #2 (PayPal Business)
    const s2Start = await (await quotes.startCheckout(new Request(`http://localhost/api/pay/${token}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'paypal', checkoutKind: 'share', shareToken: share2.shareToken, payerName: 'Sofia Rossi' })
    }), token)).json();
    const s2Cap = await quotes.capturePayPal(new Request(`http://localhost/api/pay/${token}/paypal-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: s2Start.sessionId, shareToken: share2.shareToken })
    }), token);
    assert.equal(s2Cap.status, 200);
    const s2Data = await s2Cap.json();
    assert.equal(s2Data.paidSharesCount, 2);
    assert.equal(s2Data.allPaid, false);

    // Share #3 (Stripe Webhook -> hits 100% funded -> auto-unlocks Confirmed Reservation Pass!)
    const s3Start = await (await quotes.startCheckout(new Request(`http://localhost/api/pay/${token}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'stripe', checkoutKind: 'share', shareToken: share3.shareToken, payerName: 'Alex Vance' })
    }), token)).json();
    const whBody = JSON.stringify({
      id: 'evt_bos2_share3',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: s3Start.sessionId,
          payment_status: 'paid',
          currency: 'usd',
          amount_total: 86667,
          payment_intent: 'pi_share3_final',
          customer_details: { name: 'Alex Vance', email: 'alex@example.com' },
          metadata: { quote_id: quoteId, checkout_kind: 'share', share_token: share3.shareToken }
        }
      }
    });
    const nowSec = Math.floor(Date.now() / 1000);
    const whSig = await signStripeHeader(whBody, env.STRIPE_WEBHOOK_SECRET, nowSec);
    const whRes = await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': whSig },
      body: whBody
    }));
    assert.equal(whRes.status, 200);

    const finalPublic = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token)).json();
    assert.equal(finalPublic.quote.status, 'paid');
    assert.equal(finalPublic.quote.paidSharesCount, 3);
    assert.equal(finalPublic.quote.paidAmountCents, 260002);
    assert.equal(finalPublic.confirmedSupport?.active, true);
    assert.equal(finalPublic.confirmedSupport?.phoneDisplay, '+1 (786) 492-8880');
    // Public payload must never leak share payer emails
    assert.equal(JSON.stringify(finalPublic.quote.shares).includes('alex@example.com'), false);

    // 8. Admin 1-click Release Deposit Hold (and non-admin rejected with 403)
    const forbiddenRelease = await quotes.releaseHold(new Request('http://localhost/api/dashboard/quotes/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ids.customer },
      body: JSON.stringify({ quoteId, holdKind: 'deposit' })
    }));
    assert.equal(forbiddenRelease.status, 403);

    const releaseDep = await quotes.releaseHold(new Request('http://localhost/api/dashboard/quotes/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ids.admin },
      body: JSON.stringify({ quoteId, holdKind: 'deposit' })
    }));
    assert.equal(releaseDep.status, 200);
    const relData = await releaseDep.json();
    assert.equal(relData.status, 'released');
    assert.equal(relData.stripeStatus, 'canceled');
    assert.equal(cancelledIntents.length, 1);

    const afterRelease = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token)).json();
    assert.equal(afterRelease.quote.depositStatus, 'released');
    assert.ok(afterRelease.quote.depositReleasedAt);
  } finally {
    await db.close();
  }
});

test('Booking OS 2.0: 16-language UI copy completeness and brand guardrails', () => {
  const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
  const enKeys = Object.keys(BOOKING_OS_COPY.en).sort();
  for (const lang of langs) {
    assert.ok(BOOKING_OS_COPY[lang], `missing Booking OS copy for ${lang}`);
    assert.deepEqual(Object.keys(BOOKING_OS_COPY[lang]).sort(), enKeys, lang);
    for (const key of enKeys) {
      const value = BOOKING_OS_COPY[lang][key];
      assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
      assert.equal(/concierge|консьерж/i.test(value), false, `${lang}.${key} must not contain concierge wording`);
    }
  }
});
