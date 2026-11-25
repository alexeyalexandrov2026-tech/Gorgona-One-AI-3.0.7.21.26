import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import nextConfig from '../../next.config.js';
import { getRentals } from '../../lib/rentalsData.js';
import { assembleShowcase, localPhotoPresent } from '../../lib/heroShowcase.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

test('Stage 3A: 625 MB public/images/rentals and 13.9 MB QA screenshots are offloaded from repo', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'public', 'images', 'rentals')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'docs', 'fleet-import', 'qa')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'public', 'images', 'home', 'worlds', 'cars-urus.jpg')), true);
});

test('Stage 3A: Cloudflare Smart Placement, R2 CDN defaults, and preconnect are configured', () => {
  const wrangler = JSON.parse(fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8'));
  assert.deepEqual(wrangler.placement, { mode: 'smart' });
  assert.equal(wrangler.vars.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL, 'https://media.gorgona-one.com');
  assert.equal(nextConfig.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL, 'https://media.gorgona-one.com');

  const layout = fs.readFileSync(path.join(ROOT, 'app', 'layout.js'), 'utf8');
  assert.match(layout, /rel="preconnect"\s+href="https:\/\/media\.gorgona-one\.com"/);
});

test('Stage 3A: Homepage uses ISR + memoized showcase without public/ disk tracing, and AiDock lazy-loads AiConversation', () => {
  const homePage = fs.readFileSync(path.join(ROOT, 'app', 'page.js'), 'utf8');
  assert.match(homePage, /export const revalidate = 300;/);
  assert.doesNotMatch(homePage, /force-dynamic/);

  const showcaseData = fs.readFileSync(path.join(ROOT, 'lib', 'heroShowcaseData.js'), 'utf8');
  assert.doesNotMatch(showcaseData, /from\s+['"]node:fs['"]|getCloudflareContext/);
  assert.match(showcaseData, /SHOWCASE_CACHE_TTL_MS/);
  assert.match(showcaseData, /VERIFIED_STATIC_ASSETS/);

  const prev = process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL;
  try {
    process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL = 'https://media.gorgona-one.com';
    const cars = getRentals();
    const cards = assembleShowcase({ rentals: cars });
    assert.ok(cards.length >= 6);
    assert.ok(cards.every((item) => item.image.startsWith('https://media.gorgona-one.com/images/rentals/')));
    assert.ok(cards.every((item) => localPhotoPresent(item.image, { diskReady: false, shipped: new Set() })));
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL;
    else process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL = prev;
  }

  const aiDock = fs.readFileSync(path.join(ROOT, 'app', 'components', 'ai', 'AiDock.jsx'), 'utf8');
  assert.match(aiDock, /lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/AiConversation['"]\)/);
  assert.match(aiDock, /<Suspense/);
});
