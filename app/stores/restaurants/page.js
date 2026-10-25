import { getServerTranslation } from '../../../lib/serverLocale';
import VenueDirectory from '../../components/g1/VenueDirectory';

export const dynamic = 'force-dynamic';

// The Restaurants category of Stores shows the dining and nightlife guide
// instead of a coupon list. This static route shadows /stores/[category].
export async function generateMetadata() {
  const { t } = await getServerTranslation();
  return {
    title: `${t.categories.restaurants} | MIAMI ELIO`,
    description: t.categoryDescriptions.restaurants
  };
}

export default async function RestaurantsSectionPage({ searchParams }) {
  searchParams = await searchParams;
  const { t } = await getServerTranslation();
  return (
    <VenueDirectory
      basePath="/stores/restaurants"
      searchParams={searchParams}
      t={t}
      eyebrow={t.categories.restaurants}
      title={t.restaurantsNightlife.title}
      lede={t.categoryDescriptions.restaurants}
    />
  );
}
