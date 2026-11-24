-- First-party zero-PII conversion funnel, outbound partner click tracking,
-- and booking UTM/ad-click attribution.
-- Strictly RLS-locked (service_role only; zero anon/authenticated access).

create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null check (
    event_name in (
      'page_landing',
      'partner_click',
      'telegram_click',
      'whatsapp_click',
      'elio_open',
      'lead_submit',
      'plan_submit',
      'ticket_click',
      'event_view',
      'voice_play'
    )
  ),
  provider text check (provider is null or char_length(provider) <= 40),
  page_path text check (page_path is null or char_length(page_path) <= 200),
  target_host text check (target_host is null or char_length(target_host) <= 120),
  item_slug text check (item_slug is null or char_length(item_slug) <= 160),
  locale text not null default 'en' check (char_length(locale) between 2 and 12),
  utm_source text check (utm_source is null or char_length(utm_source) <= 80),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 80),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 120),
  utm_content text check (utm_content is null or char_length(utm_content) <= 120),
  click_id_type text check (click_id_type is null or click_id_type in ('fbclid', 'gclid', 'ttclid', 'msclkid')),
  landing_path text check (landing_path is null or char_length(landing_path) <= 200),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 120),
  device_type text check (device_type is null or device_type in ('mobile', 'desktop'))
);

create index if not exists funnel_events_created_event_idx
  on public.funnel_events (created_at desc, event_name);

create index if not exists funnel_events_created_provider_idx
  on public.funnel_events (created_at desc, provider)
  where provider is not null;

create index if not exists funnel_events_created_source_idx
  on public.funnel_events (created_at desc, utm_source)
  where utm_source is not null;

alter table public.funnel_events enable row level security;

revoke all on public.funnel_events from public, anon, authenticated;

-- Stores first-party marketing attribution (UTM / click-id channel / landing path)
-- for each submitted booking without altering existing booking RPC contracts.
create table if not exists public.booking_attributions (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  created_at timestamptz not null default now(),
  utm_source text check (utm_source is null or char_length(utm_source) <= 80),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 80),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 120),
  utm_content text check (utm_content is null or char_length(utm_content) <= 120),
  click_id_type text check (click_id_type is null or click_id_type in ('fbclid', 'gclid', 'ttclid', 'msclkid')),
  landing_path text check (landing_path is null or char_length(landing_path) <= 200),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 120)
);

alter table public.booking_attributions enable row level security;

revoke all on public.booking_attributions from public, anon, authenticated;

-- Admin 7-day conversion funnel & attribution aggregate RPC (service_role only).
create or replace function public.funnel_metrics_summary_7d()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with recent as (
    select *
    from public.funnel_events
    where created_at >= now() - interval '7 days'
  ),
  providers as (
    select
      provider,
      count(*)::int as clicks
    from recent
    where event_name in ('partner_click', 'ticket_click', 'telegram_click', 'whatsapp_click')
      and provider is not null
    group by provider
    order by clicks desc, provider asc
    limit 12
  ),
  sources as (
    select
      coalesce(nullif(utm_source, ''), click_id_type, nullif(referrer_host, ''), 'direct') as source,
      count(*)::int as events,
      count(*) filter (where event_name in ('partner_click', 'ticket_click', 'telegram_click', 'whatsapp_click'))::int as clicks,
      count(*) filter (where event_name in ('lead_submit', 'plan_submit'))::int as leads
    from recent
    group by 1
    order by leads desc, clicks desc, events desc
    limit 10
  )
  select jsonb_build_object(
    'windowDays', 7,
    'totalEvents', (select count(*)::int from recent),
    'partnerClicks', (select count(*)::int from recent where event_name in ('partner_click', 'ticket_click')),
    'messengerClicks', (select count(*)::int from recent where event_name in ('telegram_click', 'whatsapp_click')),
    'leadSubmits', (select count(*)::int from recent where event_name in ('lead_submit', 'plan_submit')),
    'elioOpens', (select count(*)::int from recent where event_name = 'elio_open'),
    'voicePlays', (select count(*)::int from recent where event_name = 'voice_play'),
    'adAttributedEvents', (select count(*)::int from recent where click_id_type is not null or utm_source is not null),
    'byProvider', coalesce((select jsonb_agg(jsonb_build_object('provider', provider, 'clicks', clicks)) from providers), '[]'::jsonb),
    'bySource', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'events', events, 'clicks', clicks, 'leads', leads)) from sources), '[]'::jsonb)
  );
$$;

revoke all on function public.funnel_metrics_summary_7d() from public, anon, authenticated;
grant execute on function public.funnel_metrics_summary_7d() to service_role;
