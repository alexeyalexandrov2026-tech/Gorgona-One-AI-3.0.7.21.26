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
  parseDailyPrice,
  buildStay22ReferralUrl
} = load('lib/ai/tripProfile.mjs');
const { listingCards, gatedListings, stopExperienceCards } = load('lib/ai/listingCards.mjs');
const { quickRepliesForTurn } = load('lib/ai/quickReplies.mjs');
const { SUPPORTED_LANGUAGES } = load('lib/languages.js');
const { catalogueAnswer } = load('lib/ai/catalogueAnswer.mjs');
const { groundedReply } = load('lib/ai/groundedReply.mjs');
const { modelMessages } = load('lib/ai/workersBrain.mjs');
const { buildPlan } = load('lib/ai/plan.mjs');
const { syncPlanCatalog } = load('lib/ai/syncPlanCatalog.mjs');
const { safeNavigationHref } = load('lib/ai/session.mjs');
const {
  detectEventQuery,
  extractPerformerFromQuery,
  getLiveEventEntities,
  peekLiveEventEntities,
  clearLiveEventsCache
} = load('lib/server/conciergeEvents.mjs');
const { GET: chatGet } = load('app/api/chat/route.js');
const { buildFactPack, normalizePagePath, resolvePageEntity } = load('lib/ai/factPack.mjs');
const { validateGroundedReplyText } = load('lib/ai/factGuard.mjs');
const { chatPayload, readChatRequest } = load('lib/ai/chatRequest.mjs');
const {
  MIAMI_FORECAST_URL,
  getMiamiForecast,
  formatForecastForPrompt,
  shouldFetchForecast,
  clearForecastCache
} = load('lib/ai/miamiForecast.mjs');
const { formatProfileChips } = load('lib/ai/profileChips.mjs');

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

  // Relative & natural calendar Miami dates against fixed Sunday 2026-11-22
  const sunday = new Date('2026-11-22T15:00:00Z');
  assert.deepEqual(extractDateRange('сегодня вечером', sunday), { from: '2026-11-22', to: '2026-11-22' });
  assert.deepEqual(extractDateRange('завтра', sunday), { from: '2026-11-23', to: '2026-11-23' });
  assert.deepEqual(extractDateRange('послезавтра', sunday), { from: '2026-11-24', to: '2026-11-24' });
  assert.deepEqual(extractDateRange('в пятницу', sunday), { from: '2026-11-27', to: '2026-11-27' });
  assert.deepEqual(extractDateRange('Концерт 5 декабря', sunday), { from: '2026-12-05', to: '2026-12-05' });
  assert.deepEqual(extractDateRange('с 5 по 7 декабря', sunday), { from: '2026-12-05', to: '2026-12-07' });
  assert.deepEqual(extractDateRange('Events on December 15', sunday), { from: '2026-12-15', to: '2026-12-15' });
  assert.deepEqual(extractDateRange('Билеты на 15 января', sunday), { from: '2027-01-15', to: '2027-01-15' });
  assert.deepEqual(extractDateRange('Шоу 05.12', sunday), { from: '2026-12-05', to: '2026-12-05' });
  assert.deepEqual(extractDateRange('Концерты в декабре', sunday), { from: '2026-12-01', to: '2026-12-31' });

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

  // Helicopter over Miami excludes out-of-state Grand Canyon / Las Vegas helicopter tours
  const miamiHeli = listingCards('Хочу вертолёт над Майами', {
    locale: 'ru',
    sections: ['/experiences']
  });
  assert.deepEqual(miamiHeli.map((c) => c.href), ['/experiences/viator/231628p7']);
});

