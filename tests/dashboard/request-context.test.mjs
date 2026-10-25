import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,ids,rpc} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {draftListing} from '../../lib/partnerListing.mjs';
import {GET as requestDetail,POST as requestCommand} from '../../app/api/dashboard/requests/[id]/route.js';
import {GET as listingDetail} from '../../app/api/dashboard/listings/[id]/route.js';

let db,bookingId,listingId,originalFetch;
const originalEnv=new Map(Object.keys(fixtureEnv).map(k=>[k,process.env[k]]));
const request=(path,user,body)=>new Request('https://example.com'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+user,'Content-Type':'application/json','Idempotency-Key':randomUUID()},...(body?{body:JSON.stringify(body)}:{})});
before(async()=>{
 db=await fixture();originalFetch=globalThis.fetch;globalThis.fetch=provider(db);Object.assign(process.env,fixtureEnv);
 const saved=await rpc(db,'dashboard_submit',{p_key:randomUUID(),p_fingerprint:'promised-route-context',p_rate:randomUUID(),p_user:ids.customer,p_input:{name:'Demo Customer',email:'demo@example.com',phone:'+13055550123',dates:'TEST',itemSlug:'demo-yacht',itemTitle:'Demo yacht',kind:'yacht'}});
 assert.equal(saved.success,true);bookingId=saved.bookingId;listingId=randomUUID();
 const draft=await rpc(db,'partner_listing_command',{p_actor:ids.partner,p_id:listingId,p_key:randomUUID(),p_action:'save',p_version:0,p_content:draftListing('car'),p_note:''});
 assert.equal(draft.success,true);
});
after(async()=>{
 globalThis.fetch=originalFetch;
 for(const [key,value]of originalEnv){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 await db?.close();
});
test('request detail resolves promised route params before enforcing customer ownership',async()=>{
 const response=await requestDetail(request('/api/dashboard/requests/'+bookingId,ids.customer),{params:Promise.resolve({id:bookingId})});
 assert.equal(response.status,200);assert.equal((await response.json()).request.id,bookingId);
 const denied=await requestDetail(request('/api/dashboard/requests/'+bookingId,ids.other),{params:Promise.resolve({id:bookingId})});
 assert.equal(denied.status,404);
});
test('request commands resolve promised route params and retain protected role checks',async()=>{
 const body={action:'close',version:0};
 const denied=await requestCommand(request('/api/dashboard/requests/'+bookingId,ids.customer,body),{params:Promise.resolve({id:bookingId})});
 assert.equal(denied.status,403);
 const response=await requestCommand(request('/api/dashboard/requests/'+bookingId,ids.admin,body),{params:Promise.resolve({id:bookingId})});
 assert.equal(response.status,200);assert.equal((await response.json()).bookingId,bookingId);
});
test('listing detail resolves promised route params without exposing another partner draft',async()=>{
 const response=await listingDetail(request('/api/dashboard/listings/'+listingId,ids.partner),{params:Promise.resolve({id:listingId})});
 assert.equal(response.status,200);assert.equal((await response.json()).listing.id,listingId);
 const denied=await listingDetail(request('/api/dashboard/listings/'+listingId,ids.customer),{params:Promise.resolve({id:listingId})});
 assert.equal(denied.status,403);
});
