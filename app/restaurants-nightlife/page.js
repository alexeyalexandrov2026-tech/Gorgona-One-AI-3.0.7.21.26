import { getServerTranslation } from '../../lib/serverLocale';
import VenueDirectory from '../components/g1/VenueDirectory';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Restaurants and nightlife in Miami',
  description: 'Verified Miami restaurants, lounges and clubs, with ways to reserve and an AI concierge to help you pick the night.',
  path: '/restaurants-nightlife'
});

export default async function RestaurantsNightlifePage({ searchParams }) {
  searchParams = await searchParams;
  const { t } = await getServerTranslation();
  return (
    <>
      <JsonLd data={sectionJsonLd({ name: 'Restaurants and nightlife in Miami', description: metadata.description, path: '/restaurants-nightlife' })} />
      <VenueDirectory
        basePath="/restaurants-nightlife"
        searchParams={searchParams}
        t={t}
        eyebrow={t.restaurantsNightlife.pill}
        title={t.restaurantsNightlife.title}
        lede={t.restaurantsNightlife.subtitle}
      />
    </>
  );
}
