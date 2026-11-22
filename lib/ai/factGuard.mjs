// ===========================================================================
// Zero-Hallucination Fact Guard for Controlled Grounded NLG (version: 3).
//
// Verifies every model-authored reply before it can reach the guest:
// - strips stray markdown markers (chat UI renders plain whitespace-pre-wrap)
// - blocks unverified URLs, emails, and phone numbers
// - blocks any claim that a reservation or card charge was completed
// - enforces zero invented prices: every currency amount must appear in the
//   verified catalog Fact Pack or the guest's own messages
// - verifies target script compliance for non-Latin locales
// - fails closed so groundedReply falls back cleanly to deterministic copy
// ===========================================================================

import { normalizeLocale } from './locale.js';

const FORBIDDEN_URL_OR_CONTACT = /(?:https?:\/\/|www\.|\[[^\]]+\]\([^)]+\)|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{8,}\d|(?:^|[\s(«"'「])\/(?:admin|stores|coupons|discovery|api|yachts|rentals|events|travel|experiences|private-jets|restaurants-nightlife|vacation-rentals)\b)/i;

const FORBIDDEN_BOOKING_CLAIM = new RegExp([
  // English
  String.raw`\b(?:i(?:'ve| have)?\s+(?:booked|reserved|confirmed|charged|paid|scheduled|held)|your\s+(?:booking|reservation|table|charter|flight|ticket)\s+(?:is|has\s+been)\s+(?:confirmed|booked|reserved|paid)|payment\s+(?:confirmed|processed|complete)|charged\s+your\s+card)\b`,
  // Russian / Ukrainian
  String.raw`(?:я\s+(?:уже\s+)?(?:забронировал\p{L}*|оформил\p{L}*|подтвердил\p{L}*|оплатил\p{L}*|списал\p{L}*)|(?:бронь|бронирование|столик|чартер|оплата)\s+(?:подтвержден\p{L}*|оформлен\p{L}*|выполнен\p{L}*)|списал\p{L}*\s+с\s+(?:вашей\s+)?карт)`,
  // Spanish / French / German / Italian / Portuguese
  String.raw`\b(?:he\s+reservado|reserva\s+confirmada|j'ai\s+réservé|réservation\s+confirmée|ich\s+habe\s+gebucht|buchung\s+bestätigt|ho\s+prenotato|prenotazione\s+confermata|reservei|reserva\s+confirmada)\b`
].join('|'), 'iu');

const FORBIDDEN_LEAKAGE = /(?:"version"\s*:|CONVERSATION_PROTOCOL|Grounded facts|Indexed catalogue|\/no_think|<think>|<\/think>|^\s*assistant\s*:)/i;

// Matches explicit currency figures like "$400", "$1,300/day", "USD 500", "500 USD", "€450"
const CURRENCY_AMOUNT = /(?:[$€£]\s*(\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.\d{1,2})?|(\d{1,3}(?:,\d{3})+|\d{1,6})\s*(?:usd|eur|gbp|dollars?|доллар\p{L}*|баксов))/giu;

const SCRIPT_REQUIREMENTS = Object.freeze({
  ru: /[\u0400-\u04ff]/,
  uk: /[\u0400-\u04ff]/,
  ar: /[\u0600-\u06ff]/,
  fa: /[\u0600-\u06ff]/,
  he: /[\u0590-\u05ff]/,
  zh: /[\u4e00-\u9fff]/,
  ja: /[\u3040-\u30ff\u4e00-\u9fff]/,
  ko: /[\uac00-\ud7af]/
});

/** Normalize plain-text formatting for whitespace-pre-wrap chat bubbles. */
export function sanitizeGroundedReply(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n/g, '\n')
    // Strip markdown bold/italic wrappers while preserving the inner text
    .replace(/\*\*([^*\n]{1,180})\*\*/g, '$1')
    .replace(/__([^_\n]{1,180})__/g, '$1')
    // Strip markdown heading prefixes
    .replace(/^[ \t]*#{1,4}[ \t]+/gm, '')
    // Normalize markdown asterisk/dash bullets to clean dot bullets
    .replace(/^[ \t]*\*[ \t]+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Verify that a model-authored concierge reply obeys zero-hallucination,
 * no-fake-booking, price-grounding, and target-language rules.
 */
export function validateGroundedReplyText(rawText, { locale = 'en', allowedPrices = null } = {}) {
  const text = sanitizeGroundedReply(rawText);
  if (text.length < 24 || text.length > 1400) {
    return { ok: false, reason: 'length' };
  }
  if (FORBIDDEN_URL_OR_CONTACT.test(text)) {
    return { ok: false, reason: 'url_or_contact' };
  }
  if (FORBIDDEN_BOOKING_CLAIM.test(text)) {
    return { ok: false, reason: 'booking_claim' };
  }
  if (FORBIDDEN_LEAKAGE.test(text)) {
    return { ok: false, reason: 'prompt_leak' };
  }

  // Zero invented prices: every quoted monetary figure must be grounded in the
  // verified catalog Fact Pack or explicitly stated by the guest.
  const priceMatches = [...text.matchAll(CURRENCY_AMOUNT)];
  if (priceMatches.length) {
    const allowed = allowedPrices instanceof Set ? allowedPrices : new Set();
    for (const match of priceMatches) {
      const rawNum = match[1] || match[2];
      const value = Math.round(Number(String(rawNum).replace(/,/g, '')));
      if (!Number.isFinite(value) || !allowed.has(value)) {
        return { ok: false, reason: 'unverified_price' };
      }
    }
  }

  // Ensure non-Latin locales actually reply in their own script (never fall back to English).
  const code = normalizeLocale(locale);
  const scriptRe = SCRIPT_REQUIREMENTS[code];
  if (scriptRe && !scriptRe.test(text)) {
    return { ok: false, reason: 'wrong_script' };
  }

  return { ok: true, text };
}
