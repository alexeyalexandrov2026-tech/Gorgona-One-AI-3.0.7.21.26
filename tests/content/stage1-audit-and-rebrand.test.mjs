import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import load from '../concierge/load.cjs';
import { extractCarBrand, rentalBrands, rentalPage } from '../../lib/sunsetFleet.mjs';
import { getRentals } from '../../lib/rentalsData.js';
import { managerWhatsAppUrl, configuredManagerWhatsApp, MANAGER_WHATSAPP } from '../../lib/managerContact.mjs';
import { translations } from '../../lib/i18n.js';

const { replyMentionedCards, listingCards, namedVenueCards } = load('lib/ai/listingCards.mjs');
const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('Stage 1 AI fixes: accented Michelin replyMentionedCards, yacht charter priority, specific-car handoff & ELIO identity', () => {
  const michelinReply = "В Design District для звезды Michelin лучший выбор — L'Atelier de Joël Robuchon или Le Jardinier.";
  const cards = replyMentionedCards(michelinReply, { sections: ['/restaurants-nightlife'], limit: 3 });
  const titles = cards.map((c) => c.title);
  assert.ok(titles.some((t) => /Robuchon/i.test(t)), `Expected Robuchon in ${titles}`);
  assert.ok(titles.some((t) => /Le Jardinier/i.test(t)), `Expected Le Jardinier in ${titles}`);

  // Yacht queries must surface curated Yacht charters ahead of generic Viator boat experiences.
  const yachtCards = listingCards('private yacht in Miami for 10 guests', { sections: ['/yachts'], limit: 3 });
  assert.equal(yachtCards.length, 3);
  assert.ok(yachtCards.every((c) => c.label === 'Yacht'), `Expected only Yacht cards, got ${yachtCards.map((c) => c.label)}`);

  // Named car model handoff attaches that exact vehicle; generic brand remains empty.
  const urusHandoff = namedVenueCards('Book Lamborghini Urus right now and charge my Visa card $1500');
  assert.equal(urusHandoff.length, 1);
  assert.match(urusHandoff[0].href, /^\/rentals\/.*urus/i);
  assert.deepEqual(namedVenueCards('Please book the Lamborghini and charge my card'), []);

  // AI prompt introduces itself as ELIO (ELIO+ Guide), not concierge.
  const brain = read('lib/ai/workersBrain.mjs');
  assert.match(brain, /You are ELIO/);
  assert.match(brain, /ELIO\+ Guide/);
});

test('Stage 1 SEO, CSP & Ovago g1 fixes', () => {
  const mw = read('middleware.js');
  assert.match(mw, /style-src[^"]*https:\/\/www\.privatejetfinder\.com\s+https:\/\/\*\.privatejetfinder\.com/);

  const jets = read('app/private-jets/page.js');
  assert.match(jets, /pageMetadata\(/);
  const yachts = read('app/yachts/page.js');
  assert.match(yachts, /pageMetadata\(/);

  const ovago = read('app/travel/ovago/page.js');
  assert.doesNotMatch(ovago, /sportsbook-banner|market-card|market-button/);
  assert.match(ovago, /font-g1display/);
  assert.match(ovago, /sectionJsonLd\(/);
});

test('Stage 1 Rentals brand filter, search and price sort work across the full 290-car fleet', () => {
  const cars = getRentals();
  assert.ok(cars.length >= 250);
  const brands = rentalBrands(cars);
  const byName = Object.fromEntries(brands.map((b) => [b.name, b.count]));
  assert.ok(byName['Lamborghini'] >= 50);
  assert.ok(byName['Mercedes-Benz'] >= 60);
  assert.ok(byName['Rolls-Royce'] >= 25);
  assert.equal(extractCarBrand({ title: '2024 Rolls Royce Cullinan' }), 'Rolls-Royce');
  assert.equal(extractCarBrand({ title: 'Mercedes-Maybach GLS 600' }), 'Mercedes-Benz');

  const lambo = rentalPage(cars, { brand: 'Lamborghini' });
  assert.equal(lambo.total, byName['Lamborghini']);
  assert.ok(lambo.cars.every((c) => extractCarBrand(c) === 'Lamborghini'));

  const searched = rentalPage(cars, { q: 'cullinan' });
  assert.ok(searched.total >= 5);
  assert.ok(searched.cars.every((c) => /cullinan/i.test(c.title)));

  const asc = rentalPage(cars, { brand: 'Lamborghini', sort: 'price-asc' });
  const desc = rentalPage(cars, { brand: 'Lamborghini', sort: 'price-desc' });
  assert.ok(asc.cars.length > 0 && desc.cars.length > 0);
  assert.notEqual(asc.cars[0].slug, desc.cars[0].slug);
});

test('Stage 1 Branded WhatsApp Business, Miami Phone & Yachts ELIO+ Shield (compliant, zero free-insurance wording)', () => {
  assert.equal(MANAGER_WHATSAPP, 'https://wa.me/message/VO7GCPZCDKRZO1');
  assert.equal(managerWhatsAppUrl(''), null);
  assert.equal(managerWhatsAppUrl('+1 (786) 492-8880'), 'https://wa.me/17864928880');
  assert.equal(managerWhatsAppUrl('https://wa.me/17864928880'), 'https://wa.me/17864928880');
  assert.equal(managerWhatsAppUrl('https://wa.me/message/VO7GCPZCDKRZO1'), 'https://wa.me/message/VO7GCPZCDKRZO1');
  for (const bad of ['abc', '0123456', 'http://wa.me/13055550199', 'https://evil.test/13055550199', 'javascript:alert(1)']) {
    assert.equal(managerWhatsAppUrl(bad), null, bad);
  }
  const saved = process.env.NEXT_PUBLIC_MANAGER_WHATSAPP;
  try {
    delete process.env.NEXT_PUBLIC_MANAGER_WHATSAPP;
    assert.equal(configuredManagerWhatsApp(), 'https://wa.me/message/VO7GCPZCDKRZO1');
    process.env.NEXT_PUBLIC_MANAGER_WHATSAPP = '+13055550199';
    assert.equal(configuredManagerWhatsApp(), 'https://wa.me/13055550199');
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_MANAGER_WHATSAPP;
    else process.env.NEXT_PUBLIC_MANAGER_WHATSAPP = saved;
  }

  for (const [locale, dict] of Object.entries(translations)) {
    assert.ok(typeof dict.ai?.liveManagerWhatsApp === 'string' && dict.ai.liveManagerWhatsApp.length > 5, locale);
  }

  const yatrCopy = read('lib/yatrCopy.js');
  assert.match(yatrCopy, /ELIO\+ Shield & Care 24\/7/);
  assert.doesNotMatch(yatrCopy, /free insurance/i);
  const footer = read('app/components/Footer.jsx');
  assert.match(footer, /configuredManagerPhone/);
});
