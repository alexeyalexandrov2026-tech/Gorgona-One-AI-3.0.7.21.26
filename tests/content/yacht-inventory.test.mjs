import { test } from 'node:test';
import assert from 'node:assert/strict';
import load from '../concierge/load.cjs';

test('legacy yacht rows cannot reappear through the catalogue repository or search RPC', async (t) => {
  const { getYachts, getYachtBySlug, searchListings } = load('lib/data/listings.js');
  t.mock.method(globalThis, 'fetch', async () => Response.json([
    { world: 'yachts', slug: 'retired-yacht', title: 'Retired Yacht' },
    { world: 'car-rentals', slug: 'current-car', title: 'Current Car' },
  ]));
  const previousUrl = process.env.SUPABASE_URL, previousKey = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = 'https://inventory.example';
  process.env.SUPABASE_ANON_KEY = 'fixture';
  try {
    assert.deepEqual(await getYachts(), []);
    assert.equal(await getYachtBySlug('retired-yacht'), undefined);
    const results = await searchListings('yacht and car');
    assert.ok(fetch.mock.callCount() > 0, 'exercise the live-search adapter');
    assert.deepEqual(results.map(item => item.href), ['/yachts', '/rentals/current-car']);
    assert.deepEqual((await searchListings('яхта', { world: 'yachts' })).map(item => item.href), ['/yachts']);
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = previousKey;
  }
});

test('My Miami filters legacy yacht favourites and keeps supported inventory', () => {
  const { favouriteKind, favouriteRef, planRequest } = load('lib/myMiami.mjs');
  const legacy = { href: '/yachts/retired-yacht', title: 'Retired Yacht' };
  const car = { href: '/rentals/current-car', title: 'Current Car' };
  assert.equal(favouriteKind(legacy.href), null);
  assert.equal(favouriteRef(legacy.href), null);
  assert.equal(planRequest([legacy, car], { template: '{items}', sections: { car: 'Cars' } }), 'Cars: Current Car');
});
