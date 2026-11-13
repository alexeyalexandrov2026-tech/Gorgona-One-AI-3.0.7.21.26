-- Additive only: one request for a whole plan (several catalogue items).
-- Apply before setting PLAN_REQUESTS_ENABLED; no production application here.
-- Each plan item stays an ordinary booking row, so partner assignment,
-- withdrawal, history and notifications keep working per item.
begin;
create table public.booking_plans (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references auth.users(id) on delete set null,
  request_key uuid not null unique,
  request_fingerprint text not null,
  client_name text not null check (length(client_name) between 1 and 120),
  client_email text not null check (length(client_email) between 3 and 254),
  client_phone text not null check (length(client_phone) between 1 and 40),
  start_date date not null,
  end_date date not null,
  guests integer not null check (guests between 1 and 99),
  note text not null default '' check (length(note) <= 1000),
  item_count integer not null check (item_count between 1 and 6),
  created_at timestamptz not null default now(),
  check (end_date >= start_date and end_date <= start_date + 30)
);
create index booking_plans_customer_created on public.booking_plans(customer_user_id,created_at desc,id desc);
alter table public.booking_plans enable row level security;
revoke all on public.booking_plans from public,anon,authenticated;
grant select on public.booking_plans to authenticated;
grant all on public.booking_plans to service_role;
create policy booking_plans_customer_read on public.booking_plans for select to authenticated
  using (customer_user_id = (select auth.uid()));
create policy booking_plans_admin_read on public.booking_plans for select to authenticated
  using (public.is_admin());

alter table public.bookings
  add column plan_id uuid references public.booking_plans(id) on delete restrict,
  add column plan_position integer check (plan_position between 1 and 6);
alter table public.bookings add constraint bookings_plan_position_pair check ((plan_id is null) = (plan_position is null));
create unique index bookings_plan_item on public.bookings(plan_id,plan_position) where plan_id is not null;

-- The original submitter is part of the fingerprint. Guest claims can change
-- the current owner without invalidating an already issued receipt.
create function public.dashboard_plan_receipt(p_key uuid,p_fingerprint text)
returns jsonb language sql stable security invoker set search_path='' as $$
  select case when p.request_fingerprint is distinct from p_fingerprint
    then jsonb_build_object('error','conflict')
    else jsonb_build_object('success',true,'planId',p.id,'bookingIds',
      (select coalesce(jsonb_agg(x.id order by x.plan_position),'[]'::jsonb)
       from public.bookings x where x.plan_id=p.id),'replayed',true)
  end from public.booking_plans p where p.request_key=p_key
$$;

-- Trusted server role only. One idempotency key and one rate-limit attempt
-- cover the whole plan; one owner notification lists every item.
create function public.dashboard_submit_plan(p_key uuid,p_fingerprint text,p_rate text,p_user uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.booking_plans; b public.bookings; receipt jsonb; n integer; e uuid; item jsonb; pos bigint; ids uuid[]:='{}'; titles text[]:='{}'; count_items integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  receipt:=public.dashboard_plan_receipt(p_key,p_fingerprint);
  if receipt is not null then return receipt; end if;
  if jsonb_typeof(p_input->'items')<>'array' then return jsonb_build_object('error','invalid'); end if;
  count_items:=jsonb_array_length(p_input->'items');
  if count_items<1 or count_items>6 then return jsonb_build_object('error','invalid'); end if;
  insert into private.request_rate_limits(key,window_at,attempts) values(p_rate,now(),1)
  on conflict(key) do update set
    attempts=case when private.request_rate_limits.window_at<now()-interval '15 minutes' then 1 else private.request_rate_limits.attempts+1 end,
    window_at=case when private.request_rate_limits.window_at<now()-interval '15 minutes' then now() else private.request_rate_limits.window_at end
  returning attempts into n;
  if n>10 then return jsonb_build_object('error','rate'); end if;
  insert into public.booking_plans(customer_user_id,request_key,request_fingerprint,client_name,client_email,client_phone,start_date,end_date,guests,note,item_count)
  values(p_user,p_key,p_fingerprint,p_input->>'name',p_input->>'email',p_input->>'phone',(p_input->>'start')::date,(p_input->>'end')::date,(p_input->>'guests')::integer,coalesce(p_input->>'note',''),count_items)
  returning * into p;
  for item,pos in select value,ordinality from jsonb_array_elements(p_input->'items') with ordinality loop
    -- Only restaurant items carry the hospitality column, so plans without
    -- one also work where the dining migration has not been applied yet.
    if item->>'kind' in ('dining','nightlife') then
      insert into public.bookings(item_slug,item_title,client_name,client_email,client_phone,dates,status,kind,customer_user_id,plan_id,plan_position,hospitality)
      values(item->>'itemSlug',item->>'itemTitle',p.client_name,p.client_email,p.client_phone,item->>'dates','pending',item->>'kind',p_user,p.id,pos,item->'hospitality')
      returning * into b;
    else
      insert into public.bookings(item_slug,item_title,client_name,client_email,client_phone,dates,status,kind,customer_user_id,plan_id,plan_position)
      values(item->>'itemSlug',item->>'itemTitle',p.client_name,p.client_email,p.client_phone,item->>'dates','pending',item->>'kind',p_user,p.id,pos)
      returning * into b;
    end if;
    insert into public.request_events(booking_id,event_type) values(b.id,'created');
    ids:=ids||b.id;titles:=titles||b.item_title;
  end loop;
  insert into private.notification_events(event_type,booking_id,title)
    values('plan_created',ids[1],left(count_items||' · '||array_to_string(titles,' · '),1000)) returning id into e;
  insert into private.notification_deliveries(event_id,channel) values(e,'telegram'),(e,'email');
  return jsonb_build_object('success',true,'planId',p.id,'bookingIds',to_jsonb(ids),'replayed',false);
end $$;
revoke all on function public.dashboard_plan_receipt(uuid,text),public.dashboard_submit_plan(uuid,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dashboard_plan_receipt(uuid,text),public.dashboard_submit_plan(uuid,text,text,uuid,jsonb) to service_role;
commit;
