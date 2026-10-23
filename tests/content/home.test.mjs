import '../../lib/savedServerCatalog.js';
// node --test tests/content/home.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SPORTSBOOK_DIRECTORY } from '../../lib/sportsbookDirectory.js';
import { HOME_BOOKS, FLEET, carThumb, HERO_CAR } from '../../lib/homeData.js';
import { SEASON, SEASON_CHECKED_AT, upcomingSeason, daysUntil } from '../../lib/seasonData.js';
import { STOPS, HOME_STOPS, COUNTIES, getStop } from '../../lib/a1aLine.js';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { savedMessage } from '../../lib/savedCopy.js';
import { HOME_COPY, getHomeCopy } from '../../lib/homeCopy.js';

const LANGS = SUPPORTED_LANGUAGES.map(language => language.code);
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

test('the homepage has no promo-code copy in any core language', () => {
  const promo = /promo|coupon|code|nike|uber eats|промокод|скидк|código|cupom|קוד|מבצע/i;
  for (const lang of LANGS) {
    const copy = getHomeCopy(lang);
    for (const text of [copy.eyebrow, copy.lede, ...copy.chips, ...copy.stats]) assert.doesNotMatch(text, promo, `${lang}: ${text}`);
    assert.equal(copy.stats.length, 3, `${lang} stats`);
    assert.equal(copy.chips.length, 5, `${lang} chips`);
    assert.doesNotMatch(copy.worldItems.deals.join(' '), /promo|coupon|промокод|código|cupom|קוד/i, `${lang} stores row`);
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
    for (const lang of ['en','ru','es','pt','he']) assert.ok(event.tip[lang], `${event.id} has no ${lang} tip`);
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
    for (const lang of LANGS) assert.ok(savedMessage(lang, `a1a.${stop.id}`), `${stop.id} has no ${lang} line`);
  }
});

test('homepage copy has matching structure and slots in all sixteen languages', () => {
  const shape = (value) => (Array.isArray(value) ? value.length : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)])) : typeof value);
  const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join();
  const en = HOME_COPY.en;
  for (const lang of LANGS.slice(1)) {
    const copy = getHomeCopy(lang);
    assert.deepEqual(shape(copy), shape(en), lang);
    for (const key of Object.keys(en).filter((k) => typeof en[k] === 'string')) {
      assert.notEqual(copy[key], '', `${lang}.${key} is empty`);
      assert.equal(placeholders(copy[key]), placeholders(en[key]), `${lang}.${key} placeholders`);
    }
  }
  assert.notEqual(getHomeCopy('de').titleEm, en.titleEm);
});
