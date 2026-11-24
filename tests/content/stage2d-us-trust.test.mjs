import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getUsTrustCopy } from '../../lib/usTrustCopy.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const LOCALES = ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];

test('getUsTrustCopy covers all 16 locales without forbidden concierge wording', () => {
  const enKeys = Object.keys(getUsTrustCopy('en')).sort();
  for (const locale of LOCALES) {
    const copy = getUsTrustCopy(locale);
    assert.deepEqual(Object.keys(copy).sort(), enKeys, `key mismatch for ${locale}`);
    const flat = JSON.stringify(copy).toLowerCase();
    assert.equal(flat.includes('concierge'), false, `forbidden word concierge in ${locale}`);
    assert.equal(flat.includes('консьерж'), false, `forbidden word консьерж in ${locale}`);
  }
});

test('UsTrustStrip is mounted on /rentals, /rentals/[slug], and /restaurants-nightlife (never touching /yachts or /travel)', () => {
  for (const rel of ['app/rentals/page.js', 'app/rentals/[slug]/page.js', 'app/components/g1/VenueDirectory.jsx']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(src.includes('UsTrustStrip'), `${rel} must mount UsTrustStrip`);
  }
});
