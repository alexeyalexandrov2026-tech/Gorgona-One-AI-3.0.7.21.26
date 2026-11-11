// node --test tests/content/seo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  SITE_URL, HREFLANG_CODES, LISTING_ROUTES, clip, numericPrice, pageMetadata,
  listingJsonLd, breadcrumbJsonLd, organizationJsonLd, websiteJsonLd, serializeJsonLd, sitemapEntries
} from '../../lib/seo.mjs';
import { getYachts } from '../../lib/yachtsData.js';
import { getRentals } from '../../lib/rentalsData.js';
import { getVacationRentals } from '../../lib/vacationRentalsData.js';
import { getVenues } from '../../lib/restaurantsNightlifeData.js';
import { getExperiences } from '../../lib/experiencesData.js';
import { allDeals, categories } from '../../lib/dealsData.js';
import { EVENT_CATEGORY_GROUPS, EVENT_CATEGORIES, LEAGUES } from '../../lib/mockEventsData.js';
import { SPORTSBOOK_DIRECTORY } from '../../lib/sportsbookDirectory.js';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';

const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const pageFile = (route) => `app${route}/page.js`;
const inventory = {
  yachts: getYachts(), rentals: getRentals(), stays: getVacationRentals(), venues: getVenues(), experiences: getExperiences(),
  sportsbooks: SPORTSBOOK_DIRECTORY, deals: allDeals, storeCategories: categories,
  eventGroups: EVENT_CATEGORY_GROUPS, eventCategories: EVENT_CATEGORIES, leagues: LEAGUES, events: []
};
const entries = sitemapEntries(inventory);
const paths = entries.map((entry) => entry.url.slice(SITE_URL.length));
const KINDS = { yachts: 'yacht', rentals: 'car', stays: 'stay', venues: 'venue', experiences: 'experience' };

test('the sitemap lists every section and every listing once', () => {
  assert.equal(new Set(paths).size, paths.length, 'duplicate addresses');
  for (const entry of entries) assert.ok(entry.url.startsWith(SITE_URL) && !entry.url.includes('undefined'), entry.url);
  assert.ok(paths.includes(''), 'home');
  for (const [key, route] of Object.entries(LISTING_ROUTES)) {
    assert.ok(paths.includes(route), route);
    assert.ok(inventory[key].length > 0, `${key} seed is empty`);
    for (const item of inventory[key]) assert.ok(paths.includes(`${route}/${item.slug}`), `${route}/${item.slug}`);
  }
  for (const deal of allDeals) assert.ok(paths.includes(`/deals/${deal.slug}`), deal.slug);
  for (const category of categories) assert.ok(paths.includes(`/stores/${category.slug}`), category.slug);
  for (const book of SPORTSBOOK_DIRECTORY) assert.ok(paths.includes(`/sportsbook/${book.slug}`), book.slug);
  for (const entry of [...EVENT_CATEGORY_GROUPS, ...EVENT_CATEGORIES]) assert.ok(paths.includes(`/events/category/${entry.slug}`), entry.slug);
  for (const league of LEAGUES) assert.ok(paths.includes(`/events/league/${league.slug}`), league.slug);
  assert.ok(!paths.some((path) => /^\/(admin|profile|account|draft|api)(\/|$)/.test(path)), 'private address listed');
});

test('every address in the sitemap has a page behind it', () => {
  const dynamicRoutes = [
    [/^\/yachts\/[^/]+$/, '/yachts/[slug]'], [/^\/rentals\/[^/]+$/, '/rentals/[slug]'],
    [/^\/vacation-rentals\/[^/]+$/, '/vacation-rentals/[slug]'], [/^\/restaurants-nightlife\/[^/]+$/, '/restaurants-nightlife/[slug]'],
    [/^\/experiences\/[^/]+$/, '/experiences/[slug]'], [/^\/deals\/[^/]+$/, '/deals/[slug]'],
    [/^\/sportsbook\/[^/]+$/, '/sportsbook/[slug]'], [/^\/stores\/[^/]+$/, '/stores/[category]'],
    [/^\/events\/category\/[^/]+$/, '/events/category/[category]'], [/^\/events\/league\/[^/]+$/, '/events/league/[league]']
  ];
  for (const path of paths) {
    const route = existsSync(new URL(`../../${pageFile(path)}`, import.meta.url))
      ? path
      : dynamicRoutes.find(([pattern]) => pattern.test(path))?.[1];
    assert.ok(route !== undefined && existsSync(new URL(`../../${pageFile(route)}`, import.meta.url)), `no page for ${path}`);
  }
});

