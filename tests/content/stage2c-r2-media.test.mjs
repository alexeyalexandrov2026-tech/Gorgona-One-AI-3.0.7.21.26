import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getRentals, getRentalBySlug } from '../../lib/rentalsData.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

test('wrangler.jsonc configures NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL to https://media.gorgona-one.com', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  const cfg = JSON.parse(raw);
  assert.equal(cfg.vars.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL, 'https://media.gorgona-one.com');
});

test('getRentals and getRentalBySlug rewrite /images/rentals/* dynamically at runtime when NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL is set', () => {
  const prev = process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL;
  try {
    process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL = 'https://media.gorgona-one.com';
    const cars = getRentals();
    assert.ok(cars.length >= 250);
    const urus = getRentalBySlug('lamborghini-urus-se');
    assert.equal(urus.image, 'https://media.gorgona-one.com/images/rentals/lamborghini-urus-se/cover.jpg');
    assert.ok(urus.gallery.every((u) => u.startsWith('https://media.gorgona-one.com/images/rentals/')));

    delete process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL;
    const urusLocal = getRentalBySlug('lamborghini-urus-se');
    assert.equal(urusLocal.image, '/images/rentals/lamborghini-urus-se/cover.jpg');
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL;
    else process.env.NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL = prev;
  }
});
