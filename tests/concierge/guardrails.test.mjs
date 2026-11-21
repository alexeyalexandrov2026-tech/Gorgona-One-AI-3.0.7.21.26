// Production guardrails from the agent-architecture audit (PR 1): rules that
// are enforced in code, whatever the model returns.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const contextKey=Symbol.for('__cloudflare-context__');
const DATABASE='https://quota-fixture.supabase.co';

// Runs the real /api/chat route with a mocked Workers AI binding and a mocked
// usage database. `model` returns the raw provider result for each call.
async function chat(body,model){
 const savedContext=globalThis[contextKey],savedFlag=process.env.CONCIERGE_WORKERS_AI_ENABLED,savedFetch=globalThis.fetch,savedInfo=console.info;
 const calls={model:[],rpc:[],logs:[]};
 process.env.CONCIERGE_WORKERS_AI_ENABLED='true';
 globalThis[contextKey]={env:{APP_ENV:'dashboard-staging',CONCIERGE_WORKERS_AI_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:DATABASE,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',BOOKING_RATE_SECRET:'fixture-secret-with-at-least-32-characters',
  CONCIERGE_AI:{run:async(name,input,options)=>{calls.model.push({input,options});return model(input);}}}};
 globalThis.fetch=async url=>{const name=String(url).split('/rpc/')[1];calls.rpc.push(name);return Response.json(name==='concierge_ai_release'?{released:true}:{allowed:true});};
 console.info=(...args)=>calls.logs.push(args.join(' '));
 try{
  const {POST}=load('app/api/chat/route.js');
  const response=await POST(new Request('https://example.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'198.51.100.42'},body:JSON.stringify(body)}));
  return {status:response.status,data:await response.json(),calls};
 }finally{
  globalThis.fetch=savedFetch;console.info=savedInfo;
  if(savedContext===undefined)delete globalThis[contextKey];else globalThis[contextKey]=savedContext;
  if(savedFlag===undefined)delete process.env.CONCIERGE_WORKERS_AI_ENABLED;else process.env.CONCIERGE_WORKERS_AI_ENABLED=savedFlag;
 }
}
const json=value=>({response:JSON.stringify(value)});
const consult={version:2,action:'consult',options:['bay-cruise','longer-charter'],question:'time-on-water'};

test('a booking and card-charge request gets the disclaimer even when the model returns advice',async()=>{
 const {status,data}=await chat({locale:'en',messages:[{role:'user',content:'Book a yacht for 6 people tomorrow and charge my card now'}]},()=>json(consult));
 assert.equal(status,200);
 assert.equal(data.source,'workers-ai');
 assert.match(data.reply,/^Check current terms and availability through the selected channel; this chat does not create or confirm reservations\./);
 assert.doesNotMatch(data.reply,/swim stop|time would you like/i,'advice copy must not replace the handoff');
 assert.equal(data.handoff,true);
 assert.deepEqual(data.listings,[]);
 assert.equal(data.cards[0]?.href,'/yachts');
});

test('a model handoff is honoured and keyword advice cannot overwrite it',async()=>{
 const {data}=await chat({locale:'en',messages:[{role:'user',content:'I want a yacht this weekend'}]},()=>json({version:1,action:'handoff',sections:['/yachts']}));
 assert.match(data.reply,/does not create or confirm reservations/);
 assert.doesNotMatch(data.reply,/swim stop|longer charter/i);
 assert.equal(data.handoff,true);
 assert.deepEqual(data.listings,[]);
});

test('Russian and Spanish booking requests get the disclaimer in their own language',async()=>{
 const ru=await chat({locale:'ru',messages:[{role:'user',content:'Забронируй яхту на завтра и спиши с карты'}]},()=>json(consult));
 assert.match(ru.data.reply,/этот чат не создаёт и не подтверждает бронирования/);
 assert.equal(ru.data.handoff,true);assert.deepEqual(ru.data.listings,[]);
 const es=await chat({locale:'es',messages:[{role:'user',content:'Reserva un yate para mañana y cobra mi tarjeta'}]},()=>json(consult));
 assert.match(es.data.reply,/este chat no crea ni confirma reservas/);
 assert.equal(es.data.handoff,true);assert.deepEqual(es.data.listings,[]);
});

test('the disclaimer also holds on the degraded path when no model answers',async()=>{
 const {data}=await chat({locale:'en',messages:[{role:'user',content:'Please book the Lamborghini and charge my card'}]},()=>({response:'not json'}));
 assert.equal(data.error,true);
 assert.match(data.reply,/does not create or confirm reservations/);
 assert.equal(data.handoff,true);assert.deepEqual(data.listings,[]);
});

test('the booking matcher covers card charges without reading maps, lists or paintings as payments',()=>{
 const {explicitBooking}=load('lib/ai/catalogueAnswer.mjs');
 for(const text of ['Book a yacht for 6 people tomorrow and charge my card now','Забронируй яхту и спиши с карты','спишіть з картки','Reserva un yate y cobra mi tarjeta','reservar y cobrar mi tarjeta','I booked it, now pay','Reserve a table for 4'])assert.equal(explicitBooking(text),true,text);
 for(const text of ['I want an Urus this weekend','ты спишь?','покажи список яхт','музей с картинами','Write a short poem about 300 stars over Miami','I want to rent a yacht in Miami for 8 guests this Saturday','show me the menu card'])assert.equal(explicitBooking(text),false,text);
});
