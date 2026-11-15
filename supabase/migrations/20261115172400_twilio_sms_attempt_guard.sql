begin;

-- Record an attempt before calling a provider that does not deduplicate create requests.
-- The marker survives worker crashes and lease expiry.
create function public.dashboard_begin_sms_attempt(p_id uuid, p_lease uuid) returns text
language plpgsql security invoker set search_path='' as $$
declare
  prior_error text;
begin
  select d.error_code into prior_error
    from private.notification_deliveries d
    where d.id=p_id and d.lease_id=p_lease and d.channel='sms'
      and d.status='leased' and d.lease_until>now()
    for update;
  if not found then return 'lease_lost'; end if;
  if prior_error='sms_outcome_unknown' then return 'outcome_unknown'; end if;
  if not public.dashboard_reserve_sms() then return 'quota'; end if;
  update private.notification_deliveries set error_code='sms_outcome_unknown' where id=p_id;
  return 'reserved';
end $$;

revoke all on function public.dashboard_begin_sms_attempt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.dashboard_begin_sms_attempt(uuid,uuid) to service_role;

create or replace function public.dashboard_settle(p_id uuid,p_lease uuid,p_ok boolean,p_provider text,p_error text,p_delay integer)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update private.notification_deliveries set status=case
      when p_ok then 'sent'
      when p_error='configuration' or (channel='sms' and p_error='sms_outcome_unknown')
        or (attempts>=5 and p_error<>'quota') then 'failed'
      else 'pending'
    end,
    attempts=case when p_error='quota' then greatest(attempts-1,0) else attempts end,
    provider_id=left(p_provider,200),error_code=left(p_error,60),next_at=now()+make_interval(secs=>least(greatest(p_delay,1),86400)),lease_until=null
    where id=p_id and lease_id=p_lease and status='leased';
  return found;
end $$;

commit;
