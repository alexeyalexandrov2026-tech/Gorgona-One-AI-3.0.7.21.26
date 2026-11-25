import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PAYMENT_TRUST_COPY, getPaymentTrustCopy } from '../../lib/paymentTrustCopy.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const ALL_LOCALES = ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];

test('Hybrid Payment Trust Architecture: all 16 locales complete and safe', () => {
  for (const loc of ALL_LOCALES) {
    const entry = PAYMENT_TRUST_COPY[loc];
    assert.ok(entry, `Missing locale ${loc} in PAYMENT_TRUST_COPY`);
    assert.ok(entry.acceptedTitle.length >= 6);
    assert.ok(entry.sslBadge.includes('SSL'));
    assert.ok(entry.checkoutShield.includes('SSL'));
    assert.ok(entry.bookingLine.includes('Stripe') && entry.bookingLine.includes('PayPal'));
    assert.equal(getPaymentTrustCopy(loc).acceptedTitle, entry.acceptedTitle);
  }
  assert.equal(getPaymentTrustCopy('unknown').acceptedTitle, PAYMENT_TRUST_COPY.en.acceptedTitle);
});

test('Hybrid Payment Trust Architecture: wired across Footer, Booking CTA, Private Jets, Trip Room & Checkout without touching /yachts or /travel', () => {
  const strip = read('app/components/PaymentTrustStrip.jsx');
  assert.match(strip, /data-payment-trust="footer"/);
  assert.match(strip, /data-payment-trust="booking"/);
  assert.match(strip, /data-payment-trust="checkout"/);
  assert.doesNotMatch(strip, /\bBTC\b|\bUSDC\b|\bUSDT\b|\bSolana\b/i, 'Only live active payment rails should be shown');

  assert.match(read('app/components/Footer.jsx'), /<PaymentTrustStrip\s+variant="footer"/);
  assert.match(read('app/components/BookingForm.jsx'), /<PaymentTrustStrip\s+variant="booking"/);
  assert.match(read('app/private-jets/PrivateJetsContent.jsx'), /<PaymentTrustStrip\s+variant="booking"/);
  assert.match(read('app/trip/page.js'), /<PaymentTrustStrip\s+variant="booking"/);
  assert.match(read('app/pay/[token]/PayCheckoutClient.jsx'), /<PaymentTrustStrip\s+variant="checkout"/);
});
