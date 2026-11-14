import {HEADOUT_COLLECTIONS} from '../lib/headoutCatalog.mjs';
import { getRentals } from '../lib/rentalsData.js';
import { EVENT_CATEGORIES, LEAGUES } from '../lib/mockEventsData';
import { getAllEvents } from '../lib/eventsData';

export default async function sitemap() {
  const baseUrl = 'https://gorgona-one.com';

  const routes = [
    '',
    '/experiences',
    '/private-jets',
    '/events'
  ];

  const staticRoutes = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8
  }));

  const categoryRoutes = HEADOUT_COLLECTIONS.map(item=>({url:baseUrl+'/experiences/'+item.slug,changeFrequency:'weekly',priority:0.7}));

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

  const carRoutes = getRentals().map(car=>({url:`${baseUrl}/rentals/${car.slug}`,changeFrequency:'weekly',priority:0.7}));
  return [...staticRoutes, ...categoryRoutes, ...eventCategoryRoutes, ...leagueRoutes, ...eventRoutes, {url:baseUrl+'/rentals',changeFrequency:'weekly',priority:0.8}, ...carRoutes];
}
