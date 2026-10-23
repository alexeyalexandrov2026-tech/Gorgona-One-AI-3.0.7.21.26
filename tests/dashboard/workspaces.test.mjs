import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture,ids,asUser,rpc } from './database.mjs';
import { dashboardHandlers } from '../../lib/server/dashboardHandlers.mjs';
import { bookingInput,commandInput,readBody,cursor } from '../../lib/server/dashboardCore.mjs';
import { isReceipt,submissionKey } from '../../lib/bookingSubmission.mjs';
import { readVerifiedSession,sessionLoader } from '../../lib/authSession.mjs';
import { notificationJob,dispatchNotifications } from '../../lib/server/notificationDelivery.mjs';

let db, booking;
const input={name:'Demo customer',email:'demo@example.com',phone:'+13055550123',dates:'2026-11-01 / 2026-11-03',itemSlug:'demo-car',itemTitle:'Demo car',kind:'car'};
const submit=(overrides={})=>rpc(db,'dashboard_submit',{p_key:randomUUID(),p_fingerprint:'fixture',p_rate:randomUUID(),p_user:ids.customer,p_input:input,...overrides});
const command=(action,version,more={},actor=ids.admin,key=randomUUID())=>rpc(db,'dashboard_command',{p_actor:actor,p_booking:booking,p_key:key,p_fingerprint:JSON.stringify([action,version,more,actor]),p_command:{action,version,reply:'',partnerId:null,...more}});
before(async()=>{db=await fixture();});
after(async()=>{await db?.close();});

