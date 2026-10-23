// Opt-in remote acceptance. This intentionally writes fictitious test records
// only to the dedicated staging project. Credentials/results stay outside Git.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
const file=process.env.DASHBOARD_STAGING_CONFIG;if(!file)throw Error('Set DASHBOARD_STAGING_CONFIG to a private config file');
const config=JSON.parse(fs.readFileSync(file)),folder=path.dirname(file),phase=process.argv[2]||'expand';
assert.equal(config.project_ref,'kaxslgjbrarapeyoifdh');assert.equal(new URL(config.url).hostname,config.project_ref+'.supabase.co');
const results=[],stateFile=path.join(folder,'state.json'),state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{};
let sessions={};const savedSessions=path.join(folder,'sessions.json');
if(fs.existsSync(savedSessions))sessions=JSON.parse(fs.readFileSync(savedSessions));
for(const name of ['customer','other','partner','admin']){
 if(sessions[name]?.expires_at>Date.now()/1000+300)continue;
 const password=createHash('sha256').update(config.token+':password:'+name).digest('hex')+'Ab1!';
 const response=await fetch(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email:'dashboard-qa-'+name+'@example.com',password}),signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,'Auth login '+name);sessions[name]=await response.json();
}
fs.writeFileSync(savedSessions,JSON.stringify(sessions),{mode:0o600});
const users=Object.fromEntries(Object.entries(sessions).map(([name,s])=>[name,s.user.id]));
async function api(route,name,body,key=randomUUID()){
 const response=await fetch(config.url+'/functions/v1/dashboard-acceptance',{method:body?'POST':'GET',headers:{apikey:config.anonKey,'x-dashboard-qa':config.token,'x-dashboard-path':route,'Content-Type':'application/json','Idempotency-Key':key,...(name?{Authorization:'Bearer '+sessions[name].access_token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});
 return {response,data:await response.json()};
}
async function rest(route,name,{method='GET',body,headers={}}={}){
 const response=await fetch(config.url+'/rest/v1/'+route,{method,headers:{apikey:config.anonKey,Authorization:'Bearer '+(name?sessions[name].access_token:config.anonKey),'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const data=await response.json().catch(()=>null);return {response,data};
}
async function check(name,fn){try{await fn();results.push({name,status:'passed'});console.log('PASS '+name);}catch(error){results.push({name,status:'failed',error:error.message});console.log('FAIL '+name+': '+error.message);process.exitCode=1;}}
const payload={name:'Dashboard QA customer',email:'dashboard-qa-customer@example.com',phone:'+13055550123',dates:'2026-11-01 / 2026-11-03',itemSlug:'dashboard-qa-car',itemTitle:'Dashboard QA car',kind:'car',customer_user_id:users.admin};
if(phase==='expand'){
 await check('real Auth metadata does not grant admin scope',async()=>{
  assert.equal(sessions.customer.user.user_metadata.role,'admin');assert.equal((await api('/api/dashboard/requests?scope=admin','customer')).response.status,403);
  assert.equal((await api('/api/dashboard/requests')).response.status,401);
 });
 await check('transactional customer booking and cross-account RLS',async()=>{
  state.key=randomUUID();const first=await api('/api/book','customer',payload,state.key);assert.equal(first.response.status,200);state.booking=first.data.bookingId;
  assert.equal((await api('/api/book','customer',payload,state.key)).data.bookingId,state.booking);
  assert.equal((await api('/api/dashboard/requests/'+state.booking,'other')).response.status,404);
  assert.equal((await api('/api/dashboard/requests/'+state.booking+'?scope=partner','partner')).response.status,404);
  const rows=await rest('bookings?select=id,customer_user_id','customer');assert.equal(rows.response.status,200);assert.equal(rows.data.find(r=>r.id===state.booking).customer_user_id,users.customer);
  assert.equal((await rest('bookings?select=id','other')).data.length,0);
 });
 await check('admin assigns; partner replies; stale versions conflict',async()=>{
  assert.ok(state.booking);
  assert.equal((await api('/api/dashboard/requests/'+state.booking,'admin',{action:'review',version:0})).response.status,200);
  assert.equal((await api('/api/dashboard/requests/'+state.booking,'admin',{action:'assign',version:1,partnerId:users.partner})).response.status,200);
  assert.equal((await api('/api/dashboard/requests/'+state.booking,'partner',{action:'close',version:2})).response.status,403);
  assert.equal((await api('/api/dashboard/requests/'+state.booking,'partner',{action:'respond',version:2,reply:'Dashboard QA availability confirmed.'})).response.status,200);
  assert.equal((await api('/api/dashboard/requests/'+state.booking,'admin',{action:'close',version:0})).response.status,409);
  const detail=await api('/api/dashboard/requests/'+state.booking,'customer');assert.equal(detail.data.request.response,'Dashboard QA availability confirmed.');assert.equal(detail.data.events.length,4);
 });
 await check('guest retry is one request and email never links ownership',async()=>{
  state.guestKey=randomUUID();const first=await api('/api/book',null,payload,state.guestKey);assert.equal(first.response.status,200);state.guest=first.data.bookingId;
  assert.equal((await api('/api/book',null,payload,state.guestKey)).data.bookingId,state.guest);
  assert.equal((await api('/api/book',null,{...payload,name:'Changed'},state.guestKey)).response.status,409);
  assert.equal((await api('/api/dashboard/requests/'+state.guest,'customer')).response.status,404);
 });
 await check('partner listing moderation and actual admin profile relationship',async()=>{
  const listing=await rest('partner_listings','partner',{method:'POST',body:{partner_id:users.partner,title:'Dashboard QA listing',description:'Fictitious acceptance listing',price:1,currency:'USD',status:'approved'},headers:{Prefer:'return=representation'}});
  assert.equal(listing.response.status,201);assert.equal(listing.data[0].status,'pending');state.listing=listing.data[0].id;
  const embed=await rest('partner_listings?select=*,profiles:partner_id(name,email,company_name)','admin');
  state.profileEmbed={status:embed.response.status,code:embed.data?.code||null};
  // Record the real relationship result; the admin UI uses independent RLS reads.
  assert.ok([200,400].includes(embed.response.status));
 });
}else if(phase==='lockdown'){
 await check('anonymous insert and direct booking writes are denied',async()=>{
  assert.ok(state.booking);assert.equal((await rest('bookings',null,{method:'POST',body:{client_name:'Forbidden QA write',status:'pending'}})).response.status,401);
  assert.equal((await rest('bookings?id=eq.'+state.booking,'admin',{method:'PATCH',body:{status:'closed'}})).response.status,403);
 });
 await check('protected profile fields and privileged RPC cannot be written by customer',async()=>{
  assert.equal((await rest('profiles?id=eq.'+users.customer,'customer',{method:'PATCH',body:{role:'admin'}})).response.status,403);
  assert.equal((await rest('rpc/dashboard_delivery_status','customer',{method:'POST',body:{p_actor:users.admin}})).response.status,403);
 });
 await check('new API and assigned-partner RLS still work after lockdown',async()=>{
  assert.equal((await api('/api/book','customer',payload,state.key)).data.bookingId,state.booking);
  assert.equal((await api('/api/dashboard/requests/'+state.booking+'?scope=partner','partner')).response.status,200);
  assert.equal((await api('/api/dashboard/notifications','admin')).response.status,200);
  assert.equal((await rest('bookings?select=id','other')).data.length,0);
 });
 await check('admin moderation resolves partners without an unsupported foreign-key embed',async()=>{
  const listings=await rest('partner_listings?select=id,partner_id&status=eq.pending','admin');assert.equal(listings.response.status,200);
  const ids=[...new Set(listings.data.map(l=>l.partner_id))];assert.ok(ids.length);
  const profiles=await rest('profiles?select=id,name,email,company_name&id=in.('+ids.join(',')+')','admin');assert.equal(profiles.response.status,200);
  assert.equal(profiles.data.find(p=>p.id===users.partner).company_name,'Dashboard QA Partner Company');
 });
 await check('real Storage accepts partner images and rejects customer or foreign folders',async()=>{
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64'),name=randomUUID()+'.png';
  const upload=(actor,owner)=>fetch(config.url+'/storage/v1/object/listings_media/'+owner+'/'+name,{method:'POST',headers:{apikey:config.anonKey,Authorization:'Bearer '+sessions[actor].access_token,'Content-Type':'image/png'},body:image});
  assert.equal((await upload('partner',users.partner)).status,200);
  assert.ok([400,403].includes((await upload('customer',users.customer)).status));
  assert.ok([400,403].includes((await upload('partner',users.other)).status));
  assert.equal((await fetch(config.url+'/storage/v1/object/public/listings_media/'+users.partner+'/'+name)).status,200);
 });
}else throw Error('Unknown acceptance phase');
fs.writeFileSync(stateFile,JSON.stringify(state,null,2),{mode:0o600});
fs.writeFileSync(path.join(folder,'acceptance-'+phase+'.json'),JSON.stringify({phase,project:config.project_ref,results,profileEmbed:state.profileEmbed},null,2));
console.log(JSON.stringify({phase,passed:results.filter(r=>r.status==='passed').length,total:results.length,profileEmbed:state.profileEmbed}));
