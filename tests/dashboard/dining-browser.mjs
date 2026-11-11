import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { chromium,expect as baseExpect } from '@playwright/test';
import { fixture,ids,rpc,asUser } from './database.mjs';
import { provider,fixtureEnv } from './provider.mjs';
import '../../lib/savedServerCatalog.js';
import { savedSource } from '../../lib/savedCopy.js';

const output=process.env.DASHBOARD_QA_OUTPUT||'../outputs/dining-browser';fs.mkdirSync(output,{recursive:true});
const backendPort=Number(process.env.DASHBOARD_QA_BACKEND_PORT||3057),appPort=Number(process.env.DASHBOARD_QA_APP_PORT||3056);
const db=await fixture(),backend=provider(db),results=[];
const seed=await rpc(db,'dashboard_submit',{p_key:crypto.randomUUID(),p_fingerprint:'browser-fixture',p_rate:'browser-fixture',p_user:ids.customer,
  p_input:{name:'Demo customer',email:'customer@example.com',phone:'+13055550123',dates:'Nov 1 – Nov 3, 2026',itemSlug:'demo-charter',itemTitle:'Demo charter',kind:'yacht'}});
await asUser(db,ids.partner,"insert into public.partner_listings(partner_id,title,description,price,currency) values($1,'Dashboard QA listing','Fictitious fixture',1,'USD')",[ids.partner]);
const backendServer=http.createServer(async(req,res)=>{
  try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const data=Buffer.concat(chunks);
    const result=await backend(new Request('https://placeholder.supabase.co'+req.url,{method:req.method,headers:req.headers,...(data.length?{body:data}:{} )}));
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end('Fixture failure');}
});
await new Promise(resolve=>backendServer.listen(backendPort,'127.0.0.1',resolve));
const log=fs.openSync(path.join(output,'server.log'),'a');
const server=spawn(process.execPath,['--require',path.resolve('tests/dashboard/server-fixtures.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(appPort)],
  {cwd:process.env.DASHBOARD_APP_DIR||process.cwd(),stdio:['ignore',log,log],env:{...process.env,...fixtureEnv,DASHBOARD_QA_FIXTURE:'1',DINING_SCHEMA_ENABLED:'true',DINING_REQUESTS_ENABLED:'true',DASHBOARD_QA_BACKEND_PORT:String(backendPort),RESEND_API_KEY:'',TELEGRAM_BOT_TOKEN:'',ADMIN_EMAIL:''}});
const base='http://127.0.0.1:'+appPort;
let ready=false;
for(let i=0;i<100;i++){try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
if(!ready){server.kill();backendServer.close();await db.close();throw new Error('QA server did not start');}
const launch={headless:true};
const expect=baseExpect.configure({timeout:15000});
if(process.env.I18N_BROWSER_EXECUTABLE)launch.executablePath=process.env.I18N_BROWSER_EXECUTABLE;
if(process.env.I18N_BROWSER_ARGS_FILE)launch.args=JSON.parse(fs.readFileSync(process.env.I18N_BROWSER_ARGS_FILE,'utf8'));
async function role(name,viewport,locale,task){
  const browser=await chromium.launch(launch),context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],network=[],consoleErrors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  page.on('request',r=>{if(/\/api\/|supabase/.test(r.url()))network.push({path:new URL(r.url()).pathname,event:'request'});});
  page.on('response',r=>{if(/\/api\/|supabase/.test(r.url()))network.push({path:new URL(r.url()).pathname,status:r.status()});});
  page.on('requestfailed',r=>network.push({path:new URL(r.url()).pathname,failure:r.failure()?.errorText}));
  const saveProgress=setInterval(()=>fs.writeFileSync(path.join(output,'network-progress.json'),JSON.stringify({name,errors,network})),2000);
  page.setDefaultNavigationTimeout(20000);
  const user=name==='guest'?null:{id:ids[name],email:name+'@example.com',user_metadata:{name:'Demo '+name,role:'admin'}};
  if(user){const exp=Math.floor(Date.now()/1000)+7200;const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,role:'authenticated',aud:'authenticated',exp},'fixture'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
    await context.addInitScript(({session,locale})=>{localStorage.setItem('sb-placeholder-auth-token',JSON.stringify(session));localStorage.setItem('gorgona-locale',locale);},
      {session:{access_token:jwt,refresh_token:'fixture-only',expires_in:7200,expires_at:exp,token_type:'bearer',user},locale});
  }else await context.addInitScript(locale=>localStorage.setItem('gorgona-locale',locale),locale);
  await context.route(url=>url.hostname==='placeholder.supabase.co',async route=>{
    const response=await backend(route.request().url(),{method:route.request().method(),headers:route.request().headers(),...(route.request().postData()?{body:route.request().postData()}:{} )});
    await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  });
  try{await task(page);expect(errors).toEqual([]);expect(consoleErrors.filter(m=>/hydration|Minified React|uncaught|application error|Failed to load admin data/i.test(m))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
    const details=page.getByRole('heading',{name:savedSource(locale,'Details'),exact:true});
    if(await details.count())await details.first().evaluate(el=>{el.parentElement.parentElement.scrollIntoView({behavior:'instant',block:'start'});scrollBy(0,-100);});
    await page.screenshot({path:path.join(output,name+'-'+locale+'-'+viewport.width+'.png'),fullPage:false,animations:'disabled',timeout:15000});results.push({name,locale,viewport,status:'passed',jsErrors:errors,consoleErrors,network});console.log('PASS '+name+' '+locale);
  }catch(error){await page.screenshot({path:path.join(output,name+'-failure.png'),fullPage:true}).catch(()=>{});results.push({name,status:'failed',error:error.message,jsErrors:errors,network});console.error(JSON.stringify(network));throw error;}
  finally{clearInterval(saveProgress);await context.close().catch(()=>{});await browser.close().catch(()=>{});fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));}
}
const text=(locale,value)=>savedSource(locale,value);
let diningId;
try{
 await role('guest',{width:390,height:844},'en',async page=>{
  await page.goto(base+'/restaurants-nightlife',{waitUntil:'networkidle'});
  const close=page.getByRole('button',{name:/Close AI Dock|Close Miami Elio AI/}).first();if(await close.isVisible())await close.click();
  await expect(page.locator('main article')).toHaveCount(27);
  await expect(page.locator('main article img')).toHaveCount(27);
  await expect(page.locator('main article').filter({hasText:'Story'})).toHaveCount(0);
  await page.locator('select[name="neighborhood"]').selectOption('Wynwood');
  await page.getByRole('button',{name:'Search venues',exact:true}).click();
  await expect(page.locator('main article')).toHaveCount(2);
  await page.getByRole('link',{name:'DOYA',exact:true}).click();
  await expect(page.locator('main a[href*="sevenrooms.com"]').first()).toBeVisible();
  await page.goto(base+'/restaurants-nightlife/story-miami');
  await expect(page.getByText('Current operation has not been verified. Reservations are unavailable.',{exact:true})).toBeVisible();
  await expect(page.locator('main a[href*="sevenrooms.com"]')).toHaveCount(0);
 });
 for(const locale of (await import('../../lib/languages.js')).SUPPORTED_LANGUAGES.map(language=>language.code)){
  await role('guest',{width:320,height:844},locale,async page=>{
   await page.context().addCookies([{name:'gorgona-locale',value:locale,url:base}]);
   await page.goto(base+'/restaurants-nightlife',{waitUntil:'networkidle'});
   const copy=(await import('../../lib/dining/copy.mjs')).getDiningCopy(locale);
   await expect(page.locator('main article')).toHaveCount(27);
   await expect(page.getByRole('button',{name:copy.search,exact:true})).toBeVisible();
   expect(await page.locator('main').evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(2);
   await page.goto(base+'/restaurants-nightlife/komodo-miami',{waitUntil:'networkidle'});
   await expect(page.getByText(copy.handoff,{exact:true})).toBeVisible();
   expect(await page.locator('main').evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(2);
  });
 }
 await role('customer',{width:390,height:844},'en',async page=>{
  await page.goto(base+'/restaurants-nightlife/komodo-miami',{waitUntil:'networkidle'});
  const form=page.locator('main form');
  await form.getByLabel('Date',{exact:true}).fill('2027-02-14');
  await form.getByLabel('Time',{exact:true}).fill('19:30');
  await form.getByLabel('Guests',{exact:true}).fill('4');
  await form.locator('input[autocomplete="name"]').fill('Dining browser QA');
  await form.locator('input[type="email"]').fill('dining-browser@example.com');
  await form.locator('input[type="tel"]').fill('+13055550123');
  await form.getByLabel('Notes',{exact:true}).fill('Quiet table please.');
  let dropped=false;
  await page.route('**/api/book',async route=>{
   if(dropped)return route.continue();
   dropped=true;const response=await route.fetch();expect(response.status()).toBe(200);await route.abort('failed');
  });
  await form.getByRole('button',{name:'Send concierge request',exact:true}).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await page.reload({waitUntil:'networkidle'});
  await expect(form.getByLabel('Date',{exact:true})).toBeDisabled();
  await form.getByRole('button',{name:'Send concierge request',exact:true}).click();
  await expect(page.getByText('Request saved. This is an inquiry, not a confirmed reservation.',{exact:true})).toBeVisible();
  const rows=(await db.query("select * from public.bookings where item_slug='komodo-miami'")).rows;
  expect(rows.length).toBe(1);diningId=rows[0].id;expect(rows[0].status).toBe('pending');
  expect(rows[0].hospitality.note).toBe('Quiet table please.');
  await page.goto(base+'/profile');
  await page.getByRole('button',{name:'Komodo',exact:true}).click();
  await expect(page.getByRole('button',{name:'Withdraw inquiry',exact:true})).toBeVisible();
 });
 await role('admin',{width:1440,height:1000},'en',async page=>{
  await page.goto(base+'/admin',{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:'Dining integrations',exact:true})).toBeVisible();
  const request=page.getByRole('button',{name:'Komodo',exact:true});await request.click();
  await expect(page.getByText('Quiet table please.',{exact:true})).toBeVisible();
  await page.getByLabel('Assign partner',{exact:true}).selectOption(ids.partner);
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(async()=>(await db.query('select assigned_partner_id from public.bookings where id=$1',[diningId])).rows[0].assigned_partner_id).toBe(ids.partner);
 });
 await role('partner',{width:390,height:844},'ar',async page=>{
  await page.goto(base+'/partner',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Komodo',exact:true}).click();
  await expect(page.getByText('Quiet table please.',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:(await import('../../lib/dining/copy.mjs')).getDiningCopy('ar').providers,exact:true})).toHaveCount(0);
 });
 await role('customer',{width:390,height:844},'en',async page=>{
  await page.goto(base+'/profile',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Komodo',exact:true}).click();
  await page.getByRole('button',{name:'Withdraw inquiry',exact:true}).click();
  await expect.poll(async()=>(await db.query('select status from public.bookings where id=$1',[diningId])).rows[0].status).toBe('closed');
 });
 await role('guest',{width:1440,height:1100},'ru',async page=>{
  await page.context().addCookies([{name:'gorgona-locale',value:'ru',url:base}]);
  await page.goto(base+'/restaurants-nightlife',{waitUntil:'networkidle'});
  await expect.poll(async()=>page.locator('main header img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  for(const image of await page.locator('main article img').all()){
   const src=await image.getAttribute('src');expect((await page.request.get(base+src)).status()).toBe(200);
  }
 });
 console.log('Dining browser flows PASS. Disposable fixture only; no partner booking or production mutation.');
}finally{server.kill();backendServer.close();await db.close();fs.closeSync(log);}
