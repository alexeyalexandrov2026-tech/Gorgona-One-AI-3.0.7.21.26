import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('GetTheApp renders recognizable 4-color Google Play badge in header and footer while keeping data-app-link', () => {
  const source = read('app/components/GetTheApp.jsx');
  assert.match(source, /#4285F4/);
  assert.match(source, /#34A853/);
  assert.match(source, /#EA4335/);
  assert.match(source, /#FBBC04/);
  assert.match(source, /data-app-link/);
  assert.match(source, /Google Play/);
  assert.match(source, /msg\("Get it on"\)/);
});
