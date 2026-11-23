begin;
-- Expand Dining Editor content validation to accept resy, tock, and dice
-- providers already used by lib/dining/gateway.mjs and lib/dining/bookingSheet.mjs.
create or replace function private.dining_editor_content_valid(value jsonb) returns boolean
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
    channel->>'provider' not in ('opentable','resy','sevenrooms','tock','discotech','tablelistpro','dice','eatwith','venue') then return false; end if;
  if jsonb_typeof(channel->'provider')<>'string' or jsonb_typeof(channel->'externalId')<>'string' or length(channel->>'externalId') not between 1 and 160 or
    jsonb_typeof(channel->'href')<>'string' or length(channel->>'href')>2000 or channel->>'href'!~'^https://[^[:space:]]+$' or
    jsonb_typeof(channel->'evidence')<>'string' or length(channel->>'evidence')>2000 or channel->>'evidence'!~'^https://[^[:space:]]+$' then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function private.dining_editor_content_valid(jsonb) from public,anon,authenticated;
grant execute on function private.dining_editor_content_valid(jsonb) to service_role;
commit;
