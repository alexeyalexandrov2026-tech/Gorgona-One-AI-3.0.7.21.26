-- =============================================================================
-- 03 · Hardening beyond what production had on 2026-10-04.
--
-- Run after 00-02. This is the only file production still needs: paste it
-- into the Supabase SQL editor (it is idempotent and changes no data), then
-- re-run Advisors -> Security. Tested by scripts/test-db.sh.
-- =============================================================================

begin;

-- 1. Functions the REST API should not expose -------------------------------
--
-- handle_new_user() is a trigger function; nothing should be able to call it
-- as /rest/v1/rpc/handle_new_user. Trigger functions are not permission
-- checked when their trigger fires, so sign-up keeps working.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- The role helpers back policies and triggers that only ever run for
-- signed-in users, so guests do not need to call them.
revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_partner_or_admin() from public, anon;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_partner_or_admin() to authenticated, service_role;

-- 2. partner_listings: bound what a partner can store ------------------------
--
-- Partners write rows directly through the API, and the admin console renders
-- their `images` as links and image sources. Only files in a Supabase
-- project's listings_media bucket (what the partner portal uploads) are
-- accepted - never javascript:/data: URLs or third-party tracking images.
-- If the project moves to a custom Supabase domain, add it to the pattern.
create or replace function public.listing_images_are_media_urls(urls text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    bool_and(u ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/listings_media/[^[:space:]"<>]+$'),
    true
  )
  from unnest(urls) as u
$$;

alter table public.partner_listings drop constraint if exists partner_listings_images_media;
alter table public.partner_listings add constraint partner_listings_images_media
  check (cardinality(images) <= 20 and public.listing_images_are_media_urls(images));

alter table public.partner_listings drop constraint if exists partner_listings_field_lengths;
alter table public.partner_listings add constraint partner_listings_field_lengths
  check (
    char_length(title) between 1 and 200
    and char_length(coalesce(description, '')) <= 5000
    and char_length(coalesce(currency, '')) <= 10
    and (price is null or price >= 0)
  );

-- 3. bookings: same rules as /api/book ----------------------------------------
--
-- Guests can insert into bookings directly with the public anon key, so the
-- database enforces the shape the API validates (lib/booking.js).
alter table public.bookings drop constraint if exists bookings_guest_fields;
alter table public.bookings add constraint bookings_guest_fields
  check (
    char_length(coalesce(client_name, '')) between 1 and 200
    and coalesce(client_email, '') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and char_length(client_email) <= 254
    and char_length(coalesce(client_phone, '')) <= 50
    and char_length(coalesce(dates, '')) between 1 and 200
    and char_length(coalesce(item_slug, '')) <= 200
    and char_length(coalesce(item_title, '')) <= 300
  );

commit;
