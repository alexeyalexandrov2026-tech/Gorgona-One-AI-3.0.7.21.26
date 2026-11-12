// Local SQL rehearsal only; never applies a migration to a hosted project.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readdirSync} from 'node:fs';
import load from '../concierge/load.cjs';
import {fixture,ids,asUser} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {dashboardHandlers} from '../../lib/server/dashboardHandlers.mjs';
const {planHandlers}=load('lib/server/planHandlers.mjs');
const env={...fixtureEnv,PLAN_REQUESTS_ENABLED:'true',DINING_REQUESTS_ENABLED:'true',DINING_SCHEMA_ENABLED:'true'};
const clock=()=>new Date('2027-01-10T15:00:00Z');
const plan={name:'Plan test',email:'Plan@Example.com',phone:'+13055550123',start:'2027-02-14',end:'2027-02-16',guests:4,time:'20:00',note:'Birthday weekend',
 items:[{kind:'yacht',slug:'lamborghini-yacht-tecnomar',title:'Forged yacht'},{kind:'car',slug:'lamborghini-urus-se'},{kind:'dining',slug:'komodo-miami'}]};
const request=(actor,body,key=randomUUID())=>new Request('https://example.com/api/plan',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key,...(actor?{Authorization:'Bearer '+actor}:{})},body:JSON.stringify(body)});
const read=(actor,path)=>new Request('https://example.com'+path,{headers:{Authorization:'Bearer '+actor}});
let db,fetcher,handlers,dashboard,key,receipt;
before(async()=>{db=await fixture();fetcher=provider(db);handlers=planHandlers(env,fetcher,undefined,clock);dashboard=dashboardHandlers(env,fetcher);});
after(async()=>{await db?.close();});

