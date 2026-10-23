// Local production-server acceptance. Never submits bookings or writes to a hosted service.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import '../../lib/savedServerCatalog.js';
import {getRentals} from '../../lib/rentalsData.js';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
import {savedListing} from '../../lib/savedCopy.js';

const root=process.cwd(),output=path.resolve(process.env.FLEET_QA_OUTPUT||path.join(root,'docs/fleet-import/qa'));
fs.mkdirSync(output,{recursive:true});
const port=String(process.env.FLEET_QA_PORT||3047),base='http://127.0.0.1:'+port;
const log=fs.openSync(path.join(output,'server.log'),'w');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{cwd:root,stdio:['ignore',log,log],windowsHide:true});
let browser;
const results={newVehiclePages:0,existingVehiclePages:0,localizedDescriptions:0,viewports:[],errors:[]};
try{
 let ready=false;
 for(let i=0;i<80;i++){
  if(server.exitCode!==null)throw Error('Local server exited');
  try{if((await fetch(base+'/rentals',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(ready,'Local production server must start');
 browser=await chromium.launch({headless:true,...(process.env.FLEET_BROWSER_EXECUTABLE?{executablePath:process.env.FLEET_BROWSER_EXECUTABLE}:{channel:'chrome'})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 page.on('pageerror',error=>results.errors.push(error.message));
 // Keep acceptance isolated from unrelated affiliate/network widgets.
 await context.route('**/*',route=>{
  const url=route.request().url();
  return url.startsWith(base)||url.startsWith('data:')?route.continue():route.abort();
 });
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  await page.goto(base+'/rentals');
  await expect(page.locator('main article')).toHaveCount(30);
  await expect(page.locator('main h3 a[href="/rentals/bmw-x5-white-brown"]')).toHaveCount(1);
  await expect(page.locator('main h3 a[href="/rentals/bmw-x5-brooklyn-grey-brown"]')).toHaveCount(1);
  await expect(page.locator('main a[href="/rentals/mercedes-g-class-white"]')).toHaveCount(0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const image of await page.locator('main article img').all()){
   await image.scrollIntoViewIfNeeded();
   await expect(async()=>assert.ok(await image.evaluate(img=>img.complete&&img.naturalWidth>0))).toPass();
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  // Full-page captures otherwise reveal the closed dock transformed below
  // the actual viewport. Only already-hidden/inert UI is excluded from captures.
  await page.screenshot({path:path.join(output,`fleet-${viewport.width}.png`),fullPage:true,style:'[inert][aria-hidden="true"] { visibility: hidden !important; }'});
  await page.goto(base+'/rentals?type=SUVs');
  await expect(page.locator('main article')).toHaveCount(getRentals().filter(v=>v.category==='SUVs').length);
  await expect(page.locator('main article').nth(1).locator('h3')).toHaveText('BMW X5 · White');
  results.viewports.push(viewport);
 }
 await page.setViewportSize({width:1440,height:1000});
 const plans=JSON.parse(fs.readFileSync(path.join(root,'docs/fleet-import/decisions.json'),'utf8'));
 const legacy=await context.request.get(base+'/rentals/mercedes-g-class-white',{maxRedirects:0});
 assert.equal(legacy.status(),308);assert.equal(new URL(legacy.headers().location,base).pathname,'/rentals/bmw-x5-white-brown');
 const added=new Set(plans.vehicles.filter(v=>v.action==='add').map(v=>v.targetSlug));
 for(const car of getRentals()){
  const response=await page.goto(base+'/rentals/'+car.slug);
  assert.equal(response.status(),200,car.slug);
  await expect(page.locator('h1')).toHaveText(car.title);
  assert.ok((await page.locator('main').innerText()).includes(car.description));
  assert.doesNotMatch(await page.locator('main').innerText(),/[$€£]\s?\d/);
  const images=page.locator('main figure img').first();
  await expect(images).toBeVisible();
  await expect(async()=>assert.ok(await images.evaluate(img=>img.complete&&img.naturalWidth>0))).toPass();
  const strip=page.locator('main [role="group"] button');
  const gallerySources=await strip.locator('img').evaluateAll(els=>els.map(e=>e.getAttribute('src')));
  const reviewedPrefixes={
   'mercedes-amg-cle-53-cabriolet':'/images/rentals/mercedes-amg-cle-53/',
   'mercedes-cle300-white-beige':'/images/rentals/miami-source/mercedes-benz-cle300-convertbile-whitebrown-',
   'mercedes-gls-white':'/images/rentals/mercedes-gls-white/',
   'mercedes-gls450-white-brown':'/images/rentals/miami-source/mercedes-benz-gls450-whitebrown-',
   'bmw-x5-brooklyn-grey-brown':'/images/rentals/miami-source/bmw-x5-brooklyn-greybrown-'
  };
  if(reviewedPrefixes[car.slug])assert.ok(gallerySources.every(src=>src.startsWith(reviewedPrefixes[car.slug])),car.slug);
  if(car.slug==='bmw-x5-white-brown')assert.ok(gallerySources.every(src=>!src.includes('brooklyn')&&!src.includes('mercedes')));
  if(await strip.count()>1){
   const target=await strip.last().locator('img').getAttribute('src');
   await strip.last().click();
   await expect(images).toHaveAttribute('src',target);
  }
  await expect(page.locator('main form')).toBeVisible();
  if(added.has(car.slug))results.newVehiclePages++;else results.existingVehiclePages++;
 }
 const car=getRentals().find(v=>added.has(v.slug));
 for(const language of SUPPORTED_LANGUAGES){
  await context.addCookies([{name:'gorgona-locale',value:language.code,url:base}]);
  // Verify server output without client storage overriding the explicit locale cookie.
  const response=await context.request.get(base+'/rentals/'+car.slug);
  assert.equal(response.status(),200);
  const html=await response.text();
  const expected=savedListing(language.code,car).replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;');
  assert.ok(html.includes(expected),language.code);
  results.localizedDescriptions++;
 }
 await context.addCookies([{name:'gorgona-locale',value:'ru',url:base}]);
 await page.goto(base+'/rentals/'+car.slug);
 await page.screenshot({path:path.join(output,'detail-desktop.png'),fullPage:true,style:'[inert][aria-hidden="true"] { visibility: hidden !important; }'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(output,'detail-mobile.png'),fullPage:true,style:'[inert][aria-hidden="true"] { visibility: hidden !important; }'});
 assert.deepEqual(results.errors,[]);
 results.status='PASS';
 console.log(JSON.stringify(results,null,2));
}catch(error){results.status='FAIL';results.failure=error.stack;throw error;}
finally{
 fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2)+'\n');
 await browser?.close();
 if(server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});
 fs.closeSync(log);
}
