// SQL-backed acceptance with a simulated provider. Never sends real email.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,rpc} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {configuredChannels,dispatchNotifications} from '../../lib/server/notificationDelivery.mjs';

async function setup(deliver){
 const db=await fixture(),sql=provider(db),calls=[];
 const env={...fixtureEnv,RESEND_API_KEY:'fixture-email-not-a-real-key',ADMIN_EMAIL:'owner@example.com',NOTIFICATIONS_FROM_EMAIL:'Miami Elio <alerts@example.com>'};
 const input={name:'Private Customer',email:'private-customer@example.com',phone:'+13055550123',dates:'2026-11-01',itemSlug:'demo-yacht',itemTitle:'DEMO yacht enquiry',kind:'yacht'};
 const receipt=await rpc(db,'dashboard_submit',{p_key:randomUUID(),p_fingerprint:'email-only-fixture',p_rate:randomUUID(),p_user:null,p_input:input});
 assert.equal(receipt.success,true);
 const fetcher=async(url,options)=>{
  const target=new URL(url);
  if(target.origin===fixtureEnv.NEXT_PUBLIC_SUPABASE_URL)return sql(url,options);
  assert.equal(target.href,'https://api.resend.com/emails','Unexpected provider destination');
  const call={headers:new Headers(options.headers),body:JSON.parse(options.body)};calls.push(call);
  return deliver(call,calls.length);
 };
 return {db,env,input,receipt,calls,fetcher};
}

test('email-only delivery reaches the owner, excludes customer contacts and leaves Telegram unclaimed',async()=>{
 const f=await setup(()=>Response.json({id:'fixture-message'}));
 try{
  assert.deepEqual(configuredChannels(f.env),['email']);
  const result=await dispatchNotifications(f.env,f.fetcher);assert.deepEqual(result,{claimed:1,sent:1,configured:['email']});
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].body.to,'owner@example.com');
  assert.equal(f.calls[0].body.from,f.env.NOTIFICATIONS_FROM_EMAIL);
  assert.match(f.calls[0].body.text,/https:\/\/gorgona-one\.com\/admin/);
  const payload=JSON.stringify(f.calls[0].body);for(const value of [f.input.name,f.input.email,f.input.phone])assert.ok(!payload.includes(value));
  assert.equal((await f.db.query("select status from private.notification_deliveries where channel='telegram'")).rows[0].status,'pending');
  assert.equal((await f.db.query("select status from private.notification_deliveries where channel='email'")).rows[0].status,'sent');
 }finally{await f.db.close();}
});

test('a lost provider response retries a stable payload/key and the simulated provider deduplicates it',async()=>{
 const accepted=new Map();
 const f=await setup((call,attempt)=>{
  const key=call.headers.get('idempotency-key');assert.ok(key?.startsWith('owner-event/'));
  if(!accepted.has(key))accepted.set(key,{id:'fixture-idempotent-message',payload:JSON.stringify(call.body)});
  assert.equal(JSON.stringify(call.body),accepted.get(key).payload);
  if(attempt===1)throw new Error('Simulated response loss after provider accepted the message');
  return Response.json({id:accepted.get(key).id});
 });
 try{
  assert.equal((await dispatchNotifications(f.env,f.fetcher)).sent,0);
  let row=(await f.db.query("select status,error_code from private.notification_deliveries where channel='email'")).rows[0];
  assert.deepEqual(row,{status:'pending',error_code:'provider_unavailable'});
  await f.db.exec("update private.notification_deliveries set next_at=now()-interval '1 second' where channel='email'");
  assert.equal((await dispatchNotifications(f.env,f.fetcher)).sent,1);assert.equal(accepted.size,1);assert.equal(f.calls.length,2);
  assert.equal(f.calls[0].headers.get('idempotency-key'),f.calls[1].headers.get('idempotency-key'));
  row=(await f.db.query("select status,provider_id from private.notification_deliveries where channel='email'")).rows[0];
  assert.deepEqual(row,{status:'sent',provider_id:'fixture-idempotent-message'});
  assert.equal((await dispatchNotifications(f.env,f.fetcher)).claimed,0);assert.equal(f.calls.length,2);
 }finally{await f.db.close();}
});

test('events older than 23 hours expire before leaving the database',async()=>{
 const f=await setup(()=>{throw new Error('Expired messages must not reach a provider');});
 try{
  await f.db.exec("update private.notification_events set created_at=now()-interval '23 hours 1 minute'");
  assert.deepEqual(await dispatchNotifications(f.env,f.fetcher),{claimed:0,sent:0,configured:['email']});assert.equal(f.calls.length,0);
  const rows=(await f.db.query("select status,error_code from private.notification_deliveries where channel='email'")).rows;
  assert.deepEqual(rows,[{status:'failed',error_code:'expired'}]);
 }finally{await f.db.close();}
});

test('events just younger than 23 hours remain eligible for email delivery',async()=>{
 const f=await setup(()=>Response.json({id:'fixture-before-expiry'}));
 try{
  await f.db.exec("update private.notification_events set created_at=now()-interval '22 hours 59 minutes'");
  assert.deepEqual(await dispatchNotifications(f.env,f.fetcher),{claimed:1,sent:1,configured:['email']});assert.equal(f.calls.length,1);
  const rows=(await f.db.query("select status,error_code from private.notification_deliveries where channel='email'")).rows;
  assert.deepEqual(rows,[{status:'sent',error_code:null}]);
 }finally{await f.db.close();}
});

test('an email credential rejection becomes a visible permanent failure without repeated sends',async()=>{
 const f=await setup(()=>Response.json({message:'Simulated credential rejection'},{status:403}));
 try{
  assert.equal((await dispatchNotifications(f.env,f.fetcher)).sent,0);
  const row=(await f.db.query("select status,error_code from private.notification_deliveries where channel='email'")).rows[0];
  assert.deepEqual(row,{status:'failed',error_code:'configuration'});
  assert.equal((await dispatchNotifications(f.env,f.fetcher)).claimed,0);assert.equal(f.calls.length,1);
 }finally{await f.db.close();}
});

test('an exhausted local email budget postpones delivery without contacting the provider',async()=>{
 const f=await setup(()=>{throw new Error('Budget-exhausted messages must not reach a provider');});
 try{
  for(let i=0;i<80;i++)assert.equal(await rpc(f.db,'dashboard_reserve_email',{}),true);
  assert.equal((await dispatchNotifications(f.env,f.fetcher)).sent,0);assert.equal(f.calls.length,0);
  const row=(await f.db.query("select status,error_code,attempts,next_at>now()+interval '59 minutes' as deferred from private.notification_deliveries where channel='email'")).rows[0];
  assert.deepEqual(row,{status:'pending',error_code:'quota',attempts:0,deferred:true});
 }finally{await f.db.close();}
});
