import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {draftListing} from '../../lib/partnerListing.mjs';
import {partnerInventory,partnerInventoryRow} from '../../lib/server/partnerInventory.mjs';
import {PARTNER_LISTING_COPY} from '../../lib/partnerListingCopy.mjs';
function publication(kind='car'){
 const id=randomUUID(),owner=randomUUID(),c=draftListing(kind);
 Object.assign(c,{title:'Factual title',description:'Original partner description.',location:'Miami Beach',priceCents:12345,images:[owner+'/'+randomUUID()+'.jpg']});
 c.specs=kind==='car'?{brand:'BMW',model:'7',year:2025,bodyType:'Sedans'}:kind==='yacht'?{brand:'Azimut',model:'68',year:2023,lengthFt:68,guests:10}:{propertyType:'villa',bedrooms:3,bathrooms:2,guests:6};
 delete c.contact;return {id,slug:'partner-'+id,published_version:4,company:'Partner company',kind,content:c};
}
test('published records map to existing card/detail shapes without contacts, custom markup or featured promotion',()=>{
 for(const kind of ['car','yacht','stay']){
  const r=publication(kind),mapped=partnerInventoryRow(r);
  assert.equal(mapped.featured,false);assert.equal(mapped.title,r.content.title);assert.equal(mapped.attrs.gallery.length,1);assert.equal(mapped.attrs.partner,true);
  assert.equal(mapped.image_url,'/api/listing-media/'+r.id+'/4/'+r.content.images[0].split('/')[1]);
  assert.ok(!JSON.stringify(mapped).includes('contact'));
 }
 const r=publication();
 for(const change of [{slug:'lamborghini-urus-se'},{published_version:0},{content:{...r.content,contact:{email:'private@example.com'}}},{kind:'yacht'},{content:{...r.content,images:['https://attacker.example/image.svg']}}])assert.throws(()=>partnerInventoryRow({...r,...change}));
});
test('partner source uses the public key, category filter and no-store; errors retain editorial fallback',async()=>{
 const r=publication(),env={NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-key',SUPABASE_SERVICE_ROLE_KEY:'must-not-be-sent'};
 const rows=await partnerInventory('car-rentals',env,async(url,options)=>{assert.match(url,/kind=eq.car/);assert.equal(options.headers.Authorization,'Bearer public-key');assert.equal(options.cache,'no-store');return Response.json([r]);});
 assert.equal(rows[0].slug,r.slug);
 assert.deepEqual(await partnerInventory('yachts',{},()=>{throw Error('Must not call without configuration');}),[]);
 assert.deepEqual(await partnerInventory('car-rentals',env,async()=>new Response('Unavailable',{status:503})),[]);
});
test('listing editor has complete saved labels in all sixteen languages',()=>{
 assert.equal(Object.keys(PARTNER_LISTING_COPY).length,16);
 const en=Object.keys(PARTNER_LISTING_COPY.en).sort();
 for(const [locale,copy]of Object.entries(PARTNER_LISTING_COPY)){
  assert.deepEqual(Object.keys(copy).sort(),en,locale);
  assert.ok(Object.values(copy).every(value=>typeof value==='string'&&value.trim()),locale);
  if(locale!=='en')assert.notEqual(copy.privateContacts,PARTNER_LISTING_COPY.en.privateContacts,locale);
 }
});

test('Unicode company bounds match SQL characters and invalid rows cannot hide valid neighbours',async()=>{
 const good=publication(),unicode={...publication(),company:'😀'.repeat(200)},bad={...publication(),company:'x'.repeat(201)};
 assert.equal(partnerInventoryRow(unicode).subtitle,unicode.company);
 assert.throws(()=>partnerInventoryRow(bad));
 const env={NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-key'};
 const rows=await partnerInventory('car-rentals',env,async()=>Response.json([good,unicode,bad]));
 assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.slug),[good.slug,unicode.slug]);
});
