-- Additive only. Apply before enabling DINING_REQUESTS_ENABLED; no production application here.
begin;
alter table public.bookings add column hospitality jsonb;
create function private.dining_valid_date(value text) returns boolean
language plpgsql immutable strict security invoker set search_path='' set datestyle='ISO, YMD' as $$
begin
 return value::date::text=value;
exception when others then return false;
end $$;
revoke all on function private.dining_valid_date(text) from public,anon,authenticated;
grant execute on function private.dining_valid_date(text) to service_role;
alter table public.bookings add constraint bookings_hospitality_contract check (
  (hospitality is null and kind not in ('dining','nightlife')) or coalesce((
    kind in ('dining','nightlife') and jsonb_typeof(hospitality)='object'
    and hospitality->>'version'='1' and jsonb_typeof(hospitality->'version')='number'
    and jsonb_typeof(hospitality->'guests')='number' and hospitality->>'guests' ~ '^[1-9][0-9]?$'
    and jsonb_typeof(hospitality->'date')='string' and private.dining_valid_date(hospitality->>'date')
    and jsonb_typeof(hospitality->'time')='string'
    and hospitality->>'date' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
    and hospitality->>'time' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    and hospitality->>'option' in ('table','vip','private','guestlist')
    and jsonb_typeof(hospitality->'note')='string' and length(hospitality->>'note')<=1000
    and hospitality - array['version','date','time','guests','option','note'] = '{}'::jsonb
  ),false)
);
-- Existing bookings RLS, ownership indexes, outbox and event history cover these requests.
-- No provider event ingress or confirmed state is enabled before a verified API integration.
create or replace function public.dashboard_submit(p_key uuid,p_fingerprint text,p_rate text,p_user uuid,p_input jsonb)
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
  if p_input->>'kind' in ('dining','nightlife') then
    perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,1));
    if exists(select 1 from public.bookings where request_fingerprint=p_fingerprint and customer_user_id is not distinct from p_user
      and created_at>now()-interval '15 minutes' and status<>'closed') then return jsonb_build_object('error','conflict'); end if;
  end if;
  insert into public.bookings(item_slug,item_title,client_name,client_email,client_phone,dates,status,kind,customer_user_id,request_key,request_fingerprint,hospitality)
  values(p_input->>'itemSlug',p_input->>'itemTitle',p_input->>'name',p_input->>'email',p_input->>'phone',p_input->>'dates','pending',p_input->>'kind',p_user,p_key,p_fingerprint,p_input->'hospitality')
  returning * into b;
  insert into public.request_events(booking_id,event_type) values(b.id,'created');
  insert into private.notification_events(event_type,booking_id,title) values('request_created',b.id,b.item_title) returning id into e;
  insert into private.notification_deliveries(event_id,channel) values(e,'telegram'),(e,'email');
  return jsonb_build_object('success',true,'bookingId',b.id,'replayed',false);
end $$;

create or replace function public.dashboard_command(p_actor uuid,p_booking uuid,p_key uuid,p_fingerprint text,p_command jsonb)
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
  if not found or not coalesce(r='admin' or (r='partner' and b.assigned_partner_id=p_actor) or (action='withdraw' and b.customer_user_id=p_actor and b.hospitality is not null),false) then return jsonb_build_object('error','missing'); end if;
  if b.version<>(p_command->>'version')::integer or b.status not in ('pending','reviewing','responded') then return jsonb_build_object('error','conflict'); end if;
  if action='withdraw' and b.customer_user_id=p_actor and b.hospitality is not null then b.status:='closed';
  elsif action='respond' then
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

commit;
