import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,ids} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {headoutPreviewHandler,headoutSandboxPreviewEnabled,HEADOUT_SANDBOX_PRODUCTS} from '../../lib/server/headoutPreview.mjs';
const env={...fixtureEnv,APP_ENV:'dashboard-staging',STAGING_PROJECT_REF:'kaxslgjbrarapeyoifdh',NEXT_PUBLIC_SUPABASE_URL:'https://kaxslgjbrarapeyoifdh.supabase.co',HEADOUT_SANDBOX_PREVIEW_ENABLED:'true',HEADOUT_SANDBOX_API_KEY:'fixture_headout_secret_000000000000'};
const clock=()=>new Date('2026-10-31T16:00:00Z');
const request=(actor,query='',method='GET')=>new Request('https://staging.example/api/dashboard/dining/headout'+query,{method,headers:actor?{Authorization:'Bearer '+actor}:{}});
const product=id=>({id,name:'Fixture culinary '+id,canonicalUrl:'https://www.sandbox-headout.com/food/fixture-e-'+id+'/?affiliate_code=4VzJB0',city:{code:'MIAMI',name:'Miami'},inventorySelectionType:'NORMAL',variants:[{id:'115082',name:'Fixture option'}],pricing:{commissionAmount:20}});
let db,backend;
before(async()=>{db=await fixture();backend=provider(db);});after(async()=>db?.close());
function upstream(change){
 const calls=[];
 const fetcher=async(input,options={})=>{
  const url=new URL(input instanceof Request?input.url:input);
  if(url.hostname!=='www.sandbox-headout.com')return backend(input,options);
  calls.push({url,options});if(change){const response=await change(url,options);if(response)return response;}
  const id=url.pathname.split('/')[5];
  if(url.pathname.endsWith('/availabilities/'))return Response.json({productId:id,variantId:'115082',currencyCode:'USD',availabilities:[{date:url.searchParams.get('startDate'),availability:'LIMITED',pricing:{currency:'USD',headoutSellingPrice:50,commissionAmount:20}}]});
  return Response.json(product(id));
 };
 return {calls,handler:headoutPreviewHandler(env,fetcher,clock),fetcher};
}
test('sandbox preview cannot be enabled on production, another database or without credentials',async()=>{
 for(const change of [{APP_ENV:'production'},{STAGING_PROJECT_REF:'production'},{NEXT_PUBLIC_SUPABASE_URL:'https://ctszqhhvalyqxhbfqifx.supabase.co'},{HEADOUT_SANDBOX_PREVIEW_ENABLED:'false'},{HEADOUT_SANDBOX_API_KEY:''}]){
  const changed={...env,...change};assert.equal(headoutSandboxPreviewEnabled(changed),false);let calls=0;
  const response=await headoutPreviewHandler(changed,async()=>{calls++;throw Error('Must not fetch');},clock)(request(ids.admin));assert.equal(response.status,404);assert.equal(calls,0);
 }
});
test('real profile roles protect the preview before any provider request',async()=>{
 const {handler,calls}=upstream();
 for(const [actor,status] of [[null,401],[ids.customer,403],[ids.partner,403]])assert.equal((await handler(request(actor))).status,status);
 assert.equal(calls.length,0);assert.equal((await handler(request(ids.admin,'','POST'))).status,405);
});
test('admin catalogue exposes only allowlisted sandbox candidates with intact attribution',async()=>{
 const {handler,calls}=upstream();const response=await handler(request(ids.admin));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const result=await response.json();assert.deepEqual(result.products.map(p=>p.id),HEADOUT_SANDBOX_PRODUCTS);assert.equal(result.environment,'sandbox');assert.equal(result.bookingCreationEnabled,false);assert.equal(result.confirmation,null);assert.equal(calls.length,3);
 assert.ok(result.products.every(p=>new URL(p.referralUrl).searchParams.get('affiliate_code')==='4VzJB0'));
 assert.ok(!JSON.stringify(result).includes(env.HEADOUT_SANDBOX_API_KEY));assert.ok(!JSON.stringify(result).includes('commission'));
});
test('one unavailable candidate does not hide the available products',async()=>{
 const {handler}=upstream(url=>url.pathname.includes('/58903/')?new Response('Unavailable',{status:404}):null);
 const result=await (await handler(request(ids.admin))).json();assert.equal(result.status,'partial');assert.equal(result.products.length,2);assert.deepEqual(result.errors.map(e=>e.productId),['58903']);
});
test('invalid or injected query values are rejected before Headout calls',async()=>{
 const {handler,calls}=upstream();
 for(const query of ['?environment=production','?action=catalogue&productId=55702','?action=availability&productId=999&variantId=115082&startDate=2026-11-01','?action=availability&productId=55702&variantId=115082&startDate=2026-02-30','?action=availability&productId=55702&variantId=115082&startDate=2026-10-30','?action=availability&productId=55702&variantId=115082&startDate=2099-01-01','?action=catalogue&action=availability'])assert.equal((await handler(request(ids.admin,query))).status,400,query);
 assert.equal(calls.length,0);
});
test('variant membership is checked before availability and no database write occurs',async()=>{
 const {handler,calls}=upstream();
 const invalid=await handler(request(ids.admin,'?action=availability&productId=55702&variantId=999&startDate=2026-11-01'));assert.equal(invalid.status,400);assert.equal(calls.filter(c=>c.url.pathname.endsWith('/availabilities/')).length,0);
 const response=await handler(request(ids.admin,'?action=availability&productId=55702&variantId=115082&startDate=2026-11-01'));assert.equal(response.status,200);const result=await response.json();assert.equal(result.dates[0].date,'2026-11-01');assert.equal(result.endDate,'2026-11-07');assert.equal(result.slots,null);assert.equal(result.confirmation,null);assert.equal(result.product.referralUrl,product('55702').canonicalUrl);
 assert.equal((await db.query('select count(*)::int n from public.bookings')).rows[0].n,0);
});
test('total provider failure and rate limits remain errors, never successful fake inventory',async()=>{
 const failing=upstream(()=>new Response(env.HEADOUT_SANDBOX_API_KEY,{status:503}));const failure=await failing.handler(request(ids.admin));assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes(env.HEADOUT_SANDBOX_API_KEY));
 const limited=upstream(()=>new Response('rate',{status:429,headers:{'Retry-After':'30'}}));const response=await limited.handler(request(ids.admin));assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'30');
});
