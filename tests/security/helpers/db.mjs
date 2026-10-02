import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { HARDENED, ROOT } from './root.mjs';

// The parts of Supabase the schema files rely on: the API roles, auth.uid()
// and auth.role() read from the request's JWT claims, and the storage tables.
// Table privileges mirror Supabase's defaults, so row level security is the
// only thing standing between a request and the data, as in production.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create schema storage;

  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid
  $$;
  create function auth.role() returns text language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role', 'anon')
  $$;

  create table storage.buckets (
    id text primary key,
    name text,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name text,
    owner uuid default auth.uid(),
    created_at timestamptz default now()
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;

  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on all functions in schema auth, storage to anon, authenticated, service_role;
  grant select, insert, update, delete on all tables in schema storage to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

const SCHEMA_FILES = [
  'database/schema.sql',
  'database/00_profiles_schema.sql',
  'database/01_partner_listings_schema.sql'
];

// `before` runs ahead of the schema files, for tables that live outside this
// repository (such as listings).
export async function createDb({ before = '' } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  if (before) await db.exec(before);
  for (const file of SCHEMA_FILES) {
    await db.exec(readFileSync(join(ROOT, file), 'utf8'));
  }
  if (HARDENED) {
    await db.exec(readFileSync(join(ROOT, 'database/02_security_hardening.sql'), 'utf8'));
  }
  return db;
}

// Creates an account the way Supabase Auth does: the browser chooses the
// metadata, and the on_auth_user_created trigger builds the profile from it.
export async function signUp(db, { email, metadata = {} }) {
  const id = randomUUID();
  await db.query(
    'insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)',
    [id, email, JSON.stringify(metadata)]
  );
  return id;
}

// Runs the callback in a transaction that is always rolled back, so each test
// starts from the same data.
export async function inTransaction(db, fn) {
  await db.exec('begin');
  try {
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}

// Runs one statement as an API caller: a signed-in user when `userId` is
// given, an anonymous visitor otherwise. Must be called inside
// inTransaction(). Returns { ok, rows } or { ok: false, error }; a refused
// statement is rolled back to a savepoint so the test can keep inspecting the
// data as the owner afterwards.
export async function asCaller(db, userId, sql, params = []) {
  const role = userId ? 'authenticated' : 'anon';
  const claims = JSON.stringify(userId ? { sub: userId, role } : { role });
  await db.exec('savepoint caller');
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    await db.exec(`set local role ${role}`);
    const result = await db.query(sql, params);
    await db.exec('reset role');
    await db.exec('release savepoint caller');
    return { ok: true, rows: result.rows };
  } catch (error) {
    await db.exec('rollback to savepoint caller');
    await db.exec('reset role');
    return { ok: false, rows: [], error: String(error?.message || error) };
  }
}
