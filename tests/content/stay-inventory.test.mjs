import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import load from '../concierge/load.cjs';

const source = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('retired sample villas cannot reappear through the catalogue repository or search RPC', async (t) => {
  const { getVacationRentals, getVacationRentalBySlug, searchListings } = load('lib/data/listings.js');
  t.mock.method(globalThis, 'fetch', async () => Response.json([
    { world: 'vacation-rentals', slug: 'star-island-estate', title: 'Star Island Estate' },
    { world: 'car-rentals', slug: 'current-car', title: 'Current Car' },
  ]));
  const previousUrl = process.env.SUPABASE_URL, previousKey = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = 'https://inventory.example';
  process.env.SUPABASE_ANON_KEY = 'fixture';
  try {
    assert.deepEqual(await getVacationRentals(), []);
    assert.equal(await getVacationRentalBySlug('star-island-estate'), undefined);
    const results = await searchListings('estate and car');
    assert.ok(fetch.mock.callCount() > 0, 'exercise the live-search adapter');
    assert.ok(!results.some((item) => item.href.startsWith('/vacation-rentals/')), 'no villa detail page in search');
    assert.ok(results.some((item) => item.href === '/rentals/current-car'));
    assert.deepEqual((await searchListings('villa', { world: 'vacation-rentals' })).map((item) => item.href), ['/vacation-rentals']);
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = previousKey;
  }
});

test('the site keeps no villas of its own anywhere', () => {
  const { getVacationRentals } = load('lib/vacationRentalsData.js');
  assert.deepEqual(getVacationRentals(), []);
  // Old links of the sample villas lead to the Stay22 search.
  assert.match(source('app/vacation-rentals/[slug]/page.js'), /permanentRedirect\('\/vacation-rentals'\)/);
  // The stays page lists nothing of its own: only the Stay22 search.
  const page = source('app/vacation-rentals/StayContent.jsx');
  assert.match(page, /<Stay22Browse/);
  assert.doesNotMatch(page, /ListingCard/);
});

test('My Miami filters legacy villa favourites and keeps supported inventory', () => {
  const { favouriteKind, favouriteRef, planRequest } = load('lib/myMiami.mjs');
  const legacy = { href: '/vacation-rentals/star-island-estate', title: 'Star Island Estate' };
  const car = { href: '/rentals/current-car', title: 'Current Car' };
  assert.equal(favouriteKind(legacy.href), null);
  assert.equal(favouriteRef(legacy.href), null);
  assert.equal(planRequest([legacy, car], { template: '{items}', sections: { car: 'Cars' } }), 'Cars: Current Car');
});
