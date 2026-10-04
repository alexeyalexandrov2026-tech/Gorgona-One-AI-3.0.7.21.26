import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../lib/escapeHtml.js';
import { safeHttpsUrl } from '../lib/safeUrl.js';

test('escapeHtml neutralizes markup', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('x')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;'
  );
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(42), '42');
});

test('safeHttpsUrl keeps https URLs only', () => {
  const media = 'https://abc.supabase.co/storage/v1/object/public/listings_media/u/a.jpg';
  assert.equal(safeHttpsUrl(media), media);
  for (const bad of [
    'javascript:alert(document.cookie)',
    ' JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://example.com/a.jpg',
    '//example.com/a.jpg',
    '/relative.jpg',
    '',
    null,
    {}
  ]) {
    assert.equal(safeHttpsUrl(bad), null, String(bad));
  }
});
