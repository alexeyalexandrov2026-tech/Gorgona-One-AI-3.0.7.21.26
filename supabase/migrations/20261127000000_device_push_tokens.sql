-- Push notification device tokens for native apps (FCM HTTP v1).
-- Strictly first-party functional trip alerts (ESIGN quote ready, payment confirmed,
-- booking status updates, NOAA rain Plan B alerts). Zero ad/marketing tracking.

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (char_length(token) between 32 and 512),
  platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
  locale text not null default 'en' check (char_length(locale) between 2 and 12),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_device_push_tokens_user on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.device_push_tokens;
create policy "Users manage own push tokens"
  on public.device_push_tokens
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.push_token_upsert(
  p_token text,
  p_platform text default 'android',
  p_locale text default 'en',
  p_app_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_token is null or char_length(trim(p_token)) < 32 or char_length(trim(p_token)) > 512 then
    raise exception 'Invalid push token' using errcode = '22023';
  end if;

  insert into public.device_push_tokens (user_id, token, platform, locale, app_version, updated_at)
  values (
    v_user,
    trim(p_token),
    case when p_platform in ('android', 'ios', 'web') then p_platform else 'android' end,
    left(coalesce(nullif(trim(p_locale), ''), 'en'), 12),
    nullif(left(trim(coalesce(p_app_version, '')), 32), ''),
    now()
  )
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        locale = excluded.locale,
        app_version = excluded.app_version,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.push_token_upsert(text, text, text, text) from public, anon;
grant execute on function public.push_token_upsert(text, text, text, text) to authenticated;

create or replace function public.push_tokens_for_recipient(
  p_user_id uuid default null,
  p_email text default null
)
returns table (token text, platform text, locale text)
language sql
security definer
set search_path = public, auth
as $$
  select distinct d.token, d.platform, d.locale
  from public.device_push_tokens d
  left join auth.users u on u.id = d.user_id
  where (p_user_id is not null and d.user_id = p_user_id)
     or (
       p_email is not null
       and length(trim(p_email)) > 3
       and u.email_confirmed_at is not null
       and lower(u.email) = lower(trim(p_email))
     )
  limit 10;
$$;

revoke all on function public.push_tokens_for_recipient(uuid, text) from public, anon, authenticated;
grant execute on function public.push_tokens_for_recipient(uuid, text) to service_role;
