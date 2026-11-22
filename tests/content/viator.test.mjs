import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VIATOR_MIAMI,VIATOR_SINGLE_CARDS,VIATOR_DIRECT_CARDS,getViatorCopy} from '../../lib/viatorCatalogue.mjs';
import {readFileSync} from 'node:fs';
import {EXPERIENCE_CARDS,getExperienceCards,getViatorExperience,VIATOR_EXPERIENCE_SLUGS} from '../../lib/experienceCards.mjs';
import {OWNED_RECORDS} from '../../scripts/i18n/owned-inventory.mjs';
import {HEADOUT_COPY} from '../../lib/headoutCopy.mjs';
import config from '../../next.config.js';

test('Viator widget and referrals retain the verified account and registered widget',()=>{
 assert.equal(VIATOR_MIAMI.partnerId,'P00329248');
 assert.equal(VIATOR_MIAMI.widgetRef,'W-09e5f18c-817b-4322-ac50-af173c3ff4ff');
 const frame=new URL(VIATOR_MIAMI.src);
 assert.equal(frame.origin,'https://www.viator.com');
 assert.equal(frame.pathname,`/widget/partner/${VIATOR_MIAMI.partnerId}/${VIATOR_MIAMI.widgetRef}`);
 assert.equal(frame.searchParams.get('widgetPreview'),'false');
 for(const href of [VIATOR_MIAMI.href,VIATOR_MIAMI.helicopterHref]){
  const url=new URL(href);
  assert.equal(url.origin,frame.origin);
  assert.equal(url.searchParams.get('pid'),VIATOR_MIAMI.partnerId);
  assert.equal(url.searchParams.get('campaign'),'miami-elio-miami');
 }
 assert.match(new URL(VIATOR_MIAMI.helicopterHref).pathname,/\/tours\/Miami\//);
 assert.ok(Object.isFrozen(VIATOR_MIAMI));
});

test('reused interface copy names the booking provider without changing Headout translations',()=>{
 const before=JSON.stringify(HEADOUT_COPY);
 for(const locale of Object.keys(HEADOUT_COPY)){
  const copy=getViatorCopy(locale);
  assert.match(copy.disclosure,/Viator/);
  assert.match(copy.fallback,/Viator/);
  assert.match(copy.open,/Viator/);
  assert.ok(!Object.values(copy).some(value=>value.includes('Headout')));
 }
 assert.equal(JSON.stringify(HEADOUT_COPY),before);
 assert.equal(getViatorCopy('invalid').open,getViatorCopy('en').open);
});

test('all twenty referrals retain attribution in native cards with each product\'s own Partner API photo',()=>{
 const all=EXPERIENCE_CARDS,miami=getExperienceCards('miami');
 assert.equal(all.length,86);
 assert.equal(miami.length,44);
 assert.equal(VIATOR_SINGLE_CARDS.length,20);
 assert.equal(new Set(all.map(item=>item.id)).size,86);
 assert.deepEqual(new Set(miami.slice(0,3).map(item=>item.supplier)),new Set(['Headout','Viator']));
 assert.deepEqual(getExperienceCards('unknown'),[]);
 for(const widget of VIATOR_SINGLE_CARDS){
  const card=all.find(item=>item.supplier==='Viator'&&item.productCode===widget.productCode);
  assert.equal(card.src,widget.src);
  // The card opens our own page; the referral is kept for "Open on Viator".
  assert.equal(card.href,'/experiences/viator/'+widget.productCode.toLowerCase());
  assert.equal(card.partnerHref,widget.href);
  const frame=new URL(card.src),link=new URL(card.partnerHref);
  assert.equal(frame.origin,'https://www.viator.com');
  assert.equal(frame.pathname,`/widget/partner/P00329248/${widget.widgetRef}`);
  assert.equal(frame.searchParams.get('widgetPreview'),'false');
  assert.equal(link.origin,frame.origin);
  assert.equal(link.searchParams.get('pid'),'P00329248');
  assert.equal(link.searchParams.get('widget_ref'),widget.widgetRef);
  assert.equal(link.searchParams.get('campaign'),'miami-elio-unified');
  assert.match(card.image,/^https:\/\/media-cdn\.tripadvisor\.com\/media\/attractions-splice-spp-720x480\//);
  assert.equal(card.imageCredit,'Viator');
  assert.ok(!card.illustrative,'a product photo is not an illustration');
  assert.ok(!['image','price','reviews','title'].some(key=>key in widget));
 }
 assert.equal(new Set(VIATOR_SINGLE_CARDS.map(widget=>all.find(item=>item.productCode===widget.productCode).image)).size,20,'every tour has its own photo');
 assert.ok(!OWNED_RECORDS.some(({record})=>record.supplier==='Viator'));
 assert.equal(miami[1].productCode,'231628P7');
});

test('direct Viator cards open Viator with the partner referral and have no page of ours',()=>{
 assert.ok(VIATOR_DIRECT_CARDS.length>=1);
 for(const direct of VIATOR_DIRECT_CARDS){
  const card=EXPERIENCE_CARDS.find(item=>item.productCode===direct.productCode);
  assert.equal(card.kind,'viator');
  assert.equal(card.direct,true);
  const link=new URL(card.href);
  assert.equal(link.origin,'https://www.viator.com');
  assert.ok(link.pathname.endsWith('-'+direct.productCode));
  assert.equal(link.searchParams.get('pid'),'P00329248');
  assert.equal(link.searchParams.get('mcid'),'42383');
  assert.match(card.image,/^https:\/\/media-cdn\.tripadvisor\.com\//);
  assert.ok(!VIATOR_EXPERIENCE_SLUGS.includes(direct.productCode.toLowerCase()));
 }
});

test('Exclusive Destinations adds seventeen private and VIP offers, each with its own photo',()=>{
 const added=VIATOR_DIRECT_CARDS.filter(direct=>direct.productCode!=='170398P1');
 assert.equal(added.length,17);
 const cards=added.map(direct=>EXPERIENCE_CARDS.find(item=>item.productCode===direct.productCode));
 const taken=new Set([...VIATOR_SINGLE_CARDS.map(widget=>EXPERIENCE_CARDS.find(item=>item.productCode===widget.productCode).image),EXPERIENCE_CARDS.find(item=>item.id==='headout-3124').image]);
 assert.equal(new Set(cards.map(card=>card.image)).size,17,'every offer has its own photo');
 for(const card of cards){
  assert.ok(!taken.has(card.image),card.id+' reuses a photo');
  assert.ok(['boats','florida-flights','nature'].includes(card.section),card.id);
  assert.ok(card.title&&card.titleRu&&card.location,card.id);
  assert.equal(card.imageCredit,'Viator');
  assert.equal(card.region,card.location==='Miami / South Florida'?'miami':'south-florida',card.id);
 }
 assert.equal(cards.filter(card=>card.region==='miami').length,12);
});

test('Miami Boat Tours shows a boat photo credited to Viator and still opens the Headout page',()=>{
 const card=EXPERIENCE_CARDS.find(item=>item.id==='headout-3124');
 assert.equal(card.title,'Miami Boat Tours');
 assert.equal(card.supplier,'Headout');
 assert.equal(card.href,'/experiences/'+card.slug);
 assert.match(card.image,/^https:\/\/media-cdn\.tripadvisor\.com\/media\/attractions-splice-spp-720x480\//);
 assert.equal(card.imageCredit,'Viator');
});

test('every Viator card has a page of ours, found only through the registry',()=>{
 assert.equal(VIATOR_EXPERIENCE_SLUGS.length,20);
 assert.equal(new Set(VIATOR_EXPERIENCE_SLUGS).size,20);
 for(const slug of VIATOR_EXPERIENCE_SLUGS){
  assert.match(slug,/^[0-9a-z]+$/);
  const item=getViatorExperience(slug);
  assert.equal(item.kind,'viator');
  assert.equal(item.href,'/experiences/viator/'+slug);
  assert.equal(new URL(item.src).origin,'https://www.viator.com');
 }
 for(const unknown of ['', 'nope', '28744P2', '../yachts', 'https://evil.example', null, undefined, 42])assert.equal(getViatorExperience(unknown),null);
 const page=readFileSync('app/experiences/viator/[code]/page.js','utf8');
 assert.match(page,/if\(!item\)notFound\(\)/);
 const view=readFileSync('app/experiences/ViatorCollection.jsx','utf8');
 assert.match(view,/getViatorExperience\(slug\)/);
 assert.match(view,/VIATOR_MIAMI\.src/);
 assert.match(view,/partnerHref/);
});

test('Viator and Headout cards stay inside the site; only official sites and direct Viator cards open outside',()=>{
 const source=readFileSync('app/experiences/ExperienceCard.jsx','utf8');
 assert.match(source,/const external=item\.kind==='official'\|\|item\.direct===true;/);
 for(const card of EXPERIENCE_CARDS.filter(item=>item.kind!=='official'&&!item.direct))assert.match(card.href,/^\/experiences\//,card.id);
});

test('the Viator pages are in the sitemap',async()=>{
 const {default:sitemap}=await import('../../app/sitemap.js').catch(()=>({default:null}));
 const urls=sitemap?(await sitemap()).map(entry=>entry.url):readFileSync('app/sitemap.js','utf8');
 if(Array.isArray(urls))for(const slug of VIATOR_EXPERIENCE_SLUGS)assert.ok(urls.some(url=>url.endsWith('/experiences/viator/'+slug)),slug);
 else assert.match(urls,/VIATOR_EXPERIENCE_SLUGS\.map\(\(slug\) => `viator\/\$\{slug\}`\)/);
});

test('legacy Miami helicopter URL points into the combined catalogue',async()=>{
 assert.equal((await config.redirects()).find(rule=>rule.source==='/experiences/helicopter-tours-miami').destination,'/experiences#experience-viator-231628p7');
});
