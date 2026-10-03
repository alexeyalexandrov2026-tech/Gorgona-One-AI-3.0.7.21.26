import { getServerTranslation } from '../../../lib/serverLocale';
import VenueDirectory from '../../components/g1/VenueDirectory';

export const dynamic = 'force-dynamic';

// The Restaurants category of Stores shows the dining and nightlife guide
// instead of a coupon list. This static route shadows /stores/[category].
export function generateMetadata() {
  const { t } = getServerTranslation();
  return {
    title: `${t.categories.restaurants} | GORGONA ONE`,
    description: t.categoryDescriptions.restaurants
  };
}

export default function RestaurantsSectionPage({ searchParams }) {
  const { t } = getServerTranslation();
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
