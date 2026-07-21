import { notFound } from 'next/navigation';
import { getVenueBySlug } from '../../../lib/restaurantsNightlifeData';
import { getServerTranslation } from '../../../lib/serverLocale';

export const dynamic = 'force-dynamic';

export default function VenueDetailPage({ params }) {
  const venue = getVenueBySlug(params.slug);

  if (!venue) {
    notFound();
  }

  const { t } = getServerTranslation();

  return (
    <main className="flex-1 py-10">
      <div className="market-shell overflow-hidden rounded-[2rem]">
        <img src={venue.image} alt={venue.name} className="h-72 w-full object-cover" />
        <div className="p-8">
          <p className="market-pill">{venue.category === 'restaurant' ? t.restaurantsNightlife.restaurants : t.restaurantsNightlife.nightlife}</p>
          <h1 className="market-title mt-4">{venue.name}</h1>
          <p className="market-subtitle">{venue.description}</p>
          <div className="mt-8 market-card rounded-[1.5rem] p-6">
            <div className="grid gap-4 text-sm text-zinc-300 sm:grid-cols-2">
              <div><p className="text-zinc-500">{t.restaurantsNightlife.location}</p><p className="mt-1 text-white">{venue.location}</p></div>
              <div><p className="text-zinc-500">{t.restaurantsNightlife.rating}</p><p className="mt-1 text-brand-gold">★ {venue.rating}</p></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
