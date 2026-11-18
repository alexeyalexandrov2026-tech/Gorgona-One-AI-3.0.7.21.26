-- Defense in depth found in the 2026-11-17 audit. Nothing in the app writes to
-- these legacy marketplace tables or to the listings_media bucket.
--
-- 1. Legacy tables still grant anon INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/
--    TRIGGER and grant authenticated TRUNCATE/REFERENCES/TRIGGER. Row level
--    security already limits writes to admins, but RLS does not cover TRUNCATE.
--    Reads (SELECT) and admin writes through RLS are unchanged.
-- 2. listings_media is an unused public bucket in which any self-registered
--    partner could still upload images. The upload policy is removed; the
--    bucket and its (currently empty) contents are left as they are.
--
-- Idempotent; tables or the storage schema that do not exist are skipped.
do $$
declare
  t text;
begin
  foreach t in array array['analytics','categories','coupons','event_analytics','event_categories','event_providers',
                           'event_teams','events','leagues','sportsbooks','stores','teams','ticket_providers','users'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', t);
      execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
    end if;
  end loop;

  if to_regclass('storage.objects') is not null and exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'listings_media_partner_upload'
  ) then
    execute 'drop policy listings_media_partner_upload on storage.objects';
  end if;
end
$$;
