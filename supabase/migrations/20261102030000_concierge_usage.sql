-- Additive, service-only AI usage control. No customer text or raw IP is stored.
create table private.concierge_ai_policy (
 id boolean primary key default true check(id), enabled boolean not null default true,
 daily_calls integer not null default 64 check(daily_calls between 1 and 10000),
 daily_bytes integer not null default 400000 check(daily_bytes between 1 and 50000000),
 daily_output_tokens integer not null default 24576 check(daily_output_tokens between 1 and 4000000),
 client_calls integer not null default 24 check(client_calls between 1 and 1000)
);
insert into private.concierge_ai_policy(id) values(true);
create table private.concierge_ai_days (
 day date primary key, calls integer not null default 0 check(calls>=0),
 input_bytes integer not null default 0 check(input_bytes>=0),
 output_tokens integer not null default 0 check(output_tokens>=0)
);
create table private.concierge_ai_claims (
 request_id uuid primary key, client_key text not null, fingerprint text not null,
 day date not null references private.concierge_ai_days(day),
 input_bytes integer not null, output_tokens integer not null,
 created_at timestamptz not null default now()
);
create index concierge_ai_claims_expiry on private.concierge_ai_claims(created_at);
alter table private.concierge_ai_policy enable row level security;
alter table private.concierge_ai_days enable row level security;
alter table private.concierge_ai_claims enable row level security;
revoke all on private.concierge_ai_policy,private.concierge_ai_days,private.concierge_ai_claims from public,anon,authenticated;
grant all on private.concierge_ai_policy,private.concierge_ai_days,private.concierge_ai_claims to service_role;

create function public.concierge_ai_reserve(p_key uuid,p_client text,p_fingerprint text,p_input_bytes integer,p_output_tokens integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg private.concierge_ai_policy; used private.concierge_ai_days; receipt private.concierge_ai_claims;
 today date:=(statement_timestamp() at time zone 'UTC')::date; rate_key text; rate_at timestamptz; attempts integer;
begin
 if p_key is null or p_key::text!~'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 or coalesce(p_client,'')!~'^[a-f0-9]{64}$' or coalesce(p_fingerprint,'')!~'^[a-f0-9]{64}$'
 or p_input_bytes is null or p_input_bytes not between 1 and 24000
 or p_output_tokens is null or p_output_tokens not between 1 and 384 then return jsonb_build_object('allowed',false,'reason','invalid'); end if;
 perform pg_advisory_xact_lock(hashtextextended('concierge-ai:'||p_key::text,0));
 select * into receipt from private.concierge_ai_claims where request_id=p_key;
 if found then return jsonb_build_object('allowed',false,'reason',case when receipt.client_key=p_client and receipt.fingerprint=p_fingerprint then 'duplicate' else 'conflict' end); end if;
 select * into cfg from private.concierge_ai_policy where id for share;
 if not found or not cfg.enabled then return jsonb_build_object('allowed',false,'reason','disabled'); end if;
 insert into private.concierge_ai_days(day) values(today) on conflict do nothing;
 select * into used from private.concierge_ai_days where day=today for update;
 if used.calls>=cfg.daily_calls or used.input_bytes>cfg.daily_bytes-p_input_bytes
 or used.output_tokens>cfg.daily_output_tokens-p_output_tokens then return jsonb_build_object('allowed',false,'reason','budget'); end if;
 rate_key:='concierge-ai:'||today::text||':'||p_client;
 select window_at,private.request_rate_limits.attempts into rate_at,attempts from private.request_rate_limits where key=rate_key;
 if not found or rate_at<=statement_timestamp()-interval '10 minutes' then attempts:=0;rate_at:=statement_timestamp(); end if;
 if attempts>=cfg.client_calls then return jsonb_build_object('allowed',false,'reason','rate'); end if;
 insert into private.request_rate_limits(key,window_at,attempts) values(rate_key,rate_at,attempts+1)
 on conflict(key) do update set window_at=excluded.window_at,attempts=excluded.attempts;
 update private.concierge_ai_days set calls=calls+1,input_bytes=input_bytes+p_input_bytes,output_tokens=output_tokens+p_output_tokens where day=today;
 insert into private.concierge_ai_claims(request_id,client_key,fingerprint,day,input_bytes,output_tokens)
 values(p_key,p_client,p_fingerprint,today,p_input_bytes,p_output_tokens);
 -- Only expire this module's own ephemeral state; retain conservative usage
 -- reservations even when inference fails, times out, or the client disconnects.
 delete from private.concierge_ai_claims where created_at<statement_timestamp()-interval '7 days';
 delete from private.request_rate_limits where key like 'concierge-ai:%' and window_at<statement_timestamp()-interval '1 day';
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function public.concierge_ai_reserve(uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.concierge_ai_reserve(uuid,text,text,integer,integer) to service_role;
