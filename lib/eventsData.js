// Read layer for the Events section.
//
// Every caller in app/events treats these as plain synchronous getters - the
// detail page, the league page, EventGrid and the client-side EventsSearch all
// call them directly in render. They used to query Supabase and return
// promises, which meant a promise reached code expecting an array: the league
// page threw on `list.slice`, the detail page threw on `event.providers.map`,
// and EventGrid silently dropped every league name and category label. So this
// reads the catalogue that actually ships with the build.
//
// To move back onto a database, make these async again AND await them at every
// call site - the two have to change together, which is exactly what came
// apart before. `await` on the plain values returned here is already valid, so
// the callers that do await (sitemap, the AI digest) keep working either way.

import {
  EVENT_CATEGORIES,
  LEAGUES,
  TEAMS,
  PROVIDERS,
  events as ALL_EVENTS
} from './mockEventsData';

export function getEventCategories() {
  return EVENT_CATEGORIES;
}

export function getEventCategoryBySlug(slug) {
  return EVENT_CATEGORIES.find((category) => category.slug === slug) || null;
}

export function getLeagues() {
  return LEAGUES;
}

export function getLeagueBySlug(slug) {
  return LEAGUES.find((league) => league.slug === slug) || null;
}

export function getTeamsByLeague(leagueSlug) {
  return TEAMS.filter((team) => team.league === leagueSlug);
}

export function getTeamBySlug(slug) {
  return TEAMS.find((team) => team.slug === slug) || null;
}

export function getProviders() {
  return PROVIDERS;
}

export function getProviderBySlug(slug) {
  return PROVIDERS.find((provider) => provider.slug === slug) || null;
}

export function getAllEvents() {
  return ALL_EVENTS;
}

export function getEventBySlug(slug) {
  return ALL_EVENTS.find((event) => event.slug === slug) || null;
}

export function getEventsByCategory(categorySlug) {
  return ALL_EVENTS.filter((event) => event.category === categorySlug);
}

export function getEventsByLeague(leagueSlug) {
  return ALL_EVENTS.filter((event) => event.league === leagueSlug);
}

export function getFeaturedEvents() {
  return ALL_EVENTS.filter((event) => event.featured);
}

export function getTrendingEvents() {
  return ALL_EVENTS.filter((event) => event.trending);
}

export function getUpcomingEvents(limit = 8) {
  return [...ALL_EVENTS]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, limit);
}

function slugsInGroup(groupSlug) {
  return new Set(
    EVENT_CATEGORIES.filter((category) => category.group === groupSlug).map((category) => category.slug)
  );
}

export function getFeaturedConcerts() {
  const concerts = slugsInGroup('concerts');
  return getFeaturedEvents().filter((event) => concerts.has(event.category));
}

export function getFeaturedSportsEvents() {
  const sports = slugsInGroup('sports');
  return getFeaturedEvents().filter((event) => sports.has(event.category));
}

export function searchEvents(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return getAllEvents();

  return ALL_EVENTS.filter((event) =>
    [event.name, event.artist, event.venue, event.city, event.state, event.country]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalized)
  );
}

export function paginate(list, page = 1, pageSize = 12) {
  const items = Array.isArray(list) ? list : [];
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), currentPage, totalPages, totalItems: items.length };
}
