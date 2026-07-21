import { BrandImage } from './BrandImage';
import { getDealDescription } from '../../lib/dealsData';

function camelizeSlug(slug) {
  return slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Shopping-zine card (entire studios reference): a white plate on the bone
// canvas with zero radius, no border, no shadow. Space Mono carries every
// word; the promo code row is a strip of black chrome. Same deal fields and
// behavior as StoreCard — which stays untouched for the category pages.
export function ZineStoreCard({ deal, t }) {
  return (
    <article className="flex h-full flex-col bg-white font-mono text-black">
      <div className="relative flex h-36 items-center justify-center px-6">
        <BrandImage src={deal.logo} alt={deal.name} className="max-h-20 w-full max-w-[11rem] object-contain" />
        <span className="absolute right-3 top-3 border border-black px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.15em]">
          {t.categories[camelizeSlug(deal.category)] || deal.category}
        </span>
      </div>

      <div className="h-px bg-black/15" />

      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-base uppercase tracking-[0.02em]">{deal.name}</h2>
        {deal.city && (
          <p className="mt-1 text-[0.66rem] uppercase tracking-[0.15em] text-black/50">
            {deal.city}, {deal.state}
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-black/70">{getDealDescription(deal, t)}</p>

        <div className="mt-4 flex items-center justify-between bg-black px-3 py-2.5 text-white">
          <span className="text-[0.62rem] uppercase tracking-[0.2em] text-white/60">{t.kosher.promoCode}</span>
          <span className="text-xs uppercase tracking-[0.05em]">{deal.promoCode || t.category.noCodeNeeded}</span>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3 text-[0.66rem] uppercase tracking-[0.08em] text-black/60">
          <span>{deal.discount}</span>
          <span className="whitespace-nowrap">{t.category.ends} {deal.expirationDate}</span>
        </div>

        <div className="mt-auto flex items-center gap-4 pt-5">
          <a
            href={deal.affiliateLink}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="bg-black px-5 py-2.5 text-[0.68rem] uppercase tracking-[0.15em] text-white transition-colors hover:bg-black/80"
          >
            {t.buttons.getDeal}
          </a>
          <a
            href={deal.website}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-black pb-0.5 text-[0.68rem] uppercase tracking-[0.15em] transition-opacity hover:opacity-60"
          >
            {t.buttons.visitStore}
          </a>
        </div>
      </div>
    </article>
  );
}
