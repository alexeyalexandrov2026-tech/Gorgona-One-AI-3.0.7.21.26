-- Staging-only bootstrap, reconstructed from read-only schema metadata.
-- Never run this against production or copy production Auth/customer rows.
begin;
do $$ begin
  if to_regclass('public.profiles') is not null or to_regclass('public.bookings') is not null or to_regclass('public.partner_listings') is not null then raise exception 'Refusing to bootstrap a populated application schema'; end if;
end $$;
create table public."profiles" (
"id" uuid not null,
"email" text not null,
"role" text default 'user'::text not null,
"name" text,
"company_name" text,
"metadata" jsonb default '{}'::jsonb,
"created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
constraint "profiles_pkey" PRIMARY KEY (id)
);
create table public."partner_listings" (
"id" uuid default gen_random_uuid() not null,
"partner_id" uuid not null,
"title" text not null,
"description" text,
"price" numeric,
"currency" text,
"images" text[] default '{}'::text[],
"status" text default 'pending'::text,
"created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
constraint "partner_listings_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
constraint "partner_listings_pkey" PRIMARY KEY (id),
constraint "partner_listings_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);
create table public."bookings" (
"id" uuid default gen_random_uuid() not null,
"item_slug" text,
"item_title" text,
"client_name" text,
"client_email" text,
"client_phone" text,
"dates" text,
"status" text default 'pending'::text,
"created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
constraint "bookings_pkey" PRIMARY KEY (id)
);
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

alter table public."profiles" enable row level security;
grant all on public."profiles" to anon,authenticated,service_role;
alter table public."partner_listings" enable row level security;
grant all on public."partner_listings" to anon,authenticated,service_role;
alter table public."bookings" enable row level security;
grant all on public."bookings" to anon,authenticated,service_role;
create policy "bookings_admin" on public."bookings" for ALL to "authenticated" using (is_admin()) with check (is_admin());
create policy "bookings_insert_public" on public."bookings" for INSERT to "anon","authenticated" with check ((status = 'pending'::text));
create policy "partner_listings_delete_admin" on public."partner_listings" for DELETE to "authenticated" using (is_admin());
create policy "partner_listings_insert_own" on public."partner_listings" for INSERT to "authenticated" with check (((partner_id = auth.uid()) AND is_partner_or_admin()));
create policy "partner_listings_select" on public."partner_listings" for SELECT to "authenticated" using (((partner_id = auth.uid()) OR is_admin()));
create policy "partner_listings_update_admin" on public."partner_listings" for UPDATE to "authenticated" using (is_admin()) with check (is_admin());
create policy "partner_listings_update_own" on public."partner_listings" for UPDATE to "authenticated" using ((partner_id = auth.uid())) with check ((partner_id = auth.uid()));
create policy "profiles_select_own_or_admin" on public."profiles" for SELECT to "authenticated" using (((id = auth.uid()) OR is_admin()));
create policy "profiles_update_admin" on public."profiles" for UPDATE to "authenticated" using (is_admin()) with check (is_admin());
create policy "profiles_update_own" on public."profiles" for UPDATE to "authenticated" using ((id = auth.uid())) with check ((id = auth.uid()));
create trigger protect_profile_columns before update on public.profiles for each row execute function public.protect_profile_columns();
create trigger partner_listings_moderation before insert or update on public.partner_listings for each row execute function public.partner_listings_moderation();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
commit;

