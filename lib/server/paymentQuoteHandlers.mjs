// Server handlers for Admin Verified Payment Quotes, public /pay/[token]
// ESIGN execution, Stripe 3DS2 & PayPal Business checkout, Confirmed
// Reservation Pass (private 24/7 phone unlock strictly after verified payment),
// and cryptographic payment webhooks.

import { database, readBody, requireKey, digest, json, failure, uuid, RequestError } from './dashboardCore.mjs';
import {
  paymentProvidersStatus,
  createStripeCheckoutSession,
  retrieveStripeCheckoutSession,
  verifyStripeWebhookSignature,
  createPayPalOrder,
  capturePayPalOrder,
  verifyPayPalWebhook
} from './paymentProviders.mjs';
import {
  TERMS_VERSION,
  ESIGN_CLAUSES,
  computeAgreementHash
} from '../legal/termsContent.mjs';
import {
  MANAGER_TELEGRAM,
  MANAGER_WHATSAPP,
  managerTelegramUrl,
  managerWhatsAppUrl
} from '../managerContact.mjs';
import { SITE_URL } from '../seo.mjs';

const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;
const KINDS = ['car', 'yacht', 'stay', 'experience', 'dining', 'nightlife', 'jet'];
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function cleanText(value, max, { required = true } = {}) {
  if (typeof value !== 'string') {
    if (!required && (value === undefined || value === null)) return '';
    throw new RequestError(400, 'Invalid request');
  }
  const text = value.trim();
  if ((required && !text) || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
    throw new RequestError(400, 'Invalid request');
  }
  return text;
}

function generatePublicToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateReferenceCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (const byte of bytes) suffix += REF_ALPHABET[byte % REF_ALPHABET.length];
  return `ELIO-${suffix}`;
}

export function cleanSupportPhone(raw) {
  if (typeof raw !== 'string') return null;
  const display = raw.trim();
  if (!display || display.length > 32) return null;
  const digits = display.replace(/[\s().-]+/g, '');
  if (!/^\+?[1-9]\d{6,14}$/.test(digits)) return null;
  const normalized = digits.startsWith('+') ? digits : `+${digits}`;
  return { phoneDisplay: display, phoneHref: `tel:${normalized}` };
}

function chatContactsFor(env) {
  return {
    telegram: managerTelegramUrl(env.NEXT_PUBLIC_MANAGER_TELEGRAM || MANAGER_TELEGRAM),
    whatsapp: managerWhatsAppUrl(env.NEXT_PUBLIC_MANAGER_WHATSAPP || MANAGER_WHATSAPP)
  };
}

function safeOrigin(request, env) {
  if (env.APP_ENV === 'production') return SITE_URL;
  try {
    return new URL(request.url).origin;
  } catch {
    return SITE_URL;
  }
}

async function readRawText(request, maxBytes = 262144) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'Invalid request');
  let size = 0;
  const chunks = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RequestError(413, 'Request too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function assertValidToken(token) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) {
    throw new RequestError(404, 'not_found');
  }
  return token;
}

function publicQuotePayload(quote, env) {
  const isPaid = quote.status === 'paid';
  const supportPhone = isPaid ? cleanSupportPhone(env.CONFIRMED_SUPPORT_PHONE) : null;
  return {
    quote: {
      id: quote.id,
      referenceCode: quote.referenceCode,
      status: quote.status,
      itemTitle: quote.itemTitle,
      kind: quote.kind,
      supplierName: quote.supplierName,
      serviceDates: quote.serviceDates,
      cancellationPolicy: quote.cancellationPolicy,
      notes: quote.notes || '',
      amountCents: quote.amountCents,
      currency: quote.currency,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      expiresAt: quote.expiresAt,
      esignFullName: quote.esignFullName || null,
      esignSignedAt: quote.esignSignedAt || null,
      esignTermsVersion: quote.esignTermsVersion || null,
      esignDocumentHash: quote.esignDocumentHash || null,
      paymentProvider: quote.paymentProvider || null,
      providerPaymentId: isPaid ? (quote.providerPaymentId || null) : null,
      paidAt: quote.paidAt || null,
      createdAt: quote.createdAt
    },
    termsVersion: TERMS_VERSION,
    esignClauses: ESIGN_CLAUSES,
    providers: paymentProvidersStatus(env),
    chatContacts: chatContactsFor(env),
    // Hard business guardrail: the private 24/7 direct phone line is NEVER
    // returned before verified payment confirmation.
    confirmedSupport: isPaid
      ? {
          active: true,
          phoneDisplay: supportPhone?.phoneDisplay || null,
          phoneHref: supportPhone?.phoneHref || null
        }
      : null
  };
}

