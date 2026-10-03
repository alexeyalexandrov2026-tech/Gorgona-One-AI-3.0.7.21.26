// node --test tests/content/home.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SPORTSBOOK_DIRECTORY } from '../../lib/sportsbookDirectory.js';
import { HOME_BOOKS, FLEET, carThumb, getHomeCodes, dealUrl, HERO_DEAL, HERO_CAR } from '../../lib/homeData.js';
import { SEASON, SEASON_CHECKED_AT, upcomingSeason, daysUntil } from '../../lib/seasonData.js';
import { STOPS, HOME_STOPS, COUNTIES, getStop } from '../../lib/a1aLine.js';
import { HOME_COPY, getHomeCopy } from '../../lib/homeCopy.js';

const LANGS = ['en', 'ru', 'es', 'pt', 'he'];
const publicFile = (path) => new URL(`../../public${path}`, import.meta.url);
const midnight = (iso) => new Date(`${iso}T00:00:00`);

test('the homepage shows the same ten sportsbooks in the same order', () => {
  assert.deepEqual(HOME_BOOKS.map((b) => b.slug), SPORTSBOOK_DIRECTORY.map((b) => b.slug));
  assert.equal(HOME_BOOKS[8].name, 'theScore Bet');
  assert.equal(HOME_BOOKS[8].logo, null);
  assert.ok(!HOME_BOOKS.some((b) => /espn/i.test(`${b.name} ${b.slug} ${b.logo}`)));
  for (const book of HOME_BOOKS.filter((b) => b.logo)) {
    assert.ok(existsSync(publicFile(book.logo)), `missing ${book.logo}`);
  }
});

test('homepage codes are brand offers, one per brand, with real links', () => {
  const codes = getHomeCodes();
  assert.ok(codes.length >= 6);
  assert.ok(codes.every((d) => d.category !== 'betting' && !d.category.startsWith('kosher')));
  assert.equal(new Set(codes.map((d) => d.name)).size, codes.length);
  for (const deal of [...codes, HERO_DEAL]) {
    assert.match(dealUrl(deal), /^https:\/\//);
    assert.doesNotMatch(dealUrl(deal), /example\.com/);
  }
});

test('every car has its small homepage cover', () => {
  assert.ok(FLEET.length > 0 && HERO_CAR);
  for (const car of FLEET) assert.ok(existsSync(publicFile(carThumb(car))), `missing ${carThumb(car)}`);
});

test('season dates are well formed, sourced and translated', () => {
  assert.match(SEASON_CHECKED_AT, /^\d{4}-\d{2}-\d{2}$/);
  for (const event of SEASON) {
    assert.match(event.start, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(event.start <= event.end, event.id);
    assert.ok(event.source === null || event.source.startsWith('https://'), event.id);
    assert.ok(getStop(event.stop), `${event.id} points at an unknown stop`);
    for (const lang of LANGS) assert.ok(event.tip[lang], `${event.id} has no ${lang} tip`);
  }
  // Only New Year's Eve has no organizer to cite.
  assert.deepEqual(SEASON.filter((e) => !e.source).map((e) => e.id), ['nye']);
});

test('past events drop off and countdowns count whole days', () => {
  assert.equal(upcomingSeason(midnight('2026-10-02')).length, SEASON.length);
  assert.equal(upcomingSeason(midnight('2026-11-02'))[0].id, 'art-basel');
  assert.equal(upcomingSeason(midnight('2027-05-03')).length, 0);
  assert.equal(daysUntil(SEASON[0], midnight('2026-10-02')), 26);
  assert.ok(daysUntil(SEASON[0], midnight('2026-10-29')) <= 0);
});

test('the A1A line has every stop it shows, each translated', () => {
  assert.equal(STOPS.length, 21);
  assert.equal(new Set(STOPS.map((s) => s.id)).size, STOPS.length);
  for (const id of HOME_STOPS) assert.ok(getStop(id), id);
  for (const stop of STOPS) {
    assert.ok(COUNTIES[stop.county], stop.id);
    for (const lang of LANGS) assert.ok(stop.line[lang], `${stop.id} has no ${lang} line`);
  }
});

test('homepage copy is complete in the five core languages', () => {
  const shape = (value) => (Array.isArray(value) ? value.length : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)])) : typeof value);
  const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join();
  const en = HOME_COPY.en;
  for (const lang of LANGS.slice(1)) {
    const copy = HOME_COPY[lang];
    assert.deepEqual(shape(copy), shape(en), lang);
    for (const key of Object.keys(en).filter((k) => typeof en[k] === 'string')) {
      assert.notEqual(copy[key], '', `${lang}.${key} is empty`);
      assert.equal(placeholders(copy[key]), placeholders(en[key]), `${lang}.${key} placeholders`);
    }
  }
  // Languages without their own homepage copy fall back to English.
  assert.equal(getHomeCopy('de').titleEm, en.titleEm);
});
