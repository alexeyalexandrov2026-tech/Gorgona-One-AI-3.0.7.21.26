import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,ids,rpc,asUser} from './database.mjs';
import {draftListing} from '../../lib/partnerListing.mjs';
let db;
before(async()=>{db=await fixture();});
after(async()=>{await db?.close();});
function content(kind='car'){
 const c=draftListing(kind);
 Object.assign(c,{title:'Partner publication',description:'A factual description.',location:'Miami',priceCents:10000,contact:{name:'Partner',email:'partner@example.com',phone:'+13055550123'}});
 c.specs=kind==='car'?{brand:'BMW',model:'7 Series',year:2025,bodyType:'Sedans'}:kind==='yacht'?{brand:'Azimut',model:'68',year:2023,lengthFt:68,guests:10}:{propertyType:'villa',bedrooms:3,bathrooms:2,guests:6};
 return c;
}
const cmd=(id,action,version,c=null,actor=ids.partner,key=randomUUID(),note='')=>rpc(db,'partner_listing_command',{p_actor:actor,p_id:id,p_key:key,p_action:action,p_version:version,p_content:c,p_note:note});
async function photo(id){
 const path=ids.partner+'/'+randomUUID()+'.jpg';
 const result=await rpc(db,'partner_listing_media_register',{p_actor:ids.partner,p_id:id,p_path:path,p_mime:'image/jpeg',p_size:1000});assert.equal(result.success,true);return path;
}
test('draft -> submit -> approve publishes a public snapshot without private contacts, for every category',async()=>{
 for(const kind of ['car','yacht','stay']){
  const id=randomUUID(),c=content(kind);
  assert.equal((await cmd(id,'save',0,c)).version,1);
  c.images=[await photo(id)];assert.equal((await cmd(id,'save',1,c)).version,2);
  assert.equal((await cmd(id,'submit',2)).state,'pending');
  assert.equal((await db.query('select * from public.partner_publications where id=$1',[id])).rows.length,0);
  assert.equal((await cmd(id,'approve',3,null,ids.admin)).state,'approved');
  const row=(await db.query('select * from public.partner_publications where id=$1',[id])).rows[0];
  assert.equal(row.kind,kind);assert.equal(row.published_version,4);assert.equal(row.content.title,c.title);assert.equal(row.content.contact,undefined);assert.equal(row.slug,'partner-'+id);
  await db.exec('set role anon');try{assert.equal((await db.query('select id from public.partner_publications where id=$1',[id])).rows.length,1);}finally{await db.exec('reset role');}
 }
});
test('edits/rejections preserve the live snapshot; stale approval, replay conflict and unauthorized writes fail',async()=>{
 const id=randomUUID(),c=content(),key=randomUUID();
 const first=await cmd(id,'save',0,c,ids.partner,key);assert.deepEqual(await cmd(id,'save',0,c,ids.partner,key),first);
 assert.equal((await cmd(id,'save',0,{...c,title:'Different'},ids.partner,key)).error,'conflict');
 c.images=[await photo(id)];await cmd(id,'save',1,c);await cmd(id,'submit',2);await cmd(id,'approve',3,null,ids.admin);
 assert.equal((await cmd(id,'save',4,{...c,title:'Unreviewed change'})).state,'draft');
 assert.equal((await db.query('select content from public.partner_publications where id=$1',[id])).rows[0].content.title,c.title);
 await cmd(id,'submit',5);
 assert.equal((await cmd(id,'approve',3,null,ids.admin)).error,'conflict');
 assert.equal((await cmd(id,'approve',6)).error,'forbidden');
 assert.equal((await cmd(id,'reject',6,null,ids.admin)).error,'invalid');
 assert.equal((await cmd(id,'reject',6,null,ids.admin,randomUUID(),'Please update photographs.')).state,'rejected');
 assert.equal((await db.query('select content from public.partner_publications where id=$1',[id])).rows[0].content.title,c.title);
 assert.equal((await cmd(id,'save',7,c,ids.other)).error,'forbidden');
 assert.equal((await cmd(id,'save',7,c,ids.customer)).error,'forbidden');
 await assert.rejects(asUser(db,ids.partner,"update public.partner_listings set title='Unreviewed direct write' where id=$1",[id]),/versioned listing commands/);
 assert.equal((await asUser(db,ids.partner,'delete from public.partner_listings where id=$1 returning id',[id])).rows.length,0);
 assert.equal((await db.query('select id from public.partner_listings where id=$1',[id])).rows.length,1);
 await assert.rejects(asUser(db,ids.partner,'delete from public.partner_publications where id=$1',[id]),/permission denied/);
 assert.equal((await cmd(id,'withdraw',7)).state,'archived');
 assert.equal((await db.query('select id from public.partner_publications where id=$1',[id])).rows.length,0);
 const events=(await db.query('select action from private.partner_listing_history where listing_id=$1 order by version',[id])).rows;
 assert.deepEqual(events.map(e=>e.action),['save','save','submit','approve','save','submit','reject','withdraw']);
});
test('incomplete forms, arbitrary media, forged actor metadata and browser RPC access cannot publish',async()=>{
 const id=randomUUID();await cmd(id,'save',0,draftListing('car'));
 assert.equal((await cmd(id,'submit',1)).error,'incomplete');
 const c=content();c.images=[ids.partner+'/'+randomUUID()+'.jpg'];
 assert.equal((await cmd(id,'save',1,c)).error,'invalid_media');
 assert.equal((await cmd(id,'save',1,{...content(),featured:true})).error,'invalid');
 assert.equal((await cmd(id,'save',1,{...content('stay'),kind:null})).error,'invalid');
 await assert.rejects(asUser(db,ids.partner,'select public.partner_listing_command($1,$2,$3,$4,$5,$6,$7)',[ids.admin,id,randomUUID(),'approve',1,null,'']),/permission denied/);
 const path=ids.partner+'/'+randomUUID()+'.png';
 assert.equal((await rpc(db,'partner_listing_media_register',{p_actor:ids.other,p_id:id,p_path:path,p_mime:'image/png',p_size:1000})).error,'forbidden');
});
test('draft saves are quiet, submissions and decisions queue one durable event, and retries do not duplicate it',async()=>{
 const id=randomUUID(),c=content();
 const initial=(await db.query('select count(*)::int n from private.notification_events')).rows[0].n;
 await cmd(id,'save',0,c);c.images=[await photo(id)];await cmd(id,'save',1,c);
 assert.equal((await db.query('select count(*)::int n from private.notification_events')).rows[0].n,initial);
 const key=randomUUID();await cmd(id,'submit',2,null,ids.partner,key);await cmd(id,'submit',2,null,ids.partner,key);
 assert.equal((await db.query('select count(*)::int n from private.notification_events')).rows[0].n,initial+1);
 await cmd(id,'approve',3,null,ids.admin);
 assert.equal((await db.query('select count(*)::int n from private.notification_events')).rows[0].n,initial+2);
});

test('changing category requires fresh approval and moves one stable publication without duplication',async()=>{
 const id=randomUUID(),car=content('car');
 await cmd(id,'save',0,car);car.images=[await photo(id)];await cmd(id,'save',1,car);await cmd(id,'submit',2);await cmd(id,'approve',3,null,ids.admin);
 const stay=content('stay');stay.images=car.images;
 await cmd(id,'save',4,stay);await cmd(id,'submit',5);
 let rows=(await db.query('select * from public.partner_publications where id=$1',[id])).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].kind,'car');
 const key=randomUUID();await cmd(id,'approve',6,null,ids.admin,key);await cmd(id,'approve',6,null,ids.admin,key);
 rows=(await db.query('select * from public.partner_publications where id=$1',[id])).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].kind,'stay');assert.equal(rows[0].slug,'partner-'+id);assert.equal(rows[0].published_version,7);
});
