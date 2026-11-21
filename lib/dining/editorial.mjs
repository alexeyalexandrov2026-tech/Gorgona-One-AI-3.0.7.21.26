// Editorial layer for the dining catalogue: Miami Elio's own judgement, kept apart
// from the owner's booking spreadsheet (bookingSheet.mjs) so the two never mix.
//
// - michelin: only distinctions published on guide.michelin.com, with the page that
//   states them. Nothing here is a rating of ours.
// - vibe and the hand-picked collections (art-basel, date-night) are editorial tags,
//   reviewed by the owner in the pull request.
// - budget, sunset and michelin collections are derived in catalogue.mjs from price,
//   features and the Michelin field, never assigned by hand.

export const MICHELIN_SOURCES = Object.freeze({
  stars2026: 'https://guide.michelin.com/us/en/article/michelin-guide-ceremony/every-michelin-starred-restaurant-in-florida-for-2026-and-the-year-s-key-trends-copy1',
  bib2026: 'https://guide.michelin.com/us/en/article/michelin-guide-ceremony/florida-s-most-affordable-restaurants-in-2026-copy1',
  losFelixGreen: 'https://guide.michelin.com/us/en/article/sustainable-gastronomy/sustainable-dining-one-star-green-star-los-felix-miami-florida'
});

export const VIBES = Object.freeze(['romantic', 'party', 'family', 'business']);
export const MICHELIN_LEVELS = Object.freeze(['2star', '1star', 'bib', 'green']);
export const COLLECTIONS = Object.freeze(['art-basel', 'date-night', 'sunset', 'michelin', 'budget']);

const star = level => ({level, source: MICHELIN_SOURCES.stars2026});
const bib = {level: 'bib', source: MICHELIN_SOURCES.bib2026};

/** MICHELIN Guide Florida 2026 (revealed 2026-05-28), checked on guide.michelin.com 2026-11-21. */
export const MICHELIN = Object.freeze({
  'latelier-de-joel-robuchon': star('2star'),
  ariete: star('1star'), 'boia-de': star('1star'), cote: star('1star'), elcielo: star('1star'),
  hiden: star('1star'), 'le-jardinier': star('1star'), mutra: star('1star'), ogawa: star('1star'),
  shingo: star('1star'), 'stubborn-seed': star('1star'), 'surf-club': star('1star'),
  // Star outranks Green Star in the single `michelin` field; the Green Star is kept as a flag.
  'los-felix': {...star('1star'), green: true, greenSource: MICHELIN_SOURCES.losFelixGreen},
  'barra-callao': bib, 'la-natural': bib, mandolin: bib, 'michaels-genuine': bib, 'zitz-sum': bib
});

const list = text => text.split(/\s+/).filter(Boolean);
const tagged = (ids, tag, into) => { for (const id of list(ids)) (into[id] ||= []).push(tag); return into; };

const vibes = {};
tagged('mandolin glass-and-vine fontana ariete le-jardinier boia-de macchialina luca-osteria amara-at-paraiso bouchon-bistro rosa-sky surf-club los-felix palma latelier-de-joel-robuchon', 'romantic', vibes);
tagged('liv e11even club-space midline floyd twist papi-steak komodo sexy-fish nikki-beach mila ball-and-chain strawberry-moon sugar-rooftop watr-at-the-1 serena-rooftop', 'party', vibes);
tagged('versailles joes-stone-crab michaels-genuine rice-mediterranean-kitchen el-rey-de-las-fritas frankie-and-wallys apocalypse-bbq el-bagel bombay-darbar clives-cafe zitz-sum tokyo-tuna rusty-pelican', 'family', vibes);
tagged('prime-112 cote lpm il-mulino klaw makoto surf-club elcielo osaka mottai', 'business', vibes);

const picked = {};
// Art Basel Miami Beach runs in early December; these sit by the Design District, Wynwood and Miami Beach venues.
tagged('latelier-de-joel-robuchon le-jardinier cote mandolin michaels-genuine mother-wolf torno-subito doya hiden carbone', 'art-basel', picked);
tagged('mandolin glass-and-vine fontana ariete le-jardinier boia-de macchialina luca-osteria amara-at-paraiso bouchon-bistro surf-club los-felix', 'date-night', picked);

export const EDITORIAL_VIBES = Object.freeze(Object.fromEntries(Object.entries(vibes).map(([id, v]) => [id, Object.freeze(v)])));
export const EDITORIAL_COLLECTIONS = Object.freeze(Object.fromEntries(Object.entries(picked).map(([id, v]) => [id, Object.freeze(v)])));

/** One editorial "Concierge picks" strip; every pick has a checked booking link. */
export const CONCIERGE_PICKS = Object.freeze(list('joes-stone-crab latelier-de-joel-robuchon mandolin cote boia-de rosa-sky'));
