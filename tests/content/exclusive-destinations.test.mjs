import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPERIENCE_SECTION_IDS,EXCLUSIVE_SECTION_IDS,experienceShowcase} from '../../lib/experienceCards.mjs';
import {EXPERIENCE_COPY} from '../../lib/experienceCopy.mjs';
import {SECTION_ROUTES,sitemapEntries} from '../../lib/seo.mjs';
import {HOME_SECTIONS} from '../../lib/homeData.js';

test('Exclusive Destinations lists the same sections, luxury first and theme parks last',()=>{
 assert.deepEqual([...EXCLUSIVE_SECTION_IDS].sort(),[...EXPERIENCE_SECTION_IDS].sort());
 assert.equal(EXCLUSIVE_SECTION_IDS[0],'boats');
 assert.equal(EXCLUSIVE_SECTION_IDS.at(-1),'parks');
 assert.equal(EXPERIENCE_SECTION_IDS[0],'parks');
});

test('the showcase takes one photographed item per section with no repeats',()=>{
 for(const ids of [EXPERIENCE_SECTION_IDS,EXCLUSIVE_SECTION_IDS]){
  const slides=experienceShowcase(ids);
  assert.ok(slides.length>=5);
  assert.equal(new Set(slides.map(slide=>slide.item.id)).size,slides.length);
  assert.equal(new Set(slides.map(slide=>slide.section)).size,slides.length);
  for(const slide of slides)assert.ok(slide.image);
 }
 const luxury=experienceShowcase(EXCLUSIVE_SECTION_IDS,{prefer:/private|yacht|helicopter/i});
 assert.match(luxury[0].item.title,/private|yacht/i);
});

test('every language has the Exclusive Destinations title and subtitle',()=>{
 assert.equal(Object.keys(EXPERIENCE_COPY).length,16);
 for(const [locale,copy] of Object.entries(EXPERIENCE_COPY)){
  assert.ok(copy.exclusiveTitle,locale);
  assert.ok(copy.exclusiveSubtitle,locale);
 }
});

test('/experiences repeats the home page Exclusive Destinations tile under its heading',()=>{
 const source=readFileSync('app/experiences/ExperiencesContent.jsx','utf8');
 assert.match(source,/import \{HomeSectionTile\} from '\.\.\/components\/home\/HomeSectionRail'/);
 assert.match(source,/HOME_SECTIONS\.find\(section=>section\.id==='exclusive'\)/);
 assert.match(source,/const COUPLE_PHOTO='https:\/\/media-cdn\.tripadvisor\.com\/media\/attractions-splice-spp-720x480\/15\/c0\/d4\/88\.jpg'/);
 assert.match(source,/image:COUPLE_PHOTO/);
 assert.match(source,/\{!exclusive&&EXCLUSIVE_TILE&&<div className="mt-7"><HomeSectionTile section=\{EXCLUSIVE_TILE\} exclusive=\{labels\.exclusiveTitle\} className="g1-home-section--feature"\/>/);
 assert.match(readFileSync('app/design-system.css','utf8'),/\.g1-home-section\.g1-home-section--feature \{[^}]*height: clamp\(180px, 24vw, 260px\)/);
 assert.match(readFileSync('app/components/home/HomeSectionRail.jsx','utf8'),/export function HomeSectionTile\(/);
 assert.equal(HOME_SECTIONS.find(section=>section.id==='exclusive').href,'/exclusive-destinations');
});

test('the new page is in the sitemap, linked from Travel and the home rail',()=>{
 assert.ok(SECTION_ROUTES.includes('/exclusive-destinations'));
 assert.ok(sitemapEntries({}).some(entry=>entry.url.endsWith('/exclusive-destinations')));
 assert.ok(HOME_SECTIONS.some(section=>section.id==='exclusive'&&section.href==='/exclusive-destinations'));
 assert.match(readFileSync('app/travel/page.js','utf8'),/href: '\/exclusive-destinations'/);
 assert.match(readFileSync('app/exclusive-destinations/page.js','utf8'),/path: '\/exclusive-destinations'/);
});
