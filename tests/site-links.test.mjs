// Internal links and the sitemap must only point at routes that exist in app/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoveryCategories } from '../lib/discoveryCategories.js';

const APP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

// Route patterns from app/**/page.js, e.g. ['rentals', '[slug]'].
function collectRoutes(dir = APP_DIR, segments = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const routes = entries.some((entry) => entry.name === 'page.js') ? [segments] : [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'api' && entry.name !== 'components') {
      routes.push(...collectRoutes(path.join(dir, entry.name), [...segments, entry.name]));
    }
  }
  return routes;
}

const ROUTES = collectRoutes();

function routeExists(pathname) {
  const parts = pathname.split('?')[0].split('/').filter(Boolean);
  return ROUTES.some(
    (route) => route.length === parts.length && route.every((seg, i) => seg.startsWith('[') || seg === parts[i])
  );
}

test('every discovery category links to an existing route', () => {
  for (const category of discoveryCategories) {
    assert.ok(routeExists(category.href), `${category.label} -> ${category.href}`);
  }
});

test('the sitemap lists existing routes, once each, on the production host', async () => {
  const { default: sitemap } = await import('../app/sitemap.js');
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);

  assert.equal(new Set(urls).size, urls.length, 'duplicate sitemap URLs');
  for (const url of urls) {
    assert.ok(url.startsWith('https://gorgona-one.com'), url);
    assert.ok(routeExists(new URL(url).pathname), `no route for ${url}`);
  }

  const paths = urls.map((url) => new URL(url).pathname);
  for (const core of ['/yachts', '/rentals', '/vacation-rentals', '/restaurants-nightlife', '/experiences', '/sportsbook']) {
    assert.ok(paths.includes(core), `${core} missing from the sitemap`);
  }
  assert.ok(paths.some((p) => /^\/sportsbook\/[a-z0-9-]+$/.test(p)), 'sportsbook profiles missing');
  assert.ok(!paths.includes('/stores/draftkings'), 'sportsbooks must not be listed under /stores');
  assert.ok(!paths.includes('/draftkings-promos'), 'placeholder pages stay out of the sitemap');
});
