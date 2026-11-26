-- Wave 1C: Zero-PII AI Revenue Attribution & 30-day Investor ROI metrics.
-- Strictly additive & RLS-locked (service_role only; zero anon/authenticated access).

do $$
declare
  c_name text;
begin
  for c_name in
    select conname
    from pg_constraint
    where conrelid = 'public.elio_telemetry_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%event_type%'
  loop
    execute format('alter table public.elio_telemetry_events drop constraint %I', c_name);
  end loop;
end $$;

alter table public.elio_telemetry_events
  add constraint elio_telemetry_events_event_type_check
  check (event_type in ('turn', 'referral_click', 'feedback', 'cache_hit', 'mcp_call', 'ai_booking', 'ai_quote_paid'));

alter table public.elio_telemetry_events
  add column if not exists amount_cents integer
  check (amount_cents is null or (amount_cents >= 0 and amount_cents <= 50000000));

create index if not exists elio_telemetry_events_platform_idx
  on public.elio_telemetry_events (created_at desc, platform)
  where platform is not null;

-- Admin 30-day zero-PII AI Revenue & Investor Unit Economics RPC (service_role only).
create or replace function public.elio_investor_roi_30d()
returns jsonb
language sql
security definer
set search_path = public, private
as $$
  with telemetry as (
    select *
    from public.elio_telemetry_events
    where created_at >= now() - interval '30 days'
  ),
  chat_turns as (
    select *
    from telemetry
    where event_type in ('turn', 'cache_hit')
      and coalesce(platform, '') <> 'mcp'
  ),
  mcp_events as (
    select *
    from telemetry
    where event_type = 'mcp_call'
       or platform = 'mcp'
  ),
  mcp_tools as (
    select
      regexp_replace(coalesce(action, 'unknown'), '^mcp:', '') as tool,
      count(*)::int as calls
    from mcp_events
    group by 1
    order by calls desc, tool asc
    limit 8
  ),
  funnel as (
    select *
    from public.funnel_events
    where created_at >= now() - interval '30 days'
      and event_name in ('lead_submit', 'plan_submit')
  ),
  paid_quotes as (
    select
      pq.id,
      pq.amount_cents,
      ba.utm_source
    from private.payment_quotes pq
    left join public.booking_attributions ba on ba.booking_id = pq.booking_id
    where pq.status = 'paid'
      and coalesce(pq.paid_at, pq.updated_at, pq.created_at) >= now() - interval '30 days'
  ),
  agg as (
    select
      (select count(*)::int from chat_turns) as turns_30d,
      (select count(*)::int from chat_turns where event_type = 'turn' and decided_by = 'model') as model_turns_30d,
      (select count(*)::int from chat_turns where event_type = 'cache_hit' or cached = true) as cache_hits_30d,
      (select round(avg(latency_ms))::int from chat_turns where event_type = 'turn' and latency_ms is not null) as avg_latency_ms,
      (select round(percentile_cont(0.95) within group (order by latency_ms))::int from chat_turns where event_type = 'turn' and latency_ms is not null) as p95_latency_ms,
      (select count(*)::int from telemetry where event_type = 'feedback' and vote = 'up') as feedback_up_30d,
      (select count(*)::int from telemetry where event_type = 'feedback' and vote = 'down') as feedback_down_30d,
      (select count(*)::int from mcp_events) as mcp_calls_30d,
      (select count(*)::int from funnel) as total_leads_30d,
      (select count(*)::int from funnel where utm_source in ('elio_guide', 'mcp_agent')) as ai_leads_30d,
      (select count(*)::int from funnel where utm_source = 'mcp_agent') as mcp_leads_30d,
      (select count(*)::int from paid_quotes) as paid_quotes_30d,
      (select coalesce(sum(amount_cents), 0)::bigint from paid_quotes) as total_paid_gmv_cents_30d,
      (select count(*)::int from paid_quotes where utm_source in ('elio_guide', 'mcp_agent')) as ai_paid_quotes_30d,
      (select coalesce(sum(amount_cents), 0)::bigint from paid_quotes where utm_source in ('elio_guide', 'mcp_agent')) as ai_paid_gmv_cents_30d
  )
  select jsonb_build_object(
    'windowDays', 30,
    'turns30d', turns_30d,
    'modelTurns30d', model_turns_30d,
    'cacheHits30d', cache_hits_30d,
    'cacheHitRatePct', case when turns_30d > 0 then round((100.0 * cache_hits_30d / turns_30d)::numeric, 1) else null end,
    'avgLatencyMs', avg_latency_ms,
    'p95LatencyMs', p95_latency_ms,
    'feedbackUp30d', feedback_up_30d,
    'feedbackDown30d', feedback_down_30d,
    'feedbackPositivePct', case when (feedback_up_30d + feedback_down_30d) > 0 then round((100.0 * feedback_up_30d / (feedback_up_30d + feedback_down_30d))::numeric, 1) else null end,
    'mcpCalls30d', mcp_calls_30d,
    'mcpToolBreakdown', coalesce((select jsonb_agg(jsonb_build_object('tool', tool, 'calls', calls)) from mcp_tools), '[]'::jsonb),
    'totalLeads30d', total_leads_30d,
    'aiAttributedLeads30d', ai_leads_30d,
    'mcpAttributedLeads30d', mcp_leads_30d,
    'aiLeadSharePct', case when total_leads_30d > 0 then round((100.0 * ai_leads_30d / total_leads_30d)::numeric, 1) else null end,
    'paidQuotes30d', paid_quotes_30d,
    'totalPaidGmvCents30d', total_paid_gmv_cents_30d,
    'aiAttributedPaidQuotes30d', ai_paid_quotes_30d,
    'aiAttributedGmvCents30d', ai_paid_gmv_cents_30d,
    'estInferenceCostUsd30d', round((model_turns_30d * 0.0018)::numeric, 2)
  )
  from agg;
$$;

revoke all on function public.elio_investor_roi_30d() from public, anon, authenticated;
grant execute on function public.elio_investor_roi_30d() to service_role;
