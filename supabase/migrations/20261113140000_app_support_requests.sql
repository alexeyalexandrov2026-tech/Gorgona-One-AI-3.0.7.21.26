begin;

-- These requests can contain private text. Only the server role can access
-- the table. The dashboard checks the administrator's verified identity.
create table public.app_support_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ai_report', 'account_deletion')),
  user_id uuid references auth.users(id) on delete set null,
  request_key uuid not null unique,
  rate_key text,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
create index app_support_requests_rate_idx on public.app_support_requests(rate_key, created_at) where rate_key is not null;
create index app_support_requests_open_idx on public.app_support_requests(created_at) where resolved_at is null;
create unique index app_support_requests_deletion_idx on public.app_support_requests(user_id)
  where kind = 'account_deletion' and resolved_at is null and user_id is not null;

alter table public.app_support_requests enable row level security;
revoke all on public.app_support_requests from public, anon, authenticated;
grant select, insert, update on public.app_support_requests to service_role;

create function public.submit_app_support_request(
  p_kind text, p_key uuid, p_user uuid, p_rate text, p_content jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  existing public.app_support_requests%rowtype;
  request_id uuid;
begin
  if p_kind not in ('ai_report','account_deletion') or p_key is null or
    (p_kind = 'ai_report' and (p_rate is null or p_user is not null)) or
    (p_kind = 'account_deletion' and (p_user is null or p_rate is not null)) then
    return jsonb_build_object('error','invalid');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('support-request:' || p_key::text, 0));
  select * into existing from public.app_support_requests where request_key = p_key;
  if found then
    if existing.kind = p_kind and existing.user_id is not distinct from p_user and existing.content = p_content then
      return jsonb_build_object('id',existing.id);
    end if;
    return jsonb_build_object('error','conflict');
  end if;

  if p_kind = 'ai_report' then
    perform pg_advisory_xact_lock(hashtextextended('support-rate:' || p_rate, 0));
    if (select count(*) from public.app_support_requests
      where rate_key = p_rate and created_at >= now() - interval '1 hour') >= 5 then
      return jsonb_build_object('error','rate_limit');
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended('support-user:' || p_user::text, 0));
    select id into request_id from public.app_support_requests
      where kind = 'account_deletion' and user_id = p_user and resolved_at is null;
    if found then return jsonb_build_object('id',request_id); end if;
  end if;

  insert into public.app_support_requests(kind,request_key,user_id,rate_key,content)
  values (p_kind,p_key,p_user,p_rate,p_content) returning id into request_id;
  return jsonb_build_object('id',request_id);
end;
$$;
revoke all on function public.submit_app_support_request(text,uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.submit_app_support_request(text,uuid,uuid,text,jsonb) to service_role;

create function public.resolve_app_support_request(p_id uuid, p_actor uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  closed_id uuid;
begin
  update public.app_support_requests
    set resolved_at = now(), resolved_by = p_actor
    where id = p_id and resolved_at is null
      and (kind = 'ai_report' or user_id is null)
    returning id into closed_id;
  if found then return jsonb_build_object('id',closed_id); end if;
  if exists (select 1 from public.app_support_requests
    where id = p_id and resolved_at is null and kind = 'account_deletion' and user_id is not null) then
    return jsonb_build_object('error','conflict');
  end if;
  return jsonb_build_object('error','missing');
end;
$$;
revoke all on function public.resolve_app_support_request(uuid,uuid) from public, anon, authenticated;
grant execute on function public.resolve_app_support_request(uuid,uuid) to service_role;

commit;
