-- =============================================================================
-- 02 · Catalog tables (stores, coupons, sportsbooks, events) and bookings.
--
-- Requires 00_profiles_schema.sql (public.is_admin). Mirrors the production
-- project as verified on 2026-10-04 and is safe to re-run. The earlier
-- version of this file (database/schema.sql) created these tables without row
-- level security, which in Supabase lets anyone holding the public anon key
-- rewrite every row - affiliate links included.
--
-- Tables are public to read and admin-only to write. bookings is the
-- exception: guests may insert a pending request but can never read one back.
-- =============================================================================

CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  logo TEXT,
  website TEXT,
  affiliate_link TEXT,
  description TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id),
  code TEXT,
  discount TEXT,
  description TEXT,
  expiration DATE,
  status TEXT DEFAULT 'verified',
  clicks INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS sportsbooks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  description TEXT,
  website TEXT,
  affiliate_link TEXT,
  promo_code TEXT,
  bonus_offer TEXT,
  state_availability TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER REFERENCES coupons(id),
  clicks INTEGER DEFAULT 0,
  date DATE
);

-- Tickets & Events Marketplace. Currently backed by static data in
-- lib/eventsData.js; these tables are prepared for a future Admin Dashboard
-- to manage events/leagues/teams/providers the same way the CSV importer
-- manages `stores` today - no live queries against these tables exist yet.
CREATE TABLE IF NOT EXISTS event_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  category_group TEXT NOT NULL CHECK (category_group IN ('sports', 'concerts'))
);

CREATE TABLE IF NOT EXISTS leagues (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sport TEXT,
  category TEXT REFERENCES event_categories(slug),
  website TEXT
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  league_id INTEGER REFERENCES leagues(id),
  city TEXT,
  website TEXT
);

CREATE TABLE IF NOT EXISTS ticket_providers (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  affiliate_env_var TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES event_categories(slug),
  league_id INTEGER REFERENCES leagues(id),
  artist TEXT,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  state_or_country TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  description TEXT,
  price_range TEXT,
  featured BOOLEAN DEFAULT false,
  trending BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS event_teams (
  event_id TEXT REFERENCES events(id),
  team_id INTEGER REFERENCES teams(id),
  PRIMARY KEY (event_id, team_id)
);

CREATE TABLE IF NOT EXISTS event_providers (
  event_id TEXT REFERENCES events(id),
  provider_id INTEGER REFERENCES ticket_providers(id),
  PRIMARY KEY (event_id, provider_id)
);

-- Analytics preparation (see lib/analytics.js) - no writes happen yet.
CREATE TABLE IF NOT EXISTS event_analytics (
  id SERIAL PRIMARY KEY,
  event_id TEXT REFERENCES events(id),
  metric TEXT NOT NULL CHECK (metric IN ('view', 'ticket_click', 'provider_click')),
  provider_id INTEGER REFERENCES ticket_providers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reservation requests from BookingForm via /api/book. The route inserts
-- with a server-generated id and never reads the row back, because guests
-- have no SELECT policy here (production's default is uuid_generate_v4();
-- gen_random_uuid() needs no extension and is equivalent).
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_slug TEXT,
  item_title TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  dates TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  -- Catalog content: anyone may read, only admins may write.
  FOREACH t IN ARRAY ARRAY[
    'stores', 'coupons', 'categories', 'sportsbooks', 'event_categories', 'leagues',
    'teams', 'ticket_providers', 'events', 'event_teams', 'event_providers'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t || '_public_read', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      t || '_admin_write', t
    );
  END LOOP;

  -- Private tables: admins only.
  FOREACH t IN ARRAY ARRAY['users', 'analytics', 'event_analytics'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_only', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      t || '_admin_only', t
    );
  END LOOP;
END
$$;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_insert_public ON public.bookings;
DROP POLICY IF EXISTS bookings_admin ON public.bookings;

-- Insert-only for guests: a request can be filed, never read back or edited.
CREATE POLICY bookings_insert_public ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY bookings_admin ON public.bookings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
