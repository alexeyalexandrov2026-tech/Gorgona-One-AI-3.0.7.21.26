import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CATALOGUE } from '../../lib/dining/catalogue.mjs';
import { EDITORIAL_CUISINES } from '../../lib/dining/editorial.mjs';
import { getVenues } from '../../lib/restaurantsNightlifeData.js';
import { venueJsonLd } from '../../lib/seo.mjs';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const exists = (rel) => existsSync(new URL(`../../${rel}`, import.meta.url));

test('Phase 1A: all 61 verified restaurants carry an editorial or sheet cuisine and emit servesCuisine JSON-LD', () => {
  const restaurants = getVenues().filter((v) => v.category === 'restaurant');
  assert.equal(restaurants.length, 61);
  const missing = restaurants.filter((v) => !v.cuisine || !String(v.cuisine).trim());
  assert.deepEqual(missing.map((v) => v.id), [], 'Every verified restaurant must have a cuisine');

  const ids = new Set(CATALOGUE.filter((v) => v.category === 'restaurant').map((v) => v.id));
  for (const [id, cuisine] of Object.entries(EDITORIAL_CUISINES)) {
    assert.ok(ids.has(id), `EDITORIAL_CUISINES id not found in restaurants: ${id}`);
    assert.ok(typeof cuisine === 'string' && cuisine.trim().length > 0, id);
  }

  for (const [id, expected] of [
    ['latelier-de-joel-robuchon', 'French'],
    ['elcielo', 'Colombian'],
    ['boia-de', 'Italian'],
    ['los-felix', 'Mexican'],
    ['hiden', 'Japanese'],
    ['sunnys', 'Steakhouse']
  ]) {
    const venue = restaurants.find((v) => v.id === id);
    assert.equal(venue?.cuisine, expected, id);
    assert.equal(venueJsonLd(venue)?.servesCuisine, expected, `${id} JSON-LD servesCuisine`);
  }
});

test('Phase 1A: SaveButton is mounted on car and restaurant cards and detail pages without bloating shared ui.jsx', () => {
  const ui = read('app/components/g1/ui.jsx');
  assert.doesNotMatch(ui, /SaveButton/, 'ui.jsx must not statically import SaveButton into non-favorite pages');
  assert.match(ui, /\{action\}/);
  assert.match(read('app/rentals/page.js'), /<SaveButton overlay href=\{`\/rentals\/\$\{car\.slug\}`\}/);
  assert.match(read('app/rentals/[slug]/page.js'), /<SaveButton\s+href=\{`\/rentals\/\$\{rental\.slug\}`\}/);
  assert.match(read('app/components/VenueCard.jsx'), /<SaveButton overlay href=\{`\/restaurants-nightlife\/\$\{venue\.slug\}`\}/);
  assert.match(read('app/restaurants-nightlife/[slug]/page.js'), /<SaveButton href=\{`\/restaurants-nightlife\/\$\{venue\.slug\}`\}/);
  assert.match(read('app/restaurants-nightlife/[slug]/page.js'), /dining\.cuisine/);
});

test('Phase 1A: orphaned 15.3 MB events-hero.mp4 video is removed from public/videos', () => {
  assert.equal(exists('public/videos/events-hero.mp4'), false);
});
