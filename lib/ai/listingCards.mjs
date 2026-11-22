// Real catalogue rows for a concierge answer. The model never supplies the title,
// the price, or the link: those come from the same index the site search uses.
import { searchEcosystem } from './intent.js';
import { getEcosystemIndex } from './ecosystemIndex.js';
import { diningFilterFor, diningCollectionFor } from '../dining/filters.mjs';
import { matchActionCards } from '../aiSuggestions.js';
import { extractNeighborhood } from './tripProfile.mjs';
import { buildTicketNetworkUrl } from '../ticketnetwork.js';

const STOP_TO_EXPERIENCE_HREFS = Object.freeze({
  'zoo-miami': ['/experiences/zoo-miami', '/experiences/viator/5096p35'],
  everglades: ['/experiences/viator/5096p35', '/experiences/everglades', '/experiences/viator/21428p2'],
  'wynwood-walls': ['/experiences/wynwood-walls', '/experiences/viator/5493174p5'],
  'biscayne-bay': ['/experiences/viator/8836p1', '/experiences/viator/169162p2', '/experiences/viator/28744p2'],
  'little-havana': ['/experiences/viator/5304havana', '/experiences/viator/5493174p5'],
  'south-beach': ['/experiences/viator/231628p7', '/experiences/viator/28744p2', '/experiences/viator/5493174p5'],
  'key-biscayne': ['/experiences/viator/10150p16', '/experiences/viator/342209p11', '/experiences/viator/8836p1'],
  'sunny-isles': ['/experiences/viator/5606753p1', '/experiences/viator/454994p2'],
  'bal-harbour': ['/experiences/viator/5606753p1', '/experiences/viator/231628p7'],
  brickell: ['/experiences/viator/28744p2', '/experiences/viator/231628p7'],
  'design-district': ['/experiences/viator/231628p7', '/experiences/viator/5493174p5'],
  'coconut-grove': ['/experiences/viator/8836p1', '/experiences/viator/169162p2'],
  vizcaya: ['/experiences/viator/5493174p5', '/experiences/viator/8836p1'],
  'frost-science': ['/experiences/big-bus-miami-hop-on-hop-off-tours', '/experiences/viator/5493174p5'],
  'childrens-museum': ['/experiences/zoo-miami', '/experiences/big-bus-miami-hop-on-hop-off-tours'],
  pamm: ['/experiences/viator/5493174p5', '/experiences/wynwood-walls']
});

const ARTIST_STOP = new Set([
  'miami', 'miami beach', 'south beach', 'brickell', 'wynwood', 'florida',
  'concerts', 'concert', 'sports', 'sport', 'tickets', 'ticket', 'events', 'event', 'show', 'shows',
  'nba', 'nfl', 'mls', 'nhl', 'mlb', 'ufc', 'f1', 'formula', 'grand prix',
  'today', 'tonight', 'tomorrow', 'weekend', 'friday', 'saturday', 'sunday',
  'концерт', 'концерты', 'шоу', 'стендап', 'матч', 'футбол', 'баскетбол', 'хоккей', 'теннис', 'майами'
]);

