// Zero-dependency payment provider adapters for Stripe Checkout (3DS2 / SCA)
// and PayPal Business Orders v2, built strictly on Web Fetch + Web Crypto so
// they run cleanly on Cloudflare Workers and Node 20+.

import { RequestError } from './dashboardCore.mjs';

const STRIPE_API = 'https://api.stripe.com';
const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const PAYPAL_LIVE_API = 'https://api-m.paypal.com';
const TIMEOUT_MS = 12000;

export function paymentProvidersStatus(env = {}) {
  const stripe = Boolean(typeof env.STRIPE_SECRET_KEY === 'string' && env.STRIPE_SECRET_KEY.trim().length > 10);
  const paypal = Boolean(
    typeof env.PAYPAL_CLIENT_ID === 'string' && env.PAYPAL_CLIENT_ID.trim().length > 5 &&
    typeof env.PAYPAL_CLIENT_SECRET === 'string' && env.PAYPAL_CLIENT_SECRET.trim().length > 5
  );
  const paypalEnv = env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
  return { stripe, paypal, paypalEnv };
}

function paypalBase(env = {}) {
  return env.PAYPAL_ENV === 'live' ? PAYPAL_LIVE_API : PAYPAL_SANDBOX_API;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeHexEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// --- Stripe Checkout (Dynamic Payment Methods: Apple Pay, Google Pay, Link, ACH + Card 3DS2) ---

export async function createStripeCheckoutSession(env, { quote, token, origin, idempotencyKey }, fetcher = fetch) {
  if (!paymentProvidersStatus(env).stripe) {
    throw new RequestError(503, 'provider_not_configured');
  }
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  // Omit hardcoded payment_method_types so Stripe Dynamic Payment Methods
  // automatically unlocks Apple Pay, Google Pay, Stripe Link, Cards, and US ACH/Wire
  // configured in the Stripe Dashboard, while still enforcing 3DS2 on card charges.
  params.set('payment_method_options[card][request_three_d_secure]', 'any');
  params.set('customer_email', quote.clientEmail);
  params.set('client_reference_id', quote.id);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][unit_amount]', String(quote.amountCents));
  params.set('line_items[0][price_data][product_data][name]', String(quote.itemTitle).slice(0, 200));
  params.set(
    'line_items[0][price_data][product_data][description]',
    `${quote.referenceCode} · ${quote.supplierName} · ${quote.serviceDates}`.slice(0, 450)
  );
  params.set('metadata[quote_id]', quote.id);
  params.set('metadata[reference_code]', quote.referenceCode);
  if (quote.esignDocumentHash) params.set('metadata[esign_hash]', quote.esignDocumentHash);
  params.set('success_url', `${origin}/pay/${token}?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/pay/${token}?cancelled=1`);

  const response = await fetcher(`${STRIPE_API}/v1/checkout/sessions`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY.trim()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': String(idempotencyKey).slice(0, 200) } : {})
    },
    body: params.toString()
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.id || !data?.url) {
    throw new RequestError(502, 'stripe_session_failed');
  }
  return { sessionId: data.id, checkoutUrl: data.url };
}

export async function retrieveStripeCheckoutSession(env, sessionId, fetcher = fetch) {
  if (!paymentProvidersStatus(env).stripe) {
    throw new RequestError(503, 'provider_not_configured');
  }
  if (typeof sessionId !== 'string' || !/^cs_(?:test_|live_)?[A-Za-z0-9_]{8,200}$/.test(sessionId)) {
    throw new RequestError(400, 'invalid_session');
  }
  const response = await fetcher(`${STRIPE_API}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY.trim()}`
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.id) {
    throw new RequestError(502, 'stripe_lookup_failed');
  }
  const paymentId = typeof data.payment_intent === 'string'
    ? data.payment_intent
    : data.payment_intent?.id || data.id;
  return {
    id: data.id,
    paymentStatus: data.payment_status || '',
    amountTotal: Number(data.amount_total || 0),
    currency: String(data.currency || '').toLowerCase(),
    paymentId,
    quoteId: data.metadata?.quote_id || data.client_reference_id || null
  };
}

