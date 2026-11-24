import AskButton from './AskButton';
import { getUsTrustCopy } from '../../../lib/usTrustCopy.mjs';

const PAY_BADGES = ['Apple Pay', 'Google Pay', 'Stripe Link', 'PayPal'];

// Compact US luxury trust strip (ELIO+ Shield, Express Checkout methods, live SLA,
// and an optional one-tap ELIO+ Guide itinerary CTA). Server-compatible, zero extra JS.
export default function UsTrustStrip({ locale = 'en', mode = 'cars', compact = false }) {
  const copy = getUsTrustCopy(locale);
  const ctaLabel = mode === 'dining' ? copy.planDiningCta : copy.planCarCta;
  const ctaPrompt = mode === 'dining' ? copy.planDiningPrompt : copy.planCarPrompt;

  if (compact) {
    return (
      <div className="grid gap-2.5 rounded-2xl border border-white/15 bg-[#0a1922]/65 p-4 backdrop-blur-md">
        <div className="flex items-start gap-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="mt-0.5 h-4 w-4 shrink-0 text-[#4cc9a6]" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <div className="min-w-0">
            <p className="font-g1mono text-[0.64rem] uppercase tracking-[0.16em] text-[#4cc9a6]">{copy.shieldTitle}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-g1-soft">{copy.shieldSub}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2.5 font-g1mono text-[0.62rem] uppercase tracking-[0.12em] text-g1-ink">
          {PAY_BADGES.map((badge) => (
            <span key={badge} className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5">{badge}</span>
          ))}
          <span className="ml-auto text-g1-soft">{copy.slaSub}</span>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label={copy.shieldTitle}
      className="mb-6 grid gap-4 rounded-[22px] border border-white/15 bg-[#0a1922]/60 p-4 backdrop-blur-xl sm:p-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center"
    >
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="mt-0.5 h-5 w-5 shrink-0 text-[#4cc9a6]" aria-hidden="true">
          <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <div className="min-w-0">
          <p className="font-g1mono text-[0.65rem] uppercase tracking-[0.18em] text-[#4cc9a6]">{copy.shieldTitle}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-g1-soft">{copy.shieldSub}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 border-t border-white/10 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
        <div className="min-w-0">
          <p className="font-g1mono text-[0.65rem] uppercase tracking-[0.18em] text-[#d4af37]">{copy.payTitle}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-g1-soft">{copy.paySub}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 border-t border-white/10 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="mt-0.5 h-5 w-5 shrink-0 text-g1-accent" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <div className="min-w-0">
          <p className="font-g1mono text-[0.65rem] uppercase tracking-[0.18em] text-g1-ink">{copy.slaTitle}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-g1-soft">{copy.slaSub}</p>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3 lg:border-t-0 lg:pt-0">
        <AskButton
          variant="ink"
          className="w-full justify-center whitespace-nowrap px-4 py-2.5 text-xs font-semibold lg:w-auto"
          prompt={ctaPrompt}
        >
          {ctaLabel}
        </AskButton>
      </div>
    </section>
  );
}
