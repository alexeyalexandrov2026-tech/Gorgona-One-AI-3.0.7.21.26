import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { getRentals, getRentalBySlug } from '../../lib/rentalsData.js';
import { rentalPage, RENTALS_PAGE_SIZE } from '../../lib/sunsetFleet.mjs';
import { SUNSET_COPY } from '../../lib/sunsetCopy.mjs';
const read = file => JSON.parse(fs.readFileSync(new URL('../../'+file, import.meta.url), 'utf8'));
const source = read('docs/sunset-import/source-inventory.json');

test('every published source car has a distinct native Miami Elio listing', () => {
  const imported = getRentals().filter(car => car.supplier === 'Sunset Exotics');
  assert.equal(source.vehicles.length, 260);
  assert.equal(imported.length, source.vehicles.length);
  assert.equal(new Set(getRentals().map(car => car.slug)).size, getRentals().length);
  for (const row of source.vehicles) {
    const car = getRentalBySlug('sunset-'+row.slug);
    assert.ok(car, row.slug);
    assert.equal(car.title,row.title); assert.equal(car.description,row.description);
    assert.equal(car.sourceId,row.id); assert.equal(car.location,row.location || 'On request');
    assert.equal(car.dailyPrice, '$'+row.price_per_day.toLocaleString('en-US'));
    assert.equal(car.featured,false); assert.equal(car.availability,'Enquire');
    assert.ok(car.thumbnail.startsWith('/images/rentals/sunset/'));
  }
});

test('all source photographs, structured specs and complete descriptions survive the import', () => {
  const details = read('lib/server/sunsetFleetDetails.json');
  const assets = read('docs/sunset-import/assets.json').assets;
  for (const row of source.vehicles) {
    const detail = details['sunset-'+row.slug]; assert.ok(detail);
    for (const url of row.images) {
      const asset = assets.find(a=>a.sourceUrl===url); assert.ok(asset,url);
      assert.ok(detail.gallery.includes(asset.preview),row.slug+': '+url);
    }
    assert.deepEqual(detail.richContent,row.rich_content);
    assert.deepEqual(detail.amenities,row.amenities);
    assert.equal(detail.didYouKnow,row.did_you_know);
    for (const [key,value] of Object.entries(row.specs)) if(!key.startsWith('cover_'))assert.deepEqual(detail.specs[key],value);
    assert.equal(detail.gallery.length, detail.galleryThumbnails.length);
    assert.equal(new Set(detail.gallery).size, detail.gallery.length);
  }
});

test('import integrity covers local image bytes without supplier runtime hotlinks', () => {
  const manifest=read('docs/sunset-import/assets.json');
  for(const asset of manifest.assets){
    for(const key of ['path','preview','thumbnail']){
      const bytes=fs.readFileSync(new URL('../../public'+asset[key],import.meta.url));
      assert.ok(bytes.length>0,asset[key]);
      if(key==='path')assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.publishedSha256);
    }
    assert.ok(asset.width>0 && asset.height>0);
  }
  const summaries=read('lib/sunsetFleetSummary.json');
  assert.ok(summaries.every(car=>!('richContent' in car)&&!('gallery' in car)), 'long descriptions and complete galleries stay out of client inventory');
});

test('source cards use our existing booking route with manual confirmation and payment', () => {
  const detail=fs.readFileSync(new URL('../../app/rentals/[slug]/page.js',import.meta.url),'utf8');
  const form=fs.readFileSync(new URL('../../app/components/BookingForm.jsx',import.meta.url),'utf8');
  assert.match(detail,/BookingForm/);
  assert.doesNotMatch(detail,/href=\{[^}]*sourceUrl/);
  assert.match(form,/fetch\('\/api\/book'/);
  assert.doesNotMatch(form,/sunsetexoticsmiami\.com|stripe|\/checkout/i);
});

test('pagination reaches every car once and applies location and body filters first',()=>{
  const cars=getRentals(),slugs=[];
  for(let page=1;page<=rentalPage(cars).totalPages;page++){
    const result=rentalPage(cars,{page});assert.ok(result.cars.length<=RENTALS_PAGE_SIZE);
    slugs.push(...result.cars.map(car=>car.slug));
  }
  assert.deepEqual(slugs,cars.map(car=>car.slug));
  const result=rentalPage(cars,{location:'New York City, NY',type:'SUVs',page:999});
  assert.ok(result.cars.every(car=>car.location==='New York City, NY'&&car.category==='SUVs'));
  assert.equal(rentalPage(cars,{page:'NaN'}).current,1);
  assert.equal(rentalPage(cars,{location:'unknown'}).total,0);
});

test('new catalogue controls cover sixteen locales with matching placeholders',()=>{
  assert.equal(Object.keys(SUNSET_COPY).length,16);
  for(const [locale,copy]of Object.entries(SUNSET_COPY)){
    assert.deepEqual(Object.keys(copy).sort(),Object.keys(SUNSET_COPY.en).sort(),locale);
    for(const [key,value]of Object.entries(copy))assert.ok(typeof value==='string'&&value.trim(),locale+key);
    assert.deepEqual(copy.pages.match(/\{\w+\}/g).sort(),['{n}','{total}']);
  }
});
