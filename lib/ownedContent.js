import { getRentals } from './rentalsData.js';
import { getYachts } from './yachtsData.js';
import { getVacationRentals } from './vacationRentalsData.js';
import { getExperiences } from './experiencesData.js';
import { getVenues } from './restaurantsNightlifeData.js';
import { allDeals } from './dealsData.js';
import { getTranslation } from './i18n.js';
import { savedListing, savedMessage, savedPrice, savedSource } from './savedCopy.js';

const catalogs = [
  ['cars','rentals',getRentals], ['yachts','yachts',getYachts],
  ['stays','vacation-rentals',getVacationRentals],
  ['experiences','experiences',getExperiences], ['venues','restaurants-nightlife',getVenues]
];
const records = new Map(catalogs.flatMap(([world,route,getter]) => getter().map(record => [`/${route}/${record.slug}`,{world,record}])));
const stores = new Map(allDeals.map(record => [`/brands/${record.slug}`,record]));
const join = parts => parts.filter(Boolean).join(' · ');
const camel = slug => slug.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());

function originalSubtitle(world,r) {
  if (world === 'cars') return join([r.category,r.location,r.dailyPrice && `${r.dailyPrice}/day`]);
  if (world === 'yachts') return join([r.length,r.capacity && `up to ${r.capacity} guests`,r.location]);
  if (world === 'stays') return join([r.bedrooms && `${r.bedrooms} BR`,r.guests && `sleeps ${r.guests}`,r.location]);
  if (world === 'experiences') return join([r.duration,r.location]);
  return r.location;
}
function translatedSubtitle(locale,world,r) {
  const value = source => savedSource(locale,source);
  const count = n => typeof n === 'number' ? new Intl.NumberFormat(locale).format(n) : value(n);
  if (world === 'cars') return join([savedMessage(locale,`worlds.categories.${r.category}`),r.location,r.dailyPrice && savedSource(locale,'Daily rate: {rate}',{rate:savedPrice(locale,r.dailyPrice)})]);
  if (world === 'yachts') {
    const feet = r.length?.match(/^(\d+) ft$/);
    const length = feet ? new Intl.NumberFormat(locale,{style:'unit',unit:'foot',unitDisplay:'short'}).format(Number(feet[1])) : r.length;
    return join([length,r.capacity && savedSource(locale,'Guest capacity: {count}',{count:count(r.capacity)}),r.location]);
  }
  if (world === 'stays') return join([r.bedrooms && savedSource(locale,'Bedrooms: {count}',{count:count(r.bedrooms)}),r.guests && savedSource(locale,'Guests: {count}',{count:count(r.guests)}),r.location]);
  if (world === 'experiences') return join([value(r.duration),r.location]);
  return r.location;
}

// Display adapter only: callbacks, search scores, stored result objects, URLs
// and identities keep the original values. Supplier/user records are not
// eligible simply because their text resembles a catalog entry.
export function localizeOwnedResult(locale,item) {
  if (!item || item.type === 'Event' || String(item.href).startsWith('/events/')) return item;
  const own = records.get(item.href), store = stores.get(item.href);
  const t = getTranslation(locale);
  const display = {...item};
  if (own) {
    const {world,record} = own;
    if (item.title === record.title) display.title = savedListing(locale,record,'title');
    for (const field of ['description','desc','summary']) if (item[field] === record.description) display[field] = savedListing(locale,record);
    if (item.subtitle === originalSubtitle(world,record)) display.subtitle = translatedSubtitle(locale,world,record);
    display.type = ({cars:t.nav.cars,yachts:t.nav.yachts,stays:t.nav.villas,experiences:t.experiences.pill,venues:record.category === 'nightlife' ? t.restaurantsNightlife.nightlife : t.restaurantsNightlife.restaurants})[world];
  } else if (store && item.title === store.name) {
    if (item.subtitle === join([store.discount,store.category])) display.subtitle = join([savedSource(locale,store.discount),t.categories[camel(store.category)] || store.category]);
    display.type = t.nav.stores;
  } else if (['World','Category','Destination'].includes(item.type)) {
    for (const field of ['title','subtitle']) display[field] = savedSource(locale,item[field]);
    display.type = savedSource(locale,item.type);
  }
  return display;
}