export async function verifyStripeWebhookSignature(
  rawBody,
  signatureHeader,
  secret,
  nowSec = Math.floor(Date.now() / 1000),
  toleranceSec = 300
) {
  if (typeof rawBody !== 'string' || typeof signatureHeader !== 'string' || typeof secret !== 'string' || !secret.trim()) {
    return false;
  }
  let timestamp = null;
  const signatures = [];
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.trim().split('=');
    if (k === 't' && /^\d+$/.test(v || '')) timestamp = Number(v);
    else if (k === 'v1' && /^[a-f0-9]{64}$/i.test(v || '')) signatures.push(v.toLowerCase());
  }
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(nowSec - timestamp) > toleranceSec) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret.trim()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = toHex(mac);
  return signatures.some((sig) => timingSafeHexEqual(sig, expected));
}

// --- PayPal Business Orders v2 -----------------------------------------------

async function getPayPalAccessToken(env, fetcher = fetch) {
  if (!paymentProvidersStatus(env).paypal) {
    throw new RequestError(503, 'provider_not_configured');
  }
  const credentials = btoa(`${env.PAYPAL_CLIENT_ID.trim()}:${env.PAYPAL_CLIENT_SECRET.trim()}`);
  const response = await fetcher(`${paypalBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new RequestError(502, 'paypal_auth_failed');
  }
  return data.access_token;
}

export async function createPayPalOrder(env, { quote, token, origin, idempotencyKey }, fetcher = fetch) {
  const accessToken = await getPayPalAccessToken(env, fetcher);
  const amountValue = (Number(quote.amountCents) / 100).toFixed(2);
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: quote.referenceCode,
        custom_id: quote.id,
        description: `${quote.itemTitle} · ${quote.supplierName}`.slice(0, 127),
        amount: {
          currency_code: 'USD',
          value: amountValue
        }
      }
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'MIAMI ELIO',
          landing_page: 'LOGIN',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${origin}/pay/${token}?provider=paypal`,
          cancel_url: `${origin}/pay/${token}?cancelled=1`
        }
      }
    }
  };

  const response = await fetcher(`${paypalBase(env)}/v2/checkout/orders`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'PayPal-Request-Id': String(idempotencyKey).slice(0, 108) } : {})
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  const approveLink = Array.isArray(data?.links)
    ? data.links.find((link) => link.rel === 'payer-action' || link.rel === 'approve')
    : null;
  if (!response.ok || !data?.id || !approveLink?.href) {
    throw new RequestError(502, 'paypal_order_failed');
  }
  return { orderId: data.id, checkoutUrl: approveLink.href };
}

export async function capturePayPalOrder(env, orderId, fetcher = fetch) {
  if (typeof orderId !== 'string' || !/^[A-Z0-9_-]{6,64}$/i.test(orderId)) {
    throw new RequestError(400, 'invalid_order');
  }
  const accessToken = await getPayPalAccessToken(env, fetcher);
  const response = await fetcher(`${paypalBase(env)}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.id) {
    throw new RequestError(502, 'paypal_capture_failed');
  }
  const unit = data.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const amountValue = Number(capture?.amount?.value || 0);
  return {
    status: String(data.status || ''),
    captureStatus: String(capture?.status || ''),
    orderId: data.id,
    captureId: capture?.id || data.id,
    currency: String(capture?.amount?.currency_code || '').toUpperCase(),
    amountCents: Math.round(amountValue * 100),
    quoteId: capture?.custom_id || unit?.custom_id || null
  };
}

export async function verifyPayPalWebhook(env, { headers, event }, fetcher = fetch) {
  if (!env.PAYPAL_WEBHOOK_ID || !paymentProvidersStatus(env).paypal) return false;
  const authAlgo = headers.get('paypal-auth-algo');
  const certUrl = headers.get('paypal-cert-url');
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionSig = headers.get('paypal-transmission-sig');
  const transmissionTime = headers.get('paypal-transmission-time');
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false;
  }
  const accessToken = await getPayPalAccessToken(env, fetcher);
  const response = await fetcher(`${paypalBase(env)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: env.PAYPAL_WEBHOOK_ID.trim(),
      webhook_event: event
    })
  });
  const data = await response.json().catch(() => null);
  return Boolean(response.ok && data?.verification_status === 'SUCCESS');
}
