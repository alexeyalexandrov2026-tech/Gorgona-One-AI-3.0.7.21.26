// node --test tests/content/api.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('there is no public route that seeds the database', () => {
  assert.equal(existsSync(new URL('../../app/api/seed/route.js', import.meta.url)), false);
});

test('admin notifications need a signed-in caller', () => {
  const route = read('app/api/notify/route.js');
  assert.match(route, /supabase\.auth\.getUser\(token\)/);
  assert.match(route, /status: 401/);
  const portal = read('app/partner/page.js');
  assert.equal((portal.match(/fetch\('\/api\/notify'/g) || []).length, 1, 'only notifyAdmin posts to /api/notify');
  assert.match(portal, /Authorization: `Bearer \$\{token\}`/);
});

test('the chat health check does not expose the router', () => {
  const get = read('app/api/chat/route.js').split('export async function GET')[1];
  assert.ok(get, 'GET handler exists');
  assert.doesNotMatch(get, /ROUTER_URL|ROUTER_MODEL|getLocalBrainStatus/);
});

test('the footer has no Admin link', () => {
  assert.doesNotMatch(read('app/components/Footer.jsx'), /href: '\/admin'/);
});
