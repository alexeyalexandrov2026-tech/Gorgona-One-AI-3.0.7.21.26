import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selection,safeDestination,PROVIDERS,providerAdapter,availability} from '../../lib/dining/gateway.mjs';
import {getVenues,getVenueBySlug} from '../../lib/restaurantsNightlifeData.js';
import {channelsFor} from '../../lib/dining/gateway.mjs';
import {DINING_COPY,getDiningPhotoCopy} from '../../lib/dining/copy.mjs';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
const requested={version:1,date:'2027-01-05',time:'20:00',guests:4,option:'table'};
test('selection rejects impossible dates, malformed times, coercion and past dates',()=>{
  for(const change of [{date:'2027-02-30'},{date:'2020-01-01'},{time:'24:01'},{guests:'4'},{guests:0},{option:'confirmed'},{version:2},{note:'\0'}])
    assert.throws(()=>selection({...requested,...change},new Date('2026-10-31T12:00:00Z')));
  assert.equal(selection(requested,new Date('2026-10-31T12:00:00Z')).guests,4);
});
test('every unprovisioned provider rejects API creation, cancellation and availability',async()=>{
  for(const p of PROVIDERS) for(const operation of ['availability','create','cancel']) {
    assert.equal(providerAdapter(p.id).capabilities[operation],false);
    await assert.rejects(providerAdapter(p.id)[operation](),/provider_not_authorized/);
  }
});
test('referral destinations cannot become open redirects or script URLs',()=>{
  for(const href of ['javascript:alert(1)','https://www.opentable.com.evil.test/','https://user@www.opentable.com/','http://www.opentable.com/','https://www.opentable.com:444/'])
    assert.throws(()=>safeDestination(href,['www.opentable.com']));
});
test('external handoffs do not invent availability or confirmations',()=>{
  const result=availability({id:'test',status:'verified',channels:[]},requested);
  assert.equal(result.slots,null);assert.equal(result.confirmation,null);assert.equal(result.status,'check_with_provider');
});
test('canonical catalogue is expanded, deduplicated and source-backed without unverifiable ratings and with licensed, correctly identified images',()=>{
 const venues=getVenues();assert.ok(venues.length>=24);
 for(const field of ['id','slug','address'])assert.equal(new Set(venues.map(v=>v[field])).size,venues.length,field);
 for(const venue of venues){assert.equal(venue.status,'verified');assert.equal(venue.rating,undefined);assert.ok(venue.address);assert.ok(venue.sources.length);assert.ok(venue.image.startsWith('/images/dining/'));assert.ok(venue.photo.source.startsWith('https://'));assert.ok(venue.photo.license);assert.ok(['venue','editorial'].includes(venue.photo.kind));channelsFor(venue);}
 for(const slug of ['komodo-miami','papi-steak-miami','sexy-fish-miami','carbone-miami','prime-112-miami','joes-stone-crab-miami','liv-miami','e11even-miami','club-space-miami','rosa-sky-miami','sugar-rooftop-miami','story-miami'])assert.ok(getVenueBySlug(slug),slug);
 assert.equal(getVenueBySlug('sexy-fish-miami').neighborhood,'Brickell');
 assert.equal(getVenueBySlug('story-miami').status,'unverified');assert.equal(channelsFor(getVenueBySlug('story-miami')).length,0);
});
test('dining copy is complete and translated across all sixteen site languages',()=>{
 for(const {code} of SUPPORTED_LANGUAGES){
  const copy=DINING_COPY[code];
  assert.deepEqual(Object.keys(copy),Object.keys(DINING_COPY.en));
  for(const value of Object.values(copy))assert.ok(value.trim());
  assert.deepEqual(copy.providerWebsite.match(/\{[^}]+\}/g),['{provider}'],code);
  if(code!=='en'){
   for(const key of ['handoff','providerWebsite','venueWebsite'])assert.notEqual(copy[key],DINING_COPY.en[key],code);
  }
 }
});


test('every photographic asset has recorded provenance and matches its licensed file',async()=>{
 const {readFileSync}=await import('node:fs');const {createHash}=await import('node:crypto');
 for(const venue of getVenues()){
  const image=readFileSync(new URL('../../public'+venue.image,import.meta.url));
  assert.equal(createHash('sha256').update(image).digest('hex'),venue.photo.sha256,venue.id);
  assert.ok(image.length<=4_000_000);assert.ok(venue.photo.author);
  const copy=getDiningPhotoCopy('en');assert.notEqual(copy.editorial,copy.venue);
 }
 for(const language of SUPPORTED_LANGUAGES)assert.deepEqual(Object.keys(getDiningPhotoCopy(language.code)),Object.keys(getDiningPhotoCopy('en')));
});
