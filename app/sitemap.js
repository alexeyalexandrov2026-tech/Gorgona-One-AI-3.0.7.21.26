import { getSportsbooks } from '../lib/sportsbooksData';
import { categories, allDeals } from '../lib/dealsData';
import { EVENT_CATEGORIES, LEAGUES } from '../lib/mockEventsData';
import { getAllEvents } from '../lib/eventsData';
import { getYachts } from '../lib/yachtsData';
import { getRentals } from '../lib/rentalsData';
import { getVacationRentals } from '../lib/vacationRentalsData';
import { getExperiences } from '../lib/experiencesData';
import { getVenues } from '../lib/restaurantsNightlifeData';

const baseUrl = 'https://gorgona-one.com';

// Index pages with real content. The short placeholder promo pages
// (/draftkings-promos, /nike-coupons, ...) are left out on purpose: they are
// noindex until they have content of their own.
const ROUTES = [
  '',
  '/yachts',
  '/rentals',
  '/vacation-rentals',
  '/restaurants-nightlife',
  '/experiences',
  '/travel',
  '/travel/ovago',
  '/entertainment/adrenaline-365',
  '/discovery',
  '/stores',
  '/coupons',
  '/sportsbook',
  '/events'
];

// One entry per detail page, built from the same data the pages render.
const DETAIL_PAGES = [
  ['/yachts', getYachts],
  ['/rentals', getRentals],
  ['/vacation-rentals', getVacationRentals],
  ['/experiences', getExperiences],
  ['/restaurants-nightlife', getVenues]
];

function entry(path, changeFrequency, priority) {
  return { url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency, priority };
}

export default async function sitemap() {
  const sportsbooks = await getSportsbooks();
  const events = await getAllEvents();

  return [
    ...ROUTES.map((route) => entry(route, 'weekly', route === '' ? 1 : 0.8)),
    ...DETAIL_PAGES.flatMap(([prefix, getItems]) =>
      getItems().map((item) => entry(`${prefix}/${item.slug}`, 'weekly', 0.7))
    ),
    ...sportsbooks.map((book) => entry(`/sportsbook/${book.slug}`, 'weekly', 0.7)),
    ...categories.map((category) => entry(`/stores/${category.slug}`, 'weekly', 0.7)),
    ...allDeals.map((deal) => entry(`/deals/${deal.slug}`, 'weekly', 0.6)),
    ...EVENT_CATEGORIES.map((category) => entry(`/events/category/${category.slug}`, 'daily', 0.7)),
    ...LEAGUES.map((league) => entry(`/events/league/${league.slug}`, 'weekly', 0.6)),
    ...events.map((event) => entry(`/events/${event.slug}`, 'daily', 0.8))
  ];
}
