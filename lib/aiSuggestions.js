// ===========================================================================
// Gorgona One — section registry + intent matcher.
//
// The single source of truth for "which part of the ecosystem does this
// request belong to". It powers both:
//   * the compact chips under a reply  -> matchSuggestions()
//   * the rich navigation cards        -> matchActionCards()
//
// CLIENT-SAFE ON PURPOSE. This module has no imports and never touches the
// system prompt or the inventory digest, so the browser can run the exact
// same matcher the server does. That is what lets the concierge still offer
// working navigation when the AI backend - or the whole server - is
// unreachable: the fallback is not a second, drifting implementation, it is
// this one.
//
// TWO RULES GOVERN THIS TABLE
//
// 1. Every `href` MUST be a real route (an app/**/page.js). A card is a
//    promise; pointing one at a directory without a page - /deals and
//    /entertainment are two such directories today - would 404 the guest.
//    `SUGGESTION_ROUTES` is exported so a test can assert this.
// 2. Keywords are matched on WORD BOUNDARIES, never as raw substrings.
//    Substring matching quietly mismatched: "ideal" scored Shopping via
//    "deal", "triple" scored Travel via "trip", "comfortable" scored Dining
//    via "table", and "alphabet" scored Sportsbooks via "bet". Boundaries
//    also make short, high-value words like "car", "bar" and "sale" safe to
//    list, which naive matching never allowed.
//
// Keyword syntax:
//   'yacht'       word, plus a simple plural -> yacht, yachts
//   'skydiv*'     prefix                     -> skydive, skydiving, skydiver
//   'rent a car'  phrase; spaces and hyphens are interchangeable
// ===========================================================================

// Unicode-aware boundaries. \b is ASCII-only, which would misfire the moment
// a keyword or a guest's phrasing carries an accent.
const WORD_START = '(?<![\\p{L}\\p{N}])';
const WORD_END = '(?![\\p{L}\\p{N}])';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compileKeyword(keyword) {
  const isPrefix = keyword.endsWith('*');
  const raw = isPrefix ? keyword.slice(0, -1) : keyword;
  // Spaces and hyphens are treated as the same separator so "rolls royce"
  // and "rolls-royce" both match one entry.
  const body = raw
    .trim()
    .split(/[\s-]+/)
    .map(escapeRegex)
    .join('[\\s-]+');
  // Deliberately `s?` and not `(?:s|es)?`: the latter turns "car" into a
  // match for "cares".
  const tail = isPrefix ? '[\\p{L}\\p{N}]*' : 's?';
  return new RegExp(`${WORD_START}${body}${tail}${WORD_END}`, 'iu');
}

