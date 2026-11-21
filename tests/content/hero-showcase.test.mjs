import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HOME_SECTIONS } from '../../lib/homeData.js';
import { assembleShowcase, cornerSide, localPhotoPresent, nextShowcaseStep, showcasePrice } from '../../lib/heroShowcase.js';

const pageFor = (href) => new URL(`../../app${href}/page.js`, import.meta.url);

test('the section rail links to pages that exist, including the five that were missing', () => {
  assert.deepEqual(HOME_SECTIONS.map((section) => section.href), [
    '/travel', '/exclusive-destinations', '/vacation-rentals', '/yachts', '/rentals', '/events',
    '/private-jets', '/experiences', '/restaurants-nightlife', '/discovery'
  ]);
  for (const section of HOME_SECTIONS) {
    assert.equal(existsSync(pageFor(section.href)), true, section.href);
    if (section.image) assert.equal(existsSync(new URL(`../../public${section.image}`, import.meta.url)), true, section.image);
  }
});

test('showcase cards keep only real photos, prices and listing links', () => {
  assert.equal(showcasePrice('On request'), null);
  assert.equal(showcasePrice('$2,000'), '$2,000');
  const cards = assembleShowcase({
    rentals: [
      { slug: 'no-photo', title: 'Hidden', image: '', supplier: 'Sunset Exotics', dailyPrice: '$9' },
      { slug: 'own-car', id: 'own-car', title: 'Own', image: '/images/a.jpg', company: 'Elio', category: 'SUV', location: 'Miami', supplier: 'Elio', featured: true },
      { slug: 'priced', id: 'priced', title: 'Priced', thumbnail: '/images/b.jpg', company: 'Sunset Exotics', supplier: 'Sunset Exotics', category: 'Sports', location: 'Miami, FL', dailyPrice: '$2,000' }
    ],
    yachts: [{ slug: 'sea', id: 'sea', title: 'Sea', image: 'https://images.example/yacht.jpg', length: '70 ft', location: 'Miami Beach Marina' }],
    stays: [{ slug: 'house', id: 'house', title: 'House', image: '/images/c.jpg', location: 'Miami Beach', bedrooms: 4 }],
    tickets: [{ id: 'nba', href: '/events/category/nba', image: '/images/t.jpg', label: 'NBA' }],
    jetImage: '/images/jet.jpg'
  });
  assert.deepEqual(cards.map((card) => card.href), [
    '/rentals/own-car', '/rentals/priced', '/yachts/sea', '/vacation-rentals/house', '/private-jets', '/events/category/nba'
  ]);
  assert.equal(cards[1].price, '$2,000');
  assert.equal(cards[0].price, null);
});

test('local photos stay on the worker when public/ is not a directory', () => {
  const shipped = new Set([
    '/images/rentals/lamborghini-urus-se/cover-s.jpg',
    '/images/home/worlds/travel-wing.jpg',
    '/images/home/tickets/basketball-1100.webp'
  ]);
  const worker = { diskReady: false, onDisk: () => false, shipped };
  assert.equal(localPhotoPresent('/images/rentals/lamborghini-urus-se/cover-s.jpg', worker), true);
  assert.equal(localPhotoPresent('/images/home/worlds/travel-wing.jpg', worker), true);
  assert.equal(localPhotoPresent('/images/home/tickets/basketball-1100.webp', worker), true);
  assert.equal(localPhotoPresent('/images/rentals/not-in-the-build.jpg', worker), false);
  assert.equal(localPhotoPresent('https://images.unsplash.com/photo-1567899378494-47b22a2ae96a', worker), true);
  assert.equal(localPhotoPresent('/images/../secret.jpg', worker), false);
  assert.equal(localPhotoPresent('', worker), false);

  const cards = assembleShowcase({
    rentals: [
      { slug: 'urus', id: 'urus', title: 'Urus', image: '/images/rentals/lamborghini-urus-se/cover-s.jpg', supplier: 'Elio', category: 'SUV', location: 'Miami', featured: true },
      { slug: 'ghost', id: 'ghost', title: 'Ghost', image: '/images/rentals/not-in-the-build.jpg', supplier: 'Elio', category: 'SUV', location: 'Miami' }
    ],
    yachts: [{ slug: 'sea', id: 'sea', title: 'Sea', image: 'https://images.unsplash.com/photo-1', location: 'Miami' }],
    stays: [],
    tickets: [{ id: 'nba', href: '/events/category/nba', image: '/images/home/tickets/basketball-1100.webp', label: 'NBA' }],
    jetImage: '/images/home/worlds/travel-wing.jpg'
  }).filter((card) => localPhotoPresent(card.image, worker));
  assert.deepEqual(cards.map((card) => card.cat).sort(), ['car', 'event', 'jet', 'yacht']);
});

test('a file missing from disk is dropped even if a stale asset list names it', () => {
  const decision = {
    diskReady: true,
    onDisk: (src) => src === '/images/rentals/real.jpg',
    shipped: new Set(['/images/rentals/real.jpg', '/images/rentals/deleted.jpg'])
  };
  assert.equal(localPhotoPresent('/images/rentals/real.jpg', decision), true);
  assert.equal(localPhotoPresent('/images/rentals/deleted.jpg', decision), false);
});

test('rotation changes category and side, and does not repeat an item early', () => {
  const pool = ['car', 'yacht', 'stay', 'jet', 'event'].flatMap((cat) => [1, 2].map((n) => ({ cat, href: `/${cat}-${n}` })));
  let state = { lastCat: '', lastCorner: '', lastEnter: '', used: new Set() };
  let rnd = 0.1;
  const random = () => { rnd = (rnd + 0.37) % 1; return rnd; };
  const steps = [];
  for (let i = 0; i < pool.length; i += 1) {
    const step = nextShowcaseStep(pool, state, random, false);
    steps.push(step);
    state = step.state;
  }
  assert.equal(new Set(steps.map((step) => step.item.href)).size, pool.length);
  for (let i = 1; i < steps.length; i += 1) {
    const seen = new Set(steps.slice(0, i).map((step) => step.item.href));
    const canSwitch = pool.some((item) => !seen.has(item.href) && item.cat !== steps[i - 1].item.cat);
    if (canSwitch) assert.notEqual(steps[i].item.cat, steps[i - 1].item.cat);
    assert.notEqual(cornerSide(steps[i].corner), cornerSide(steps[i - 1].corner));
  }
  assert.equal(state.used.size, pool.length);
  const again = nextShowcaseStep(pool, state, random, false);
  assert.equal(again.state.used.size, 1);
  assert.notEqual(again.item.cat, steps.at(-1).item.cat);
});
