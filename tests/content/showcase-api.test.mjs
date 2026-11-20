import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SHOWCASE_INTERVAL_MS, assembleShowcase } from '../../lib/heroShowcase.js';
import { showcaseApiItems, showcaseApiResult, showcaseImageUrl } from '../../lib/showcaseApi.js';

const SITE = 'https://miami.example/api/showcase';
const FIELDS = ['cat', 'href', 'title', 'image', 'price', 'company', 'length', 'location', 'bedrooms', 'category', 'kicker', 'lineId'];

// Cards exactly as the home page builds them, so the feed is tested on real shapes.
const cards = () => assembleShowcase({
  rentals: [
    { slug: 'own-car', id: 'own-car', title: 'Own', image: '/images/a.jpg', company: 'Elio', category: 'SUV', location: 'Miami', supplier: 'Elio', featured: true },
    { slug: 'priced', id: 'priced', title: 'Priced', thumbnail: '/images/b.jpg', company: 'Sunset Exotics', supplier: 'Sunset Exotics', category: 'Sports', location: 'Miami, FL', dailyPrice: '$2,000' }
  ],
  yachts: [{ slug: 'sea', id: 'sea', title: 'Sea', image: 'https://images.example/yacht.jpg', length: '70 ft', location: 'Miami Beach Marina' }],
  stays: [{ slug: 'house', id: 'house', title: 'House', image: '/images/c.jpg', location: 'Miami Beach', bedrooms: 4 }],
  tickets: [{ id: 'nba', href: '/events/category/nba', image: '/images/t.jpg', label: 'NBA' }],
  jetImage: '/images/jet.jpg'
});

test('the feed answers { intervalMs, items } with the documented fields only', async () => {
  const { body, cacheControl } = await showcaseApiResult(async () => cards(), SITE);
  assert.deepEqual(Object.keys(body), ['intervalMs', 'items']);
  assert.equal(body.intervalMs, SHOWCASE_INTERVAL_MS);
  assert.equal(cacheControl, 'public, s-maxage=600, stale-while-revalidate=3600');
  for (const item of body.items) {
    assert.deepEqual(Object.keys(item).filter((key) => !FIELDS.includes(key)), [], item.href);
    for (const value of Object.values(item)) assert.ok(value !== null && value !== undefined && value !== '', item.href);
  }
  const [own, priced, yacht, stay, jet, event] = body.items;
  assert.deepEqual(own, { cat: 'car', href: '/rentals/own-car', title: 'Own', image: 'https://miami.example/images/a.jpg', company: 'Elio', location: 'Miami', category: 'SUV' });
  assert.deepEqual(priced, { cat: 'car', href: '/rentals/priced', title: 'Priced', image: 'https://miami.example/images/b.jpg', price: '$2,000', company: 'Sunset Exotics', location: 'Miami, FL', category: 'Sports' });
  assert.deepEqual(yacht, { cat: 'yacht', href: '/yachts/sea', title: 'Sea', image: 'https://images.example/yacht.jpg', length: '70 ft', location: 'Miami Beach Marina' });
  assert.deepEqual(stay, { cat: 'stay', href: '/vacation-rentals/house', title: 'House', image: 'https://miami.example/images/c.jpg', location: 'Miami Beach', bedrooms: 4 });
  assert.deepEqual(jet, { cat: 'jet', href: '/private-jets', title: 'Private Jets', image: 'https://miami.example/images/jet.jpg' });
  assert.deepEqual(event, { cat: 'event', href: '/events/category/nba', title: 'NBA', image: 'https://miami.example/images/t.jpg', kicker: 'NBA', lineId: 'nba' });
});

