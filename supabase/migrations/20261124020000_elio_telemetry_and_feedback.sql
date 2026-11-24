-- Stage 3: Persistent zero-PII ELIO+ Guide telemetry and anonymized curated
-- training-sample store for future ELIO-1 fine-tuning / evaluation.
-- Strictly RLS-locked (service_role only; zero anon/authenticated access).

create table if not exists public.elio_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('turn', 'referral_click', 'feedback', 'cache_hit')),
  locale text not null default 'en' check (char_length(locale) between 2 and 12),
  decided_by text check (decided_by is null or decided_by in ('model', 'lexicon', 'fact')),
  action text check (action is null or char_length(action) <= 32),
  platform text check (platform is null or char_length(platform) <= 32),
  vote text check (vote is null or vote in ('up', 'down')),
  latency_ms integer check (latency_ms is null or (latency_ms >= 0 and latency_ms < 120000)),
  handoff boolean not null default false,
  error boolean not null default false,
  cached boolean not null default false
);

create index if not exists elio_telemetry_events_created_idx
  on public.elio_telemetry_events (created_at desc, event_type);

alter table public.elio_telemetry_events enable row level security;

revoke all on public.elio_telemetry_events from public, anon, authenticated;

-- Curated, PII-scrubbed feedback pairs for ELIO-1 evaluation & fine-tuning.
create table if not exists public.elio_training_samples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locale text not null default 'en' check (char_length(locale) between 2 and 12),
  action text check (action is null or char_length(action) <= 32),
  vote text not null check (vote in ('up', 'down')),
  question_redacted text not null check (char_length(question_redacted) between 1 and 2000),
  answer_text text not null check (char_length(answer_text) between 1 and 4000),
  curated boolean not null default false
);

create index if not exists elio_training_samples_created_idx
  on public.elio_training_samples (created_at desc, vote, curated);

alter table public.elio_training_samples enable row level security;

revoke all on public.elio_training_samples from public, anon, authenticated;

-- Admin 7-day aggregate summary RPC (service_role only).
create or replace function public.elio_metrics_summary_7d()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'windowDays', 7,
    'turns', count(*) filter (where event_type = 'turn'),
    'cacheHits', count(*) filter (where event_type = 'cache_hit' or cached = true),
    'modelTurns', count(*) filter (where event_type = 'turn' and decided_by = 'model'),
    'errorTurns', count(*) filter (where event_type = 'turn' and error = true),
    'referralClicks', count(*) filter (where event_type = 'referral_click'),
    'feedbackUp', count(*) filter (where event_type = 'feedback' and vote = 'up'),
    'feedbackDown', count(*) filter (where event_type = 'feedback' and vote = 'down'),
    'avgLatencyMs', round(avg(latency_ms) filter (where event_type = 'turn' and latency_ms is not null))
  )
  from public.elio_telemetry_events
  where created_at >= now() - interval '7 days';
$$;

revoke all on function public.elio_metrics_summary_7d() from public, anon, authenticated;
grant execute on function public.elio_metrics_summary_7d() to service_role;
