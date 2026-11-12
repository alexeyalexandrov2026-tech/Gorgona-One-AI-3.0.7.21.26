// Opt-in, read-only acceptance on the dedicated private staging application.
// Real Auth and provider reads; labelled browser faults never create reservations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium,expect as baseExpect} from '@playwright/test';
import {getHeadoutPreviewCopy} from '../../../lib/dining/headoutPreviewCopy.mjs';

const base='https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev',project='kaxslgjbrarapeyoifdh',endpoint='/api/dashboard/dining/headout';
const root=fs.realpathSync(fileURLToPath(new URL('../../../',import.meta.url)));
assert.equal(process.env.DINING_STAGING_ACCEPTANCE,'1');
const expectedCommit=process.env.DINING_STAGING_EXPECTED_COMMIT;assert.match(expectedCommit||'',/^[a-f0-9]{40}$/);
const privateDirectory=fs.realpathSync(process.env.DINING_STAGING_PRIVATE_DIR||'');assert.ok(!privateDirectory.startsWith(root+path.sep));
const secrets=JSON.parse(fs.readFileSync(path.join(privateDirectory,'worker-secrets.json'))),credentials=JSON.parse(fs.readFileSync(path.join(privateDirectory,'qa-credentials.json')));
const publicFile=process.env.DINING_STAGING_PUBLIC_CONFIG,output=process.env.DINING_STAGING_BROWSER_RESULTS;
assert.ok(publicFile&&path.isAbsolute(publicFile)&&output&&path.isAbsolute(output));fs.mkdirSync(output,{recursive:true});
const config=JSON.parse(fs.readFileSync(publicFile));assert.equal(config.url,'https://'+project+'.supabase.co');assert.equal(config.project_ref,project);
const network=(url,options={})=>fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(60000)});
const results=[],sessions={},expect=baseExpect.configure({timeout:30000});let browser,identity,cookie,catalogue,availability;
async function check(name,operation){await operation();results.push({name,status:'PASS'});console.log('PASS '+name);}
async function api(route,role){return network(base+route,{headers:{Cookie:cookie,...(role?{Authorization:'Bearer '+sessions[role].access_token}:{})}});}
function referral(value){const url=new URL(value);assert.equal(url.protocol,'https:');assert.equal(url.hostname,'www.sandbox-headout.com');assert.deepEqual(url.searchParams.getAll('affiliate_code'),['4VzJB0']);assert.ok(!url.searchParams.has('date'));return url;}
try{
 await check('private gate and exact source identity',async()=>{
  assert.equal((await network(base+'/__dashboard_staging/health')).status,401);
  const response=await network(base+'/__dashboard_staging/health',{headers:{Authorization:'Basic '+Buffer.from('preview:'+secrets.DASHBOARD_STAGING_ACCESS_SECRET).toString('base64')}});
  assert.equal(response.status,200);identity=await response.json();assert.equal(identity.projectRef,project);assert.equal(identity.commit,expectedCommit);
  cookie=response.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
 });
 await check('real existing Auth roles and admin-only provider boundary',async()=>{
  for(const role of ['customer','partner','admin']){
   assert.equal(credentials[role].email,'dashboard-qa-'+role+'@example.com');
   const response=await network(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify(credentials[role])});assert.equal(response.status,200);
   sessions[role]=await response.json();sessions[role].expires_at=Math.floor(Date.now()/1000)+sessions[role].expires_in;
  }
  assert.equal((await api(endpoint)).status,401);
  for(const role of ['customer','partner'])assert.equal((await api(endpoint,role)).status,403);
 });
 await check('real Headout sandbox catalogue and attributed handoff',async()=>{
  const response=await api(endpoint,'admin');assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
  catalogue=await response.json();assert.equal(catalogue.environment,'sandbox');assert.equal(catalogue.mode,'REFERRAL');assert.equal(catalogue.bookingCreationEnabled,false);assert.equal(catalogue.confirmation,null);assert.equal(catalogue.products.length,3);
  assert.deepEqual(catalogue.products.map(p=>p.id),['55702','58903','58904']);
  for(const p of catalogue.products){assert.equal(p.city.code,'MIAMI');referral(p.referralUrl);assert.ok(p.variants.length);}
  const raw=JSON.stringify(catalogue);assert.ok(!raw.includes(secrets.SUPABASE_SERVICE_ROLE_KEY));assert.ok(!/commission|apiKey|Headout-Auth/.test(raw));
 });
 await check('real date availability and rejected forged selection',async()=>{
  const p=catalogue.products[0],variant=p.variants[0],startDate=new Date(Date.parse(catalogue.today+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
  const query=new URLSearchParams({action:'availability',productId:p.id,variantId:variant.id,startDate});
  const response=await api(endpoint+'?'+query,'admin');assert.equal(response.status,200);availability=await response.json();
  assert.equal(availability.product.id,p.id);assert.equal(availability.variantId,variant.id);assert.equal(availability.startDate,startDate);assert.equal(availability.granularity,'date');assert.equal(availability.slots,null);assert.equal(availability.confirmation,null);assert.ok(availability.dates.length);
  for(const date of availability.dates){assert.ok(date.date>=availability.startDate&&date.date<=availability.endDate);assert.ok(['CLOSED','LIMITED','UNLIMITED'].includes(date.availability));}
  assert.ok(availability.dates.some(d=>d.availability!=='CLOSED'));
  for(const extra of ['action=availability&productId=1&variantId=1&startDate='+startDate,'action=availability&productId='+p.id+'&variantId=1&startDate='+startDate,'action=catalogue&action=catalogue','apiKey=forged'])assert.equal((await api(endpoint+'?'+extra,'admin')).status,400);
 });
 const launch={headless:true};if(process.env.I18N_BROWSER_EXECUTABLE)launch.executablePath=process.env.I18N_BROWSER_EXECUTABLE;browser=await chromium.launch(launch);
 async function withPage(locale,viewport,operation){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  await context.addCookies([{name:cookie.slice(0,cookie.indexOf('=')),value:cookie.slice(cookie.indexOf('=')+1),url:base,secure:true,httpOnly:true,sameSite:'Lax'},{name:'gorgona-locale',value:locale,url:base}]);
  await context.addInitScript(({storage,session,locale})=>{localStorage.setItem('gorgona-locale',locale);localStorage.setItem(storage,JSON.stringify(session));},{storage:'sb-'+project+'-auth-token',session:sessions.admin,locale});
  await context.route(url=>url.hostname.endsWith('.supabase.co')&&url.hostname!==project+'.supabase.co',route=>route.abort('blockedbyclient'));
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultNavigationTimeout(45000);
  try{await operation(page,getHeadoutPreviewCopy(locale));assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2);await page.screenshot({path:path.join(output,locale+'.png'),animations:'disabled'});}
  catch(error){await page.screenshot({path:path.join(output,locale+'-failure.png'),animations:'disabled'}).catch(()=>{});const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('main *')].filter(element=>element.getBoundingClientRect().right>innerWidth+2).slice(0,15).map(element=>({tag:element.tagName,classes:element.className,width:element.getBoundingClientRect().width,right:element.getBoundingClientRect().right}))})).catch(()=>null);results.push({name:'browser diagnostics '+locale,layout});throw error;}
  finally{await context.close();}
 }
 await check('real desktop selection, stale-response cancellation and retry',async()=>withPage('en',{width:1280,height:900},async(page,copy)=>{
  await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});const panel=page.getByRole('region',{name:copy.title});await expect(panel).toBeVisible();
  await panel.getByRole('button',{name:copy.load,exact:true}).click();await expect(panel.getByRole('combobox',{name:copy.experience,exact:true})).toBeVisible();
  const date=panel.getByLabel(copy.startDate,{exact:true});await date.fill(availability.startDate);
  await panel.getByRole('button',{name:copy.check,exact:true}).click();await expect(panel.getByRole('radio').first()).toBeVisible();
  await panel.getByRole('radio').filter({visible:true}).evaluateAll(inputs=>{if(!inputs.some(input=>!input.disabled))throw Error('No available date');});
  await panel.locator('input[type="radio"]:enabled').first().check();const link=panel.getByRole('link',{name:copy.open,exact:true});await expect(link).toHaveAttribute('href',availability.product.referralUrl);
  await expect(panel.getByText(copy.handoff,{exact:true})).toBeVisible();
  // Observe the exact outgoing navigation without interacting with checkout.
  await page.context().route('https://www.sandbox-headout.com/**',route=>route.fulfill({status:200,contentType:'text/plain',body:'TEST: external checkout navigation intercepted; no booking created.'}));
  const opened=page.waitForEvent('popup');await link.click();const popup=await opened;await popup.waitForLoadState('domcontentloaded');assert.equal(popup.url(),availability.product.referralUrl);referral(popup.url());await popup.close();
  // Hold an actual provider response; changing the product must discard it.
  let release,started,delivered;const startedPromise=new Promise(resolve=>{started=resolve;}),releasePromise=new Promise(resolve=>{release=resolve;}),deliveredPromise=new Promise(resolve=>{delivered=resolve;});
  const pattern='**'+endpoint+'?*';
  const delayed=async route=>{try{const response=await route.fetch();started();await releasePromise;await route.fulfill({response}).catch(()=>{});}finally{delivered();}};
  await page.route(pattern,delayed);await panel.getByRole('button',{name:copy.check,exact:true}).click();await startedPromise;
  await panel.getByRole('combobox',{name:copy.experience,exact:true}).selectOption('58903');release();await deliveredPromise;await page.unroute(pattern,delayed);
  await expect(panel.getByRole('radio')).toHaveCount(0);await expect(link).toHaveCount(0);
  // A labelled transient browser fault must not retain a prior handoff link.
  await page.route(pattern,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'test_provider_unavailable'})}),{times:1});
  await panel.getByRole('button',{name:copy.check,exact:true}).click();await expect(panel.getByRole('alert')).toBeVisible();await expect(link).toHaveCount(0);
  await panel.getByRole('combobox',{name:copy.experience,exact:true}).selectOption('55702');await panel.getByRole('button',{name:copy.check,exact:true}).click();await expect(panel.getByRole('radio').first()).toBeVisible();await expect(panel.getByRole('alert')).toHaveCount(0);
  await panel.locator('input[type="radio"]:enabled').first().check();await expect(link).toBeVisible();await date.fill(new Date(Date.parse(availability.startDate+'T12:00:00Z')+86400000).toISOString().slice(0,10));await expect(link).toHaveCount(0);await expect(panel.getByRole('radio')).toHaveCount(0);
  await panel.scrollIntoViewIfNeeded();
 }));
 // Layout fixtures are cached actual responses, not additional live provider calls.
 for(const [locale,width] of [['ru',390],['ar',320],['he',390]])await check('cached actual-response mobile layout '+locale+' '+width+'px',async()=>withPage(locale,{width,height:844},async(page,copy)=>{
  await page.route('**'+endpoint+'**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).searchParams.has('action')?availability:catalogue)}));
  await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});const panel=page.getByRole('region',{name:copy.title});await expect(panel).toBeVisible();await panel.getByRole('button',{name:copy.load,exact:true}).click();await expect(panel.getByRole('combobox',{name:copy.experience,exact:true})).toBeVisible();await panel.getByLabel(copy.startDate,{exact:true}).fill(availability.startDate);await panel.getByRole('button',{name:copy.check,exact:true}).click();await expect(panel.getByRole('radio').first()).toBeVisible();await panel.locator('input[type="radio"]:enabled').first().check();await expect(panel.getByRole('link',{name:copy.open,exact:true})).toBeVisible();await panel.scrollIntoViewIfNeeded();
 }));
}catch(error){results.push({name:'acceptance',status:'FAIL',error:error.message});console.error(error.message);process.exitCode=1;}
finally{await browser?.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({base,identity,results,readOnly:true,productionTouched:false,externalCheckout:'navigation intercepted; no checkout interaction',layoutFixtures:'cached actual sandbox API responses'},null,2)+'\n');}
