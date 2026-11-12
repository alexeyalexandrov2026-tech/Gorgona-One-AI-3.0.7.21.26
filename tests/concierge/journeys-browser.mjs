// Hosted navigation acceptance with the actual chat transport deliberately offline.
// Synthetic queries only. Every chat and other write is blocked before the server.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {expect as browserExpect} from '@playwright/test';
import {launchConciergeBrowser} from './browser-engine.mjs';
import {hostedContext,stagingBase} from '../../scripts/concierge/hosted-context.mjs';
import {cases,followups} from './scenarios.mjs';
import {unavailableReply} from '../../lib/ai/locale.js';
assert.ok(process.env.CONCIERGE_TEST_BASE===stagingBase||(process.env.CONCIERGE_TEST_BASE==='https://gorgona-one.com'&&process.env.CONCIERGE_PUBLIC_READONLY==='1'),'Use protected staging or explicitly opted-in read-only public QA');
const {base,cookie,identity}=await hostedContext(),output=process.env.CONCIERGE_JOURNEY_RESULTS;
assert.ok(output&&path.isAbsolute(output));fs.mkdirSync(output,{recursive:true});
const browser=await launchConciergeBrowser(),expect=browserExpect.configure({timeout:15000});
const results=[],transport=[],unexpectedWrites=[],destinationStatus=new Map();
let blockedTelemetry=0;
const locales=[...new Set(cases.map(c=>c.locale))],selected=process.argv.slice(2);
assert.ok(selected.every(locale=>locales.includes(locale)),'Unknown test locale');
const returnMode=process.env.CONCIERGE_JOURNEY_RETURN||'dock';
assert.ok(['dock','reload'].includes(returnMode),'Use dock or reload return mode');
const snapshot=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('gorgona-concierge-thread')||'null'));
try{
 for(const locale of selected.length?selected:locales){
  const context=await browser.newContext({viewport:{width:['ar','he','fa'].includes(locale)?320:390,height:900},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.setDefaultNavigationTimeout(30000);
  await context.addCookies([{name:'gorgona-locale',value:locale,url:base}]);
  if(cookie)await context.addCookies([{name:cookie.slice(0,cookie.indexOf('=')),value:cookie.slice(cookie.indexOf('=')+1),url:base,secure:true,httpOnly:true,sameSite:'Lax'}]);
  // Locale belongs to our top-level page, not protected supplier iframe storage.
  await context.addInitScript(locale=>{if(window===window.top)localStorage.setItem('gorgona-locale',locale);},locale);
  await context.route(base+'/**',async route=>{
   const req=route.request(),pathname=new URL(req.url()).pathname;
   if(pathname==='/api/chat'){
    const body=req.postDataJSON();
    transport.push({locale:body.locale,method:req.method(),id:req.headers()['idempotency-key'],latest:body.messages.at(-1)?.content});
    await route.abort('blockedbyclient');return;
   }
   // Cloudflare's reserved RUM endpoint is telemetry, not an application write.
   // Keep blocking it so synthetic visits do not submit performance samples.
   if(req.method()==='POST'&&pathname==='/cdn-cgi/rum'){blockedTelemetry++;await route.abort('blockedbyclient');return;}
   if(!['GET','HEAD'].includes(req.method())){unexpectedWrites.push({pathname,method:req.method()});await route.abort('blockedbyclient');return;}
   await route.continue();
  });
  page.on('pageerror',e=>errors.push(e.message));
  async function send(text){
   const before=transport.length,form=page.locator('main form');
   await expect(form.locator('input')).toBeEnabled();
   await form.locator('input').fill(text);await form.locator('button[type="submit"]').click();
   await expect.poll(()=>transport.length).toBe(before+1);
   await expect(form.locator('input')).toBeEnabled();
   // UI readiness can precede React's passive storage write, especially in WebKit.
   // Wait for this specific completed turn, rather than reading a previous turn.
   await expect.poll(async()=>{const s=await snapshot(page);return [s?.messages.at(-2)?.role,s?.messages.at(-2)?.content,s?.messages.at(-1)?.role];}).toEqual(['user',text,'assistant']);
   const saved=await snapshot(page),last=transport.at(-1);
   assert.equal(last.locale,locale);assert.equal(last.method,'POST');assert.equal(last.latest,text);
   assert.match(last.id||'',/^[0-9a-f-]{36}$/i);
   assert.equal(saved.messages.at(-1)?.role,'assistant');
   assert.equal(saved.messages.at(-1)?.content,unavailableReply(locale),'Offline status must be honest and localized');
   assert.equal(page.url(),base+'/discovery','Recommendations must wait for a click');
   return saved;
  }
  async function returnToDiscovery(){
   if(page.url()===base+'/discovery')return;
   if(returnMode==='reload'){await page.goto(base+'/discovery');return;}
   await page.getByRole('button',{name:'Open the Discovery Room concierge',exact:true}).click();
   await page.locator('aside[role="dialog"] a[href="/discovery"]').click();
   await expect(page).toHaveURL(base+'/discovery');
  }
  async function check(name,operation){
   errors.length=0;
   try{await operation();assert.deepEqual(errors,[]);results.push({name,locale,status:'PASS'});}
   catch(error){await page.screenshot({path:path.join(output,locale+'-'+results.length+'.png'),animations:'disabled'}).catch(()=>{});results.push({name,locale,status:'FAIL',error:error.message,errors:[...errors],url:page.url()});}
   console.log(JSON.stringify(results.at(-1)));
  }
  try{
   await page.goto(base+'/discovery');
   for(const c of cases.filter(c=>c.locale===locale))await check(c.query,async()=>{
    await returnToDiscovery();
    const saved=await send(c.query);assert.equal(saved.cards[0]?.href,c.expected);
    if(c.also)assert.ok([...saved.cards,...saved.suggestions].some(x=>x.href===c.also),'Mixed intent must retain both destinations');
    const link=page.locator('main a[href="'+c.expected+'"]').first();await expect(link).toBeVisible();
    await link.click();await expect(page).toHaveURL(base+c.expected);
    const key=locale+':'+c.expected;
    if(!destinationStatus.has(key)){const response=await context.request.get(base+c.expected,{maxRedirects:0});assert.equal(response.status(),200,'Destination must be a real page');destinationStatus.set(key,response.status());}
   });
   for(const f of followups.filter(f=>f.locale===locale))await check('follow-up '+f.expected,async()=>{
    await returnToDiscovery();await send(f.messages[0].content);
    const saved=await send(f.messages.at(-1).content);assert.equal(saved.cards[0]?.href,f.expected);
    await expect(page.locator('main a[href="'+f.expected+'"]').first()).toBeVisible();
   });
   await check('unrelated question clears product recommendations',async()=>{
    await returnToDiscovery();const saved=await send('What is 2 + 2?');
    assert.equal(saved.cards.length,0);assert.equal(saved.suggestions.length,0);
   });
  }finally{await context.close();}
 }
 assert.deepEqual(unexpectedWrites,[],'No reservation or other write may be attempted');
 assert.equal(new Set(transport.map(t=>t.id)).size,transport.length,'Each send must get a fresh request ID');
}catch(error){
 results.push({name:'journey setup/transport integrity',status:'FAIL',error:error.message});
}finally{
 await browser.close();
 const report={base,identity,at:new Date().toISOString(),browserEngine:browser.browserType().name(),browserVersion:browser.version(),returnMode,chatRequestsAborted:transport.length,blockedTelemetry,unexpectedWrites,checkedDestinations:destinationStatus.size,results,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length};
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({pass:report.pass,fail:report.fail,chatRequestsAborted:transport.length}));
 if(report.fail||unexpectedWrites.length)process.exitCode=1;
}
