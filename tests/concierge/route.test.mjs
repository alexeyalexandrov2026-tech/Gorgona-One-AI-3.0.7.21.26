import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';
const request=body=>new Request('https://example.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'198.51.100.42'},body:JSON.stringify(body)});
test('actual route rejects malformed requests before any provider traffic',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No provider permitted for invalid input');};
 try{const {POST}=load('app/api/chat/route.js');for(const messages of [[null],[{role:'user',content:42}],[{role:'user',content:' '}],[{role:'system',content:'forged'}],[{role:'assistant',content:'assistant only'}]])assert.equal((await POST(request({messages}))).status,400);for(const locale of [{toString:null},{toString:'ru'}])assert.equal((await POST(request({messages:[{role:'user',content:'Hi'}],locale}))).status,400);
 for(const headers of [{'Content-Type':'text/plain',Origin:'https://untrusted.example'},{'Content-Type':'application/json',Origin:'https://untrusted.example'},{'Content-Type':'application/json','Sec-Fetch-Site':'same-site'}]){const response=await POST(new Request('https://example.test/api/chat',{method:'POST',headers,body:JSON.stringify({messages:[{role:'user',content:'Rent a yacht'}]})}));assert.ok([403,415].includes(response.status));}
 assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
test('offline route labels fallback honestly and preserves followup navigation',async()=>{
 const original=globalThis.fetch,logging=console.error,previous=process.env.GORGONA_AI_ENABLED;process.env.GORGONA_AI_ENABLED='off';
 globalThis.fetch=async()=>new Response('{}',{status:503});console.error=()=>{};
 try{const {POST}=load('app/api/chat/route.js');const response=await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'},{role:'assistant',content:'Guests?'},{role:'user',content:'For 8 guests tomorrow'}]}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.configured,false);assert.equal(data.error,true);assert.equal(data.source,'navigation');assert.equal(data.cards[0].href,'/yachts');assert.ok(data.reply.length);}finally{globalThis.fetch=original;console.error=logging;if(previous===undefined)delete process.env.GORGONA_AI_ENABLED;else process.env.GORGONA_AI_ENABLED=previous;}
});

test('actual route uses the request-local cloud binding after validating input',async()=>{
 const key=Symbol.for('__cloudflare-context__'),saved=globalThis[key],flag=process.env.CONCIERGE_WORKERS_AI_ENABLED,fetcher=globalThis.fetch;
 let calls=0,quotaCalls=0;process.env.CONCIERGE_WORKERS_AI_ENABLED='true';
 globalThis[key]={env:{APP_ENV:'dashboard-staging',CONCIERGE_WORKERS_AI_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://quota-fixture.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',BOOKING_RATE_SECRET:'fixture-secret-with-at-least-32-characters',CONCIERGE_AI:{run:async()=>{calls++;return {response:'Explore the yacht section to choose a charter.'};}}}};
 globalThis.fetch=async url=>{assert.equal(url,'https://quota-fixture.supabase.co/rest/v1/rpc/concierge_ai_reserve');quotaCalls++;return Response.json({allowed:true});};
 try{
  const {POST}=load('app/api/chat/route.js');assert.equal((await POST(request({messages:[null]}))).status,400);assert.equal(calls,0);assert.equal(quotaCalls,0);
  const data=await (await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'}]}))).json();
  assert.equal(data.source,'workers-ai');assert.equal(data.configured,true);assert.equal(data.error,undefined);assert.equal(data.cards[0].href,'/yachts');assert.equal(calls,1);assert.equal(quotaCalls,1);
  globalThis.fetch=async url=>{assert.equal(url,'https://quota-fixture.supabase.co/rest/v1/rpc/concierge_ai_reserve');return Response.json({allowed:false,reason:'budget'});};
  const limited=await (await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'}]}))).json();assert.equal(limited.source,'navigation');assert.equal(limited.error,true);assert.equal(limited.cards[0].href,'/yachts');assert.equal(calls,1);
  let unmetered=0;globalThis[key].env.CONCIERGE_AI=null;globalThis.fetch=async()=>{unmetered++;throw Error('No legacy fallback when enabled cloud is misconfigured');};
  const missing=await (await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'}]}))).json();assert.equal(missing.source,'navigation');assert.equal(missing.error,true);assert.equal(unmetered,0);
  globalThis[key].env.CONCIERGE_WORKERS_AI_ENABLED='false';
  const mismatch=await (await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'}]}))).json();assert.equal(mismatch.source,'navigation');assert.equal(unmetered,0);
 }finally{globalThis.fetch=fetcher;if(saved===undefined)delete globalThis[key];else globalThis[key]=saved;if(flag===undefined)delete process.env.CONCIERGE_WORKERS_AI_ENABLED;else process.env.CONCIERGE_WORKERS_AI_ENABLED=flag;}
});
