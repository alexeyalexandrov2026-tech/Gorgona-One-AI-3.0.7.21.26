-- Omnichannel ELIO Messenger Agent (Telegram Business/Bot + WhatsApp Cloud API)
-- and Admin Team Copilot state.
-- Strictly additive & locked to service_role only (zero anon/authenticated access).

create schema if not exists private;
grant usage on schema private to service_role;

create table if not exists private.messenger_settings (
  id integer primary key check (id = 1),
  mode text not null default '24_7' check (mode in ('24_7', 'after_hours', 'copilot_only')),
  telegram_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  takeover_hours integer not null default 4 check (takeover_hours between 1 and 48),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into private.messenger_settings (id, mode, telegram_enabled, whatsapp_enabled, takeover_hours)
values (1, '24_7', true, true, 4)
on conflict (id) do nothing;

create table if not exists private.messenger_threads (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('telegram', 'whatsapp')),
  external_chat_id text not null check (char_length(external_chat_id) between 1 and 128),
  business_connection_id text check (business_connection_id is null or char_length(business_connection_id) <= 128),
  customer_name text check (customer_name is null or char_length(customer_name) <= 120),
  customer_handle text check (customer_handle is null or char_length(customer_handle) <= 120),
  locale text not null default 'en' check (char_length(locale) between 2 and 12),
  messages jsonb not null default '[]'::jsonb,
  last_provider_message_id text check (last_provider_message_id is null or char_length(last_provider_message_id) <= 160),
  human_paused_until timestamptz,
  booking_id uuid,
  last_message_preview text check (last_message_preview is null or char_length(last_message_preview) <= 320),
  last_reply_preview text check (last_reply_preview is null or char_length(last_reply_preview) <= 320),
  turns_count integer not null default 0 check (turns_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_chat_id)
);

create index if not exists idx_messenger_threads_updated
  on private.messenger_threads (updated_at desc);

grant all on private.messenger_settings, private.messenger_threads to service_role;

create or replace function public.messenger_settings_get()
returns jsonb
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_row private.messenger_settings%rowtype;
begin
  select * into v_row from private.messenger_settings where id = 1;
  if not found then
    return jsonb_build_object(
      'mode', '24_7',
      'telegramEnabled', true,
      'whatsappEnabled', true,
      'takeoverHours', 4,
      'updatedAt', now()
    );
  end if;
  return jsonb_build_object(
    'mode', v_row.mode,
    'telegramEnabled', v_row.telegram_enabled,
    'whatsappEnabled', v_row.whatsapp_enabled,
    'takeoverHours', v_row.takeover_hours,
    'updatedAt', v_row.updated_at
  );
end;
$$;

create or replace function public.messenger_settings_set(
  p_mode text default null,
  p_telegram_enabled boolean default null,
  p_whatsapp_enabled boolean default null,
  p_takeover_hours integer default null,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_mode text;
  v_hours integer;
begin
  if p_mode is not null and p_mode not in ('24_7', 'after_hours', 'copilot_only') then
    return jsonb_build_object('error', 'invalid');
  end if;
  if p_takeover_hours is not null and (p_takeover_hours < 1 or p_takeover_hours > 48) then
    return jsonb_build_object('error', 'invalid');
  end if;

  insert into private.messenger_settings (id, mode, telegram_enabled, whatsapp_enabled, takeover_hours, updated_by, updated_at)
  values (
    1,
    coalesce(p_mode, '24_7'),
    coalesce(p_telegram_enabled, true),
    coalesce(p_whatsapp_enabled, true),
    coalesce(p_takeover_hours, 4),
    p_actor,
    now()
  )
  on conflict (id) do update set
    mode = coalesce(p_mode, private.messenger_settings.mode),
    telegram_enabled = coalesce(p_telegram_enabled, private.messenger_settings.telegram_enabled),
    whatsapp_enabled = coalesce(p_whatsapp_enabled, private.messenger_settings.whatsapp_enabled),
    takeover_hours = coalesce(p_takeover_hours, private.messenger_settings.takeover_hours),
    updated_by = coalesce(p_actor, private.messenger_settings.updated_by),
    updated_at = now();

  return public.messenger_settings_get();
end;
$$;

create or replace function public.messenger_thread_get(
  p_channel text,
  p_external_chat_id text
)
returns jsonb
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_row private.messenger_threads%rowtype;
begin
  if p_channel not in ('telegram', 'whatsapp') or p_external_chat_id is null or length(trim(p_external_chat_id)) = 0 then
    return null;
  end if;
  select * into v_row
  from private.messenger_threads
  where channel = p_channel and external_chat_id = trim(p_external_chat_id);
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_row.id,
    'channel', v_row.channel,
    'externalChatId', v_row.external_chat_id,
    'businessConnectionId', v_row.business_connection_id,
    'customerName', v_row.customer_name,
    'customerHandle', v_row.customer_handle,
    'locale', v_row.locale,
    'messages', v_row.messages,
    'lastProviderMessageId', v_row.last_provider_message_id,
    'humanPausedUntil', v_row.human_paused_until,
    'bookingId', v_row.booking_id,
    'lastMessagePreview', v_row.last_message_preview,
    'lastReplyPreview', v_row.last_reply_preview,
    'turnsCount', v_row.turns_count,
    'updatedAt', v_row.updated_at
  );
end;
$$;