test('session-wide trip profile carries across topic switches and suppresses already-answered questions', () => {
  const messages = [
    { role: 'user', content: 'Нас шестеро, прилетаем в пятницу, живём в Brickell, бюджет на авто до $800/день' },
    { role: 'assistant', content: 'Отлично, учту ваши параметры.' },
    { role: 'user', content: 'Посоветуй ресторан' }
  ];

  // Turn 1: spelled-out party size "Нас шестеро" triggers family-suv consult advice rather than bare navigation label
  const turn1Projected = groundedReply(
    JSON.stringify({ version: 2, action: 'consult', options: ['family-suv'], question: null }),
    { messages: [messages[0]], locale: 'ru' }
  );
  assert.ok(turn1Projected);
  assert.match(turn1Projected.reply, /Рассмотрите внедорожник/);

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
  assert.ok(diningSection.candidates[0].booking?.href?.startsWith('https://'), 'expected direct restaurant booking link inside multi-section plan');
});

test('live TicketNetwork conciergeEvents converts verified events safely, caches and fails safe without stray fetches', async () => {
  clearLiveEventsCache();

  // Category, home team, visiting opponent team & named artist/comedian detection
  assert.deepEqual(detectEventQuery('Miami Heat tickets this weekend'), { category: 'nba', performer: 'Miami Heat', maxLiveCards: 3 });
  assert.deepEqual(detectEventQuery('Когда матч Интер Майами?'), { category: 'mls', performer: 'Inter Miami', maxLiveCards: 3 });
  assert.deepEqual(detectEventQuery('Когда играют Boston Celtics в Майами?'), { category: 'nba', performer: 'Celtics', maxLiveCards: 3 });
  assert.deepEqual(detectEventQuery('Билеты на Лейкерс'), { category: 'nba', performer: 'Lakers', maxLiveCards: 3 });
  assert.deepEqual(detectEventQuery('Есть ли билеты на Damon Wayans в декабре?'), { category: 'events', performer: 'Damon Wayans', maxLiveCards: 3 });
  assert.deepEqual(detectEventQuery('Концерт Andrea Bocelli в Майами'), { category: 'concerts', performer: 'Andrea Bocelli', maxLiveCards: 3 });
  assert.equal(extractPerformerFromQuery('Tickets for Sebastian Maniscalco in Miami'), 'Sebastian Maniscalco');
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

  // Live event surfaces at #1 in listingCards alongside static NBA category, with verified CJ affiliate referral URL!
  const cards = listingCards('Miami Heat tickets this Friday', {
    locale: 'en',
    sections: ['/events'],
    extraEntities: live
  });
  assert.equal(cards[0]?.href, '/events/category/nba#event-987654');
  assert.equal(cards[0]?.title, 'Miami Heat vs. Boston Celtics');
  assert.equal(cards[0]?.booking?.platform, 'ticketnetwork');
  assert.match(cards[0]?.booking?.href || '', /^https:\/\/www\.tkqlhce\.com\/click-101825540-10793961\?/);
  assert.equal(cards[0]?.more, '/events/category/nba');

  // Partner referral links are embedded directly in frames for Viator helicopters, Headout tours, Yachts, and Ovago flights
  const heliCards = listingCards('Хочу вертолёт над Майами', { locale: 'ru', sections: ['/experiences'] });
  assert.equal(heliCards[0]?.href, '/experiences/viator/231628p7');
  assert.equal(heliCards[0]?.booking?.platform, 'viator');
  assert.match(heliCards[0]?.booking?.href || '', /pid=P00329248/);

  const evergladesCards = listingCards('Everglades', { locale: 'en', sections: ['/experiences'] });
  const headoutEverglades = evergladesCards.find((c) => c.booking?.platform === 'headout');
  assert.ok(headoutEverglades, 'expected Headout Everglades card with affiliate referral link');
  assert.match(headoutEverglades.booking.href, /^https:\/\/www\.headout\.com\/.*affiliate_code=/);

  const yachtCards = listingCards('Хочу яхту в субботу на 8 гостей', { locale: 'ru', sections: ['/yachts'] });
  assert.ok(yachtCards.length >= 2, 'expected capacity-matched Miami yacht charter proposals on /yachts turn');
  assert.ok(yachtCards.every((c) => !c.href.startsWith('/yachts/') && c.booking?.platform === 'viator' && /pid=P00329248/.test(c.booking.href)));

  const flightCards = listingCards('Дешёвые авиабилеты в Майами', { locale: 'ru', sections: ['/travel'] });
  assert.ok(flightCards.length >= 2, 'expected Ovago flight deal frames on /travel flight query');
  assert.ok(flightCards.every((c) => c.booking?.platform === 'ovago' && /click-101825540-/.test(c.booking.href)));

  // Smart occasion routing: Anniversary -> date-night romantic dining with booking links; Family with kids -> Zoo Miami / Everglades with partner referrals
  const anniversaryTurn = catalogueAnswer([{ role: 'user', content: 'У нас годовщина свадьбы в субботу' }], 'ru');
  assert.equal(anniversaryTurn.navigation.cards[0]?.href, '/restaurants-nightlife');
  assert.ok(anniversaryTurn.listings.length >= 1);
  assert.ok(anniversaryTurn.listings.every((c) => c.booking?.href && c.more === '/restaurants-nightlife?collection=date-night'));

  const kidsTurn = catalogueAnswer([{ role: 'user', content: 'Куда пойти с детьми в Майами?' }], 'ru');
  assert.equal(kidsTurn.navigation.cards[0]?.href, '/experiences');
  assert.ok(kidsTurn.listings.length >= 1);
  assert.ok(kidsTurn.listings.some((c) => /zoo-miami|everglades|5096p35/i.test(c.href) && ['headout', 'viator'].includes(c.booking?.platform)));

  // Zero-PII referral click attribution telemetry via GET /api/chat?referral=<platform>
  const logged = [];
  const origInfo = console.info;
  console.info = (...args) => logged.push(args.join(' '));
  try {
    const okRes = await chatGet(new Request('https://gorgona-one.com/api/chat?referral=ticketnetwork'));
    assert.equal(okRes.status, 200);
    assert.ok(logged.some((line) => line.includes('"event":"concierge.referral_click"') && line.includes('"platform":"ticketnetwork"')));

    const beforeCount = logged.length;
    await chatGet(new Request('https://gorgona-one.com/api/chat?referral=untrusted_evil_value'));
    assert.equal(logged.length, beforeCount, 'unrecognized referral platform must not be logged');
  } finally {
    console.info = origInfo;
  }

  // Fail-safe on upstream failure
  clearLiveEventsCache();
  const failed = await getLiveEventEntities('Miami Heat tickets', {
    fetcher: async () => { throw new Error('Network error'); },
    now
  });
  assert.deepEqual(failed, []);
  clearLiveEventsCache();
});

