import { test } from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const {
  extractBudget,
  extractNeighborhood,
  neighborhoodProximity,
  extractDateRange,
  extractTripProfile,
  tripProfilePromptLine,
  parseDailyPrice
} = load('lib/ai/tripProfile.mjs');
const { listingCards } = load('lib/ai/listingCards.mjs');
const { catalogueAnswer } = load('lib/ai/catalogueAnswer.mjs');
const { groundedReply } = load('lib/ai/groundedReply.mjs');
const { modelMessages } = load('lib/ai/workersBrain.mjs');
const { buildPlan } = load('lib/ai/plan.mjs');
const { syncPlanCatalog } = load('lib/ai/syncPlanCatalog.mjs');
const { safeNavigationHref } = load('lib/ai/session.mjs');
const {
  detectEventQuery,
  getLiveEventEntities,
  peekLiveEventEntities,
  clearLiveEventsCache
} = load('lib/server/conciergeEvents.mjs');

const encoder = new TextEncoder();

test('tripProfile extracts budget, Miami neighborhood, relative dates and session-wide context accurately', () => {
  // Budget parsing without false positives on model numbers / guest counts / years
  assert.deepEqual(extractBudget('Нужен SUV до $800 в день'), { maxDaily: 800, minDaily: null, cheapest: false });
  assert.deepEqual(extractBudget('Convertible under $600/day please'), { maxDaily: 600, minDaily: null, cheapest: false });
  assert.deepEqual(extractBudget('Car budget $500-$900'), { maxDaily: 900, minDaily: 500, cheapest: false });
  assert.deepEqual(extractBudget('Самый дешёвый кабриолет в Майами'), { maxDaily: null, minDaily: null, cheapest: true });
  assert.equal(extractBudget('Porsche 911 for 3 days for 2 guests in 2026'), null);

  // Neighborhood extraction & real Miami proximity matrix
  assert.equal(extractNeighborhood('Ужин в Brickell на закате'), 'Brickell');
  assert.equal(extractNeighborhood('Ресторан рядом с Санни Айлс'), 'Sunny Isles Beach');
  assert.equal(extractNeighborhood('Dinner in South Beach'), 'South Beach');
  assert.equal(neighborhoodProximity('Brickell', 'Brickell'), 1);
  assert.ok(neighborhoodProximity('Brickell', 'Downtown Miami') >= 0.85);
  assert.ok(neighborhoodProximity('Brickell', 'Downtown Miami') > neighborhoodProximity('Brickell', 'Design District'));
  assert.ok(neighborhoodProximity('Sunny Isles Beach', 'Surfside') >= 0.8);

  // Relative Miami dates against fixed Sunday 2026-11-22
  const sunday = new Date('2026-11-22T15:00:00Z');
  assert.deepEqual(extractDateRange('сегодня вечером', sunday), { from: '2026-11-22', to: '2026-11-22' });
  assert.deepEqual(extractDateRange('завтра', sunday), { from: '2026-11-23', to: '2026-11-23' });
  assert.deepEqual(extractDateRange('в пятницу', sunday), { from: '2026-11-27', to: '2026-11-27' });

  // Multi-turn session aggregation (newest turn overrides older value for same slot)
  const profile = extractTripProfile([
    { role: 'user', content: 'Нас шестеро, прилетаем в пятницу, живём в Brickell, бюджет на авто до $900/день' },
    { role: 'assistant', content: 'Понял.' },
    { role: 'user', content: 'Посоветуй ресторан' }
  ], sunday);
  assert.equal(profile.guests, 6);
  assert.equal(profile.neighborhood, 'Brickell');
  assert.equal(profile.maxDailyBudget, 900);
  assert.deepEqual(profile.dateRange, { from: '2026-11-27', to: '2026-11-27' });
  assert.match(tripProfilePromptLine(profile), /guests=6.*neighborhood=Brickell.*maxCarBudget=\$900\/day/);
});

test('numeric car budget filtering and cheapest sorting return accurately priced vehicles', () => {
  const under700 = listingCards('Нужен SUV до $700 в день', { locale: 'ru', sections: ['/rentals'] });
  assert.ok(under700.length >= 1 && under700.length <= 3);
  for (const card of under700) {
    const price = parseDailyPrice(card.price);
    assert.ok(price !== null && price <= 700, `expected <= $700, got ${card.title} (${card.price})`);
    assert.doesNotMatch(card.title, /Nissan GTR/i, `budget amount token must not match non-SUV by price string: ${card.title}`);
  }

  const cheapestCabrio = listingCards('Самый дешёвый кабриолет', { locale: 'ru', sections: ['/rentals'] });
  assert.ok(cheapestCabrio.length >= 2);
  const firstPrice = parseDailyPrice(cheapestCabrio[0].price);
  assert.ok(firstPrice !== null && firstPrice <= 600, `expected affordable top convertible, got ${cheapestCabrio[0].title} (${cheapestCabrio[0].price})`);

  // Unrealistic budget cap falls back gracefully instead of returning 0 cards
  const impossible = listingCards('Lamborghini under $80/day', { locale: 'en', sections: ['/rentals'] });
  assert.ok(impossible.length >= 1, 'unrealistic budget should degrade gracefully to cheapest matching Lamborghinis');
  assert.ok(impossible.every((c) => /lamborghini/i.test(c.title)));
});