export function paymentQuoteHandlers(env, fetcher = fetch) {
  const guarded = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return failure(error);
    }
  };

  return {
    // Admin: create verified quote linked to a booking request (or standalone)
    createQuote: guarded(async (request) => {
      const key = requireKey(request);
      const body = await readBody(request, 16384);
      const db = database(env, fetcher);
      const user = await db.identity(request);
      if (user.role !== 'admin') throw new RequestError(403, 'Access denied');

      const bookingId = body.bookingId ? String(body.bookingId) : null;
      if (bookingId && !uuid(bookingId)) throw new RequestError(400, 'Invalid bookingId');

      const itemTitle = cleanText(body.itemTitle, 240);
      const kind = typeof body.kind === 'string' && KINDS.includes(body.kind) ? body.kind : null;
      if (!kind) throw new RequestError(400, 'Invalid kind');
      const supplierName = cleanText(body.supplierName, 200);
      const serviceDates = cleanText(body.serviceDates, 300);
      const cancellationPolicy = cleanText(body.cancellationPolicy, 1000);
      const notes = cleanText(body.notes, 1500, { required: false });
      const clientName = cleanText(body.clientName, 120);
      const clientEmail = cleanText(body.clientEmail, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) throw new RequestError(400, 'Invalid email');

      const amountCents = Number(body.amountCents);
      if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 50000000) {
        throw new RequestError(400, 'Invalid amount');
      }
      const expiresHours = body.expiresHours === undefined ? 24 : Number(body.expiresHours);
      if (!Number.isSafeInteger(expiresHours) || expiresHours < 1 || expiresHours > 168) {
        throw new RequestError(400, 'Invalid expiry');
      }

      const result = await db.rpc('payment_quote_create', {
        p_actor: user.id,
        p_key: key,
        p_input: {
          bookingId: bookingId || '',
          publicToken: generatePublicToken(),
          referenceCode: generateReferenceCode(),
          itemTitle,
          kind,
          supplierName,
          serviceDates,
          cancellationPolicy,
          notes,
          amountCents,
          clientName,
          clientEmail,
          expiresHours
        }
      });

      return json({
        success: true,
        replayed: Boolean(result.replayed),
        quote: result.quote,
        payPath: `/pay/${result.quote.publicToken}`
      });
    }),

    // Admin: list quotes for a specific booking request
    listQuotes: guarded(async (request) => {
      const db = database(env, fetcher);
      const user = await db.identity(request);
      if (user.role !== 'admin') throw new RequestError(403, 'Access denied');
      const bookingId = new URL(request.url).searchParams.get('bookingId');
      if (!uuid(bookingId)) throw new RequestError(400, 'Invalid bookingId');
      const result = await db.rpc('payment_quote_list_for_booking', {
        p_actor: user.id,
        p_booking: bookingId
      });
      return json({
        success: true,
        quotes: result.quotes || [],
        providers: paymentProvidersStatus(env),
        confirmedPhoneConfigured: Boolean(cleanSupportPhone(env.CONFIRMED_SUPPORT_PHONE))
      });
    }),

    // Admin: cancel an unpaid quote
    cancelQuote: guarded(async (request) => {
      const db = database(env, fetcher);
      const user = await db.identity(request);
      if (user.role !== 'admin') throw new RequestError(403, 'Access denied');
      const quoteId = new URL(request.url).searchParams.get('id');
      if (!uuid(quoteId)) throw new RequestError(400, 'Invalid quote id');
      await db.rpc('payment_quote_cancel', { p_actor: user.id, p_quote_id: quoteId });
      return json({ success: true });
    }),

    // Public: load verified checkout quote by 256-bit token (and verify Stripe return if present)
    getPublicQuote: guarded(async (request, token) => {
      const validToken = assertValidToken(token);
      const db = database(env, fetcher);
      let loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
      let quote = loaded.quote;

      const url = new URL(request.url);
      const providerParam = url.searchParams.get('provider');
      const sessionIdParam = url.searchParams.get('session_id');

      if (
        providerParam === 'stripe' &&
        sessionIdParam &&
        quote.status === 'signed' &&
        quote.providerSessionId === sessionIdParam &&
        paymentProvidersStatus(env).stripe
      ) {
        try {
          const verified = await retrieveStripeCheckoutSession(env, sessionIdParam, fetcher);
          if (
            verified.paymentStatus === 'paid' &&
            verified.currency === 'usd' &&
            verified.amountTotal === quote.amountCents &&
            verified.quoteId === quote.id
          ) {
            await db.rpc('payment_quote_mark_paid', {
              p_quote_id: quote.id,
              p_provider: 'stripe',
              p_session_id: verified.id,
              p_payment_id: verified.paymentId
            });
            loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
            quote = loaded.quote;
          }
        } catch {
          // Non-fatal: webhook remains authoritative if live lookup transiently fails.
        }
      }

      return json(publicQuotePayload(quote, env));
    }),

    // Public: execute mandatory ESIGN electronic agreement before payment unlocks
    signQuote: guarded(async (request, token) => {
      const validToken = assertValidToken(token);
      const body = await readBody(request, 4096);
      if (body.acceptedAgencyTerms !== true || body.acceptedShieldTerms !== true) {
        throw new RequestError(400, 'agreement_checkboxes_required');
      }
      const fullName = cleanText(body.fullName, 120);
      if (fullName.length < 2) throw new RequestError(400, 'invalid_name');

      const db = database(env, fetcher);
      const loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
      const quote = loaded.quote;

      const docHash = await computeAgreementHash(quote);
      const secret = env.BOOKING_RATE_SECRET || 'miami-elio-esign-fallback';
      const rawIp = request.headers.get('cf-connecting-ip') || 'unavailable';
      const rawUa = request.headers.get('user-agent') || 'unknown';
      const [ipHash, uaHash] = await Promise.all([
        digest(rawIp, secret),
        digest(rawUa, secret)
      ]);

      const signed = await db.rpc('payment_quote_sign', {
        p_token: validToken,
        p_full_name: fullName,
        p_terms_version: TERMS_VERSION,
        p_doc_hash: docHash,
        p_ip_hash: ipHash,
        p_ua_hash: uaHash
      });

      return json(signed);
    }),

    // Public: initiate Stripe 3DS2 Checkout or PayPal Business Order (strictly requires ESIGN)
    startCheckout: guarded(async (request, token) => {
      const validToken = assertValidToken(token);
      const body = await readBody(request, 2048);
      const provider = body.provider;
      if (provider !== 'stripe' && provider !== 'paypal') {
        throw new RequestError(400, 'invalid_provider');
      }

      const db = database(env, fetcher);
      const loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
      const quote = loaded.quote;

      if (quote.status === 'paid') throw new RequestError(409, 'already_paid');
      if (quote.status === 'expired' || quote.status === 'cancelled') {
        throw new RequestError(409, 'quote_inactive');
      }
      if (quote.status !== 'signed' || !quote.esignSignedAt || !quote.esignDocumentHash) {
        throw new RequestError(409, 'agreement_required');
      }

      const origin = safeOrigin(request, env);
      const idempotencyKey = await digest(`${quote.id}:${provider}:${quote.esignDocumentHash}`);

      let sessionId;
      let checkoutUrl;
      if (provider === 'stripe') {
        const created = await createStripeCheckoutSession(
          env,
          { quote, token: validToken, origin, idempotencyKey },
          fetcher
        );
        sessionId = created.sessionId;
        checkoutUrl = created.checkoutUrl;
      } else {
        const created = await createPayPalOrder(
          env,
          { quote, token: validToken, origin, idempotencyKey },
          fetcher
        );
        sessionId = created.orderId;
        checkoutUrl = created.checkoutUrl;
      }

      await db.rpc('payment_quote_attach_session', {
        p_token: validToken,
        p_provider: provider,
        p_session_id: sessionId
      });

      return json({ success: true, provider, sessionId, checkoutUrl });
    }),

    // Public: capture approved PayPal Business order on return to /pay/[token]
    capturePayPal: guarded(async (request, token) => {
      const validToken = assertValidToken(token);
      const body = await readBody(request, 2048);
      const orderId = cleanText(body.orderId, 80);

      const db = database(env, fetcher);
      const loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
      const quote = loaded.quote;

      if (quote.status === 'paid') {
        return json({ success: true, alreadyPaid: true, referenceCode: quote.referenceCode, paidAt: quote.paidAt });
      }
      if (quote.status !== 'signed' || !quote.esignSignedAt) {
        throw new RequestError(409, 'agreement_required');
      }
      if (!quote.providerSessionId || quote.providerSessionId !== orderId) {
        throw new RequestError(409, 'order_mismatch');
      }

      const captured = await capturePayPalOrder(env, orderId, fetcher);
      if (
        captured.status !== 'COMPLETED' ||
        captured.currency !== 'USD' ||
        captured.amountCents !== quote.amountCents ||
        (captured.quoteId && captured.quoteId !== quote.id)
      ) {
        throw new RequestError(409, 'capture_verification_failed');
      }

      const marked = await db.rpc('payment_quote_mark_paid', {
        p_quote_id: quote.id,
        p_provider: 'paypal',
        p_session_id: captured.orderId,
        p_payment_id: captured.captureId
      });

      return json({ success: true, ...marked });
    }),

    // Webhook: Stripe cryptographic HMAC-SHA256 verification
    stripeWebhook: guarded(async (request) => {
      if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_WEBHOOK_SECRET.trim()) {
        throw new RequestError(503, 'webhook_not_configured');
      }
      const rawBody = await readRawText(request);
      const signature = request.headers.get('stripe-signature') || '';
      const valid = await verifyStripeWebhookSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
      if (!valid) throw new RequestError(400, 'invalid_signature');

      let event;
      try {
        event = JSON.parse(rawBody);
      } catch {
        throw new RequestError(400, 'invalid_payload');
      }

      if (
        event?.type === 'checkout.session.completed' ||
        event?.type === 'checkout.session.async_payment_succeeded'
      ) {
        const session = event.data?.object;
        if (session?.payment_status === 'paid') {
          const quoteId = session.metadata?.quote_id || session.client_reference_id;
          const paymentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id || session.id;
          if (uuid(quoteId) && typeof paymentId === 'string' && paymentId.length >= 3) {
            const db = database(env, fetcher);
            await db.rpc('payment_quote_mark_paid', {
              p_quote_id: quoteId,
              p_provider: 'stripe',
              p_session_id: String(session.id || ''),
              p_payment_id: paymentId
            });
          }
        }
      }

      return json({ received: true });
    }),

    // Webhook: PayPal cryptographic webhook signature verification
    paypalWebhook: guarded(async (request) => {
      if (!env.PAYPAL_WEBHOOK_ID || !paymentProvidersStatus(env).paypal) {
        throw new RequestError(503, 'webhook_not_configured');
      }
      const rawBody = await readRawText(request);
      let event;
      try {
        event = JSON.parse(rawBody);
      } catch {
        throw new RequestError(400, 'invalid_payload');
      }
      const valid = await verifyPayPalWebhook(env, { headers: request.headers, event }, fetcher);
      if (!valid) throw new RequestError(400, 'invalid_signature');

      if (event?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = event.resource || {};
        const quoteId = resource.custom_id;
        const paymentId = resource.id;
        const orderId = resource.supplementary_data?.related_ids?.order_id || '';
        if (uuid(quoteId) && typeof paymentId === 'string' && paymentId.length >= 3) {
          const db = database(env, fetcher);
          await db.rpc('payment_quote_mark_paid', {
            p_quote_id: quoteId,
            p_provider: 'paypal',
            p_session_id: String(orderId),
            p_payment_id: paymentId
          });
        }
      }

      return json({ received: true });
    })
  };
}
