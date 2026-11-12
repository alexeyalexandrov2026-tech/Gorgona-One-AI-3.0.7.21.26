import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rpc,asUser,ids} from '../dashboard/database.mjs';
const migration='20261102030000_concierge_usage.sql';
const database=()=>fixture({migrationFiles:['20261023145628_dashboard_workspaces.sql',migration]});
const claim=(overrides={})=>({p_key:crypto.randomUUID(),p_client:'a'.repeat(64),p_fingerprint:'b'.repeat(64),p_input_bytes:2000,p_output_tokens:384,...overrides});
test('AI reservations enforce aggregate byte/token/call ceilings and per-client rate atomically',async()=>{
 const db=await database();try{
  await db.exec('update private.concierge_ai_policy set daily_calls=4,client_calls=2');
  const first=claim();assert.equal((await rpc(db,'concierge_ai_reserve',first)).allowed,true);
  assert.equal((await rpc(db,'concierge_ai_reserve',first)).reason,'duplicate');
  assert.equal((await rpc(db,'concierge_ai_reserve',{...first,p_fingerprint:'c'.repeat(64)})).reason,'conflict');
  assert.equal((await rpc(db,'concierge_ai_reserve',claim())).allowed,true);
  assert.equal((await rpc(db,'concierge_ai_reserve',claim())).reason,'rate');
  const concurrent=await Promise.all(Array.from({length:8},(_,i)=>rpcSerial(db,claim({p_client:i.toString(16).padStart(64,'0')}))));
  assert.equal(concurrent.filter(x=>x.allowed).length,2);
  const day=(await db.query('select * from private.concierge_ai_days')).rows[0];assert.equal(day.calls,4);assert.equal(day.input_bytes,8000);assert.equal(day.output_tokens,1536);
  assert.equal((await db.query('select count(*)::int as n from private.concierge_ai_claims')).rows[0].n,4);
 }finally{await db.close();}
});
// PGlite is a single connection; live Postgres concurrency is tested separately.
let queue=Promise.resolve();function rpcSerial(db,args){const next=queue.then(()=>rpc(db,'concierge_ai_reserve',args));queue=next.catch(()=>{});return next;}
test('AI limits use database UTC days, expire owned rate state and never touch booking limits',async()=>{
 const db=await database();try{
  await db.exec("insert into private.request_rate_limits values('booking-fixture',now()-interval '30 days',7),('concierge-ai:old',now()-interval '2 days',1)");
  await db.exec("insert into private.concierge_ai_days values((statement_timestamp() at time zone 'UTC')::date-1,64,400000,24576)");
  await db.exec('update private.concierge_ai_policy set daily_bytes=3000,daily_output_tokens=500');
  assert.equal((await rpc(db,'concierge_ai_reserve',claim())).allowed,true);
  assert.equal((await rpc(db,'concierge_ai_reserve',claim({p_client:'c'.repeat(64)}))).reason,'budget');
  assert.equal((await db.query('select count(*)::int as n from private.concierge_ai_days')).rows[0].n,2);
  await db.exec("update private.concierge_ai_policy set daily_bytes=6000,daily_output_tokens=1000; update private.request_rate_limits set window_at=now()-interval '11 minutes' where key like 'concierge-ai:%'");
  assert.equal((await rpc(db,'concierge_ai_reserve',claim())).allowed,true);
  assert.equal((await db.query("select attempts from private.request_rate_limits where key='booking-fixture'")).rows[0].attempts,7);
  assert.equal((await db.query("select count(*)::int as n from private.request_rate_limits where key='concierge-ai:old'")).rows[0].n,0);
 }finally{await db.close();}
});
test('quota state and RPC are inaccessible to anonymous, customer, partner and admin browser identities',async()=>{
 const db=await database();try{
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   try{await assert.rejects(()=>db.query('select * from private.concierge_ai_policy'));await assert.rejects(()=>db.query('select public.concierge_ai_reserve($1,$2,$3,$4,$5)',Object.values(claim())));}finally{await db.exec('reset role');}
  }
  for(const id of Object.values(ids))await assert.rejects(()=>asUser(db,id,'select * from private.concierge_ai_claims'));
  for(const args of [claim({p_input_bytes:0}),claim({p_input_bytes:24001}),claim({p_output_tokens:385}),claim({p_client:'raw-ip'}),claim({p_fingerprint:null})])assert.equal((await rpc(db,'concierge_ai_reserve',args)).allowed,false);
  await db.exec('update private.concierge_ai_policy set enabled=false');assert.equal((await rpc(db,'concierge_ai_reserve',claim())).reason,'disabled');
  assert.equal((await db.query('select count(*)::int as n from private.concierge_ai_days')).rows[0].n,0);
 }finally{await db.close();}
});
