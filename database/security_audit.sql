-- Read-only security checks. Run in the Supabase SQL editor before and after
-- 02_security_hardening.sql. Nothing here changes data.

-- 1. Tables in public without row level security.
--    After the hardening script this should return no rows.
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- 2. Every policy on public and storage tables.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 3. Accounts with elevated roles. Confirm each one is expected.
select id, email, role, created_at
from public.profiles
where role in ('admin', 'partner')
order by role, created_at;

-- 4. Accounts whose sign-up metadata asked for admin. Before the fix such a
--    request became a real admin role; any row here deserves a look.
select u.id, u.email, u.created_at, p.role as current_role
from auth.users u
left join public.profiles p on p.id = u.id
where u.raw_user_meta_data->>'role' = 'admin'
order by u.created_at desc;

-- 5. SECURITY DEFINER functions in public. Each should pin search_path
--    (proconfig shows search_path=""). Review any you do not recognise,
--    including search_listings if it appears here.
select p.proname, p.prosecdef as security_definer, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 1;

-- 6. Storage buckets and their limits.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;
