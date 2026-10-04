-- =============================================================================
-- 01 · Partner listings and the listings_media storage bucket.
--
-- Requires 00_profiles_schema.sql (public.is_admin, is_partner_or_admin).
-- Mirrors the production project as verified on 2026-10-04 and is safe to
-- re-run. The earlier version of this file let any signed-in user upload any
-- file to any path of the public bucket and had no moderation trigger.
-- =============================================================================

create table if not exists public.partner_listings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  price numeric,
  currency text,
  images text[] default '{}',
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.partner_listings enable row level security;

-- Moderation: whatever a partner creates or edits goes (back) to 'pending',
-- and a listing can never be handed to another partner. Admins are exempt.
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

-- Policies. The four quoted names come from the earlier version of this file.
drop policy if exists "Admins can view all partner listings" on public.partner_listings;
drop policy if exists "Admins can update all partner listings" on public.partner_listings;
drop policy if exists "Partners can view own listings" on public.partner_listings;
drop policy if exists "Partners can insert own listings" on public.partner_listings;
drop policy if exists partner_listings_select on public.partner_listings;
drop policy if exists partner_listings_insert_own on public.partner_listings;
drop policy if exists partner_listings_update_own on public.partner_listings;
drop policy if exists partner_listings_update_admin on public.partner_listings;
drop policy if exists partner_listings_delete_admin on public.partner_listings;

create policy partner_listings_select on public.partner_listings
  for select to authenticated
  using (partner_id = auth.uid() or public.is_admin());

create policy partner_listings_insert_own on public.partner_listings
  for insert to authenticated
  with check (partner_id = auth.uid() and public.is_partner_or_admin());

create policy partner_listings_update_own on public.partner_listings
  for update to authenticated
  using (partner_id = auth.uid())
  with check (partner_id = auth.uid());

create policy partner_listings_update_admin on public.partner_listings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy partner_listings_delete_admin on public.partner_listings
  for delete to authenticated
  using (public.is_admin());

-- Media bucket: public URLs for reading, images only, 10 MB per file. The
-- partner portal (app/partner/page.js) enforces the same limits up front.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listings_media',
  'listings_media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The earlier version of this file created two broad policies with generic
-- names. Other apps share this Supabase project, so they are dropped only
-- when they still have their original listings_media definition.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public Access'
      and qual = '(bucket_id = ''listings_media''::text)'
  ) then
    drop policy "Public Access" on storage.objects;
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Partners can upload files'
      and with_check like '%listings_media%'
  ) then
    drop policy "Partners can upload files" on storage.objects;
  end if;
end
$$;

-- Partners (and admins) upload only into a folder named after their user id
-- and can list only that folder. Public reads go through the public URL,
-- which needs no policy.
drop policy if exists listings_media_owner_list on storage.objects;
drop policy if exists listings_media_partner_upload on storage.objects;

create policy listings_media_owner_list on storage.objects
  for select to authenticated
  using (
    bucket_id = 'listings_media'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy listings_media_partner_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listings_media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_partner_or_admin()
  );