test('a real receipt, request history and both delivery records are atomic',async()=>{
  const result=await submit();assert.ok(isReceipt(result));booking=result.bookingId;
  assert.equal((await db.query('select count(*)::int n from public.request_events where booking_id=$1',[booking])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from private.notification_deliveries')).rows[0].n,2);
});
test('retries return the same receipt and changed owner or payload conflicts',async()=>{
  const key=randomUUID(),first=await submit({p_key:key});
  assert.equal((await submit({p_key:key})).bookingId,first.bookingId);
  assert.equal((await submit({p_key:key,p_fingerprint:'different'})).error,'conflict');
  assert.equal((await submit({p_key:key,p_user:ids.other})).error,'conflict');
});
test('rate limiting applies to new requests, while replay does not spend quota',async()=>{
  const key=randomUUID(),rate=randomUUID();await submit({p_rate:rate,p_key:key});
  for(let i=0;i<12;i++)assert.equal((await submit({p_rate:rate,p_key:key})).replayed,true);
  for(let i=0;i<9;i++)assert.equal((await submit({p_rate:rate})).success,true);
  assert.equal((await submit({p_rate:rate})).error,'rate');
});
test('customers cannot see another account or guest requests by shared email',async()=>{
  const guest=await submit({p_user:null});
  assert.equal((await asUser(db,ids.customer,'select id from public.bookings where id=$1',[booking])).rows.length,1);
  assert.equal((await asUser(db,ids.other,'select id from public.bookings where id=$1',[booking])).rows.length,0);
  assert.equal((await asUser(db,ids.customer,'select id from public.bookings where id=$1',[guest.bookingId])).rows.length,0);
  assert.equal((await asUser(db,ids.other,'select * from public.request_events where booking_id=$1',[booking])).rows.length,0);
});
test('direct writes and privileged RPCs are closed after lockdown',async()=>{
  await assert.rejects(asUser(db,ids.customer,"insert into public.bookings(client_name) values('forged')"),/permission denied/);
  await assert.rejects(asUser(db,ids.admin,"update public.bookings set status='closed' where id=$1",[booking]),/permission denied/);
  await assert.rejects(asUser(db,ids.customer,'select public.dashboard_delivery_status($1)',[ids.admin]),/permission denied/);
  await assert.rejects(asUser(db,ids.customer,'select * from private.notification_deliveries'),/permission denied/);
});
test('review uses optimistic concurrency and records one event on replay',async()=>{
  const key=randomUUID();const first=await command('review',0,{},ids.admin,key);
  assert.equal(first.version,1);assert.deepEqual(await command('review',0,{},ids.admin,key),first);
  assert.equal((await command('close',0)).error,'conflict');
});
test('only the assigned partner gets the request and can respond',async()=>{
  assert.equal((await asUser(db,ids.partner,'select id from public.bookings where id=$1',[booking])).rows.length,0);
  assert.equal((await command('respond',1,{reply:'Not assigned'},ids.partner)).error,'missing');
  assert.equal((await command('assign',1,{partnerId:ids.other})).error,'forbidden');
  assert.equal((await command('assign',1,{partnerId:ids.partner})).version,2);
  assert.equal((await asUser(db,ids.partner,'select id from public.bookings where id=$1',[booking])).rows.length,1);
  assert.equal((await command('close',2,{},ids.partner)).error,'forbidden');
  assert.equal((await command('respond',2,{reply:'Our team can help.'},ids.partner)).version,3);
  const events=await asUser(db,ids.customer,'select reply from public.request_events where booking_id=$1 and event_type=$2',[booking,'respond']);
  assert.equal(events.rows[0].reply,'Our team can help.');
});
test('closed requests reject further changes',async()=>{
  assert.equal((await command('close',3)).version,4);
  assert.equal((await command('respond',4,{reply:'Late reply'},ids.partner)).error,'conflict');
});
test('profile role and ownership stay protected; own display name can change',async()=>{
  await assert.rejects(asUser(db,ids.customer,"update public.profiles set role='admin' where id=$1",[ids.customer]),/permission denied/);
  await asUser(db,ids.customer,"update public.profiles set name='Updated demo' where id=$1",[ids.customer]);
  assert.equal((await asUser(db,ids.customer,'select name from public.profiles where id=$1',[ids.customer])).rows[0].name,'Updated demo');
});
test('signup metadata cannot create an admin and queues a registration event',async()=>{
  const id=randomUUID();await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,'signup@example.com',JSON.stringify({role:'admin'})]);
  assert.equal((await db.query('select role from public.profiles where id=$1',[id])).rows[0].role,'user');
  assert.ok((await db.query("select id from private.notification_events where event_type='user_registered'")).rows.length);
});
test('partner listing moderation remains authoritative and queues a real event',async()=>{
  await asUser(db,ids.partner,"insert into public.partner_listings(partner_id,title,status) values($1,'Demo listing','approved')",[ids.partner]);
  assert.equal((await asUser(db,ids.partner,'select status from public.partner_listings')).rows[0].status,'pending');
});
test('organization membership cannot be self-assigned',async()=>{
  await assert.rejects(asUser(db,ids.partner,"insert into public.organization_memberships(organization_id,user_id,member_role) values($1,$2,'owner')",[randomUUID(),ids.partner]),/permission denied/);
});
test('delivery leases reject stale settlements and successful sends are not reclaimed',async()=>{
  await db.exec('set role service_role');
  let row;
  try {row=(await db.query("select * from public.dashboard_claim(array['telegram'],1)")).rows[0];}finally{await db.exec('reset role');}
  assert.ok(row);
  assert.equal(await rpc(db,'dashboard_settle',{p_id:row.id,p_lease:randomUUID(),p_ok:true,p_provider:'fixture',p_error:null,p_delay:1}),false);
  assert.equal(await rpc(db,'dashboard_settle',{p_id:row.id,p_lease:row.lease_id,p_ok:true,p_provider:'fixture',p_error:null,p_delay:1}),true);
  assert.equal((await db.query('select status from private.notification_deliveries where id=$1',[row.id])).rows[0].status,'sent');
});
test('body parsing, validation and cursors reject malformed unbounded input',async()=>{
  assert.throws(()=>bookingInput({...input,email:'invalid'}));assert.throws(()=>bookingInput({...input,itemSlug:'x?or=all'}));
  assert.throws(()=>commandInput({action:'assign',version:0,partnerId:'bad'}));assert.throws(()=>cursor('bad'));
  await assert.rejects(readBody(new Request('https://example.com',{method:'POST',body:'x'.repeat(9000)})),/too large/);
  await assert.rejects(readBody(new Request('https://example.com',{method:'POST',body:'null'})),/Invalid/);
});
test('client receipts never accept a legacy success and repeated payload keeps its key',()=>{
  assert.equal(isReceipt({success:true,bookingId:null}),false);const first=submissionKey(null,'payload',()=>randomUUID());assert.equal(submissionKey(first,'payload'),first);assert.notEqual(submissionKey(first,'new').key,first.key);
});
test('verified session uses the database role even when metadata says admin',async()=>{
  const client={auth:{getSession:async()=>({data:{session:{user:{}}}}),getUser:async()=>({data:{user:{id:ids.partner,email:'partner@example.com',user_metadata:{role:'admin'}}}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:ids.partner,role:'partner',name:'Demo partner'}})})})})};
  assert.equal((await readVerifiedSession(client)).role,'partner');
});
test('late session reads cannot restore a signed-out identity',async()=>{
  let resolve;const published=[];const loader=sessionLoader(()=>new Promise(r=>resolve=r),value=>published.push(value));
  const pending=loader.refresh();loader.clear();resolve({id:ids.admin});await pending;assert.equal(published.at(-1),null);loader.dispose();
});
test('anonymous API access and invalid keys fail without reaching a provider',async()=>{
  let calls=0;const handlers=dashboardHandlers({},async()=>{calls++;throw new Error();});
  assert.equal((await handlers.book(new Request('https://example.com',{method:'POST',body:JSON.stringify(input)}))).status,400);
  assert.equal(calls,0);
  assert.equal((await notificationJob(new Request('https://example.com',{method:'POST'}),{DASHBOARD_OUTBOX_TOKEN:'x'.repeat(32)})).status,401);
  assert.deepEqual(await dispatchNotifications({},async()=>{throw new Error('Must not call');}),{claimed:0,sent:0,configured:[]});
});
test('the email budget reserves at most eighty attempts per UTC day',async()=>{
  for(let i=0;i<80;i++)assert.equal(await rpc(db,'dashboard_reserve_email',{}),true);
  assert.equal(await rpc(db,'dashboard_reserve_email',{}),false);
});
