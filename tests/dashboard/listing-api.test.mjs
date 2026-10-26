import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,ids} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {partnerListingHandlers} from '../../lib/server/partnerListingHandlers.mjs';
import {draftListing} from '../../lib/partnerListing.mjs';
import {pngFixture} from './photo-fixture.mjs';
let db,handlers,storageCalls;
const bytes=pngFixture(),objects=new Map();
before(async()=>{
 db=await fixture();const backend=provider(db);storageCalls=[];
 const fetcher=async(input,options={})=>{
  const request=input instanceof Request?input:new Request(input,options),url=new URL(request.url);
  if(!url.pathname.startsWith('/storage/v1/'))return backend(request);
  storageCalls.push({path:url.pathname,method:request.method});
  assert.equal(request.headers.get('authorization'),'Bearer '+fixtureEnv.SUPABASE_SERVICE_ROLE_KEY);
  const path=url.pathname.replace(/^\/storage\/v1\/object\/(authenticated\/)?partner_listing_images\//,'');
  if(request.method==='POST'){objects.set(path,new Uint8Array(await request.arrayBuffer()));return Response.json({Key:'partner_listing_images/'+path});}
  if(request.method==='GET'&&objects.has(path))return new Response(objects.get(path),{headers:{'Content-Type':'image/png'}});
  if(request.method==='HEAD'&&objects.has(path))return new Response(null);
  if(request.method==='DELETE')return Response.json([]);
  return Response.json({error:'missing'},{status:404});
 };
 handlers=partnerListingHandlers(fixtureEnv,fetcher);
});
after(async()=>{await db?.close();});
function request(path,actor=ids.partner,body,key=randomUUID()){
 return new Request('https://example.com'+path,{method:body?'POST':'GET',headers:{...(actor?{Authorization:'Bearer '+actor}:{}),'Content-Type':'application/json','Idempotency-Key':key},...(body?{body:JSON.stringify(body)}:{})});
}
async function command(id,action,version,content,actor=ids.partner,note){
 return handlers.command(request('/api/dashboard/listings',actor,{schemaVersion:1,id,action,version,...(content?{content}:{}),...(note?{note}:{})}));
}
test('API denies unauthenticated/customers and cannot trust an actor supplied by the browser',async()=>{
 assert.equal((await handlers.list(request('/api/dashboard/listings',null))).status,401);
 assert.equal((await handlers.list(request('/api/dashboard/listings',ids.customer))).status,403);
 const body={schemaVersion:1,id:randomUUID(),action:'save',version:0,content:draftListing(),actor:ids.admin};
 assert.equal((await handlers.command(request('/api/dashboard/listings',ids.partner,body))).status,400);
 assert.equal((await handlers.command(request('/api/dashboard/listings',ids.customer,body))).status,403);
});
test('API moderates exactly one version; public media requires current approved membership',async()=>{
 const id=randomUUID(),c=draftListing('car');
 Object.assign(c,{title:'API listing',description:'Description',location:'Miami',priceCents:20000,contact:{name:'Partner',phone:'+13055550123',email:'partner@example.com'},specs:{brand:'BMW',model:'7',year:2025,bodyType:'Sedans'}});
 assert.equal((await command(id,'save',0,c)).status,200);
 const upload=new Request('https://example.com/api/dashboard/listings/media?listing='+id,{method:'POST',headers:{Authorization:'Bearer '+ids.partner,'Content-Type':'image/png'},body:bytes});
 const uploaded=await handlers.upload(upload);assert.equal(uploaded.status,201);
 const media=await uploaded.json();c.images=[media.path];
 assert.equal((await handlers.privatePhoto(request('/api/dashboard/listings/media?path='+media.path,ids.other))).status,403);
 assert.equal((await handlers.privatePhoto(request('/api/dashboard/listings/media?path='+media.path,ids.partner))).status,200);
 assert.equal((await command(id,'save',1,c)).status,200);
 assert.equal((await command(id,'submit',2)).status,200);
 const filename=media.path.split('/')[1],publicRequest=request('/api/listing-media/'+id+'/4/'+filename,null);
 const before=storageCalls.length;
 assert.equal((await handlers.publicPhoto(publicRequest,id,'4',filename)).status,404);
 assert.equal(storageCalls.length,before);
 assert.equal((await command(id,'approve',3,undefined,ids.partner)).status,403);
 const stored=objects.get(media.path);objects.delete(media.path);
 assert.equal((await command(id,'approve',3,undefined,ids.admin)).status,503);
 assert.equal((await db.query('select count(*)::int n from public.partner_publications where id=$1',[id])).rows[0].n,0);
 objects.set(media.path,stored);
 assert.equal((await command(id,'approve',3,undefined,ids.admin)).status,200);
 const photo=await handlers.publicPhoto(publicRequest,id,'4',filename);assert.equal(photo.status,200);assert.equal(photo.headers.get('x-content-type-options'),'nosniff');
 assert.equal((await handlers.publicPhoto(publicRequest,id,'3',filename)).status,404);
 assert.equal((await handlers.publicPhoto(publicRequest,id,'4','../secret')).status,404);
 assert.equal((await handlers.detail(request('/api/dashboard/listings/'+id,ids.other),id)).status,403);
 assert.equal((await command(id,'withdraw',4)).status,200);
 assert.equal((await handlers.publicPhoto(publicRequest,id,'4',filename)).status,404);
});
test('uploads reject active documents, spoofed raster types and wrong owner before storage writes',async()=>{
 const id=randomUUID();await command(id,'save',0,draftListing());
 const before=storageCalls.length;
 for(const [type,body]of [['image/svg+xml','<svg/>'],['image/jpeg',bytes]]){
  const r=await handlers.upload(new Request('https://example.com/api/dashboard/listings/media?listing='+id,{method:'POST',headers:{Authorization:'Bearer '+ids.partner,'Content-Type':type},body}));
  assert.equal(r.status,400);
 }
 assert.equal((await handlers.upload(new Request('https://example.com/api/dashboard/listings/media?listing='+id,{method:'POST',headers:{Authorization:'Bearer '+ids.customer,'Content-Type':'image/png'},body:bytes}))).status,403);
 assert.equal(storageCalls.length,before);
});
