"use client";

import Link from 'next/link';

// ===========================================================================
// Navigation frame rendered under a concierge reply.
//
// The whole card is a single next/link, so a click anywhere on it - not just
// on the CTA - is a CLIENT-SIDE navigation: no reload, no lost conversation
// (the thread lives in ChatProvider, mounted above the router in the layout,
// so it survives the move).
//
// One <Link> wrapping everything, rather than a card with a nested link, is
// deliberate: it keeps the whole surface a single tab stop and one
// accessible name, and avoids the invalid-nesting trap of an anchor inside
// an anchor. The CTA is therefore styled as a span, not a button.
//
// Palette and radii are the dock's existing tokens (brand-gold on white/5),
// so the frames read as part of the concierge rather than a new component.
// ===========================================================================

export function AiActionCard({ card, onNavigate }) {
  if (!card?.href) return null;

  return (
    <Link
      href={card.href}
      onClick={onNavigate}
      aria-label={`${card.title || card.label} — ${card.cta || 'Open'}`}
      className="group block rounded-2xl border border-brand-gold/25 bg-gradient-to-br from-brand-gold/[0.09] to-white/[0.02] p-4 transition hover:border-brand-gold/70 hover:from-brand-gold/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {card.label && (
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-brand-gold/80">{card.label}</p>
      )}

      <p className="mt-1.5 text-sm font-semibold text-white">{card.title || card.label}</p>

      {card.summary && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{card.summary}</p>}

      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-black transition group-hover:brightness-110">
        {card.cta || 'Open'}
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
          &rarr;
        </span>
      </span>
    </Link>
  );
}

/** The frames under one reply. Renders nothing when there is no match. */
export function AiActionCards({ cards, onNavigate, className = '' }) {
  if (!cards?.length) return null;

  return (
    <div className={`grid gap-2.5 pt-1 ${className}`}>
      {cards.map((card) => (
        <AiActionCard key={card.href} card={card} onNavigate={onNavigate} />
      ))}
    </div>
  );
}
