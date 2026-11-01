import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import {fixture,ids,asUser} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {dashboardHandlers} from '../../lib/server/dashboardHandlers.mjs';
const payload={kind:'dining',itemSlug:'komodo-miami',itemTitle:'Forged title',dates:'arbitrary',name:'Dining test',email:'dining@example.com',phone:'+13055550123',
 hospitality:{version:1,date:'2027-02-14',time:'19:30',guests:4,option:'private',note:'A quiet table please.'}};
const request=(actor,body,key=randomUUID())=>new Request('https://example.com/api/book',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key,...(actor?{Authorization:'Bearer '+actor}:{})},body:JSON.stringify(body)});
let db,handlers,fetcher,id,key;
before(async()=>{db=await fixture();fetcher=provider(db);handlers=dashboardHandlers({...fixtureEnv,DINING_REQUESTS_ENABLED:'true',DINING_SCHEMA_ENABLED:'true'},fetcher);});
after(async()=>{await db?.close();});
test('dining requests are gated until the migration and release are approved',async()=>{
 assert.equal((await dashboardHandlers(fixtureEnv,fetcher).book(request(null,payload))).status,503);
});
test('feature-off deployment preserves customer history on the prior database schema',async()=>{
 const previous=await fixture({migrationFiles:readdirSync(new URL('../../supabase/migrations/',import.meta.url)).filter(name=>name<'20261031210000_dining_requests.sql').sort()});
 try {
  const old=dashboardHandlers(fixtureEnv,provider(previous));
  const response=await old.list(new Request('https://example.com/api/dashboard/requests',{headers:{Authorization:'Bearer '+ids.customer}}));
  assert.equal(response.status,200);
 } finally {await previous.close();}
});
test('provider and catalogue diagnostics are administrator-only and reveal no credentials',async()=>{
 for(const [actor,status] of [[null,401],[ids.customer,403],[ids.partner,403],[ids.admin,200]]){
  const response=await handlers.diningOverview(new Request('https://example.com/api/dashboard/dining',{headers:actor?{Authorization:'Bearer '+actor}:{}}));
  assert.equal(response.status,status);
  if(status===200){const body=await response.json();assert.equal(body.providers.length,6);assert.ok(body.catalogue.some(v=>v.status==='unverified'));assert.ok(!JSON.stringify(body).includes(fixtureEnv.SUPABASE_SERVICE_ROLE_KEY));}
 }
});
test('dining requests persist structured preferences, canonical identity and a pending inquiry only',async()=>{
 key=randomUUID();const response=await handlers.book(request(ids.customer,payload,key));assert.equal(response.status,200);id=(await response.json()).bookingId;
 const row=(await db.query('select * from public.bookings where id=$1',[id])).rows[0];
 assert.equal(row.status,'pending');assert.equal(row.item_title,'Komodo');assert.match(row.dates,/America\/New_York/);
 assert.deepEqual(row.hospitality,payload.hospitality);assert.equal(row.customer_user_id,ids.customer);
});
test('lost-response retries return the original request and reject changed payloads',async()=>{
 const replay=await handlers.book(request(ids.customer,payload,key));assert.equal((await replay.json()).bookingId,id);
 assert.equal((await handlers.book(request(ids.customer,{...payload,hospitality:{...payload.hospitality,guests:5}},key))).status,409);
 assert.equal((await handlers.book(request(ids.customer,payload))).status,409);
 assert.equal((await db.query('select count(*)::int n from public.bookings')).rows[0].n,1);
});
test('unverified venues, unsupported options, invalid dates and forged confirmation are rejected or ignored',async()=>{
 for(const bad of [{itemSlug:'story-miami'},{hospitality:{...payload.hospitality,date:'2027-02-30'}},{hospitality:{...payload.hospitality,guests:'4'}},{hospitality:{...payload.hospitality,option:'confirmed'}}])
  assert.equal((await handlers.book(request(null,{...payload,...bad}))).status,400);
 assert.equal((await handlers.book(request(null,{...payload,kind:'nightlife',itemSlug:'sugar-rooftop-miami',hospitality:{...payload.hospitality,option:'vip'}}))).status,400);
 assert.equal((await handlers.book(request(null,{...payload,hospitality:{...payload.hospitality,option:'guestlist'}}))).status,400);
});
test('booking RLS hides dining requests from other customers and unassigned partners',async()=>{
 for(const user of [ids.other,ids.partner]) assert.equal((await asUser(db,user,'select id from public.bookings where id=$1',[id])).rows.length,0);
 assert.equal((await asUser(db,ids.customer,'select id from public.bookings where id=$1',[id])).rows.length,1);
});
test('only the inquiry owner can withdraw; this never claims to cancel a provider booking',async()=>{
 const body={action:'withdraw',version:0};
 assert.equal((await handlers.command(request(ids.other,body),id)).status,404);
 const result=await handlers.command(request(ids.customer,body),id);assert.equal(result.status,200);
 assert.equal((await db.query('select status from public.bookings where id=$1',[id])).rows[0].status,'closed');
 assert.equal((await db.query('select event_type from public.request_events where booking_id=$1 order by created_at desc',[id])).rows[0].event_type,'withdraw');
 assert.equal((await handlers.command(request(ids.customer,body),id)).status,409);
});
test('database constraints reject malformed hospitality data even through a trusted SQL writer',async()=>{
 for(const bad of [null,{},{...payload.hospitality,guests:0},{...payload.hospitality,option:'confirmed'},{...payload.hospitality,reference:'fake'},{...payload.hospitality,date:'2027-99-99'},{...payload.hospitality,date:'2027-02-30'}])
  await assert.rejects(db.query('update public.bookings set hospitality=$1 where id=$2',[JSON.stringify(bad),id]),/bookings_hospitality_contract/);
});
test('calendar validation is independent of session DateStyle',async()=>{
 await db.exec("set datestyle='SQL, DMY'");
 try {assert.equal((await db.query("select private.dining_valid_date('2027-02-14') valid")).rows[0].valid,true);}
 finally {await db.exec("set datestyle='ISO, YMD'");}
});
