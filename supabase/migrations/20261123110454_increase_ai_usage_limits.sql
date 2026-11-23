begin;
-- Raise Cloudflare Workers AI durable daily and per-client limits in line with
-- production traffic growth (stays within table CHECK bounds: calls <= 10000,
-- bytes <= 50000000, output_tokens <= 4000000, client_calls <= 1000).
alter table private.concierge_ai_policy
  alter column daily_calls set default 3000,
  alter column daily_bytes set default 30000000,
  alter column daily_output_tokens set default 1152000,
  alter column client_calls set default 120;

update private.concierge_ai_policy
set
  daily_calls = 3000,
  daily_bytes = 30000000,
  daily_output_tokens = 1152000,
  client_calls = 120
where id = true;
commit;
