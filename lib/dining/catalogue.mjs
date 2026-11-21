import {DINING_PHOTOS} from './photos.mjs';
import {SHEET_ROWS, SHEET_COLUMNS, SHEET_DATE} from './bookingSheet.mjs';
import {MICHELIN, EDITORIAL_VIBES, EDITORIAL_COLLECTIONS, CONCIERGE_PICKS} from './editorial.mjs';
import {platformForUrl} from './gateway.mjs';
import {priceBuckets} from './filters.mjs';

/** Facts come from the owner's booking sheet; URLs identify evidence, not permission to reuse photography. */
export const VERIFIED_ON = SHEET_DATE;

// The 27 venues already on the site keep their ids, slugs, category, cuisine and
// features. Only the sheet's facts (address, website, booking and map links) change.
// name in the sheet → [id, category, cuisine, features]
const EXISTING = {
 'Komodo':['komodo','restaurant','Asian',['fine-dining','private']],
 'Papi Steak':['papi-steak','restaurant','Steakhouse',['fine-dining','private']],
 'Sexy Fish':['sexy-fish','restaurant','Japanese',['fine-dining','private']],
 'Carbone':['carbone','restaurant','Italian',['fine-dining','private']],
 'Prime 112':['prime-112','restaurant','Steakhouse',['fine-dining','private']],
 "Joe's Stone Crab":['joes-stone-crab','restaurant','Seafood',['private']],
 'LIV':['liv','nightlife',null,['club','vip']],
 'E11EVEN':['e11even','nightlife',null,['club','vip']],
 'Club Space':['club-space','nightlife',null,['club','vip']],
 'Rosa Sky':['rosa-sky','nightlife',null,['rooftop','lounge','vip']],
 'Sugar Rooftop':['sugar-rooftop','nightlife',null,['rooftop','lounge']],
 'Mandolin Aegean Bistro':['mandolin','restaurant','Aegean',['outdoor']],
 'Versailles':['versailles','restaurant','Cuban',['casual']],
 'Rusty Pelican':['rusty-pelican','restaurant','Seafood',['waterfront','private']],
 'COTE Miami':['cote','restaurant','Korean',['fine-dining','private']],
 'LPM Restaurant & Bar':['lpm','restaurant','French Mediterranean',['fine-dining','private']],
 'MILA':['mila','restaurant','MediterrAsian',['rooftop','vip','private']],
 'Nikki Beach Miami Beach':['nikki-beach','restaurant','International',['beach-club','outdoor']],
 "Michael's Genuine Food & Drink":['michaels-genuine','restaurant','American',['casual']],
 'Glass & Vine':['glass-and-vine','restaurant','American',['outdoor','private']],
 'Makoto':['makoto','restaurant','Japanese',['outdoor']],
 'The Surf Club Restaurant':['surf-club','restaurant','Continental',['fine-dining','private']],
 'Fontana':['fontana','restaurant','Italian',['outdoor']],
 'Il Mulino New York':['il-mulino','restaurant','Italian',['waterfront','private']],
 'DOYA':['doya','restaurant','Aegean',['private']],
 'Ball & Chain':['ball-and-chain','nightlife',null,['lounge','live-music']],
 'Midline Miami':['midline','nightlife',null,['club']]
};

// New venues: the sheet's category decides category and features. Cuisine is set
// only when the sheet's category is itself a cuisine; nothing else is inferred.
const SHEET_CATEGORY = {
 'Fine dining':['restaurant',null,['fine-dining']],
 'Restaurant':['restaurant',null,[]],
 'Casual':['restaurant',null,['casual']],
 'Steakhouse':['restaurant','Steakhouse',[]],
 'Japanese':['restaurant','Japanese',[]],
 'Italian':['restaurant','Italian',[]],
 'Seafood':['restaurant','Seafood',[]],
 'Beach club':['restaurant',null,['beach-club']],
 'Rooftop':['nightlife',null,['rooftop','lounge']],
 'Nightclub':['nightlife',null,['club']],
 'Live music':['nightlife',null,['live-music']]
};

