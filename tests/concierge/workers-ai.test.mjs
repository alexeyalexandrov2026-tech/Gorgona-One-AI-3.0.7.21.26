import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';
const {workersAiChat,WORKERS_AI_MODEL}=load('lib/ai/workersBrain.mjs');
const input={locale:'ru',messages:[{role:'user',content:'Нужна яхта на 8 гостей'}]};
const environment=run=>({APP_ENV:'dashboard-staging',CONCIERGE_WORKERS_AI_ENABLED:'true',CONCIERGE_AI:{run}});
test('cloud adapter is off without explicit protected-staging configuration',async()=>{
 let calls=0;const env=environment(async()=>{calls++;return {};});
 for(const value of [{...env,CONCIERGE_WORKERS_AI_ENABLED:'off'},{...env,APP_ENV:'production'},{...env,CONCIERGE_AI:null},{}])assert.equal((await workersAiChat(value,input)).ok,false);
 assert.equal(calls,0);
});
test('cloud adapter uses real catalogue context, bounded history and selected language',async()=>{
 let sent;
 const result=await workersAiChat(environment(async(model,body)=>{sent={model,body};return {choices:[{message:{content:'Посмотрите раздел яхт — там можно выбрать подходящий вариант.'},finish_reason:'stop'}]};}),input);
 assert.equal(result.ok,true);assert.match(result.reply,/Посмотрите/);assert.equal(sent.model,WORKERS_AI_MODEL);
 assert.equal(sent.body.stream,false);assert.ok(sent.body.max_tokens<=384);assert.equal(sent.body.messages[0].role,'system');
 assert.match(sent.body.messages[0].content,/Russian/);assert.match(sent.body.messages[0].content,/\/yachts/);assert.match(sent.body.messages[0].content,/\/private-jets/);assert.doesNotMatch(sent.body.messages[0].content,/\/stores|\/coupons/);
 assert.deepEqual(sent.body.messages.at(-1),input.messages[0]);
 const long=Array.from({length:12},(_,i)=>({role:i%2?'user':'assistant',content:'語'.repeat(4000)}));
 await workersAiChat(environment(async(_,body)=>{assert.ok(new TextEncoder().encode(JSON.stringify(body.messages)).byteLength<=24000);assert.equal(body.messages.at(-1).content,long.at(-1).content);return {response:'案内をご覧ください。'};}),{messages:long,locale:'ja'});
});
test('cloud adapter never forwards malformed, empty, truncated or reasoning-only replies',async()=>{
 for(const result of [null,{}, {response:42},{response:' '},{response:'<think>private reasoning'},{choices:[{message:{content:'Partial'},finish_reason:'length'}]},{response:'x'.repeat(4001)},{response:'x'.repeat(12001)}])assert.equal((await workersAiChat(environment(async()=>result),input)).ok,false);
 assert.equal((await workersAiChat(environment(async()=>({response:'<think>hidden</think>Useful answer'})),input)).reply,'Useful answer');
});
test('cloud adapter bounds waiting and isolates upstream errors',async()=>{
 assert.equal((await workersAiChat(environment(async()=>{throw Error('sensitive provider diagnostic');}),input)).kind,'unavailable');
 assert.deepEqual(await workersAiChat(environment(()=>new Promise(()=>{})),input,{timeoutMs:5}),{ok:false,kind:'timeout'});
});
test('cloud responses reject known false reservation-confirmation patterns',async()=>{
 for(const response of ['Your table is confirmed.','Столик забронирован.','Reserva confirmada.','您的预订已确认。','Your table is all set for 8pm.','I have secured your VIP table.','Your reservation is complete.'])assert.equal((await workersAiChat(environment(async()=>({response})),input)).ok,false);
});
