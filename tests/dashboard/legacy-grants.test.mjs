import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const migration = fs.readFileSync(new URL('../../supabase/migrations/20261118010000_legacy_grants_hardening.sql', import.meta.url), 'utf8');

test('legacy tables lose anonymous writes and TRUNCATE, keep reads and admin writes', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create table public.coupons(id int primary key, title text);
      create table public.users(id int primary key);
      grant all on public.coupons, public.users to anon, authenticated;
      create schema storage;
      create table storage.objects(id int, bucket_id text, name text);
      alter table storage.objects enable row level security;
      create policy listings_media_partner_upload on storage.objects for insert to authenticated with check (bucket_id = 'listings_media');
      create policy keep_me on storage.objects for select to authenticated using (true);
    `);
    await db.exec(migration);
    await db.exec(migration); // idempotent
    const can = async (role, table, privilege) => (await db.query('select has_table_privilege($1, $2, $3) as ok', [role, table, privilege])).rows[0].ok;
    for (const table of ['public.coupons', 'public.users']) {
      for (const privilege of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) assert.equal(await can('anon', table, privilege), false, `anon ${privilege} ${table}`);
      for (const privilege of ['TRUNCATE', 'REFERENCES', 'TRIGGER']) assert.equal(await can('authenticated', table, privilege), false, `authenticated ${privilege} ${table}`);
      for (const privilege of ['INSERT', 'UPDATE', 'DELETE']) assert.equal(await can('authenticated', table, privilege), true, `admins still write through RLS: ${privilege} ${table}`);
      assert.equal(await can('anon', table, 'SELECT'), true, `reads unchanged ${table}`);
    }
    const policies = (await db.query("select policyname from pg_policies where schemaname = 'storage' order by 1")).rows.map(row => row.policyname);
    assert.deepEqual(policies, ['keep_me']);
  } finally {
    await db.close();
  }
});

test('the hardening runs cleanly where the legacy tables and storage are absent', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated;');
    await db.exec(migration);
  } finally {
    await db.close();
  }
});
