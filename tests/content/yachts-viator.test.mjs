import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIATOR_YACHTS,VIATOR_YACHT_CITIES,getViatorYachts} from '../../lib/viatorYachts.mjs';
import {VIATOR_YACHT_COPY,getViatorYachtCopy} from '../../lib/viatorYachtCopy.mjs';
import {EXPERIENCE_CARDS} from '../../lib/experienceCards.mjs';

test('/yachts lists 36 private Viator charters from Key West to Palm Beach, south to north',()=>{
 assert.equal(VIATOR_YACHTS.length,36);
 assert.deepEqual(VIATOR_YACHT_CITIES.map(city=>city.id),['key-west','florida-keys','miami','fort-lauderdale','palm-beach']);
 assert.deepEqual(VIATOR_YACHT_CITIES.map(city=>getViatorYachts(city.id).length),[3,2,22,6,3]);
 // Cards come out in city order, so each grid is already sorted.
 const order=VIATOR_YACHT_CITIES.map(city=>city.id);
 const indexes=VIATOR_YACHTS.map(card=>order.indexOf(card.city));
 assert.deepEqual(indexes,[...indexes].sort((a,b)=>a-b));
});

test('every offer is a sponsored direct link to Viator with the partner referral and its own photo',()=>{
 assert.equal(new Set(VIATOR_YACHTS.map(card=>card.productCode)).size,36);
 assert.equal(new Set(VIATOR_YACHTS.map(card=>card.id)).size,36);
 assert.equal(new Set(VIATOR_YACHTS.map(card=>card.image)).size,36,'every offer has its own photo');
 for(const card of VIATOR_YACHTS){
  const link=new URL(card.href);
  assert.equal(link.origin,'https://www.viator.com',card.id);
  assert.ok(link.pathname.endsWith('-'+card.productCode),card.id);
  assert.equal(link.searchParams.get('pid'),'P00329248',card.id);
  assert.equal(link.searchParams.get('mcid'),'42383',card.id);
  assert.equal(link.searchParams.get('campaign'),'miami-elio-yachts',card.id);
  assert.equal(card.partnerHref,card.href);
  assert.equal(card.kind,'viator');
  assert.equal(card.direct,true);
  assert.match(card.image,/^https:\/\/media-cdn\.tripadvisor\.com\/media\/attractions-splice-spp-720x480\//,card.id);
  assert.equal(card.imageCredit,'Viator');
  assert.ok(card.title&&card.titleRu&&card.location,card.id);
  assert.ok(!/all[- ]inclusive|free/i.test(card.title+' '+card.titleRu),card.id+' promises more than Viator lists');
 }
});

test('the offers stay out of the Experiences catalogue and its card counts',()=>{
 assert.ok(!EXPERIENCE_CARDS.some(card=>card.id.startsWith('viator-yacht-')));
});

test('the section has its title, lead and city label in all sixteen languages',()=>{
 assert.equal(Object.keys(VIATOR_YACHT_COPY).length,16);
 for(const [locale,copy] of Object.entries(VIATOR_YACHT_COPY)){
  assert.ok(copy.title&&copy.lead&&copy.cities,locale);
 }
 assert.equal(getViatorYachtCopy('invalid').title,getViatorYachtCopy('en').title);
});

test('the Viator section sits under the YATR catalogue and reuses the experience card',()=>{
 const page=readFileSync('app/yachts/YachtContent.jsx','utf8');
 assert.ok(page.indexOf('<YatrCatalog')>0&&page.indexOf('<ViatorYachts')>page.indexOf('<YatrCatalog'));
 const section=readFileSync('app/yachts/ViatorYachts.jsx','utf8');
 assert.match(section,/import ExperienceCard from '\.\.\/experiences\/ExperienceCard'/);
 assert.match(section,/getViatorYachts\(city\.id\)/);
});
