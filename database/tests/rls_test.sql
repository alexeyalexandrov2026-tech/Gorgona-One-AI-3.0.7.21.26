-- Behavior tests for database/00-03: who can read and write what.
-- Run by scripts/test-db.sh after supabase_stub.sql and the schema files.
-- Every check raises "FAIL: ..." and stops the run if it does not hold.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ---------------------------------------------------------------------------
-- Helpers (created as the database owner)
-- ---------------------------------------------------------------------------
create schema test;
grant usage on schema test to anon, authenticated, supabase_auth_admin;

create function test.expect(ok boolean, label text) returns void
language plpgsql as $$
begin
  if ok is not true then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'ok - %', label;
end
$$;

-- Runs `stmt` as the current role and expects it to fail with `state`.
create function test.expect_error(stmt text, state text, label text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = state then
      raise notice 'ok - % (%)', label, sqlstate;
      return;
    end if;
    raise exception 'FAIL: % - expected %, got %: %', label, state, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % - the statement succeeded', label;
end
$$;

-- Runs `stmt` as the current role and returns how many rows it touched.
create function test.row_count(stmt text) returns bigint
language plpgsql as $$
declare
  n bigint;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end
$$;

-- ---------------------------------------------------------------------------
-- Sign-ups, performed as GoTrue's role. handle_new_user() must still fire
-- after 03 revoked EXECUTE on it from the API roles.
-- ---------------------------------------------------------------------------
set role supabase_auth_admin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'wannabe@example.com', '{"role": "admin", "name": "Wannabe"}'),
  ('22222222-2222-4222-8222-222222222222', 'partner1@example.com', '{"role": "partner", "company_name": "Partner One"}'),
  ('33333333-3333-4333-8333-333333333333', 'partner2@example.com', '{"role": "partner"}'),
  ('44444444-4444-4444-8444-444444444444', 'admin@example.com', '{}');
reset role;

-- Admins are made the only way that should work: by the database owner.
update public.profiles set role = 'admin' where id = '44444444-4444-4444-8444-444444444444';

do $$
begin
  perform test.expect((select role from public.profiles where id = '11111111-1111-4111-8111-111111111111') = 'user',
    'sign-up cannot request the admin role');
  perform test.expect((select role from public.profiles where id = '22222222-2222-4222-8222-222222222222') = 'partner',
    'sign-up can request the partner role');
end
$$;

-- ---------------------------------------------------------------------------
-- A signed-in user
-- ---------------------------------------------------------------------------
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false); end $$;

do $$
begin
  perform test.expect((select count(*) from public.profiles) = 1, 'a user sees only their own profile');
  perform test.expect(test.row_count($q$update public.profiles set name = 'Renamed' where id = auth.uid()$q$) = 1,
    'a user can edit their own profile');
  perform test.expect_error($q$update public.profiles set role = 'admin' where id = auth.uid()$q$, '42501',
    'a user cannot make themselves admin');
  perform test.expect_error($q$update public.profiles set email = 'other@example.com' where id = auth.uid()$q$, '42501',
    'a user cannot change their profile email');
  perform test.expect(test.row_count($q$update public.profiles set name = 'x' where id = '22222222-2222-4222-8222-222222222222'$q$) = 0,
    'a user cannot edit someone else''s profile');
  perform test.expect(not public.is_admin(), 'is_admin() is false for a user');
  perform test.expect_error($q$insert into public.partner_listings (partner_id, title) values (auth.uid(), 'Nope')$q$, '42501',
    'a user who is not a partner cannot create listings');
  perform test.expect_error($q$insert into storage.objects (bucket_id, name) values ('listings_media', auth.uid()::text || '/a.jpg')$q$, '42501',
    'a user who is not a partner cannot upload listing media');
end
$$;

-- ---------------------------------------------------------------------------
-- Partner one
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false); end $$;

do $$
declare
  media text := 'https://abcdefghijklmnop.supabase.co/storage/v1/object/public/listings_media/22222222-2222-4222-8222-222222222222/a.jpg';
