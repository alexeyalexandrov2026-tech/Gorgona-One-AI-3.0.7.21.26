import { getServerTranslation } from '../../lib/serverLocale';
import VenueDirectory from '../components/g1/VenueDirectory';

export const dynamic = 'force-dynamic';

export default function RestaurantsNightlifePage({ searchParams }) {
  const { t } = getServerTranslation();
  return (
    <VenueDirectory
      basePath="/restaurants-nightlife"
      searchParams={searchParams}
      t={t}
      eyebrow={t.restaurantsNightlife.pill}
      title={t.restaurantsNightlife.title}
      lede={t.restaurantsNightlife.subtitle}
    />
  );
}
