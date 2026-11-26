import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixture, ids } from './database.mjs';
import { provider, fixtureEnv } from './provider.mjs';
import { dashboardHandlers } from '../../lib/server/dashboardHandlers.mjs';
import { paymentQuoteHandlers, resetPayGuardsForTests } from '../../lib/server/paymentQuoteHandlers.mjs';
import { tripRoomHandlers } from '../../lib/server/tripRoomHandlers.mjs';
import { emailPlanHandlers, resetEmailPlanRateLimitForTests } from '../../lib/server/emailPlanHandler.mjs';
import { TERMS_VERSION } from '../../lib/legal/termsContent.mjs';

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

test('Package 1 P0: PayPal webhook settles Split-Pay shares, rejects amount mismatches, and capturePayPal blocks PENDING captures', async () => {
  resetPayGuardsForTests();
  const db = await fixture();
  try {
    const dbFetch = provider(db);
    let captureStatusMode = 'PENDING';
    let seq = 0;
    const orderStore = new Map();

    const combinedFetch = async (input, options = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === 'https://api-m.sandbox.paypal.com/v1/oauth2/token') {
        return Response.json({ access_token: 'pp_pkg1_token' });
      }
      if (url === 'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature') {
        return Response.json({ verification_status: 'SUCCESS' });
      }
      if (url === 'https://api-m.sandbox.paypal.com/v2/checkout/orders') {
        const body = JSON.parse(options.body);
        const unit = body.purchase_units[0];
        const oid = `PP_PKG1_${++seq}`;
        orderStore.set(oid, { customId: unit.custom_id, value: unit.amount.value });
        return Response.json({
          id: oid,
          links: [{ rel: 'payer-action', href: `https://www.sandbox.paypal.com/checkoutnow?token=${oid}` }]
        });
      }
      if (url.startsWith('https://api-m.sandbox.paypal.com/v2/checkout/orders/') && url.endsWith('/capture')) {
        const oid = url.split('/').slice(-2, -1)[0];
        const saved = orderStore.get(oid);
        return Response.json({
          id: oid,
          status: 'COMPLETED',
          purchase_units: [{
            custom_id: saved.customId,
            payments: {
              captures: [{
                id: `PP_CAP_${oid}`,
                status: captureStatusMode,
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
      STRIPE_SECRET_KEY: 'sk_test_pkg1_secret_123456',
      STRIPE_WEBHOOK_SECRET: 'whsec_pkg1_secret_123456',
      PAYPAL_CLIENT_ID: 'pp_client_pkg1',
      PAYPAL_CLIENT_SECRET: 'pp_secret_pkg1',
      PAYPAL_WEBHOOK_ID: 'WH_PKG1_123',
      PAYPAL_ENV: 'sandbox',
      CONFIRMED_SUPPORT_PHONE: '+1 (786) 492-8880'
    };

    const quotes = paymentQuoteHandlers(env, combinedFetch);

    const created = await (await quotes.createQuote(new Request('http://localhost/api/dashboard/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: 'Bearer ' + ids.admin
      },
      body: JSON.stringify({
        itemTitle: '60ft Azimut Flybridge Yacht',
        kind: 'yacht',
        supplierName: 'Biscayne Marine',
        serviceDates: 'Dec 20, 2026',
        cancellationPolicy: '48h free cancellation',
        amountCents: 200000,
        clientName: 'Alex Guest',
        clientEmail: 'alex@example.com',
        splitWays: 2
      })
    }))).json();

    const quoteId = created.quote.id;
    const token = created.quote.publicToken;
    const [share1, share2] = created.quote.shares;

    const signRes = await quotes.signQuote(new Request(`http://localhost/api/pay/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.30' },
      body: JSON.stringify({ fullName: 'Alex Guest', acceptedAgencyTerms: true, acceptedShieldTerms: true })
    }), token);
    assert.equal(signRes.status, 200);

    // 1. capturePayPal rejects PENDING capture even when order.status === COMPLETED
    const s1Checkout = await (await quotes.startCheckout(new Request(`http://localhost/api/pay/${token}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'paypal', checkoutKind: 'share', shareToken: share1.shareToken })
    }), token)).json();

    const pendingCap = await quotes.capturePayPal(new Request(`http://localhost/api/pay/${token}/paypal-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: s1Checkout.sessionId, shareToken: share1.shareToken })
    }), token);
    assert.equal(pendingCap.status, 409);

    // Once capture status is COMPLETED, capture succeeds
    captureStatusMode = 'COMPLETED';
    const okCap = await quotes.capturePayPal(new Request(`http://localhost/api/pay/${token}/paypal-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: s1Checkout.sessionId, shareToken: share1.shareToken })
    }), token);
    assert.equal(okCap.status, 200);

    // 2. PayPal webhook with mismatched amount for share #2 MUST fail with 400
    const ppHeaders = {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert',
      'paypal-transmission-id': 'tx-1',
      'paypal-transmission-sig': 'sig-1',
      'paypal-transmission-time': new Date().toISOString()
    };
    const badAmountWh = await quotes.paypalWebhook(new Request('http://localhost/api/webhooks/paypal', {
      method: 'POST',
      headers: ppHeaders,
      body: JSON.stringify({
        id: 'WH_EVT_BAD_AMT',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP_BAD_1',
          status: 'COMPLETED',
          custom_id: `${quoteId}:${share2.shareToken}`,
          amount: { currency_code: 'USD', value: '50.00' },
          supplementary_data: { related_ids: { order_id: 'ORD_BAD_1' } }
        }
      })
    }));
    assert.equal(badAmountWh.status, 400);

    // 3. PayPal webhook with exact share #2 custom_id (quoteId:shareToken) & amount completes the split-pay quote!
    const goodShareWh = await quotes.paypalWebhook(new Request('http://localhost/api/webhooks/paypal', {
      method: 'POST',
      headers: ppHeaders,
      body: JSON.stringify({
        id: 'WH_EVT_SHARE_2',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP_SHARE_2',
          status: 'COMPLETED',
          custom_id: `${quoteId}:${share2.shareToken}`,
          amount: { currency_code: 'USD', value: '1000.00' },
          supplementary_data: { related_ids: { order_id: 'ORD_SHARE_2' } }
        }
      })
    }));
    assert.equal(goodShareWh.status, 200);

    const finalState = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token)).json();
    assert.equal(finalState.quote.status, 'paid');
    assert.equal(finalState.quote.paidSharesCount, 2);
    assert.equal(finalState.confirmedSupport?.active, true);
  } finally {
    await db.close();
  }
});

