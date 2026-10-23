import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fixture,ids} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {dashboardHandlers} from '../../lib/server/dashboardHandlers.mjs';
import {stagingWorker,STAGING_PROJECT,STAGING_URL} from '../../lib/server/dashboardStaging.mjs';

test('a staging guest can book with browser Basic auth without weakening application bearer auth',async()=>{
 const db=await fixture();
 try{
  const secret='staging-fixture-'.repeat(4),anon=fixtureEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const env={...fixtureEnv,APP_ENV:'dashboard-staging',STAGING_PROJECT_REF:STAGING_PROJECT,NEXT_PUBLIC_SUPABASE_URL:STAGING_URL,DASHBOARD_STAGING_ACCESS_SECRET:secret,DASHBOARD_OUTBOX_TOKEN:secret};
  const release={projectRef:STAGING_PROJECT,commit:'a'.repeat(40),clientKeyHash:createHash('sha256').update(anon).digest('hex')};
  const handlers=dashboardHandlers(env,provider(db)),worker=stagingWorker({fetch:r=>handlers.book(r)},release);
  const basic='Basic '+btoa('preview:'+secret),key=randomUUID();
  const payload={name:'Guest QA',email:'guest@example.com',phone:'+13055550123',dates:'2026-11-01',itemSlug:'qa-car',itemTitle:'QA car',kind:'car'};
  const send=(authorization,cookie,requestKey=key)=>worker.fetch(new Request('https://qa.example.com/api/book',{method:'POST',headers:{Authorization:authorization,...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json','Idempotency-Key':requestKey},body:JSON.stringify(payload)}),env,{});
  const first=await send(basic);assert.equal(first.status,200);
  const bookingId=(await first.json()).bookingId,cookie=first.headers.get('set-cookie').split(';')[0];
  assert.equal((await db.query('select customer_user_id from public.bookings where id=$1',[bookingId])).rows[0].customer_user_id,null);
  const replay=await send(basic,cookie);assert.equal(replay.status,200);assert.equal((await replay.json()).bookingId,bookingId);
  assert.equal((await db.query('select count(*)::int as n from public.bookings')).rows[0].n,1);
  const customer=await send('Bearer '+ids.customer,cookie,randomUUID());assert.equal(customer.status,200);
  assert.equal((await db.query('select customer_user_id from public.bookings where id=$1',[(await customer.json()).bookingId])).rows[0].customer_user_id,ids.customer);
  assert.equal((await send('Bearer invalid-token',cookie,randomUUID())).status,401);
  assert.equal((await send('Bearer '+ids.customer,null,randomUUID())).status,401);
  assert.equal((await send('Basic '+btoa('preview:wrong'),null,randomUUID())).status,401);
  assert.equal((await db.query('select count(*)::int as n from public.bookings')).rows[0].n,2);
 }finally{await db.close();}
});
