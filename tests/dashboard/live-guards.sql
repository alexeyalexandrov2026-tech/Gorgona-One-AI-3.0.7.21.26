-- Read-only schema snapshot, 2026-10-23. Contains no customer data or secrets.
CREATE OR REPLACE FUNCTION public.current_app_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.role from public.profiles p where p.id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(public.current_app_role() = 'admin', false)
$function$;

CREATE OR REPLACE FUNCTION public.is_partner_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(public.current_app_role() in ('partner', 'admin'), false)
$function$;

CREATE OR REPLACE FUNCTION public.partner_listings_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.status := 'pending';
    if tg_op = 'UPDATE' and new.partner_id is distinct from old.partner_id then
      raise exception 'partner_listings: partner_id cannot be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;