test('Miami geographic proximity ranks closest Michelin venues first and builds exact neighborhood filter links', () => {
  // No literal Brickell Michelin exists -> Elcielo (Downtown Miami, 3 min across Brickell bridge) MUST rank #1!
  const brickellMichelin = listingCards('Посоветуй ресторан в Brickell, с Мишленом', {
    locale: 'ru',
    sections: ['/restaurants-nightlife']
  });
  assert.ok(brickellMichelin.length >= 1);
  assert.equal(brickellMichelin[0].href, '/restaurants-nightlife/elcielo-miami', `expected Elcielo #1 near Brickell, got ${brickellMichelin.map((c) => c.title).join(', ')}`);
  assert.equal(brickellMichelin[0].more, '/restaurants-nightlife?collection=michelin');

  // Michelin near Sunny Isles -> The Surf Club Restaurant (Surfside, 1-star Michelin, 5 min away) ranks #1!
  const sunnyMichelin = listingCards('Ресторан с Мишленом рядом с Sunny Isles', {
    locale: 'ru',
    sections: ['/restaurants-nightlife']
  });
  assert.ok(sunnyMichelin.length >= 1);
  assert.equal(sunnyMichelin[0].href, '/restaurants-nightlife/surf-club-miami', `expected Surf Club #1 near Sunny Isles, got ${sunnyMichelin.map((c) => c.title).join(', ')}`);

  // Pure Brickell dining query links directly to the Brickell neighborhood filter
  const brickellDinner = listingCards('Ресторан в Brickell на ужин', {
    locale: 'ru',
    sections: ['/restaurants-nightlife']
  });
  assert.ok(brickellDinner.length >= 1);
  assert.ok(brickellDinner.every((c) => /Brickell/i.test(c.summary || '')));
  assert.equal(brickellDinner[0].more, '/restaurants-nightlife?neighborhood=Brickell');
});

test('session-wide trip profile carries across topic switches and suppresses already-answered questions', () => {
  const messages = [
    { role: 'user', content: 'Нас шестеро, прилетаем в пятницу, живём в Brickell, бюджет на авто до $800/день' },
    { role: 'assistant', content: 'Отлично, учту ваши параметры.' },
    { role: 'user', content: 'Посоветуй ресторан' }
  ];

  // Turn 2: restaurant query remembers Brickell from Turn 1
  const diningTurn = catalogueAnswer(messages, 'ru');
  assert.equal(diningTurn.navigation.cards[0]?.href, '/restaurants-nightlife');
  assert.ok(diningTurn.listings.length >= 1);
  assert.ok(diningTurn.listings.every((c) => /Brickell/i.test(c.summary || '')), `expected Brickell restaurants from session memory, got ${diningTurn.listings.map((c) => `${c.title} (${c.summary})`).join(', ')}`);

  // If the model tries to re-ask group, dates, or neighborhood on Turn 2, missingQuestion suppresses it!
  for (const redundant of ['group', 'dates', 'neighborhood']) {
    const projected = groundedReply(
      JSON.stringify({ version: 2, action: 'consult', options: ['sunset-dining'], question: redundant }),
      { messages, locale: 'ru' }
    );
    assert.ok(projected);
    assert.doesNotMatch(projected.reply, /\?/, `should suppress redundant session question "${redundant}": ${projected.reply}`);
  }

  // Turn 3: car query remembers guests=6 and maxDailyBudget=$800 from Turn 1!
  const carMessages = [
    ...messages,
    { role: 'assistant', content: diningTurn.reply },
    { role: 'user', content: 'И подбери внедорожник' }
  ];
  const carTurn = catalogueAnswer(carMessages, 'ru');
  assert.equal(carTurn.navigation.cards[0]?.href, '/rentals');
  assert.ok(carTurn.listings.length >= 1);
  for (const card of carTurn.listings) {
    const price = parseDailyPrice(card.price);
    assert.ok(price !== null && price <= 800, `expected session budget <= $800, got ${card.title} (${card.price})`);
  }

  // System prompt stays <= 9,000 bytes even with full session trip profile injected
  const prepared = modelMessages(carMessages, 'ru');
  assert.ok(prepared);
  const sysBytes = encoder.encode(prepared[0].content).byteLength;
  assert.ok(sysBytes <= 9000, `system prompt exceeded 9,000 bytes: ${sysBytes}`);
  assert.match(prepared[0].content, /Session trip profile: guests=6, neighborhood=Brickell/);
});