test('plan requests stay off until the migration and release are approved',async()=>{
 const off=planHandlers({...env,PLAN_REQUESTS_ENABLED:undefined},fetcher,undefined,clock);
 assert.equal((await off.submit(request(ids.customer,plan))).status,503);
});
test('one request stores every item as a pending booking with catalogue titles and one owner notification',async()=>{
 key=randomUUID();const response=await handlers.submit(request(ids.customer,plan,key));assert.equal(response.status,200);
 receipt=await response.json();assert.equal(receipt.success,true);assert.equal(receipt.bookingIds.length,3);assert.equal(receipt.replayed,false);
 const saved=(await db.query('select * from public.booking_plans where id=$1',[receipt.planId])).rows[0];
 assert.equal(saved.customer_user_id,ids.customer);assert.equal(saved.client_email,'plan@example.com');assert.equal(saved.guests,4);assert.equal(saved.item_count,3);assert.equal(saved.note,'Birthday weekend');
 const rows=(await db.query('select * from public.bookings where plan_id=$1 order by plan_position',[receipt.planId])).rows;
 assert.deepEqual(rows.map(r=>[r.plan_position,r.kind,r.item_slug,r.status]),[[1,'yacht','lamborghini-yacht-tecnomar','pending'],[2,'car','lamborghini-urus-se','pending'],[3,'dining','komodo-miami','pending']]);
 assert.deepEqual(rows.map(r=>r.id),receipt.bookingIds);
 assert.ok(!rows.some(r=>r.item_title.includes('Forged')));assert.equal(rows[2].item_title,'Komodo');
 assert.match(rows[0].dates,/^Plan 2027-02-14 → 2027-02-16 · 4 guests$/);
 assert.deepEqual(rows[2].hospitality,{version:1,date:'2027-02-14',time:'20:00',guests:4,option:'table',note:'Birthday weekend'});
 assert.equal(rows[0].hospitality,null);
 assert.equal((await db.query('select count(*)::int n from public.request_events where booking_id=any($1::uuid[])',[receipt.bookingIds])).rows[0].n,3);
 const events=(await db.query("select * from private.notification_events where event_type='plan_created'")).rows;
 assert.equal(events.length,1);assert.equal(events[0].booking_id,receipt.bookingIds[0]);assert.match(events[0].title,/^3 · .+ · .+ · Komodo$/);
 assert.equal((await db.query('select count(*)::int n from private.notification_deliveries where event_id=$1',[events[0].id])).rows[0].n,2);
});
test('a lost response is replayed with the same receipt; a changed plan under the same key is a conflict',async()=>{
 const replay=await (await handlers.submit(request(ids.customer,plan,key))).json();
 assert.equal(replay.planId,receipt.planId);assert.deepEqual(replay.bookingIds,receipt.bookingIds);assert.equal(replay.replayed,true);
 assert.equal((await handlers.submit(request(ids.customer,{...plan,guests:5},key))).status,409);
 assert.equal((await handlers.submit(request(ids.other,plan,key))).status,409);
 assert.equal((await db.query('select count(*)::int n from public.booking_plans')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from public.bookings where plan_id is not null')).rows[0].n,3);
});
test('invented, booked or malformed items and impossible dates are rejected before the database',async()=>{
 const yacht={kind:'yacht',slug:'lamborghini-yacht-tecnomar'},car={kind:'car',slug:'lamborghini-urus-se'};
 const bad=[
  {items:[{kind:'yacht',slug:'no-such-yacht'},car]},{items:[{kind:'experience',slug:'anything'},car]},{items:[{kind:'stay',slug:'miami-beach-villa'},car]},
  {items:[{kind:'dining',slug:'story-miami'},car]},{items:[yacht,yacht]},{items:Array.from({length:7},(_,i)=>({kind:'car',slug:'car-'+i}))},{items:[]},
  {items:[{kind:'yacht',slug:'../admin'}]},{end:'2027-02-13'},{end:'2027-03-30'},{start:'2027-01-01',end:'2027-01-02'},{start:'2027-02-30'},
  {guests:0},{guests:'4'},{email:'not-an-email'},{name:''},{time:'25:00'},{time:undefined},{note:'x'.repeat(1001)}];
 for(const change of bad)assert.equal((await handlers.submit(request(null,{...plan,...change}))).status,400,JSON.stringify(change).slice(0,80));
 const noDining=planHandlers({...env,DINING_REQUESTS_ENABLED:undefined},fetcher,undefined,clock);
 assert.equal((await noDining.submit(request(null,plan))).status,400);
 assert.equal((await noDining.submit(request(null,{...plan,items:[yacht,car],time:undefined}))).status,200);
 assert.equal((await handlers.submit(new Request('https://example.com/api/plan',{method:'POST',headers:{'Idempotency-Key':'not-a-key'},body:JSON.stringify(plan)}))).status,400);
});
test('guests without an account can send a plan',async()=>{
 const response=await handlers.submit(request(null,{...plan,items:[{kind:'car',slug:'lamborghini-urus-se'},{kind:'yacht',slug:'pershing-8x'}],time:undefined}));
 assert.equal(response.status,200);const anonymous=await response.json();
 assert.equal((await db.query('select customer_user_id from public.booking_plans where id=$1',[anonymous.planId])).rows[0].customer_user_id,null);
});
test('the customer sees one plan; other customers and unassigned partners see none of it',async()=>{
 for(const user of [ids.other,ids.partner]){
  assert.equal((await asUser(db,user,'select id from public.booking_plans where id=$1',[receipt.planId])).rows.length,0);
  assert.equal((await asUser(db,user,'select id from public.bookings where plan_id=$1',[receipt.planId])).rows.length,0);
 }
 assert.equal((await asUser(db,ids.customer,'select id from public.booking_plans where id=$1',[receipt.planId])).rows.length,1);
 assert.equal((await asUser(db,ids.admin,'select id from public.booking_plans where id=$1',[receipt.planId])).rows.length,1);
 const list=await (await dashboard.list(read(ids.customer,'/api/dashboard/requests'))).json();
 const items=list.requests.filter(r=>r.plan_id===receipt.planId);
 assert.deepEqual(items.map(r=>r.plan_position).sort(),[1,2,3]);assert.ok(items.every(r=>!('client_email' in r)));
 const detail=await (await dashboard.detail(read(ids.customer,'/api/dashboard/requests/'+receipt.bookingIds[1]),receipt.bookingIds[1])).json();
 assert.equal(detail.plan.id,receipt.planId);assert.equal(detail.plan.guests,4);assert.equal(detail.plan.note,'Birthday weekend');
 assert.deepEqual(detail.plan.items.map(i=>i.id),receipt.bookingIds);
});
test('an assigned partner sees only their item, without the rest of the plan; withdrawing one item leaves the others open',async()=>{
 const version=(await db.query('select version from public.bookings where id=$1',[receipt.bookingIds[0]])).rows[0].version;
 const assign=await dashboard.command(new Request('https://example.com/x',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),Authorization:'Bearer '+ids.admin},body:JSON.stringify({action:'assign',version,partnerId:ids.partner})}),receipt.bookingIds[0]);
 assert.equal(assign.status,200);
 const detail=await (await dashboard.detail(read(ids.partner,'/api/dashboard/requests/'+receipt.bookingIds[0]+'?scope=partner'),receipt.bookingIds[0])).json();
 assert.equal(detail.request.id,receipt.bookingIds[0]);assert.equal(detail.plan,null);
 const withdraw=await dashboard.command(new Request('https://example.com/x',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),Authorization:'Bearer '+ids.customer},body:JSON.stringify({action:'withdraw',version:0})}),receipt.bookingIds[2]);
 assert.equal(withdraw.status,200);
 assert.deepEqual((await db.query('select status from public.bookings where plan_id=$1 order by plan_position',[receipt.planId])).rows.map(r=>r.status),['pending','pending','closed']);
});
test('database constraints hold even for a trusted SQL writer',async()=>{
 await assert.rejects(db.query('update public.booking_plans set end_date=start_date-1 where id=$1',[receipt.planId]));
 await assert.rejects(db.query('update public.booking_plans set guests=0 where id=$1',[receipt.planId]));
 await assert.rejects(db.query('update public.bookings set plan_position=null where id=$1',[receipt.bookingIds[0]]),/bookings_plan_position_pair/);
 await assert.rejects(db.query('update public.bookings set plan_position=1 where id=$1',[receipt.bookingIds[1]]),/bookings_plan_item/);
});
test('plans without a restaurant work where the dining migration has not been applied',async()=>{
 const files=readdirSync(new URL('../../supabase/migrations/',import.meta.url)).filter(name=>!name.startsWith('20261031210000')&&!name.startsWith('20261101064000')).sort();
 const previous=await fixture({migrationFiles:files});
 try {
  const offDining={...fixtureEnv,PLAN_REQUESTS_ENABLED:'true'};
  const response=await planHandlers(offDining,provider(previous),undefined,clock).submit(request(ids.customer,{...plan,items:[{kind:'yacht',slug:'pershing-8x'},{kind:'car',slug:'lamborghini-urus-se'}],time:undefined}));
  assert.equal(response.status,200);
  const list=await dashboardHandlers(offDining,provider(previous)).list(read(ids.customer,'/api/dashboard/requests'));
  assert.equal(list.status,200);assert.equal((await list.json()).requests.length,2);
 } finally {await previous.close();}
});
