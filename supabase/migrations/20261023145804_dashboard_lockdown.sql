-- Deploy the new /api/book and verify it before applying this migration.
begin;
-- Retain the legacy definition for audit, but retire it from browser roles.
alter policy bookings_insert_public on public.bookings to service_role;
revoke all on public.bookings from anon,authenticated;
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(name,company_name,metadata) on public.profiles to authenticated;
grant all on public.profiles to service_role;
revoke all on public.partner_listings from anon,authenticated;
grant select,insert,update,delete on public.partner_listings to authenticated;
grant all on public.partner_listings to service_role;
-- Role lookup needs to bypass profile RLS, but should not be an exposed
-- SECURITY DEFINER RPC. The public helpers remain invokers for RLS policies.
create schema if not exists private_authz;
revoke all on schema private_authz from public,anon;
grant usage on schema private_authz to authenticated,service_role;
create function private_authz.current_app_role() returns text
language sql stable security definer set search_path='' as $$
  select p.role from public.profiles p where auth.uid() is not null and p.id=auth.uid()
$$;
revoke all on function private_authz.current_app_role() from public,anon;
grant execute on function private_authz.current_app_role() to authenticated,service_role;
create or replace function public.current_app_role() returns text
language sql stable security invoker set search_path='' as $$ select private_authz.current_app_role() $$;
create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path='' as $$ select coalesce(public.current_app_role()='admin',false) $$;
create or replace function public.is_partner_or_admin() returns boolean
language sql stable security invoker set search_path='' as $$ select coalesce(public.current_app_role() in ('partner','admin'),false) $$;
revoke execute on function public.current_app_role(),public.is_admin(),public.is_partner_or_admin() from public,anon;
grant execute on function public.current_app_role(),public.is_admin(),public.is_partner_or_admin() to authenticated,service_role;
commit;
