-- Security hardening for roles, row level security and storage.
--
-- Run once in the Supabase SQL editor after 00_profiles_schema.sql,
-- 01_partner_listings_schema.sql and schema.sql. Every statement is
-- idempotent, so running it again is safe. Run security_audit.sql
-- before and after to see what changed.

begin;

-- ---------------------------------------------------------------------------
-- 1. Role helpers
--
-- Policies ask "who is this caller?" through these functions. They run as the
-- function owner, so a policy on profiles can read profiles without
-- re-entering its own policies (the old inline subquery recursed).
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.is_partner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('partner', 'admin'), false)
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_partner_or_admin() from public;
grant execute on function public.current_app_role() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_partner_or_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. New accounts
--
-- Sign-up metadata is written by the browser, so it never grants 'admin'.
-- The partner portal may ask for 'partner'; everything else becomes 'user'.
-- Admins are promoted by another admin or from the SQL editor.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role, company_name, metadata)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    case when new.raw_user_meta_data->>'role' = 'partner' then 'partner' else 'user' end,
    new.raw_user_meta_data->>'company_name',
    coalesce(new.raw_user_meta_data->'metadata', '{}'::jsonb)
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. profiles
--
-- People read and edit their own profile. Only an admin reads every profile
-- or changes a role. Nobody changes id, email or created_at through the API.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Runs as the caller, so current_user is anon or authenticated for API
-- requests and postgres or service_role for trusted server work.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.created_at is distinct from old.created_at then
      raise exception 'profiles: id, email and created_at cannot be changed' using errcode = '42501';
    end if;
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'profiles: only an admin can change a role' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- 4. partner_listings
--
-- Partners create and edit their own listings, and every partner insert or
-- edit goes back to 'pending' for review. Only admins approve, reject or
-- delete.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can view all partner listings" on public.partner_listings;
drop policy if exists "Admins can update all partner listings" on public.partner_listings;
drop policy if exists "Partners can view own listings" on public.partner_listings;
drop policy if exists "Partners can insert own listings" on public.partner_listings;
drop policy if exists "partner_listings_select" on public.partner_listings;
drop policy if exists "partner_listings_insert_own" on public.partner_listings;
drop policy if exists "partner_listings_update_own" on public.partner_listings;
drop policy if exists "partner_listings_update_admin" on public.partner_listings;
drop policy if exists "partner_listings_delete_admin" on public.partner_listings;

create policy "partner_listings_select" on public.partner_listings
  for select to authenticated
  using (partner_id = auth.uid() or public.is_admin());

create policy "partner_listings_insert_own" on public.partner_listings
  for insert to authenticated
  with check (partner_id = auth.uid() and public.is_partner_or_admin());

create policy "partner_listings_update_own" on public.partner_listings
  for update to authenticated
  using (partner_id = auth.uid())
  with check (partner_id = auth.uid());

create policy "partner_listings_update_admin" on public.partner_listings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "partner_listings_delete_admin" on public.partner_listings
  for delete to authenticated
  using (public.is_admin());

create or replace function public.partner_listings_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.status := 'pending';
    if tg_op = 'UPDATE' and new.partner_id is distinct from old.partner_id then
      raise exception 'partner_listings: partner_id cannot be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists partner_listings_moderation on public.partner_listings;
create trigger partner_listings_moderation
  before insert or update on public.partner_listings
  for each row execute function public.partner_listings_moderation();

-- ---------------------------------------------------------------------------
-- 5. Catalog tables: everyone reads, only admins write.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'stores', 'coupons', 'categories', 'sportsbooks',
    'event_categories', 'leagues', 'teams', 'ticket_providers',
    'events', 'event_teams', 'event_providers'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
      execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
      execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
      execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_write', t);
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Private tables: only admins read or write.
--    public.users is an older copy of emails and roles; profiles replaced it.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['users', 'analytics', 'event_analytics']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t || '_admin_only', t);
      execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_only', t);
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 7. bookings: guests submit a request; only admins read or change requests.
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  item_slug text,
  item_title text,
  client_name text not null,
  client_email text not null,
  client_phone text,
  dates text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

drop policy if exists "bookings_insert_public" on public.bookings;
drop policy if exists "bookings_admin" on public.bookings;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'status'
  ) then
    create policy "bookings_insert_public" on public.bookings
      for insert to anon, authenticated
      with check (status = 'pending');
  else
    create policy "bookings_insert_public" on public.bookings
      for insert to anon, authenticated
      with check (true);
  end if;
end
$$;

create policy "bookings_admin" on public.bookings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. listings (inventory the site reads). Defined outside this folder, so it
--    is only touched when row level security is off: then it gets a
--    published-only public read and admin-only writes.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.listings') is null then
    return;
  end if;
  if not (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.listings')) then
    execute 'alter table public.listings enable row level security';
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'listings' and column_name = 'status'
    ) then
      execute 'create policy "listings_public_read_published" on public.listings for select to anon, authenticated using (status = ''published'')';
    end if;
    execute 'create policy "listings_admin_write" on public.listings for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 9. Storage: partners upload images into their own folder only.
--    The bucket stays public, so image URLs keep working; listing the bucket
--    is limited to the owner of a folder and admins.
-- ---------------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
 where id = 'listings_media';

drop policy if exists "Partners can upload files" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "listings_media_partner_upload" on storage.objects;
drop policy if exists "listings_media_owner_list" on storage.objects;

create policy "listings_media_partner_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listings_media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_partner_or_admin()
  );

create policy "listings_media_owner_list" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'listings_media'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

commit;
