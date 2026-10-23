// Local production Next UI against real staging Auth/PostgREST and a temporary
// gated API adapter. This is not a deployed Cloudflare staging domain.
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
import {chromium,expect as baseExpect} from '@playwright/test';
import '../../../lib/savedServerCatalog.js';import {savedSource} from '../../../lib/savedCopy.js';
const expect=baseExpect.configure({timeout:20000}),configFile=process.env.DASHBOARD_STAGING_CONFIG;
if(!configFile)throw Error('Set DASHBOARD_STAGING_CONFIG');
const c=JSON.parse(fs.readFileSync(configFile)),sessions=JSON.parse(fs.readFileSync(path.join(path.dirname(configFile),'sessions.json')));
if(c.project_ref!=='kaxslgjbrarapeyoifdh'||new URL(c.url).hostname!==c.project_ref+'.supabase.co')throw Error('Refusing non-staging target');
const output=process.env.DASHBOARD_QA_OUTPUT||'/tmp/miami-dashboard-staging/browser';fs.mkdirSync(output,{recursive:true});
const results=[],suffix=crypto.randomUUID().slice(0,8),title='Staging UI charter '+suffix;
async function api(route,method,headers={},body){
 const forwarded={};for(const [key,value]of Object.entries(headers))if(['authorization','idempotency-key'].includes(key.toLowerCase()))forwarded[key]=value;
 return fetch(c.url+'/functions/v1/dashboard-acceptance',{method,headers:{apikey:c.anonKey,'x-dashboard-qa':c.token,'x-dashboard-path':route,'Content-Type':'application/json',...forwarded},...(body?{body}:{}),signal:AbortSignal.timeout(45000)});
}
const seedResponse=await api('/api/book','POST',{Authorization:'Bearer '+sessions.customer.access_token,'Idempotency-Key':crypto.randomUUID()},JSON.stringify({name:'Dashboard QA customer',email:'dashboard-qa-customer@example.com',phone:'+13055550123',dates:'Nov 1–3, 2026',itemSlug:'staging-ui-charter',itemTitle:title,kind:'yacht'}));
expect(seedResponse.status).toBe(200);
const update=await fetch(c.url+'/auth/v1/user',{method:'PUT',headers:{apikey:c.anonKey,Authorization:'Bearer '+sessions.partner.access_token,'Content-Type':'application/json'},body:JSON.stringify({data:{role:'admin'}})});expect(update.status).toBe(200);
sessions.partner.user=await update.json();
const log=fs.openSync(path.join(output,'server.log'),'w'),app=process.env.DASHBOARD_APP_DIR||process.cwd(),base='http://127.0.0.1:3040';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3040'],{cwd:app,stdio:['ignore',log,log],env:{...process.env,TELEGRAM_BOT_TOKEN:'',RESEND_API_KEY:''}});
const launch={headless:true};if(process.env.I18N_BROWSER_EXECUTABLE)launch.executablePath=process.env.I18N_BROWSER_EXECUTABLE;if(process.env.I18N_BROWSER_ARGS_FILE)launch.args=JSON.parse(fs.readFileSync(process.env.I18N_BROWSER_ARGS_FILE));
let browser;
async function fulfill(route,response){const headers=Object.fromEntries(response.headers);for(const h of ['content-encoding','content-length','transfer-encoding'])delete headers[h];await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});}
async function role(name,locale,viewport,task){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await context.addInitScript(({session,locale})=>{localStorage.setItem('gorgona-locale',locale);if(session)localStorage.setItem('sb-placeholder-auth-token',JSON.stringify(session));},{session:sessions[name]||null,locale});
 await context.route(url=>url.hostname.endsWith('.supabase.co'),async route=>{
  const url=new URL(route.request().url());if(!['placeholder.supabase.co',c.project_ref+'.supabase.co'].includes(url.hostname)){errors.push('Unexpected database target');return route.abort();}
  const incoming=route.request().headers(),headers={apikey:c.anonKey};for(const key of ['authorization','content-type','accept','prefer','range','x-upsert'])if(incoming[key])headers[key]=incoming[key];
  const response=await fetch(c.url+url.pathname+url.search,{method:route.request().method(),headers,...(route.request().postData()?{body:route.request().postData()}:{}),signal:AbortSignal.timeout(30000)});await fulfill(route,response);
 });
 await context.route(url=>url.origin===base&&(/^\/api\/dashboard\//.test(url.pathname)||url.pathname==='/api/book'),async route=>{
  const request=route.request(),headers=request.headers();await fulfill(route,await api(new URL(request.url()).pathname+new URL(request.url()).search,request.method(),headers,request.postData()));
 });
 try{
  await task(page);expect(errors).toEqual([]);expect(consoleErrors.filter(e=>/hydration|Minified React|uncaught|application error/i.test(e))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({path:path.join(output,name+'-'+locale+'.png'),animations:'disabled',timeout:20000});results.push({name,locale,status:'passed',jsErrors:errors,consoleErrors});console.log('PASS real staging UI '+name);
 }catch(error){results.push({name,locale,status:'failed',error:error.message,jsErrors:errors});throw error;}
 finally{await context.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));}
}
const text=(locale,source)=>savedSource(locale,source);
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}expect(ready).toBe(true);
 browser=await chromium.launch(launch);
 await role('admin','ru',{width:1440,height:1000},async page=>{
  await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'Dashboard QA listing',exact:true})).toBeVisible();
  await page.getByRole('button',{name:title,exact:true}).click();await page.getByRole('button',{name:text('ru','Start review'),exact:true}).click();await expect(page.getByRole('button',{name:text('ru','Start review'),exact:true})).toHaveCount(0);
  await page.getByLabel(text('ru','Assign partner')).selectOption(sessions.partner.user.id);const done=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/api/dashboard/requests/'));await page.getByRole('button',{name:text('ru','Save'),exact:true}).click();expect((await done).status()).toBe(200);
 });
 await role('partner','ar',{width:390,height:844},async page=>{
  await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});await expect(page).toHaveURL(base+'/profile');await page.goto(base+'/partner',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:title,exact:true}).click();await page.getByLabel(text('ar','Response'),{exact:true}).fill('Real staging QA reply.');await page.getByRole('button',{name:text('ar','Send response'),exact:true}).click();await expect(page.getByText('Real staging QA reply.',{exact:true})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 });
 await role('customer','ru',{width:390,height:844},async page=>{await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:title,exact:true}).click();await expect(page.getByText('Real staging QA reply.',{exact:true})).toBeVisible();});
 await role('guest','ru',{width:1440,height:1000},async page=>{
  let lost=false;await page.route('**/api/book',async route=>{if(lost)return route.fallback();lost=true;const r=route.request();const saved=await api('/api/book',r.method(),r.headers(),r.postData());expect(saved.status).toBe(200);await route.abort('failed');});
  await page.goto(base+'/rentals/lamborghini-urus-se',{waitUntil:'domcontentloaded'});const form=page.locator('main form'),email='staging-ui-guest-'+suffix+'@example.com';
  await form.locator('[autocomplete="name"]').fill('Staging UI guest');await form.locator('input[type=tel]').fill('+13055550123');await form.locator('input[type=email]').fill(email);await form.locator('button[type=submit]').click();await expect(form.getByRole('alert')).toBeVisible();await expect(form.locator('[autocomplete="name"]')).toBeDisabled();
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('main').getByRole('status')).toContainText((await import('../../../lib/worldsCopy.js')).getWorldsCopy('ru').form.sentTitle);
  const receipts=await fetch(c.url+'/rest/v1/bookings?select=id&client_email=eq.'+encodeURIComponent(email),{headers:{apikey:c.anonKey,Authorization:'Bearer '+sessions.admin.access_token}});expect(receipts.status).toBe(200);expect((await receipts.json()).length).toBe(1);
  expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('miami-booking:')))).toEqual([]);
 });
}finally{await browser?.close();server.kill('SIGTERM');}
