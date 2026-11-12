// The iOS app lists Miami's season on its concierge screen and listens to
// spoken requests. Both are copied from the website; these checks keep the
// copies equal to the site, and keep the app's concierge text-only, as the
// site's is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { seasonJSON, SEASON_FILE } from '../../ios/scripts/build-season.mjs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { speechLocale } from '../../lib/ai/locale.js';

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test("the app's season is the home page's season", async () => {
  assert.equal(fs.readFileSync(SEASON_FILE, 'utf8'), await seasonJSON(), 'run `node ios/scripts/build-season.mjs`');
});

test('the microphone in the app listens for the same accent as the one on the site', () => {
  const swift = read('ios/MiamiElioKit/Sources/MiamiElioKit/SiteLocale.swift');
  const start = swift.indexOf('speechLocales: [String: String] = [');
  assert.notEqual(start, -1, 'speechLocales not found in SiteLocale.swift');
  const table = swift.slice(start, swift.indexOf(']', swift.indexOf('= [', start)));
  const pairs = Object.fromEntries([...table.matchAll(/"([a-z]{2})": "([a-z]{2}-[A-Z]{2})"/g)].map((match) => [match[1], match[2]]));
  assert.equal(Object.keys(pairs).length, SUPPORTED_LANGUAGES.length);
  for (const { code } of SUPPORTED_LANGUAGES) {
    assert.equal(pairs[code], speechLocale(code), code);
  }
});

test('the concierge in the app hears the guest but never speaks a reply aloud', () => {
  const sources = fs.readdirSync(new URL('../../ios/MiamiElio/', import.meta.url), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.swift'))
    .map((file) => read(`ios/MiamiElio/${file.replaceAll('\\', '/')}`))
    .join('\n');
  assert.match(sources, /SFSpeechAudioBufferRecognitionRequest/);
  assert.doesNotMatch(sources, /AVSpeechSynthesizer|AVSpeechUtterance/);
});
