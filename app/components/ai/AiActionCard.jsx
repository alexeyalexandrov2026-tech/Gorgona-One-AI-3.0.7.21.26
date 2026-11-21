"use client";

import Link from 'next/link';
import { useLocale } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import { getDiningHandoffCopy } from '../../../lib/dining/copy.mjs';
import { PROVIDERS } from '../../../lib/dining/gateway.mjs';

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
  const t = getTranslation(useLocale());
  if (!card?.href) return null;

  return (
    <Link
      href={card.href}
      onClick={onNavigate}
      aria-label={`${card.title || card.label} — ${card.cta || t.ai.open}`}
      className="group block rounded-2xl border border-brand-gold/25 bg-gradient-to-br from-brand-gold/[0.09] to-white/[0.02] p-4 transition hover:border-brand-gold/70 hover:from-brand-gold/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {card.label && (
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-brand-gold/80">{card.label}</p>
      )}

      <p className="mt-1.5 text-sm font-semibold text-white">{card.title || card.label}</p>

      {card.summary && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{card.summary}</p>}

      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-black transition group-hover:brightness-110">
        {card.cta || t.ai.open}
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
          &rarr;
        </span>
      </span>
    </Link>
  );
}

function ListingLink({ card, onNavigate }) {
  const name = card.title || card.label;
  return (
    <Link
      href={card.href}
      onClick={onNavigate}
      aria-label={[name, card.price].filter(Boolean).join(' — ')}
      className="group flex items-center gap-3 rounded-2xl border border-brand-gold/25 bg-gradient-to-br from-brand-gold/[0.09] to-white/[0.02] p-3 transition hover:border-brand-gold/70 hover:from-brand-gold/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {card.image ? (
        <img src={card.image} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />
      ) : null}
      <span className="min-w-0 flex-1">
        {card.label ? <span className="block font-mono text-[0.58rem] uppercase tracking-[0.28em] text-brand-gold/80">{card.label}</span> : null}
        <span className="mt-1 block text-sm font-semibold text-white">{name}</span>
        {card.price ? <span className="mt-1 block text-xs text-brand-gold">{card.price}</span> : null}
      </span>
      <span aria-hidden="true" className="text-brand-gold transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
    </Link>
  );
}

// Restaurants and nightlife: the venue's own booking page (new tab) and the
// directory filter for the guest's request. The chat never books a table.
function VenueActions({ card, copy, onNavigate }) {
  if (!card.booking) return null;
  const platform = card.booking.kind === 'book' && card.booking.platform !== 'venue'
    ? PROVIDERS.find((provider) => provider.id === card.booking.platform)?.name : null;
  const label = card.booking.kind === 'maps' ? copy.openMaps : platform ? copy.bookOn.replace('{platform}', platform) : copy.bookOnSite;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs">
      <a href={card.booking.href} target="_blank" rel="noopener noreferrer" data-booking={card.booking.kind === 'book' ? card.booking.platform : 'maps'}
        className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-brand-gold px-3 font-semibold text-black hover:brightness-110">
        {label}<span aria-hidden="true">↗</span><span className="sr-only">({copy.newTab})</span>
      </a>
      {card.more ? <Link href={card.more} onClick={onNavigate} className="text-brand-gold/90 underline underline-offset-4">{copy.similar}</Link> : null}
    </div>
  );
}

/** Catalogue rows: photo, stored price, title, and the listing page. */
export function AiListingCards({ listings, onNavigate, className = '' }) {
  const copy = getDiningHandoffCopy(useLocale());
  if (!listings?.length) return null;
  return (
    <div className={`grid gap-2.5 pt-1 ${className}`}>
      {listings.map((card) => (
        <div key={card.href} className="grid gap-1.5">
          <ListingLink card={card} onNavigate={onNavigate} />
          <VenueActions card={card} copy={copy} onNavigate={onNavigate} />
        </div>
      ))}
      {listings.some((card) => card.booking) ? <p className="px-1 text-[0.7rem] leading-snug text-zinc-400">{copy.chatNote}</p> : null}
    </div>
  );
}

/** A multi-item plan: one row of real catalogue choices per section. */
export function AiPlan({ plan, onNavigate }) {
  if (!plan?.sections?.length) return null;
  return (
    <div className="grid gap-4 pt-1">
      {plan.sections.map((section) => (
        <div key={section.href}>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-brand-gold/80">{section.label}</p>
          <div className="mt-2 grid gap-2">
            {section.candidates.slice(0, 2).map((card) => (
              <ListingLink key={card.href} card={card} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </div>
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
