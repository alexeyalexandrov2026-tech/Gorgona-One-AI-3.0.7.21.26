import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalRentalLocation, rentalLocations, rentalPage } from '../../lib/sunsetFleet.mjs';

const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

test('Step 2 Simplify: rental locations deduplicate Miami / Miami, FL and exclude On request while preserving NYC filter', () => {
  assert.equal(canonicalRentalLocation('Miami'), 'Miami, FL');
  assert.equal(canonicalRentalLocation('Miami, FL'), 'Miami, FL');
  assert.equal(canonicalRentalLocation('On request'), '');
  assert.equal(canonicalRentalLocation('New York City, NY'), 'New York City, NY');

  const sample = [
    { slug: 'a', category: 'SUVs', location: 'Miami', title: 'Car A' },
    { slug: 'b', category: 'SUVs', location: 'Miami, FL', title: 'Car B' },
    { slug: 'c', category: 'SUVs', location: 'On request', title: 'Car C' },
    { slug: 'd', category: 'SUVs', location: 'New York City, NY', title: 'Car D' }
  ];
  assert.deepEqual(rentalLocations(sample), ['Miami, FL', 'New York City, NY']);
  assert.equal(rentalPage(sample, { location: 'Miami, FL' }).total, 2);
  assert.equal(rentalPage(sample, { location: 'New York City, NY' }).total, 1);
});

test('Step 2 Simplify: Homepage exposes visible H1, removes duplicate top section rail & compacts worlds grid, Gallery has prev/next + counter, /trip has guest preview', () => {
  const hero = read('app/components/home/HomeHero.jsx');
  assert.doesNotMatch(hero, /<h1 className="sr-only">/);
  assert.doesNotMatch(hero, /<HomeSectionRail/, 'redundant top marquee strip duplicating Header nav removed from HomeHero');
  assert.match(hero, /<h1[^>]*>[\s\S]*copy\.titleA[\s\S]*copy\.titleEm[\s\S]*copy\.titleB/);

  const home = read('app/HomePage.jsx');
  assert.match(home, /grid grid-cols-2 gap-3 sm:grid-cols-4/, 'worlds directory compacted into clean 2x4 grid');

  const gallery = read('app/components/g1/Gallery.jsx');
  assert.match(gallery, /\{index \+ 1\} \/ \{total\}/);
  assert.match(gallery, /role="group"/);

  const trip = read('app/trip/page.js');
  assert.match(trip, /data-trip-room-preview="true"/);
  assert.match(trip, /openAiDock/);
});
