import Link from 'next/link';
import { VENUE_CATEGORIES, getVenuesByCategory } from '../../../lib/restaurantsNightlifeData';
import { VenueCard } from '../VenueCard';
import { chipClass, eyebrowClass, sectionY } from './ui';

// The dining and nightlife guide, filtered by ?category=. It is shown at
// /restaurants-nightlife and as the Restaurants category of Stores.
export default function VenueDirectory({ basePath, searchParams, t, eyebrow, title, lede }) {
  const active = ['restaurant', 'nightlife'].includes(searchParams?.category) ? searchParams.category : 'all';
  const venues = getVenuesByCategory(active);
  const filters = [['all', t.restaurantsNightlife.all], ...VENUE_CATEGORIES.map((c) => [c.slug, c.slug === 'restaurant' ? t.restaurantsNightlife.restaurants : t.restaurantsNightlife.nightlife])];

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <header className="grid gap-4 pb-8 pt-[clamp(24px,4vw,56px)]">
        <p className={eyebrowClass}>{eyebrow}</p>
        <h1 className="g1-display font-g1display text-[clamp(2.1rem,3vw+1rem,4rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [text-wrap:balance]">{title}</h1>
        <p className="max-w-[60ch] text-[1.08rem] text-g1-soft">{lede}</p>
        <nav aria-label={eyebrow} className="flex flex-wrap gap-2">
          {filters.map(([slug, label]) => (
            <Link
              key={slug}
              href={slug === 'all' ? basePath : `${basePath}?category=${slug}`}
              scroll={false}
              aria-current={slug === active ? 'page' : undefined}
              className={chipClass}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <section className={`border-t border-g1-rule ${sectionY}`}>
        <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => <VenueCard key={venue.id} venue={venue} t={t} />)}
        </div>
      </section>
    </main>
  );
}
