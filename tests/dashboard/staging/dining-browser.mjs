// Opt-in real hosted browser acceptance. Uses only existing fictitious QA accounts.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium,expect as baseExpect} from '@playwright/test';
const base='https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev',project='kaxslgjbrarapeyoifdh';
const root=fs.realpathSync(fileURLToPath(new URL('../../../',import.meta.url)));
assert.equal(process.env.DINING_STAGING_ACCEPTANCE,'1');
const expectedCommit=process.env.DINING_STAGING_EXPECTED_COMMIT;assert.match(expectedCommit||'',/^[a-f0-9]{40}$/);
const privateDirectory=fs.realpathSync(process.env.DINING_STAGING_PRIVATE_DIR||'');assert.ok(!privateDirectory.startsWith(root+path.sep));
const secrets=JSON.parse(fs.readFileSync(path.join(privateDirectory,'worker-secrets.json'))),credentials=JSON.parse(fs.readFileSync(path.join(privateDirectory,'qa-credentials.json')));
const publicFile=process.env.DINING_STAGING_PUBLIC_CONFIG,output=process.env.DINING_STAGING_BROWSER_RESULTS;
assert.ok(publicFile&&path.isAbsolute(publicFile)&&output&&path.isAbsolute(output));fs.mkdirSync(output,{recursive:true});
const config=JSON.parse(fs.readFileSync(publicFile));assert.equal(config.url,'https://'+project+'.supabase.co');assert.equal(config.project_ref,project);
const network=(url,options={})=>fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(30000)});
const health=await network(base+'/__dashboard_staging/health',{headers:{Authorization:'Basic '+Buffer.from('preview:'+secrets.DASHBOARD_STAGING_ACCESS_SECRET).toString('base64')}});
assert.equal(health.status,200);const identity=await health.json();assert.equal(identity.projectRef,project);assert.equal(identity.commit,expectedCommit);
const gateCookie=health.headers.get('set-cookie')?.split(';')[0];assert.ok(gateCookie);
const sessions={};
for(const role of ['customer','admin']){
 assert.equal(credentials[role].email,'dashboard-qa-'+role+'@example.com');
 const login=await network(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify(credentials[role])});assert.equal(login.status,200);
 sessions[role]=await login.json();sessions[role].expires_at=Math.floor(Date.now()/1000)+sessions[role].expires_in;
}
const launch={headless:true};if(process.env.I18N_BROWSER_EXECUTABLE)launch.executablePath=process.env.I18N_BROWSER_EXECUTABLE;
const browser=await chromium.launch(launch),expect=baseExpect.configure({timeout:15000}),results=[];
const requestedRole=process.env.DINING_STAGING_BROWSER_ROLE||'all';assert.ok(['all','customer','admin'].includes(requestedRole));
let bookingId;const note='DEMO hosted dining '+randomUUID();
async function detail(){const response=await network(base+'/api/dashboard/requests/'+bookingId,{headers:{Cookie:gateCookie,Authorization:'Bearer '+sessions.customer.access_token}});assert.equal(response.status,200);return response.json();}
async function role(name,viewport,operation){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 await context.addCookies([{name:gateCookie.slice(0,gateCookie.indexOf('=')),value:gateCookie.slice(gateCookie.indexOf('=')+1),url:base,secure:true,httpOnly:true,sameSite:'Lax'},{name:'gorgona-locale',value:'en',url:base}]);
 await context.addInitScript(({storage,session})=>{localStorage.setItem('gorgona-locale','en');localStorage.setItem(storage,JSON.stringify(session));},{storage:'sb-'+project+'-auth-token',session:sessions[name]});
 await context.route(url=>url.hostname.endsWith('.supabase.co')&&url.hostname!==project+'.supabase.co',route=>route.abort('blockedbyclient'));
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultNavigationTimeout(30000);
 try{
  await operation(page);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({path:path.join(output,name+'.png'),fullPage:false,animations:'disabled'});
  results.push({role:name,status:'PASS',viewport,jsErrors:errors});console.log('PASS hosted '+name+' browser');
 }catch(error){await page.screenshot({path:path.join(output,name+'-failure.png'),fullPage:false}).catch(()=>{});const alerts=await page.locator('main').getByRole('alert').evaluateAll(elements=>elements.map(e=>({message:e.textContent,section:e.closest('section')?.querySelector('h2')?.textContent||'Admin summary'}))).catch(()=>[]);results.push({role:name,status:'FAIL',error:error.message,jsErrors:errors,alerts});throw error;}
 finally{await context.close();}
}
try{
 if(requestedRole!=='admin')await role('customer',{width:390,height:844},async page=>{
  await page.goto(base+'/restaurants-nightlife/komodo-miami',{waitUntil:'domcontentloaded'});
  const form=page.locator('main form');await expect(form.locator('input[type="date"]')).toBeVisible();
  const date=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  await form.getByLabel('Date',{exact:true}).fill(date);await form.getByLabel('Time',{exact:true}).fill('19:30');await form.getByLabel('Guests',{exact:true}).fill('4');
  await form.locator('input[autocomplete="name"]').fill('DEMO Dining customer');await form.locator('input[type="email"]').fill('dashboard-qa-customer@example.com');await form.locator('input[type="tel"]').fill('+13055550123');await form.getByLabel('Notes',{exact:true}).fill(note);
  await form.screenshot({path:path.join(output,'customer-form.png'),animations:'disabled'});
  let dropped=false;
  await page.route('**/api/book',async route=>{if(dropped)return route.continue();dropped=true;const response=await route.fetch();expect(response.status()).toBe(200);bookingId=(await response.json()).bookingId;await route.abort('failed');});
  await form.getByRole('button',{name:'Send concierge request',exact:true}).click();await expect(form.getByRole('alert')).toBeVisible();
  await page.reload({waitUntil:'domcontentloaded'});await expect(form.getByLabel('Date',{exact:true})).toBeDisabled();
  await form.getByRole('button',{name:'Send concierge request',exact:true}).click();await expect(page.getByText('Request saved. This is an inquiry, not a confirmed reservation.',{exact:true})).toBeVisible();
  const saved=await detail();assert.equal(saved.request.status,'pending');assert.equal(saved.request.hospitality.note,note);assert.equal(saved.events.filter(e=>e.event_type==='created').length,1);
  await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Komodo',exact:true}).first().click();
  await expect(page.getByText(note,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Withdraw inquiry',exact:true}).click();
  await expect.poll(async()=>(await detail()).request.status).toBe('closed');
 });
 if(requestedRole!=='customer')await role('admin',{width:1280,height:900},async page=>{
  await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'Dining integrations',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'OpenTable',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Komodo',exact:true})).toBeVisible();
  await expect(page.locator('main [role="status"]')).toHaveCount(0);await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
 });
}catch(error){process.exitCode=1;console.error(error.message);}
finally{
 if(bookingId){
  const saved=await detail().catch(()=>null);
  if(saved?.request?.hospitality?.note===note&&saved.request.status!=='closed'){
   const close=await network(base+'/api/dashboard/requests/'+bookingId,{method:'POST',headers:{Cookie:gateCookie,Authorization:'Bearer '+sessions.customer.access_token,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify({action:'withdraw',version:saved.request.version})}).catch(()=>null);
   if(close?.status!==200){results.push({role:'cleanup',status:'FAIL'});process.exitCode=1;}
  }
 }
 await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({base,identity,bookingId,note,results,productionTouched:false},null,2)+'\n');
}
