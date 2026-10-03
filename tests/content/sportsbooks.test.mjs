// node --test tests/content/sportsbooks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPORTSBOOK_DIRECTORY, RENAMED_SPORTSBOOKS } from '../../lib/sportsbookDirectory.js';
import { AVAILABILITY_SOURCES, CHECKED_AT, FLORIDA, getAvailability } from '../../lib/sportsbookAvailability.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the list keeps the same ten operators in the same order', () => {
  assert.deepEqual(SPORTSBOOK_DIRECTORY.map((b) => b.slug), [
    'hard-rock-bet', 'draftkings', 'fanduel', 'betmgm', 'caesars',
    'fanatics', 'bet365', 'betrivers', 'thescore-bet', 'bally-bet'
  ]);
});

test('theScore Bet takes the former ESPN BET place', () => {
  assert.equal(SPORTSBOOK_DIRECTORY[8].name, 'theScore Bet');
  assert.equal(RENAMED_SPORTSBOOKS['thescore-bet'].from, 'espn-bet');
  assert.match(read('next.config.js'), /source: '\/sportsbook\/espn-bet', destination: '\/sportsbook\/thescore-bet'/);
});

test('every operator has a where-it-is-legal source and a check date', () => {
  assert.match(CHECKED_AT, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(CHECKED_AT)));
  for (const book of SPORTSBOOK_DIRECTORY) {
    const availability = getAvailability(book.slug);
    assert.ok(availability, `${book.slug} has no availability source`);
    assert.match(availability.source.url, /^https:\/\//);
    assert.ok(availability.source.name);
  }
  assert.equal(Object.keys(AVAILABILITY_SOURCES).length, SPORTSBOOK_DIRECTORY.length);
});

test('only Hard Rock Bet is marked available in Florida, with sources', () => {
  const inFlorida = SPORTSBOOK_DIRECTORY.filter((b) => getAvailability(b.slug).inFlorida).map((b) => b.slug);
  assert.deepEqual(inFlorida, ['hard-rock-bet']);
  assert.ok(FLORIDA.sources.length >= 1);
  for (const source of FLORIDA.sources) assert.match(source.url, /^https:\/\//);
});

test('no visitor-facing data still says ESPN BET', () => {
  for (const file of ['lib/dealsData.js', 'lib/mockData.js', 'lib/contentTranslations.js', 'app/components/SearchBar.jsx', 'app/sportsbook/page.js', 'app/sportsbook/[slug]/page.js']) {
    assert.doesNotMatch(read(file), /ESPN BET|espn-bet|espnbet\.com/, file);
  }
});