test('Phase 4: stop experience cards for ideas/plan, multi-section consult reply, 16-locale quick replies and deep partner URLs', async () => {
  // 1. ideas & plan turns attach bookable Viator & Headout partner referral cards for the model's chosen stops
  const ideasProjected = groundedReply(
    JSON.stringify({ version: 2, action: 'ideas', stops: ['zoo-miami', 'everglades'] }),
    { messages: [{ role: 'user', content: 'Куда пойти с детьми в Майами?' }], locale: 'ru' }
  );
  assert.deepEqual(ideasProjected.stops, ['zoo-miami', 'everglades']);
  const ideaCards = gatedListings('Куда пойти с детьми в Майами?', {
    locale: 'ru', action: 'ideas', sections: ['/experiences'], stops: ideasProjected.stops
  });
  assert.ok(ideaCards.length >= 2);
  assert.equal(ideaCards[0].href, '/experiences/zoo-miami');
  assert.equal(ideaCards[0].booking?.platform, 'headout');
  assert.ok(ideaCards.some((c) => c.href === '/experiences/viator/5096p35' && c.booking?.platform === 'viator'));
  assert.equal(stopExperienceCards(['biscayne-bay'])[0]?.booking?.platform, 'viator');

  // Guardrail check: ideas/plan on /rentals or without stops still returns []
  assert.deepEqual(gatedListings('Lamborghini Urus', { action: 'ideas', sections: ['/rentals'] }), []);
  assert.deepEqual(gatedListings('Plan 2 days', { action: 'plan', sections: ['/experiences'] }), []);

  // 2. Multi-section answerForNavigation includes consultative advice for requested sections
  const multi = catalogueAnswer([{ role: 'user', content: 'Хочу яхту на весь день и внедорожник в Майами' }], 'ru');
  assert.match(multi.reply, /яхту|внедорожник/i);

  // 3. One-tap quick-reply chips work across all 16 locales and stay empty on handoff/degraded
  for (const { code } of SUPPORTED_LANGUAGES) {
    const chips = quickRepliesForTurn({
      reply: 'Sample concierge reply',
      cards: [{ href: '/restaurants-nightlife' }],
      locale: code
    });
    assert.ok(chips.length >= 3, `missing quick replies for locale ${code}`);
  }
  const vibeChipsRu = quickRepliesForTurn({
    reply: 'Какая атмосфера вам нужна: ресторан со звёздами Мишлен, романтический ужин, закат на руфтопе или активная ночная жизнь?',
    cards: [{ href: '/restaurants-nightlife' }],
    locale: 'ru'
  });
  assert.ok(vibeChipsRu.some((c) => /Мишлен/.test(c)));
  assert.deepEqual(quickRepliesForTurn({ reply: 'Handoff', cards: [{ href: '/yachts' }], locale: 'ru', handoff: true }), []);

  // 4. Dynamic TicketNetwork artist search referral URL & Stay22 pre-filled check-in/out/guests URL
  const artistFallback = listingCards('Билеты на Bad Bunny', { locale: 'ru', sections: ['/events'] });
  assert.ok(artistFallback.length >= 1);
  const tnUrl = new URL(artistFallback[0].booking.href);
  assert.equal(tnUrl.origin + tnUrl.pathname, 'https://www.tkqlhce.com/click-101825540-10793961');
  assert.equal(tnUrl.searchParams.get('url'), 'https://www.ticketnetwork.com/search?q=Bad%20Bunny');

  // Unmatched artist query must NOT fall back to unrelated general events in getLiveEventEntities
  const emptyArtistFetcher = async (url) => {
    const s = String(url);
    if (s === 'https://www.ticketnetwork.com/en/affiliate-plugin') {
      return new Response('<script src="/_next/static/chunks/tn-config-empty.js"></script>', { status: 200 });
    }
    if (s.includes('tn-config-empty.js')) {
      return new Response('x-typesense-api-key /collections/ dev:{host:"fixture.a1.typesense.net",apiKey:"fixture-public-search-key-123456"}', { status: 200 });
    }
    if (s.includes('fixture.a1.typesense.net')) {
      const hasPerformerQuery = /q=Bad/i.test(s);
      if (hasPerformerQuery) return Response.json({ found: 0, facet_counts: [], hits: [] });
      // If called without performer filter, would return unrelated event — must NOT happen for artist queries!
      return Response.json({
        found: 1,
        facet_counts: [],
        hits: [{ document: { event_id: 111, event_name: 'Unrelated Ballet', event_local_timestamp: 1795370400, venue_name: 'Theater', venue_city: 'Miami', venue_state_province_short: 'FL' } }]
      });
    }
    throw new Error('Unexpected URL: ' + s);
  };
  clearLiveEventsCache();
  const unmatchedArtistLive = await getLiveEventEntities('Билеты на Bad Bunny', {
    locale: 'ru',
    fetcher: emptyArtistFetcher,
    now: new Date('2026-11-22T15:00:00Z')
  });
  assert.deepEqual(unmatchedArtistLive, []);
  clearLiveEventsCache();

  const stayUrl = new URL(buildStay22ReferralUrl({
    guests: 6,
    dateRange: { from: '2026-12-05', to: '2026-12-07' }
  }));
  assert.equal(stayUrl.searchParams.get('aid'), 'gorgonaone');
  assert.equal(stayUrl.searchParams.get('checkin'), '2026-12-05');
  assert.equal(stayUrl.searchParams.get('checkout'), '2026-12-07');
  assert.equal(stayUrl.searchParams.get('guests'), '6');
});

