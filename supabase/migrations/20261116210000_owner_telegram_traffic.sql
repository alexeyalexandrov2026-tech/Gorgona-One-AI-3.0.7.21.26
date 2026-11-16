begin;

create table private.owner_notification_settings (
  singleton boolean primary key default true check (singleton),
  telegram_from timestamptz,
  traffic_from timestamptz check (traffic_from = date_trunc('hour',traffic_from,'UTC'))
);
insert into private.owner_notification_settings default values;

create table private.owner_traffic_hours (
  hour_start timestamptz primary key check (hour_start = date_trunc('hour',hour_start,'UTC')),
  visits integer not null check (visits >= 0),
  pageviews integer not null check (pageviews >= visits)
);
alter table private.owner_notification_settings enable row level security;
alter table private.owner_traffic_hours enable row level security;
revoke all on private.owner_notification_settings,private.owner_traffic_hours from public,anon,authenticated;
grant select on private.owner_notification_settings to service_role;
grant select,insert on private.owner_traffic_hours to service_role;

create function public.dashboard_traffic_hour_due(p_hour timestamptz)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists (
    select 1 from private.owner_notification_settings s
    where s.telegram_from <= now() and s.traffic_from <= p_hour
      and p_hour = date_trunc('hour',p_hour,'UTC')
      and p_hour = date_trunc('hour',now(),'UTC') - interval '1 hour'
      and not exists(select 1 from private.owner_traffic_hours h where h.hour_start=p_hour)
  );
$$;

create function public.dashboard_record_traffic_hour(p_hour timestamptz,p_visits integer,p_pageviews integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
  event uuid;
begin
  if p_visits is null or p_pageviews is null or p_visits<0 or p_pageviews<p_visits then
    raise exception 'Invalid traffic counts' using errcode='22023';
  end if;
  if not public.dashboard_traffic_hour_due(p_hour) then return false; end if;
  insert into private.owner_traffic_hours(hour_start,visits,pageviews)
    values(p_hour,p_visits,p_pageviews) on conflict do nothing;
  if not found then return false; end if;
  if p_pageviews=0 then return true; end if;

  insert into private.notification_events(event_type,title)
    values('traffic_hourly',jsonb_build_object(
      'hour',to_char(p_hour at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'visits',p_visits,'pageviews',p_pageviews
    )::text) returning id into event;
  insert into private.notification_deliveries(event_id,channel) values(event,'telegram');
  return true;
end $$;

revoke all on function public.dashboard_traffic_hour_due(timestamptz),
  public.dashboard_record_traffic_hour(timestamptz,integer,integer) from public,anon,authenticated;
grant execute on function public.dashboard_traffic_hour_due(timestamptz),
  public.dashboard_record_traffic_hour(timestamptz,integer,integer) to service_role;

create or replace function public.dashboard_claim(p_channels text[],p_limit integer default 5)
returns table(id uuid,lease_id uuid,channel text,event_id uuid,event_type text,booking_id uuid,title text,attempts integer)
language plpgsql security invoker set search_path='' as $$
begin
  update private.notification_deliveries d set status='failed',error_code='attempt_limit'
    where d.status in ('pending','leased') and d.attempts>=5 and (d.lease_until is null or d.lease_until<now());
  update private.notification_deliveries d set status='failed',error_code='expired'
    from private.notification_events e where d.event_id=e.id and d.status in ('pending','leased')
    and e.created_at<now()-interval '23 hours' and (d.lease_until is null or d.lease_until<now());
  return query with ready as (
    select d.id from private.notification_deliveries d
      join private.notification_events e on e.id=d.event_id
      cross join private.owner_notification_settings s
    where d.channel=any(p_channels) and d.attempts<5
      and (d.status='pending' and d.next_at<=now() or d.status='leased' and d.lease_until<now())
      and (d.channel<>'telegram' or (e.created_at>=s.telegram_from
        and (e.event_type<>'traffic_hourly' or (e.created_at>=s.traffic_from
          and e.created_at>=now()-interval '1 hour'))))
    order by d.next_at,d.id for update of d skip locked limit least(greatest(p_limit,1),5)
  ), claimed as (
    update private.notification_deliveries d set status='leased',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=d.attempts+1
      from ready where d.id=ready.id returning d.*
  ) select d.id,d.lease_id,d.channel,e.id,e.event_type,e.booking_id,e.title,d.attempts from claimed d join private.notification_events e on e.id=d.event_id;
end $$;

-- A Telegram request with a lost response might already have reached the chat.
-- Reserve a summary before calling Telegram and do not resend an unknown outcome.
create function public.dashboard_begin_traffic_delivery(p_id uuid,p_lease uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare
  prior_error text;
begin
  select d.error_code into prior_error from private.notification_deliveries d
    join private.notification_events e on e.id=d.event_id
    where d.id=p_id and d.lease_id=p_lease and d.channel='telegram'
      and e.event_type='traffic_hourly' and d.status='leased' and d.lease_until>now()
    for update of d;
  if not found then return 'lease_lost'; end if;
  if prior_error='traffic_outcome_unknown' then return 'outcome_unknown'; end if;
  update private.notification_deliveries set error_code='traffic_outcome_unknown' where id=p_id;
  return 'reserved';
end $$;

revoke all on function public.dashboard_begin_traffic_delivery(uuid,uuid) from public,anon,authenticated;
grant execute on function public.dashboard_begin_traffic_delivery(uuid,uuid) to service_role;

create or replace function public.dashboard_settle(p_id uuid,p_lease uuid,p_ok boolean,p_provider text,p_error text,p_delay integer)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update private.notification_deliveries set status=case
      when p_ok then 'sent'
      when p_error='configuration' or (channel='sms' and p_error='sms_outcome_unknown')
        or (channel='telegram' and p_error='traffic_outcome_unknown')
        or (attempts>=5 and p_error<>'quota') then 'failed'
      else 'pending'
    end,
    attempts=case when p_error='quota' then greatest(attempts-1,0) else attempts end,
    provider_id=left(p_provider,200),error_code=left(p_error,60),next_at=now()+make_interval(secs=>least(greatest(p_delay,1),86400)),lease_until=null
    where id=p_id and lease_id=p_lease and status='leased';
  return found;
end $$;

-- The existing SMS insert trigger listens to business events. Give the
-- Telegram-only aggregate its own delivery without using the SMS budget.
drop trigger dashboard_sms_after_business_event on private.notification_events;
create trigger dashboard_sms_after_business_event after insert on private.notification_events
  for each row when (new.event_type<>'traffic_hourly') execute function private.dashboard_enqueue_sms();

commit;