create or replace function public.messenger_thread_upsert(
  p_channel text,
  p_external_chat_id text,
  p_business_connection_id text default null,
  p_customer_name text default null,
  p_customer_handle text default null,
  p_locale text default 'en',
  p_messages jsonb default '[]'::jsonb,
  p_last_provider_message_id text default null,
  p_human_paused_until timestamptz default null,
  p_keep_pause boolean default true,
  p_booking_id uuid default null,
  p_last_message_preview text default null,
  p_last_reply_preview text default null,
  p_increment_turns boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_id uuid;
  v_chat text := left(trim(coalesce(p_external_chat_id, '')), 128);
begin
  if p_channel not in ('telegram', 'whatsapp') or length(v_chat) = 0 then
    return jsonb_build_object('error', 'invalid');
  end if;

  insert into private.messenger_threads (
    channel,
    external_chat_id,
    business_connection_id,
    customer_name,
    customer_handle,
    locale,
    messages,
    last_provider_message_id,
    human_paused_until,
    booking_id,
    last_message_preview,
    last_reply_preview,
    turns_count,
    updated_at
  )
  values (
    p_channel,
    v_chat,
    nullif(left(trim(coalesce(p_business_connection_id, '')), 128), ''),
    nullif(left(trim(coalesce(p_customer_name, '')), 120), ''),
    nullif(left(trim(coalesce(p_customer_handle, '')), 120), ''),
    left(coalesce(nullif(trim(p_locale), ''), 'en'), 12),
    coalesce(p_messages, '[]'::jsonb),
    nullif(left(trim(coalesce(p_last_provider_message_id, '')), 160), ''),
    p_human_paused_until,
    p_booking_id,
    nullif(left(trim(coalesce(p_last_message_preview, '')), 320), ''),
    nullif(left(trim(coalesce(p_last_reply_preview, '')), 320), ''),
    case when p_increment_turns then 1 else 0 end,
    now()
  )
  on conflict (channel, external_chat_id) do update set
    business_connection_id = coalesce(nullif(left(trim(coalesce(p_business_connection_id, '')), 128), ''), private.messenger_threads.business_connection_id),
    customer_name = coalesce(nullif(left(trim(coalesce(p_customer_name, '')), 120), ''), private.messenger_threads.customer_name),
    customer_handle = coalesce(nullif(left(trim(coalesce(p_customer_handle, '')), 120), ''), private.messenger_threads.customer_handle),
    locale = coalesce(nullif(left(trim(coalesce(p_locale, '')), 12), ''), private.messenger_threads.locale),
    messages = coalesce(p_messages, private.messenger_threads.messages),
    last_provider_message_id = coalesce(nullif(left(trim(coalesce(p_last_provider_message_id, '')), 160), ''), private.messenger_threads.last_provider_message_id),
    human_paused_until = case
      when p_human_paused_until is not null then p_human_paused_until
      when p_keep_pause then private.messenger_threads.human_paused_until
      else null
    end,
    booking_id = coalesce(p_booking_id, private.messenger_threads.booking_id),
    last_message_preview = coalesce(nullif(left(trim(coalesce(p_last_message_preview, '')), 320), ''), private.messenger_threads.last_message_preview),
    last_reply_preview = coalesce(nullif(left(trim(coalesce(p_last_reply_preview, '')), 320), ''), private.messenger_threads.last_reply_preview),
    turns_count = private.messenger_threads.turns_count + case when p_increment_turns then 1 else 0 end,
    updated_at = now()
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.messenger_thread_set_pause(
  p_thread_id uuid,
  p_paused_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public
as $$
begin
  if p_thread_id is null then
    return jsonb_build_object('error', 'invalid');
  end if;
  update private.messenger_threads
  set human_paused_until = p_paused_until,
      updated_at = now()
  where id = p_thread_id;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  return jsonb_build_object('ok', true, 'id', p_thread_id, 'humanPausedUntil', p_paused_until);
end;
$$;

create or replace function public.messenger_threads_recent(
  p_limit integer default 20
)
returns jsonb
language sql
security definer
set search_path = private, public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'channel', t.channel,
        'customerName', t.customer_name,
        'customerHandle', t.customer_handle,
        'locale', t.locale,
        'humanPausedUntil', t.human_paused_until,
        'bookingId', t.booking_id,
        'lastMessagePreview', t.last_message_preview,
        'lastReplyPreview', t.last_reply_preview,
        'turnsCount', t.turns_count,
        'updatedAt', t.updated_at
      )
      order by t.updated_at desc
    ),
    '[]'::jsonb
  )
  from (
    select *
    from private.messenger_threads
    order by updated_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 50))
  ) t;
$$;

revoke all on function
  public.messenger_settings_get(),
  public.messenger_settings_set(text, boolean, boolean, integer, uuid),
  public.messenger_thread_get(text, text),
  public.messenger_thread_upsert(text, text, text, text, text, text, jsonb, text, timestamptz, boolean, uuid, text, text, boolean),
  public.messenger_thread_set_pause(uuid, timestamptz),
  public.messenger_threads_recent(integer)
from public, anon, authenticated;

grant execute on function
  public.messenger_settings_get(),
  public.messenger_settings_set(text, boolean, boolean, integer, uuid),
  public.messenger_thread_get(text, text),
  public.messenger_thread_upsert(text, text, text, text, text, text, jsonb, text, timestamptz, boolean, uuid, text, text, boolean),
  public.messenger_thread_set_pause(uuid, timestamptz),
  public.messenger_threads_recent(integer)
to service_role;