test('Phase 5: version 3 Grounded NLG, Zero-Hallucination Fact Guard, Pre-Inference Fact Pack, Page-Aware Context and clean artist card', async () => {
  // 1. Clean artist fallback card (no unrelated NFL/NHL/NBA titles)
  const badBunny = listingCards('Билеты на Bad Bunny', { locale: 'ru', sections: ['/events'] });
  assert.equal(badBunny.length, 1);
  assert.equal(badBunny[0].title, 'Bad Bunny — TicketNetwork');
  assert.equal(badBunny[0].href, '/events/category/concerts');
  assert.equal(badBunny[0].booking?.platform, 'ticketnetwork');
  assert.equal(new URL(badBunny[0].booking.href).searchParams.get('url'), 'https://www.ticketnetwork.com/search?q=Bad%20Bunny');

  // 2. Page-Aware Context normalization & resolution + request transport
  assert.equal(normalizePagePath('/restaurants-nightlife/komodo-miami?ref=abc#top'), '/restaurants-nightlife/komodo-miami');
  assert.equal(normalizePagePath('https://evil.example/komodo'), '');
  assert.equal(normalizePagePath('/../etc/passwd'), '');
  const komodoPage = resolvePageEntity('/restaurants-nightlife/komodo-miami');
  assert.equal(komodoPage?.title, 'Komodo');
  assert.equal(komodoPage?.section, '/restaurants-nightlife');
  assert.equal(komodoPage?.partner, 'sevenrooms');

  const payload = chatPayload([{ role: 'user', content: 'Какой тут дресс-код?' }], { locale: 'ru', pagePath: '/restaurants-nightlife/komodo-miami' });
  assert.equal(payload.pagePath, '/restaurants-nightlife/komodo-miami');
  const parsedReq = await readChatRequest(new Request('https://example.test/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload)
  }));
  assert.equal(parsedReq.pagePath, '/restaurants-nightlife/komodo-miami');

  // 3. Pre-Inference Grounded Fact Pack injects page entity, exact catalog prices & Miami logistics into system prompt
  const pack = buildFactPack({
    messages: [{ role: 'user', content: 'Сравни Komodo и Sexy Fish в Brickell, успеем после матча в Kaseya Center?' }],
    locale: 'ru',
    pagePath: '/restaurants-nightlife/komodo-miami'
  });
  assert.equal(pack.pageEntity?.title, 'Komodo');
  assert.ok(pack.facts.some((f) => /Komodo/i.test(f.title)));
  assert.match(pack.logisticsNote, /Kaseya Center/);
  const prompt = modelMessages(
    [{ role: 'user', content: 'Какой тут дресс-код?' }],
    'ru',
    { pagePath: '/restaurants-nightlife/komodo-miami' }
  );
  assert.match(prompt[0].content, /Guest is currently viewing:.*"Komodo"/);
  assert.match(prompt[0].content, /Grounded facts/);

  // 4. Controlled Grounded NLG (version: 3): accepts verified prose, strips stray markdown bold, preserves stops
  const allowedPrices = new Set([400, 700]);
  const v3Good = groundedReply(JSON.stringify({
    version: 3,
    action: 'consult',
    sections: ['/rentals'],
    reply: '**Cadillac Escalade** ($400/день) спокойно укладывается в ваш бюджет до $700/день и свободно вместит 6 гостей с чемоданами из MIA.'
  }), {
    messages: [{ role: 'user', content: 'Нужен внедорожник на 6 человек до $700 из аэропорта' }],
    locale: 'ru',
    allowedPrices
  });
  assert.ok(v3Good);
  assert.equal(v3Good.decidedBy, 'model');
  assert.equal(v3Good.action, 'consult');
  assert.doesNotMatch(v3Good.reply, /\*\*/, 'stray markdown bold must be stripped for plain-text chat UI');
  assert.match(v3Good.reply, /Cadillac Escalade \(\$400\/день\)/);
  assert.equal(v3Good.navigation.cards[0]?.href, '/rentals');

  const v3Plan = groundedReply(JSON.stringify({
    version: 3,
    action: 'plan',
    sections: ['/experiences'],
    stops: ['zoo-miami', 'everglades'],
    reply: 'День 1 — начните с Zoo Miami утром, пока не жарко.\nДень 2 — отправляйтесь в Everglades на аэролодке.'
  }), {
    messages: [{ role: 'user', content: 'План на 2 дня с детьми' }],
    locale: 'ru',
    allowedPrices: new Set()
  });
  assert.deepEqual(v3Plan?.stops, ['zoo-miami', 'everglades']);
  const planCards = gatedListings('План на 2 дня с детьми', { locale: 'ru', action: 'plan', sections: ['/experiences'], stops: v3Plan.stops });
  assert.ok(planCards.some((c) => c.href === '/experiences/zoo-miami' && c.booking?.platform === 'headout'));

  // 5. Zero-Hallucination Fact Guard blocks invented prices, URLs, phones, fake booking claims & wrong script
  assert.equal(validateGroundedReplyText('Попробуйте яхту за $1,850 в час на заливе Бискейн.', { locale: 'ru', allowedPrices }).ok, false);
  assert.equal(validateGroundedReplyText('Смотрите подробности на https://fake-booking.example прямо сейчас.', { locale: 'ru', allowedPrices }).ok, false);
  assert.equal(validateGroundedReplyText('Позвоните менеджеру по номеру +1 305-555-0199 для подтверждения.', { locale: 'ru', allowedPrices }).ok, false);
  assert.equal(validateGroundedReplyText('Я уже забронировал для вас столик в Komodo на субботу.', { locale: 'ru', allowedPrices }).ok, false);
  assert.equal(validateGroundedReplyText('Cadillac Escalade is a great choice for Brickell trips.', { locale: 'ru', allowedPrices }).ok, false);

  // Version 3 with invented price fails closed (returns null so route falls back safely)
  assert.equal(groundedReply(JSON.stringify({
    version: 3,
    action: 'consult',
    sections: ['/yachts'],
    reply: 'Эта яхта стоит $2,950 за четыре часа на заливе Бискейн.'
  }), {
    messages: [{ role: 'user', content: 'Хочу яхту в Майами' }],
    locale: 'ru',
    allowedPrices
  }), null);

  // Hard booking rule STILL overrides version 3 with booking disclaimer & handoff:true
  const v3Booking = groundedReply(JSON.stringify({
    version: 3,
    action: 'consult',
    sections: ['/restaurants-nightlife'],
    reply: 'Komodo — отличный выбор в Brickell, переходите по кнопке ниже для брони.'
  }), {
    messages: [{ role: 'user', content: 'Забронируй столик в Komodo на пятницу' }],
    locale: 'ru',
    allowedPrices
  });
  assert.equal(v3Booking?.handoff, true);
  assert.equal(v3Booking?.action, 'handoff');
  assert.match(v3Booking?.reply || '', /этот чат не создаёт и не подтверждает бронирования/);
});

