// ===========================================================================
// Gorgona One — section registry + intent matcher.
//
// The single source of truth for "which part of the ecosystem does this
// request belong to". It powers both:
//   * the compact chips under a reply  -> matchSuggestions()
//   * the rich navigation cards        -> matchActionCards()
//
// CLIENT-SAFE ON PURPOSE. This module never touches the system prompt or the
// inventory digest, so the browser can run the exact same matcher the server
// does. That is what lets the concierge still offer working navigation when
// the AI backend - or the whole server - is unreachable: the fallback is not
// a second, drifting implementation, it is this one.
//
// MULTILINGUAL. Keywords come from three places: the English table below,
// the section names already translated in lib/i18n.js (harvested for all 16
// locales), and the curated per-language phrasing in lib/aiSuggestionsI18n.js.
// A guest typing "нужна машина" or "游艇" gets the same frames as one typing
// "I need a car".
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

import { translations } from './i18n';
import { LOCALIZED_KEYWORDS } from './aiSuggestionsI18n';

// Unicode-aware boundaries. \b is ASCII-only, which would misfire the moment
// a keyword or a guest's phrasing carries an accent.
const WORD_START = '(?<![\\p{L}\\p{N}])';
const WORD_END = '(?![\\p{L}\\p{N}])';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Chinese, Japanese and Korean. These scripts do not put spaces between
// words, and Korean glues particles straight onto the noun ("렌터카가" =
// rental car + subject marker), so a boundary-anchored pattern would never
// fire on real input. For them - and only for them - we match as a substring.
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/;

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

  if (CJK.test(raw)) return new RegExp(body, 'iu');

  // A trailing '*' matches inflected forms from one entry - essential for
  // Russian/Polish/Turkish, where "яхт*" covers яхта/яхты/яхту/яхте.
  // Otherwise deliberately `s?` and not `(?:s|es)?`: the latter turns "car"
  // into a match for "cares".
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

// --- Multilingual vocabulary ------------------------------------------------
//
// The English table above is only the starting point. A guest browsing in
// Russian types "нужна машина", not "I need a car", so the matcher has to
// speak every language the switcher offers or the frames simply never appear
// outside English.
//
// Source 1 - HARVESTED from lib/i18n.js. These i18n paths already hold the
// section's name in all 16 locales, so the matcher inherits every
// translation the UI has and can never fall behind it: add a locale to i18n
// and the cards speak it the same day, with no work here.
const I18N_KEYWORD_SOURCES = {
  '/travel': ['nav.travel', 'discovery.travel', 'discovery.flights', 'discovery.hotels'],
  '/rentals': ['nav.rentals', 'nav.cars', 'discovery.carRentals', 'discovery.cars', 'rentals.pill'],
  '/yachts': ['nav.yachts', 'discovery.yachts', 'yachts.pill'],
  '/stores': [
    'nav.stores',
    'discovery.shopping',
    'discovery.fashion',
    'discovery.beauty',
    'discovery.electronics'
  ],
  '/coupons': ['nav.coupons', 'discovery.promoCodes'],
  '/sportsbook': ['nav.sportsbook', 'discovery.sports', 'discovery.sportsbooks', 'sportsbookPage.pill'],
  '/events': ['nav.events', 'discovery.events', 'discovery.entertainment'],
  '/restaurants-nightlife': ['discovery.food', 'discovery.restaurants', 'restaurantsNightlife.pill'],
  '/vacation-rentals': ['nav.villas', 'vacationRentals.pill'],
  '/experiences': ['experiences.pill']
};

// Merging 16 languages into one flat matcher means a word can be a section
// name in one language and something unrelated in another. The matcher does
// not know which language the guest typed, so these few are dropped from the
// non-English vocabulary. Applied ONLY to harvested/curated additions - the
// English table above stays exactly as written and tested.
const AMBIGUOUS_WITH_ENGLISH = new Set([
  // "Mode" is fashion in German and French; in English it is "dark mode".
  'mode',
  // "Show" is a concert in Portuguese; in English it is the verb that starts
  // half of all requests ("show me the shop") - it was pulling those to
  // Events. The plural "shows" is unambiguous and is kept.
  'show'
]);

const readPath = (root, path) => path.split('.').reduce((node, key) => node?.[key], root);

function harvestFromI18n(href) {
  const paths = I18N_KEYWORD_SOURCES[href];
  if (!paths) return [];

  const found = new Set();
  for (const dictionary of Object.values(translations || {})) {
    for (const path of paths) {
      const value = readPath(dictionary, path);
      if (typeof value !== 'string') continue;
      const label = value.trim();
      // Multi-word labels ("Аренда авто") stay whole. Splitting them would
      // scatter generic words like "Luxury" or "Miami" across sections and
      // start matching requests that have nothing to do with them - the
      // curated table below is where natural phrasing is handled instead.
      if (label.length > 1) found.add(label.toLowerCase());
    }
  }
  return [...found];
}

