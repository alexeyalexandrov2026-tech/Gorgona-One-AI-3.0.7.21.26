// Local production-server acceptance. Supplier/payment/network writes are blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {SUNSET_FLEET} from '../../lib/sunsetFleet.mjs';
import {getRentals} from '../../lib/rentalsData.js';
import details from '../../lib/server/sunsetFleetDetails.json' with {type:'json'};
const output=path.resolve(process.env.SUNSET_QA_OUTPUT||'../outputs/sunset-browser');
fs.mkdirSync(output,{recursive:true});
const port=process.env.SUNSET_QA_PORT||'3059',base='http://127.0.0.1:'+port;
const log=fs.openSync(path.join(output,'server.log'),'w');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{stdio:['ignore',log,log],windowsHide:true});
const report={pages:0,viewports:[],galleryChecks:0,fixtureSubmissions:0,externalWrites:0,errors:[]};
let browser;
try{
  let ready=false;
  for(let i=0;i<120;i++){
    if(server.exitCode!==null)throw Error('Preview server exited');
    try{if((await fetch(base+'/rentals',{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.ok(ready);
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.route('**/*',route=>{
    const req=route.request(),url=req.url();
    if(!url.startsWith(base)&&!url.startsWith('data:')){
      if(req.method()!=='GET')report.externalWrites++;
      return route.abort();
    }
    if(req.method()!=='GET')return route.abort();
    return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  // Every source page must render through our real server, with every gallery
  // thumbnail and each complete source description present in its response.
  const pending=[...SUNSET_FLEET];
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
  await Promise.all(Array.from({length:6},async()=>{
    for(let car;car=pending.shift();){
      const response=await context.request.get(base+'/rentals/'+car.slug);assert.equal(response.status(),200,car.slug);
      const html=await response.text();assert.ok(html.includes(escape(car.title)),car.slug);
      assert.ok(html.includes(escape(car.description)),car.slug);
      for(const photo of details[car.slug].galleryThumbnails)assert.ok(html.includes(photo),car.slug+': '+photo);
      for(const value of Object.values(details[car.slug].richContent))if(value)assert.ok(html.includes(escape(value)),car.slug+': full source text');
      assert.ok(html.includes('Sunset Exotics'));report.pages++;
    }
  }));
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.goto(base+'/rentals');
    await expect(page.locator('main article')).toHaveCount(24);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.goto(base+'/rentals?page=2');await expect(page.locator('main article')).toHaveCount(24);
    await expect(page.locator('main article a[href^="/rentals/sunset-"]').first()).toBeVisible();
    await page.screenshot({path:path.join(output,'catalogue-'+viewport.width+'.png'),fullPage:true});
    await page.goto(base+'/rentals?location=New+York+City%2C+NY&type=Sports');
    await expect(page.locator('main article')).toHaveCount(0);
    await expect(page.getByText('No cars match these filters.')).toBeVisible();
    const samples=[SUNSET_FLEET[0],SUNSET_FLEET.find(car=>details[car.slug].gallery.length===1),SUNSET_FLEET.find(car=>details[car.slug].gallery.indexOf(car.image)>0),SUNSET_FLEET.find(car=>car.location==='New York City, NY')];
    for(const car of samples){
      await page.goto(base+'/rentals/'+car.slug);await expect(page.locator('main h1')).toHaveText(car.title);
      const image=page.locator('main figure img').first();await expect(image).toHaveAttribute('src',car.image);
      await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
      const gallery=details[car.slug].gallery;
      if(gallery.length>1){await page.locator('main [role="group"] button').last().click();await expect(image).toHaveAttribute('src',gallery.at(-1));}
      await expect(page.locator('main form')).toBeVisible();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      report.galleryChecks++;
    }
    await page.screenshot({path:path.join(output,'detail-'+viewport.width+'.png'),fullPage:true});
    report.viewports.push(viewport);
  }
  // Exercise the real form and same-origin serialization with a labelled local
  // response fixture; persisted SQL behavior is tested separately, not claimed here.
  const car=SUNSET_FLEET[0];await page.goto(base+'/rentals/'+car.slug);
  let payload;
  await page.route('**/api/book',async route=>{
    assert.equal(route.request().method(),'POST');payload=route.request().postDataJSON();
    assert.ok(route.request().headers()['idempotency-key']);report.fixtureSubmissions++;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,bookingId:'11111111-1111-4111-8111-111111111111'})});
  });
  const form=page.locator('main form');await form.locator('input[autocomplete="name"]').fill('Local QA');
  await form.locator('input[type="email"]').fill('local@example.com');await form.locator('input[type="tel"]').fill('+13055550123');
  await form.locator('button[type="submit"]').click();await expect(page.getByText('Request sent',{exact:true})).toBeVisible();
  assert.equal(payload.itemSlug,car.slug);assert.equal(payload.itemTitle,car.title+' · Sunset Exotics');
  assert.ok(payload.dates.includes('Pickup / delivery: '+car.location));assert.ok(!payload.dates.includes('our garage'));
  assert.equal(report.fixtureSubmissions,1);
  for(const locale of ['ru','he']){
    await context.addCookies([{name:'gorgona-locale',value:locale,url:base}]);
    const response=await context.request.get(base+'/rentals/'+car.slug);assert.equal(response.status(),200);
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';report.cars=getRentals().length;
  console.log(JSON.stringify(report,null,2));
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();fs.closeSync(log);}
