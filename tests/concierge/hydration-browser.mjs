// Opt-in hosted reload regression. Uses real UI/storage; never invokes a model.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {expect as browserExpect} from '@playwright/test';
import {launchConciergeBrowser} from './browser-engine.mjs';
import {SUPPORTED_LANGUAGES,getLanguageDir} from '../../lib/languages.js';
import {hostedContext,stagingBase} from '../../scripts/concierge/hosted-context.mjs';

assert.equal(process.env.CONCIERGE_TEST_BASE,stagingBase,'Restricted to private staging');
const {base,cookie,identity}=await hostedContext();
const output=process.env.CONCIERGE_HYDRATION_RESULTS;
assert.ok(output&&path.isAbsolute(output));
fs.mkdirSync(output,{recursive:true});
const browser=await launchConciergeBrowser();
const expect=browserExpect.configure({timeout:15000}),results=[];
const card={id:'yachts',title:'Yacht Rentals',href:'/yachts',type:'category'};
const query='QA saved yacht request';
try{
 for(const {code:locale} of SUPPORTED_LANGUAGES){
  const context=await browser.newContext({viewport:{width:['ar','he','fa'].includes(locale)?320:390,height:900},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],navigations=[],blocked=[];
  page.setDefaultNavigationTimeout(30000);
  await context.addCookies([{name:'gorgona-locale',value:locale,url:base},{name:cookie.slice(0,cookie.indexOf('=')),value:cookie.slice(cookie.indexOf('=')+1),url:base,secure:true,httpOnly:true,sameSite:'Lax'}]);
  await context.addInitScript(({locale,card,query})=>{
   // Seed once, allowing actual app writes to survive later document loads.
   if(sessionStorage.getItem('qa-hydration-seeded'))return;
   localStorage.setItem('gorgona-locale',locale);
   localStorage.setItem('gorgona-ai-session',JSON.stringify({saved:[card],history:[{id:'qa-search',query,results:[card]}]}));
   sessionStorage.setItem('gorgona-concierge-thread',JSON.stringify({messages:[{role:'user',content:query},{role:'assistant',content:'QA saved response'}],cards:[card],suggestions:[]}));
   sessionStorage.setItem('qa-hydration-seeded','1');
  },{locale,card,query});
  await context.route('**/api/**',route=>{
   const request=route.request(),pathname=new URL(request.url()).pathname;
   // Listing photographs are ordinary read-only assets on the destination page.
   if(request.method()==='GET'&&pathname.startsWith('/api/listing-media/'))return route.continue();
   blocked.push(pathname);return route.abort('blockedbyclient');
  });
  page.on('pageerror',error=>errors.push({message:error.message,stack:error.stack,url:page.url()}));
  page.on('console',message=>{if(/hydration|hydrating|Minified React error #418/i.test(message.text()))errors.push({message:message.text(),url:page.url()});});
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push({url:frame.url(),at:new Date().toISOString()});});
  try{
   for(const load of ['cold','reload']){
    if(load==='cold')await page.goto(base+'/discovery');else await page.reload();
    await expect(page.locator('main form input')).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('html')).toHaveAttribute('dir',getLanguageDir(locale));
    await expect(page.locator('main').getByText(query,{exact:true})).toBeVisible();
    await expect(page.locator('main a[href="/yachts"]').first()).toBeVisible();
    await page.locator('button.aidock').click();
    await expect(page.locator('.dr__histQ')).toContainText(query);
    await expect(page.locator('.dr__rowMain').first()).toBeVisible();
    await page.keyboard.press('Escape');
    assert.deepEqual(errors,[],'Hydration/runtime errors');
    results.push({locale,load,status:'PASS'});
   }
   // Follow the restored recommendation, then restore through a fresh document.
   await page.locator('main a[href="/yachts"]').first().click();
   await expect(page).toHaveURL(base+'/yachts');
   await page.goto(base+'/discovery');
   await expect(page.locator('main form input')).toBeEnabled();
   await expect(page.locator('main').getByText(query,{exact:true})).toBeVisible();
   assert.deepEqual(errors,[],'Errors after restored recommendation navigation');
   assert.deepEqual(blocked,[],'Passive restoration must not invoke model/booking/other APIs');
   results.push({locale,load:'recommendation-return',status:'PASS'});
  }catch(error){
   await page.screenshot({path:path.join(output,locale+'.png'),animations:'disabled'}).catch(()=>{});
   results.push({locale,status:'FAIL',error:error.message,errors,navigations,blocked});
   console.error(JSON.stringify(results.at(-1)));
  }finally{await context.close();}
  console.log(JSON.stringify({locale,pass:results.filter(r=>r.locale===locale&&r.status==='PASS').length,fail:results.filter(r=>r.locale===locale&&r.status==='FAIL').length}));
 }
}finally{
 await browser.close();
 const report={base,identity,at:new Date().toISOString(),browserEngine:browser.browserType().name(),browserVersion:browser.version(),modelRequestsBlocked:true,apiPolicy:'Block all API requests except GET listing-media images',results,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length};
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({pass:report.pass,fail:report.fail}));
 if(report.fail)process.exitCode=1;
}
