import { supabase } from './supabase';

export async function getEventCategories() {
  const { data } = await supabase.from('event_categories').select('*');
  return data || [];
}

export async function getEventCategoryBySlug(slug) {
  const { data } = await supabase.from('event_categories').select('*').eq('slug', slug).single();
  return data;
}

export async function getLeagues() {
  const { data } = await supabase.from('leagues').select('*');
  return data || [];
}

export async function getLeagueBySlug(slug) {
  const { data } = await supabase.from('leagues').select('*').eq('slug', slug).single();
  return data;
}

export async function getTeamsByLeague(leagueSlug) {
  // We first need the league id
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return [];
  const { data } = await supabase.from('teams').select('*').eq('league_id', league.id);
  return data || [];
}

export async function getTeamBySlug(slug) {
  const { data } = await supabase.from('teams').select('*').eq('slug', slug).single();
  return data;
}

export async function getProviders() {
  const { data } = await supabase.from('ticket_providers').select('*');
  return data || [];
}

export async function getProviderBySlug(slug) {
  const { data } = await supabase.from('ticket_providers').select('*').eq('slug', slug).single();
  return data;
}

export async function getAllEvents() {
  const { data } = await supabase.from('events').select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))');
  return (data || []).map(formatEvent);
}

export async function getEventBySlug(slug) {
  const { data } = await supabase.from('events').select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))').eq('slug', slug).single();
  return data ? formatEvent(data) : null;
}

export async function getEventsByCategory(categorySlug) {
  const { data } = await supabase.from('events').select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))').eq('category', categorySlug);
  return (data || []).map(formatEvent);
}

export async function getEventsByLeague(leagueSlug) {
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return [];
  const { data } = await supabase.from('events').select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))').eq('league_id', league.id);
  return (data || []).map(formatEvent);
}

export async function getFeaturedEvents() {
  const { data } = await supabase.from('events').select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))').eq('featured', true);
  return (data || []).map(formatEvent);
}

export async function getTrendingEvents() {
  const { data } = await supabase.from('events').select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))').eq('trending', true);
  return (data || []).map(formatEvent);
}

export async function getUpcomingEvents(limit = 8) {
  const { data } = await supabase.from('events')
    .select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))')
    .order('event_date', { ascending: true })
    .limit(limit);
  return (data || []).map(formatEvent);
}

export async function getFeaturedConcerts() {
  const categories = await getEventCategories();
  const concertCategorySlugs = new Set(categories.filter((c) => c.category_group === 'concerts').map((c) => c.slug));
  const { data } = await supabase.from('events').select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))').eq('featured', true);
  return (data || []).filter((event) => concertCategorySlugs.has(event.category)).map(formatEvent);
}

export async function getFeaturedSportsEvents() {
  const categories = await getEventCategories();
  const sportsCategorySlugs = new Set(categories.filter((c) => c.category_group === 'sports').map((c) => c.slug));
  const { data } = await supabase.from('events').select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))').eq('featured', true);
  return (data || []).filter((event) => sportsCategorySlugs.has(event.category)).map(formatEvent);
}

export async function searchEvents(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return await getAllEvents();
  
  // Basic text search on name, artist, venue, city
  const { data } = await supabase.from('events')
    .select('*, leagues(slug), event_providers(ticket_providers(slug)), event_teams(teams(slug))')
    .or(`name.ilike.%${normalized}%,artist.ilike.%${normalized}%,venue.ilike.%${normalized}%,city.ilike.%${normalized}%`);
  
  return (data || []).map(formatEvent);
}

export function paginate(list, page = 1, pageSize = 12) {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return { items: list.slice(start, start + pageSize), currentPage, totalPages, totalItems: list.length };
}

function formatEvent(dbEvent) {
  return {
    ...dbEvent,
    date: dbEvent.event_date,
    time: dbEvent.event_time,
    priceRange: dbEvent.price_range,
    league: dbEvent.leagues ? dbEvent.leagues.slug : null,
    providers: dbEvent.event_providers ? dbEvent.event_providers.map(p => p.ticket_providers?.slug).filter(Boolean) : [],
    teams: dbEvent.event_teams ? dbEvent.event_teams.map(t => t.teams?.slug).filter(Boolean) : []
  };
}
