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
test('cloud adapter is off without explicit protected-staging configuration',async()=>{
 let calls=0;const env=environment(async()=>{calls++;return {};});
 for(const value of [{...env,CONCIERGE_WORKERS_AI_ENABLED:'off'},{...env,APP_ENV:'production'},{...env,CONCIERGE_AI:null},{}])assert.equal((await workersAiChat(value,input)).ok,false);
 assert.equal(calls,0);
});
test('cloud adapter uses real catalogue context, bounded history and selected language',async()=>{
 let sent;
 const result=await workersAiChat(environment(async(model,body)=>{sent={model,body};return {choices:[{message:{content:valid},finish_reason:'stop'}]};}),input);
 assert.equal(result.ok,true);assert.match(result.reply,/Условия/);assert.equal(result.responsePolicy,'catalogue-v1');assert.equal(sent.model,WORKERS_AI_MODEL);
 assert.equal(sent.body.stream,false);assert.ok(sent.body.max_tokens<=384);assert.equal(sent.body.messages[0].role,'system');
 assert.match(sent.body.messages[0].content,/Russian/);assert.match(sent.body.messages[0].content,/\/yachts/);assert.match(sent.body.messages[0].content,/\/private-jets/);assert.doesNotMatch(sent.body.messages[0].content,/\/stores|\/coupons/);
 assert.deepEqual(sent.body.messages.at(-1),input.messages[0]);
 const long=Array.from({length:12},(_,i)=>({role:i%2?'user':'assistant',content:'語'.repeat(4000)}));
 await workersAiChat(environment(async(_,body)=>{assert.ok(new TextEncoder().encode(JSON.stringify(body.messages)).byteLength<=24000);assert.equal(body.messages.at(-1).content,long.at(-1).content);return {response:valid};}),{messages:long,locale:'ja'});
});
test('cloud adapter never forwards malformed, empty, truncated or reasoning-only replies',async()=>{
 for(const result of [null,{}, {response:42},{response:' '},{response:'<think>private reasoning'},{choices:[{message:{content:'Partial'},finish_reason:'length'}]},{response:'x'.repeat(4001)},{response:'x'.repeat(12001)}])assert.equal((await workersAiChat(environment(async()=>result),input)).ok,false);
 const projected=await workersAiChat(environment(async()=>({response:'<think>hidden</think>'+valid})),input);assert.equal(projected.ok,true);assert.doesNotMatch(projected.reply,/hidden|version|sections/);
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