test('every image in the feed is an absolute https URL, and site paths use the request origin', async () => {
  const { body } = await showcaseApiResult(async () => cards(), 'http://miami.example/api/showcase');
  assert.equal(body.items.length, 6);
  for (const item of body.items) assert.match(item.image, /^https:\/\/[^/]+\//, item.href);
  assert.equal(body.items[0].image, 'https://miami.example/images/a.jpg');
  assert.equal(body.items[2].image, 'https://images.example/yacht.jpg');
});

test('images: https is kept, /images/ paths are made absolute, everything else is dropped', () => {
  assert.equal(showcaseImageUrl('https://images.example/yacht.jpg?w=900', SITE), 'https://images.example/yacht.jpg?w=900');
  assert.equal(showcaseImageUrl('/images/home/a.jpg', `${SITE}?x=1`), 'https://miami.example/images/home/a.jpg');
  assert.equal(showcaseImageUrl('/images/a b.jpg?v=2', SITE), 'https://miami.example/images/a%20b.jpg?v=2');
  const dropped = [
    'http://images.example/a.jpg', 'HTTP://images.example/a.jpg', 'data:image/png;base64,AAAA', '//images.example/a.jpg',
    'ftp://images.example/a.jpg', 'images/a.jpg', '/rentals/a.jpg', '/images', '/images/../secret.jpg', '/images/%2e%2e/secret.jpg',
    '/images/a\\..\\..\\secret.jpg', 'https://user:pw@images.example/a.jpg', 'https://', '', '   ', null, undefined, 42, {},
    // Protocol-relative URLs would resolve to another host even with /images/ in their path.
    '//images.example/images/a.jpg', '/\\images.example/images/a.jpg'
  ];
  for (const src of dropped) assert.equal(showcaseImageUrl(src, SITE), null, String(src));
});

test('the request origin picks the host, and https is forced except on local hosts', () => {
  const path = '/images/a.jpg';
  assert.equal(showcaseImageUrl(path, 'http://miami.example/api/showcase'), 'https://miami.example/images/a.jpg');
  assert.equal(showcaseImageUrl(path, 'http://miami.example:8080/api/showcase'), 'https://miami.example:8080/images/a.jpg');
  assert.equal(showcaseImageUrl(path, 'http://localhost.evil.example/api/showcase'), 'https://localhost.evil.example/images/a.jpg');
  assert.equal(showcaseImageUrl(path, 'http://localhost:3000/api/showcase'), 'http://localhost:3000/images/a.jpg');
  assert.equal(showcaseImageUrl(path, 'http://127.0.0.1:3000/api/showcase'), 'http://127.0.0.1:3000/images/a.jpg');
  assert.equal(showcaseImageUrl(path, 'http://[::1]:3000/api/showcase'), 'http://[::1]:3000/images/a.jpg');
  assert.equal(showcaseImageUrl(path, 'https://localhost:3000/api/showcase'), 'https://localhost:3000/images/a.jpg');
  // Credentials and the path of the request never reach the output.
  assert.equal(showcaseImageUrl(path, 'https://user:pw@miami.example/deep/path?q=1#top'), 'https://miami.example/images/a.jpg');
  // Without a usable request URL only absolute https images survive.
  for (const url of [undefined, null, '', 'not a url', 'ftp://miami.example/api', 'file:///api/showcase']) {
    assert.equal(showcaseImageUrl(path, url), null, String(url));
    assert.equal(showcaseImageUrl('https://images.example/a.jpg', url), 'https://images.example/a.jpg', String(url));
  }
});

test('cards without a known category, a link, a title or a usable image are dropped', () => {
  const good = { cat: 'yacht', href: '/yachts/sea', title: 'Sea', image: '/images/sea.jpg' };
  const kept = { cat: 'yacht', href: '/yachts/sea', title: 'Sea', image: 'https://miami.example/images/sea.jpg' };
  const items = showcaseApiItems([
    good,
    { ...good, href: '' }, { ...good, href: '   ' }, { ...good, href: null }, { ...good, href: undefined }, { ...good, href: 7 },
    { ...good, title: '' }, { ...good, title: '  ' }, { ...good, title: null }, { ...good, title: undefined },
    { ...good, image: 'http://images.example/sea.jpg' }, { ...good, image: 'data:image/png;base64,AAAA' },
    { ...good, image: '//images.example/sea.jpg' }, { ...good, image: '' }, { ...good, image: undefined },
    { ...good, cat: 'boat' }, { ...good, cat: '' }, { ...good, cat: undefined },
    null, undefined, 'yacht', 42, []
  ], SITE);
  assert.deepEqual(items, [kept]);
  for (const input of [undefined, null, {}, 'cards', 42]) assert.deepEqual(showcaseApiItems(input, SITE), []);
});

test('only the documented fields survive, and blank or invalid values are left out', () => {
  const stay = {
    cat: 'stay', id: 'house', href: ' /vacation-rentals/house ', title: ' House ', image: '/images/house.jpg',
    price: null, company: '', length: '   ', location: 'Miami Beach', bedrooms: 2, category: undefined,
    kicker: 'Stay', lineId: 'house', supplier: 'Elio', dailyPrice: '$500', thumbnail: '/images/t.jpg', email: 'guest@example.com'
  };
  assert.deepEqual(showcaseApiItems([stay], SITE), [{
    cat: 'stay', href: '/vacation-rentals/house', title: 'House', image: 'https://miami.example/images/house.jpg',
    location: 'Miami Beach', bedrooms: 2, kicker: 'Stay', lineId: 'house'
  }]);
  for (const bedrooms of [0, -1, NaN, Infinity, '4', null, undefined, true]) {
    const [item] = showcaseApiItems([{ ...stay, bedrooms }], SITE);
    assert.equal('bedrooms' in item, false, String(bedrooms));
  }
});

test('a failed or empty build still answers with an empty list and a short cache', async () => {
  const logged = console.error;
  const calls = [];
  console.error = (...args) => calls.push(args);
  try {
    const failing = [async () => { throw new Error('inventory down'); }, () => { throw new Error('sync failure'); }];
    const empty = [
      async () => [],
      async () => undefined,
      async () => [{ cat: 'car', href: '/rentals/x', title: 'X', image: 'http://insecure.example/x.jpg' }]
    ];
    for (const load of [...failing, ...empty]) {
      const { body, cacheControl } = await showcaseApiResult(load, SITE);
      assert.deepEqual(body, { intervalMs: SHOWCASE_INTERVAL_MS, items: [] });
      assert.equal(cacheControl, 'public, s-maxage=60');
    }
    assert.equal(calls.length, failing.length);
  } finally {
    console.error = logged;
  }
});

test('the route is a thin anonymous adapter over the showcase helper', () => {
  const route = readFileSync(new URL('../../app/api/showcase/route.js', import.meta.url), 'utf8');
  assert.match(route, /export const runtime = 'nodejs';/);
  assert.match(route, /export const dynamic = 'force-dynamic';/);
  assert.match(route, /export async function GET\(request\)/);
  assert.match(route, /showcaseApiResult\(buildHeroShowcase, request\.url\)/);
  assert.match(route, /NextResponse\.json\(/);
  assert.doesNotMatch(route, /next\/headers|request\.(?:cookies|headers)|\bcookies\(|\bheaders\(\)/);
});