test('Package 1 P0/P1: Stripe webhook retries after transient DB 503, rejects amount mismatch, and never downgrades verified KYC', async () => {
  resetPayGuardsForTests();
  const db = await fixture();
  try {
    const dbFetch = provider(db);
    let failNextMarkPaid = false;

    const flakyFetch = async (input, options = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (failNextMarkPaid && url.endsWith('/rest/v1/rpc/payment_quote_mark_paid_v2')) {
        failNextMarkPaid = false;
        return new Response(JSON.stringify({ error: 'temporary_outage' }), { status: 503 });
      }
      return dbFetch(input, options);
    };

    const env = {
      ...fixtureEnv,
      STRIPE_SECRET_KEY: 'sk_test_pkg1_flaky_123456',
      STRIPE_WEBHOOK_SECRET: 'whsec_pkg1_flaky_123456'
    };
    const quotes = paymentQuoteHandlers(env, flakyFetch);

    const created = await (await quotes.createQuote(new Request('http://localhost/api/dashboard/quotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: 'Bearer ' + ids.admin
      },
      body: JSON.stringify({
        itemTitle: 'Lamborghini Urus SE',
        kind: 'car',
        supplierName: 'Miami Elio Fleet',
        serviceDates: 'Dec 21, 2026',
        cancellationPolicy: '48h free cancellation',
        amountCents: 150000,
        clientName: 'Elena Guest',
        clientEmail: 'elena@example.com',
        kycRequired: true
      })
    }))).json();

    const quoteId = created.quote.id;
    const token = created.quote.publicToken;
    await quotes.signQuote(new Request(`http://localhost/api/pay/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.31' },
      body: JSON.stringify({ fullName: 'Elena Guest', acceptedAgencyTerms: true, acceptedShieldTerms: true })
    }), token);

    const nowSec = Math.floor(Date.now() / 1000);

    // 1. Mismatched amount_total rejected (400)
    const wrongAmtBody = JSON.stringify({
      id: 'evt_wrong_amt',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_wrong_amt',
          payment_status: 'paid',
          currency: 'usd',
          amount_total: 100,
          payment_intent: 'pi_wrong_amt',
          metadata: { quote_id: quoteId }
        }
      }
    });
    const wrongAmtRes = await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': await signStripeHeader(wrongAmtBody, env.STRIPE_WEBHOOK_SECRET, nowSec) },
      body: wrongAmtBody
    }));
    assert.equal(wrongAmtRes.status, 400);

    // 2. First attempt hits transient 503; retry with SAME event.id must succeed (NOT be dropped as duplicate!)
    failNextMarkPaid = true;
    const validBody = JSON.stringify({
      id: 'evt_retry_after_503',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_retry_503',
          payment_status: 'paid',
          currency: 'usd',
          amount_total: 150000,
          payment_intent: 'pi_retry_503',
          metadata: { quote_id: quoteId }
        }
      }
    });
    const sig = await signStripeHeader(validBody, env.STRIPE_WEBHOOK_SECRET, nowSec);
    const firstAttempt = await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': sig },
      body: validBody
    }));
    assert.equal(firstAttempt.status, 503);

    const secondAttempt = await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': sig },
      body: validBody
    }));
    assert.equal(secondAttempt.status, 200);
    const secondJson = await secondAttempt.json();
    assert.equal(secondJson.duplicate, undefined);

    const afterPay = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token)).json();
    assert.equal(afterPay.quote.status, 'paid');

    // 3. Out-of-order KYC webhook cannot downgrade verified -> requires_input
    const kycOkBody = JSON.stringify({
      id: 'evt_kyc_ok',
      type: 'identity.verification_session.verified',
      data: { object: { id: 'vs_kyc_1', metadata: { quote_id: quoteId } } }
    });
    assert.equal((await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': await signStripeHeader(kycOkBody, env.STRIPE_WEBHOOK_SECRET, nowSec) },
      body: kycOkBody
    }))).status, 200);

    const kycLateBody = JSON.stringify({
      id: 'evt_kyc_late_requires_input',
      type: 'identity.verification_session.requires_input',
      data: { object: { id: 'vs_kyc_1', metadata: { quote_id: quoteId } } }
    });
    assert.equal((await quotes.stripeWebhook(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': await signStripeHeader(kycLateBody, env.STRIPE_WEBHOOK_SECRET, nowSec) },
      body: kycLateBody
    }))).status, 200);

    const afterKyc = await (await quotes.getPublicQuote(new Request(`http://localhost/api/pay/${token}`), token)).json();
    assert.equal(afterKyc.quote.kycStatus, 'verified');
  } finally {
    await db.close();
  }
});

