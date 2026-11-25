"use client";

import { useLocale } from './LocaleProvider';
import { getPaymentTrustCopy } from '../../lib/paymentTrustCopy.mjs';

const BRAND = Object.freeze({
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'AMEX',
  applePay: 'Pay',
  googlePay: 'Pay',
  paypalA: 'Pay',
  paypalB: 'Pal',
  stripe: 'stripe'
});

function ShieldIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2.5 4.5 5.5v5.8c0 5.1 3.2 8.9 7.5 10.2 4.3-1.3 7.5-5.1 7.5-10.2V5.5L12 2.5Z" />
      <path d="m9 12.2 2 2 4.2-4.2" />
    </svg>
  );
}

function LockIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

function AppleLogo({ className }) {
  return (
    <svg viewBox="0 0 16 18" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.9 9.5c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2.1 2.5 2 .9 0 1.4-.6 2.6-.6 1.2 0 1.6.6 2.6.6 1.1 0 1.8-1 2.4-2 .8-1.1 1.1-2.2 1.1-2.3 0-.1-2.1-.8-2.1-3ZM10.9 3.6c.5-.7.9-1.6.8-2.6-.8 0-1.8.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.8-.4 2.3-1Z" />
    </svg>
  );
}

function GoogleGLogo({ mono = false, className }) {
  if (mono) {
    return (
      <svg viewBox="0 0 18 18" fill="currentColor" className={className} aria-hidden="true">
        <path d="M16.5 9.2c0-.6-.1-1.1-.2-1.6H9v3.1h4.2c-.2 1-.7 1.8-1.6 2.4v2h2.5c1.5-1.4 2.4-3.4 2.4-5.9Z" />
        <path d="M9 17c2.1 0 3.9-.7 5.2-1.9l-2.5-2c-.7.5-1.6.8-2.7.8-2.1 0-3.8-1.4-4.5-3.3H1.9v2.1C3.2 15.3 5.9 17 9 17Z" />
        <path d="M4.5 10.6c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6V5.3H1.9C1.3 6.4 1 7.7 1 9s.3 2.6.9 3.7l2.6-2.1Z" />
        <path d="M9 4.1c1.2 0 2.2.4 3 1.2l2.3-2.3C12.9 1.7 11.1 1 9 1 5.9 1 3.2 2.7 1.9 5.3l2.6 2.1C5.2 5.5 6.9 4.1 9 4.1Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M16.5 9.2c0-.6-.1-1.1-.2-1.6H9v3.1h4.2c-.2 1-.7 1.8-1.6 2.4v2h2.5c1.5-1.4 2.4-3.4 2.4-5.9Z" />
      <path fill="#34A853" d="M9 17c2.1 0 3.9-.7 5.2-1.9l-2.5-2c-.7.5-1.6.8-2.7.8-2.1 0-3.8-1.4-4.5-3.3H1.9v2.1C3.2 15.3 5.9 17 9 17Z" />
      <path fill="#FBBC05" d="M4.5 10.6c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6V5.3H1.9C1.3 6.4 1 7.7 1 9s.3 2.6.9 3.7l2.6-2.1Z" />
      <path fill="#EA4335" d="M9 4.1c1.2 0 2.2.4 3 1.2l2.3-2.3C12.9 1.7 11.1 1 9 1 5.9 1 3.2 2.7 1.9 5.3l2.6 2.1C5.2 5.5 6.9 4.1 9 4.1Z" />
    </svg>
  );
}

function PayPalMark({ mono = false, className }) {
  return (
    <svg viewBox="0 0 16 18" className={className} aria-hidden="true">
      <path
        fill={mono ? 'currentColor' : '#003087'}
        d="M5.7 1.8h4.9c2.4 0 3.7 1.2 3.3 3.5-.4 2.6-2.2 4-4.8 4H7.5l-.8 5H3.9l1.8-12.5Z"
      />
      <path
        fill={mono ? 'currentColor' : '#0079C1'}
        opacity={mono ? '0.68' : '1'}
        d="M7.6 5.2h4.1c1.9 0 3 1 2.7 2.9-.3 2.1-1.8 3.3-3.9 3.3H9.1l-.7 4.4H6.1l1.5-10.6Z"
      />
    </svg>
  );
}

function MastercardCircles({ mono = false, className }) {
  return (
    <svg viewBox="0 0 30 18" className={className} aria-hidden="true">
      <circle cx="11" cy="9" r="7" fill={mono ? '#e2e8f0' : '#EB001B'} opacity={mono ? '0.65' : '1'} />
      <circle cx="19" cy="9" r="7" fill={mono ? '#ffffff' : '#F79E1B'} opacity={mono ? '0.88' : '0.92'} />
    </svg>
  );
}

function MonochromeBadges({ poweredBy }) {
  const pill =
    'inline-flex h-8 items-center justify-center rounded-lg border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-3 text-[#eef3f4] shadow-[inset_0_1px_0_rgba(212,175,55,0.22)] backdrop-blur-sm';

  return (
    <div dir="ltr" className="flex flex-wrap items-center gap-2">
      <span className={pill} aria-label={BRAND.visa}>
        <span className="font-sans text-[0.78rem] font-extrabold tracking-[0.06em]">{BRAND.visa}</span>
      </span>
      <span className={pill} aria-label={BRAND.mastercard}>
        <MastercardCircles mono className="h-4 w-7" />
      </span>
      <span className={pill} aria-label={BRAND.amex}>
        <span className="font-sans text-[0.68rem] font-extrabold tracking-[0.08em]">{BRAND.amex}</span>
      </span>
      <span className={`${pill} gap-1`} aria-label={`Apple ${BRAND.applePay}`}>
        <AppleLogo className="h-3.5 w-3.5" />
        <span className="font-sans text-[0.74rem] font-semibold tracking-tight">{BRAND.applePay}</span>
      </span>
      <span className={`${pill} gap-1`} aria-label={`Google ${BRAND.googlePay}`}>
        <GoogleGLogo mono className="h-3.5 w-3.5" />
        <span className="font-sans text-[0.74rem] font-semibold tracking-tight">{BRAND.googlePay}</span>
      </span>
      <span className={`${pill} gap-1`} aria-label={`${BRAND.paypalA}${BRAND.paypalB}`}>
        <PayPalMark mono className="h-3.5 w-3.5" />
        <span className="font-sans text-[0.74rem] font-bold tracking-tight">
          {BRAND.paypalA}
          <span className="opacity-75">{BRAND.paypalB}</span>
        </span>
      </span>
      <span className={`${pill} gap-1.5 px-3.5`} aria-label={`${poweredBy} Stripe`}>
        <span className="font-sans text-[0.62rem] font-medium text-white/65">{poweredBy}</span>
        <span className="font-sans text-[0.82rem] font-extrabold tracking-[-0.03em] text-white">{BRAND.stripe}</span>
      </span>
    </div>
  );
}

function OfficialColorBadges({ compact = false, poweredBy }) {
  const h = compact ? 'h-7 px-2' : 'h-8 px-2.5';
  const base = `inline-flex ${h} items-center justify-center rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.22)]`;

  return (
    <div dir="ltr" className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {/* Stripe */}
      <span className={`${base} gap-1 bg-[#635BFF] text-white`} aria-label={`${poweredBy} Stripe`}>
        {!compact && (
          <span className="font-sans text-[0.55rem] font-medium leading-none text-white/80">{poweredBy}</span>
        )}
        <span className={`font-sans ${compact ? 'text-[0.74rem]' : 'text-[0.8rem]'} font-extrabold tracking-[-0.03em]`}>
          {BRAND.stripe}
        </span>
      </span>

      {/* PayPal */}
      <span className={`${base} gap-1 border border-black/10 bg-white`} aria-label={`${BRAND.paypalA}${BRAND.paypalB}`}>
        <PayPalMark className="h-3.5 w-3" />
        <span className={`font-sans ${compact ? 'text-[0.7rem]' : 'text-[0.76rem]'} font-extrabold tracking-tight text-[#003087]`}>
          {BRAND.paypalA}
          <span className="text-[#0079C1]">{BRAND.paypalB}</span>
        </span>
      </span>

      {/* Apple Pay */}
      <span className={`${base} gap-0.5 border border-white/20 bg-black text-white`} aria-label={`Apple ${BRAND.applePay}`}>
        <AppleLogo className="h-3 w-3" />
        <span className={`font-sans ${compact ? 'text-[0.7rem]' : 'text-[0.74rem]'} font-semibold tracking-tight`}>
          {BRAND.applePay}
        </span>
      </span>

      {/* Google Pay */}
      <span className={`${base} gap-1 border border-black/10 bg-white text-[#3c4043]`} aria-label={`Google ${BRAND.googlePay}`}>
        <GoogleGLogo className="h-3 w-3" />
        <span className={`font-sans ${compact ? 'text-[0.7rem]' : 'text-[0.74rem]'} font-semibold tracking-tight`}>
          {BRAND.googlePay}
        </span>
      </span>

      {/* VISA */}
      <span className={`${base} border border-black/10 bg-white text-[#1A1F71]`} aria-label={BRAND.visa}>
        <span className={`font-sans ${compact ? 'text-[0.72rem]' : 'text-[0.78rem]'} font-black tracking-[0.06em]`}>
          {BRAND.visa}
        </span>
      </span>

      {/* Mastercard */}
      <span className={`${base} border border-white/15 bg-[#141923]`} aria-label={BRAND.mastercard}>
        <MastercardCircles className="h-4 w-7" />
      </span>

      {/* AMEX */}
      <span className={`${base} bg-[#006FCF] text-white`} aria-label={BRAND.amex}>
        <span className={`font-sans ${compact ? 'text-[0.64rem]' : 'text-[0.68rem]'} font-extrabold tracking-[0.06em]`}>
          {BRAND.amex}
        </span>
      </span>
    </div>
  );
}

/**
 * Hybrid Payment Trust Architecture:
 * - variant="footer"   : Quiet Luxury Monochrome Glass + Gold SSL/3DS2 Shield (Global Footer)
 * - variant="booking"  : Compact Official Brand Colors + Lock line directly under Booking CTA
 * - variant="checkout" : Emerald-framed Official Brand Colors + SSL/3DS2 header on /pay/[token]
 */
export default function PaymentTrustStrip({ variant = 'footer', locale: localeProp, className = '' }) {
  const ctxLocale = useLocale();
  const locale = localeProp || ctxLocale || 'en';
  const copy = getPaymentTrustCopy(locale);

  if (variant === 'booking') {
    return (
      <div
        data-payment-trust="booking"
        aria-label={copy.acceptedTitle}
        className={`grid gap-2.5 rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 ${className}`}
      >
        <div className="flex items-center gap-2 text-[0.74rem] leading-snug text-g1-soft">
          <LockIcon className="h-3.5 w-3.5 shrink-0 text-[#4cc9a6]" />
          <span>{copy.bookingLine}</span>
        </div>
        <OfficialColorBadges compact poweredBy={copy.poweredBy} />
      </div>
    );
  }

  if (variant === 'checkout') {
    return (
      <div
        data-payment-trust="checkout"
        aria-label={copy.acceptedTitle}
        className={`grid gap-3 rounded-2xl border border-[#4cc9a6]/35 bg-[#062028]/70 px-4 py-3.5 backdrop-blur-sm ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#edf2f3]">
            <ShieldIcon className="h-4 w-4 shrink-0 text-[#4cc9a6]" />
            <span>{copy.checkoutShield}</span>
          </span>
          <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.16em] text-[#9aaab2]">
            {copy.acceptedTitle}
          </span>
        </div>
        <OfficialColorBadges poweredBy={copy.poweredBy} />
      </div>
    );
  }

  // Default: variant="footer" — Variant A Quiet Luxury Monochrome Glass + Champagne-Gold SSL Shield
  return (
    <div
      data-payment-trust="footer"
      aria-label={copy.acceptedTitle}
      className={`mt-12 flex flex-col gap-4 border-t border-g1-rule/80 pt-7 lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <span className="font-g1mono text-[0.64rem] uppercase tracking-[0.22em] text-g1-soft">
          {copy.acceptedTitle}
        </span>
        <MonochromeBadges poweredBy={copy.poweredBy} />
      </div>
      <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#d4af37]/45 bg-gradient-to-r from-[#d4af37]/18 to-[#d4af37]/8 px-3 py-1.5 text-[0.72rem] font-semibold tracking-tight text-[#f0d37a]">
        <ShieldIcon className="h-4 w-4 shrink-0 text-[#d4af37]" />
        <span>{copy.sslBadge}</span>
      </div>
    </div>
  );
}
