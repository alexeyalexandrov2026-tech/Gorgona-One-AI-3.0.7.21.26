import {HEADOUT_COLLECTIONS} from '../lib/headoutCatalog.mjs';
import { getSportsbooks } from '../lib/sportsbooksData';
import { allDeals } from '../lib/dealsData';
import { EVENT_CATEGORIES, LEAGUES } from '../lib/mockEventsData';
import { getAllEvents } from '../lib/eventsData';

export default async function sitemap() {
  const baseUrl = 'https://gorgona-one.com';
  const sportsbooks = await getSportsbooks();

  const routes = [
    '',
    '/experiences',
    '/private-jets',
    '/sportsbook',
    '/events',
    '/best-shopping-deals',
    '/nike-coupons',
    '/amazon-promo-codes',
    '/fashion-discounts',
    '/sports-betting-promos',
    '/draftkings-promos',
    '/fanduel-promos',
    '/betmgm-promos',
    '/caesars-sportsbook-promos'
  ];

  const staticRoutes = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8
  }));

  const dynamicRoutes = sportsbooks.map((item) => ({
    url: `${baseUrl}/sportsbook/${item.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7
  }));

  const categoryRoutes = HEADOUT_COLLECTIONS.map(item=>({url:baseUrl+'/experiences/'+item.slug,changeFrequency:'weekly',priority:0.7}));

  const dealRoutes = allDeals.map((deal) => ({
    url: `${baseUrl}/deals/${deal.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6
  }));

  const eventCategoryRoutes = EVENT_CATEGORIES.map((category) => ({
    url: `${baseUrl}/events/category/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7
  }));

  const leagueRoutes = LEAGUES.map((league) => ({
    url: `${baseUrl}/events/league/${league.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6
  }));

  const events = await getAllEvents();
  const eventRoutes = events.map((event) => ({
    url: `${baseUrl}/events/${event.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8
  }));

  return [...staticRoutes, ...dynamicRoutes, ...categoryRoutes, ...dealRoutes, ...eventCategoryRoutes, ...leagueRoutes, ...eventRoutes];
}
