-- Additive only: "My Miami" - account favourites and requests sent without
-- signing in. Apply after 20261111150000_booking_plans.sql and before setting
-- MY_MIAMI_ENABLED; no production application here.
begin;
-- Only the catalogue reference is stored; names and photos are read from the
-- live catalogue when the list is shown, so they never go stale.
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('yacht','stay','car','dining','nightlife')),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, slug)
);
create index favorites_user_created on public.favorites(user_id, created_at desc);
alter table public.favorites enable row level security;
revoke all on public.favorites from public,anon,authenticated;
grant select on public.favorites to authenticated;
grant all on public.favorites to service_role;
create policy favorites_owner_read on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

-- Trusted server role only: the server checks every item against the catalogue first.
create function public.favorites_change(p_user uuid, p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare change jsonb; n integer;
begin
  if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes)>100 then return jsonb_build_object('error','invalid'); end if;
  perform pg_advisory_xact_lock(hashtextextended('favorites:'||p_user::text,0));
  for change in select value from jsonb_array_elements(p_changes) loop
    if (change->>'on')::boolean then
      select count(*) into n from public.favorites where user_id=p_user;
      if n>=200 then return jsonb_build_object('error','rate_limit'); end if;
      insert into public.favorites(user_id,kind,slug) values(p_user,change->>'kind',change->>'slug') on conflict do nothing;
    else
      delete from public.favorites where user_id=p_user and kind=change->>'kind' and slug=change->>'slug';
    end if;
  end loop;
  return jsonb_build_object('success',true,'count',(select count(*) from public.favorites where user_id=p_user));
end $$;

-- Requests sent without signing in (the website or the app) join the account
-- whose CONFIRMED email they were sent from; the server checks confirmation.
-- After this they follow the existing customer RLS, detail and withdrawal paths.
create index bookings_unclaimed_email on public.bookings(lower(client_email)) where customer_user_id is null;
create index booking_plans_unclaimed_email on public.booking_plans(lower(client_email)) where customer_user_id is null;
create function public.dashboard_claim_requests(p_user uuid, p_email text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare requests integer; plans integer;
begin
  if p_email is null or position('@' in p_email)=0 or length(p_email)>254 then return jsonb_build_object('error','invalid'); end if;
  update public.booking_plans set customer_user_id=p_user where customer_user_id is null and lower(client_email)=lower(p_email);
  get diagnostics plans = row_count;
  update public.bookings set customer_user_id=p_user, updated_at=now() where customer_user_id is null and lower(client_email)=lower(p_email);
  get diagnostics requests = row_count;
  return jsonb_build_object('success',true,'requests',requests,'plans',plans);
end $$;

revoke all on function public.favorites_change(uuid,jsonb),public.dashboard_claim_requests(uuid,text) from public,anon,authenticated;
grant execute on function public.favorites_change(uuid,jsonb),public.dashboard_claim_requests(uuid,text) to service_role;
commit;