test('Package 1 P1: Private jet bookings link to /private-jets in Live Trip Room, email-plan blocks external phishing URLs, and KYC card is gated on kycRequired', async () => {
  const db = await fixture();
  try {
    const dbFetch = provider(db);
    const dash = dashboardHandlers(fixtureEnv, dbFetch);
    const trip = tripRoomHandlers(fixtureEnv, dbFetch, { forecastLoader: async () => [] });

    const bookRes = await dash.book(new Request('http://localhost/api/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: 'Bearer ' + ids.customer,
        'cf-connecting-ip': '198.51.100.32'
      },
      body: JSON.stringify({
        name: 'Jet Client',
        email: 'customer@example.com',
        phone: '+17865550122',
        dates: 'Private Jet · Miami → New York · 4 pax',
        itemSlug: 'private-jet-miami-new-york',
        itemTitle: 'Private Jet: Miami → New York',
        kind: 'experience',
        termsAccepted: true,
        termsVersion: TERMS_VERSION
      })
    }));
    assert.equal(bookRes.status, 200);

    const roomRes = await trip.overview(new Request('http://localhost/api/dashboard/trip-room', {
      headers: { Authorization: 'Bearer ' + ids.customer }
    }));
    assert.equal(roomRes.status, 200);
    const room = await roomRes.json();
    const jetRow = room.bookings.find((b) => b.itemSlug === 'private-jet-miami-new-york');
    assert.ok(jetRow);
    assert.equal(jetRow.href, '/private-jets');
  } finally {
    await db.close();
  }

  // email-plan blocks external phishing URLs
  resetEmailPlanRateLimitForTests();
  const { send } = emailPlanHandlers({
    APP_ENV: 'production',
    RESEND_API_KEY: 're_test',
    NOTIFICATIONS_FROM_EMAIL: 'ELIO <hello@gorgona-one.com>'
  }, async () => Response.json({ id: 're_1' }));

  const phishing = await send(new Request('https://gorgona-one.com/api/concierge/email-plan', {
    method: 'POST',
    headers: { origin: 'https://gorgona-one.com', 'cf-connecting-ip': '198.51.100.33', 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'victim@example.com',
      planText: 'Urgent verify your card at https://evil-phish.example/login right now!'
    })
  }));
  assert.equal(phishing.status, 400);

  // PayCheckoutClient only shows KYC when required or already initiated (not for every signed/paid quote)
  const checkoutSrc = fs.readFileSync(new URL('../../app/pay/[token]/PayCheckoutClient.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(checkoutSrc, /quote\.kycRequired\s*\|\|\s*quote\.kycStatus\s*!==\s*'none'\s*\|\|\s*isSigned\s*\|\|\s*isPaid/);

  // wrangler.jsonc enables dining flags alongside PLAN_REQUESTS_ENABLED
  const wranglerSrc = fs.readFileSync(new URL('../../wrangler.jsonc', import.meta.url), 'utf8');
  assert.match(wranglerSrc, /"DINING_SCHEMA_ENABLED":\s*"true"/);
  assert.match(wranglerSrc, /"DINING_REQUESTS_ENABLED":\s*"true"/);
});
