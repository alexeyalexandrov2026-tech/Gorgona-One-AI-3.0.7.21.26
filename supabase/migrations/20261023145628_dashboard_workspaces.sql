-- Expand first. Apply the separate lockdown only after the new server is live.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter table public.bookings
  add column customer_user_id uuid references auth.users(id) on delete set null,
  add column assigned_partner_id uuid references public.profiles(id) on delete set null,
  add column kind text not null default 'car',
  add column version integer not null default 0,
  add column response text,
  add column updated_at timestamptz not null default now(),
  add column request_key uuid unique,
  add column request_fingerprint text;
create index bookings_customer_created on public.bookings(customer_user_id,created_at desc,id desc);
create index bookings_partner_created on public.bookings(assigned_partner_id,created_at desc,id desc);
create index bookings_created on public.bookings(created_at desc,id desc);
create policy bookings_customer_read on public.bookings for select to authenticated
  using (customer_user_id = (select auth.uid()));
create policy bookings_partner_read on public.bookings for select to authenticated
  using (assigned_partner_id = (select auth.uid()) and public.is_partner_or_admin());

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 200),
  status text not null default 'pending' check(status in ('pending','active','suspended')),
  created_at timestamptz not null default now()
);
create table public.organization_memberships (
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  member_role text not null check(member_role in ('owner','manager','staff')),
  active boolean not null default true, primary key(organization_id,user_id)
);
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
revoke all on public.organizations,public.organization_memberships from public,anon,authenticated;
grant select on public.organizations,public.organization_memberships to authenticated;
grant all on public.organizations,public.organization_memberships to service_role;
create policy membership_read on public.organization_memberships for select to authenticated
  using (user_id=(select auth.uid()) or public.is_admin());
create policy organization_read on public.organizations for select to authenticated
  using (public.is_admin() or (status in ('pending','active') and exists
    (select 1 from public.organization_memberships m where m.organization_id=organizations.id and m.user_id=(select auth.uid()) and m.active)));

create table public.request_events (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null, reply text, created_at timestamptz not null default now()
);
create index request_events_booking_time on public.request_events(booking_id,created_at,id);
alter table public.request_events enable row level security;
revoke all on public.request_events from public,anon,authenticated;
grant select on public.request_events to authenticated;
grant all on public.request_events to service_role;
create policy request_event_read on public.request_events for select to authenticated using
  (exists(select 1 from public.bookings b where b.id=booking_id));

create table private.request_rate_limits (
  key text primary key, window_at timestamptz not null, attempts integer not null
);
create table private.request_commands (
  key uuid primary key, actor_id uuid, fingerprint text not null, result jsonb not null
);
create table private.notification_events (
  id uuid primary key default gen_random_uuid(), event_type text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  title text, created_at timestamptz not null default now()
);
create table private.notification_budget (period text primary key,used integer not null);
create table private.notification_deliveries (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references private.notification_events(id) on delete cascade,
  channel text not null check(channel in ('telegram','email')),
  status text not null default 'pending' check(status in ('pending','leased','sent','failed')),
  attempts integer not null default 0, next_at timestamptz not null default now(),
  lease_id uuid, lease_until timestamptz, provider_id text, error_code text,
  unique(event_id,channel)
);
create index notification_due on private.notification_deliveries(next_at) where status in ('pending','leased');
alter table private.request_rate_limits enable row level security;
alter table private.request_commands enable row level security;
alter table private.notification_events enable row level security;
alter table private.notification_budget enable row level security;
alter table private.notification_deliveries enable row level security;
revoke all on all tables in schema private from public,anon,authenticated;
grant all on all tables in schema private to service_role;

