-- =============================================================================
-- 00 · Profiles, roles, and the role helpers every other policy relies on.
--
-- Mirrors the production project as verified on 2026-10-04 and is safe to
-- re-run: objects are created idempotently, and the policies an earlier
-- version of this file created are dropped first. Two of those were security
-- holes - "Admins can view all profiles" queried profiles from inside a
-- profiles policy (infinite recursion), and "Users can update own profile"
-- let anyone change their own role - and the old handle_new_user() copied any
-- role the client asked for at sign-up, including 'admin'.
--
-- Roles: 'user' (default); 'partner' (chosen at partner sign-up - everything
-- a partner submits is moderated); 'admin' (granted only by an existing admin
-- or in the SQL editor, never through sign-up or a user's own update).
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user',
  name text,
  company_name text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

-- Role helpers. SECURITY DEFINER lets a policy read the caller's role without
-- re-entering the profiles policies, which is what made the old inline
-- sub-select recurse.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.is_partner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('partner', 'admin'), false)
$$;

-- New accounts. raw_user_meta_data is whatever the client passed to signUp(),
-- so the only role it may request is 'partner'; anything else, 'admin'
-- included, becomes 'user'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS decides which profile rows a user may update; this trigger decides
-- which columns. Nobody but an admin changes a role, and id, email and
-- created_at never change through the API.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
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
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Policies. The three quoted names come from the earlier version of this file.
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
