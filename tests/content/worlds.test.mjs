// node --test tests/content/worlds.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORLDS_COPY, getWorldsCopy, displayValue, largeImage, summarizeRequest } from '../../lib/worldsCopy.js';
import { getRentals } from '../../lib/rentalsData.js';

const LANGS = ['en', 'ru', 'es', 'pt', 'he'];
const shape = (value) => (Array.isArray(value)
  ? value.map(shape)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
    : typeof value);
const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join();
const strings = (value, path = '') => (typeof value === 'string'
  ? [[path, value]]
  : Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`)));

test('world copy has the same keys, lists and placeholders in every core language', () => {
  const en = WORLDS_COPY.en;
  const enStrings = Object.fromEntries(strings(en));
  for (const lang of LANGS.slice(1)) {
    assert.deepEqual(shape(WORLDS_COPY[lang]), shape(en), lang);
    for (const [path, text] of strings(WORLDS_COPY[lang])) {
      assert.ok(text.trim(), `${lang}${path} is empty`);
      assert.equal(placeholders(text), placeholders(enStrings[path]), `${lang}${path}`);
    }
  }
  assert.equal(getWorldsCopy('ja').onRequest, en.onRequest);
});

test('every car category has a label', () => {
  for (const car of getRentals()) {
    for (const lang of LANGS) assert.ok(WORLDS_COPY[lang].categories[car.category], `${lang}: ${car.category}`);
  }
});

test('request summaries fit the booking API and stay in English', () => {
  const places = WORLDS_COPY.en.form.places;
  const longest = places.reduce((a, b) => (b.length > a.length ? b : a));
  const car = summarizeRequest('car', { from: '2026-12-02', to: '2026-12-06', place: places.indexOf(longest) });
  assert.equal(car, `2026-12-02 → 2026-12-06 · Delivery: ${longest}`);
  assert.equal(summarizeRequest('yacht', { from: '2026-12-31', duration: 3, guests: 10 }), '2026-12-31 · Full day · 10 guests');
  assert.equal(summarizeRequest('stay', { from: '2027-02-10', to: '2027-02-14', guests: 6 }), '2027-02-10 → 2027-02-14 · 6 guests');
  assert.equal(summarizeRequest('experience', { from: '2026-12-05', guests: 4 }), '2026-12-05 · 4 guests');
  for (const text of [car, summarizeRequest('yacht', { from: '2026-12-31', duration: 0, guests: 99 })]) {
    assert.ok(text.length <= 120, text);
  }
});

test('the booking form still posts the fields /api/book reads', () => {
  const form = readFileSync(new URL('../../app/components/BookingForm.jsx', import.meta.url), 'utf8');
  assert.match(form, /fetch\('\/api\/book'/);
  assert.match(form, /\.\.\.contact, dates: summarizeRequest\(kind, trip\), itemSlug: rentalSlug, itemTitle: rentalTitle/);
  for (const field of ['name', 'phone', 'email']) assert.match(form, new RegExp(`setC\\('${field}'\\)`));
});

test('display helpers', () => {
  const ru = getWorldsCopy('ru');
  assert.equal(displayValue('On request', ru), 'По запросу');
  assert.equal(displayValue('63 ft', ru), '63 ft');
  assert.equal(largeImage('https://images.unsplash.com/x?w=900&q=80'), 'https://images.unsplash.com/x?w=1600&q=80');
});
