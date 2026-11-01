import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPERIENCE_CARDS,EXPERIENCE_SECTION_IDS,getExperienceSection,experienceImageUrl} from '../../lib/experienceCards.mjs';
import {EXPERIENCE_MEDIA} from '../../lib/experienceMedia.mjs';
import {EXPERIENCE_COPY} from '../../lib/experienceCopy.mjs';
import {FLORIDA_PARK_GUIDES,FLORIDA_OFFICIAL_PARKS} from '../../lib/floridaParks.mjs';

test('every booking card has native presentation and a traceable permitted image',()=>{
 for(const card of EXPERIENCE_CARDS){
  assert.ok(card.title?.trim(),card.id+' needs an editorial label');
  assert.ok(card.image,card.id+' needs an image');
  assert.ok(card.imageSource,card.id+' needs image provenance');
  assert.ok(!('price' in card)||card.price==='','do not invent live prices');
 }
});

test('the catalogue renders the whole collection without a disclosure or supplier iframe',()=>{
 const source=readFileSync(new URL('../../app/experiences/ExperiencesContent.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/<details|<summary|<iframe|items\.slice\(/);
});

test('sections cover every card once and put Florida parks before worldwide flights',()=>{
 assert.equal(EXPERIENCE_SECTION_IDS[0],'parks');
 assert.equal(EXPERIENCE_SECTION_IDS.at(-1),'helicopters');
 const grouped=EXPERIENCE_SECTION_IDS.flatMap(getExperienceSection);
 assert.equal(grouped.length,71);
 assert.equal(new Set(grouped.map(card=>card.id)).size,71);
 assert.deepEqual(new Set(grouped.map(card=>card.id)),new Set(EXPERIENCE_CARDS.map(card=>card.id)));
 assert.deepEqual(getExperienceSection('parks').slice(0,4).map(card=>card.id),['headout-3676','headout-2331','headout-6224','headout-6225']);
 assert.equal(getExperienceSection('florida-flights')[0].productCode,'231628P7');
 assert.deepEqual(getExperienceSection('missing'),[]);
});

test('licensed editorial media are local WebP files with author, source and license',()=>{
 for(const media of Object.values(EXPERIENCE_MEDIA)){
  assert.equal(new URL(media.source).origin,'https://unsplash.com');
  assert.equal(media.license,'https://unsplash.com/license');
  assert.ok(media.author);
  const bytes=readFileSync(new URL('../../public'+media.image,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert.ok(bytes.length<350_000);
 }
 for(const card of EXPERIENCE_CARDS.filter(item=>item.kind==='headout')){
  const url=new URL(experienceImageUrl(card));
  assert.equal(url.origin,'https://cdn-imgix.headout.com');
  assert.equal(url.searchParams.get('w'),'960');
 }
});

test('regional visitor links are explicit official sources, not pretend affiliate accounts',()=>{
 assert.equal(FLORIDA_OFFICIAL_PARKS.length,3);
 for(const card of FLORIDA_OFFICIAL_PARKS){
  assert.equal(card.kind,'official');
  assert.equal(new URL(card.href).protocol,'https:');
  assert.ok(!new URL(card.href).searchParams.has('affiliate_code'));
 }
 const rides=Object.values(FLORIDA_PARK_GUIDES).flatMap(guide=>[...guide.coasters,...(guide.related||[]).flatMap(park=>park.coasters)]).concat(FLORIDA_OFFICIAL_PARKS.flatMap(park=>park.coasters));
 assert.equal(rides.length,51);
 assert.ok(rides.includes('Pteranodon Flyers'));
 for(const retired of ['Kumba','Scorpion','Hollywood Rip Ride Rockit','Flying School','Dragon Wagon'])assert.ok(!rides.includes(retired),retired);
 assert.ok(rides.includes('Galacticoaster'));
 assert.ok(rides.includes('Rock ’n’ Roller Coaster Starring The Muppets'));
});

test('all sixteen interface languages cover the new section and visitor labels',()=>{
 assert.equal(Object.keys(EXPERIENCE_COPY).length,16);
 for(const row of Object.values(EXPERIENCE_COPY)){
  assert.deepEqual(Object.keys(row),Object.keys(EXPERIENCE_COPY.en));
  assert.ok(Object.values(row).every(value=>value.trim()));
 }
});
