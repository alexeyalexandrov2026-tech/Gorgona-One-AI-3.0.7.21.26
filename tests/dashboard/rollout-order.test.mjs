// Local SQL rehearsal only; never applies a migration to a hosted project.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fixture,ids,asUser} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {dashboardHandlers} from '../../lib/server/dashboardHandlers.mjs';
import {partnerListingHandlers} from '../../lib/server/partnerListingHandlers.mjs';
import {draftListing} from '../../lib/partnerListing.mjs';
const migration=file=>fs.readFileSync(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8');

test('all compatible expansions precede the supported server and lockdown preserves its receipts',async()=>{
 const db=await fixture({migrationFiles:['20261023145628_dashboard_workspaces.sql']});
 try{
  const legacy=(await asUser(db,ids.partner,"insert into public.partner_listings(partner_id,title,price,currency,images) values($1,'DEMO legacy listing',25,'USD',array['legacy.jpg']) returning id",[ids.partner])).rows[0];
  await db.exec(migration('20261023200000_partner_publication.sql'));
  const preserved=(await db.query('select title,price,currency,images,status,content from public.partner_listings where id=$1',[legacy.id])).rows[0];
  assert.deepEqual(preserved,{title:'DEMO legacy listing',price:'25',currency:'USD',images:['legacy.jpg'],status:'pending',content:null});
  const backend=provider(db),handlers=dashboardHandlers(fixtureEnv,backend),listings=partnerListingHandlers(fixtureEnv,backend);
  const key=randomUUID(),input={name:'Demo Customer',email:'demo@example.com',phone:'+13055550123',dates:'TEST rollout',itemSlug:'demo-car',itemTitle:'DEMO rollout request',kind:'car'};
  const book=()=>handlers.book(new Request('https://example.com/api/book',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key,Authorization:'Bearer '+ids.customer},body:JSON.stringify(input)}));
  const first=await book();assert.equal(first.status,200);const receipt=await first.json();assert.equal(receipt.success,true);
  const id=randomUUID(),draft=await listings.command(new Request('https://example.com/api/dashboard/listings',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),Authorization:'Bearer '+ids.partner},body:JSON.stringify({schemaVersion:1,id,action:'save',version:0,content:draftListing('car')})}));
  assert.equal(draft.status,200);assert.equal((await draft.json()).id,id);
  // The existing direct-write policy is intentionally still open in expansion.
  await db.exec('set role anon');
  try{await db.exec("insert into public.bookings(item_slug,status) values('demo-legacy-direct','pending')");}finally{await db.exec('reset role');}
  await db.exec(migration('20261023145804_dashboard_lockdown.sql'));
  await db.exec('set role anon');
  try{await assert.rejects(db.exec("insert into public.bookings(item_slug,status) values('must-be-denied','pending')"),/permission denied/);}finally{await db.exec('reset role');}
  const replay=await book();assert.equal(replay.status,200);assert.equal((await replay.json()).bookingId,receipt.bookingId);
  assert.equal((await db.query('select count(*)::int as n from public.bookings where request_key=$1',[key])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from public.request_events where booking_id=$1',[receipt.bookingId])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from private.notification_events where booking_id=$1',[receipt.bookingId])).rows[0].n,1);
  const detail=await listings.detail(new Request('https://example.com/api/dashboard/listings/'+id,{headers:{Authorization:'Bearer '+ids.partner}}),id);
  assert.equal(detail.status,200);assert.equal((await detail.json()).listing.review_state,'draft');
 }finally{await db.close();}
});
