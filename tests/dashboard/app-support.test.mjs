import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { appSupportHandlers } from '../../lib/server/appSupport.mjs';
import { asUser, fixture, ids } from './database.mjs';
import { fixtureEnv, provider } from './provider.mjs';

let db, api;
before(async () => {
  db = await fixture();
  api = appSupportHandlers(fixtureEnv, provider(db));
});
after(async () => { await db?.close(); });

function request({ token, body, key = randomUUID(), method = 'POST', ip = '203.0.113.2' } = {}) {
  return new Request('https://miami.example/app-support', {
    method,
    headers: {
      'Idempotency-Key': key,
      'CF-Connecting-IP': ip,
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const report = { answer: 'One answer', question: 'One question', note: '', locale: 'en' };

test('AI reports are validated, durably accepted once and limited per address', async () => {
  assert.equal((await api.report(request({ body: { ...report, answer: '' } }))).status, 400);
  const key = randomUUID();
  const first = await api.report(request({ body: report, key }));
  assert.equal(first.status, 202);
  assert.deepEqual(await first.json(), { received: true });
  assert.equal((await api.report(request({ body: report, key }))).status, 202);
  assert.equal((await api.report(request({ body: { ...report, note: 'changed' }, key }))).status, 409);
  for (let i = 0; i < 4; i++) assert.equal((await api.report(request({ body: report }))).status, 202);
  assert.equal((await api.report(request({ body: report }))).status, 429);
  const rows = (await db.query("select * from public.app_support_requests where kind='ai_report'")).rows;
  assert.equal(rows.length, 5);
  assert.equal(rows[0].user_id, null);
  assert.match(rows[0].rate_key, /^[0-9a-f]{64}$/);
});

test('deletion requests can only be closed by staff after the account is removed', async () => {
  assert.equal((await api.deletion(request())).status, 401);
  assert.equal((await api.deletion(request({ token: ids.customer, body: { userId: ids.other } }))).status, 202);
  assert.equal((await api.deletion(request({ token: ids.customer }))).status, 202);
  const rows = (await db.query("select id,user_id from public.app_support_requests where kind='account_deletion'")).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, ids.customer);

  const customer = request({ method: 'GET', token: ids.customer });
  assert.equal((await api.list(customer)).status, 403);
  await assert.rejects(asUser(db, ids.customer, 'select * from public.app_support_requests'), /permission denied/);
  const staff = await api.list(request({ method: 'GET', token: ids.admin }));
  assert.equal(staff.status, 200);
  assert.ok((await staff.json()).requests.some(row => row.id === rows[0].id));
  assert.equal((await api.resolve(request({ method: 'PATCH', token: ids.customer, body: { id: rows[0].id } }))).status, 403);
  const resolve = () => api.resolve(request({ method: 'PATCH', token: ids.admin, body: { id: rows[0].id } }));
  assert.equal((await resolve()).status, 409);
  await assert.rejects(asUser(db, ids.customer, 'select public.resolve_app_support_request($1,$2)', [rows[0].id, ids.customer]), /permission denied/);
  await db.query('delete from public.profiles where id=$1', [ids.customer]);
  await db.query('delete from auth.users where id=$1', [ids.customer]);
  assert.equal((await resolve()).status, 200);
  assert.equal((await resolve()).status, 404);
  const [closed] = (await db.query('select user_id,resolved_at,resolved_by from public.app_support_requests where id=$1', [rows[0].id])).rows;
  assert.equal(closed.user_id, null);
  assert.ok(closed.resolved_at);
  assert.equal(closed.resolved_by, ids.admin);
});
