-- Reviewed application release required. Never apply an unqualified migration push.
begin;
alter table public.partner_listings
 add column content jsonb,
 add column review_state text not null default 'draft' check(review_state in ('draft','pending','approved','rejected','archived')),
 add column workflow_version integer not null default 0 check(workflow_version>=0),
 add column published_version integer,
 add column published_kind text check(published_kind in ('car','yacht','stay')),
 add column review_note text not null default '',
 add column updated_at timestamptz not null default now();
create index partner_listing_review_queue on public.partner_listings(updated_at,id) where review_state='pending' and content is not null;

create table public.partner_publications (
 id uuid primary key references public.partner_listings(id) on delete cascade,
 slug text not null unique,
 kind text not null check(kind in ('car','yacht','stay')),
 published_version integer not null check(published_version>0),
 company text not null,
 content jsonb not null check(jsonb_typeof(content)='object' and not content ? 'contact'),
 updated_at timestamptz not null default now()
);
alter table public.partner_publications enable row level security;
revoke all on public.partner_publications from public,anon,authenticated;
grant select on public.partner_publications to anon,authenticated;
grant all on public.partner_publications to service_role;
create policy approved_partner_publication_read on public.partner_publications for select to anon,authenticated using(true);

create table private.partner_listing_receipts (
 actor uuid not null references public.profiles(id), key uuid not null,
 fingerprint text not null, result jsonb not null, created_at timestamptz not null default now(), primary key(actor,key)
);
create table private.partner_listing_history (
 listing_id uuid not null references public.partner_listings(id), version integer not null,
 actor uuid not null references public.profiles(id), action text not null,
 content jsonb not null, note text not null, created_at timestamptz not null default now(), primary key(listing_id,version)
);
create table private.partner_listing_media (
 path text primary key, listing_id uuid not null references public.partner_listings(id),
 owner_id uuid not null references public.profiles(id), mime text not null check(mime in ('image/jpeg','image/png','image/webp')),
 size integer not null check(size between 24 and 8388608), created_at timestamptz not null default now()
);
create index partner_media_owner_time on private.partner_listing_media(owner_id,created_at);
alter table private.partner_listing_receipts enable row level security;
alter table private.partner_listing_history enable row level security;
alter table private.partner_listing_media enable row level security;
revoke all on private.partner_listing_receipts,private.partner_listing_history,private.partner_listing_media from public,anon,authenticated;
grant all on private.partner_listing_receipts,private.partner_listing_history,private.partner_listing_media to service_role;

-- Preserve legacy inserts, but never let browser writes bypass v1 commands.
create function private.guard_partner_candidate() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and
   (case when tg_op='DELETE' then old.content is not null else new.content is not null or (tg_op='UPDATE' and old.content is not null) end) then
  raise exception 'Use versioned listing commands' using errcode='42501';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.guard_partner_candidate() from public,anon,authenticated;
create trigger guard_partner_candidate before insert or update or delete on public.partner_listings for each row execute function private.guard_partner_candidate();

create function private.listing_text(c jsonb,k text,n integer,required boolean) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(c->k)='string' and length(c->>k)<=n and (not required or length(btrim(c->>k))>0) and (c->>k)!~'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]',false)
$$;
create function private.listing_number(c jsonb,k text,lo numeric,hi numeric,required boolean,integer_only boolean default true)
returns boolean language plpgsql immutable set search_path='' as $$
declare v numeric;
begin
 if c->k='null'::jsonb and not required then return true; end if;
 if jsonb_typeof(c->k) is distinct from 'number' then return false; end if;
 v:=(c->>k)::numeric;
 return v between lo and hi and (not integer_only or v=trunc(v));
