import test from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const { getActionAgentCopy, formatActionEstimate } = load('lib/ai/actionAgentCopy.mjs');
const {
  carSlugFromHref,
  checkPreInferenceFleetAvailability,
  enrichListingsWithAgentTools,
  enrichPlanWithAgentTools
} = load('lib/ai/agentTools.mjs');
const { navigationItem, chatSnapshot } = load('lib/ai/session.mjs');
const { modelMessages } = load('lib/ai/workersBrain.mjs');
const { getRentals } = load('lib/rentalsData.js');

const ALL_16_LOCALES = ['en', 'ru', 'es', 'uk', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'he', 'ar', 'fa', 'zh', 'ja', 'ko'];

function makeMockEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test-key'
  };
}

function makeSupabaseFetcher(rows = []) {
  return async (url) => {
    assert.ok(String(url).includes('/rest/v1/bookings?select=item_slug,dates,status&kind=eq.car&status=neq.closed'));
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };
}

test('Wave 1B: actionAgentCopy covers all 16 locales without forbidden concierge wording', () => {
  for (const locale of ALL_16_LOCALES) {
    const copy = getActionAgentCopy(locale);
    assert.ok(copy.availableDates && copy.availableDates.length >= 4, `missing availableDates for ${locale}`);
    assert.ok(copy.busyDates && copy.busyDates.length >= 4, `missing busyDates for ${locale}`);
    assert.ok(copy.estTotal.includes('{days}') && copy.estTotal.includes('{total}'), `bad estTotal for ${locale}`);
    assert.ok(copy.splitPerGuest.includes('{per}') && copy.splitPerGuest.includes('{n}'), `bad splitPerGuest for ${locale}`);
    assert.ok(copy.deliveryPlaceholder.length >= 6, `missing deliveryPlaceholder for ${locale}`);
    assert.ok(copy.splitPayOption.includes('{n}'), `bad splitPayOption for ${locale}`);
    const joined = Object.values(copy).join(' ').toLowerCase();
    assert.doesNotMatch(joined, /\bconcierge\b|консьерж/i, `forbidden wording in ${locale}`);
  }
});

test('Wave 1B: formatActionEstimate produces deterministic localized totals and split-pay', () => {
  const en = formatActionEstimate({ days: 3, estimatedTotalUsd: 4500, perGuestUsd: 1125, splitWays: 4, locale: 'en' });
  assert.equal(en.estimatedTotal, '3d est. $4,500');
  assert.equal(en.perGuest, '~$1,125/guest (4)');

  const ru = formatActionEstimate({ days: 3, estimatedTotalUsd: 4500, perGuestUsd: 1125, splitWays: 4, locale: 'ru' });
  assert.equal(ru.estimatedTotal, '3 дн. ≈ $4,500');
  assert.equal(ru.perGuest, '≈ $1,125/гость (4)');
});

test('Wave 1B: checkPreInferenceFleetAvailability inspects Supabase and injects prompt line', async () => {
  const cars = getRentals().slice(0, 2);
  assert.ok(cars.length >= 2);
  const busyCar = cars[0];

  const fetcher = makeSupabaseFetcher([
    { item_slug: busyCar.slug, dates: '2026-12-10 → 2026-12-13', status: 'pending' }
  ]);

  const res = await checkPreInferenceFleetAvailability({
    query: busyCar.title,
    pagePath: `/rentals/${busyCar.slug}`,
    profile: { dateRange: { from: '2026-12-10', to: '2026-12-13' }, guests: 4 },
    localSections: ['/rentals'],
    env: makeMockEnv(),
    fetcher
  });

  assert.equal(res.checked, true);
  assert.equal(res.statuses.get(busyCar.slug), 'busy');
  assert.ok(res.promptLine.includes('Live garage calendar (2026-12-10..2026-12-13)'));
  assert.ok(res.promptLine.includes('=busy'));
  assert.ok(res.promptLine.length <= 250);

  const msgs = modelMessages(
    [{ role: 'user', content: `Can I rent ${busyCar.title} from 2026-12-10 to 2026-12-13?` }],
    'en',
    { availabilityLine: res.promptLine }
  );
  assert.ok(msgs && msgs[0].role === 'system');
  assert.ok(msgs[0].content.includes(res.promptLine));
});

test('Wave 1B: checkPreInferenceFleetAvailability skips cleanly when no dateRange or non-rental query', async () => {
  let called = false;
  const fetcher = async () => { called = true; return new Response('[]'); };
  const noDates = await checkPreInferenceFleetAvailability({
    query: 'Lamborghini Urus',
    profile: { dateRange: null },
    localSections: ['/rentals'],
    env: makeMockEnv(),
    fetcher
  });
  assert.equal(noDates.checked, false);
  assert.equal(called, false);

  const diningOnly = await checkPreInferenceFleetAvailability({
    query: 'Komodo Miami',
    profile: { dateRange: { from: '2026-12-10', to: '2026-12-11' } },
    localSections: ['/restaurants-nightlife'],
    env: makeMockEnv(),
    fetcher
  });
  assert.equal(diningOnly.checked, false);
  assert.equal(called, false);
});