begin
  insert into public.partner_listings (id, partner_id, title, price, currency, images, status)
  values ('aaaaaaaa-0000-4000-8000-000000000001', auth.uid(), 'Yacht 50ft', 5000, 'USD', array[media], 'approved');
  perform test.expect((select status from public.partner_listings where id = 'aaaaaaaa-0000-4000-8000-000000000001') = 'pending',
    'a new listing is always pending');
  perform test.expect(test.row_count($q$update public.partner_listings set status = 'approved' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$q$) = 1,
    'a partner can edit their listing');
  perform test.expect((select status from public.partner_listings where id = 'aaaaaaaa-0000-4000-8000-000000000001') = 'pending',
    'a partner cannot approve their own listing');
  perform test.expect_error($q$update public.partner_listings set partner_id = '33333333-3333-4333-8333-333333333333' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$q$, '42501',
    'a partner cannot hand a listing to someone else');
  perform test.expect_error($q$insert into public.partner_listings (partner_id, title) values ('33333333-3333-4333-8333-333333333333', 'Spoof')$q$, '42501',
    'a partner cannot create a listing for someone else');
  perform test.expect_error($q$insert into public.partner_listings (partner_id, title, images) values (auth.uid(), 'XSS', array['javascript:alert(document.cookie)'])$q$, '23514',
    'listing images reject javascript: URLs');
  perform test.expect_error($q$insert into public.partner_listings (partner_id, title, images) values (auth.uid(), 'Pixel', array['https://tracker.example/p.gif'])$q$, '23514',
    'listing images reject third-party URLs');
  perform test.expect_error($q$insert into public.partner_listings (partner_id, title, price) values (auth.uid(), 'Negative', -1)$q$, '23514',
    'listing prices cannot be negative');

  insert into storage.objects (bucket_id, name) values ('listings_media', auth.uid()::text || '/a.jpg');
  perform test.expect_error($q$insert into storage.objects (bucket_id, name) values ('listings_media', '33333333-3333-4333-8333-333333333333/a.jpg')$q$, '42501',
    'a partner cannot upload into another partner''s folder');
  perform test.expect_error($q$insert into storage.objects (bucket_id, name) values ('listings_media', 'a.jpg')$q$, '42501',
    'a partner cannot upload outside their own folder');
end
$$;

-- ---------------------------------------------------------------------------
-- Partner two
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false); end $$;

do $$
begin
  perform test.expect((select count(*) from public.partner_listings) = 0, 'a partner cannot see other partners'' listings');
  perform test.expect(test.row_count($q$update public.partner_listings set title = 'Hijacked' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$q$) = 0,
    'a partner cannot edit other partners'' listings');
  perform test.expect((select count(*) from storage.objects) = 0, 'a partner cannot list other partners'' media');
end
$$;

-- ---------------------------------------------------------------------------
-- Guests (the public anon key)
-- ---------------------------------------------------------------------------
set role anon;
do $$ begin perform set_config('request.jwt.claim.sub', '', false); end $$;

do $$
begin
  insert into public.bookings (id, client_name, client_email, dates, item_slug, status)
  values ('bbbbbbbb-0000-4000-8000-000000000001', 'Guest', 'guest@example.com', 'Oct 12 - Oct 15', 'lamborghini-urus-se', 'pending');
  perform test.expect((select count(*) from public.bookings) = 0, 'guests cannot read bookings back');
  perform test.expect_error($q$insert into public.bookings (client_name, client_email, dates) values ('Guest', 'guest@example.com', 'Oct 1') returning id$q$, '42501',
    'insert ... returning fails without a SELECT policy (why /api/book must not ask for the row back)');
  perform test.expect_error($q$insert into public.bookings (client_name, client_email, dates, status) values ('Guest', 'guest@example.com', 'Oct 1', 'confirmed')$q$, '42501',
    'guests can only file pending bookings');
  perform test.expect_error($q$insert into public.bookings (client_name, client_email, dates) values ('Guest', 'not-an-email', 'Oct 1')$q$, '23514',
    'bookings reject malformed emails');
  perform test.expect_error($q$insert into public.bookings (client_name, client_email, dates) values (repeat('x', 201), 'guest@example.com', 'Oct 1')$q$, '23514',
    'bookings reject oversized names');

  perform test.expect((select count(*) from public.stores) >= 0, 'guests can read the catalog');
  perform test.expect_error($q$insert into public.stores (name, slug, category, affiliate_link) values ('Evil', 'evil', 'x', 'https://evil.example')$q$, '42501',
    'guests cannot add catalog rows');
  perform test.expect(test.row_count($q$update public.sportsbooks set affiliate_link = 'https://evil.example'$q$) = 0,
    'guests cannot rewrite affiliate links');
  perform test.expect((select count(*) from public.profiles) = 0, 'guests cannot read profiles');
  perform test.expect((select count(*) from public.partner_listings) = 0, 'guests cannot read partner listings');
  perform test.expect_error($q$select public.is_admin()$q$, '42501', 'guests cannot call the role helpers');
  perform test.expect_error($q$select public.handle_new_user()$q$, '42501', 'guests cannot call handle_new_user()');
end
$$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', false); end $$;

do $$
begin
  perform test.expect(public.is_admin(), 'is_admin() is true for an admin');
  perform test.expect((select count(*) from public.profiles) >= 4, 'an admin sees every profile');
  perform test.expect(test.row_count($q$update public.partner_listings set status = 'approved' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$q$) = 1,
    'an admin can approve a listing');
  perform test.expect((select status from public.partner_listings where id = 'aaaaaaaa-0000-4000-8000-000000000001') = 'approved',
    'an approval sticks');
  perform test.expect(test.row_count($q$update public.profiles set role = 'partner' where id = '11111111-1111-4111-8111-111111111111'$q$) = 1,
    'an admin can change a role');
  perform test.expect((select count(*) from public.bookings) = 1, 'an admin can read bookings');
  perform test.expect((select count(*) from storage.objects) >= 1, 'an admin can list all listing media');
end
$$;

reset role;
do $$ begin raise notice 'all database tests passed'; end $$;
