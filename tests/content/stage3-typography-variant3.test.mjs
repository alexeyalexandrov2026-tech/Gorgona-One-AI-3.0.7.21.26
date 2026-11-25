import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('Variant 3 Corporate Inter Typography: zero italic display headings on /events and design-system.css', () => {
  for (const file of [
    'app/events/page.js',
    'app/events/EventPass.jsx',
    'app/events/EventsEmptyState.jsx',
    'app/events/LiveShowsBanner.jsx'
  ]) {
    const src = read(file);
    assert.doesNotMatch(src, /\bfont-serif\b/, `${file} must use upright Inter corporate sans`);
    assert.doesNotMatch(src, /(?<!not-)\bitalic\b/, `${file} must not use italic display headings`);
  }

  const ds = read('app/design-system.css');
  assert.doesNotMatch(ds, /font-style:\s*italic/);
  assert.match(ds, /header:not\(\[data-preserve-typography="true"\]\)\s*~\s*main/);
  assert.match(ds, /letter-spacing:\s*-0\.038em/);

  const header = read('app/components/Header.jsx');
  assert.match(header, /data-preserve-typography=\{pathname\?\.startsWith\('\/yachts'\)\s*\?\s*'true'\s*:\s*undefined\}/);
  assert.doesNotMatch(header, /data-preserve-typography=\{[^}]*\/travel/);
});