test('Wave 1B: enrichListingsWithAgentTools attaches badges, estimates, and re-ranks busy cars behind available ones', async () => {
  const cars = getRentals().filter((c) => /\$\d/.test(String(c.dailyPrice || ''))).slice(0, 2);
  assert.equal(cars.length, 2);
  const [busyCar, freeCar] = cars;

  const listings = [
    { href: `/rentals/${busyCar.slug}`, title: busyCar.title, label: 'Car', price: busyCar.dailyPrice },
    { href: '/restaurants-nightlife/komodo-miami', title: 'Komodo Miami', label: 'Restaurant' },
    { href: `/rentals/${freeCar.slug}`, title: freeCar.title, label: 'Car', price: freeCar.dailyPrice }
  ];

  const fetcher = makeSupabaseFetcher([
    { item_slug: busyCar.slug, dates: '2026-12-10 → 2026-12-13', status: 'reviewing' }
  ]);

  const enriched = await enrichListingsWithAgentTools(listings, {
    profile: { dateRange: { from: '2026-12-10', to: '2026-12-13' }, guests: 4 },
    locale: 'en',
    env: makeMockEnv(),
    fetcher
  });

  // Free car moves to slot 0, Restaurant stays anchored at slot 1, busy car drops to slot 2
  assert.equal(carSlugFromHref(enriched[0].href), freeCar.slug);
  assert.equal(enriched[0].availabilityStatus, 'available');
  assert.match(enriched[0].estimatedTotal, /^3d est\. \$/);
  assert.match(enriched[0].perGuest, /^~\$.*\/guest \(4\)$/);

  assert.equal(enriched[1].href, '/restaurants-nightlife/komodo-miami');
  assert.equal(enriched[1].availabilityStatus, undefined);

  assert.equal(carSlugFromHref(enriched[2].href), busyCar.slug);
  assert.equal(enriched[2].availabilityStatus, 'busy');

  // 'On request' vehicles still get live availability without hallucinating a dollar total
  const onRequestCar = getRentals().find((c) => !/\$\d/.test(String(c.dailyPrice || '')));
  if (onRequestCar) {
    const reqOut = await enrichListingsWithAgentTools(
      [{ href: `/rentals/${onRequestCar.slug}`, title: onRequestCar.title, label: 'Car', price: onRequestCar.dailyPrice }],
      { profile: { dateRange: { from: '2026-12-10', to: '2026-12-13' }, guests: 4 }, locale: 'en', env: makeMockEnv(), fetcher: makeSupabaseFetcher([]) }
    );
    assert.equal(reqOut[0].availabilityStatus, 'available');
    assert.equal(reqOut[0].estimatedTotal, undefined);
  }
});

test('Wave 1B: enrichPlanWithAgentTools enriches car candidates using preStatuses without extra DB fetch', async () => {
  const cars = getRentals().filter((c) => /\$\d/.test(String(c.dailyPrice || ''))).slice(0, 2);
  const [busyCar, freeCar] = cars;
  const preStatuses = new Map([
    [busyCar.slug, 'busy'],
    [freeCar.slug, 'available']
  ]);

  let fetched = false;
  const fetcher = async () => { fetched = true; return new Response('[]'); };

  const plan = {
    version: 1,
    guests: 4,
    requestable: true,
    sections: [
      {
        href: '/rentals',
        label: 'Luxury Cars',
        candidates: [
          { href: `/rentals/${busyCar.slug}`, title: busyCar.title, kind: 'car', slug: busyCar.slug, price: busyCar.dailyPrice },
          { href: `/rentals/${freeCar.slug}`, title: freeCar.title, kind: 'car', slug: freeCar.slug, price: freeCar.dailyPrice }
        ]
      },
      {
        href: '/restaurants-nightlife',
        label: 'Dining',
        candidates: [
          { href: '/restaurants-nightlife/komodo-miami', title: 'Komodo Miami', kind: 'dining', slug: 'komodo-miami' }
        ]
      }
    ]
  };

  const out = await enrichPlanWithAgentTools(plan, {
    profile: { dateRange: { from: '2026-12-10', to: '2026-12-12' }, guests: 4 },
    locale: 'ru',
    preStatuses,
    env: makeMockEnv(),
    fetcher
  });

  assert.equal(fetched, false, 'should reuse preStatuses without redundant DB query');
  assert.equal(out.sections[0].candidates[0].slug, freeCar.slug);
  assert.equal(out.sections[0].candidates[0].availabilityStatus, 'available');
  assert.match(out.sections[0].candidates[0].estimatedTotal, /^2 дн\. ≈ \$/);
  assert.equal(out.sections[0].candidates[1].availabilityStatus, 'busy');
});

test('Wave 1B: session navigationItem & chatSnapshot preserve availabilityStatus, estimatedTotal and perGuest safely', () => {
  const valid = navigationItem({
    href: '/rentals/lamborghini-urus-se',
    title: 'Lamborghini Urus SE',
    price: '$1,500/day',
    availabilityStatus: 'available',
    estimatedTotal: '3d est. $4,500',
    perGuest: '~$1,125/guest (4)'
  });
  assert.equal(valid.availabilityStatus, 'available');
  assert.equal(valid.estimatedTotal, '3d est. $4,500');
  assert.equal(valid.perGuest, '~$1,125/guest (4)');

  const invalidStatus = navigationItem({
    href: '/rentals/lamborghini-urus-se',
    title: 'Lamborghini Urus SE',
    availabilityStatus: 'hacked',
    estimatedTotal: 'x'.repeat(100)
  });
  assert.equal(invalidStatus.availabilityStatus, undefined);
  assert.equal(invalidStatus.estimatedTotal, undefined);

  const snap = chatSnapshot({
    messages: [{ role: 'assistant', content: 'Here are two cars.', listings: [valid] }],
    listings: [valid]
  });
  assert.equal(snap.listings[0].availabilityStatus, 'available');
  assert.equal(snap.messages[0].listings[0].perGuest, '~$1,125/guest (4)');
});
