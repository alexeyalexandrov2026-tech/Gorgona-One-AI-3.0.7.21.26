import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getRentals,getRentalBySlug} from '../../lib/rentalsData.js';
import {carThumb} from '../../lib/homeData.js';
import '../../lib/savedServerCatalog.js';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
import {savedListing} from '../../lib/savedCopy.js';
import nextConfig from '../../next.config.js';
const read=name=>JSON.parse(readFileSync(new URL('../../docs/fleet-import/'+name,import.meta.url),'utf8'));
const plan=read('decisions.json'),source=read('source-inventory.json'),assets=read('assets.json').assets;
const cars=getRentals();
test('unaffected original vehicles retain their routes, covers and descriptive metadata',()=>{
 for(const original of read('existing-fleet.json')){
  if(['mercedes-g-class-white','mercedes-gls-white'].includes(original.slug))continue;
  const {gallery:oldGallery,...oldFields}=original;
  const {gallery:newGallery,...newFields}=getRentalBySlug(original.slug);
  assert.deepEqual(newFields,oldFields,original.slug);
  for(const photo of oldGallery)assert.ok(newGallery.includes(photo),photo);
 }
});
test('each new description has saved copy in all sixteen supported languages',()=>{
 for(const row of plan.vehicles.filter(v=>v.action==='add')){
  const car=getRentalBySlug(row.targetSlug);assert.ok(car,row.targetSlug);
  for(const language of SUPPORTED_LANGUAGES){
   const text=savedListing(language.code,car);assert.ok(text.trim());
   if(language.code!=='en')assert.notEqual(text,car.description,`${language.code}: ${car.slug}`);
   assert.doesNotMatch(text,/[$€£]\s?\d/);
  }
 }
});
test('thirty canonical vehicles include one corrected white X5 and separate GLS interior variants',()=>{
 assert.equal(cars.length,30);
 assert.equal(new Set(cars.map(v=>v.slug)).size,cars.length);
 for(const row of plan.vehicles.filter(v=>['add','merge'].includes(v.action)))assert.ok(getRentalBySlug(row.targetSlug),row.targetSlug);
 assert.equal(getRentalBySlug('mercedes-g-class-white'),undefined);
 assert.equal(cars.filter(c=>c.slug==='bmw-x5-white-brown').length,1);
 assert.equal(getRentalBySlug('bmw-x5-white-brown').title,'BMW X5 · White');
 assert.match(getRentalBySlug('bmw-x5-white-brown').description,/White luxury SUV with a brown interior/);
 assert.doesNotMatch(JSON.stringify(getRentalBySlug('bmw-x5-white-brown')),/G-Class|mercedes-g-class-white|2026 Model Year/);
 assert.equal(getRentalBySlug('mercedes-gls-white').title,'Mercedes-Benz GLS · White / Cream');
 assert.ok(getRentalBySlug('mercedes-gls450-white-brown'));
 assert.ok(!cars.some(v=>v.slug==='mercedes-benz-g550-whitered'));
 assert.ok(getRentalBySlug('mercedes-cle300-white-beige'));
});
test('covers the source exactly once and quarantines its mislabeled CLE53 entry',()=>{
 assert.equal(source.vehicles.length,25);
 assert.deepEqual(plan.vehicles.map(v=>v.sourceIndex),Array.from({length:25},(_,i)=>i));
 assert.equal(plan.vehicles.filter(v=>v.action==='add').length,13);
 assert.equal(plan.vehicles.filter(v=>v.action==='merge').length,10);
 assert.equal(plan.vehicles.filter(v=>v.action==='exclude').length,1);
 assert.equal(plan.vehicles.filter(v=>v.action==='quarantine').length,1);
 assert.deepEqual(source.vehicles[0].photoUrls,source.vehicles[15].photoUrls);
});
test('CLE53 and CLE300 cannot share galleries after the rear badges identified distinct models',()=>{
 const amg=getRentalBySlug('mercedes-amg-cle-53-cabriolet');
 const cle300=getRentalBySlug('mercedes-cle300-white-beige');assert.ok(cle300);
 assert.equal(amg.gallery.length,5);
 assert.ok([amg.image,...amg.gallery].every(p=>p.startsWith('/images/rentals/mercedes-amg-cle-53/')));
 assert.ok(cle300.gallery.every(p=>p.includes('/mercedes-benz-cle300-convertbile-whitebrown-')));
 assert.ok(!cle300.gallery.some(p=>amg.gallery.includes(p)));
 assert.equal(cle300.category,'Convertibles');
});
test('GLS cream and brown interiors cannot be combined into one physical vehicle',()=>{
 const cream=getRentalBySlug('mercedes-gls-white'),brown=getRentalBySlug('mercedes-gls450-white-brown');assert.ok(brown);
 assert.ok([cream.image,...cream.gallery].every(p=>p.startsWith('/images/rentals/mercedes-gls-white/')));
 assert.ok(brown.gallery.every(p=>p.includes('/mercedes-benz-gls450-whitebrown-')));
 assert.notEqual(cream.description,brown.description);
});
test('grey and white X5 variants remain separate and legacy G-Class URL redirects to the corrected white X5',async()=>{
 const white=getRentalBySlug('bmw-x5-white-brown'),grey=getRentalBySlug('bmw-x5-brooklyn-grey-brown');
 assert.ok(white&&grey);assert.notEqual(white.slug,grey.slug);
 assert.ok(white.gallery.every(p=>!p.includes('brooklyn')));
 assert.ok(grey.gallery.every(p=>p.includes('bmw-x5-brooklyn-greybrown-')));
 const redirect=(await nextConfig.redirects()).find(r=>r.source==='/rentals/mercedes-g-class-white');
 assert.deepEqual(redirect,{source:'/rentals/mercedes-g-class-white',destination:'/rentals/bmw-x5-white-brown',permanent:true});
});
test('all original gallery files match their captured hashes and have bounded local covers',()=>{
 assert.equal(assets.length,163);
 for(const a of assets){
  const bytes=readFileSync(new URL('../../public'+a.path,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256,a.path);
  assert.equal(bytes.length,a.bytes);
  assert.ok(a.width>0&&a.height>0);
 }
 for(const car of cars){
  assert.ok(existsSync(new URL('../../public'+carThumb(car),import.meta.url)),car.slug);
  assert.equal(new Set(car.gallery).size,car.gallery.length,car.slug);
  for(const file of [car.image,...car.gallery])assert.ok(existsSync(new URL('../../public'+file,import.meta.url)),file);
 }
});
test('source vehicles have no imported tariffs, deposits, external booking links or provider branding',()=>{
 for(const row of plan.vehicles.filter(v=>['add','merge'].includes(v.action))){
  const car=getRentalBySlug(row.targetSlug);assert.ok(car,row.targetSlug);
  for(const field of ['dailyPrice','weeklyPrice','monthlyPrice','securityDeposit'])assert.equal(car[field],'On request');
  assert.doesNotMatch(car.description,/[$€£]|\b(?:Brooklyn Rent|Miami Auto Rental|Sixt)\b/i);
  assert.ok(!car.image.startsWith('http'));
  assert.ok(car.gallery.every(file=>file.startsWith('/images/rentals/')));
 }
});
test('all source gallery photos are represented by a local file or a reviewed equivalent in the merged gallery',()=>{
 const equivalences=read('gallery-equivalents.json');
 for(const row of plan.vehicles.filter(v=>['add','merge'].includes(v.action))){
  const car=getRentalBySlug(row.targetSlug);assert.ok(car,row.targetSlug);
  for(const url of source.vehicles[row.sourceIndex].photoUrls){
   const asset=assets.find(a=>a.sourceUrl===url);assert.ok(asset,url);
   const effective=equivalences[car.slug]?.[asset.path]||asset.path;
   assert.ok([car.image,...car.gallery].includes(effective),`${car.slug}: ${url}`);
  }
 }
});