end $$;
create function private.valid_partner_content(c jsonb,owner_id uuid,complete boolean) returns boolean language plpgsql stable set search_path='' as $$
declare s jsonb; a jsonb; k text; allowed text[];
begin
 if jsonb_typeof(c) is distinct from 'object' or c->'schemaVersion' is distinct from '1'::jsonb or
   not coalesce(c->>'kind'=any(array['car','yacht','stay']),false) or
   exists(select 1 from jsonb_object_keys(c) t where t<>all(array['schemaVersion','kind','title','description','location','priceCents','currency','priceUnit','contact','images','specs'])) then return false; end if;
 if not private.listing_text(c,'title',140,complete) or not private.listing_text(c,'description',5000,complete) or not private.listing_text(c,'location',160,complete) or
   not private.listing_number(c,'priceCents',1,100000000,complete) or
   not coalesce(c->>'currency'=any(array['USD','EUR','AED','THB']),false) or
   c->>'priceUnit' is distinct from (case c->>'kind' when 'car' then 'day' when 'yacht' then 'hour' else 'night' end) then return false; end if;
 a:=c->'contact';
 if jsonb_typeof(a) is distinct from 'object' or exists(select 1 from jsonb_object_keys(a) t where t<>all(array['name','email','phone'])) or
   not private.listing_text(a,'name',120,complete) or not private.listing_text(a,'email',254,complete) or not private.listing_text(a,'phone',40,complete) or
   (a->>'email'<>'' and (a->>'email')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or
   (a->>'phone'<>'' and (a->>'phone')!~'^\+?[0-9() .-]{7,40}$') then return false; end if;
 if jsonb_typeof(c->'images') is distinct from 'array' then return false; end if;
 if jsonb_array_length(c->'images')>20 or (complete and jsonb_array_length(c->'images')=0) or
   (select count(distinct value) from jsonb_array_elements(c->'images'))<>jsonb_array_length(c->'images') or
   exists(select 1 from jsonb_array_elements_text(c->'images') t where t!~('^'||owner_id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')) then return false; end if;
 s:=c->'specs';
 allowed:=case c->>'kind' when 'car' then array['brand','model','year','bodyType'] when 'yacht' then array['brand','model','year','lengthFt','guests'] else array['propertyType','bedrooms','bathrooms','guests'] end;
 if jsonb_typeof(s) is distinct from 'object' or exists(select 1 from jsonb_object_keys(s) t where t<>all(allowed)) then return false; end if;
 if c->>'kind' in ('car','yacht') then
  if not private.listing_text(s,'brand',80,complete) or not private.listing_text(s,'model',80,complete) or
    not private.listing_number(s,'year',1900,extract(year from current_date)+1,complete and c->>'kind'='car') then return false; end if;
 end if;
 if c->>'kind'='car' then return coalesce(s->>'bodyType'=any(array['SUVs','Sedans','Convertibles','Sports Cars']),false); end if;
 if c->>'kind'='yacht' then return private.listing_number(s,'lengthFt',1,500,complete,false) and private.listing_number(s,'guests',1,100,complete); end if;
 return coalesce(s->>'propertyType'=any(array['villa','apartment','house']),false) and private.listing_number(s,'bedrooms',0,100,complete) and private.listing_number(s,'bathrooms',1,100,complete,false) and private.listing_number(s,'guests',1,100,complete);
end $$;
revoke all on function private.listing_text(jsonb,text,integer,boolean),private.listing_number(jsonb,text,numeric,numeric,boolean,boolean),private.valid_partner_content(jsonb,uuid,boolean) from public,anon,authenticated;
grant execute on function private.listing_text(jsonb,text,integer,boolean),private.listing_number(jsonb,text,numeric,numeric,boolean,boolean),private.valid_partner_content(jsonb,uuid,boolean) to service_role;

create function public.partner_listing_command(p_actor uuid,p_id uuid,p_key uuid,p_action text,p_version integer,p_content jsonb default null,p_note text default '')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor_role text; b public.partner_listings; receipt private.partner_listing_receipts; fingerprint text; result jsonb; next_state text; v_owner uuid; v_company text;
begin
 if p_actor is null or p_id is null or p_key is null or p_version is null or p_version<0 or p_action is null or p_action not in ('save','submit','approve','reject','withdraw') or p_note is null or length(p_note)>1000 then return jsonb_build_object('error','invalid'); end if;
 select role into actor_role from public.profiles where id=p_actor;
 if actor_role is null or actor_role not in ('partner','admin') then return jsonb_build_object('error','forbidden'); end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_id,p_action,p_version,p_content,p_note)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_key::text,1));
 select * into receipt from private.partner_listing_receipts where actor=p_actor and key=p_key;
 if found then if receipt.fingerprint<>fingerprint then return jsonb_build_object('error','conflict'); end if; return receipt.result; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,2));
 select * into b from public.partner_listings where id=p_id for update;
 if found then
  if b.partner_id<>p_actor and actor_role<>'admin' then return jsonb_build_object('error','forbidden'); end if;
  if b.workflow_version<>p_version then return jsonb_build_object('error','conflict'); end if;
  v_owner:=b.partner_id;
 else
  if p_action<>'save' or p_version<>0 then return jsonb_build_object('error','not_found'); end if;
  v_owner:=p_actor;
 end if;
 if p_action='save' then
  if not private.valid_partner_content(p_content,v_owner,false) then return jsonb_build_object('error','invalid'); end if;
  if exists(select 1 from jsonb_array_elements_text(p_content->'images') t where not exists(select 1 from private.partner_listing_media m where m.path=t and m.owner_id=v_owner and m.listing_id=p_id)) then return jsonb_build_object('error','invalid_media'); end if;
  if b.id is null then
   insert into public.partner_listings(id,partner_id,title,content) values(p_id,v_owner,p_content->>'title',p_content) returning * into b;
  end if;
  next_state:='draft';
 else
  if b.content is null then return jsonb_build_object('error','incomplete'); end if;
  p_content:=b.content;
  if p_action='submit' then
   if b.review_state='pending' then return jsonb_build_object('error','conflict'); end if;
   if not private.valid_partner_content(b.content,v_owner,true) then return jsonb_build_object('error','incomplete'); end if;
   next_state:='pending';
  elsif p_action in ('approve','reject') then
   if actor_role<>'admin' then return jsonb_build_object('error','forbidden'); end if;
   if b.review_state<>'pending' then return jsonb_build_object('error','conflict'); end if;
   if p_action='reject' and length(btrim(p_note))=0 then return jsonb_build_object('error','invalid'); end if;
   if p_action='approve' and not private.valid_partner_content(b.content,v_owner,true) then return jsonb_build_object('error','incomplete'); end if;
   next_state:=case when p_action='approve' then 'approved' else 'rejected' end;
  else next_state:='archived'; end if;
 end if;
 update public.partner_listings set content=p_content,title=p_content->>'title',description=p_content->>'description',
  price=(p_content->>'priceCents')::numeric/100,currency=p_content->>'currency',
  -- Legacy public-image consumers must not receive private storage paths.
  images='{}',status=case when next_state='approved' then 'approved' when next_state='rejected' then 'rejected' else 'pending' end,
  review_state=next_state,workflow_version=workflow_version+1,review_note=case when p_action='reject' then btrim(p_note) else '' end,updated_at=now()
 where id=p_id returning * into b;
 if p_action='approve' then
  select left(coalesce(nullif(p.company_name,''),nullif(p.name,''),'Partner'),200) into v_company from public.profiles p where id=v_owner;
  insert into public.partner_publications(id,slug,kind,published_version,company,content)
   values(b.id,'partner-'||b.id::text,b.content->>'kind',b.workflow_version,v_company,b.content-'contact')
   on conflict(id) do update set kind=excluded.kind,published_version=excluded.published_version,company=excluded.company,content=excluded.content,updated_at=now();
  update public.partner_listings set published_version=b.workflow_version,published_kind=b.content->>'kind' where id=b.id;
 elsif p_action='withdraw' then
  delete from public.partner_publications where id=b.id;
  update public.partner_listings set published_version=null,published_kind=null where id=b.id;
 end if;
 insert into private.partner_listing_history(listing_id,version,actor,action,content,note) values(b.id,b.workflow_version,p_actor,p_action,b.content,case when p_action='reject' then btrim(p_note) else '' end);
 result:=jsonb_build_object('success',true,'id',b.id,'version',b.workflow_version,'state',next_state);
 insert into private.partner_listing_receipts(actor,key,fingerprint,result) values(p_actor,p_key,fingerprint,result);
 return result;
