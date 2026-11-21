import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SHEET_ROWS} from '../../lib/dining/bookingSheet.mjs';
import {CATALOGUE, sheetRecord} from '../../lib/dining/catalogue.mjs';
import {getVenues, getVenueBySlug} from '../../lib/restaurantsNightlifeData.js';
import {primaryAction, channelsFor, platformForUrl, BOOKING_HOSTS} from '../../lib/dining/gateway.mjs';
import {MICHELIN, EDITORIAL_VIBES, EDITORIAL_COLLECTIONS, CONCIERGE_PICKS, COLLECTIONS, VIBES, MICHELIN_LEVELS} from '../../lib/dining/editorial.mjs';
import {priceBuckets, readDiningParams, filterVenues, diningHref, diningFilterFor, hasActiveFilters} from '../../lib/dining/filters.mjs';
import {DINING_HANDOFF_COPY} from '../../lib/dining/copy.mjs';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';

const byName = new Map(CATALOGUE.map(venue => [venue.name, venue]));

test('the owner sheet is imported whole: 27 existing venues keep their routes and 48 new ones are added', () => {
  assert.equal(SHEET_ROWS.length, 75);
  assert.equal(CATALOGUE.filter(venue => venue.sheetSection === 'existing').length, 27);
  assert.equal(CATALOGUE.filter(venue => venue.sheetSection === 'new').length, 48);
  for (const slug of ['komodo-miami','papi-steak-miami','sexy-fish-miami','carbone-miami','prime-112-miami','joes-stone-crab-miami','liv-miami','e11even-miami','club-space-miami','rosa-sky-miami','sugar-rooftop-miami','mandolin-miami','versailles-miami','rusty-pelican-miami','cote-miami','lpm-miami','mila-miami','nikki-beach-miami','michaels-genuine-miami','glass-and-vine-miami','makoto-miami','surf-club-miami','fontana-miami','il-mulino-miami','doya-miami','ball-and-chain-miami','midline-miami'])
    assert.ok(getVenueBySlug(slug), slug);
});

test('sheet facts round-trip verbatim and an empty cell stays empty', () => {
  for (const row of SHEET_ROWS) {
    const sheet = sheetRecord(row), venue = byName.get(sheet.name);
    assert.ok(venue, sheet.name);
    assert.equal(venue.neighborhood, sheet.neighborhood);
    assert.equal(venue.address, sheet.address);
    assert.equal(venue.website, sheet.website);
    assert.equal(venue.price, sheet.price);
    assert.equal(venue.mapsUrl, sheet.mapsUrl);
    assert.equal(venue.bookingVerified, sheet.verified === 'yes');
    assert.equal(venue.bookingUrl ?? venue.bookingUrlUnverified, sheet.bookingUrl);
  }
});

test('the main action is the venue booking page when checked, otherwise Google Maps, never a Miami Elio page', () => {
  for (const venue of getVenues()) {
    const action = primaryAction(venue);
    assert.ok(action, venue.id);
    const url = new URL(action.href);
    assert.equal(url.protocol, 'https:');
    assert.ok(!/gorgona-one|miami-?elio/i.test(url.hostname), venue.id);
    if (venue.bookingVerified && venue.bookingUrl) {
      assert.equal(action.kind, 'book', venue.id);
      assert.equal(action.href, new URL(venue.bookingUrl).href);
      assert.equal(channelsFor(venue).filter(channel => channel.href === action.href).length, 1, venue.id);
    } else {
      assert.equal(action.kind, 'maps', venue.id);
      assert.equal(url.hostname, 'www.google.com');
    }
  }
  assert.equal(CATALOGUE.filter(venue => primaryAction(venue).kind === 'maps').length, 17);
  // Hiden and Ogawa have Tock links, but the sheet marks them unchecked: Maps, link kept in data only.
  for (const id of ['hiden', 'ogawa', 'rusty-pelican']) {
    const venue = CATALOGUE.find(item => item.id === id);
    assert.equal(primaryAction(venue).kind, 'maps');
    assert.ok(venue.bookingUrlUnverified);
    assert.ok(!venue.channels.some(channel => channel.href === venue.bookingUrlUnverified));
  }
});

test('booking links carry no affiliate parameters and every channel stays on an exact allowed host', () => {
  for (const venue of getVenues()) for (const channel of channelsFor(venue)) {
    assert.equal(channel.affiliate, false);
    const url = new URL(channel.href);
    for (const key of url.searchParams.keys()) assert.ok(!/^(aff|affiliate|affid|ref|referrer|utm_.*|partner|clickid)$/i.test(key), `${venue.id}: ${key}`);
  }
  assert.equal(platformForUrl('https://www.opentable.com.evil.test/r/x'), null);
  assert.equal(platformForUrl('https://resy.com/cities/miami-fl/venues/x'), 'resy');
  assert.equal(platformForUrl('https://www.naoemiami.com/reservations.htm', 'https://www.naoemiami.com/'), 'venue');
  assert.ok(Object.values(BOOKING_HOSTS).every(hosts => hosts.every(host => !host.startsWith('.'))));
});

