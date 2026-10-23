import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { chromium,expect as baseExpect } from '@playwright/test';
import { fixture,ids,rpc,asUser } from './database.mjs';
import { provider,fixtureEnv } from './provider.mjs';
import '../../lib/savedServerCatalog.js';
import { savedSource } from '../../lib/savedCopy.js';

const output=process.env.DASHBOARD_QA_OUTPUT||'/tmp/miami-workspaces-qa';fs.mkdirSync(output,{recursive:true});
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
await new Promise(resolve=>backendServer.listen(3037,'127.0.0.1',resolve));
const log=fs.openSync(path.join(output,'server.log'),'a');
const server=spawn(process.execPath,['--require',path.resolve('tests/dashboard/server-fixtures.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3036'],
  {cwd:process.env.DASHBOARD_APP_DIR||process.cwd(),stdio:['ignore',log,log],env:{...process.env,...fixtureEnv,DASHBOARD_QA_FIXTURE:'1',RESEND_API_KEY:'',TELEGRAM_BOT_TOKEN:'',ADMIN_EMAIL:''}});
const base='http://127.0.0.1:3036';
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
try{
  await role('customer',{width:1440,height:1000},'ru',async page=>{
    await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'Demo charter',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Demo charter',exact:true}).click();await expect(page.getByText(text('ru','History'),{exact:true})).toBeVisible();
    await page.getByRole('heading',{name:text('ru','Requests'),exact:true}).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  });
  await role('admin',{width:1440,height:1000},'ru',async page=>{
    await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:(await import('../../lib/partnerListingCopy.mjs')).getPartnerListingCopy('ru').queue,exact:true})).toBeVisible();await page.getByRole('button',{name:'Demo charter',exact:true}).click();
    await expect(page.getByRole('button',{name:text('ru','Start review'),exact:true})).toBeVisible();
    await page.getByRole('button',{name:text('ru','Start review'),exact:true}).click();
    await expect(page.getByRole('button',{name:text('ru','Start review'),exact:true})).toHaveCount(0);
    const partner=page.getByLabel(text('ru','Assign partner'));await partner.selectOption(ids.partner);
    const done=page.waitForResponse(response=>response.url().includes('/api/dashboard/requests/')&&response.request().method()==='POST');
    await page.getByRole('button',{name:text('ru','Save'),exact:true}).click();expect((await done).status()).toBe(200);
    await expect(partner).toHaveValue(ids.partner);await page.getByRole('heading',{name:text('ru','Requests'),exact:true}).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  });
  await role('partner',{width:390,height:844},'ar',async page=>{
    await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});await expect(page).toHaveURL(base+'/profile');
    await page.goto(base+'/partner',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Demo charter',exact:true}).click();
    const reply=page.getByLabel(text('ar','Response'),{exact:true});await reply.fill('Demo partner response.');
    await page.getByRole('button',{name:text('ar','Send response'),exact:true}).click();
    await expect(page.getByText('Demo partner response.',{exact:true})).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir','rtl');
    await page.getByText(text('ar','History'),{exact:true}).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  });
  await role('customer',{width:390,height:844},'ru',async page=>{
    await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Demo charter',exact:true}).click();
    await expect(page.getByText('Demo partner response.',{exact:true})).toBeVisible();
    await page.getByText(text('ru','History'),{exact:true}).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  });
  await role('guest',{width:1440,height:1000},'ru',async page=>{
    let dropped=false;
    await page.route('**/api/book',async route=>{if(!dropped){dropped=true;await route.fetch();await route.abort('failed');}else await route.continue();});
    await page.goto(base+'/rentals/lamborghini-urus-se',{waitUntil:'domcontentloaded'});const form=page.locator('main form');
    await form.locator('[autocomplete="name"]').fill('Demo guest');await form.locator('input[type=tel]').fill('+13055550123');await form.locator('input[type=email]').fill('guest@example.com');
    await form.locator('button[type=submit]').click();await expect(form.getByRole('alert')).toBeVisible();
    await expect(form.locator('[autocomplete="name"]')).toBeDisabled();
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('main').getByRole('status')).toContainText((await import('../../lib/worldsCopy.js')).getWorldsCopy('ru').form.sentTitle);
    expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('miami-booking:')))).toEqual([]);
    expect((await db.query("select count(*)::int n from public.bookings where client_email='guest@example.com'")).rows[0].n).toBe(1);
  });
}finally{server.kill('SIGTERM');await new Promise(resolve=>backendServer.close(resolve));await db.close();}
