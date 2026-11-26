import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';
const {workersAiChat:meteredChat,WORKERS_AI_MODEL}=load('lib/ai/workersBrain.mjs');
// This authorizer is a test fixture only; production admission uses Postgres.
const workersAiChat=(env,input,options={})=>meteredChat(env,input,{authorize:async()=>true,...options});
const input={locale:'ru',messages:[{role:'user',content:'Нужна яхта на 8 гостей'}]};
const environment=run=>({APP_ENV:'dashboard-staging',CONCIERGE_WORKERS_AI_ENABLED:'true',CONCIERGE_AI:{run}});
const valid=JSON.stringify({version:1,action:'recommend',sections:['/yachts']});
test('unverified model prose cannot promise bookings or invent commercial facts',async()=>{
 for(const response of ['Your table for eight tomorrow is guaranteed.','I arranged your VIP entry for tonight.','You are on the guest list.','Zuma Miami is open tonight. Dinner is $180/person.'])assert.equal((await workersAiChat(environment(async()=>({response})),input)).ok,false);
});
test('native inference cannot start without a successful durable admission',async()=>{
 let calls=0;const env=environment(async()=>{calls++;return {response:'Fixture'};});
 assert.equal((await meteredChat(env,input)).kind,'usage_denied');
 assert.equal((await meteredChat(env,input,{authorize:async()=>false})).kind,'usage_denied');
 assert.equal((await meteredChat(env,input,{authorize:async()=>{throw Error('Offline database');}})).ok,false);
 assert.equal(calls,0);
});
test('cloud adapter is off without an enabled and authorized Worker environment',async()=>{
 let calls=0;const env=environment(async()=>{calls++;return {};});
 for(const value of [{...env,CONCIERGE_WORKERS_AI_ENABLED:'off'},{...env,APP_ENV:'production'},{...env,APP_ENV:'preview'},{...env,CONCIERGE_AI:null},{}])assert.equal((await workersAiChat(value,input)).ok,false);
 assert.equal(calls,0);
});
test('cloud adapter uses real catalogue context, bounded history and selected language',async()=>{
 let sent;
 const result=await workersAiChat(environment(async(model,body)=>{sent={model,body};return {choices:[{message:{content:valid},finish_reason:'stop'}]};}),input);
 assert.equal(result.ok,true);assert.match(result.reply,/яхт/);assert.doesNotMatch(result.reply,/Условия/);assert.equal(result.responsePolicy,'catalogue-v1');assert.equal(sent.model,WORKERS_AI_MODEL);
 assert.equal(sent.model,'@cf/deepseek-ai/deepseek-v4.1-flash-1017');
 assert.equal(sent.body.stream,false);assert.equal(sent.body.max_completion_tokens,900);assert.equal(sent.body.store,false);
 assert.equal(sent.body.reasoning_effort,'none');
 assert.deepEqual(sent.body.response_format,{type:'json_object'});
 assert.equal(sent.body.messages[0].role,'system');
 assert.match(sent.body.messages[0].content,/Russian/);assert.match(sent.body.messages[0].content,/\/yachts/);assert.match(sent.body.messages[0].content,/\/private-jets/);assert.doesNotMatch(sent.body.messages[0].content,/\/stores|\/coupons/);
 assert.deepEqual(sent.body.messages.at(-1),input.messages[0]);
 const long=Array.from({length:12},(_,i)=>({role:i%2?'user':'assistant',content:'語'.repeat(4000)}));
 await workersAiChat(environment(async(_,body)=>{assert.ok(new TextEncoder().encode(JSON.stringify(body.messages)).byteLength<=24000);assert.equal(body.messages.at(-1).content,long.at(-1).content);return {response:valid};}),{messages:long,locale:'ja'});
});
test('cloud adapter never forwards malformed, empty, truncated or reasoning-only replies',async()=>{
 for(const result of [null,{}, {response:42},{response:' '},{response:'<think>private reasoning'},{choices:[{message:{content:'Partial'},finish_reason:'length'}]},{response:'x'.repeat(4001)},{response:'x'.repeat(12001)}])assert.equal((await workersAiChat(environment(async()=>result),input)).ok,false);
 const projected=await workersAiChat(environment(async()=>({response:'<think>hidden</think>'+valid})),input);assert.equal(projected.ok,true);assert.doesNotMatch(projected.reply,/hidden|version|sections/);
});
const counting=()=>{const authorize=async()=>true;authorize.released=0;authorize.release=async()=>{authorize.released++;return true;};return authorize;};
test('a dispatched call keeps its reservation when the reply is invalid, extra, truncated or repeats a given detail',async()=>{
 const replies=[
  {response:'not-json'},
  {response:JSON.stringify({version:1,action:'recommend',sections:['/yachts'],price:'$500'})},
  {choices:[{message:{content:valid},finish_reason:'length'}]},
  // Asks for the group size the guest already gave ("8 гостей").
  {response:JSON.stringify({version:2,action:'ask',choice:'group'})},
 ];
 for(const reply of replies){
  const authorize=counting();
  const failed=await meteredChat(environment(async()=>reply),input,{authorize});
  assert.equal(failed.ok,false,JSON.stringify(reply));assert.equal(failed.kind,'invalid_reply');
  assert.equal(authorize.released,0,'a billed call must not be refunded: '+JSON.stringify(reply));
 }
 const authorize=counting();
 assert.equal((await meteredChat(environment(async()=>({response:valid})),input,{authorize})).ok,true);
 assert.equal(authorize.released,0);
});
test('a timed-out call is aborted upstream and keeps its reservation',async()=>{
 const authorize=counting();let upstream;
 const result=await meteredChat(environment((model,body,options)=>{upstream=options?.signal;return new Promise(()=>{});}),input,{authorize,timeoutMs:20});
 assert.deepEqual(result,{ok:false,kind:'timeout'});
 assert.ok(upstream instanceof AbortSignal,'the binding receives an AbortSignal');
 assert.equal(upstream.aborted,true);
 assert.equal(authorize.released,0);
});
test('a guest who leaves after dispatch aborts the call without a refund',async()=>{
 const authorize=counting(),guest=new AbortController();let upstream;
 const pending=meteredChat(environment((model,body,options)=>{upstream=options.signal;return new Promise(()=>{});}),input,{authorize,signal:guest.signal});
 await new Promise(resolve=>setTimeout(resolve,10));guest.abort();
 assert.equal((await pending).kind,'cancelled');assert.equal(upstream.aborted,true);assert.equal(authorize.released,0);
});
test('an upstream error after dispatch keeps the reservation',async()=>{
 const authorize=counting();
 assert.equal((await meteredChat(environment(async()=>{throw Error('capacity');}),input,{authorize})).kind,'unavailable');
 assert.equal(authorize.released,0);
});
test('a call that never leaves gives the reservation back',async()=>{
 // Pre-flight: the guest leaves while the reservation is being made.
 const guest=new AbortController(),authorize=async()=>{guest.abort();return true;};authorize.released=0;authorize.release=async()=>{authorize.released++;return true;};
 let calls=0;
 assert.equal((await meteredChat(environment(async()=>{calls++;return {response:valid};}),input,{authorize,signal:guest.signal})).kind,'cancelled');
 assert.equal(calls,0);assert.equal(authorize.released,1);
});
test('cloud adapter bounds waiting and isolates upstream errors',async()=>{
 assert.equal((await workersAiChat(environment(async()=>{throw Error('sensitive provider diagnostic');}),input)).kind,'unavailable');
 assert.deepEqual(await workersAiChat(environment(()=>new Promise(()=>{})),input,{timeoutMs:5}),{ok:false,kind:'timeout'});
});
test('cloud responses reject known false reservation-confirmation patterns',async()=>{
 for(const response of ['Your table is confirmed.','Столик забронирован.','Reserva confirmada.','您的预订已确认。','Your table is all set for 8pm.','I have secured your VIP table.','Your reservation is complete.'])assert.equal((await workersAiChat(environment(async()=>({response})),input)).ok,false);
});