// Source 2 - CURATED phrasing per language (lib/aiSuggestionsI18n.js).
function curatedFor(href) {
  const byLocale = LOCALIZED_KEYWORDS[href];
  if (!byLocale) return [];
  return [...new Set(Object.values(byLocale).flat())];
}

const SUGGESTION_TOPICS = TOPIC_DEFINITIONS.map((topic) => {
  const added = [...harvestFromI18n(topic.href), ...curatedFor(topic.href)].filter(
    (word) => !AMBIGUOUS_WITH_ENGLISH.has(word)
  );
  // English first so it wins ties; duplicates are collapsed.
  const keywords = [...new Set([...topic.keywords, ...added])];
  return {
    ...topic,
    keywords,
    // Compiled once at module load - the matcher runs on every reply.
    patterns: keywords.map(compileKeyword)
  };
});

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

/**
 * Compact chips: `{ href, label }`.
 *
 * Chips cover sections beyond the two rendered as full cards, so they must
 * localize on the same terms - otherwise a Russian thread showing two Russian
 * cards would trail an English chip.
 */
export function matchSuggestions(text, options = {}) {
  const locale = typeof options === 'object' && options ? options.locale : undefined;
  return rankTopics(text, options).map(({ href, label }) => ({
    href,
    label: (locale && locale !== 'en' && displayName(href, locale)) || label
  }));
}

// --- Localized card copy ----------------------------------------------------
//
// A card in a Russian UI must not read "Luxury Car Fleet / Explore Vehicles".
// The section NAME already exists in i18n for all 16 locales, so title and
// CTA are built from it rather than hand-translated here - they can never
// drift from the navigation the guest sees elsewhere on the site.
//
// The `summary` line stays ENGLISH IN EVERY LOCALE, by product decision: its
// vocabulary is the luxury segment's lingua franca - supercars, SUVs, VIP,
// penthouse, charter - which reads better untranslated to this audience than
// any localized equivalent would. Do not machine-translate these lines.
const DISPLAY_NAME_SOURCES = {
  '/travel': ['nav.travel'],
  // discovery.carRentals ("Аренда авто", "Mietwagen", "租车") before
  // nav.rentals ("Аренда", "Vermietungen"), which is generic enough to mean
  // any rental and reads as a mislabelled card on the car section.
  '/rentals': ['discovery.carRentals', 'nav.rentals', 'rentals.pill'],
  '/yachts': ['nav.yachts', 'yachts.pill'],
  '/stores': ['nav.stores'],
  '/coupons': ['nav.coupons'],
  '/sportsbook': ['nav.sportsbook', 'sportsbookPage.pill'],
  '/events': ['nav.events'],
  '/restaurants-nightlife': ['restaurantsNightlife.pill'],
  '/vacation-rentals': ['nav.villas', 'vacationRentals.pill'],
  '/experiences': ['experiences.pill']
};

function displayName(href, locale) {
  const dictionary = translations?.[locale];
  if (!dictionary) return null;
  for (const path of DISPLAY_NAME_SOURCES[href] || []) {
    const value = readPath(dictionary, path);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Rich navigation frames: `{ href, label, title, summary, cta }`.
 *
 * @param {string} text
 * @param {number|{limit?:number, reply?:string, locale?:string}} [options]
 *   `locale` renders the card in that UI language; omitted or 'en' keeps the
 *   authored English copy. Defaults to 2 cards - a frame is a large element,
 *   and three below every reply buries the conversation.
 */
export function matchActionCards(text, options = {}) {
  const normalized = typeof options === 'number' ? { limit: options } : { limit: 2, ...(options || {}) };
  const locale = normalized.locale;
  const localized = locale && locale !== 'en';
  const openWord = localized ? translations?.[locale]?.ai?.open : null;

  return rankTopics(text, normalized).map(({ href, label, title, summary, cta }) => {
    if (!localized) return { href, label, title, summary, cta };

    const name = displayName(href, locale);
    // No translation for this section in this locale - fall back to the
    // authored English card rather than shipping a half-translated one.
    if (!name) return { href, label, title, summary, cta };

    return {
      href,
      label: name,
      title: name,
      // Deliberately the English original on every locale - see above.
      summary,
      // The bare verb, NOT verb + section name. Concatenating the two
      // produced ungrammatical CTAs in most languages ("Открыть Аренда" needs
      // the accusative; German wants "Sportwetten öffnen", verb last). The
      // title directly above already names the section, so "Открыть →" is
      // both correct and unambiguous.
      cta: openWord || 'Open'
    };
  });
}
