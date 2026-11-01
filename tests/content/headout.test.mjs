import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HEADOUT_COLLECTIONS,HEADOUT_AFFILIATE_CODE,HEADOUT_CATALOGUE_URL,getHeadoutCollection,headoutGalleryUrl} from '../../lib/headoutCatalog.mjs';
import {HEADOUT_COPY} from '../../lib/headoutCopy.mjs';
import {getExperiences} from '../../lib/experiencesData.js';
import {OWNED_RECORDS} from '../../scripts/i18n/owned-inventory.mjs';
import config from '../../next.config.js';

test('all imported collections retain the partner attribution and approved media origin',()=>{
 assert.equal(HEADOUT_COLLECTIONS.length,48);
 assert.equal(new Set(HEADOUT_COLLECTIONS.map(item=>item.slug)).size,48);
 for(const item of HEADOUT_COLLECTIONS){
  const link=new URL(item.href),image=new URL(item.image);
  assert.equal(link.origin,'https://www.headout.com');
  assert.equal(link.searchParams.get('affiliate_code'),HEADOUT_AFFILIATE_CODE);
  assert.match(link.pathname,new RegExp('-'+(item.type==='experience'?'e':'c')+'-'+item.id+'/$'));
  assert.equal(image.origin,'https://cdn-imgix.headout.com');
  assert.ok(['miami','orlando','tampa','helicopters'].includes(item.region));
  assert.equal(getHeadoutCollection(item.slug),item);
 }
 assert.equal(new URL(HEADOUT_CATALOGUE_URL).searchParams.get('affiliate_code'),HEADOUT_AFFILIATE_CODE);
});
test('supplier galleries use pinned origins and registered categories; unknown input cannot generate an embed',()=>{
 assert.equal(getHeadoutCollection('../../admin'),undefined);
 assert.equal(headoutGalleryUrl({id:'5426',region:'miami'}),null);
 for(const item of HEADOUT_COLLECTIONS){
  const src=headoutGalleryUrl(item);
  if(item.region==='helicopters'||item.type==='experience'){assert.equal(src,null);continue;}
  const url=new URL(src);
  assert.equal(url.origin,'https://partner.headout.com');
  assert.equal(url.searchParams.get('category'),item.id);
  assert.equal(url.searchParams.get('affiliateCode'),HEADOUT_AFFILIATE_CODE);
  assert.equal(url.searchParams.get('city'),item.region.toUpperCase());
 }
});
test('search uses real partner collections without fabricated prices or translating supplier material',()=>{
 assert.deepEqual(getExperiences().map(item=>item.slug),HEADOUT_COLLECTIONS.map(item=>item.slug));
 assert.ok(getExperiences().every(item=>item.price===''&&item.duration===''&&item.supplier==='Headout'));
 assert.ok(!OWNED_RECORDS.some(({record})=>record.supplier==='Headout'));
});
test('the new interface covers sixteen languages and retired Stores URLs have compatible destinations',async()=>{
 assert.equal(Object.keys(HEADOUT_COPY).length,16);
 for(const copy of Object.values(HEADOUT_COPY)){
  assert.deepEqual(Object.keys(copy),Object.keys(HEADOUT_COPY.en));
  assert.ok(Object.values(copy).every(value=>value.trim()));
 }
 const redirects=await config.redirects();
 assert.equal(redirects.find(rule=>rule.source==='/stores/:path*').destination,'/experiences');
 assert.equal(redirects.find(rule=>rule.source==='/stores/restaurants').destination,'/restaurants-nightlife');
});