test('the sitemap route reads each section through the getter its pages use', () => {
  const sitemap = source('app/sitemap.js');
  assert.match(sitemap, /export const dynamic = 'force-dynamic'/);
  for (const call of ['getYachts({ editorial: true })', 'getRentals({ editorial: true })', 'getVacationRentals({ editorial: true })', 'getVenues()', 'getExperiences()', 'getSportsbooks()', 'getAllEvents()']) {
    assert.ok(sitemap.includes(call), call);
  }
  assert.match(source('app/restaurants-nightlife/[slug]/page.js'), /from '..\/..\/..\/lib\/restaurantsNightlifeData'/);
  assert.match(source('app/experiences/[slug]/page.js'), /from '..\/..\/..\/lib\/experiencesData'/);
  assert.match(sitemap, /from '..\/lib\/restaurantsNightlifeData'/);
  assert.match(sitemap, /from '..\/lib\/experiencesData'/);
});

test('section and listing pages declare their own metadata', () => {
  const routes = [
    '/yachts', '/rentals', '/vacation-rentals', '/restaurants-nightlife', '/experiences', '/stores', '/sportsbook',
    '/events', '/travel', '/travel/ovago', '/entertainment/adrenaline-365', '/discovery', '/stores/restaurants',
    '/best-shopping-deals', '/nike-coupons', '/amazon-promo-codes', '/fashion-discounts', '/sports-betting-promos',
    '/draftkings-promos', '/fanduel-promos', '/betmgm-promos', '/caesars-sportsbook-promos',
    '/stores/[category]', '/events/[slug]', '/events/category/[category]', '/events/league/[league]'
  ];
  for (const route of routes) {
    const page = source(pageFile(route));
    assert.match(page, /export (const metadata = pageMetadata\(|async function generateMetadata\()/, route);
    assert.match(page, new RegExp(`path:\\s*['\`]${route.replace(/\[\w+\]/, '\\$\\{[\\w.]+\\}').replace(/\//g, '\\/')}['\`]`), `${route} canonical`);
  }
  for (const route of ['/yachts', '/rentals', '/vacation-rentals', '/restaurants-nightlife', '/experiences', '/deals', '/sportsbook']) {
    const page = source(pageFile(`${route}/[slug]`));
    assert.match(page, /export async function generateMetadata\(/, route);
    assert.match(page, new RegExp(`path:\\s*\`${route.replace(/\//g, '\\/')}\\/\\$\\{\\w+\\.slug\\}\``), `${route} canonical`);
    assert.match(page, /<JsonLd data=\{\[listingJsonLd\('\w+', \w+, path\), breadcrumbJsonLd\(/, `${route} structured data`);
  }
  const layout = source('app/layout.js');
  assert.match(layout, /canonical: '\.\/'/, 'pages without metadata must not claim the home page as canonical');
  assert.match(layout, /<JsonLd data=\{\[organizationJsonLd\(\), websiteJsonLd\(\)\]\} \/>/);
});

test('page metadata carries title, description, canonical and share card', () => {
  for (const [key, route] of Object.entries(LISTING_ROUTES)) {
    for (const item of inventory[key]) {
      const path = `${route}/${item.slug}`;
      const meta = pageMetadata({ title: item.title || item.name, description: item.description, path, image: item.image });
      assert.ok(meta.title.endsWith(' | MIAMI ELIO') && meta.title.length > 15, meta.title);
      assert.ok(meta.description.length >= 40 && meta.description.length <= 160, `${path}: ${meta.description.length}`);
      assert.equal(meta.alternates.canonical, path);
      assert.equal(meta.openGraph.url, path);
      assert.equal(meta.openGraph.images[0].url, item.image);
      assert.deepEqual(meta.twitter.images, [item.image]);
      assert.deepEqual(Object.keys(meta.alternates.languages), [...HREFLANG_CODES, 'x-default']);
    }
  }
  const plain = pageMetadata({ title: 'Villas and residences in Miami.', path: '/vacation-rentals' });
  assert.equal(plain.title, 'Villas and residences in Miami | MIAMI ELIO');
  assert.ok(!('description' in plain), 'an empty description must not hide the site description');
  assert.equal(plain.openGraph.images[0].url, '/og-image.svg');
  assert.equal(HREFLANG_CODES.length, SUPPORTED_LANGUAGES.length);
  for (const { code } of SUPPORTED_LANGUAGES) assert.ok(HREFLANG_CODES.some((tag) => tag === code || tag.startsWith(`${code}-`)), code);
});

test('descriptions are cut at a word, never mid-word', () => {
  assert.equal(clip('  Short   text. '), 'Short text.');
  const long = clip('word '.repeat(80));
  assert.ok(long.length <= 160 && long.endsWith('word…'), long);
  assert.equal(clip(undefined), '');
});

test('a price is published only when the page shows an exact amount', () => {
  assert.deepEqual(numericPrice('$1,250.00'), { price: '1250.00', priceCurrency: 'USD' });
  assert.deepEqual(numericPrice('$350.00 / h'), { price: '350.00', priceCurrency: 'USD' });
  assert.deepEqual(numericPrice('$95'), { price: '95.00', priceCurrency: 'USD' });
  for (const text of ['On request', 'From $199', 'Custom pricing', '$0', '', undefined, '$1,2,3', '1250']) assert.equal(numericPrice(text), null, String(text));
  const partner = listingJsonLd('yacht', { title: 'Azimut 55', description: 'Day charter.', location: 'Miami', price: '$350.00 / h', image: '/api/listing-media/a/1/b.jpg' }, '/yachts/partner-1');
  assert.deepEqual(partner.offers, { '@type': 'Offer', price: '350.00', priceCurrency: 'USD', url: `${SITE_URL}/yachts/partner-1` });
  assert.equal(partner.image, `${SITE_URL}/api/listing-media/a/1/b.jpg`);
});

test('structured data parses and names only what the page shows', () => {
  const expected = { yacht: ['Service'], car: ['Service'], stay: ['Accommodation'], venue: ['Restaurant', 'NightClub'], experience: ['Service'] };
  for (const [key, route] of Object.entries(LISTING_ROUTES)) {
    for (const item of inventory[key]) {
      const path = `${route}/${item.slug}`;
      const text = serializeJsonLd(listingJsonLd(KINDS[key], item, path));
      assert.ok(!text.includes('<'), path);
      const data = JSON.parse(text);
      assert.equal(data['@context'], 'https://schema.org');
      assert.ok(expected[KINDS[key]].includes(data['@type']), `${path}: ${data['@type']}`);
      assert.equal(data.name, item.title || item.name);
      assert.equal(data.url, SITE_URL + path);
      assert.ok(/^https?:\/\//.test(data.image), path);
      assert.ok(!('aggregateRating' in data) && !('review' in data), `${path} must not publish ratings`);
      // Seed prices are "On request" or "From $…": nothing exact to publish.
      assert.ok(!('offers' in data), `${path} must not publish a price`);
      for (const value of Object.values(data)) assert.ok(value !== undefined && value !== null && value !== '', path);
    }
  }
  const deal = JSON.parse(serializeJsonLd(listingJsonLd('deal', allDeals[0], `/deals/${allDeals[0].slug}`)));
  assert.equal(deal['@type'], 'Offer');
  assert.equal(deal.seller.name, allDeals[0].name);
  const book = listingJsonLd('sportsbook', { name: 'Hard Rock Bet', slug: 'hard-rock-bet', description: 'Sportsbook.', website: 'https://www.hardrock.bet/' }, '/sportsbook/hard-rock-bet');
  assert.equal(book['@type'], 'Organization');
  assert.equal(book.sameAs, 'https://www.hardrock.bet/');
  assert.throws(() => listingJsonLd('unknown', {}, '/'));

  const crumbs = breadcrumbJsonLd([['Cars', '/rentals'], ['Lamborghini Urus SE', '/rentals/lamborghini-urus-se']]);
  assert.deepEqual(crumbs.itemListElement.map((entry) => [entry.position, entry.name, entry.item]), [
    [1, 'Cars', `${SITE_URL}/rentals`], [2, 'Lamborghini Urus SE', `${SITE_URL}/rentals/lamborghini-urus-se`]
  ]);
  assert.equal(serializeJsonLd({ name: '</script><script>alert(1)</script>' }).includes('</script>'), false);
  assert.equal(websiteJsonLd().publisher['@id'], organizationJsonLd()['@id']);
});

test('robots.txt keeps private areas out and points at the sitemap', () => {
  const robots = source('app/robots.js');
  for (const path of ['/admin', '/profile', '/account/', '/draft/']) assert.ok(robots.includes(`'${path}'`), path);
  assert.match(robots, /sitemap: 'https:\/\/gorgona-one\.com\/sitemap\.xml'/);
});
