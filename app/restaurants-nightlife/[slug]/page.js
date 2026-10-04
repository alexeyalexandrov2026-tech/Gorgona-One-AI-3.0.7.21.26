import { notFound } from 'next/navigation';
import { getVenueBySlug } from '../../../lib/restaurantsNightlifeData';
import { getServerTranslation } from '../../../lib/serverLocale';
import { getDealsCopy } from '../../../lib/dealsCopy';
import { fill } from '../../../lib/homeCopy';
import { largeImage } from '../../../lib/worldsCopy';
import AskButton from '../../components/g1/AskButton';
import { Crumbs, Specs, eyebrowClass } from '../../components/g1/ui';

export const dynamic = 'force-dynamic';

// A venue page. Tables are requested through the concierge, who confirms
// the date, time and minimum spend with the guest.
export default function VenueDetailPage({ params }) {
  const venue = getVenueBySlug(params.slug);
  if (!venue) notFound();

  const { t, locale } = getServerTranslation();
  const copy = getDealsCopy(locale);
  const kind = venue.category === 'restaurant' ? t.restaurantsNightlife.restaurants : t.restaurantsNightlife.nightlife;

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <Crumbs items={[[t.restaurantsNightlife.pill, '/restaurants-nightlife'], [venue.name]]} />

      <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <figure className="aspect-[3/2] overflow-hidden rounded-[26px] bg-g1-rule">
          <img src={largeImage(venue.image)} alt={venue.name} width="1600" height="1067" fetchPriority="high" className="h-full w-full object-cover" />
        </figure>
        <div className="grid min-w-0 gap-5">
          <p className={eyebrowClass}>{kind}</p>
          <h1 className="font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] text-g1-ink [text-wrap:balance]">{venue.name}</h1>
          <p className="text-[1.05rem] text-g1-soft">{venue.description}</p>
          <Specs items={[[t.restaurantsNightlife.location, venue.location], [t.category.categoryLabel, kind]]} />
          <AskButton prompt={fill(copy.tablePrompt, { name: venue.name })} className="w-fit">{copy.requestTable}</AskButton>
        </div>
      </div>
    </main>
  );
}
