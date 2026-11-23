import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import load from '../concierge/load.cjs';

const { getEcosystemIndex } = load('lib/ai/ecosystemIndex.js');
const { listingCards } = load('lib/ai/listingCards.mjs');
const { safeNavigationHref } = load('lib/ai/session.mjs');
const { VIATOR_YACHTS } = load('lib/viatorYachts.mjs');
const { VIATOR_DIRECT_CARDS } = load('lib/viatorCatalogue.mjs');
const { HEADOUT_CATALOGUE_URL, HEADOUT_COLLECTIONS } = load('lib/headoutCatalog.mjs');

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const exists = (rel) => existsSync(new URL(`../../${rel}`, import.meta.url));

test('Phase 0: all 14 curated VIATOR_YACHTS are indexed in AI ecosystemIndex with capacity and no card collapse', () => {
  const index = getEcosystemIndex();
  const yachts = index.filter((e) => e.type === 'Yacht');
  assert.equal(yachts.length, VIATOR_YACHTS.length);
  for (const y of VIATOR_YACHTS) {
    const entry = yachts.find((e) => e.id === `yacht-${y.id}`);
    assert.ok(entry, `Missing indexed yacht ${y.id}`);
    assert.equal(entry.booking?.platform, 'viator');
    assert.ok(entry.booking?.href.includes('uid=U00885857'), y.id);
  }
  const twelveGuest = yachts.find((e) => e.id === 'yacht-viator-yacht-464279p1');
  assert.equal(twelveGuest?.capacity, 12);
  const cards = listingCards('private yacht in Miami', { sections: ['/yachts'], limit: 4 });
  assert.equal(cards.length, 4, 'multiple distinct Viator yacht cards must survive deduplication');
  assert.equal(new Set(cards.map((c) => c.booking?.href)).size, 4);
});

test('Phase 0: live sports CATEGORY_IMAGES point to existing public files and AI routes allow /exclusive-destinations', () => {
  const eventsSrc = read('lib/server/conciergeEvents.mjs');
  const paths = [...eventsSrc.matchAll(/'(\/images\/events\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(paths.length >= 12);
  for (const p of paths) assert.ok(exists(`public${p}`), `Missing event asset public${p}`);
  assert.equal(safeNavigationHref('/exclusive-destinations'), true);
  assert.doesNotMatch(read('lib/ecosystemData.js'), /Gemini/i);
});

test('Phase 0: monetization attribution leaks are fixed across Headout, Viator and Ovago', () => {
  assert.doesNotMatch(HEADOUT_CATALOGUE_URL, /gorgona_one|headout\.com\/\/\?/);
  for (const c of HEADOUT_COLLECTIONS) assert.doesNotMatch(c.href, /gorgona_one/);
  for (const c of VIATOR_DIRECT_CARDS) assert.match(c.href, /uid=U00885857/, c.productCode);
  for (const y of VIATOR_YACHTS) assert.match(y.href, /uid=U00885857/, y.productCode);

  const ovago = read('app/travel/ovago/page.js');
  assert.match(ovago, /target="_blank"\s+rel="sponsored noopener noreferrer"/);
  assert.doesNotMatch(ovago, /<Link\s+href=\{deal\.href\}/);
});

test('Phase 0: Dining Editor SQL migration, concierge-metrics filter, /profile contrast & partner CTA are fixed', () => {
  const migration = read('supabase/migrations/20261123060000_dining_editor_providers.sql');
  assert.match(migration, /'resy'.*'tock'.*'dice'/s);
  assert.match(read('app/api/dashboard/concierge-metrics/route.js'), /resolved_at=is\.null/);
  assert.match(read('app/components/dashboard/RequestBoard.jsx'), /<select data-light-surface/);
  assert.doesNotMatch(read('app/profile/page.js'), /data-light-surface/);
  assert.match(read('app/HomePage.jsx'), /href="\/register\/partner"/);
  assert.match(read('app/register/partner/layout.js'), /path: '\/register\/partner'/);
  assert.match(read('app/register/partner/layout.js'), /robots:\s*\{\s*index:\s*true,\s*follow:\s*true\s*\}/);
});