// Order matters: it is the tie-breaker when two sections score equally, so
// distinctive sections lead and broad catch-alls (Travel, Shopping) trail.
const TOPIC_DEFINITIONS = [
  {
    href: '/yachts',
    label: 'Yacht Rentals',
    title: 'Private Yacht Charters',
    summary: 'Crewed yachts and catamarans for a day or a week on the water.',
    cta: 'Browse Yachts',
    keywords: [
      'yacht', 'superyacht', 'megayacht', 'boat', 'catamaran', 'sailboat', 'sail*',
      'charter', 'cruise', 'marina', 'captain', 'crew', 'deck', 'nautical',
      'on the water', 'day on the water'
    ]
  },
  {
    href: '/rentals',
    label: 'Car Rentals',
    title: 'Luxury Car Fleet',
    summary: 'Supercars, SUVs and chauffeur-driven vehicles with concierge delivery.',
    cta: 'Explore Vehicles',
    keywords: [
      'car', 'car rental', 'rent a car', 'rental car', 'supercar', 'hypercar',
      'exotic car', 'sports car', 'luxury car', 'suv', 'sedan', 'convertible',
      'coupe', 'vehicle', 'chauffeur', 'limo', 'limousine', 'drive*', 'test drive',
      'ferrari', 'lamborghini', 'porsche', 'bentley', 'rolls royce', 'mclaren',
      'bugatti', 'maserati', 'aston martin', 'range rover', 'mercedes', 'bmw',
      'audi', 'tesla', 'corvette', 'mustang'
    ]
  },
  {
    href: '/sportsbook',
    label: 'Sportsbooks',
    title: 'Sportsbook Promos',
    summary: 'Verified sign-up bonuses and odds boosts from the major sportsbooks.',
    cta: 'View Sportsbooks',
    keywords: [
      'bet', 'bets', 'betting', 'bettor', 'sportsbook', 'sports betting', 'sport',
      'wager*', 'odds', 'parlay', 'spread', 'moneyline', 'over under', 'prop bet',
      'bonus', 'free bet', 'sign up bonus', 'nfl', 'nba', 'mlb', 'nhl', 'ncaa',
      'ufc', 'mma', 'boxing', 'soccer', 'football', 'basketball', 'baseball',
      'hockey', 'tennis', 'golf', 'formula 1', 'grand prix', 'playoff*',
      'super bowl', 'world cup', 'draftkings', 'fanduel', 'betmgm', 'caesars',
      'bet365', 'betrivers', 'pointsbet'
    ]
  },
  {
    href: '/restaurants-nightlife',
    label: 'Dining & Nightlife',
    title: 'Dining & Nightlife',
    summary: "Steakhouses, chef's tables, rooftop lounges and the clubs worth the queue.",
    cta: 'Reserve a Table',
    keywords: [
      'restaurant', 'dine', 'dining', 'dinner', 'lunch', 'brunch', 'breakfast',
      'eat', 'food', 'cuisine', 'chef', 'michelin', 'steakhouse', 'sushi',
      'omakase', 'seafood', 'tasting menu', 'nightlife', 'nightclub', 'night club',
      'club', 'bar', 'lounge', 'cocktail', 'drinks', 'dj', 'rooftop',
      'reservation', 'book a table', 'table for'
    ]
  },
  {
    href: '/vacation-rentals',
    label: 'Villas & Stays',
    title: 'Villas & Stays',
    summary: 'Private villas, penthouses and premium residences with concierge service.',
    cta: 'Browse Stays',
    keywords: [
      'villa', 'stay*', 'vacation rental', 'rental home', 'holiday home',
      'residence', 'mansion', 'penthouse', 'apartment', 'condo', 'airbnb',
      'accommodation', 'guest house', 'beach house', 'estate', 'bedroom',
      'sleeps', 'where to stay', 'place to stay'
    ]
  },
  {
    href: '/experiences',
    label: 'Experiences',
    title: 'Miami Experiences',
    summary: 'Adrenaline activities, excursions and days out worth clearing the calendar for.',
    cta: 'See Experiences',
    keywords: [
      'experience', 'adrenaline', 'skydiv*', 'balloon', 'hot air balloon',
      'helicopter', 'jet ski', 'jetski', 'airboat', 'everglades', 'speedboat',
      'parasail*', 'atv', 'thrill', 'adventure', 'excursion', 'activity',
      'activities', 'things to do', 'bucket list'
    ]
  },
  {
    href: '/events',
    label: 'Events',
    title: 'Events & Tickets',
    summary: 'Concerts, shows and VIP experiences, including front-row and backstage access.',
    cta: 'View Tickets',
    keywords: [
      // 'shows' and not 'show': bare "show" is overwhelmingly the verb
      // ("show me the shop"), and it was hijacking unrelated requests.
      'event', 'concert', 'shows', 'live show', 'comedy show', 'ticket',
      'festival', 'vip', 'live music', 'gig', 'comedy', 'theater', 'theatre',
      'residency', 'lineup', 'tour dates', 'front row', 'backstage'
    ]
  },
  {
    href: '/travel',
    label: 'Travel',
    title: 'Travel & Getaways',
    summary: 'Destinations, flights and hotels curated across the ecosystem.',
    cta: 'Plan Travel',
    keywords: [
      'travel*', 'trip', 'destination', 'flight', 'fly', 'flying', 'airfare',
      'airline', 'airport', 'vacation', 'holiday', 'getaway', 'itinerary',
      'hotel', 'resort', 'weekend', 'city break', 'tour', 'sightseeing',
      'miami', 'dubai', 'paris', 'ibiza', 'monaco', 'tulum', 'aspen', 'maldives',
      'st barts', 'mykonos'
    ]
  },
  {
    href: '/stores',
    label: 'Shopping',
    title: 'The Shopping Catalog',
    summary: 'Fashion, electronics, beauty and home — every brand with verified codes.',
    cta: 'Open the Catalog',
    keywords: [
      'shop*', 'store', 'catalog', 'catalogue', 'brand', 'fashion', 'clothing',
      // 'watches'/'wristwatch' and not 'watch': bare "watch" is usually the
      // verb ("watch the game"), which belongs nowhere near the catalog.
      'apparel', 'sneaker', 'shoes', 'watches', 'wristwatch', 'jewelry',
      'jewellery', 'handbag',
      'electronics', 'beauty', 'cosmetics', 'perfume', 'furniture', 'outlet',
      'sale', 'discount*', 'deal', 'bargain', 'nike', 'adidas', 'amazon',
      'gucci', 'prada', 'louis vuitton', 'chanel', 'rolex'
    ]
  },
  {
    href: '/coupons',
    label: 'Coupons',
    title: 'Verified Coupons',
    summary: 'Live promo codes and vouchers, each one checked and dated.',
    cta: 'Get Promo Codes',
    keywords: [
      'coupon*', 'promo code', 'promo', 'voucher', 'discount code', 'redeem',
      'cashback', 'savings', 'save money', 'offer', 'promotion*'
    ]
  }
];

