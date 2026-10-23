import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const provisioning=fs.readFileSync(new URL('../../supabase/storage/partner-listing-images.sql',import.meta.url),'utf8');
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema storage;grant usage on schema storage to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id integer primary key,bucket_id text);
 alter table storage.objects enable row level security;
 grant all on all tables in schema storage to anon,authenticated,service_role;
 create policy legacy_broad_access on storage.objects for all to anon,authenticated using(true) with check(true);
 insert into storage.buckets values('listings_media','listings_media',true,null,null);
 insert into storage.objects values(1,'listings_media');`);
 return db;
}
test('private photo provisioning defeats broad legacy browser policies without breaking legacy media',async()=>{
 const db=await setup();try{
  await db.exec(provisioning);
  const bucket=(await db.query("select * from storage.buckets where id='partner_listing_images'")).rows[0];
  assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),8388608);
  assert.deepEqual(bucket.allowed_mime_types,['image/jpeg','image/png','image/webp']);
  await db.exec("set role service_role;insert into storage.objects values(2,'partner_listing_images');reset role");
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   assert.deepEqual((await db.query('select id from storage.objects order by id')).rows,[{id:1}]);
   await assert.rejects(db.exec("insert into storage.objects values(3,'partner_listing_images')"),/row-level security/);
   await db.exec('reset role');
  }
  await db.exec('set role service_role');assert.equal((await db.query("select id from storage.objects where bucket_id='partner_listing_images'")).rows.length,1);
  await db.exec('reset role');
 }finally{await db.close();}
});
test('provisioning refuses a pre-existing public or unlimited partner bucket',async()=>{
 for(const [isPublic,limit]of [[true,8388608],[false,null]]){
  const db=await setup();try{
   await db.query("insert into storage.buckets values('partner_listing_images','partner_listing_images',$1,$2,null)",[isPublic,limit]);
   await assert.rejects(db.exec(provisioning),/explicit security review/);await db.exec('rollback');
  }finally{await db.close();}
 }
});