test('even valid provider advice is replaced by the validated catalogue contract',async()=>{
 const response='Yacht availability for 8 guests tomorrow should be confirmed through the Yacht Rentals booking channel.';
 const advice=await workersAiChat(environment(async()=>({response})),input);assert.equal(advice.ok,false);
 for(const response of ['Your table is confirmed. Availability must be confirmed through the venue.','Availability of your booked table should be confirmed through the venue.'])assert.equal((await workersAiChat(environment(async()=>({response})),input)).ok,false);
});

test('provider-authored links and implementation paths never reach public text',async()=>{
 const result=await workersAiChat(environment(async()=>({response:'Посмотрите [Yachts](/yachts) или /private-jets.'})),input);
 assert.equal(result.ok,false);
 for(const response of ['Visit [Admin](/admin).','Go to /stores.','Visit https://unverified.example/booking.'])assert.equal((await workersAiChat(environment(async()=>({response})),input)).ok,false);
});

test('only exact section IDs are accepted, regardless of prose or path wrapper',async()=>{
 for(const response of ['Choose dining and/or nightlife in Miami.','Explore Miami/Orlando experiences.','Visit /yachts?date=2026-11-10&guests=8.','Visit /yachts#gallery.','「/yachts」'])assert.equal((await workersAiChat(environment(async()=>({response})),input)).ok,false);
 assert.equal((await workersAiChat(environment(async()=>({response:'Visit /yachts/%2e%2e%2fadmin.'})),input)).ok,false);
 assert.equal((await workersAiChat(environment(async()=>({response:'Open /discovery for more help.'})),input)).ok,false);
});
test('a slow usage reservation comes out of the model budget and is released',async()=>{
 let calls=0,released=0;
 const authorize=async()=>{await new Promise(r=>setTimeout(r,60));return true;};
 authorize.release=async()=>{released++;return true;};
 const result=await meteredChat(environment(async()=>{calls++;return {};}),input,{timeoutMs:40,authorize});
 assert.equal(result.kind,'timeout');
 assert.equal(calls,0);
 assert.equal(released,1);
});
