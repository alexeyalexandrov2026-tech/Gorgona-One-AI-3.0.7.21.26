import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { getTravelHubCopy } from '../../lib/travelHubCopy.mjs';
import { buildDayTimeline, buildPlanIcs, getTimelineCopy } from '../../lib/ai/dayTimeline.mjs';

const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
const exists = (rel) => fs.existsSync(new URL('../../' + rel, import.meta.url));

test('Travel Hub copy covers all 16 locales without concierge wording and ships bespoke WebP visuals', () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    const c = getTravelHubCopy(code);
    assert.ok(c.titleLine1 && c.tabFlights && c.tabHotels && c.tabVillas && c.ovagoBusiness && c.hotelsAllCta && c.villasAllCta, code);
    assert.doesNotMatch(JSON.stringify(c), /\bconcierge\b|консьерж/i, code);
  }
  for (const img of [
    'public/images/travel/hero-miami-dusk.webp',
    'public/images/travel/flights-first-class.webp',
    'public/images/travel/hotels-ocean-resort.webp',
    'public/images/travel/villas-penthouse-terrace.webp',
    'public/images/home/hero-tower.webp',
    'public/images/ocean/sea.webp'
  ]) {
    assert.ok(exists(img), `missing WebP asset ${img}`);
  }
  assert.equal(exists('public/images/rentals/mercedes-g-class-white'), false, '7.3 MB duplicate rental folder must stay removed');

  const hub = read('app/travel/TravelHubClient.jsx');
  assert.match(hub, /travel-flights/);
  assert.match(hub, /travel-hotels/);
  assert.match(hub, /travel-villas/);
  assert.match(hub, /rel="sponsored noopener noreferrer"/);
  assert.doesNotMatch(hub, /miami-coast\.webp|deco-hotel\.jpg|travel-beach\.webp|unsplash\.com/);

  assert.match(read('app/components/home/HomeHero.jsx'), /hero-tower\.webp/);
  assert.match(read('app/globals.css'), /\/images\/ocean\/sea\.webp/);
});

test('Miami Day Timeline orders stops, supports all 16 locales, and exports valid RFC 5545 .ics calendar', () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    const c = getTimelineCopy(code);
    assert.ok(c.heading && c.exportIcs && c.rainPlanB && c.rainPrompt, code);
    assert.doesNotMatch(JSON.stringify(c), /\bconcierge\b|консьерж/i, code);
  }
  const samplePlan = {
    sections: [
      { href: '/restaurants-nightlife', label: 'Dining', candidates: [{ kind: 'dining', slug: 'komodo-miami', title: 'Komodo', href: '/restaurants-nightlife/komodo-miami' }] },
      { href: '/rentals', label: 'Cars', candidates: [{ kind: 'car', slug: 'lamborghini-urus-se', title: 'Lamborghini Urus SE', price: '$1,500/day', href: '/rentals/lamborghini-urus-se' }] },
      { href: '/yachts', label: 'Yachts', candidates: [{ kind: 'yacht', slug: 'sunseeker-75', title: '75ft Luxury Yacht', href: '/yachts' }] }
    ]
  };
  const stops = buildDayTimeline(samplePlan, { dateRange: { from: '2026-12-05' } }, 'ru');
  assert.equal(stops.length, 3);
  assert.deepEqual(stops.map((s) => s.kind), ['car', 'yacht', 'dining']);
  assert.equal(stops[0].driveHint, null);
  assert.ok(stops[1].driveHint && stops[2].driveHint);

  const ics = buildPlanIcs(samplePlan, { dateRange: { from: '2026-12-05' } }, 'en');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART;TZID=America\/New_York:20261205T110000/);
  assert.match(ics, /SUMMARY:Miami Elio — Lamborghini Urus SE/);
  assert.match(ics, /SUMMARY:Miami Elio — Komodo/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});
