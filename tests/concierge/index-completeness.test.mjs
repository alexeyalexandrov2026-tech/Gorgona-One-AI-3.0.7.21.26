import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from './load.cjs';

const { getEcosystemIndex } = load('lib/ai/ecosystemIndex.js');
const { searchEcosystem } = load('lib/ai/intent.js');
const { listingCards, carModelFamily } = load('lib/ai/listingCards.mjs');
const { safeNavigationHref, safeImage } = load('lib/ai/session.mjs');
const { getRentals } = load('lib/rentalsData.js');
const { getVenues, getVenueAudit } = load('lib/restaurantsNightlifeData.js');
const { EXPERIENCE_CARDS } = load('lib/experienceCards.mjs');
const { FLORIDA_PARK_GUIDES } = load('lib/floridaParks.mjs');
const { EVENT_CATEGORIES, EVENT_CATEGORY_GROUPS, LEAGUES, TEAMS } = load('lib/mockEventsData.js');
const { OVAGO_DEALS } = load('lib/ovagoDeals.mjs');
const { upcomingSeason } = load('lib/seasonData.js');
const { getYachts } = load('lib/yachtsData.js');
const { getVacationRentals } = load('lib/vacationRentalsData.js');
const { getDynamicEntities, peekDynamicEntities, clearDynamicEntitiesCache, ENABLED_PARTNER_WORLDS } = load('lib/server/conciergeIndex.mjs');

