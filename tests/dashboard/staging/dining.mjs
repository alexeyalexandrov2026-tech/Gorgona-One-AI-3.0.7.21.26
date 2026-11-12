// Opt-in acceptance against the existing private staging Worker and real Auth/RLS.
// Never points to production, sends notifications, resets identities or deletes audit data.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const base='https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev';
const project='kaxslgjbrarapeyoifdh';
assert.equal(process.env.DINING_STAGING_ACCEPTANCE,'1','Explicit staging acceptance opt-in required');
const expectedCommit=process.env.DINING_STAGING_EXPECTED_COMMIT;
assert.match(expectedCommit||'',/^[a-f0-9]{40}$/,'Pin the exact staging application commit');
const privateDirectory=fs.realpathSync(process.env.DINING_STAGING_PRIVATE_DIR||'');
assert.ok(!privateDirectory.startsWith(fs.realpathSync(root)+path.sep),'Keep credentials outside Git');
const read=name=>JSON.parse(fs.readFileSync(path.join(privateDirectory,name),'utf8'));
const credentials=read('qa-credentials.json'),secrets=read('worker-secrets.json');
const publicFile=process.env.DINING_STAGING_PUBLIC_CONFIG;
assert.ok(publicFile&&path.isAbsolute(publicFile),'Explicit staging public config required');
const config=JSON.parse(fs.readFileSync(publicFile,'utf8'));
assert.equal(config.project_ref,project);
assert.equal(config.url,'https://'+project+'.supabase.co');
assert.equal(config.anonKey,secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const output=process.env.DINING_STAGING_RESULTS;
assert.ok(output&&path.isAbsolute(output),'Explicit nonsensitive results path required');
const results=[],sessions={},tag='DEMO Dining '+randomUUID();
let cookie,bookingId;
async function check(name,operation){await operation();results.push({name,status:'PASS'});console.log('PASS '+name);}
const network=async(url,options={})=>fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(30000)});
async function api(route,actor,body,key=randomUUID()){
 const response=await network(base+route,{method:body?'POST':'GET',headers:{Cookie:cookie,'Content-Type':'application/json','Idempotency-Key':key,...(actor?{Authorization:'Bearer '+sessions[actor].access_token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,data:await response.json().catch(()=>null)};
}
async function rest(route,actor,options={}){
 const response=await network(config.url+'/rest/v1/'+route,{...options,headers:{apikey:config.anonKey,Authorization:'Bearer '+sessions[actor].access_token,'Content-Type':'application/json',...options.headers}});
 return {status:response.status,data:await response.json().catch(()=>null)};
}
const date=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
const payload={kind:'dining',itemSlug:'komodo-miami',itemTitle:'Forged title',dates:'Forged dates',name:'DEMO Dining customer',email:'dashboard-qa-customer@example.com',phone:'+13055550123',hospitality:{version:1,date,time:'19:30',guests:4,option:'table',note:tag}};
try{
 await check('staging gate rejects anonymous access and pins the dedicated project',async()=>{
  assert.equal((await network(base+'/__dashboard_staging/health')).status,401);
  const health=await network(base+'/__dashboard_staging/health',{headers:{Authorization:'Basic '+Buffer.from('preview:'+secrets.DASHBOARD_STAGING_ACCESS_SECRET).toString('base64')}});
  assert.equal(health.status,200);const identity=await health.json();assert.equal(identity.projectRef,project);assert.equal(identity.commit,expectedCommit);
  cookie=health.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
 });
 await check('existing fictitious accounts authenticate with real Supabase Auth',async()=>{
  for(const role of ['customer','other','partner','admin']){
   assert.equal(credentials[role].email,'dashboard-qa-'+role+'@example.com');
   const response=await network(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify(credentials[role])});
   assert.equal(response.status,200,role+' Auth');sessions[role]=await response.json();
  }
 });
 await check('published staging detail retains its canonical identity and photograph',async()=>{
  const response=await network(base+'/restaurants-nightlife/komodo-miami',{headers:{Cookie:cookie}});
  assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('Komodo'));assert.ok(html.includes('/images/dining/komodo.jpg'));
  assert.ok(!html.includes(secrets.SUPABASE_SERVICE_ROLE_KEY));
 });
 await check('real API saves one canonical pending inquiry and replays the same key',async()=>{
  const key=randomUUID(),saved=await api('/api/book','customer',payload,key);
  assert.equal(saved.status,200);assert.equal(saved.data.success,true);bookingId=saved.data.bookingId;
  const replay=await api('/api/book','customer',payload,key);assert.equal(replay.status,200);assert.equal(replay.data.bookingId,bookingId);assert.equal(replay.data.replayed,true);
  assert.equal((await api('/api/book','customer',payload)).status,409);
  const detail=await api('/api/dashboard/requests/'+bookingId,'customer');assert.equal(detail.status,200);
  assert.equal(detail.data.request.item_title,'Komodo');assert.equal(detail.data.request.status,'pending');assert.deepEqual(detail.data.request.hospitality,payload.hospitality);
 });
 await check('other customers and unassigned partners cannot read the inquiry',async()=>{
  for(const role of ['other','partner']){
   assert.equal((await api('/api/dashboard/requests/'+bookingId+(role==='partner'?'?scope=partner':''),role)).status,404);
   const rows=await rest('bookings?select=id&id=eq.'+bookingId,role);assert.equal(rows.status,200);assert.deepEqual(rows.data,[]);
  }
  assert.equal((await api('/api/dashboard/dining','customer')).status,403);
  assert.equal((await api('/api/dashboard/dining',null)).status,401);
 });
 await check('browser roles cannot forge a write or invoke the privileged submit RPC',async()=>{
  const write=await rest('bookings?select=id','customer',{method:'POST',body:JSON.stringify({item_slug:'dining-qa-forged',item_title:tag,kind:'car',client_name:'DEMO',client_email:'demo@example.com',client_phone:'+13055550123',dates:date,status:'pending'})});assert.ok([401,403].includes(write.status));
  const rpc=await rest('rpc/dashboard_submit','customer',{method:'POST',body:JSON.stringify({p_key:randomUUID(),p_fingerprint:tag,p_rate:tag,p_user:sessions.customer.user.id,p_input:payload})});assert.ok([401,403].includes(rpc.status));
 });
 await check('admin assigns and partner responds with accurate inquiry states',async()=>{
  const assign=await api('/api/dashboard/requests/'+bookingId,'admin',{action:'assign',version:0,partnerId:sessions.partner.user.id});assert.equal(assign.status,200);assert.equal(assign.data.version,1);
  const reply=await api('/api/dashboard/requests/'+bookingId,'partner',{action:'respond',version:1,reply:'DEMO inquiry received; no provider reservation is confirmed.'});assert.equal(reply.status,200);assert.equal(reply.data.version,2);
  assert.equal((await api('/api/dashboard/requests/'+bookingId,'partner',{action:'respond',version:1,reply:'Stale DEMO reply'})).status,409);
  const detail=await api('/api/dashboard/requests/'+bookingId,'customer');assert.equal(detail.data.request.status,'responded');
 });
 await check('only the inquiry owner can withdraw and retry idempotently',async()=>{
  const key=randomUUID(),command={action:'withdraw',version:2};
  assert.equal((await api('/api/dashboard/requests/'+bookingId,'other',command)).status,404);
  const closed=await api('/api/dashboard/requests/'+bookingId,'customer',command,key);assert.equal(closed.status,200);assert.equal(closed.data.version,3);
  assert.equal((await api('/api/dashboard/requests/'+bookingId,'customer',command,key)).status,200);
  const detail=await api('/api/dashboard/requests/'+bookingId,'customer');assert.equal(detail.data.request.status,'closed');assert.deepEqual(detail.data.events.map(e=>e.event_type),['created','assign','respond','withdraw']);
 });
 await check('VIP nightlife requests remain pending inquiries and can be withdrawn',async()=>{
  const vip={...payload,kind:'nightlife',itemSlug:'liv-miami',itemTitle:'Forged VIP confirmation',hospitality:{...payload.hospitality,time:'22:00',guests:6,option:'vip',note:tag+' VIP'}};
  const saved=await api('/api/book','customer',vip);assert.equal(saved.status,200);const vipId=saved.data.bookingId;
  try{
   const detail=await api('/api/dashboard/requests/'+vipId,'customer');assert.equal(detail.status,200);assert.equal(detail.data.request.item_title,'LIV');assert.equal(detail.data.request.status,'pending');assert.equal(detail.data.request.hospitality.option,'vip');
  }finally{
   const current=await api('/api/dashboard/requests/'+vipId,'customer');assert.equal(current.data.request.hospitality.note,tag+' VIP');
   const closed=await api('/api/dashboard/requests/'+vipId,'customer',{action:'withdraw',version:current.data.request.version});assert.equal(closed.status,200);
  }
 });
 await check('provider API returns no invented slots or confirmation',async()=>{
  const result=await api('/api/dining/availability?venue=komodo-miami&date='+date+'&time=19%3A30&guests=4','customer');assert.equal(result.status,200);assert.equal(result.data.slots,null);assert.equal(result.data.confirmation,null);assert.equal(result.data.status,'check_with_provider');
 });
 await check('provider capabilities stay disabled and notifications cannot dispatch',async()=>{
  const overview=await api('/api/dashboard/dining','admin');assert.equal(overview.status,200);assert.equal(overview.data.requestsEnabled,true);assert.ok(overview.data.providers.every(p=>Object.values(p.capabilities).every(v=>v===false)));
  const response=await network(base+'/api/internal/notifications',{method:'POST',headers:{Cookie:cookie,Authorization:'Bearer '+secrets.DASHBOARD_OUTBOX_TOKEN}});assert.equal(response.status,503);
 });
}catch(error){results.push({name:'acceptance',status:'FAIL',error:error.message});process.exitCode=1;console.error(error.message);}
finally{
 // Close only our labelled fictitious inquiry if acceptance was interrupted.
 if(bookingId&&cookie&&sessions.customer){
  const current=await api('/api/dashboard/requests/'+bookingId,'customer').catch(()=>null);
  if(current?.data?.request?.hospitality?.note===tag&&current.data.request.status!=='closed'){
   const close=await api('/api/dashboard/requests/'+bookingId,'customer',{action:'withdraw',version:current.data.request.version}).catch(()=>null);
   if(close?.status!==200){results.push({name:'close interrupted DEMO inquiry',status:'FAIL'});process.exitCode=1;}
  }
 }
 fs.writeFileSync(output,JSON.stringify({base,project,expectedCommit,checkedAt:new Date().toISOString(),tag,bookingId,results},null,2)+'\n');
 console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,productionTouched:false,credentialsPrinted:false}));
}
