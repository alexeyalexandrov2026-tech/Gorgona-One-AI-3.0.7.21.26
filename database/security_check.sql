-- One-screen security check. Read-only.
-- The Supabase SQL editor shows only the last result, so every check is in
-- this single query. After 02_security_hardening.sql:
--   * no "table without row level security" rows,
--   * "admin account" lists only people you made admin,
--   * "hardening applied" says yes.
select 'table without row level security' as finding, c.relname::text as detail
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
union all
select 'admin account', coalesce(p.email, p.id::text)
from public.profiles p
where p.role = 'admin'
union all
select 'asked for admin at sign-up', coalesce(u.email, u.id::text) || ' (role now: ' || coalesce(p.role, 'no profile') || ')'
from auth.users u
left join public.profiles p on p.id = u.id
where u.raw_user_meta_data->>'role' = 'admin'
union all
select 'hardening applied',
       case when to_regprocedure('public.is_admin()') is not null then 'yes' else 'no' end
order by 1, 2;