end $$;
revoke all on function public.partner_listing_command(uuid,uuid,uuid,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.partner_listing_command(uuid,uuid,uuid,text,integer,jsonb,text) to service_role;

create function public.partner_listing_media_register(p_actor uuid,p_id uuid,p_path text,p_mime text,p_size integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_owner uuid; actor_role text;
begin
 select role into actor_role from public.profiles where id=p_actor;
 select partner_id into v_owner from public.partner_listings where id=p_id and content is not null;
 if v_owner is null or v_owner<>p_actor or actor_role not in ('partner','admin') then return jsonb_build_object('error','forbidden'); end if;
 if p_path!~('^'||p_actor::text||'/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$') or p_path is null or p_size is null or p_size not between 24 and 8388608 or p_mime is null or p_mime not in ('image/jpeg','image/png','image/webp') then return jsonb_build_object('error','invalid'); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,3));
 if (select count(*) from private.partner_listing_media where owner_id=p_actor and created_at>now()-interval '1 day')>=100 then return jsonb_build_object('error','rate_limit'); end if;
 insert into private.partner_listing_media(path,listing_id,owner_id,mime,size) values(p_path,p_id,p_actor,p_mime,p_size);
 return jsonb_build_object('success',true);
end $$;
create function public.partner_listing_media_access(p_actor uuid,p_path text) returns jsonb language sql security invoker set search_path='' as $$
 select coalesce((select jsonb_build_object('path',m.path,'mime',m.mime,'size',m.size) from private.partner_listing_media m join public.profiles p on p.id=p_actor where m.path=p_path and (m.owner_id=p_actor or p.role='admin')),'null'::jsonb)
$$;
revoke all on function public.partner_listing_media_register(uuid,uuid,text,text,integer),public.partner_listing_media_access(uuid,text) from public,anon,authenticated;
grant execute on function public.partner_listing_media_register(uuid,uuid,text,text,integer),public.partner_listing_media_access(uuid,text) to service_role;

create or replace function private.dashboard_business_event() returns trigger language plpgsql security definer set search_path='' as $$
declare e uuid; kind text;
begin
 if tg_table_name='partner_listings' then
  if auth.uid() is not null and new.partner_id<>auth.uid() and not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
  if new.content is not null then
   if tg_op='INSERT' or new.review_state not in ('pending','approved','rejected','archived') or
     (new.review_state=old.review_state and new.workflow_version=old.workflow_version) then return new; end if;
   kind:=case new.review_state when 'pending' then 'listing_submitted' when 'approved' then 'listing_approved' when 'rejected' then 'listing_rejected' else 'listing_withdrawn' end;
  else kind:=case when tg_op='INSERT' then 'listing_created' else 'listing_updated' end; end if;
 else kind:=case when new.role='partner' then 'partner_registered' else 'user_registered' end; end if;
 insert into private.notification_events(event_type,title) values(kind,case when tg_table_name='partner_listings' then to_jsonb(new)->>'title' else null end) returning id into e;
 insert into private.notification_deliveries(event_id,channel) values(e,'telegram'),(e,'email');
 return new;
end $$;
commit;
