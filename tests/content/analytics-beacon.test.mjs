import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The privacy policy and Play Data safety say the Android app has no
// analytics, so the Cloudflare beacon must never load inside its WebView.
test('analytics beacon is loaded through the app-aware component only', () => {
  const layout = fs.readFileSync(new URL('../../app/layout.js', import.meta.url), 'utf8');
  const beacon = fs.readFileSync(new URL('../../app/components/AnalyticsBeacon.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(layout, /cloudflareinsights/);
  assert.match(layout, /<AnalyticsBeacon /);
  assert.match(beacon, /MiamiElioApp/);
  assert.match(beacon, /appMarker === 'android'/);
});
