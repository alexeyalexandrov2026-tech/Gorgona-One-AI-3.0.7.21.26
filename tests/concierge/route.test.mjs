import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';
const request=(body,origin='https://example.test')=>new Request(origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'198.51.100.42'},body:JSON.stringify(body)});
test('router failure logs never copy provider echoes or exception details',async()=>{
 const envNames=['GORGONA_AI_ENABLED','CONCIERGE_WORKERS_AI_ENABLED'],old=Object.fromEntries(envNames.map(k=>[k,process.env[k]])),fetcher=globalThis.fetch,logger=console.error;
 Object.assign(process.env,{GORGONA_AI_ENABLED:'off',CONCIERGE_WORKERS_AI_ENABLED:'false'});
 const marker='fixture-private-phone-and-request-detail';
 try{for(const mode of ['http','exception']){
  let cancelled=false;const logs=[];console.error=(...args)=>logs.push(args.join(' '));globalThis.fetch=async()=>{if(mode==='exception')throw Error(marker);return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(marker));},cancel(){cancelled=true;}}),{status:503});};
  const {POST}=load('app/api/chat/route.js'),data=await(await POST(request({messages:[{role:'user',content:'Rent a yacht '+marker}],locale:'en'}))).json();
  assert.equal(data.error,true);assert.equal(data.source,'navigation');assert.doesNotMatch(data.reply,new RegExp(marker));assert.ok(logs.length);assert.ok(logs.every(x=>!x.includes(marker)));
  if(mode==='http')assert.equal(cancelled,true,'Discarded provider streams must be cancelled');
 }}finally{globalThis.fetch=fetcher;console.error=logger;for(const key of envNames)if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}
});
test('legacy engines preserve a full guest turn and share the factual response boundary',async()=>{
 const names=['GORGONA_AI_ENABLED','GORGONA_AI_URL','GORGONA_AI_PATH','GORGONA_AI_PROTOCOL','CONCIERGE_WORKERS_AI_ENABLED'],saved=Object.fromEntries(names.map(k=>[k,process.env[k]])),fetcher=globalThis.fetch;
 Object.assign(process.env,{GORGONA_AI_ENABLED:'true',GORGONA_AI_URL:'https://local-fixture.test',GORGONA_AI_PATH:'/chat',GORGONA_AI_PROTOCOL:'gorgona',CONCIERGE_WORKERS_AI_ENABLED:'false'});
 const content='Rent a yacht '+ 'x'.repeat(3987);assert.equal(content.length,4000);
 try{
  for(const raw of [JSON.stringify({version:1,action:'recommend',sections:['/yachts']}),'Your reservation is guaranteed.']){
   let calls=0;
   globalThis.fetch=async(url,init)=>{assert.equal(url,'https://local-fixture.test/chat');calls++;const body=JSON.parse(init.body);assert.ok(body.prompt.startsWith(content),'The last guest characters must not be cut off by protocol instructions');assert.match(body.prompt,/Allowed section catalogue/);return Response.json({response:raw,session_id:'fixture-session'});};
   const {POST}=load('app/api/chat/route.js'),data=await(await POST(request({locale:'en',messages:[{role:'user',content}]}))).json();
   assert.equal(calls,1,'Invalid local prose must not start a second model');assert.equal(data.cards[0].href,'/yachts');
   if(raw.startsWith('{')){assert.equal(data.source,'local');assert.equal(data.responsePolicy,'catalogue-v1');assert.equal(data.configured,true);}
   else{assert.equal(data.source,'navigation');assert.equal(data.error,true);assert.doesNotMatch(data.reply,/guaranteed/);}
  }
 }finally{globalThis.fetch=fetcher;for(const key of names)if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
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
 globalThis[key]={env:{APP_ENV:'dashboard-staging',CONCIERGE_WORKERS_AI_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://quota-fixture.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',BOOKING_RATE_SECRET:'fixture-secret-with-at-least-32-characters',CONCIERGE_AI:{run:async()=>{calls++;return {response:JSON.stringify({version:1,action:'recommend',sections:['/yachts']})};}}}};
 globalThis.fetch=async url=>{assert.equal(url,'https://quota-fixture.supabase.co/rest/v1/rpc/concierge_ai_reserve');quotaCalls++;return Response.json({allowed:true});};
 try{
  const {POST}=load('app/api/chat/route.js');assert.equal((await POST(request({messages:[null]}))).status,400);assert.equal(calls,0);assert.equal(quotaCalls,0);
  const data=await (await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'}]}))).json();
  assert.equal(data.source,'workers-ai');assert.equal(data.configured,true);assert.equal(data.error,undefined);assert.equal(data.cards[0].href,'/yachts');assert.equal(calls,1);assert.equal(quotaCalls,1);
  assert.equal(data.responsePolicy,'catalogue-v1');assert.doesNotMatch(data.reply,/version|sections|confirmed|guaranteed|\$180/);
  globalThis.fetch=async url=>{assert.equal(url,'https://quota-fixture.supabase.co/rest/v1/rpc/concierge_ai_reserve');return Response.json({allowed:false,reason:'budget'});};
  const limited=await (await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'}]}))).json();assert.equal(limited.source,'navigation');assert.equal(limited.error,true);assert.equal(limited.cards[0].href,'/yachts');assert.equal(calls,1);
  let unmetered=0;globalThis[key].env.CONCIERGE_AI=null;globalThis.fetch=async()=>{unmetered++;throw Error('No legacy fallback when enabled cloud is misconfigured');};
  const missing=await (await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'}]}))).json();assert.equal(missing.source,'navigation');assert.equal(missing.error,true);assert.equal(unmetered,0);
  globalThis[key].env.CONCIERGE_WORKERS_AI_ENABLED='false';
  const mismatch=await (await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'}]}))).json();assert.equal(mismatch.source,'navigation');assert.equal(unmetered,0);
 }finally{globalThis.fetch=fetcher;if(saved===undefined)delete globalThis[key];else globalThis[key]=saved;if(flag===undefined)delete process.env.CONCIERGE_WORKERS_AI_ENABLED;else process.env.CONCIERGE_WORKERS_AI_ENABLED=flag;}
});

test('public Workers AI requires the production hostname, database and durable admission', async () => {
  const contextKey = Symbol.for('__cloudflare-context__');
  const previousContext = globalThis[contextKey];
  const previousFlag = process.env.CONCIERGE_WORKERS_AI_ENABLED;
  const previousFetch = globalThis.fetch;
  const productionOrigin = 'https://gorgona-one.com';
  const productionDatabase = 'https://ctszqhhvalyqxhbfqifx.supabase.co';
  const body = { locale: 'ru', messages: [{ role: 'user', content: 'Хочу арендовать яхту в Майами' }] };
  const calls = [];
  const env = {
    APP_ENV: 'production',
    CONCIERGE_WORKERS_AI_ENABLED: 'true',
    NEXT_PUBLIC_SUPABASE_URL: productionDatabase,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture-service',
    BOOKING_RATE_SECRET: 'fixture-secret-with-at-least-32-characters',
    CONCIERGE_AI: {
      async run() {
        calls.push('model');
        return { choices: [{ finish_reason: 'stop', message: { content: '{"version":1,"action":"recommend","sections":["/yachts"]}' } }] };
      },
    },
  };
  let admitted = false;
  process.env.CONCIERGE_WORKERS_AI_ENABLED = 'true';
  globalThis[contextKey] = { env };
  globalThis.fetch = async url => {
    calls.push(url);
    return Response.json({ allowed: admitted });
  };
  try {
    const { POST } = load('app/api/chat/route.js');
    const chat = async origin => (await POST(request(body, origin))).json();
    assert.equal((await chat('https://preview.example.test')).source, 'navigation');
    env.NEXT_PUBLIC_SUPABASE_URL = 'https://staging-fixture.supabase.co';
    assert.equal((await chat(productionOrigin)).source, 'navigation');
    assert.deepEqual(calls, []);

    env.NEXT_PUBLIC_SUPABASE_URL = productionDatabase;
    const rpc = productionDatabase + '/rest/v1/rpc/concierge_ai_reserve';
    assert.equal((await chat(productionOrigin)).source, 'navigation');
    assert.deepEqual(calls, [rpc]);
    admitted = true;
    const result = await chat(productionOrigin);
    assert.equal(result.source, 'workers-ai');
    assert.equal(result.configured, true);
    assert.equal(result.responsePolicy, 'catalogue-v1');
    assert.equal(result.cards[0].href, '/yachts');
    assert.match(result.reply, /Условия/);
    assert.deepEqual(calls, [rpc, rpc, 'model']);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousContext === undefined) delete globalThis[contextKey];
    else globalThis[contextKey] = previousContext;
    if (previousFlag === undefined) delete process.env.CONCIERGE_WORKERS_AI_ENABLED;
    else process.env.CONCIERGE_WORKERS_AI_ENABLED = previousFlag;
  }
});

test('an Android itinerary keeps useful catalogue copy and a requestable plan when inference fails', async () => {
  const contextKey = Symbol.for('__cloudflare-context__');
  const originalContext = globalThis[contextKey];
  const originalFetch = globalThis.fetch;
  const settings = { CONCIERGE_WORKERS_AI_ENABLED: 'true', PLAN_REQUESTS_ENABLED: 'true' };
  const originalSettings = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  let calls = 0;
  globalThis[contextKey] = { env: {
    ...settings,
    APP_ENV: 'dashboard-staging',
    NEXT_PUBLIC_SUPABASE_URL: 'https://quota-fixture.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture-service',
    BOOKING_RATE_SECRET: 'fixture-secret-with-at-least-32-characters',
    CONCIERGE_AI: { async run() {
      calls++;
      return { choices: [{ finish_reason: 'stop', message: { content: '{"version":2,"action":"plan","days":[["unverified-stop"]]}' } }] };
    } },
  } };
  globalThis.fetch = async url => {
    if (String(url).endsWith('/rest/v1/rpc/concierge_ai_reserve')) return Response.json({allowed:true});
    throw new Error('Unexpected provider call');
  };
  const { POST } = load('app/api/chat/route.js');
  const chat = async (content, agent, locale = 'en') => {
    const response = await POST(new Request('https://example.test/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.42', 'User-Agent': agent },
      body: JSON.stringify({ locale, messages: [{ role: 'user', content }] }),
    }));
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    const prompt = 'Help me plan a weekend with a car, a yacht and dinner in Miami for four guests.';
    const result = await chat(prompt, 'MiamiElioApp/1.0');
    assert.equal(result.plan?.requestable, true);
    assert.ok(result.plan.sections.some(section => section.href === '/yachts'));
    assert.ok(result.plan.sections.some(section => section.href === '/rentals'));
    assert.equal(result.source, 'catalogue-plan');
    assert.equal(result.configured, false);
    assert.equal(result.error, true);
    assert.match(result.reply, /options from the Miami Elio catalogue/);
    assert.doesNotMatch(result.reply, /unavailable|unverified-stop/i);

    const translated = await chat('Хочу яхту и арендовать машину в Майами.', 'Mozilla/5.0 MiamiElioApp/1.0', 'ru');
    assert.equal(translated.source, 'catalogue-plan');
    assert.match(translated.reply, /варианты из каталога/);

    for (const [content, agent] of [[prompt, 'Mozilla/5.0'], ['Show me yachts in Miami', 'MiamiElioApp/1.0']]) {
      const fallback = await chat(content, agent);
      assert.equal(fallback.plan, undefined);
      assert.equal(fallback.source, 'navigation');
      assert.equal(fallback.error, true);
      assert.match(fallback.reply, /temporarily unavailable/);
    }
    assert.equal(calls, 4);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalContext === undefined) delete globalThis[contextKey];
    else globalThis[contextKey] = originalContext;
    for (const [key, value] of Object.entries(originalSettings)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
