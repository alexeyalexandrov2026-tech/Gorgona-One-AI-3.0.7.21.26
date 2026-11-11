begin;
-- Server-mediated editorial state. No browser can read a draft or execute a command.
create function private.dining_editor_content_valid(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare channel jsonb; item jsonb;
begin
 if value is null or jsonb_typeof(value) is distinct from 'object' or
   (select array_agg(key order by key) from jsonb_object_keys(value) key) is distinct from
   array['address','channels','cuisine','description','features','name','neighborhood','sources','status','verifiedOn','website']::text[] then return false; end if;
 foreach item in array array[value->'name',value->'address',value->'neighborhood',value->'cuisine',value->'description',value->'website',value->'verifiedOn',value->'status'] loop
  if jsonb_typeof(item)<>'string' then return false; end if;
 end loop;
 if length(btrim(value->>'name')) not between 1 and 160 or length(value->>'address')>300 or length(value->>'neighborhood')>100 or length(value->>'cuisine')>100 or length(value->>'description')>1500 or length(value->>'website')>2000 or
   value->>'status' not in ('verified','unverified') or
   (value->>'verifiedOn'<>'' and not private.dining_valid_date(value->>'verifiedOn')) or
   (value->>'website'<>'' and value->>'website'!~'^https://[^[:space:]]+$') then return false; end if;
 if jsonb_typeof(value->'features')<>'array' or jsonb_array_length(value->'features')>11 or
   jsonb_typeof(value->'sources')<>'array' or jsonb_array_length(value->'sources')>8 or
   jsonb_typeof(value->'channels')<>'array' or jsonb_array_length(value->'channels')>8 then return false; end if;
 for item in select * from jsonb_array_elements(value->'features') loop
  if jsonb_typeof(item)<>'string' or item#>>'{}' not in ('fine-dining','private','club','vip','rooftop','lounge','outdoor','casual','waterfront','beach-club','live-music') then return false; end if;
 end loop;
 for item in select * from jsonb_array_elements(value->'sources') loop
  if jsonb_typeof(item)<>'string' or length(item#>>'{}')>2000 or item#>>'{}'!~'^https://[^[:space:]]+$' then return false; end if;
 end loop;
 for channel in select * from jsonb_array_elements(value->'channels') loop
  if jsonb_typeof(channel) is distinct from 'object' or (select array_agg(key order by key) from jsonb_object_keys(channel) key) is distinct from array['evidence','externalId','href','provider']::text[] or
    channel->>'provider' not in ('opentable','sevenrooms','discotech','tablelistpro','eatwith','venue') then return false; end if;
  if jsonb_typeof(channel->'provider')<>'string' or jsonb_typeof(channel->'externalId')<>'string' or length(channel->>'externalId') not between 1 and 160 or
    jsonb_typeof(channel->'href')<>'string' or length(channel->>'href')>2000 or channel->>'href'!~'^https://[^[:space:]]+$' or
    jsonb_typeof(channel->'evidence')<>'string' or length(channel->>'evidence')>2000 or channel->>'evidence'!~'^https://[^[:space:]]+$' then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function private.dining_editor_content_valid(jsonb) from public,anon,authenticated;
grant execute on function private.dining_editor_content_valid(jsonb) to service_role;

create table private.dining_venue_drafts(
 id text primary key check(id~'^[a-z][a-z0-9-]{0,79}$'),
 slug text unique not null check(slug=id||'-miami'),
 revision integer not null default 0 check(revision>=0),
 content jsonb not null check(private.dining_editor_content_valid(content)),
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now()
);
create table public.dining_publications(
 id text primary key references private.dining_venue_drafts(id),
 slug text unique not null check(slug=id||'-miami'),
 content jsonb not null check(private.dining_editor_content_valid(content)),
 published_version integer not null check(published_version>0),
 published_at timestamptz not null default now()
);
create table private.dining_editor_events(
 id uuid primary key default gen_random_uuid(),
 venue_id text not null references private.dining_venue_drafts(id),
 actor_id uuid not null references public.profiles(id),
 action text not null check(action in ('save','publish')),
 revision integer not null,
 content jsonb not null,
 created_at timestamptz not null default now()
);
create index dining_editor_events_venue on private.dining_editor_events(venue_id,created_at desc,id desc);
create table private.dining_editor_commands(
 request_key uuid primary key,
 actor_id uuid not null,
 fingerprint text not null,
 receipt jsonb not null,
 created_at timestamptz not null default now()
);
alter table private.dining_venue_drafts enable row level security;
alter table private.dining_editor_events enable row level security;
alter table private.dining_editor_commands enable row level security;
alter table public.dining_publications enable row level security;
revoke all on private.dining_venue_drafts,private.dining_editor_events,private.dining_editor_commands,public.dining_publications from public,anon,authenticated;
grant all on private.dining_venue_drafts,private.dining_editor_events,private.dining_editor_commands,public.dining_publications to service_role;
grant select on public.dining_publications to anon,authenticated;
create policy dining_publications_read on public.dining_publications for select to anon,authenticated using(true);

create function public.dining_venue_read(p_actor uuid,p_id text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare draft private.dining_venue_drafts; publication public.dining_publications; events jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then return jsonb_build_object('error','forbidden'); end if;
 select * into draft from private.dining_venue_drafts where id=p_id;
 select * into publication from public.dining_publications where id=p_id;
 select coalesce(jsonb_agg(e),'[]') into events from (
  select id,action,revision,created_at from private.dining_editor_events where venue_id=p_id order by created_at desc,id desc limit 20
 ) e;
 return jsonb_build_object('revision',coalesce(draft.revision,0),'draft',draft.content,'publishedVersion',publication.published_version,'published',publication.content,'events',events);
end $$;
create function public.dining_venue_command(p_actor uuid,p_id text,p_slug text,p_key uuid,p_fingerprint text,p_action text,p_version integer,p_content jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare saved private.dining_editor_commands; draft private.dining_venue_drafts; receipt jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then return jsonb_build_object('error','forbidden'); end if;
 if p_key is null or p_fingerprint is null or length(p_fingerprint)<>64 or p_id is null or p_id!~'^[a-z][a-z0-9-]{0,79}$' or p_slug is distinct from p_id||'-miami' or p_action is null or p_action not in ('save','publish') or p_version is null or p_version<0 then return jsonb_build_object('error','invalid'); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,19));
 select * into saved from private.dining_editor_commands where request_key=p_key;
 if found then
  if saved.actor_id=p_actor and saved.fingerprint=p_fingerprint then return saved.receipt; end if;
  return jsonb_build_object('error','conflict');
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id,23));
 select * into draft from private.dining_venue_drafts where id=p_id for update;
 if coalesce(draft.revision,0)<>p_version then return jsonb_build_object('error','conflict'); end if;
 if p_action='save' then
  if not private.dining_editor_content_valid(p_content) then return jsonb_build_object('error','invalid'); end if;
  insert into private.dining_venue_drafts(id,slug,revision,content,updated_by) values(p_id,p_slug,1,p_content,p_actor)
  on conflict(id) do update set revision=private.dining_venue_drafts.revision+1,content=excluded.content,updated_by=p_actor,updated_at=now()
  returning * into draft;
 else
  if draft.id is null then return jsonb_build_object('error','missing'); end if;
  if p_content is not null then return jsonb_build_object('error','invalid'); end if;
  if draft.content->>'status'='verified' and (draft.content->>'address'='' or draft.content->>'neighborhood'='' or draft.content->>'description'='' or draft.content->>'website'='' or draft.content->>'verifiedOn'='' or jsonb_array_length(draft.content->'sources')=0 or jsonb_array_length(draft.content->'channels')=0) then return jsonb_build_object('error','incomplete'); end if;
  if exists(select 1 from public.dining_publications where id=p_id and published_version=p_version) then
   receipt=jsonb_build_object('success',true,'revision',draft.revision,'publishedVersion',draft.revision);
   insert into private.dining_editor_commands values(p_key,p_actor,p_fingerprint,receipt,now());return receipt;
  end if;
  insert into public.dining_publications(id,slug,content,published_version) values(p_id,p_slug,draft.content,draft.revision)
  on conflict(id) do update set content=excluded.content,published_version=excluded.published_version,published_at=now();
 end if;
 insert into private.dining_editor_events(venue_id,actor_id,action,revision,content) values(p_id,p_actor,p_action,draft.revision,draft.content);
 receipt=jsonb_build_object('success',true,'revision',draft.revision,'publishedVersion',(select published_version from public.dining_publications where id=p_id));
 insert into private.dining_editor_commands values(p_key,p_actor,p_fingerprint,receipt,now());
 return receipt;
end $$;
revoke all on function public.dining_venue_read(uuid,text),public.dining_venue_command(uuid,text,text,uuid,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.dining_venue_read(uuid,text),public.dining_venue_command(uuid,text,text,uuid,text,text,integer,jsonb) to service_role;
commit;
