import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,ids} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {dashboardHandlers} from '../../lib/server/dashboardHandlers.mjs';
import {dispatchNotifications} from '../../lib/server/notificationDelivery.mjs';

test('dining inquiry replay queues one owner event and simulated email delivery excludes private preferences',async()=>{
 const db=await fixture(),sql=provider(db),calls=[];
 const env={...fixtureEnv,DINING_SCHEMA_ENABLED:'true',DINING_REQUESTS_ENABLED:'true',RESEND_API_KEY:'simulated-only',ADMIN_EMAIL:'owner@example.com',NOTIFICATIONS_FROM_EMAIL:'Miami Elio <alerts@example.com>'};
 const body={kind:'dining',itemSlug:'komodo-miami',itemTitle:'Untrusted title',name:'Private guest',email:'private@example.com',phone:'+13055550123',dates:'2027-02-14',hospitality:{version:1,date:'2027-02-14',time:'19:30',guests:2,option:'table',note:'Private dietary preference'}};
 const key=randomUUID(),request=()=>new Request('https://example.com/api/book',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key,Authorization:'Bearer '+ids.customer},body:JSON.stringify(body)});
 try{
  const handlers=dashboardHandlers(env,sql),first=await handlers.book(request());assert.equal(first.status,200);const id=(await first.json()).bookingId;
  assert.equal((await (await handlers.book(request())).json()).bookingId,id);
  assert.equal((await db.query('select count(*)::int n from private.notification_events where booking_id=$1',[id])).rows[0].n,1);
  const fetcher=async(url,options)=>{
   if(new URL(url).origin===fixtureEnv.NEXT_PUBLIC_SUPABASE_URL)return sql(url,options);
   assert.equal(String(url),'https://api.resend.com/emails');calls.push(JSON.parse(options.body));return Response.json({id:'simulated-message'});
  };
  assert.equal((await dispatchNotifications(env,fetcher)).sent,1);assert.equal(calls.length,1);
  const message=JSON.stringify(calls[0]);assert.ok(message.includes('Komodo'));assert.ok(message.includes(id));
  for(const value of [body.name,body.email,body.phone,body.hospitality.note])assert.ok(!message.includes(value));
  assert.equal((await dispatchNotifications(env,fetcher)).claimed,0);
 }finally{await db.close();}
});
