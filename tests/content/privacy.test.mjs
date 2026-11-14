import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PRIVACY_CONTACT_EMAIL, PRIVACY_SECTIONS } from '../../lib/privacyPolicy.js';

const text = PRIVACY_SECTIONS.flatMap(s => [s.heading, ...(s.items || []), ...(s.paragraphs || [])]).join('\n');

test('privacy policy names the operator, contact, audience and deletion route', () => {
  assert.match(text, /Alexey AAA Logistics LLC, Florida, USA/);
  assert.equal(PRIVACY_CONTACT_EMAIL, 'support@gorgona-one.com');
  assert.match(text, /support@gorgona-one\.com/);
  assert.match(text, /adults 18 and over/);
  assert.match(text, /gorgona-one\.com\/account\/delete/);
});

test('privacy policy lists collected data, processors and retention periods', () => {
  for (const term of ['name, email address', 'phone number', 'Favorites', 'Reported answers', 'Supabase', 'Cloudflare Workers AI', 'Telegram', '24 months', '12 months', 'within 30 days'])
    assert.ok(text.includes(term), `missing: ${term}`);
  assert.doesNotMatch(text, /affiliate|monetization|browser tab/i);
});

test('analytics beacon is loaded through the app-aware component only', () => {
  const layout = fs.readFileSync(new URL('../../app/layout.js', import.meta.url), 'utf8');
  const beacon = fs.readFileSync(new URL('../../app/components/AnalyticsBeacon.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(layout, /cloudflareinsights/);
  assert.match(layout, /<AnalyticsBeacon /);
  assert.match(beacon, /MiamiElioApp/);
  assert.match(beacon, /appMarker === 'android'/);
});