test('MICHELIN values come only from guide.michelin.com and editorial tags point at real venues', () => {
  const ids = new Set(CATALOGUE.map(venue => venue.id));
  for (const [id, entry] of Object.entries(MICHELIN)) {
    assert.ok(ids.has(id), id);
    assert.ok(MICHELIN_LEVELS.includes(entry.level));
    assert.equal(new URL(entry.source).hostname, 'guide.michelin.com');
    if (entry.green) assert.equal(new URL(entry.greenSource).hostname, 'guide.michelin.com');
  }
  for (const venue of CATALOGUE) {
    assert.equal(Boolean(venue.michelin), Boolean(venue.michelinSource), venue.id);
    assert.equal(venue.collections.includes('michelin'), Boolean(venue.michelin), venue.id);
    assert.ok(venue.vibe.every(vibe => VIBES.includes(vibe)), venue.id);
    assert.ok(venue.collections.every(collection => COLLECTIONS.includes(collection)), venue.id);
  }
  for (const id of [...Object.keys(EDITORIAL_VIBES), ...Object.keys(EDITORIAL_COLLECTIONS), ...CONCIERGE_PICKS]) assert.ok(ids.has(id), id);
  for (const id of CONCIERGE_PICKS) assert.equal(primaryAction(CATALOGUE.find(venue => venue.id === id)).kind, 'book', id);
  assert.equal(CATALOGUE.find(venue => venue.id === 'latelier-de-joel-robuchon').michelin, '2star');
});

test('budget and sunset collections are derived from the sheet, not assigned', () => {
  for (const venue of CATALOGUE) {
    assert.equal(venue.collections.includes('budget'), priceBuckets(venue.price).some(level => level <= 2), venue.id);
    assert.equal(venue.collections.includes('sunset'), venue.features.some(feature => ['rooftop','waterfront','beach-club'].includes(feature)), venue.id);
  }
});

test('filters read only known values and match price ranges, collections and MICHELIN levels', () => {
  assert.deepEqual(priceBuckets('$$$-$$$$'), [3, 4]);
  assert.deepEqual(priceBuckets('$'), [1]);
  assert.deepEqual(priceBuckets(null), []);
  assert.deepEqual(priceBuckets('about $40'), []);
  const params = readDiningParams({collection:'budget', price:'$$', vibe:'nope', michelin:'1star', category:'restaurant', q:'  KOMODO '});
  assert.equal(params.vibe, '');
  assert.equal(params.q, 'komodo');
  const venues = getVenues();
  assert.ok(filterVenues(venues, readDiningParams({price:'$$$'})).some(venue => venue.price === '$$$-$$$$'));
  assert.ok(filterVenues(venues, readDiningParams({michelin:'green'})).every(venue => venue.greenStar));
  assert.ok(filterVenues(venues, readDiningParams({collection:'michelin', category:'restaurant'})).every(venue => venue.michelin && venue.category === 'restaurant'));
  assert.equal(filterVenues(venues, readDiningParams({})).length, venues.length);
  assert.equal(diningHref('/restaurants-nightlife', readDiningParams({category:'nightlife'}), {collection:'sunset'}), '/restaurants-nightlife?category=nightlife&collection=sunset');
  assert.equal(diningHref('/restaurants-nightlife', readDiningParams({})), '/restaurants-nightlife');
  assert.equal(hasActiveFilters(readDiningParams({category:'restaurant'})), false);
  assert.equal(diningFilterFor('романтический ужин'), '/restaurants-nightlife?collection=date-night');
  assert.equal(diningFilterFor('dinner in Brickell'), '/restaurants-nightlife');
});

test('hand-off copy is complete in all sixteen languages and never promises a confirmation', () => {
  const keys = Object.keys(DINING_HANDOFF_COPY.en);
  for (const language of SUPPORTED_LANGUAGES) {
    const copy = DINING_HANDOFF_COPY[language.code];
    assert.ok(copy, language.code);
    assert.deepEqual(Object.keys(copy), keys);
    for (const value of Object.values(copy)) assert.ok(value.trim());
    assert.ok(copy.bookOn.includes('{platform}'), language.code);
    assert.ok(copy.askPrompt.includes('{name}'), language.code);
    assert.ok(copy.disclaimer.includes('Miami Elio'), language.code);
    if (language.code !== 'en') assert.notEqual(copy.disclaimer, DINING_HANDOFF_COPY.en.disclaimer);
  }
  assert.equal(DINING_HANDOFF_COPY.ru.disclaimer, 'Бронь происходит на сайте ресторана. Miami Elio не подтверждает столики.');
  assert.equal(DINING_HANDOFF_COPY.ru.askAi, 'Спросить ИИ-консьержа');
});
