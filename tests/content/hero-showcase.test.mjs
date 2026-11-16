import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HOME_SECTIONS } from '../../lib/homeData.js';
import { assembleShowcase, cornerSide, nextShowcaseStep, showcasePrice } from '../../lib/heroShowcase.js';

const pageFor = (href) => new URL(`../../app${href}/page.js`, import.meta.url);

test('the section rail links to pages that exist, including the five that were missing', () => {
  assert.deepEqual(HOME_SECTIONS.map((section) => section.href), [
    '/travel', '/vacation-rentals', '/yachts', '/rentals', '/events',
    '/private-jets', '/experiences', '/entertainment/adrenaline-365', '/restaurants-nightlife', '/discovery'
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
