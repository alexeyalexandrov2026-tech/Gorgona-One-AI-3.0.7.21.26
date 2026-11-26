import { HEADOUT_COLLECTIONS } from '../lib/headoutCatalog.mjs';
import { VIATOR_EXPERIENCE_SLUGS } from '../lib/experienceCards.mjs';
import { EVENT_CATEGORIES, EVENT_CATEGORY_GROUPS, LEAGUES } from '../lib/mockEventsData';
import { getAllEvents } from '../lib/eventsData';
import { getRentals, getVacationRentals } from '../lib/data/listings';
import { diningCatalogue } from '../lib/server/diningCatalogue.mjs';
import { sitemapEntries } from '../lib/seo.mjs';

// A section whose source is briefly unavailable drops out of this build's
// sitemap instead of failing the whole file.
const slugs = async (load) => {
  try { return (await load()).map((item) => item.slug).filter(Boolean); }
  catch { return []; }
};

export default async function sitemap() {
  return sitemapEntries({
    experiences: [...HEADOUT_COLLECTIONS.map((item) => item.slug), ...VIATOR_EXPERIENCE_SLUGS.map((slug) => `viator/${slug}`)],
    eventCategories: [...EVENT_CATEGORY_GROUPS, ...EVENT_CATEGORIES].map((category) => category.slug),
    leagues: LEAGUES.map((league) => league.slug),
    events: await slugs(getAllEvents),
    rentals: await slugs(getRentals),
    stays: await slugs(() => getVacationRentals({ editorial: true })),
    // The same filter the restaurants directory shows.
    venues: await slugs(async () => (await diningCatalogue(process.env, fetch)).filter((venue) => venue.status === 'verified'))
  });
}