test('multi-section VIP buildPlan applies session budget and Miami neighborhood coherence', () => {
  const plan = buildPlan([
    { role: 'user', content: 'Plan a car under $700/day and dinner in Brickell for 6 guests this Friday' }
  ], { catalog: syncPlanCatalog(), locale: 'en', requestable: true });
  assert.ok(plan);
  assert.equal(plan.guests, 6);
  const carSection = plan.sections.find((s) => s.href === '/rentals');
  const diningSection = plan.sections.find((s) => s.href === '/restaurants-nightlife');
  assert.ok(carSection && carSection.candidates.length >= 1);
  for (const c of carSection.candidates) {
    const p = parseDailyPrice(c.price);
    assert.ok(p !== null && p <= 700, `plan car exceeded budget $700: ${c.title} (${c.price})`);
  }
  assert.ok(diningSection && diningSection.candidates.length >= 1);
  assert.ok(/Brickell/i.test(diningSection.candidates[0].subtitle || ''), `expected Brickell dining #1 in plan, got ${diningSection.candidates[0].title} (${diningSection.candidates[0].subtitle})`);
});

test('live TicketNetwork conciergeEvents converts verified events safely, caches and fails safe without stray fetches', async () => {
  clearLiveEventsCache();

  // Category & team detection
  assert.deepEqual(detectEventQuery('Miami Heat tickets this weekend'), { category: 'nba', performer: 'Miami Heat', maxLiveCards: 3 });
  assert.deepEqual(detectEventQuery('Когда матч Интер Майами?'), { category: 'mls', performer: 'Inter Miami', maxLiveCards: 3 });
  assert.deepEqual(detectEventQuery('Найди два билета на футбол в воскресенье'), { category: 'mls', performer: '', maxLiveCards: 1 });
  assert.deepEqual(detectEventQuery('Quiero entradas para un concierto en Miami'), { category: 'concerts', performer: '', maxLiveCards: 2 });

  // No caches.default & no flag -> 0 fetches in unit tests
  const skipped = await getLiveEventEntities('Miami Heat tickets', { env: {} });
  assert.deepEqual(skipped, []);

  // Mocked TicketNetwork config + Typesense response -> normalized safe LiveEvent entities
  let calls = 0;
  const mockFetcher = async (url) => {
    calls += 1;
    const s = String(url);
    if (s === 'https://www.ticketnetwork.com/en/affiliate-plugin') {
      return new Response('<script src="/_next/static/chunks/tn-config-123.js"></script>', { status: 200 });
    }
    if (s.includes('tn-config-123.js')) {
      return new Response('x-typesense-api-key /collections/ dev:{host:"fixture.a1.typesense.net",apiKey:"fixture-public-search-key-123456"}', { status: 200 });
    }
    if (s.includes('fixture.a1.typesense.net')) {
      const ts = Math.floor(Date.UTC(2026, 10, 27, 19, 30, 0) / 1000);
      return Response.json({
        found: 1,
        facet_counts: [],
        hits: [{
          document: {
            event_id: 987654,
            event_name: 'Miami Heat vs. Boston Celtics',
            event_local_timestamp: ts,
            venue_name: 'Kaseya Center',
            venue_city: 'Miami',
            venue_state_province_short: 'FL',
            slugs: {
              event_name: 'miami-heat-vs-boston-celtics',
              event_date_weekday_month_day: 'fri-nov-27',
              venue_name: 'kaseya-center'
            }
          }
        }]
      });
    }
    throw new Error('Unexpected URL: ' + s);
  };

  const now = new Date('2026-11-22T15:00:00Z');
  const live = await getLiveEventEntities('Miami Heat tickets this Friday', {
    profile: { dateRange: { from: '2026-11-27', to: '2026-11-27' } },
    locale: 'en',
    fetcher: mockFetcher,
    now
  });
  assert.equal(live.length, 1);
  assert.equal(live[0].title, 'Miami Heat vs. Boston Celtics');
  assert.equal(live[0].href, '/events/category/nba#event-987654');
  assert.ok(safeNavigationHref(live[0].href));
  assert.match(live[0].price, /Kaseya Center/);
  assert.equal(live[0].liveEvent, true);

  // Warm cache peek returns the live event with 0 I/O
  const peeked = peekLiveEventEntities('Miami Heat tickets this Friday', {
    profile: { dateRange: { from: '2026-11-27', to: '2026-11-27' } },
    locale: 'en',
    now
  });
  assert.equal(peeked.length, 1);

  // Live event surfaces at #1 in listingCards alongside static NBA category!
  const cards = listingCards('Miami Heat tickets this Friday', {
    locale: 'en',
    sections: ['/events'],
    extraEntities: live
  });
  assert.equal(cards[0]?.href, '/events/category/nba#event-987654');
  assert.equal(cards[0]?.title, 'Miami Heat vs. Boston Celtics');

  // Fail-safe on upstream failure
  clearLiveEventsCache();
  const failed = await getLiveEventEntities('Miami Heat tickets', {
    fetcher: async () => { throw new Error('Network error'); },
    now
  });
  assert.deepEqual(failed, []);
  clearLiveEventsCache();
});
