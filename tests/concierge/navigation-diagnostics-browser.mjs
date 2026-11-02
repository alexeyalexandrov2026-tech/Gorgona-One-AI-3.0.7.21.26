// Preserve raw WebKit diagnostics and independently capture native JS errors.
// Only narrowly proven departing-document cancellations are informational.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {expect as browserExpect} from '@playwright/test';
import {launchConciergeBrowser} from './browser-engine.mjs';
import {hostedContext,stagingBase} from '../../scripts/concierge/hosted-context.mjs';
assert.equal(process.env.CONCIERGE_TEST_BASE,stagingBase);
const {base,cookie,identity}=await hostedContext(),output=process.env.CONCIERGE_NAVIGATION_RESULTS;
assert.ok(output&&path.isAbsolute(output));fs.mkdirSync(output,{recursive:true});
const browser=await launchConciergeBrowser(),context=await browser.newContext(),page=await context.newPage();
const expect=browserExpect.configure({timeout:15000});
const raw=[],requests=[],failures=[],results=[];let blockedWrites=0;
await context.addCookies([{name:'gorgona-locale',value:'en',url:base},{name:cookie.slice(0,cookie.indexOf('=')),value:cookie.slice(cookie.indexOf('=')+1),url:base,secure:true,httpOnly:true,sameSite:'Lax'}]);
await context.addInitScript(()=>{
 if(window!==window.top)return;
 const documentId=crypto.randomUUID();
 const record=(kind,message='',extra={})=>{try{const data=JSON.parse(sessionStorage.getItem('qa-navigation-trace')||'[]');data.push({kind,message,url:location.href,documentId,at:Date.now(),...extra});sessionStorage.setItem('qa-navigation-trace',JSON.stringify(data.slice(-500)));}catch{}};
 // Observe the original promise without replacing its result or swallowing errors.
 const originalFetch=window.fetch;
 window.fetch=function(input,init){
  const requestId=crypto.randomUUID(),resource=new URL(input instanceof Request?input.url:String(input),location.href).href;
  const signal=init?.signal||(input instanceof Request?input.signal:null);
  record('fetch-start','',{requestId,resource});
  return originalFetch.apply(this,arguments).then(response=>{record('fetch-complete','',{requestId,resource,status:response.status});return response;},error=>{record('fetch-error',error.message,{requestId,resource,errorName:error.name,aborted:!!signal?.aborted});throw error;});
 };
 window.addEventListener('beforeunload',()=>record('departing'));
 window.addEventListener('error',event=>record('window-error',event.message));
 window.addEventListener('unhandledrejection',event=>record('unhandled-rejection',String(event.reason?.message||event.reason)));
});
await context.route(base+'/**',route=>{
 if(!['GET','HEAD'].includes(route.request().method())){blockedWrites++;return route.abort('blockedbyclient');}
 return route.continue();
});
page.on('pageerror',error=>raw.push({message:error.message,stack:error.stack,at:Date.now()}));
page.on('request',request=>requests.push({url:request.url(),at:Date.now()}));
page.on('requestfailed',request=>failures.push({url:request.url(),error:request.failure()?.errorText,at:Date.now()}));
const trace=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('qa-navigation-trace')||'[]'));
try{
 // A real throw with the same misleading suffix must NEVER be classified away.
 await page.goto(base+'/discovery');await expect(page.locator('main form input')).toBeEnabled();
 await page.evaluate(()=>setTimeout(()=>{throw Error('QA genuine exception due to access control checks.');},0));
 await expect.poll(async()=>(await trace()).some(e=>e.kind==='window-error')).toBe(true);
 assert.ok(raw.some(e=>e.message.includes('QA genuine exception')));
 results.push({name:'native-error-control',status:'PASS'});
 for(let iteration=0;iteration<10;iteration++){
  const documentStart=Date.now(),rawStart=raw.length;
  const leaving=await page.goto(base+'/events',{waitUntil:'domcontentloaded'});
  assert.equal(leaving.headers()['content-security-policy'],undefined,'Review any document-level connection policy separately');
  await expect(page.locator('main')).toBeVisible();
  assert.equal(await page.locator('meta[http-equiv="Content-Security-Policy"]').count(),0);
  const csp=await page.evaluate(()=>performance.getEntriesByType('navigation')[0]?.name);
  assert.ok(csp?.startsWith(base+'/events'));
  const start=Date.now(),response=await page.goto(base+'/discovery',{waitUntil:'domcontentloaded'});
  await expect(page.locator('main form input')).toBeEnabled();assert.equal(response.status(),200);
  const end=Date.now(),allEvents=await trace(),events=allEvents.filter(e=>e.at>=documentStart&&e.at<=end),errors=raw.slice(rawStart);
  const native=events.filter(e=>['window-error','unhandled-rejection'].includes(e.kind));
  assert.deepEqual(native,[],'Actual JavaScript errors remain release blockers');
  const diagnostics=[];
  for(const error of errors){
   const host=new URL(base).host,index=error.message.indexOf(host);
   const suffix=' due to access control checks.';
   assert.equal(browser.browserType().name(),'webkit','Unexpected browser exception');
   assert.ok(index>=0&&error.message.endsWith(suffix),'Unknown page error');
   const resource=new URL(error.message.slice(index+host.length,-suffix.length),base);
   assert.equal(resource.origin,base);
   assert.ok(resource.pathname==='/api/events/ticketnetwork'||(resource.searchParams.has('_rsc')&&error.stack.includes('/_next/static/chunks/')),'Unexpected resource');
   assert.ok(events.some(e=>e.kind==='departing'&&['/events','/discovery'].includes(new URL(e.url).pathname)),'No departing owned document');
   const cancelled=failures.some(f=>f.url===resource.href&&f.at>=documentStart&&f.at<=end&&Math.abs(f.at-error.at)<1000&&/cancel|abort/i.test(f.error||''));
   const failed=allEvents.findLast(e=>e.kind==='fetch-error'&&e.resource===resource.href&&Math.abs(e.at-error.at)<1000);
   const attempted=failed&&allEvents.find(e=>e.kind==='fetch-start'&&e.requestId===failed.requestId);
   const departing=failed&&allEvents.findLast(e=>e.kind==='departing'&&e.documentId===failed.documentId&&e.at<=failed.at);
   // Distinguish a new fetch in the departing document from any earlier request
   // to the same URL. Prior requests do not establish this attempt's provenance.
   const refusedDuringReplacement=attempted&&departing&&attempted.at>=departing.at&&failed.errorName==='TypeError'&&!requests.some(r=>r.url===resource.href&&r.at>=attempted.at&&r.at<=failed.at);
   const explicitlyAborted=failed?.errorName==='AbortError'&&failed.aborted&&!!departing;
   assert.ok(cancelled||explicitlyAborted||refusedDuringReplacement,'Missing cancellation/no-dispatch provenance');
   diagnostics.push({...error,resource:resource.href,provenance:cancelled?'cancelled-request':explicitlyAborted?'aborted-fetch':'new-fetch-refused-in-departing-document',...(attempted?{fetchAttempt:attempted}:{}),...(failed?{fetchFailure:failed}:{}),...(departing?{departure:departing}:{})});
  }
  results.push({name:'hard-navigation-'+iteration,status:'PASS',nativeErrors:0,readyMs:end-start,diagnostics});
  console.log(JSON.stringify({iteration,diagnostics:diagnostics.length}));
 }
 assert.equal(blockedWrites,0);
}catch(error){results.push({name:'navigation-diagnostics',status:'FAIL',error:error.message});}
finally{
 const eventTrace=await trace().catch(()=>[]);
 await browser.close();
 const report={base,identity,at:new Date().toISOString(),browserEngine:browser.browserType().name(),browserVersion:browser.version(),raw,requests,failures,eventTrace,blockedWrites,results,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length};
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({pass:report.pass,fail:report.fail}));if(report.fail)process.exitCode=1;
}
