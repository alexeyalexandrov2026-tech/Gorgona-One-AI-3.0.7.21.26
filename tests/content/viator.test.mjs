import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VIATOR_MIAMI,VIATOR_SINGLE_CARDS,getViatorCopy} from '../../lib/viatorCatalogue.mjs';
import {EXPERIENCE_CARDS,getExperienceCards} from '../../lib/experienceCards.mjs';
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

test('all twenty referrals retain attribution in native cards without republishing supplier images',()=>{
 const all=EXPERIENCE_CARDS,miami=getExperienceCards('miami');
 assert.equal(all.length,71);
 assert.equal(miami.length,32);
 assert.equal(VIATOR_SINGLE_CARDS.length,20);
 assert.equal(new Set(all.map(item=>item.id)).size,71);
 assert.deepEqual(new Set(miami.slice(0,3).map(item=>item.supplier)),new Set(['Headout','Viator']));
 assert.deepEqual(getExperienceCards('unknown'),[]);
 for(const widget of VIATOR_SINGLE_CARDS){
  const card=all.find(item=>item.supplier==='Viator'&&item.productCode===widget.productCode);
  assert.equal(card.src,widget.src);
  assert.equal(card.href,widget.href);
  const frame=new URL(card.src),link=new URL(card.href);
  assert.equal(frame.origin,'https://www.viator.com');
  assert.equal(frame.pathname,`/widget/partner/P00329248/${widget.widgetRef}`);
  assert.equal(frame.searchParams.get('widgetPreview'),'false');
  assert.equal(link.origin,frame.origin);
  assert.equal(link.searchParams.get('pid'),'P00329248');
  assert.equal(link.searchParams.get('widget_ref'),widget.widgetRef);
  assert.equal(link.searchParams.get('campaign'),'miami-elio-unified');
  assert.match(card.image,/^\/images\/experiences\//);
  assert.equal(new URL(card.imageSource).origin,'https://unsplash.com');
  assert.equal(card.imageLicense,'https://unsplash.com/license');
  assert.equal(card.illustrative,true);
  assert.ok(!['image','price','reviews','title'].some(key=>key in widget));
 }
 assert.ok(!OWNED_RECORDS.some(({record})=>record.supplier==='Viator'));
 assert.equal(miami[1].productCode,'231628P7');
});

test('legacy Miami helicopter URL points into the combined catalogue',async()=>{
 assert.equal((await config.redirects()).find(rule=>rule.source==='/experiences/helicopter-tours-miami').destination,'/experiences#experience-viator-231628p7');
});
