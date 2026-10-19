// node --test tests/content/links.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { discoveryCategories } from '../../lib/discoveryCategories.js';
import { categories } from '../../lib/dealsData.js';

const page = (href) => existsSync(new URL(`../../app${href}/page.js`, import.meta.url));
const storeCategory = (href) => {
  const slug = href.match(/^\/stores\/([^/]+)$/)?.[1];
  return Boolean(slug) && categories.some((category) => category.slug === slug);
};

test('every Discovery and AI category link opens a real page', () => {
  for (const { key, href } of discoveryCategories) {
    assert.ok(page(href) || storeCategory(href), `${key} -> ${href}`);
  }
});

test('the partner sign-up links to the partnership agreement', () => {
  const form = readFileSync(new URL('../../app/register/partner/page.js', import.meta.url), 'utf8');
  assert.doesNotMatch(form, /href="#"/);
  assert.match(form, /href="\/partner-agreement"/);
  assert.ok(page('/partner-agreement'));
});
