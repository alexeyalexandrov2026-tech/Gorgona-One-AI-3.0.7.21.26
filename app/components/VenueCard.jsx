import Link from 'next/link';

// Shared dining & nightlife venue card. Extracted verbatim from the original
// Travel -> Dining & Nightlife page so the main Restaurants section
// (/stores/restaurants) and the Restaurants & Nightlife guide
// (/restaurants-nightlife) render identically and can never drift apart.
export function VenueCard({ venue, t }) {
  return (
    <article className="market-card overflow-hidden rounded-[1.5rem]">
      <img src={venue.image} alt={venue.name} className="h-48 w-full object-cover" />
      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-brand-gold">
              {venue.category === 'restaurant' ? t.restaurantsNightlife.restaurants : t.restaurantsNightlife.nightlife}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">{venue.name}</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">★ {venue.rating}</span>
        </div>
        <p className="mt-4 text-sm text-zinc-400">{venue.description}</p>
        <div className="mt-5 flex items-center justify-between text-sm text-zinc-300">
          <span>{t.restaurantsNightlife.location}</span>
          <span className="text-white">{venue.location}</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/restaurants-nightlife/${venue.slug}`} className="market-button">{t.common.viewDetails}</Link>
        </div>
      </div>
    </article>
  );
}
