// node --test tests/content/seo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  SITE_URL, DEFAULT_IMAGE, LEGAL_ROUTES, PRIVATE_ROUTES, SECTION_ROUTES,
  clip, pageMetadata, serializeJsonLd, sitemapEntries
} from '../../lib/seo.mjs';

const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../../${path}`, import.meta.url));

test('pages without their own metadata name themselves as canonical, not the home page', () => {
  const layout = source('app/layout.js');
  assert.match(layout, /alternates: \{ canonical: '\.\/' \}/);
  assert.doesNotMatch(layout, /canonical: baseUrl/);
  // One address per page for every language: no hreflang pointing at a single URL.
  assert.doesNotMatch(layout, /languages:|HREFLANG/);
  assert.match(layout, /url: '\.\/'/, 'the share card must not point every page at the home page');
});

test('share card is a raster image search engines and messengers can show', () => {
  assert.equal(DEFAULT_IMAGE.url, '/miami-elio-turquoise-wave.jpg');
  const jpeg = readFileSync(new URL(`../../public${DEFAULT_IMAGE.url}`, import.meta.url));
  assert.deepEqual([...jpeg.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.deepEqual([...jpeg.subarray(-2)], [0xff, 0xd9]);
  assert.equal(DEFAULT_IMAGE.width, 1200);
  assert.equal(DEFAULT_IMAGE.height, 630);
  for (const icon of ['public/favicon-32.png', 'public/apple-touch-icon.png']) assert.ok(exists(icon), icon);
});

test('page metadata carries title, description, canonical and share card', () => {
  const meta = pageMetadata({ title: 'Villas in Miami.', description: 'x '.repeat(120), path: '/vacation-rentals' });
  assert.equal(meta.title, 'Villas in Miami | MIAMI ELIO');
  assert.ok(meta.description.length <= 160);
  assert.equal(meta.alternates.canonical, '/vacation-rentals');
  assert.ok(!('languages' in meta.alternates));
  assert.equal(meta.openGraph.url, '/vacation-rentals');
  assert.deepEqual(meta.openGraph.images, [DEFAULT_IMAGE]);
  assert.deepEqual(meta.twitter.images, [DEFAULT_IMAGE.url]);
  const withImage = pageMetadata({ title: 'Urus', path: '/rentals/urus', image: '/cars/urus.jpg' });
  assert.ok(!('description' in withImage), 'an empty description must not hide the site description');
  assert.deepEqual(withImage.twitter.images, ['/cars/urus.jpg']);
  assert.equal(clip('word '.repeat(50), 40).length <= 40, true);
});

test('sign-in, account and admin screens are noindex, not robots-blocked', () => {
  for (const route of PRIVATE_ROUTES) {
    const layout = source(`app${route}/layout.js`);
    assert.match(layout, /export const metadata = PRIVATE_METADATA/, route);
  }
  const robots = source('app/robots.js');
  for (const route of ['/login', '/register', '/profile', '/account']) assert.ok(!robots.includes(`'${route}'`), `${route} would hide its noindex`);
});

test('section, legal and listing pages declare their own titles', () => {
  for (const route of LEGAL_ROUTES) assert.match(source(`app${route}/layout.js`), new RegExp(`path: '${route}'`), route);
  for (const route of ['/rentals', '/restaurants-nightlife', '/vacation-rentals']) assert.match(source(`app${route}/page.js`), new RegExp(`path: '${route}'`), route);
  for (const [file, path] of [
    ['app/vacation-rentals/[slug]/page.js', '/vacation-rentals/${stay.slug}'],
    ['app/restaurants-nightlife/[slug]/page.js', '/restaurants-nightlife/${venue.slug}'],
    ['app/events/league/[league]/page.js', '/events/league/${league.slug}'],
    ['app/events/category/[category]/page.js', '/events/category/${entry.slug}']
  ]) {
    const page = source(file);
    assert.match(page, /export async function generateMetadata\(/, file);
    assert.ok(page.includes(path), `${file} canonical`);
  }
});

test('the sitemap lists each public page once and leaves /yachts and private pages out', () => {
  const entries = sitemapEntries({ rentals: ['urus', 'urus'], stays: ['villa-a'], venues: ['komodo'], events: [undefined], eventCategories: ['nba'] });
  const paths = entries.map((entry) => entry.url.slice(SITE_URL.length));
  assert.equal(new Set(paths).size, paths.length);
  for (const path of [...SECTION_ROUTES, ...LEGAL_ROUTES, '/rentals/urus', '/vacation-rentals/villa-a', '/restaurants-nightlife/komodo', '/events/category/nba']) assert.ok(paths.includes(path), path);
  assert.ok(!paths.some((path) => path.includes('undefined')));
  assert.ok(!paths.some((path) => /^\/(yachts|admin|login|register|profile|account|api)(\/|$)/.test(path)), 'private or excluded address listed');
  for (const path of [...SECTION_ROUTES, ...LEGAL_ROUTES]) assert.ok(exists(`app${path}/page.js`), `no page for ${path || '/'}`);
});

test('home page carries organization and website structured data', () => {
  const home = source('app/page.js');
  assert.match(home, /<JsonLd data=\{\[organizationJsonLd\(\), websiteJsonLd\(\)\]\} \/>/);
  const script = serializeJsonLd({ name: '</script>' });
  assert.ok(!script.includes('<') && JSON.parse(script).name === '</script>');
});
