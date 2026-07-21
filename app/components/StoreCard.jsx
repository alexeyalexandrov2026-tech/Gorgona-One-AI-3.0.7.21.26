import Link from 'next/link';
import { BrandImage } from './BrandImage';
import { getDealDescription } from '../../lib/dealsData';

function camelizeSlug(slug) {
  return slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Stores-only card - same fields/behavior as DealCard (which stays exactly
// as-is for Coupons). Laid out as a left logo panel + right content column
// per the approved reference: a large, full-height brand panel on the left
// so logos read bigger without being cropped, category pill pinned to the
// card's top-right corner, and the same content stack (name, description,
// promo box, discount/expiration row, buttons) that DealCard already used.
export function StoreCard({ deal, t }) {
  return (
    <article className="market-card relative flex overflow-hidden rounded-[1.75rem]">
      <span className="absolute right-4 top-4 z-10 rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-black/80">{t.categories[camelizeSlug(deal.category)] || deal.category}</span>

      <div className="flex w-40 shrink-0 items-center justify-center bg-black/40 p-5 sm:w-48">
        <BrandImage src={deal.logo} alt={deal.name} className="max-h-24 w-full object-contain" />
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <h2 className="pr-24 text-xl font-semibold text-white">{deal.name}</h2>
          {deal.city && (
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{deal.city}, {deal.state}</p>
          )}
          <p className="mt-3 text-sm text-zinc-400">{getDealDescription(deal, t)}</p>

          {typeof deal.rating === 'number' && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm">
              <span className="text-brand-gold">
                {t.kosher.rating}: {deal.rating.toFixed(1)} ★ <span className="text-zinc-500">({deal.reviewCount} {t.kosher.reviews})</span>
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.mapQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-300 underline-offset-2 hover:text-brand-gold hover:underline"
              >
                {t.kosher.viewOnMap}
              </a>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t.kosher.promoCode}</p>
            <p className="mt-2 text-sm font-semibold text-white">{deal.promoCode || t.category.noCodeNeeded}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
            <span>{deal.discount}</span>
            <span className="inline-flex items-center gap-1.5">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
              </svg>
              {t.category.ends} {deal.expirationDate}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={deal.affiliateLink} className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-4 py-2 text-sm font-medium text-black transition hover:brightness-110">
            {t.buttons.getDeal}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link href={deal.website} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-gold hover:text-brand-gold">{t.buttons.visitStore}</Link>
        </div>
      </div>
    </article>
  );
}
