import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHeadoutReadClient,HeadoutError} from '../../lib/server/headoutApi.mjs';
const config={environment:'sandbox',apiKey:'headout_fixture_key_0000000000000000',affiliateCode:'4VzJB0'};
const product={id:'123',name:'Fixture culinary experience',canonicalUrl:'https://www.sandbox-headout.com/food/fixture-e-123/?affiliate_code=4VzJB0',city:{code:'MIAMI',name:'Miami'},primaryCategory:{id:'1',name:'Food'},primarySubCategory:{id:'2',name:'Food Tours'},inventorySelectionType:'NORMAL',variants:[{id:456,name:'Fixture option'}],pricing:{commissionAmount:99}};
const envelope=(key,rows,nextOffset=null)=>({[key]:rows,nextOffset,nextUrl:'https://untrusted.example/never-follow'});
test('Headout read client pins TLS origin, authentication, version, method and redirects',async()=>{
 let called;
 const client=createHeadoutReadClient(config,async(url,options)=>{called={url:new URL(url),options};return Response.json(envelope('cities',[{code:'MIAMI',name:'Miami'}],20));});
 const result=await client.listCities();
 assert.equal(called.url.origin,'https://www.sandbox-headout.com');assert.equal(called.url.pathname,'/api/public/v2/cities/');assert.equal(called.options.method,'GET');assert.equal(called.options.redirect,'manual');assert.equal(called.options.headers['Headout-Auth'],config.apiKey);
 assert.deepEqual(result.items,[{code:'MIAMI',name:'Miami'}]);assert.equal(result.nextOffset,20);assert.equal(result.environment,'sandbox');assert.equal('nextUrl' in result,false);
 assert.equal('create' in client,false);assert.equal('cancel' in client,false);
});
test('Workers-compatible transport rejects redirects without forwarding the API credential',async()=>{
 for(const status of [301,302,303,307,308]){
  let calls=0,cancelled=false;
  const client=createHeadoutReadClient(config,async(_url,options)=>{
   calls++;if(options.redirect==='error')throw new TypeError('Invalid redirect mode in Workers');
   assert.equal(options.redirect,'manual');
   return new Response(new ReadableStream({cancel(){cancelled=true;}}),{status,headers:{Location:'https://foreign.example/never-follow'}});
  });
  await assert.rejects(()=>client.listCities(),error=>error instanceof HeadoutError&&error.code==='provider_unavailable');assert.equal(calls,1);assert.equal(cancelled,true);
 }
});
test('client configuration cannot be mutated to relabel sandbox data or switch credentials',async()=>{
 const mutable={...config};let observedKey;
 const client=createHeadoutReadClient(mutable,async(_url,options)=>{observedKey=options.headers['Headout-Auth'];return Response.json(envelope('cities',[]));});
 mutable.environment='production';mutable.apiKey='other_key_000000000000000000000000';
 assert.equal((await client.listCities()).environment,'sandbox');assert.equal(observedKey,config.apiKey);
});
test('Headout product projection preserves attribution and removes commission/internal content',async()=>{
 const client=createHeadoutReadClient(config,async()=>Response.json(envelope('products',[product])));
 const page=await client.listProducts('MIAMI');assert.equal(page.items[0].id,'123');assert.equal(page.items[0].mode,'REFERRAL');assert.equal(new URL(page.items[0].referralUrl).searchParams.get('affiliate_code'),'4VzJB0');assert.deepEqual(page.items[0].variants,[{id:'456',name:'Fixture option'}]);
 assert.ok(!JSON.stringify(page).includes('commission'));assert.ok(!JSON.stringify(page).includes(config.apiKey));
});
test('single-product reads validate identity and preserve the partner URL without invented date parameters',async()=>{
 let request;
 const client=createHeadoutReadClient(config,async(url)=>{request=new URL(url);return Response.json(product);});
 const result=await client.getProduct('123');assert.equal(request.pathname,'/api/public/v2/products/123/');assert.equal(result.product.id,'123');assert.equal(result.product.referralUrl,product.canonicalUrl);assert.equal(result.environment,'sandbox');
 const wrong=createHeadoutReadClient(config,async()=>Response.json({...product,id:'124'}));await assert.rejects(()=>wrong.getProduct('123'),HeadoutError);
});
test('Headout date availability remains date-level and never fabricates a slot or confirmation',async()=>{
 const client=createHeadoutReadClient(config,async()=>Response.json({productId:123,variantId:456,currencyCode:'USD',availabilities:[{date:'2027-02-14',availability:'UNLIMITED',remaining:1000,pricing:{currency:'USD',headoutSellingPrice:50,commissionAmount:8}}]}));
 const result=await client.listDateAvailability('123','456',{startDate:'2027-02-14',endDate:'2027-02-15'});assert.equal(result.granularity,'date');assert.equal(result.slots,null);assert.equal(result.confirmation,null);assert.deepEqual(result.items,[{date:'2027-02-14',availability:'UNLIMITED',price:{currency:'USD',amount:50}}]);assert.ok(!JSON.stringify(result).includes('commission'));
});
test('invalid configuration and query values fail before any provider call',async()=>{
 for(const changed of [{environment:'https://evil.example'},{apiKey:''},{apiKey:'key\r\nInjected: yes'},{affiliateCode:'unsafe&token'}])assert.throws(()=>createHeadoutReadClient({...config,...changed}),HeadoutError);
 let calls=0;const client=createHeadoutReadClient(config,async()=>{calls++;throw Error('Must not call');});
 for(const operation of [()=>client.listCities({offset:-1}),()=>client.listProducts('../../unsafe'),()=>client.listProducts('MIAMI',{languageCode:'invented'}),()=>client.listDateAvailability('123','456',{startDate:'2027-02-30',endDate:'2027-03-02'}),()=>client.listDateAvailability('123','456',{startDate:'2027-01-01',endDate:'2027-04-01'}),()=>client.listDateAvailability('123/escape','456',{startDate:'2027-01-01',endDate:'2027-01-02'})])await assert.rejects(operation,HeadoutError);
 assert.equal(calls,0);
});
test('unsafe or foreign-account product links are rejected instead of rewritten',async()=>{
 for(const canonicalUrl of ['http://www.sandbox-headout.com/','https://www.sandbox-headout.com.evil.example/?affiliate_code=4VzJB0','https://www.sandbox-headout.com/?affiliate_code=other','https://user:secret@www.sandbox-headout.com/?affiliate_code=4VzJB0']){
  const client=createHeadoutReadClient(config,async()=>Response.json(envelope('products',[{...product,canonicalUrl}])));await assert.rejects(()=>client.listProducts('MIAMI'),HeadoutError);
 }
});
test('malformed provider data and nonadvancing pagination fail closed',async()=>{
 for(const data of [{cities:null,nextOffset:null},{cities:[{code:'MIAMI',name:42}],nextOffset:null},{cities:[],nextOffset:0}]){
  const client=createHeadoutReadClient(config,async()=>Response.json(data));await assert.rejects(()=>client.listCities(),error=>error.code==='invalid_provider_response');
 }
});
test('availability validates returned identity, requested dates, status and price',async()=>{
 const valid={productId:123,variantId:456,currencyCode:'USD',availabilities:[{date:'2027-02-14',availability:'LIMITED',pricing:{currency:'USD',headoutSellingPrice:50}}]};
 for(const changed of [{productId:999},{currencyCode:'EUR'},{availabilities:[{...valid.availabilities[0],date:'2027-02-16'}]},{availabilities:[{...valid.availabilities[0],availability:'CONFIRMED'}]},{availabilities:[{...valid.availabilities[0],pricing:{currency:'USD',headoutSellingPrice:-1}}]}]){
  const client=createHeadoutReadClient(config,async()=>Response.json({...valid,...changed}));await assert.rejects(()=>client.listDateAvailability('123','456',{startDate:'2027-02-14',endDate:'2027-02-15'}),HeadoutError);
 }
});
test('provider errors are sanitized, rate limits preserved and writes never retried',async()=>{
 let calls=0;const client=createHeadoutReadClient(config,async()=>{calls++;return new Response(config.apiKey,{status:429,headers:{'Retry-After':'30'}});});
 await assert.rejects(()=>client.listCities(),error=>error.code==='provider_rate_limited'&&error.retryAfter===30&&!error.message.includes(config.apiKey));assert.equal(calls,1);
 const timeout=createHeadoutReadClient(config,async()=>{throw new DOMException(config.apiKey,'TimeoutError');});await assert.rejects(()=>timeout.listCities(),error=>error.code==='provider_timeout'&&!error.message.includes(config.apiKey));
});
test('oversized streamed and rejected-header bodies are cancelled before full buffering',async()=>{
 for(const headers of [{'Content-Type':'application/json'},{'Content-Type':'text/html'},{'Content-Type':'application/json','Content-Length':'3000000'}]){
  let offered=0,cancelled=false;
  const stream=new ReadableStream({pull(controller){offered++;controller.enqueue(new Uint8Array(262144));if(offered===20)controller.close();},cancel(){cancelled=true;}});
  const client=createHeadoutReadClient(config,async()=>new Response(stream,{headers}));
  await assert.rejects(()=>client.listCities(),error=>error.code==='invalid_provider_response');assert.equal(cancelled,true);assert.ok(offered<20);
 }
});
test('malformed nested provider records always use the sanitized provider error contract',async()=>{
 for(const record of [{...product,variants:[null]},{...product,id:9007199254740993},{...product,variants:[{id:9007199254740993,name:'Unsafe numeric ID'}]}]){
  const client=createHeadoutReadClient(config,async()=>Response.json(envelope('products',[record])));await assert.rejects(()=>client.listProducts('MIAMI'),error=>error instanceof HeadoutError&&error.code==='invalid_provider_response'&&error.status===502);
 }
 for(const item of [null,{date:'2027-02-30',availability:'CLOSED'}]){
  const client=createHeadoutReadClient(config,async()=>Response.json({productId:123,variantId:456,currencyCode:'USD',availabilities:[item]}));await assert.rejects(()=>client.listDateAvailability('123','456',{startDate:'2027-02-14',endDate:'2027-03-01'}),error=>error instanceof HeadoutError&&error.code==='invalid_provider_response'&&error.status===502);
 }
});
test('duplicate attribution values are rejected and large string IDs stay exact',async()=>{
 const bad=createHeadoutReadClient(config,async()=>Response.json(envelope('products',[{...product,canonicalUrl:product.canonicalUrl+'&affiliate_code=other'}])));await assert.rejects(()=>bad.listProducts('MIAMI'),HeadoutError);
 const valid=createHeadoutReadClient(config,async()=>Response.json(envelope('products',[{...product,id:'9007199254740993'}])));assert.equal((await valid.listProducts('MIAMI')).items[0].id,'9007199254740993');
});
test('provider COMBO records remain referral-only and are not treated as normal inventory',async()=>{
 const client=createHeadoutReadClient(config,async()=>Response.json(envelope('products',[{...product,inventorySelectionType:'COMBO',variants:[]}])));
 const record=(await client.listProducts('MIAMI')).items[0];assert.equal(record.inventorySelectionType,'COMBO');assert.equal(record.mode,'REFERRAL');assert.deepEqual(record.variants,[]);
});
