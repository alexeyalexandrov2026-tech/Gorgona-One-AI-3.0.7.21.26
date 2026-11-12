// Local SQL rehearsal only; never applies a migration to a hosted project.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import load from '../concierge/load.cjs';
import {fixture,ids,asUser} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {dashboardHandlers} from '../../lib/server/dashboardHandlers.mjs';
const {favoritesHandlers}=load('lib/server/favoritesHandlers.mjs');
const {planHandlers}=load('lib/server/planHandlers.mjs');
const env={...fixtureEnv,MY_MIAMI_ENABLED:'true',PLAN_REQUESTS_ENABLED:'true'};
const call=(actor,method='GET',body)=>new Request('https://example.com/api/favorites',{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+actor}:{})},...(body?{body:JSON.stringify(body)}:{})});
const claim=actor=>new Request('https://example.com/api/dashboard/requests/claim',{method:'POST',headers:{Authorization:'Bearer '+actor}});
let db,fetcher,favorites,dashboard;
before(async()=>{db=await fixture();fetcher=provider(db);favorites=favoritesHandlers(env,fetcher);dashboard=dashboardHandlers(env,fetcher);});
after(async()=>{await db?.close();});

test('My Miami stays off until the migration and release are approved',async()=>{
 const off={...env,MY_MIAMI_ENABLED:undefined};
 assert.equal((await favoritesHandlers(off,fetcher).list(call(ids.customer))).status,503);
 assert.equal((await dashboardHandlers(off,fetcher).claim(claim(ids.customer))).status,503);
});
test('favourites are saved by catalogue reference and read back with catalogue names',async()=>{
 const response=await favorites.change(call(ids.customer,'POST',{changes:[{kind:'yacht',slug:'pershing-8x',on:true},{kind:'car',slug:'lamborghini-urus-se',on:true},{kind:'dining',slug:'komodo-miami',on:true}]}));
 assert.equal(response.status,200);
 const {favorites:list}=await response.json();
 assert.deepEqual(list.map(item=>item.href).sort(),['/rentals/lamborghini-urus-se','/restaurants-nightlife/komodo-miami','/yachts/pershing-8x']);
 assert.ok(list.every(item=>item.title&&!item.title.includes('Forged')));
 assert.deepEqual((await db.query('select kind,slug from public.favorites where user_id=$1 order by kind',[ids.customer])).rows.map(r=>r.kind+':'+r.slug),['car:lamborghini-urus-se','dining:komodo-miami','yacht:pershing-8x']);
 const removed=await (await favorites.change(call(ids.customer,'POST',{changes:[{kind:'car',slug:'lamborghini-urus-se',on:false},{kind:'yacht',slug:'pershing-8x',on:true}]}))).json();
 assert.equal(removed.favorites.length,2);
});
test('invented items, wrong kinds and anonymous callers are refused',async()=>{
 for(const changes of [[{kind:'yacht',slug:'no-such-yacht',on:true}],[{kind:'experience',slug:'tour',on:true}],[{kind:'yacht',slug:'../x',on:true}],[{kind:'yacht',slug:'pershing-8x',on:'yes'}],[],Array.from({length:101},()=>({kind:'yacht',slug:'pershing-8x',on:true}))])
  assert.equal((await favorites.change(call(ids.customer,'POST',{changes}))).status,400,JSON.stringify(changes).slice(0,60));
 assert.equal((await favorites.list(call(null))).status,401);
});
test('favourites are private to their owner and drop out when an item leaves the catalogue',async()=>{
 assert.equal((await asUser(db,ids.other,'select * from public.favorites where user_id=$1',[ids.customer])).rows.length,0);
 assert.equal((await (await favorites.list(call(ids.other))).json()).favorites.length,0);
 const shrunk=favoritesHandlers(env,fetcher,async()=>new Map());
 assert.deepEqual((await (await shrunk.list(call(ids.customer))).json()).favorites,[]);
});
test('requests sent without signing in join the account with the same confirmed email only',async()=>{
 const plans=planHandlers(env,fetcher,undefined,()=>new Date('2027-01-10T15:00:00Z'));
 const body=email=>({name:'Guest',email,phone:'+13055550123',start:'2027-02-14',end:'2027-02-15',guests:2,items:[{kind:'yacht',slug:'pershing-8x'},{kind:'car',slug:'lamborghini-urus-se'}]});
 const send=async email=>(await (await plans.submit(new Request('https://example.com/api/plan',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(body(email))}))).json());
 const mine=await send('CUSTOMER@example.com'),theirs=await send('stranger@example.com');
 // An account whose email is not confirmed claims nothing.
 const unconfirmed=async(input,options)=>{const response=await fetcher(input,options);const url=new URL(input instanceof Request?input.url:input);if(url.pathname!=='/auth/v1/user')return response;const user=await response.json();delete user.email_confirmed_at;return Response.json(user);};
 assert.deepEqual(await (await dashboardHandlers(env,unconfirmed).claim(claim(ids.customer))).json(),{requests:0,plans:0});
 assert.deepEqual(await (await dashboard.claim(claim(ids.customer))).json(),{requests:2,plans:1});
 assert.deepEqual(await (await dashboard.claim(claim(ids.customer))).json(),{requests:0,plans:0});
 assert.equal((await db.query('select customer_user_id from public.booking_plans where id=$1',[mine.planId])).rows[0].customer_user_id,ids.customer);
 assert.equal((await db.query('select customer_user_id from public.booking_plans where id=$1',[theirs.planId])).rows[0].customer_user_id,null);
 const list=await (await dashboard.list(new Request('https://example.com/api/dashboard/requests',{headers:{Authorization:'Bearer '+ids.customer}}))).json();
 assert.deepEqual(list.requests.filter(r=>r.plan_id===mine.planId).map(r=>r.plan_position).sort(),[1,2]);
 assert.equal((await dashboard.claim(claim(ids.other))).status,200);
 assert.equal((await db.query('select count(*)::int n from public.bookings where plan_id=$1 and customer_user_id is null',[theirs.planId])).rows[0].n,2);
});
