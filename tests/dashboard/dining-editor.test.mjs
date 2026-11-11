import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,ids,asUser,rpc} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {getVenueBySlug} from '../../lib/restaurantsNightlifeData.js';
import {validateVenueDraft,venueDraft} from '../../lib/dining/editor.mjs';
import {diningEditorHandlers} from '../../lib/server/diningEditorHandlers.mjs';
import {diningCatalogue,diningVenue} from '../../lib/server/diningCatalogue.mjs';
import {dashboardHandlers} from '../../lib/server/dashboardHandlers.mjs';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
import {getDiningEditorCopy} from '../../lib/dining/editorCopy.mjs';

const env={...fixtureEnv,DINING_EDITOR_ENABLED:'true',DINING_EDITOR_WRITES_ENABLED:'true',DINING_REQUESTS_ENABLED:'true',DINING_SCHEMA_ENABLED:'true'};
const original=getVenueBySlug('komodo-miami'),initial=venueDraft(original);
const request=(actor,body,key=randomUUID())=>new Request('https://example.com/api/dashboard/dining/venues/komodo-miami',{method:body?'POST':'GET',headers:{...(actor?{Authorization:'Bearer '+actor}:{}),'Idempotency-Key':key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
let db,fetcher,handlers,savedKey,publishKey;
before(async()=>{db=await fixture();fetcher=provider(db);handlers=diningEditorHandlers(env,fetcher);});
after(async()=>{await db?.close();});

test('editor contract rejects unsafe URLs, extra capabilities, duplicate mappings and malformed data',()=>{
 assert.deepEqual(validateVenueDraft(initial,original,{publish:true}),initial);
 for(const draft of [ {...initial,id:'forged'},{...initial,website:'javascript:alert(1)'},{...initial,verifiedOn:'2026-02-30'},
  {...initial,channels:[...initial.channels,initial.channels[0]]},{...initial,channels:[{...initial.channels[0],href:'https://sevenrooms.com.evil.test/reserve'}]},
  {...initial,channels:[{...initial.channels[0],affiliate:true}]},{...initial,sources:['http://example.com']},{...initial,features:['invented']},
  {...initial,channels:[{...initial.channels[0],provider:'venue',href:'https://unrelated.example/reserve'}]}])assert.throws(()=>validateVenueDraft(draft,original));
 assert.throws(()=>validateVenueDraft({...venueDraft(getVenueBySlug('story-miami')),status:'verified'},getVenueBySlug('story-miami'),{publish:true}));
 assert.throws(()=>validateVenueDraft({...initial,description:'Untranslated new editorial text'},original,{publish:true}),/translations/);
});
test('every editor action and review warning has all sixteen translations',()=>{
 for(const {code} of SUPPORTED_LANGUAGES){const copy=getDiningEditorCopy(code);assert.deepEqual(Object.keys(copy),Object.keys(getDiningEditorCopy('en')));assert.ok(Object.values(copy).every(value=>typeof value==='string'&&value.trim()));if(code!=='en')assert.notEqual(copy.title,getDiningEditorCopy('en').title);}
});
test('only the real administrator profile can read or edit, irrespective of client metadata',async()=>{
 for(const actor of [null,ids.customer,ids.partner]){
  assert.equal((await handlers.read(request(actor),'komodo-miami')).status,actor?403:401);
  assert.equal((await handlers.command(request(actor,{action:'save',version:0,draft:initial}),'komodo-miami')).status,actor?403:401);
 }
 assert.equal((await diningEditorHandlers(fixtureEnv,fetcher).read(request(ids.admin),'komodo-miami')).status,503);
 assert.equal((await handlers.read(request(ids.admin),'unknown')).status,404);
 const response=await handlers.read(request(ids.admin),'komodo-miami');assert.equal(response.status,200);assert.equal((await response.json()).revision,0);
});
test('draft save is private and cannot change public catalogue',async()=>{
 savedKey=randomUUID();const response=await handlers.command(request(ids.admin,{action:'save',version:0,draft:{...initial,address:'QA reviewed address'}},savedKey),'komodo-miami');
 assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
 assert.equal((await diningVenue('komodo-miami',env,fetcher)).address,original.address);
 assert.equal((await db.query('select count(*)::int n from public.dining_publications')).rows[0].n,0);
});
test('retries return same revision and changed payload or stale version conflicts',async()=>{
 const same={action:'save',version:0,draft:{...initial,address:'QA reviewed address'}};
 assert.equal((await handlers.command(request(ids.admin,same,savedKey),'komodo-miami')).status,200);
 assert.equal((await db.query('select count(*)::int n from private.dining_editor_events')).rows[0].n,1);
 assert.equal((await handlers.command(request(ids.admin,{...same,draft:initial},savedKey),'komodo-miami')).status,409);
 assert.equal((await handlers.command(request(ids.admin,same),'komodo-miami')).status,409);
});
test('publishing exposes exactly the saved public snapshot, canonical route and original licensed photograph',async()=>{
 publishKey=randomUUID();const response=await handlers.command(request(ids.admin,{action:'publish',version:1},publishKey),'komodo-miami');assert.equal(response.status,200);
 const venue=await diningVenue('komodo-miami',env,fetcher);assert.equal(venue.address,'QA reviewed address');assert.equal(venue.image,original.image);assert.equal(venue.slug,original.slug);
 const published=(await db.query('select * from public.dining_publications')).rows[0];assert.ok(!JSON.stringify(published).includes(ids.admin));assert.equal(published.published_version,1);
});
test('a newer saved draft leaves the previous publication intact; old publication key replays safely',async()=>{
 const response=await handlers.command(request(ids.admin,{action:'save',version:1,draft:{...initial,address:'Unpublished next address'} }),'komodo-miami');assert.equal(response.status,200);
 assert.equal((await diningVenue('komodo-miami',env,fetcher)).address,'QA reviewed address');
 assert.equal((await handlers.command(request(ids.admin,{action:'publish',version:1},publishKey),'komodo-miami')).status,200);
 assert.equal((await handlers.command(request(ids.admin,{action:'publish',version:1}),'komodo-miami')).status,409);
});
test('browser roles cannot read drafts, forge publication writes or call service-only RPCs',async()=>{
 for(const actor of [ids.customer,ids.partner,ids.admin]){
  await assert.rejects(asUser(db,actor,'select * from private.dining_venue_drafts'),/permission denied/);
  await assert.rejects(asUser(db,actor,"update public.dining_publications set published_version=99"),/permission denied/);
  await assert.rejects(asUser(db,actor,"select public.dining_venue_read($1,'komodo')",[ids.admin]),/permission denied/);
  assert.equal((await asUser(db,actor,'select content from public.dining_publications')).rows[0].content.address,'QA reviewed address');
 }
 await db.exec('set role anon');try{assert.equal((await db.query('select count(*)::int n from public.dining_publications')).rows[0].n,1);await assert.rejects(db.query('select * from private.dining_editor_events'),/permission denied/);}finally{await db.exec('reset role');}
 assert.equal((await rpc(db,'dining_venue_read',{p_actor:ids.customer,p_id:'komodo'})).error,'forbidden');
});
test('withdrawal is a publication and blocks new inquiries while preserving the route and audit history',async()=>{
 assert.equal((await handlers.command(request(ids.admin,{action:'save',version:2,draft:{...initial,status:'unverified'}}),'komodo-miami')).status,200);
 assert.equal((await handlers.command(request(ids.admin,{action:'publish',version:3}),'komodo-miami')).status,200);
 const held=await diningVenue('komodo-miami',env,fetcher);assert.equal(held.status,'unverified');
 const booking={kind:'dining',itemSlug:'komodo-miami',itemTitle:'Komodo',dates:'arbitrary',name:'QA',email:'qa@example.com',phone:'+13055550123',hospitality:{version:1,date:'2027-02-14',time:'19:30',guests:2,option:'table',note:''}};
 assert.equal((await dashboardHandlers(env,fetcher).book(request(ids.customer,booking))).status,400);
 assert.equal((await db.query('select count(*)::int n from private.dining_editor_events')).rows[0].n,5);
});
test('catalogue failure cannot resurrect a withdrawn venue from static fallback',async()=>{
 const fail=async()=>Response.json({error:'offline'},{status:503});
 assert.deepEqual(await diningCatalogue(env,fail),[]);await assert.rejects(diningCatalogue(env,fail,{strict:true}),/unavailable/);
 assert.equal((await diningCatalogue(fixtureEnv,fail)).length,28);
});
test('invalid or mismatched public snapshots fail closed',async()=>{
 for(const row of [{id:'komodo',slug:'other-miami',published_version:1,content:initial},{id:'komodo',slug:'komodo-miami',published_version:1,content:{...initial,serviceKey:'secret'}}])
  assert.deepEqual(await diningCatalogue(env,async()=>Response.json([row])),[]);
});
test('database rejects malformed publication content independently of the HTTP validator',async()=>{
 for(const bad of [{},{...initial,channels:[{provider:'opentable',externalId:4,href:'javascript:bad',evidence:'x'}]},{...initial,extra:'private'}])
  await assert.rejects(db.query('update public.dining_publications set content=$1 where id=$2',[JSON.stringify(bad),'komodo']),/check constraint/);
});
test('competing administrators cannot both save the same base revision',async()=>{
 const sugar=getVenueBySlug('sugar-rooftop-miami'),draft=venueDraft(sugar);
 const responses=await Promise.all(['First QA edit','Second QA edit'].map(address=>handlers.command(request(ids.admin,{action:'save',version:0,draft:{...draft,address}}),sugar.slug)));
 assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
 assert.equal((await db.query("select count(*)::int n from private.dining_editor_events where venue_id='sugar-rooftop'")).rows[0].n,1);
});
test('a saved inquiry survives venue renaming, withdrawal and disabled new submissions without duplicate events',async()=>{
 const isolated=await fixture();
 try{
  const source=provider(isolated),edit=diningEditorHandlers(env,source),book=dashboardHandlers(env,source),key=randomUUID();
  const body={kind:'dining',itemSlug:'komodo-miami',itemTitle:'Komodo',dates:'arbitrary',name:'Private QA',email:'qa@example.com',phone:'+13055550123',hospitality:{version:1,date:'2027-02-14',time:'19:30',guests:2,option:'private',note:''}};
  const first=await book.book(request(ids.customer,body,key));assert.equal(first.status,200);const id=(await first.json()).bookingId;
  assert.equal((await edit.command(request(ids.admin,{action:'save',version:0,draft:{...initial,name:'Komodo renamed QA'}}),'komodo-miami')).status,200);
  assert.equal((await edit.command(request(ids.admin,{action:'publish',version:1}),'komodo-miami')).status,200);
  assert.equal((await (await book.book(request(ids.customer,body,key))).json()).bookingId,id);
  assert.equal((await book.book(request(ids.customer,body))).status,409);
  assert.equal((await edit.command(request(ids.admin,{action:'save',version:1,draft:{...initial,status:'unverified'}}),'komodo-miami')).status,200);
  assert.equal((await edit.command(request(ids.admin,{action:'publish',version:2}),'komodo-miami')).status,200);
  const replay=await dashboardHandlers({...env,DINING_REQUESTS_ENABLED:'false'},source).book(request(ids.customer,body,key));assert.equal(replay.status,200);assert.equal((await replay.json()).bookingId,id);
  assert.equal((await book.book(request(ids.other,body,key))).status,409);
  assert.equal((await book.book(request(ids.customer,{...body,hospitality:{...body.hospitality,guests:3}},key))).status,409);
  assert.equal((await book.book(request(ids.customer,body))).status,400);
  assert.equal((await isolated.query('select count(*)::int n from public.request_events')).rows[0].n,1);
 }finally{await isolated.close();}
});
test('pausing editorial writes retains published withdrawals and does not restore the static venue',async()=>{
 const paused={...env,DINING_EDITOR_WRITES_ENABLED:'false'};
 assert.equal((await diningEditorHandlers(paused,fetcher).command(request(ids.admin,{action:'save',version:3,draft:initial}),'komodo-miami')).status,503);
 assert.equal((await diningVenue('komodo-miami',paused,fetcher)).status,'unverified');
 assert.equal((await diningEditorHandlers(paused,fetcher).read(request(ids.admin),'komodo-miami')).status,200);
});
