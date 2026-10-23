// node --test tests/content/api.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dashboardHandlers } from '../../lib/server/dashboardHandlers.mjs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('there is no public route that seeds the database', () => {
  assert.equal(existsSync(new URL('../../app/api/seed/route.js', import.meta.url)), false);
});

test('legacy notifications reject anonymous callers and cannot send arbitrary events', async () => {
  const id='11111111-1111-4111-8111-111111111111',calls=[];
  const handlers=dashboardHandlers({NEXT_PUBLIC_SUPABASE_URL:'https://fixture.example',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture'},async(url,options)=>{
    calls.push({url,options});return Response.json(url.includes('/auth/')?{id}:[{id,role:'partner'}]);
  });
  assert.equal((await handlers.legacyNotify(new Request('https://example.com/api/notify',{method:'POST'}))).status,401);
  assert.equal(calls.length,0);
  assert.equal((await handlers.legacyNotify(new Request('https://example.com/api/notify',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({event:'forged'})}))).status,410);
  assert.ok(calls.every(call=>call.options.method==='GET'));
});

test('the chat health check does not expose the router', () => {
  const get = read('app/api/chat/route.js').split('export async function GET')[1];
  assert.ok(get, 'GET handler exists');
  assert.doesNotMatch(get, /ROUTER_URL|ROUTER_MODEL|getLocalBrainStatus/);
});

test('the footer has no Admin link', () => {
  assert.doesNotMatch(read('app/components/Footer.jsx'), /href: '\/admin'/);
});