test('Phase 6: 7-day NOAA/NWS forecast, deep VIP profile + 16-locale memory chips, and multi-section balanced partner listings', async () => {
  // 1. NOAA/NWS 7-day Miami forecast skips stray network calls in Node tests and parses verified periods cleanly
  clearForecastCache();
  assert.deepEqual(await getMiamiForecast({ env: {} }), []);
  assert.equal(shouldFetchForecast('Хочу яхту в субботу', null, ['/yachts']), true);

  const mockForecastFetcher = async (url, init) => {
    assert.equal(url, MIAMI_FORECAST_URL);
    assert.equal(init.redirect, 'manual');
    return Response.json({
      properties: {
        periods: [
          { name: 'Saturday', startTime: '2026-11-28T06:00:00-05:00', isDaytime: true, temperature: 79, temperatureUnit: 'F', windSpeed: '10 mph', probabilityOfPrecipitation: { value: 60 }, shortForecast: 'Chance Showers And Thunderstorms' },
          { name: 'Saturday Night', startTime: '2026-11-28T18:00:00-05:00', isDaytime: false, temperature: 71, temperatureUnit: 'F', windSpeed: '8 mph', probabilityOfPrecipitation: { value: 20 }, shortForecast: 'Partly Cloudy' },
          { name: 'Sunday', startTime: '2026-11-29T06:00:00-05:00', isDaytime: true, temperature: 81, temperatureUnit: 'F', windSpeed: '8 mph', probabilityOfPrecipitation: { value: 10 }, shortForecast: 'Mostly Sunny' }
        ]
      }
    });
  };
  const periods = await getMiamiForecast({ fetcher: mockForecastFetcher });
  assert.equal(periods.length, 2);
  assert.equal(periods[0].date, '2026-11-28');
  assert.equal(periods[0].tempC, 26);
  assert.equal(periods[0].rainChance, 60);

  const satLine = formatForecastForPrompt(periods, { from: '2026-11-28', to: '2026-11-28' });
  assert.match(satLine, /2026-11-28 \(Saturday\): 26°C\/79°F.*rain 60%/);
  assert.match(satLine, /High rain\/storm chance/);
  assert.equal(formatForecastForPrompt(periods, { from: '2026-12-25', to: '2026-12-26' }), '', 'dates beyond 7-day window must not produce a forecast');

  const promptWithForecast = modelMessages(
    [{ role: 'user', content: 'Хочу яхту в субботу на 6 человек' }],
    'ru',
    { forecastPeriods: periods }
  );
  assert.match(promptWithForecast[0].content, /Miami official NOAA\/NWS forecast:/);
  assert.ok(encoder.encode(promptWithForecast[0].content).byteLength < 9000, 'system prompt with forecast must stay under 9,000 bytes');
  clearForecastCache();

  // 2. Deep VIP TripProfile extraction (occasion, airport, cuisine/dietary) & 16-locale visible memory chips
  const vipProfile = extractTripProfile([
    { role: 'user', content: 'Летим в Майами 5–7 декабря вшестером на годовщину, прилёт в MIA' },
    { role: 'user', content: 'Живём в Brickell, бюджет на авто до $700' },
    { role: 'user', content: 'Любим суши, но жена не ест морепродукты' }
  ], new Date('2026-11-22T15:00:00Z'));
  assert.equal(vipProfile.guests, 6);
  assert.equal(vipProfile.neighborhood, 'Brickell');
  assert.equal(vipProfile.maxDailyBudget, 700);
  assert.equal(vipProfile.occasion, 'anniversary');
  assert.equal(vipProfile.airport, 'MIA');
  assert.ok(vipProfile.dietaryOrCuisine.includes('sushi'));
  assert.ok(vipProfile.dietaryOrCuisine.includes('no-seafood'));
  assert.ok(!vipProfile.dietaryOrCuisine.includes('seafood'));
  const line = tripProfilePromptLine(vipProfile);
  assert.match(line, /occasion=anniversary/);
  assert.match(line, /airport=MIA/);
  assert.match(line, /cuisine=.*no-seafood/);

  for (const { code } of SUPPORTED_LANGUAGES) {
    const rendered = formatProfileChips(vipProfile, code);
    assert.ok(rendered.chips.length >= 5, `expected profile chips for locale ${code}`);
    assert.ok(rendered.resetLabel.length >= 2, `expected reset label for locale ${code}`);
    assert.ok(rendered.chips.every((c) => c.label && c.key));
  }

  // 3. Multi-section balanced partner listings surface both yacht AND helicopter/experience cards together
  const balanced = listingCards('Собери субботу на 6 человек: яхта днём и вертолёт на закате', {
    locale: 'ru',
    limit: 4,
    sections: ['/yachts', '/experiences'],
    profile: vipProfile
  });
  assert.ok(balanced.length >= 2);
  assert.ok(balanced.some((c) => c.href === '/experiences/viator/231628p7'), 'helicopter tour must appear alongside yacht charters');
  assert.ok(balanced.some((c) => c.href !== '/experiences/viator/231628p7' && c.booking?.platform === 'viator'), 'yacht charter must also appear');
});
