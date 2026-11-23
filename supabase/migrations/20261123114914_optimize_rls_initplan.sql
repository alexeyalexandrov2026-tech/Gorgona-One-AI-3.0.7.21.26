begin;
-- Wrap auth.uid() inside (select auth.uid()) on profiles and partner_listings
-- so Postgres evaluates the session identity once per statement instead of per row.
do $$
begin
  if to_regclass('public.profiles') is not null then
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own_or_admin') then
      execute 'alter policy profiles_select_own_or_admin on public.profiles using ((id = (select auth.uid())) or is_admin())';
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own') then
      execute 'alter policy profiles_update_own on public.profiles using (id = (select auth.uid())) with check (id = (select auth.uid()))';
    end if;
  end if;

  if to_regclass('public.partner_listings') is not null then
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'partner_listings' and policyname = 'partner_listings_select') then
      execute 'alter policy partner_listings_select on public.partner_listings using ((partner_id = (select auth.uid())) or is_admin())';
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'partner_listings' and policyname = 'partner_listings_insert_own') then
      execute 'alter policy partner_listings_insert_own on public.partner_listings with check ((partner_id = (select auth.uid())) and is_partner_or_admin())';
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'partner_listings' and policyname = 'partner_listings_update_own') then
      execute 'alter policy partner_listings_update_own on public.partner_listings using (partner_id = (select auth.uid())) with check (partner_id = (select auth.uid()))';
    end if;
  end if;
end $$;
commit;
