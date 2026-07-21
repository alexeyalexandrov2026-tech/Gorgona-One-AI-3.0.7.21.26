import Link from 'next/link';
import { VENUE_CATEGORIES, getVenuesByCategory } from '../../lib/restaurantsNightlifeData';
import { getServerTranslation } from '../../lib/serverLocale';
import { VenueCard } from '../components/VenueCard';

export const dynamic = 'force-dynamic';

export default function RestaurantsNightlifePage({ searchParams }) {
  const activeCategory = searchParams?.category === 'restaurant' || searchParams?.category === 'nightlife' ? searchParams.category : 'all';
  const venues = getVenuesByCategory(activeCategory);
  const { t } = getServerTranslation();

  return (
    <main className="flex-1 py-10">
      <div className="market-shell mb-8 rounded-[2rem] p-8">
        <p className="market-pill">{t.restaurantsNightlife.pill}</p>
        <h1 className="market-title mt-4">{t.restaurantsNightlife.title}</h1>
        <p className="market-subtitle">{t.restaurantsNightlife.subtitle}</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/restaurants-nightlife" className={`rounded-full border px-4 py-2 text-sm transition ${activeCategory === 'all' ? 'border-brand-gold bg-brand-gold text-black' : 'border-white/10 bg-white/5 text-zinc-300 hover:border-brand-gold hover:text-brand-gold'}`}>
          {t.restaurantsNightlife.all}
        </Link>
        {VENUE_CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/restaurants-nightlife?category=${category.slug}`}
            className={`rounded-full border px-4 py-2 text-sm transition ${activeCategory === category.slug ? 'border-brand-gold bg-brand-gold text-black' : 'border-white/10 bg-white/5 text-zinc-300 hover:border-brand-gold hover:text-brand-gold'}`}
          >
            {category.slug === 'restaurant' ? t.restaurantsNightlife.restaurants : t.restaurantsNightlife.nightlife}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {venues.map((venue) => (
          <VenueCard key={venue.id} venue={venue} t={t} />
        ))}
      </div>
    </main>
  );
}
