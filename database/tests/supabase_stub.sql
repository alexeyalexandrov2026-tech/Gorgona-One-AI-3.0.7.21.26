-- Minimal stand-ins for the Supabase objects database/00-03 depend on, so the
-- schema and its policies can be exercised on plain PostgreSQL 15+.
-- Used by scripts/test-db.sh; never run this against a Supabase project.

-- Roles are cluster-wide, so create them only once.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role', 'supabase_auth_admin'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
end
$$;
alter role service_role bypassrls;

-- auth: the users table GoTrue writes to, and auth.uid() reading the JWT
-- subject that PostgREST puts in request.jwt.claim.sub.
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text
language sql stable
as $$ select current_user::text $$;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
grant all on auth.users to supabase_auth_admin;

-- storage: just enough of the bucket/object tables for the listings_media
-- policies.
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[]
language plpgsql immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;

-- Supabase's default privileges on the public schema: the API roles get every
-- table privilege, and RLS policies are what actually decide access.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
