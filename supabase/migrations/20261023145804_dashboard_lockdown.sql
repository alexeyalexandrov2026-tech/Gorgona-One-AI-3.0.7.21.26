-- Deploy the new /api/book and verify it before applying this migration.
begin;
drop policy if exists bookings_insert_public on public.bookings;
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
revoke execute on function public.current_app_role(),public.is_admin(),public.is_partner_or_admin() from public,anon;
grant execute on function public.current_app_role(),public.is_admin(),public.is_partner_or_admin() to authenticated,service_role;
commit;
