import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {stagingWorker,STAGING_PROJECT,STAGING_URL} from '../../lib/server/dashboardStaging.mjs';
const secret='s'.repeat(64),anon='public-qa-key',commit='a'.repeat(40);
const env={APP_ENV:'dashboard-staging',STAGING_PROJECT_REF:STAGING_PROJECT,NEXT_PUBLIC_SUPABASE_URL:STAGING_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:'server-only-test-key',BOOKING_RATE_SECRET:secret,DASHBOARD_OUTBOX_TOKEN:secret,DASHBOARD_STAGING_ACCESS_SECRET:secret};
const release={projectRef:STAGING_PROJECT,commit,clientKeyHash:createHash('sha256').update(anon).digest('hex')};
const auth={authorization:'Basic '+btoa('preview:'+secret)};
const request=(route='/',headers={})=>new Request('https://qa.example.com'+route,{headers});
test('staging denies HTML, static assets and API before the application is reached',async()=>{
 let calls=0;const worker=stagingWorker({fetch(){calls++;return new Response('private');}},release);
 for(const route of ['/','/_next/static/chunks/app.js','/api/book']){
  const r=await worker.fetch(request(route),env,{});assert.equal(r.status,401);assert.match(r.headers.get('www-authenticate'),/^Basic/);assert.equal(r.headers.get('cache-control'),'no-store');
 }
 assert.equal(calls,0);
});
test('staging cookie permits a later Supabase bearer header without weakening its gate',async()=>{
 const worker=stagingWorker({fetch:r=>new Response(r.headers.get('authorization')||'page')},release,()=>1000000);
 const first=await worker.fetch(request('/',auth),env,{}),cookie=first.headers.get('set-cookie');assert.equal(first.status,200);assert.match(cookie,/HttpOnly; Secure; SameSite=Lax/);
 const r=await worker.fetch(request('/api/dashboard/requests',{cookie:cookie.split(';')[0],authorization:'Bearer account-token'}),env,{});
 assert.equal(r.status,200);assert.equal(await r.text(),'Bearer account-token');assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
});
test('expired, future, forged and rotated-secret cookies cannot reuse staging access',async()=>{
 let now=1000000;const worker=stagingWorker({fetch:()=>new Response('ok')},release,()=>now),r=await worker.fetch(request('/',auth),env,{}),cookie=r.headers.get('set-cookie').split(';')[0];
 now+=4*60*60*1000+1000;assert.equal((await worker.fetch(request('/',{cookie}),env,{})).status,401);
 now=999000;assert.equal((await worker.fetch(request('/',{cookie}),env,{})).status,401);
 now=1000000;assert.equal((await worker.fetch(request('/',{cookie:cookie.replace(/.$/,'X')}),env,{})).status,401);
 assert.equal((await worker.fetch(request('/',{cookie}),{...env,DASHBOARD_STAGING_ACCESS_SECRET:'r'.repeat(64)},{})).status,401);
});
test('wrong database, stale client key, enabled delivery or missing secret fails closed',async()=>{
 let calls=0;const worker=stagingWorker({fetch(){calls++;return new Response('unsafe');}},release);
 for(const changed of [{NEXT_PUBLIC_SUPABASE_URL:'https://production.supabase.co'},{STAGING_PROJECT_REF:'production'},{NEXT_PUBLIC_SUPABASE_ANON_KEY:'other-key'},{TELEGRAM_BOT_TOKEN:'configured'},{RESEND_API_KEY:'configured'},{SUPABASE_SERVICE_ROLE_KEY:''},{BOOKING_RATE_SECRET:'short'},{DASHBOARD_STAGING_ACCESS_SECRET:''},{APP_ENV:'production'}])assert.equal((await worker.fetch(request('/',auth),{...env,...changed},{})).status,503);
 assert.equal(calls,0);
});
test('readiness exposes only stage identity and notification dispatch stays disabled',async()=>{
 const worker=stagingWorker({fetch(){throw Error('Must not run');}},release);
 const r=await worker.fetch(request('/__dashboard_staging/health',auth),env,{});assert.deepEqual(await r.json(),{environment:'dashboard-staging',projectRef:STAGING_PROJECT,commit});
 assert.equal((await worker.fetch(request('/api/internal/notifications',auth),env,{})).status,503);
 assert.match(await (await worker.fetch(request('/robots.txt',auth),env,{})).text(),/Disallow: \//);
});
test('authorized assets use the asset binding and dynamic requests fall through',async()=>{
 const worker=stagingWorker({fetch:()=>new Response('dynamic')},release);
 const assets={fetch:r=>new Response(r.url.endsWith('.js')?'static':'missing',{status:r.url.endsWith('.js')?200:404})};
 assert.equal(await (await worker.fetch(request('/_next/static/test.js',auth),{...env,ASSETS:assets},{})).text(),'static');
 assert.equal(await (await worker.fetch(request('/profile',auth),{...env,ASSETS:assets},{})).text(),'dynamic');
});

test('verified staging Basic credentials stay at the gate while POST data reaches the app',async()=>{
 const body=JSON.stringify({message:'guest request'}),key='request-key';let received;
 const worker=stagingWorker({async fetch(r){received={authorization:r.headers.get('authorization'),method:r.method,url:r.url,key:r.headers.get('idempotency-key'),type:r.headers.get('content-type'),body:await r.text()};return new Response('guest');}},release);
 const response=await worker.fetch(new Request('https://qa.example.com/api/book?source=form',{method:'POST',headers:{...auth,'Content-Type':'application/json','Idempotency-Key':key},body}),env,{});
 assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure/);
 assert.deepEqual(received,{authorization:null,method:'POST',url:'https://qa.example.com/api/book?source=form',key,type:'application/json',body});
});

test('cached Basic credentials are removed from both asset reads and application fallthrough',async()=>{
 const seen=[],worker=stagingWorker({fetch:r=>{seen.push(['app',r.headers.get('authorization')]);return new Response('dynamic');}},release);
 const initial=await worker.fetch(request('/__dashboard_staging/health',auth),env,{}),cookie=initial.headers.get('set-cookie').split(';')[0];
 const assets={fetch:r=>{seen.push(['assets',r.headers.get('authorization')]);return new Response('missing',{status:404});}};
 const result=await worker.fetch(request('/profile',{...auth,cookie}),{...env,ASSETS:assets},{});
 assert.equal(result.status,200);assert.deepEqual(seen,[['assets',null],['app',null]]);
});