test('every canonical catalogue card is present in ecosystemIndex with safe href, safe image and searchable text', () => {
  const index = getEcosystemIndex();
  const byId = new Map(index.map((entity) => [entity.id, entity]));
  const byHref = new Map(index.map((entity) => [entity.href, entity]));

  // Global safety invariants across 100% of indexed entities
  for (const entity of index) {
    assert.ok(entity.id && typeof entity.id === 'string', `missing id: ${JSON.stringify(entity)}`);
    assert.ok(safeNavigationHref(entity.href), `unsafe href for ${entity.id}: ${entity.href}`);
    assert.ok(typeof entity.text === 'string' && entity.text.trim().length > 0, `empty text for ${entity.id}`);
    if (entity.image !== null && entity.image !== undefined) {
      assert.ok(safeImage(entity.image), `unsafe image for ${entity.id}: ${entity.image}`);
    }
    assert.doesNotMatch(entity.href, /^\/(?:stores|coupons|sportsbook|brands)\b/i, `retired route indexed: ${entity.href}`);
  }

  // 1. Cars (290+)
  const rentals = getRentals();
  assert.ok(rentals.length >= 290, `expected >= 290 rentals, got ${rentals.length}`);
  for (const car of rentals) {
    const entity = byHref.get(`/rentals/${car.slug}`);
    assert.ok(entity, `missing car in index: ${car.slug}`);
    assert.equal(entity.type, 'Car');
    assert.ok(safeImage(entity.image), `missing/unsafe car image: ${car.slug}`);
  }

  // 2. Verified Venues (75) and strict exclusion of unverified records (story-miami)
  const verifiedVenues = getVenues().filter((v) => !v.status || v.status === 'verified');
  assert.ok(verifiedVenues.length >= 75, `expected >= 75 venues, got ${verifiedVenues.length}`);
  for (const venue of verifiedVenues) {
    const entity = byHref.get(`/restaurants-nightlife/${venue.slug}`);
    assert.ok(entity, `missing venue in index: ${venue.slug}`);
    assert.ok(['Restaurant', 'Nightlife'].includes(entity.type));
  }
  const unverified = getVenueAudit().filter((v) => v.status !== 'verified');
  assert.ok(unverified.length >= 1, 'expected quarantined story-miami in audit');
  for (const held of unverified) {
    assert.equal(byHref.has(`/restaurants-nightlife/${held.slug}`), false, `unverified venue leaked into index: ${held.slug}`);
  }

  // 3. Experiences (48 Headout + 20 Viator with our pages + 18 direct Viator = 86) + 49 Park Coasters
  assert.ok(EXPERIENCE_CARDS.length >= 86, `expected >= 86 experience cards, got ${EXPERIENCE_CARDS.length}`);
  for (const exp of EXPERIENCE_CARDS) {
    const entity = byId.get(`exp-${exp.id}`);
    assert.ok(entity, `missing experience in index: ${exp.id}`);
    assert.equal(entity.type, 'Experience');
    assert.ok(safeImage(entity.image), `unsafe experience image: ${exp.id}`);
    if (exp.kind === 'viator' && exp.direct) {
      assert.ok(entity.href.startsWith('/experiences#'), `direct Viator card must use safe internal anchor: ${exp.id}`);
    } else if (exp.kind === 'viator') {
      assert.equal(entity.href, `/experiences/viator/${exp.slug}`);
      assert.ok(entity.image.startsWith('https://media-cdn.tripadvisor.com/'), `Viator must use its Partner API product photo: ${exp.id}`);
    } else if (exp.kind === 'official') {
      assert.ok(entity.href.startsWith('/experiences#'), `official park must use safe internal anchor: ${exp.id}`);
    } else {
      assert.equal(entity.href, `/experiences/${exp.slug}`);
    }
  }
  // Check all 51 coasters across FLORIDA_PARK_GUIDES are indexed in their park's searchable text
  let coasterCount = 0;
  for (const [slug, guide] of Object.entries(FLORIDA_PARK_GUIDES)) {
    const entity = byHref.get(`/experiences/${slug}`);
    assert.ok(entity, `missing park guide host card: ${slug}`);
    for (const coaster of guide.coasters) {
      coasterCount += 1;
      assert.ok(entity.text.includes(coaster.toLowerCase().normalize('NFKC')), `coaster missing from ${slug}: ${coaster}`);
    }
    for (const rel of guide.related || []) {
      for (const coaster of rel.coasters || []) {
        coasterCount += 1;
        assert.ok(entity.text.includes(coaster.toLowerCase().normalize('NFKC')), `related coaster missing from ${slug}: ${coaster}`);
      }
    }
  }
  assert.ok(coasterCount >= 45, `expected >= 45 coasters indexed, got ${coasterCount}`);

  // Explicit Viator capacities (5606753p3 -> 13, 169162p2 -> 6)
  assert.equal(byHref.get('/experiences/viator/5606753p3')?.capacity, 13);
  assert.equal(byHref.get('/experiences/viator/169162p2')?.capacity, 6);

  // 4. Events: 22 categories + 2 groups (24 pages), leagues & teams indexed; hidden providers excluded
  for (const cat of EVENT_CATEGORIES) {
    const entity = byId.get(`event-cat-${cat.slug}`);
    assert.ok(entity, `missing event category: ${cat.slug}`);
    assert.equal(entity.href, `/events/category/${cat.slug}`);
    assert.ok(safeImage(entity.image), `missing image for event category: ${cat.slug}`);
  }
  for (const group of EVENT_CATEGORY_GROUPS) {
    const entity = byId.get(`event-group-${group.slug}`);
    assert.ok(entity, `missing event group: ${group.slug}`);
    assert.equal(entity.href, `/events/category/${group.slug}`);
    assert.ok(safeImage(entity.image), `missing image for event group: ${group.slug}`);
  }
  for (const team of TEAMS) {
    const league = LEAGUES.find((l) => l.slug === team.league);
    const entity = byId.get(`event-cat-${league.category}`);
    assert.ok(entity.text.includes(team.name.toLowerCase()), `team missing from event category: ${team.name}`);
  }
  const allText = index.map((e) => e.text).join(' ');
  for (const retired of ['ticketmaster', 'stubhub', 'rentcars', 'linksynergy', 'adrenaline 365', 'eatwith', 'draftkings', 'fanduel']) {
    assert.ok(!allText.includes(retired), `retired/hidden provider leaked into index: ${retired}`);
  }

  // 5. Ovago deals (3) indexed + contract check against untouched app/travel/ovago/page.js
  assert.equal(OVAGO_DEALS.length, 3);
  for (const deal of OVAGO_DEALS) {
    const entity = byId.get(deal.id);
    assert.ok(entity, `missing Ovago deal in index: ${deal.id}`);
    assert.equal(entity.href, '/travel/ovago');
    assert.ok(safeImage(entity.image));
  }
  const ovagoPage = fs.readFileSync(new URL('../../app/travel/ovago/page.js', import.meta.url), 'utf8');
  const pageLinks = [...ovagoPage.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(OVAGO_DEALS.map((d) => d.href), pageLinks, 'OVAGO_DEALS must stay byte-synced with app/travel/ovago/page.js');

  // 6. Upcoming season events indexed
  for (const ev of upcomingSeason(new Date())) {
    const entity = byId.get(`season-${ev.id}`);
    assert.ok(entity, `missing upcoming season event: ${ev.id}`);
    assert.ok(safeNavigationHref(entity.href));
  }

  // 7. Future-ready yacht / stay hooks
  for (const yacht of getYachts()) assert.ok(byHref.has(`/yachts/${yacht.slug}`));
  for (const stay of getVacationRentals()) assert.ok(byHref.has(`/vacation-rentals/${stay.slug}`));
});

test('brand-level car queries diversify across model families while specific models stay exact', () => {
  const lambos = listingCards('Найди Lamborghini на три дня', { locale: 'ru', sections: ['/rentals'] });
  assert.equal(lambos.length, 3);
  assert.ok(lambos.every((card) => /lamborghini/i.test(card.title)));
  const families = new Set(lambos.map((card) => carModelFamily(card.title)));
  assert.equal(families.size, 3, `expected 3 distinct Lamborghini model families, got: ${lambos.map((c) => c.title).join(', ')}`);

  const urusOnly = listingCards('Lamborghini Urus', { locale: 'en', sections: ['/rentals'] });
  assert.ok(urusOnly.length >= 1);
  assert.ok(urusOnly.every((card) => /urus/i.test(card.href)));
});

test('server conciergeIndex enriches dynamic Supabase partner cars and dining edits with caching and fail-safe timeout', async () => {
  clearDynamicEntitiesCache();
  // No credentials -> 0 fetch calls
  let fetches = 0;
  const empty = await getDynamicEntities({}, async () => { fetches += 1; return Response.json([]); });
  assert.deepEqual(empty, []);
  assert.equal(fetches, 0);
  assert.deepEqual(ENABLED_PARTNER_WORLDS, ['car-rentals']);

  const partnerUuid = '11111111-2222-4333-8444-555555555555';
  const photoUuid = '22222222-3333-4444-8555-666666666666';
  const partnerRow = {
    id: partnerUuid,
    slug: `partner-${partnerUuid}`,
    kind: 'car',
    company: 'Brickell Exotic Motors',
    published_version: 2,
    content: {
      schemaVersion: 1,
      kind: 'car',
      title: 'Pagani Huayra Roadster',
      location: 'Brickell, Miami',
      description: 'Rare carbon-fiber Italian hypercar available for concierge delivery.',
      priceCents: 450000,
      currency: 'USD',
      priceUnit: 'day',
      images: [`${partnerUuid}/${photoUuid}.webp`],
      specs: { brand: 'Pagani', model: 'Huayra', year: 2025, bodyType: 'Convertibles' }
    }
  };

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://dynamic-fixture.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon-key'
  };
  let calls = 0;
  const mockFetch = async (url) => {
    calls += 1;
    assert.match(String(url), /\/rest\/v1\/partner_publications\?select=\*&kind=eq\.car/);
    return Response.json([partnerRow]);
  };

  const first = await getDynamicEntities(env, mockFetch);
  assert.equal(calls, 1);
  assert.equal(first.length, 1);
  assert.equal(first[0].href, `/rentals/partner-${partnerUuid}`);
  assert.equal(first[0].title, 'Pagani Huayra Roadster');
  assert.ok(safeNavigationHref(first[0].href));
  assert.ok(safeImage(first[0].image));

  // Cached hit avoids re-fetching within 60s
  const second = await getDynamicEntities(env, mockFetch);
  assert.equal(calls, 1);
  assert.equal(second.length, 1);
  assert.equal(peekDynamicEntities(env).length, 1);

  // Search and listingCards immediately surface the newly published partner car via extraEntities
  const found = searchEcosystem('Pagani Huayra', { strict: true, extraEntities: first }).results;
  assert.equal(found[0]?.href, `/rentals/partner-${partnerUuid}`);
  const cards = listingCards('Pagani Huayra', { sections: ['/rentals'], extraEntities: first });
  assert.equal(cards[0]?.title, 'Pagani Huayra Roadster');

  // Fail-safe on upstream failure
  clearDynamicEntitiesCache();
  const failed = await getDynamicEntities(env, async () => { throw new Error('Supabase unreachable'); });
  assert.deepEqual(failed, []);
  clearDynamicEntitiesCache();
});
