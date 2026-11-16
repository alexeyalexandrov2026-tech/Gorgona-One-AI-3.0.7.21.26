-- Give back a reservation when inference fails, times out, or returns nothing usable.
-- The daily cap counts answers, not attempts that the guest never saw.
create function public.concierge_ai_release(p_key uuid, p_client text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare receipt private.concierge_ai_claims;
begin
 if p_key is null or p_key::text!~'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 or coalesce(p_client,'')!~'^[a-f0-9]{64}$' then
  return jsonb_build_object('released', false, 'reason', 'invalid');
 end if;
 perform pg_advisory_xact_lock(hashtextextended('concierge-ai:'||p_key::text, 0));
 select * into receipt from private.concierge_ai_claims where request_id=p_key;
 if not found then return jsonb_build_object('released', false, 'reason', 'absent'); end if;
 if receipt.client_key<>p_client then return jsonb_build_object('released', false, 'reason', 'conflict'); end if;
 update private.concierge_ai_days
  set calls=greatest(calls-1, 0),
      input_bytes=greatest(input_bytes-receipt.input_bytes, 0),
      output_tokens=greatest(output_tokens-receipt.output_tokens, 0)
  where day=receipt.day;
 update private.request_rate_limits
  set attempts=greatest(attempts-1, 0)
  where key='concierge-ai:'||receipt.day::text||':'||p_client;
 delete from private.concierge_ai_claims where request_id=p_key;
 return jsonb_build_object('released', true);
end $$;
revoke all on function public.concierge_ai_release(uuid, text) from public, anon, authenticated;
grant execute on function public.concierge_ai_release(uuid, text) to service_role;