const SUGGESTION_TOPICS = TOPIC_DEFINITIONS.map((topic) => ({
  ...topic,
  // Compiled once at module load - the matcher runs on every reply.
  patterns: topic.keywords.map(compileKeyword)
}));

/** Every route this matcher can hand a guest. Exported so tests can assert
 *  each one is a real page rather than a 404 waiting to happen. */
export const SUGGESTION_ROUTES = TOPIC_DEFINITIONS.map((topic) => topic.href);

/** The ecosystem sections, for UI that lists them directly (the Discovery
 *  Room's "jump straight in" row). Derived from the same table as the
 *  matcher so a new section cannot appear in one place and not the other. */
export const SECTIONS = TOPIC_DEFINITIONS.map(({ href, label, title, summary, cta }) => ({
  href,
  label,
  title,
  summary,
  cta
}));

/**
 * Rank sections against a guest's request.
 *
 * Ranking is TIERED, not a weighted sum: any section the guest named
 * outranks every section mentioned only in the reply. A simple weight is not
 * enough - a chatty answer listing "promo codes, coupons and discount deals
 * in the store catalog" piles up more keyword hits than the single "yacht"
 * the guest actually typed, and would bury it. Within each tier, more hits
 * win; ties fall back to registry order.
 *
 * @param {string} text  The guest's own words - the primary signal.
 * @param {number|{limit?:number, reply?:string}} [options]
 *   A bare number keeps the old `matchSuggestions(text, limit)` call shape.
 *   `reply` lets the concierge's answer add sections the guest did not name.
 * @returns {Array<object>} Matched topic records, best first.
 */
function rankTopics(text, options = {}) {
  const { limit = 3, reply = '' } = typeof options === 'number' ? { limit: options } : options || {};

  const query = String(text || '');
  const secondary = String(reply || '');
  if (!query && !secondary) return [];

  const scored = [];
  for (const topic of SUGGESTION_TOPICS) {
    let queryHits = 0;
    let replyHits = 0;
    for (const pattern of topic.patterns) {
      if (query && pattern.test(query)) queryHits += 1;
      else if (secondary && pattern.test(secondary)) replyHits += 1;
    }
    if (queryHits || replyHits) scored.push({ topic, queryHits, replyHits });
  }

  // Query hits first (so any section the guest named outranks one the reply
  // only mentioned), then reply hits. Array#sort is stable, so sections that
  // tie on both fall back to registry order.
  scored.sort((a, b) => b.queryHits - a.queryHits || b.replyHits - a.replyHits);
  return scored.slice(0, Math.max(0, limit)).map((entry) => entry.topic);
}

/** Compact chips: `{ href, label }`. */
export function matchSuggestions(text, options = {}) {
  return rankTopics(text, options).map(({ href, label }) => ({ href, label }));
}

/**
 * Rich navigation frames: `{ href, label, title, summary, cta }`.
 *
 * Defaults to 2 - a card is a large element, and three of them below every
 * reply buries the conversation.
 */
export function matchActionCards(text, options = {}) {
  const normalized = typeof options === 'number' ? { limit: options } : { limit: 2, ...(options || {}) };
  return rankTopics(text, normalized).map(({ href, label, title, summary, cta }) => ({
    href,
    label,
    title,
    summary,
    cta
  }));
}
