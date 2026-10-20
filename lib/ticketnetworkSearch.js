import { getTicketNetworkCatalogue, buildTicketNetworkUrl } from './ticketnetwork.js';
import { MIAMI_AREA_CITIES, TICKETNETWORK_AREAS } from './ticketnetworkLocation.js';

// Current public search taxonomy verified against TicketNetwork's own Event
// search on 2026-10-20. Never accept a raw upstream filter from the browser.
const parent = value => `parent_category:=\`${value}\``;
const child = value => `child_category:=\`${value}\``;
const major = value => `major_category:=\`${value}\``;
const SEARCH_FILTERS = {
  events: `(${parent('Sports')} || ${parent('Concerts')} || ${parent('Theater')})`,
  sports: parent('Sports'), concerts: parent('Concerts'),
  nfl: major('NFL'), nba: major('NBA'), nhl: major('NHL'), mlb: major('MLB'),
  mls: `${parent('Sports')} && grandchild_category:=\`Professional (MLS)\``,
  ufc: major('UFC'), boxing: major('Boxing'), 'formula-1': major('Racing'),
  nascar: `${major('Racing')} && grandchild_category:=NASCAR`,
  tennis: major('Tennis'), golf: major('Golf'), 'other-leagues': parent('Sports'),
  'pop-rock': `${parent('Concerts')} && ${child('Pop / Rock')}`,
  'hip-hop-rnb': `${parent('Concerts')} && (${child('Rap / Hip Hop')} || ${child('R&B / Soul')})`,
  'jazz-blues': `${parent('Concerts')} && ${child('Jazz / Blues')}`,
  'electronic-edm': `${parent('Concerts')} && ${child('Techno / Electronic')}`,
  'classical-opera': `((${parent('Concerts')} && ${child('Classical')}) || (${parent('Theater')} && ${child('Opera')}))`,
  country: `${parent('Concerts')} && ${child('Country / Folk')}`,
  'comedy-standup': `${parent('Concerts')} && ${child('Comedy')}`,
  'theater-broadway': parent('Theater'),
  festivals: `((${parent('Concerts')} && ${child('Festival / Tour')}) || (${parent('Theater')} && ${child('Festival')}))`,
  'other-live': `(${parent('Concerts')} || ${parent('Theater')})`
};
const ALLOWED = new Set(['category', 'area', 'from', 'to', 'performer', 'city', 'page']);
export const TICKETNETWORK_PAGE_SIZE = 10;

export function ticketNetworkToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function date(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid date');
  }
  return value;
}

function text(value) {
  const clean = value.trim();
  if (clean.length > 100 || /[\x00-\x1f\x7f`\\]/.test(clean)) throw new Error('Invalid search text');
  return clean;
}

export function parseTicketNetworkQuery(params, now = new Date()) {
  for (const key of params.keys()) {
    if (!ALLOWED.has(key) || params.getAll(key).length !== 1) throw new Error('Invalid parameter');
  }
  const category = params.get('category') || 'events';
  if (!Object.hasOwn(SEARCH_FILTERS, category)) throw new Error('Invalid category');
  const area = params.get('area') || 'miami';
  if (!TICKETNETWORK_AREAS.some(item => item.value === area)) throw new Error('Invalid area');
  const today = ticketNetworkToday(now);
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCFullYear(horizon.getUTCFullYear() + 2);
  const from = params.get('from') ? date(params.get('from')) : today;
  const to = params.get('to') ? date(params.get('to')) : horizon.toISOString().slice(0, 10);
  if (from < today || to < from || to > horizon.toISOString().slice(0, 10)) throw new Error('Invalid date range');
  const rawPage = params.get('page') || '1';
  if (!/^[1-9]\d{0,2}$/.test(rawPage) || Number(rawPage) > 100) throw new Error('Invalid page');
  return { category, area, from, to, performer: text(params.get('performer') || ''), city: text(params.get('city') || ''), page: Number(rawPage) };
}

export function buildTicketNetworkSearch(query) {
  const filters = [
    `(${SEARCH_FILTERS[query.category]})`, 'tickets_available:>0',
    `event_local_timestamp:>=${Date.parse(query.from) / 1000}`,
    `event_local_timestamp:<${Date.parse(query.to) / 1000 + 86400}`
  ];
  if (query.area !== 'all') filters.push('venue_state_province_short:=FL');
  if (query.area === 'miami') filters.push(`venue_city:=[${MIAMI_AREA_CITIES.map(city => `\`${city}\``).join(',')}]`);
  if (query.city) filters.push(`venue_city:=\`${query.city}\``);
  const keyword = getTicketNetworkCatalogue(query.category).query;
  return new URLSearchParams({
    q: [keyword, query.performer].filter(Boolean).join(' ') || '*',
    query_by: 'event_name,performer_names',
    filter_by: filters.join(' && '), sort_by: 'event_local_timestamp:asc',
    per_page: String(TICKETNETWORK_PAGE_SIZE), page: String(query.page),
    facet_by: 'performer_names,venue_city', max_facet_values: '100',
    include_fields: 'event_id,event_name,event_local_timestamp,venue_name,venue_city,venue_state_province_short,venue_country_short,slugs',
    num_typos: '0', drop_tokens_threshold: '0', highlight_fields: 'none'
  });
}

export function normalizeTicketNetworkResults(data, query) {
  if (!data || !Array.isArray(data.hits) || !Number.isSafeInteger(data.found) || data.found < 0 || !Array.isArray(data.facet_counts)) {
    throw new Error('Invalid supplier response');
  }
  if (data.hits.length > TICKETNETWORK_PAGE_SIZE || (query.page === 1 && data.found > 0 && !data.hits.length)) throw new Error('Incomplete supplier response');
  const events = data.hits.map(hit => {
    const item = hit.document;
    if (!item || !Number.isSafeInteger(item.event_id) || item.event_id <= 0 || !Number.isFinite(item.event_local_timestamp) ||
      !['event_name', 'venue_name', 'venue_city'].every(field => typeof item[field] === 'string')) {
      throw new Error('Invalid supplier event');
    }
    // TicketNetwork encodes venue-local wall time as a UTC-shaped timestamp.
    // Do not convert it to the visitor's timezone (which shifts dates/hours).
    const localDateTime = new Date(item.event_local_timestamp * 1000).toISOString().slice(0, 19);
    const slugs = item.slugs;
    const suffix = slugs && ['event_name', 'event_date_weekday_month_day', 'venue_name'].every(key => typeof slugs[key] === 'string' && /^[a-z0-9-]+$/.test(slugs[key]))
      ? `/${slugs.event_name}-tickets-${slugs.event_date_weekday_month_day}-${localDateTime.slice(0, 4)}-${slugs.venue_name}` : '';
    return {
      id: String(item.event_id), name: item.event_name, localDateTime,
      venue: item.venue_name, city: item.venue_city, state: item.venue_state_province_short || item.venue_country_short || '',
      url: buildTicketNetworkUrl(`https://www.ticketnetwork.com/tickets/${item.event_id}${suffix}`, getTicketNetworkCatalogue(query.category).sid)
    };
  });
  const values = field => (data.facet_counts.find(facet => facet.field_name === field)?.counts || [])
    .filter(item => typeof item.value === 'string').map(item => item.value).sort((a, b) => a.localeCompare(b));
  return {
    events, total: data.found, page: query.page,
    hasMore: query.page < 100 && query.page * TICKETNETWORK_PAGE_SIZE < data.found,
    performers: values('performer_names'), cities: values('venue_city')
  };
}