-- These invoker functions are callable by the trusted server role only.
create function public.dashboard_submit(p_key uuid,p_fingerprint text,p_rate text,p_user uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.bookings; n integer; e uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into b from public.bookings where request_key=p_key;
  if found then
    if b.request_fingerprint<>p_fingerprint or b.customer_user_id is distinct from p_user then return jsonb_build_object('error','conflict'); end if;
    return jsonb_build_object('success',true,'bookingId',b.id,'replayed',true);
  end if;
  insert into private.request_rate_limits(key,window_at,attempts) values(p_rate,now(),1)
  on conflict(key) do update set
    attempts=case when private.request_rate_limits.window_at<now()-interval '15 minutes' then 1 else private.request_rate_limits.attempts+1 end,
    window_at=case when private.request_rate_limits.window_at<now()-interval '15 minutes' then now() else private.request_rate_limits.window_at end
  returning attempts into n;
  if n>10 then return jsonb_build_object('error','rate'); end if;
  insert into public.bookings(item_slug,item_title,client_name,client_email,client_phone,dates,status,kind,customer_user_id,request_key,request_fingerprint)
  values(p_input->>'itemSlug',p_input->>'itemTitle',p_input->>'name',p_input->>'email',p_input->>'phone',p_input->>'dates','pending',p_input->>'kind',p_user,p_key,p_fingerprint)
  returning * into b;
  insert into public.request_events(booking_id,event_type) values(b.id,'created');
  insert into private.notification_events(event_type,booking_id,title) values('request_created',b.id,b.item_title) returning id into e;
  insert into private.notification_deliveries(event_id,channel) values(e,'telegram'),(e,'email');
  return jsonb_build_object('success',true,'bookingId',b.id,'replayed',false);
end $$;

create function public.dashboard_command(p_actor uuid,p_booking uuid,p_key uuid,p_fingerprint text,p_command jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.bookings; c private.request_commands; r text; action text:=p_command->>'action'; e uuid; result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into c from private.request_commands where key=p_key;
  if found then
    if c.actor_id<>p_actor or c.fingerprint<>p_fingerprint then return jsonb_build_object('error','conflict'); end if;
    return c.result;
  end if;
  select role into r from public.profiles where id=p_actor;
  if r is null then return jsonb_build_object('error','forbidden'); end if;
  select * into b from public.bookings where id=p_booking for update;
  if not found or not coalesce(r='admin' or (r='partner' and b.assigned_partner_id=p_actor),false) then return jsonb_build_object('error','missing'); end if;
  if b.version<>(p_command->>'version')::integer or b.status not in ('pending','reviewing','responded') then return jsonb_build_object('error','conflict'); end if;
  if action='respond' then
    if length(trim(p_command->>'reply')) not between 1 and 2000 then return jsonb_build_object('error','conflict'); end if;
    b.response:=p_command->>'reply'; b.status:='responded';
  elsif action='review' and r='admin' and b.status='pending' then b.status:='reviewing';
  elsif action='close' and r='admin' then b.status:='closed';
  elsif action='assign' and r='admin' then
    if p_command->>'partnerId' is not null and not exists(select 1 from public.profiles where id=(p_command->>'partnerId')::uuid and role='partner') then return jsonb_build_object('error','forbidden'); end if;
    b.assigned_partner_id:=(p_command->>'partnerId')::uuid;
  else return jsonb_build_object('error','forbidden'); end if;
  update public.bookings set status=b.status,response=b.response,assigned_partner_id=b.assigned_partner_id,version=version+1,updated_at=now() where id=b.id returning * into b;
  insert into public.request_events(booking_id,event_type,reply) values(b.id,action,case when action='respond' then b.response end);
  insert into private.notification_events(event_type,booking_id,title) values('request_'||action,b.id,b.item_title) returning id into e;
  insert into private.notification_deliveries(event_id,channel) values(e,'telegram'),(e,'email');
  result:=jsonb_build_object('success',true,'bookingId',b.id,'version',b.version);
  insert into private.request_commands(key,actor_id,fingerprint,result) values(p_key,p_actor,p_fingerprint,result);
  return result;
end $$;

create function public.dashboard_claim(p_channels text[],p_limit integer default 5)
returns table(id uuid,lease_id uuid,channel text,event_id uuid,event_type text,booking_id uuid,title text,attempts integer)
language plpgsql security invoker set search_path='' as $$
begin
  update private.notification_deliveries d set status='failed',error_code='attempt_limit'
    where d.status in ('pending','leased') and d.attempts>=5 and (d.lease_until is null or d.lease_until<now());
  update private.notification_deliveries d set status='failed',error_code='expired'
    from private.notification_events e where d.event_id=e.id and d.status in ('pending','leased')
    and e.created_at<now()-interval '23 hours' and (d.lease_until is null or d.lease_until<now());
  return query with ready as (
    select d.id from private.notification_deliveries d where d.channel=any(p_channels) and d.attempts<5
      and (d.status='pending' and d.next_at<=now() or d.status='leased' and d.lease_until<now())
    order by d.next_at,d.id for update skip locked limit least(greatest(p_limit,1),5)
  ), claimed as (
    update private.notification_deliveries d set status='leased',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=d.attempts+1
      from ready where d.id=ready.id returning d.*
  ) select d.id,d.lease_id,d.channel,e.id,e.event_type,e.booking_id,e.title,d.attempts from claimed d join private.notification_events e on e.id=d.event_id;
end $$;

create function public.dashboard_settle(p_id uuid,p_lease uuid,p_ok boolean,p_provider text,p_error text,p_delay integer)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update private.notification_deliveries set status=case when p_ok then 'sent' when p_error='configuration' or attempts>=5 and p_error<>'quota' then 'failed' else 'pending' end,
    attempts=case when p_error='quota' then greatest(attempts-1,0) else attempts end,
    provider_id=left(p_provider,200),error_code=left(p_error,60),next_at=now()+make_interval(secs=>least(greatest(p_delay,1),86400)),lease_until=null
    where id=p_id and lease_id=p_lease and status='leased';
  return found;
end $$;

create function public.dashboard_reserve_email() returns boolean language plpgsql security invoker set search_path='' as $$
declare day_key text:='day:'||to_char(now() at time zone 'UTC','YYYY-MM-DD'); month_key text:='month:'||to_char(now() at time zone 'UTC','YYYY-MM'); d integer; m integer;
begin
  insert into private.notification_budget(period,used) values(day_key,0),(month_key,0) on conflict do nothing;
  select used into d from private.notification_budget where period=day_key for update;
  select used into m from private.notification_budget where period=month_key for update;
  if d>=80 or m>=2700 then return false; end if;
  update private.notification_budget set used=used+1 where period in (day_key,month_key);
  return true;
end $$;

create function public.dashboard_delivery_status(p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then return jsonb_build_object('error','forbidden'); end if;
  return (select jsonb_build_object('pending',count(*) filter(where status='pending'),'leased',count(*) filter(where status='leased'),
    'sent',count(*) filter(where status='sent'),'failed',count(*) filter(where status='failed')) from private.notification_deliveries);
end $$;

-- Events originate in successful database changes, not arbitrary browser text.
create function private.dashboard_business_event() returns trigger language plpgsql security definer set search_path='' as $$
declare e uuid; kind text;
begin
  if tg_table_name='partner_listings' then
    if auth.uid() is not null and new.partner_id<>auth.uid() and not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
    kind:=case when tg_op='INSERT' then 'listing_created' else 'listing_updated' end;
  else kind:=case when new.role='partner' then 'partner_registered' else 'user_registered' end; end if;
  insert into private.notification_events(event_type,title) values(kind,case when tg_table_name='partner_listings' then to_jsonb(new)->>'title' else null end) returning id into e;
  insert into private.notification_deliveries(event_id,channel) values(e,'telegram'),(e,'email');
  return new;
end $$;
revoke all on function private.dashboard_business_event() from public,anon,authenticated;
create trigger dashboard_listing_event after insert or update on public.partner_listings for each row execute function private.dashboard_business_event();
create trigger dashboard_profile_event after insert on public.profiles for each row execute function private.dashboard_business_event();

revoke all on function public.dashboard_submit(uuid,text,text,uuid,jsonb),public.dashboard_command(uuid,uuid,uuid,text,jsonb),
  public.dashboard_claim(text[],integer),public.dashboard_settle(uuid,uuid,boolean,text,text,integer),public.dashboard_delivery_status(uuid),public.dashboard_reserve_email() from public,anon,authenticated;
grant execute on function public.dashboard_submit(uuid,text,text,uuid,jsonb),public.dashboard_command(uuid,uuid,uuid,text,jsonb),
  public.dashboard_claim(text[],integer),public.dashboard_settle(uuid,uuid,boolean,text,text,integer),public.dashboard_delivery_status(uuid),public.dashboard_reserve_email() to service_role;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
commit;