function extractEventSearchTerm(query) {
  const text = String(query || '').trim();
  if (!text) return '';
  const m = text.match(
    /(?:[Бб]илеты?\s+на|[Кк]онцерт|[Шш]оу|[Вв]ыступлени\p{L}*|[Сс]тендап|[Tt]ickets?\s+(?:for|to)|[Cc]oncert\s+(?:by|of|for)|[Ss]how\s+(?:by|for)|[Ee]ntradas?\s+para|[Cc]oncierto\s+de)\s+([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9.'&-]{1,24}(?:\s+[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9.'&-]{1,24}){0,2})/u
  );
  if (!m) return '';
  const candidate = m[1]
    .replace(/\s+(?:in\s+miami|en\s+miami|в\s+майами|в\s+(?:пятниц|суббот|воскресень|декабр|январ|ноябр)\S*).*$/iu, '')
    .replace(/[?!.,;:"'«»]+$/g, '')
    .trim();
  if (candidate.length < 3 || ARTIST_STOP.has(candidate.toLowerCase())) return '';
  return candidate;
}

export function stopExperienceCards(stops, { limit = 3 } = {}) {
  if (!Array.isArray(stops) || !stops.length) return [];
  const index = getEcosystemIndex();
  const byHref = new Map(index.map((e) => [e.href, e]));
  const cards = [];
  const seen = new Set();
  for (const stopId of stops) {
    for (const href of STOP_TO_EXPERIENCE_HREFS[stopId] || []) {
      if (seen.has(href)) continue;
      const item = byHref.get(href);
      if (!item) continue;
      seen.add(href);
      cards.push({
        href: item.href,
        title: item.title,
        label: item.type,
        ...(item.image ? { image: item.image } : {}),
        ...(item.price ? { price: String(item.price) } : {}),
        ...(item.subtitle ? { summary: item.subtitle } : {}),
        ...(item.booking ? { booking: { ...item.booking }, more: '/experiences' } : {})
      });
      if (cards.length >= limit) return cards;
    }
  }
  return cards;
}

const SKIP = new Set(['Destination', 'World', 'Category']);
// Words that describe a mood, not a thing to book. "Something fun" matched the
// Orlando park "Fun Spot America" on the word alone; a vague request gets
// advice from the reply, not a random catalogue row.
const VAGUE = new Set(['something', 'anything', 'fun', 'cool', 'nice', 'good', 'great', 'interesting', 'exciting', 'else', 'other', 'idea', 'ideas', 'thing', 'things', 'do', 'what', 'to', 'a', 'an', 'the', 'some', 'me', 'for', 'please', 'i', 'want', 'need', 'today', 'tonight']);

function isVague(query) {
  const tokens = String(query || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.length > 0 && tokens.every(token => VAGUE.has(token));
}

const belongs = (href, root) => href === root || href.startsWith(root + '/') || href.startsWith(root + '#');
const isVenue = (item) => item?.type === 'Restaurant' || item?.type === 'Nightlife';

function moreHrefFor(item, venueMoreHref) {
  if (isVenue(item)) return venueMoreHref;
  if (item?.type === 'Event') return item.href.includes('#') ? item.href.split('#')[0] : '/events';
  if (item?.type === 'Experience') return '/experiences';
  if (item?.type === 'Flight') return '/travel/ovago';
  return null;
}

// Specific vehicle model identifiers: if the guest asks for a brand ("Lamborghini",
// "Ferrari", "Mercedes") without naming a specific model, diversify across
// model families instead of repeating 3 variants of the same model (e.g. 3 Uruses).
const SPECIFIC_CAR_MODEL = /(?<![\p{L}\p{N}])(?:urus|урус|hurac[aá]n|уракан|хуракан|aventador|авентадор|gallardo|temerario|revuelto|portofino|f8|488|812|296|sf90|f12|purosangue|cullinan|куллинан|кулинан|ghost|dawn|wraith|spectre|720s|750s|570s|artura|911|gt3|cayenne|macan|panamera|taycan|continental|bentayga|flying\s*spur|escalade|эскалейд|g63|g550|g[\s-]?class|g[\s-]?wagon|гелендваген|гелик|s580|s63|s680|gle|gls|cle|c63|c43|eqs|m3|m4|m5|m8|x5|x6|x7|7[\s-]?series|i7|corvette|корвет|chiron|mc20|levante|dbx|cybertruck|r8|rs7|nsx|gtr|hummer|r1s|vf9)(?![\p{L}\p{N}])/iu;

const CAR_FAMILY_PATTERNS = [
  [/lamborghini.*\burus\b/i, 'lamborghini-urus'],
  [/lamborghini.*\bhurac/i, 'lamborghini-huracan'],
  [/lamborghini.*\baventador\b/i, 'lamborghini-aventador'],
  [/lamborghini.*\bgallardo\b/i, 'lamborghini-gallardo'],
  [/lamborghini.*\btemerario\b/i, 'lamborghini-temerario'],
  [/ferrari.*\bportofino\b/i, 'ferrari-portofino'],
  [/ferrari.*\bf8\b/i, 'ferrari-f8'],
  [/ferrari.*\b488\b/i, 'ferrari-488'],
  [/ferrari.*\b812\b/i, 'ferrari-812'],
  [/ferrari.*\b296\b/i, 'ferrari-296'],
  [/ferrari.*\bsf90\b/i, 'ferrari-sf90'],
  [/ferrari.*\bf12\b/i, 'ferrari-f12'],
  [/ferrari.*\bpurosangue\b/i, 'ferrari-purosangue'],
  [/rolls.*\bcullinan\b/i, 'rolls-cullinan'],
  [/rolls.*\bghost\b/i, 'rolls-ghost'],
  [/rolls.*\bdawn\b/i, 'rolls-dawn'],
  [/rolls.*\bwraith\b/i, 'rolls-wraith'],
  [/rolls.*\bspectre\b/i, 'rolls-spectre'],
  [/(?:mercedes|brabus).*(?:g63|g550|g-?class)/i, 'mercedes-g-class'],
  [/mercedes.*maybach.*\bgls\b/i, 'mercedes-maybach-gls'],
  [/mercedes.*maybach.*\bs\d+/i, 'mercedes-maybach-s'],
  [/mercedes.*\bgle/i, 'mercedes-gle'],
  [/mercedes.*\bgls/i, 'mercedes-gls'],
  [/mercedes.*\bcle/i, 'mercedes-cle'],
  [/mercedes.*\bs(?:580|63)\b/i, 'mercedes-s-class'],
  [/mercedes.*\bamg\s*gt\b/i, 'mercedes-amg-gt'],
  [/porsche.*\b911\b/i, 'porsche-911'],
  [/porsche.*\bcayenne\b/i, 'porsche-cayenne'],
  [/porsche.*\bmacan\b/i, 'porsche-macan'],
  [/porsche.*\bpanamera\b/i, 'porsche-panamera'],
  [/porsche.*\btaycan\b/i, 'porsche-taycan'],
  [/mclaren.*\b720s\b/i, 'mclaren-720s'],
  [/mclaren.*\b750s\b/i, 'mclaren-750s'],
  [/mclaren.*\b570s\b/i, 'mclaren-570s'],
  [/mclaren.*\bartura\b/i, 'mclaren-artura'],
  [/mclaren.*\bgt\b/i, 'mclaren-gt'],
  [/bmw.*\bm3\b/i, 'bmw-m3'],
  [/bmw.*\bm4\b/i, 'bmw-m4'],
  [/bmw.*\bm5\b/i, 'bmw-m5'],
  [/bmw.*\bm8\b/i, 'bmw-m8'],
  [/bmw.*\bx5\b/i, 'bmw-x5'],
  [/bmw.*\bx6/i, 'bmw-x6'],
  [/bmw.*\bx7\b/i, 'bmw-x7'],
  [/bmw.*\b7[\s-]?series\b/i, 'bmw-7-series'],
  [/bentley.*\bbentayga\b/i, 'bentley-bentayga'],
  [/bentley.*\bcontinental\b/i, 'bentley-continental'],
  [/bentley.*\bflying\s*spur\b/i, 'bentley-flying-spur'],
  [/cadillac.*\bescalade\b/i, 'cadillac-escalade'],
  [/range\s*rover.*\bsport\b/i, 'range-rover-sport'],
  [/range\s*rover.*\bvelar\b/i, 'range-rover-velar'],
  [/range\s*rover/i, 'range-rover'],
  [/corvette/i, 'chevrolet-corvette']
];

export function carModelFamily(title) {
  const clean = String(title || '').replace(/^\s*20\d{2}\s+/, '').replace(/\s*·.*$/, '').trim();
  for (const [pattern, family] of CAR_FAMILY_PATTERNS) {
    if (pattern.test(clean)) return family;
  }
  const parts = clean.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').trim().split(/\s+/);
  return parts.slice(0, 2).join('-') || clean.toLowerCase();
}

function diversifyCars(items, query, size) {
  if (SPECIFIC_CAR_MODEL.test(String(query || ''))) return items;
  const primary = [];
  const overflow = [];
  const seenFamilies = new Set();
  for (const item of items) {
    if (item?.type !== 'Car') {
      primary.push(item);
      continue;
    }
    const family = carModelFamily(item.title);
    if (!seenFamilies.has(family)) {
      seenFamilies.add(family);
      primary.push(item);
    } else {
      overflow.push(item);
    }
  }
  return primary.length >= size ? primary : [...primary, ...overflow];
}

/**
 * Catalogue rows for the guest's words. Strict search: a row must be named or
 * sit in a section the guest asked for, and a bare number never matches a
 * price. With `sections`, only rows inside those sections are kept.
 */
export function listingCards(query, { locale = 'en', limit = 3, sections = null, byCollection = true, extraEntities = [], profile = null } = {}) {
  if (isVague(query)) return [];
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 4) : 3;
  // Pull a wider candidate pool so brand-level car queries can diversify across
  // model families (e.g. Urus + Huracán + Aventador) even when one model has
  // dozens of variants in the fleet.
  const { results: found } = searchEcosystem(query, { locale, limit: 40, strict: true, extraEntities, profile });
  const inSections = Array.isArray(sections)
    ? found.filter(item => sections.some(root =>
      belongs(item?.href || '', root) || (root === '/yachts' && item?.experienceSection === 'boats')
    ))
    : found;
  // "Michelin", "romantic", "cheap": venue rows must come from that collection,
  // so a name that merely contains "Restaurant" is not offered as a Michelin pick.
  const collection = byCollection ? diningCollectionFor(query) : null;
  const filtered = collection
    ? inSections.filter(item => !isVenue(item) || (item.collections || []).includes(collection))
    : inSections;
  const results = diversifyCars(filtered, query, size);
  const targetNeighborhood = extractNeighborhood(query) || profile?.neighborhood || null;
  const hasExactNeighborhoodHit = Boolean(
    targetNeighborhood && results.some(item => isVenue(item) && item.neighborhood === targetNeighborhood)
  );
  const venueMoreHref = collection
    ? diningFilterFor(query)
    : (hasExactNeighborhoodHit
      ? `/restaurants-nightlife?neighborhood=${encodeURIComponent(targetNeighborhood)}`
      : diningFilterFor(query));
  const artistSearch = extractEventSearchTerm(query);
  const cards = [];
  const seen = new Set();
  for (const item of results) {
    if (!item?.href || SKIP.has(item.type) || (item.href.split('/').length < 3 && !item.href.includes('#'))) continue;
    const dedupeKey = item.type === 'Flight' && item.booking?.href ? item.booking.href : item.href;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const more = item.booking ? moreHrefFor(item, venueMoreHref) : null;
    let booking = item.booking ? { ...item.booking } : null;
    if (booking && item.type === 'Event' && !item.liveEvent && artistSearch) {
      try {
        booking = {
          ...booking,
          href: buildTicketNetworkUrl(`https://www.ticketnetwork.com/search?q=${encodeURIComponent(artistSearch)}`, 'GorgonaEvents')
        };
      } catch {}
    }
    cards.push({
      href: item.href,
      title: item.title,
      label: item.type,
      ...(item.image ? { image: item.image } : {}),
      ...(item.price ? { price: String(item.price) } : {}),
      ...(item.subtitle ? { summary: item.subtitle } : {}),
      // Direct verified booking or partner referral link + matching directory filter.
      ...(booking ? { booking, ...(more ? { more } : {}) } : {})
    });
    if (cards.length >= size) break;
  }
  return cards;
}

// Actions that recommend something bookable; everything else (handoff,
// clarify, unsupported, itineraries, facts) gets no catalogue rows.
const LISTING_ACTIONS = new Set(['recommend', 'consult']);

/**
 * Listing rows for a resolved turn: for recommend/consult actions inside the
 * final sections, or bookable experience cards matching the stops of an ideas/plan turn.
 */
export function gatedListings(query, { locale = 'en', action, sections = [], extraEntities = [], profile = null, stops = [] } = {}) {
  if ((action === 'ideas' || action === 'plan') && Array.isArray(sections) && sections.includes('/experiences') && Array.isArray(stops) && stops.length) {
    return stopExperienceCards(stops, { limit: 3 });
  }
  if (!LISTING_ACTIONS.has(action) || !Array.isArray(sections) || !sections.length) return [];
  return listingCards(query, { locale, sections, extraEntities, profile });
}

const plain = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '');
const words = text => ` ${plain(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

/**
 * A booking request that names a restaurant or club gets that venue's own
 * booking page (or Google Maps) next to the "this chat does not book" line,
 * so the guest goes straight to the venue. Only venues the guest named, never
 * suggestions, and never anything outside Restaurants & Nightlife.
 */
export function namedVenueCards(text, { locale = 'en', extraEntities = [], profile = null } = {}) {
  // "Book a flight to Osaka" is a travel request, not the Osaka restaurant.
  const asked = matchActionCards(String(text || '')).map(card => card.href);
  if (asked.length && !asked.includes('/restaurants-nightlife')) return [];
  const said = words(text);
  return listingCards(text, { locale, sections: ['/restaurants-nightlife'], byCollection: false, extraEntities, profile }).filter(card => {
    if (!card.booking) return false;
    const slug = card.href.split('/').pop().replace(/-miami$/, '').replace(/-/g, ' ');
    const names = [card.title, card.title.replace(/^the\s+/i, ''), slug].map(name => words(name).trim()).filter(name => name.length >= 3);
    return names.some(name => said.includes(` ${name} `));
  });
}
