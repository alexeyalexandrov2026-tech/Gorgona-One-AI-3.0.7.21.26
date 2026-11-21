// Pure filtering for the dining directory. No data lives here.
import {COLLECTIONS, VIBES, MICHELIN_LEVELS} from './editorial.mjs';

export const PRICE_LEVELS = Object.freeze(['$', '$$', '$$$', '$$$$']);

/** "$$$-$$$$" → [3,4]; "$" → [1]; anything else → []. */
export function priceBuckets(price) {
  if (typeof price !== 'string') return [];
  const parts = price.split('-').map(part => part.trim());
  if (!parts.every(part => /^\${1,4}$/.test(part))) return [];
  const [low, high = low] = parts.map(part => part.length);
  const out = [];
  for (let level = Math.min(low, high); level <= Math.max(low, high); level += 1) out.push(level);
  return out;
}

const pick = (value, allowed) => typeof value === 'string' && allowed.includes(value) ? value : '';
const text = value => typeof value === 'string' ? value : '';

/** Reads the directory's query parameters, keeping only known values. */
export function readDiningParams(searchParams = {}) {
  return {
    category: pick(searchParams.category, ['restaurant', 'nightlife']),
    collection: pick(searchParams.collection, COLLECTIONS),
    q: text(searchParams.q).slice(0, 120).trim().toLocaleLowerCase(),
    neighborhood: text(searchParams.neighborhood),
    cuisine: text(searchParams.cuisine),
    experience: text(searchParams.experience),
    provider: text(searchParams.provider),
    price: pick(searchParams.price, PRICE_LEVELS),
    vibe: pick(searchParams.vibe, VIBES),
    michelin: pick(searchParams.michelin, MICHELIN_LEVELS)
  };
}

export function matchesMichelin(venue, level) {
  if (!level) return true;
  return level === 'green' ? Boolean(venue.greenStar) : venue.michelin === level;
}

/** Applies every active filter; an empty value never filters. */
export function filterVenues(venues, params) {
  return venues.filter(venue =>
    (!params.category || venue.category === params.category)
    && (!params.collection || (venue.collections || []).includes(params.collection))
    && (!params.q || [venue.name, venue.neighborhood, venue.cuisine].join(' ').toLocaleLowerCase().includes(params.q))
    && (!params.neighborhood || venue.neighborhood === params.neighborhood)
    && (!params.cuisine || venue.cuisine === params.cuisine)
    && (!params.experience || venue.features.includes(params.experience))
    && (!params.provider || venue.channels.some(channel => channel.provider === params.provider))
    && (!params.price || priceBuckets(venue.price).includes(params.price.length))
    && (!params.vibe || (venue.vibe || []).includes(params.vibe))
    && matchesMichelin(venue, params.michelin));
}

/** Builds a directory URL from the current params with some values changed; empty values are dropped. */
export function diningHref(basePath, params, changes = {}) {
  const next = {...params, ...changes};
  const query = new URLSearchParams();
  for (const key of ['category', 'collection', 'q', 'neighborhood', 'cuisine', 'experience', 'provider', 'price', 'vibe', 'michelin'])
    if (next[key]) query.set(key, next[key]);
  const string = query.toString();
  return string ? `${basePath}?${string}` : basePath;
}

// Words the concierge search can match for each editorial tag (en, ru, es and common forms).
export const DINING_SEARCH_TAGS = Object.freeze({
  romantic: ['romantic', 'romance', 'date', 'романтика', 'романтический', 'романтичный', 'романтично', 'романтическое', 'свидание', 'свидания', 'cita', 'romantico', 'romántico'],
  party: ['party', 'вечеринка', 'тусовка', 'fiesta'],
  family: ['family', 'kids', 'children', 'семья', 'семьей', 'семейный', 'дети', 'детьми', 'familia', 'niños', 'ninos'],
  business: ['business', 'meeting', 'деловой', 'деловая', 'бизнес', 'negocios'],
  'art-basel': ['art basel', 'basel', 'арт базель', 'базель'],
  'date-night': ['date night', 'date', 'свидание', 'свидания', 'cita'],
  sunset: ['sunset', 'view', 'закат', 'закатом', 'вид', 'atardecer'],
  michelin: ['michelin', 'мишлен', 'мишлена', 'мишленовский', 'мишленовские'],
  budget: ['cheap', 'affordable', 'budget', 'inexpensive', 'недорого', 'недорогой', 'недорогие', 'дешево', 'бюджетный', 'barato', 'económico', 'economico'],
  '2star': ['michelin', 'star', 'starred', 'мишлен', 'звезда', 'звезды', 'estrella'],
  '1star': ['michelin', 'star', 'starred', 'мишлен', 'звезда', 'звезды', 'estrella'],
  bib: ['michelin', 'bib gourmand', 'мишлен'],
  green: ['michelin', 'green star']
});

const COLLECTION_WORDS = [
  ['michelin', /michelin|мишлен/iu],
  ['art-basel', /art\s*basel|арт[\s-]*базел/iu],
  ['date-night', /\bdate\b|romantic|romance|свидан|романт|\bcita\b|rom[aá]ntic/iu],
  ['sunset', /sunset|rooftop|закат|крыш|atardecer|azotea/iu],
  ['budget', /cheap|affordable|budget|inexpensive|недорог|дешев|бюджет|barat|econ[oó]mic/iu]
];

/** The collection a guest's words point to (e.g. "romantic" → date-night), or null. */
export function diningCollectionFor(query) {
  const text = String(query || '');
  return COLLECTION_WORDS.find(([, pattern]) => pattern.test(text))?.[0] || null;
}

/** That collection as a directory link, or the plain directory. */
export function diningFilterFor(query, basePath = '/restaurants-nightlife') {
  const collection = diningCollectionFor(query);
  return collection ? `${basePath}?collection=${collection}` : basePath;
}

export function hasActiveFilters(params) {
  return Object.entries(params).some(([key, value]) => key !== 'category' && Boolean(value));
}
