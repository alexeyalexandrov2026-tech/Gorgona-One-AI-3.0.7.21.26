import { getSportsbooks } from '../lib/sportsbooksData';
import { categories, allDeals } from '../lib/dealsData';
import { EVENT_CATEGORY_GROUPS, EVENT_CATEGORIES, LEAGUES } from '../lib/mockEventsData';
import { getAllEvents } from '../lib/eventsData';
import { getYachts, getRentals, getVacationRentals } from '../lib/data/listings';
import { getVenues } from '../lib/restaurantsNightlifeData';
import { getExperiences } from '../lib/experiencesData';
import { sitemapEntries } from '../lib/seo.mjs';

// Partner listings and sportsbooks come from the database, so the sitemap is
// built per request rather than frozen at deploy time.
export const dynamic = 'force-dynamic';

// Each section is read through the same getter its pages use, so every
// address listed here opens.
export default async function sitemap() {
  const [yachts, rentals, stays, sportsbooks, events] = await Promise.all([
    getYachts({ editorial: true }),
    getRentals({ editorial: true }),
    getVacationRentals({ editorial: true }),
    getSportsbooks(),
    getAllEvents()
  ]);
  return sitemapEntries({
    yachts,
    rentals,
    stays,
    venues: getVenues(),
    experiences: getExperiences(),
    sportsbooks,
    deals: allDeals,
    storeCategories: categories,
    eventGroups: EVENT_CATEGORY_GROUPS,
    eventCategories: EVENT_CATEGORIES,
    leagues: LEAGUES,
    events
  });
}