/** "L'Atelier de Joël Robuchon" → "latelier-de-joel-robuchon". */
export const venueId = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
 .replace(/['’]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const describe = (category, features) => category === 'nightlife' ? 'Music, cocktails and a night out in Miami.'
 : features.includes('waterfront') ? 'Dining with coastal views.'
 : features.includes('outdoor') ? 'A welcoming table in an outdoor setting.'
 : features.includes('private') ? 'Dining and private celebrations in Miami.'
 : 'Discover a different side of Miami dining.';

const SUNSET = ['rooftop', 'waterfront', 'beach-club'];

/** @param {ReadonlyArray<string|null>} row */
export function sheetRecord(row) {
 return Object.fromEntries(SHEET_COLUMNS.map((column, index) => [column, row[index]]));
}

function build(row) {
 const sheet = sheetRecord(row);
 const known = EXISTING[sheet.name];
 if (sheet.section === 'existing' && !known) throw Error('Existing venue missing from the catalogue map: ' + sheet.name);
 const mapped = SHEET_CATEGORY[sheet.category];
 if (!known && !mapped) throw Error('Unknown sheet category: ' + sheet.category);
 const [id, category, cuisine, features] = known || [venueId(sheet.name), ...mapped];
 const bookingVerified = sheet.verified === 'yes';
 const platform = sheet.bookingUrl ? platformForUrl(sheet.bookingUrl, sheet.website) : null;
 if (sheet.bookingUrl && bookingVerified && !platform) throw Error('Booking URL on an unknown host: ' + sheet.name);
 const bookingUrl = bookingVerified ? sheet.bookingUrl : null;
 const channels = [];
 if (bookingUrl) channels.push({provider:platform, externalId:id, href:bookingUrl, evidence:bookingUrl});
 if (sheet.website && !(platform === 'venue' && bookingUrl)) channels.push({provider:'venue', externalId:id, href:sheet.website, evidence:sheet.website});
 const michelin = MICHELIN[id] || null;
 const collections = new Set(EDITORIAL_COLLECTIONS[id] || []);
 if (michelin) collections.add('michelin');
 if (priceBuckets(sheet.price).some(level => level <= 2)) collections.add('budget');
 if (features.some(feature => SUNSET.includes(feature))) collections.add('sunset');
 return Object.freeze({
  id, name:sheet.name, slug:id + '-miami', category, neighborhood:sheet.neighborhood, address:sheet.address, cuisine,
  features:Object.freeze([...features]), website:sheet.website, status:'verified', verifiedOn:VERIFIED_ON,
  sources:Object.freeze([sheet.website, bookingUrl, sheet.mapsUrl].filter(Boolean)),
  channels:Object.freeze(channels.map(Object.freeze)),
  image:DINING_PHOTOS[id]?.src || null, photo:DINING_PHOTOS[id] || null,
  description:describe(category, features),
  sheetSection:sheet.section, sheetCategory:sheet.category,
  price:sheet.price, bookingVerified, bookingUrl, bookingPlatform:bookingUrl ? platform : null,
  bookingUrlUnverified:bookingVerified ? null : sheet.bookingUrl, mapsUrl:sheet.mapsUrl,
  michelin:michelin?.level || null, michelinSource:michelin?.source || null,
  greenStar:Boolean(michelin?.green), greenStarSource:michelin?.greenSource || null,
  vibe:Object.freeze([...(EDITORIAL_VIBES[id] || [])]), collections:Object.freeze([...collections]),
  conciergePick:CONCIERGE_PICKS.includes(id)
 });
}

/** @typedef {ReturnType<typeof build>} Venue */
/** @type {ReadonlyArray<Venue>} */
export const CATALOGUE = Object.freeze(SHEET_ROWS.map(build));
