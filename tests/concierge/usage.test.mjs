import {test} from 'node:test';import assert from 'node:assert/strict';import load from './load.cjs';
const {createUsageGate}=load('lib/server/conciergeUsage.mjs');
const env={NEXT_PUBLIC_SUPABASE_URL:'https://quota-fixture.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',BOOKING_RATE_SECRET:'fixture-secret-with-at-least-32-characters'};
const input={locale:'en',messages:[{role:'user',content:'Rent a yacht'}]};
const key='55555555-5555-4555-8555-555555555555';
const request=(headers={})=>new Request('https://example.test/api/chat',{headers:{'cf-connecting-ip':'198.51.100.42','idempotency-key':key,...headers}});
test('usage gate sends only authenticated bounded metadata, never transcript or raw IP',async()=>{
 let captured;const gate=createUsageGate(env,request(),input,async(url,options)=>{captured={url,options};return Response.json({allowed:true});});
 assert.equal(await gate({inputBytes:2000,outputTokens:384}),true);assert.equal(captured.url,env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/rpc/concierge_ai_reserve');
 const body=JSON.parse(captured.options.body);assert.equal(body.p_key,key);assert.equal(body.p_input_bytes,2000);assert.equal(body.p_output_tokens,384);assert.match(body.p_client,/^[a-f0-9]{64}$/);assert.match(body.p_fingerprint,/^[a-f0-9]{64}$/);assert.doesNotMatch(captured.options.body,/198\.51\.100|Rent a yacht/);assert.equal(captured.options.headers.Authorization,'Bearer fixture-service');
});
test('usage gate fails closed on missing ingress identity, credentials, invalid keys or database failure',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('provider diagnostic');};
 for(const [settings,req] of [[{...env,BOOKING_RATE_SECRET:''},request()],[env,new Request('https://example.test')],[env,request({'idempotency-key':'forged'})]])assert.equal(await createUsageGate(settings,req,input,fetcher)({inputBytes:2000,outputTokens:384}),false);
 assert.equal(calls,0);assert.equal(await createUsageGate(env,request(),input,fetcher)({inputBytes:2000,outputTokens:384}),false);assert.equal(calls,1);
 for(const reply of [{allowed:false,reason:'budget'},{allowed:'true'},{}])assert.equal(await createUsageGate(env,request(),input,async()=>Response.json(reply))({inputBytes:2000,outputTokens:384}),false);
});
test('a stable client and request body produce stable separate HMAC identities',async()=>{
 const bodies=[];const fetcher=async(_,options)=>{bodies.push(JSON.parse(options.body));return Response.json({allowed:true});};
 for(const value of [input,input,{...input,locale:'ru'}])await createUsageGate(env,request(),value,fetcher)({inputBytes:1000,outputTokens:384});
 assert.equal(bodies[0].p_client,bodies[1].p_client);assert.equal(bodies[0].p_fingerprint,bodies[1].p_fingerprint);assert.equal(bodies[1].p_client,bodies[2].p_client);assert.notEqual(bodies[1].p_fingerprint,bodies[2].p_fingerprint);assert.notEqual(bodies[0].p_client,bodies[0].p_fingerprint);
});
