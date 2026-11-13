import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import load from '../concierge/load.cjs';
import { dashboardHandlers } from '../../lib/server/dashboardHandlers.mjs';
import { fixture, ids, rpc } from './database.mjs';
import { fixtureEnv, provider } from './provider.mjs';

const { favoritesHandlers } = load('lib/server/favoritesHandlers.mjs');
let db, gateway, favorites;
const env = { ...fixtureEnv, MY_MIAMI_ENABLED:'true' };
const item = { kind:'yacht', slug:'yacht-a', title:'Yacht A', href:'/yachts/yacht-a' };
before(async () => {
  db = await fixture();
  gateway = provider(db);
  favorites = favoritesHandlers(env, gateway, async () => new Map([['yacht:yacht-a', item]]));
});
after(async () => { await db?.close(); });

function request(path, userId, body) {
  return new Request('https://miami.example' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization:'Bearer ' + userId, 'Content-Type':'application/json' },
    ...(body ? { body:JSON.stringify(body) } : {}),
  });
}

test('favorites only persist for the account authenticated by the server', async () => {
  const path = '/api/favorites';
  const change = { kind:item.kind, slug:item.slug, on:true, userId:ids.other };
  const saved = await favorites.change(request(path, ids.customer, { changes:[change] }));
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).favorites, [item]);
  const other = await favorites.list(request(path, ids.other));
  assert.deepEqual((await other.json()).favorites, []);
});

test('retrying a saved favorite at the limit succeeds and an overflowing batch rolls back', async () => {
  await db.query(
    "insert into public.favorites (user_id,kind,slug) select $1,'car','test-'||i from generate_series(1,199) as i",
    [ids.other],
  );
  const change = (slug) => ({ kind:'yacht', slug, on:true });
  const result = (changes) => rpc(db, 'favorites_change', { p_user:ids.other, p_changes:changes });
  assert.deepEqual(await result([change('one'), change('two')]), { error:'rate_limit' });
  assert.deepEqual(await result([change('one')]), { success:true, count:200 });
  assert.deepEqual(await result([change('one')]), { success:true, count:200 });
});

test('only the confirmed auth email can claim a guest request', async () => {
  const saved = await rpc(db, 'dashboard_submit', {
    p_key:'10000000-0000-4000-8000-000000000001', p_fingerprint:'guest-request', p_rate:'app-test-rate',
    p_user:null, p_input:{
      name:'Guest', email:'customer@example.com', phone:'+13055550123', dates:'2027-02-02',
      itemSlug:'car-test', itemTitle:'Test car', kind:'car',
    },
  });
  const path = '/api/dashboard/requests/claim';
  const original = dashboardHandlers(env, gateway);
  assert.deepEqual(await (await original.claim(request(path, ids.customer, { email:'customer@example.com' }))).json(), { requests:0, plans:0 });
  const confirmed = dashboardHandlers(env, async (url, options) => {
    const response = await gateway(url, options);
    if (String(url).endsWith('/auth/v1/user') && response.ok) {
      return Response.json({ ...await response.json(), email_confirmed_at:'2026-11-13T00:00:00Z' });
    }
    return response;
  });
  assert.deepEqual(await (await confirmed.claim(request(path, ids.other, { email:'customer@example.com' }))).json(), { requests:0, plans:0 });
  assert.deepEqual(await (await confirmed.claim(request(path, ids.customer, {}))).json(), { requests:1, plans:0 });
  const row = await db.query('select customer_user_id from public.bookings where id=$1',[saved.bookingId]);
  assert.equal(row.rows[0].customer_user_id,ids.customer);
});
