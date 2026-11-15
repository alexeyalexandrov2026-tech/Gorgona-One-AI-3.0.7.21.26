-- Add a dormant SMS channel. Safe before the application deploy: delivery remains disabled.
-- No SMS records are created until the protected database switch is enabled.
begin;

alter table private.notification_deliveries
  drop constraint notification_deliveries_channel_check;
alter table private.notification_deliveries
  add constraint notification_deliveries_channel_check
  check (channel in ('telegram','email','sms'));

create table private.sms_notification_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into private.sms_notification_settings(singleton,enabled) values (true,false);
alter table private.sms_notification_settings enable row level security;
revoke all on private.sms_notification_settings from public,anon,authenticated;
grant select,update on private.sms_notification_settings to service_role;

create function private.dashboard_enqueue_sms() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select enabled from private.sms_notification_settings where singleton = true) then
    insert into private.notification_deliveries(event_id,channel)
    values(new.id,'sms')
    on conflict (event_id,channel) do nothing;
  end if;
  return new;
end $$;
revoke all on function private.dashboard_enqueue_sms() from public,anon,authenticated;

create trigger dashboard_sms_after_business_event
after insert on private.notification_events
for each row execute function private.dashboard_enqueue_sms();

-- Conservative per-attempt caps. A provider timeout may count even when the delivery is uncertain.
create function public.dashboard_reserve_sms() returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  day_key text := 'sms:day:' || to_char(now() at time zone 'UTC','YYYY-MM-DD');
  month_key text := 'sms:month:' || to_char(now() at time zone 'UTC','YYYY-MM');
  d integer;
  m integer;
begin
  insert into private.notification_budget(period,used)
  values(day_key,0),(month_key,0) on conflict do nothing;
  select used into d from private.notification_budget where period=day_key for update;
  select used into m from private.notification_budget where period=month_key for update;
  if d >= 50 or m >= 500 then return false; end if;
  update private.notification_budget set used=used+1 where period in (day_key,month_key);
  return true;
end $$;
revoke all on function public.dashboard_reserve_sms() from public,anon,authenticated;
grant execute on function public.dashboard_reserve_sms() to service_role;

commit;
