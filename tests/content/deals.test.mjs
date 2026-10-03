// node --test tests/content/deals.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allDeals, featuredDeals, categories, getDealsByCategory } from '../../lib/dealsData.js';
import {
  HIDDEN_FROM_STORES, COUPONS_VISIBLE, ROWE_AND_TAYLOR_DEAL,
  getStoreDeals, getCategoryDeals, getCouponDeals, dealUrl
} from '../../lib/storeDirectory.js';
import { DEALS_COPY, getDealsCopy } from '../../lib/dealsCopy.js';

test('Stores keeps its rules: Rowe & Taylor first, hidden brands and duplicates out', () => {
  // The rule as it was written in app/stores/page.js before the redesign.
  const before = [
    ROWE_AND_TAYLOR_DEAL,
    ...featuredDeals.filter((d) => d.category !== 'betting' && !HIDDEN_FROM_STORES.includes(d.name) && !['sport-1', 'sport-2'].includes(d.id))
  ];
  const stores = getStoreDeals();
  assert.deepEqual(stores.map((d) => d.id), before.map((d) => d.id));
  assert.equal(stores[0].name, 'Rowe & Taylor');
  assert.equal(new Set(stores.map((d) => d.name)).size, stores.length, 'each brand once');
  assert.ok(!allDeals.some((d) => d.name === 'Rowe & Taylor'), 'Rowe & Taylor stays Stores-only');
});

test('category pages hide the same brands and never list betting', () => {
  for (const { slug } of categories) {
    const before = slug === 'betting' ? [] : getDealsByCategory(slug).filter((d) => !HIDDEN_FROM_STORES.includes(d.name));
    assert.deepEqual(getCategoryDeals(slug).map((d) => d.id), before.map((d) => d.id), slug);
  }
});

test('Coupons lists exactly Disney+, DoorDash and Uber Eats', () => {
  assert.deepEqual(getCouponDeals().map((d) => d.name).sort(), [...COUPONS_VISIBLE].sort());
});

test('every listed offer links to a partner, the brand or one of our pages', () => {
  const listed = [...getStoreDeals(), ...getCouponDeals(), ...categories.flatMap((c) => getCategoryDeals(c.slug))];
  for (const deal of listed) {
    assert.match(dealUrl(deal), /^(https:\/\/|\/[a-z])/, deal.id);
    assert.doesNotMatch(dealUrl(deal), /example\.com/, deal.id);
  }
});

test('deals copy is complete in the five core languages', () => {
  const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join();
  const en = DEALS_COPY.en;
  for (const lang of ['ru', 'es', 'pt', 'he']) {
    assert.deepEqual(Object.keys(DEALS_COPY[lang]).sort(), Object.keys(en).sort(), lang);
    for (const key of Object.keys(en)) {
      assert.ok(DEALS_COPY[lang][key].trim(), `${lang}.${key}`);
      assert.equal(placeholders(DEALS_COPY[lang][key]), placeholders(en[key]), `${lang}.${key}`);
    }
  }
  assert.equal(getDealsCopy('fr').storesTitle, en.storesTitle);
});
