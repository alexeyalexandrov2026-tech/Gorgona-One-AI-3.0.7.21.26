// Server handlers for Admin Verified Payment Quotes, public /pay/[token]
// ESIGN execution, Stripe 3DS2 & PayPal Business checkout, Confirmed
// Reservation Pass (private 24/7 phone unlock strictly after verified payment),
// and cryptographic payment webhooks.

import { database, readBody, requireKey, digest, json, failure, uuid, RequestError } from './dashboardCore.mjs';
import {
  paymentProvidersStatus,
  createStripeCheckoutSession,
  cancelStripePaymentIntent,
  createStripeIdentitySession,
  retrieveStripeIdentitySession,
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
const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const KINDS = ['car', 'yacht', 'stay', 'experience', 'dining', 'nightlife', 'jet'];
const LINE_ITEM_CATEGORIES = new Set(['base', 'tax', 'delivery', 'crew', 'fee', 'discount']);
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAY_RATE_WINDOW_MS = 10 * 60 * 1000;
const PAY_RATE_MAX = 25;
const payRateByIp = new Map();
const processedWebhookEvents = new Set();

function allowedPayOrigin(request, env) {
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

function hitPayRateLimit(key, now = Date.now()) {
  const cutoff = now - PAY_RATE_WINDOW_MS;
  const list = (payRateByIp.get(key) || []).filter((ts) => ts > cutoff);
  if (list.length >= PAY_RATE_MAX) {
    payRateByIp.set(key, list);
    return true;
  }
  list.push(now);
  payRateByIp.set(key, list);
  if (payRateByIp.size > 500) {
    for (const [k, v] of payRateByIp.entries()) {
      if (!v.some((ts) => ts > cutoff)) payRateByIp.delete(k);
    }
  }
  return false;
}

function markWebhookEventSeen(eventId) {
  if (typeof eventId !== 'string' || !eventId.trim()) return false;
  if (processedWebhookEvents.has(eventId)) return true;
  processedWebhookEvents.add(eventId);
  if (processedWebhookEvents.size > 500) {
    const first = processedWebhookEvents.values().next().value;
    if (first) processedWebhookEvents.delete(first);
  }
  return false;
}

export function resetPayGuardsForTests() {
  payRateByIp.clear();
  processedWebhookEvents.clear();
}

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

function generateShareToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sanitizeLineItems(raw) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 12) {
    throw new RequestError(400, 'Invalid line items');
  }
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw new RequestError(400, 'Invalid line item');
    const label = cleanText(item.label, 120);
    const category = typeof item.category === 'string' && LINE_ITEM_CATEGORIES.has(item.category)
      ? item.category
      : 'base';
    const amountCents = Number(item.amountCents);
    if (!Number.isSafeInteger(amountCents) || Math.abs(amountCents) > 50000000) {
      throw new RequestError(400, 'Invalid line item amount');
    }
    if (category !== 'discount' && amountCents < 0) {
      throw new RequestError(400, 'Invalid line item amount');
    }
    return { label, amountCents, category };
  });
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
  const rawShares = Array.isArray(quote.shares) ? quote.shares : [];
  const publicShares = rawShares.map((share) => ({
    id: share.id,
    shareIndex: share.shareIndex,
    shareToken: share.shareToken,
    amountCents: share.amountCents,
    status: share.status,
    payerName: share.payerName || null,
    paymentProvider: share.paymentProvider || null,
    paidAt: share.paidAt || null
  }));
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
      createdAt: quote.createdAt,
      lineItems: Array.isArray(quote.lineItems) ? quote.lineItems : [],
      depositCents: Number(quote.depositCents || 0),
      depositStatus: quote.depositStatus || 'none',
      depositHeldAt: quote.depositHeldAt || null,
      depositReleasedAt: quote.depositReleasedAt || null,
      priceLockCents: Number(quote.priceLockCents || 0),
      priceLockStatus: quote.priceLockStatus || 'none',
      priceLockUntil: quote.priceLockUntil || null,
      weatherShieldEnabled: quote.weatherShieldEnabled !== false,
      splitWays: Number(quote.splitWays || 1),
      kycRequired: Boolean(quote.kycRequired),
      kycStatus: quote.kycStatus || 'none',
      kycVerifiedAt: quote.kycVerifiedAt || null,
      flightNumber: quote.flightNumber || '',
      arrivalAirport: quote.arrivalAirport || '',
      arrivalTime: quote.arrivalTime || '',
      deliveryLocation: quote.deliveryLocation || '',
      paidAmountCents: Number(quote.paidAmountCents || (isPaid ? quote.amountCents : 0)),
      paidSharesCount: Number(quote.paidSharesCount || 0),
      shares: publicShares
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
      const lineItems = sanitizeLineItems(body.lineItems);
      const depositCents = body.depositCents === undefined ? 0 : Number(body.depositCents);
      if (!Number.isSafeInteger(depositCents) || depositCents < 0 || depositCents > 50000000) {
        throw new RequestError(400, 'Invalid deposit');
      }
      const priceLockCents = body.priceLockCents === undefined ? 0 : Number(body.priceLockCents);
      if (!Number.isSafeInteger(priceLockCents) || priceLockCents < 0 || priceLockCents > 5000000) {
        throw new RequestError(400, 'Invalid price lock');
      }
      const weatherShieldEnabled = body.weatherShieldEnabled === undefined ? true : Boolean(body.weatherShieldEnabled);
      const kycRequired = Boolean(body.kycRequired);
      const splitWays = body.splitWays === undefined ? 1 : Number(body.splitWays);
      if (!Number.isSafeInteger(splitWays) || splitWays < 1 || splitWays > 12) {
        throw new RequestError(400, 'Invalid splitWays');
      }
      if (splitWays > 1 && Math.floor(amountCents / splitWays) < 100) {
        throw new RequestError(400, 'Split amount too small');
      }
      const shareTokens = splitWays > 1
        ? Array.from({ length: splitWays }, () => generateShareToken())
        : [];

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
          expiresHours,
          lineItems,
          depositCents,
          priceLockCents,
          weatherShieldEnabled,
          kycRequired,
          splitWays,
          shareTokens
        }
      });

      return json({
        success: true,
        replayed: Boolean(result.replayed),
        quote: result.quote,
        payPath: `/pay/${result.quote.publicToken}`
      });
    }),

    // Admin: 1-click release of a Refundable Security Deposit or 24h Price Lock Stripe Pre-Auth hold
    releaseHold: guarded(async (request) => {
      const body = await readBody(request, 2048);
      const db = database(env, fetcher);
      const user = await db.identity(request);
      if (user.role !== 'admin') throw new RequestError(403, 'Access denied');

      const quoteId = typeof body.quoteId === 'string' ? body.quoteId.trim() : '';
      const holdKind = body.holdKind === 'price_lock' ? 'price_lock' : body.holdKind === 'deposit' ? 'deposit' : null;
      if (!uuid(quoteId) || !holdKind) throw new RequestError(400, 'Invalid request');

      const loaded = await db.rpc('payment_quote_get_by_id_admin', {
        p_actor: user.id,
        p_quote_id: quoteId
      });
      const quote = loaded.quote;
      const currentStatus = holdKind === 'deposit' ? quote.depositStatus : quote.priceLockStatus;
      const paymentIntentId = holdKind === 'deposit'
        ? quote.depositPaymentIntentId
        : quote.priceLockPaymentIntentId;
      const expectedActive = holdKind === 'deposit' ? 'held' : 'locked';

      if (currentStatus !== expectedActive) {
        throw new RequestError(409, 'hold_not_active');
      }

      let stripeStatus = null;
      if (paymentIntentId && /^pi_[A-Za-z0-9_]{6,200}$/.test(paymentIntentId) && paymentProvidersStatus(env).stripe) {
        const cancelled = await cancelStripePaymentIntent(env, paymentIntentId, fetcher);
        stripeStatus = cancelled.status;
      }

      const updated = await db.rpc('payment_quote_update_hold_status', {
        p_quote_id: quoteId,
        p_hold_kind: holdKind,
        p_status: 'released',
        p_payment_intent_id: paymentIntentId || null
      });

      return json({
        success: true,
        holdKind,
        status: updated.status,
        stripeStatus
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
      const kindParam = url.searchParams.get('kind') || 'main';
      const shareParam = url.searchParams.get('share') || '';
      const kycSessionParam = url.searchParams.get('kyc_session_id') || '';

      if (
        kycSessionParam &&
        quote.kycSessionId === kycSessionParam &&
        quote.kycStatus !== 'verified' &&
        paymentProvidersStatus(env).stripe
      ) {
        try {
          const verifiedKyc = await retrieveStripeIdentitySession(env, kycSessionParam, fetcher);
          if (verifiedKyc.quoteId === quote.id && (verifiedKyc.status === 'verified' || verifiedKyc.status === 'requires_input')) {
            await db.rpc('payment_quote_update_kyc', {
              p_quote_id: quote.id,
              p_status: verifiedKyc.status,
              p_session_id: verifiedKyc.id
            });
            loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
            quote = loaded.quote;
          }
        } catch {
          // Non-fatal: Stripe Identity webhook remains authoritative.
        }
      }

      if (providerParam === 'stripe' && sessionIdParam && paymentProvidersStatus(env).stripe) {
        try {
          if (
            kindParam === 'main' &&
            quote.status === 'signed' &&
            quote.providerSessionId === sessionIdParam
          ) {
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
          } else if (kindParam === 'share' && SHARE_TOKEN_RE.test(shareParam) && quote.status === 'signed') {
            const targetShare = (Array.isArray(quote.shares) ? quote.shares : []).find(
              (s) => s.shareToken === shareParam && s.status === 'open'
            );
            if (targetShare && targetShare.providerSessionId === sessionIdParam) {
              const verified = await retrieveStripeCheckoutSession(env, sessionIdParam, fetcher);
              if (
                verified.paymentStatus === 'paid' &&
                verified.currency === 'usd' &&
                verified.amountTotal === targetShare.amountCents &&
                verified.quoteId === quote.id &&
                verified.shareToken === targetShare.shareToken
              ) {
                await db.rpc('payment_quote_mark_share_paid', {
                  p_quote_id: quote.id,
                  p_share_token: targetShare.shareToken,
                  p_provider: 'stripe',
                  p_session_id: verified.id,
                  p_payment_id: verified.paymentId
                });
                loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
                quote = loaded.quote;
              }
            }
          } else if (kindParam === 'deposit' && quote.depositStatus === 'pending' && quote.depositCents >= 100) {
            const verified = await retrieveStripeCheckoutSession(env, sessionIdParam, fetcher);
            const authorized = verified.paymentStatus === 'paid' || verified.sessionStatus === 'complete';
            if (
              authorized &&
              verified.currency === 'usd' &&
              verified.amountTotal === quote.depositCents &&
              verified.quoteId === quote.id &&
              verified.checkoutKind === 'deposit' &&
              verified.paymentId
            ) {
              await db.rpc('payment_quote_update_hold_status', {
                p_quote_id: quote.id,
                p_hold_kind: 'deposit',
                p_status: 'held',
                p_payment_intent_id: verified.paymentId
              });
              loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
              quote = loaded.quote;
            }
          } else if (kindParam === 'price_lock' && quote.priceLockStatus === 'pending' && quote.priceLockCents >= 100) {
            const verified = await retrieveStripeCheckoutSession(env, sessionIdParam, fetcher);
            const authorized = verified.paymentStatus === 'paid' || verified.sessionStatus === 'complete';
            if (
              authorized &&
              verified.currency === 'usd' &&
              verified.amountTotal === quote.priceLockCents &&
              verified.quoteId === quote.id &&
              verified.checkoutKind === 'price_lock' &&
              verified.paymentId
            ) {
              await db.rpc('payment_quote_update_hold_status', {
                p_quote_id: quote.id,
                p_hold_kind: 'price_lock',
                p_status: 'locked',
                p_payment_intent_id: verified.paymentId,
                p_hold_hours: 24
              });
              loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
              quote = loaded.quote;
            }
          }
        } catch {
          // Non-fatal: webhook remains authoritative if live lookup transiently fails.
        }
      }

      return json(publicQuotePayload(quote, env));
    }),

    // Public: execute mandatory ESIGN electronic agreement before payment unlocks
    signQuote: guarded(async (request, token) => {
      if (!allowedPayOrigin(request, env)) throw new RequestError(403, 'Forbidden');
      const validToken = assertValidToken(token);
      const rawIp = request.headers.get('cf-connecting-ip');
      const validIp = Boolean(rawIp && /^[a-f0-9:.]{3,64}$/i.test(rawIp));
      if (!validIp && env.APP_ENV === 'production') {
        throw new RequestError(503, 'Service unavailable');
      }
      const secret = typeof env.BOOKING_RATE_SECRET === 'string' && env.BOOKING_RATE_SECRET.length >= 32
        ? env.BOOKING_RATE_SECRET
        : (env.APP_ENV === 'production' ? null : 'local-dev-only-esign-key-000000000000');
      if (!secret) throw new RequestError(503, 'Service unavailable');
      if (hitPayRateLimit(await digest(`pay-sign:${validIp ? rawIp : 'local'}`, secret))) {
        throw new RequestError(429, 'Too many requests');
      }

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
      const rawUa = request.headers.get('user-agent') || 'unknown';
      const [ipHash, uaHash] = await Promise.all([
        digest(validIp ? rawIp : 'unavailable', secret),
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
      if (!allowedPayOrigin(request, env)) throw new RequestError(403, 'Forbidden');
      const validToken = assertValidToken(token);
      const rawIp = request.headers.get('cf-connecting-ip') || 'local';
      if (hitPayRateLimit(await digest(`pay-checkout:${rawIp}`))) {
        throw new RequestError(429, 'Too many requests');
      }
      const body = await readBody(request, 2048);
      const provider = body.provider;
      if (provider !== 'stripe' && provider !== 'paypal') {
        throw new RequestError(400, 'invalid_provider');
      }
      const checkoutKind = ['main', 'share', 'deposit', 'price_lock'].includes(body.checkoutKind)
        ? body.checkoutKind
        : 'main';
      const shareToken = typeof body.shareToken === 'string' ? body.shareToken.trim() : '';
      const payerName = cleanText(body.payerName, 120, { required: false });
      const payerEmailRaw = cleanText(body.payerEmail, 254, { required: false }).toLowerCase();
      const payerEmail = payerEmailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmailRaw) ? payerEmailRaw : '';

      const db = database(env, fetcher);
      const loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
      const quote = loaded.quote;

      if (quote.status === 'expired' || quote.status === 'cancelled') {
        throw new RequestError(409, 'quote_inactive');
      }
      if (!quote.esignSignedAt || !quote.esignDocumentHash) {
        throw new RequestError(409, 'agreement_required');
      }
      if (checkoutKind !== 'deposit' && quote.status === 'paid') {
        throw new RequestError(409, 'already_paid');
      }
      if (checkoutKind !== 'deposit' && quote.status !== 'signed') {
        throw new RequestError(409, 'agreement_required');
      }

      const origin = safeOrigin(request, env);
      const windowBucket = Math.floor(Date.now() / (30 * 60 * 1000));

      if (checkoutKind === 'deposit') {
        if (provider !== 'stripe') throw new RequestError(400, 'deposit_requires_stripe');
        if (Number(quote.depositCents || 0) < 100 || quote.depositStatus !== 'pending') {
          throw new RequestError(409, 'deposit_not_available');
        }
        const idempotencyKey = await digest(`${quote.id}:deposit:${quote.esignDocumentHash}:${windowBucket}`);
        const created = await createStripeCheckoutSession(
          env,
          {
            quote,
            token: validToken,
            origin,
            idempotencyKey,
            amountCents: Number(quote.depositCents),
            productName: `Refundable Security Deposit Hold · ${quote.itemTitle}`,
            description: `${quote.referenceCode} · Pre-authorization hold only (not charged unless damage/incident)`,
            checkoutKind: 'deposit',
            captureMethod: 'manual'
          },
          fetcher
        );
        return json({ success: true, provider: 'stripe', checkoutKind: 'deposit', sessionId: created.sessionId, checkoutUrl: created.checkoutUrl });
      }

      if (checkoutKind === 'price_lock') {
        if (provider !== 'stripe') throw new RequestError(400, 'price_lock_requires_stripe');
        if (Number(quote.priceLockCents || 0) < 100 || quote.priceLockStatus !== 'pending') {
          throw new RequestError(409, 'price_lock_not_available');
        }
        const idempotencyKey = await digest(`${quote.id}:price_lock:${quote.esignDocumentHash}:${windowBucket}`);
        const created = await createStripeCheckoutSession(
          env,
          {
            quote,
            token: validToken,
            origin,
            idempotencyKey,
            amountCents: Number(quote.priceLockCents),
            productName: `24-Hour Price Lock Hold · ${quote.itemTitle}`,
            description: `${quote.referenceCode} · Refundable 24h availability & rate lock (pre-authorization hold)`,
            checkoutKind: 'price_lock',
            captureMethod: 'manual'
          },
          fetcher
        );
        return json({ success: true, provider: 'stripe', checkoutKind: 'price_lock', sessionId: created.sessionId, checkoutUrl: created.checkoutUrl });
      }

      if (checkoutKind === 'share') {
        if (!SHARE_TOKEN_RE.test(shareToken)) throw new RequestError(400, 'invalid_share');
        const targetShare = (Array.isArray(quote.shares) ? quote.shares : []).find((s) => s.shareToken === shareToken);
        if (!targetShare) throw new RequestError(404, 'share_not_found');
        if (targetShare.status !== 'open') throw new RequestError(409, 'share_already_paid');

        const idempotencyKey = await digest(`${quote.id}:share:${targetShare.shareToken}:${provider}:${targetShare.providerSessionId || 'init'}:${windowBucket}`);
        let sessionId;
        let checkoutUrl;
        if (provider === 'stripe') {
          const created = await createStripeCheckoutSession(
            env,
            {
              quote,
              token: validToken,
              origin,
              idempotencyKey,
              amountCents: Number(targetShare.amountCents),
              productName: `${quote.itemTitle} · Share ${targetShare.shareIndex} of ${quote.splitWays}`,
              description: `${quote.referenceCode} · Group Split-Pay (${targetShare.shareIndex}/${quote.splitWays}) · ${quote.supplierName}`,
              checkoutKind: 'share',
              shareToken: targetShare.shareToken,
              customerEmail: payerEmail || quote.clientEmail
            },
            fetcher
          );
          sessionId = created.sessionId;
          checkoutUrl = created.checkoutUrl;
        } else {
          const created = await createPayPalOrder(
            env,
            {
              quote,
              token: validToken,
              origin,
              idempotencyKey,
              amountCents: Number(targetShare.amountCents),
              shareToken: targetShare.shareToken,
              description: `${quote.itemTitle} · Share ${targetShare.shareIndex}/${quote.splitWays}`
            },
            fetcher
          );
          sessionId = created.orderId;
          checkoutUrl = created.checkoutUrl;
        }

        await db.rpc('payment_quote_attach_share_session', {
          p_token: validToken,
          p_share_token: targetShare.shareToken,
          p_provider: provider,
          p_session_id: sessionId,
          p_payer_name: payerName || null,
          p_payer_email: payerEmail || null
        });

        return json({ success: true, provider, checkoutKind: 'share', shareIndex: targetShare.shareIndex, sessionId, checkoutUrl });
      }

      // Default: full quote settlement ('main')
      const idempotencyKey = await digest(`${quote.id}:${provider}:${quote.esignDocumentHash}:${quote.providerSessionId || 'init'}:${windowBucket}`);

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

      return json({ success: true, provider, checkoutKind: 'main', sessionId, checkoutUrl });
    }),

    // Public: capture approved PayPal Business order on return to /pay/[token]
    capturePayPal: guarded(async (request, token) => {
      if (!allowedPayOrigin(request, env)) throw new RequestError(403, 'Forbidden');
      const validToken = assertValidToken(token);
      const rawIp = request.headers.get('cf-connecting-ip') || 'local';
      if (hitPayRateLimit(await digest(`pay-capture:${rawIp}`))) {
        throw new RequestError(429, 'Too many requests');
      }
      const body = await readBody(request, 2048);
      const orderId = cleanText(body.orderId, 80);
      const shareToken = typeof body.shareToken === 'string' && SHARE_TOKEN_RE.test(body.shareToken.trim())
        ? body.shareToken.trim()
        : '';

      const db = database(env, fetcher);
      const loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
      const quote = loaded.quote;

      if (quote.status === 'paid') {
        return json({ success: true, alreadyPaid: true, referenceCode: quote.referenceCode, paidAt: quote.paidAt });
      }
      if (quote.status !== 'signed' || !quote.esignSignedAt) {
        throw new RequestError(409, 'agreement_required');
      }

      if (shareToken) {
        const targetShare = (Array.isArray(quote.shares) ? quote.shares : []).find((s) => s.shareToken === shareToken);
        if (!targetShare) throw new RequestError(404, 'share_not_found');
        if (targetShare.status === 'paid') {
          return json({ success: true, alreadyPaid: true, shareIndex: targetShare.shareIndex });
        }
        if (!targetShare.providerSessionId || targetShare.providerSessionId !== orderId) {
          throw new RequestError(409, 'order_mismatch');
        }
        const captured = await capturePayPalOrder(env, orderId, fetcher);
        const expectedCustomId = `${quote.id}:${shareToken}`;
        if (
          captured.status !== 'COMPLETED' ||
          captured.currency !== 'USD' ||
          captured.amountCents !== targetShare.amountCents ||
          (captured.quoteId && captured.quoteId !== expectedCustomId && captured.quoteId !== quote.id)
        ) {
          throw new RequestError(409, 'capture_verification_failed');
        }
        const marked = await db.rpc('payment_quote_mark_share_paid', {
          p_quote_id: quote.id,
          p_share_token: shareToken,
          p_provider: 'paypal',
          p_session_id: captured.orderId,
          p_payment_id: captured.captureId
        });
        return json({ success: true, ...marked });
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

    // Public: start 30-second Stripe Identity online KYC (ID / Driver's License + Selfie)
    startKyc: guarded(async (request, token) => {
      if (!allowedPayOrigin(request, env)) throw new RequestError(403, 'Forbidden');
      const validToken = assertValidToken(token);
      const rawIp = request.headers.get('cf-connecting-ip') || 'local';
      if (hitPayRateLimit(await digest(`pay-kyc:${rawIp}`))) {
        throw new RequestError(429, 'Too many requests');
      }
      const db = database(env, fetcher);
      const loaded = await db.rpc('payment_quote_get_by_token', { p_token: validToken });
      const quote = loaded.quote;

      if (quote.status === 'expired' || quote.status === 'cancelled') {
        throw new RequestError(409, 'quote_inactive');
      }
      if (quote.kycStatus === 'verified') {
        return json({ success: true, alreadyVerified: true, kycStatus: 'verified' });
      }

      const origin = safeOrigin(request, env);
      const windowBucket = Math.floor(Date.now() / (30 * 60 * 1000));
      const idempotencyKey = await digest(`${quote.id}:kyc:${quote.kycSessionId || 'init'}:${windowBucket}`);
      const session = await createStripeIdentitySession(
        env,
        { quote, token: validToken, origin, idempotencyKey },
        fetcher
      );

      await db.rpc('payment_quote_update_kyc', {
        p_quote_id: quote.id,
        p_status: 'pending',
        p_session_id: session.sessionId
      });

      return json({
        success: true,
        sessionId: session.sessionId,
        verificationUrl: session.verificationUrl
      });
    }),

    // Public: save Flight-Synced Airport / FBO / Marina delivery details
    updateLogistics: guarded(async (request, token) => {
      if (!allowedPayOrigin(request, env)) throw new RequestError(403, 'Forbidden');
      const validToken = assertValidToken(token);
      const rawIp = request.headers.get('cf-connecting-ip') || 'local';
      if (hitPayRateLimit(await digest(`pay-logistics:${rawIp}`))) {
        throw new RequestError(429, 'Too many requests');
      }
      const body = await readBody(request, 2048);
      const flightNumber = cleanText(body.flightNumber, 32, { required: false }).toUpperCase();
      const arrivalAirport = cleanText(body.arrivalAirport, 80, { required: false });
      const arrivalTime = cleanText(body.arrivalTime, 64, { required: false });
      const deliveryLocation = cleanText(body.deliveryLocation, 240, { required: false });
      if (!flightNumber && !arrivalAirport && !deliveryLocation) {
        throw new RequestError(400, 'logistics_empty');
      }

      const db = database(env, fetcher);
      const updated = await db.rpc('payment_quote_update_logistics', {
        p_token: validToken,
        p_flight_number: flightNumber || null,
        p_arrival_airport: arrivalAirport || null,
        p_arrival_time: arrivalTime || null,
        p_delivery_location: deliveryLocation || null
      });
      return json(updated);
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
        event?.type === 'identity.verification_session.verified' ||
        event?.type === 'identity.verification_session.requires_input'
      ) {
        if (markWebhookEventSeen(`stripe:${event.id}`)) {
          return json({ received: true, duplicate: true });
        }
        const vs = event.data?.object;
        const quoteId = vs?.metadata?.quote_id;
        if (uuid(quoteId) && typeof vs?.id === 'string') {
          const db = database(env, fetcher);
          await db.rpc('payment_quote_update_kyc', {
            p_quote_id: quoteId,
            p_status: event.type === 'identity.verification_session.verified' ? 'verified' : 'requires_input',
            p_session_id: vs.id
          });
        }
        return json({ received: true });
      }

      if (event?.type === 'payment_intent.canceled') {
        if (markWebhookEventSeen(`stripe:${event.id}`)) {
          return json({ received: true, duplicate: true });
        }
        const pi = event.data?.object;
        const quoteId = pi?.metadata?.quote_id;
        const holdKind = pi?.metadata?.checkout_kind;
        if (uuid(quoteId) && (holdKind === 'deposit' || holdKind === 'price_lock')) {
          const db = database(env, fetcher);
          await db.rpc('payment_quote_update_hold_status', {
            p_quote_id: quoteId,
            p_hold_kind: holdKind,
            p_status: 'released',
            p_payment_intent_id: typeof pi.id === 'string' ? pi.id : null
          });
        }
        return json({ received: true });
      }

      if (
        event?.type === 'checkout.session.completed' ||
        event?.type === 'checkout.session.async_payment_succeeded'
      ) {
        if (markWebhookEventSeen(`stripe:${event.id}`)) {
          return json({ received: true, duplicate: true });
        }
        const session = event.data?.object;
        const expectedLivemode = env.APP_ENV === 'production' && !String(env.STRIPE_SECRET_KEY || '').trim().startsWith('sk_test_');
        if (typeof session?.livemode === 'boolean' && env.APP_ENV === 'production' && session.livemode !== expectedLivemode) {
          throw new RequestError(400, 'mode_mismatch');
        }
        const checkoutKind = session?.metadata?.checkout_kind || 'main';
        const shareToken = session?.metadata?.share_token || '';
        const quoteId = session?.metadata?.quote_id || session?.client_reference_id;
        const paymentId = typeof session?.payment_intent === 'string'
          ? session.payment_intent
          : session?.payment_intent?.id || session?.id;

        if ((checkoutKind === 'deposit' || checkoutKind === 'price_lock') && uuid(quoteId) && typeof paymentId === 'string' && paymentId.length >= 3) {
          const authorized = session?.payment_status === 'paid' || session?.status === 'complete';
          if (authorized) {
            const db = database(env, fetcher);
            await db.rpc('payment_quote_update_hold_status', {
              p_quote_id: quoteId,
              p_hold_kind: checkoutKind,
              p_status: checkoutKind === 'deposit' ? 'held' : 'locked',
              p_payment_intent_id: paymentId,
              p_hold_hours: 24
            });
          }
        } else if (session?.payment_status === 'paid') {
          const currency = String(session.currency || '').toLowerCase();
          const amountTotal = Number(session.amount_total);
          if (currency && currency !== 'usd') throw new RequestError(400, 'currency_mismatch');
          if (session.amount_total !== undefined && (!Number.isSafeInteger(amountTotal) || amountTotal < 100)) {
            throw new RequestError(400, 'invalid_amount');
          }
          if (uuid(quoteId) && typeof paymentId === 'string' && paymentId.length >= 3) {
            if (session.amount_total === undefined && paymentProvidersStatus(env).stripe && /^cs_(?:test_|live_)?[A-Za-z0-9_]{8,200}$/.test(String(session.id || ''))) {
              const verified = await retrieveStripeCheckoutSession(env, session.id, fetcher).catch(() => null);
              if (verified && (verified.paymentStatus !== 'paid' || verified.currency !== 'usd' || verified.amountTotal < 100)) {
                throw new RequestError(400, 'settlement_verification_failed');
              }
            }
            const db = database(env, fetcher);
            if (checkoutKind === 'share' && SHARE_TOKEN_RE.test(shareToken)) {
              await db.rpc('payment_quote_mark_share_paid', {
                p_quote_id: quoteId,
                p_share_token: shareToken,
                p_provider: 'stripe',
                p_session_id: String(session.id || ''),
                p_payment_id: paymentId,
                p_payer_name: session.customer_details?.name || null,
                p_payer_email: session.customer_details?.email || null
              });
            } else {
              await db.rpc('payment_quote_mark_paid', {
                p_quote_id: quoteId,
                p_provider: 'stripe',
                p_session_id: String(session.id || ''),
                p_payment_id: paymentId
              });
            }
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
        if (markWebhookEventSeen(`paypal:${event.id}`)) {
          return json({ received: true, duplicate: true });
        }
        const resource = event.resource || {};
        if (resource.status && String(resource.status).toUpperCase() !== 'COMPLETED') {
          throw new RequestError(400, 'capture_not_completed');
        }
        if (resource.amount?.currency_code && String(resource.amount.currency_code).toUpperCase() !== 'USD') {
          throw new RequestError(400, 'currency_mismatch');
        }
        if (resource.amount?.value !== undefined && !(Number(resource.amount.value) > 0)) {
          throw new RequestError(400, 'invalid_amount');
        }
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
