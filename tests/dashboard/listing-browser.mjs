// Local SQL/Auth/Storage fixture only. No hosted credentials or cloud writes.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {chromium,expect as baseExpect} from '@playwright/test';
import {fixture,ids} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {getPartnerListingCopy} from '../../lib/partnerListingCopy.mjs';
import {savedSource} from '../../lib/savedCopy.js';
import '../../lib/savedServerCatalog.js';
const output=path.resolve(process.env.DASHBOARD_QA_OUTPUT||'../partner-publication-preview');
fs.mkdirSync(output,{recursive:true});
const db=await fixture(),backend=provider(db),objects=new Map(),results=[],errors=[];
const expect=baseExpect.configure({timeout:15000}),copy=getPartnerListingCopy('ru'),text=s=>savedSource('ru',s);
async function fixtureFetch(input,init={}){
 const req=input instanceof Request?input:new Request(input,init),url=new URL(req.url);
 if(!url.pathname.startsWith('/storage/v1/'))return backend(req);
 if(req.headers.get('authorization')!=='Bearer '+fixtureEnv.SUPABASE_SERVICE_ROLE_KEY)return new Response(null,{status:403});
 const key=url.pathname.replace(/^\/storage\/v1\/object\/(authenticated\/)?partner_listing_images\//,'');
 if(req.method==='POST'){objects.set(key,Buffer.from(await req.arrayBuffer()));return Response.json({Key:'partner_listing_images/'+key});}
 if(['HEAD','GET'].includes(req.method)&&objects.has(key))return new Response(req.method==='HEAD'?null:objects.get(key),{headers:{'Content-Type':'image/png'}});
 if(req.method==='DELETE'){const body=await req.json();for(const key of body.prefixes||[])objects.delete(key);return Response.json([]);}
 return new Response(null,{status:404});
}
const backendServer=http.createServer(async(req,res)=>{
 try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const data=Buffer.concat(chunks);
 const response=await fixtureFetch(new Request('https://placeholder.supabase.co'+req.url,{method:req.method,headers:req.headers,...(data.length?{body:data}:{})}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(500);res.end('Fixture failure');errors.push(e.message);}
});
await new Promise(r=>backendServer.listen(3037,'127.0.0.1',r));
const log=fs.openSync(path.join(output,'server.log'),'w');
const server=spawn(process.execPath,['--require',path.resolve('tests/dashboard/server-fixtures.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3036'],{stdio:['ignore',log,log],env:{...process.env,...fixtureEnv,DASHBOARD_QA_FIXTURE:'1',GORGONA_AI_ENABLED:'off',RESEND_API_KEY:'',TELEGRAM_BOT_TOKEN:'',ADMIN_EMAIL:''}});
const base='http://127.0.0.1:3036';let browser;
const contexts=[];
async function account(role,width=1440){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});contexts.push(context);
 await context.addInitScript(({id,role})=>{
  if(location.origin!=='http://127.0.0.1:3036')return;
  localStorage.setItem('gorgona-locale','ru');
  if(!id)return;
  const exp=Math.floor(Date.now()/1000)+7200,user={id,email:role+'@example.com',user_metadata:{name:'Demo '+role}};
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:id,role:'authenticated',aud:'authenticated',exp},'fixture'].map(x=>btoa(typeof x==='string'?x:JSON.stringify(x)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_')).join('.');
  localStorage.setItem('sb-placeholder-auth-token',JSON.stringify({access_token:jwt,refresh_token:'fixture-only',expires_in:7200,expires_at:exp,token_type:'bearer',user}));
 },{id:ids[role],role});
 await context.route('**/*',async route=>{
  const r=route.request(),url=new URL(r.url());
  if(url.hostname==='placeholder.supabase.co'){
   const response=await fixtureFetch(r.url(),{method:r.method(),headers:r.headers(),...(r.postDataBuffer()?{body:r.postDataBuffer()}:{})});
   return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  }
  if(!['127.0.0.1','localhost'].includes(url.hostname)&&!['data:','blob:'].includes(url.protocol))return route.abort();
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(role+': '+e.message));return page;
}
async function snapshot(page,name){
 await page.addStyleTag({content:'aside[aria-hidden="true"]{visibility:hidden!important}'});
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(output,name+'.png'),fullPage:true,animations:'disabled'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 if(['partner-editor','administrator-review'].includes(name)){
  const size=page.viewportSize();await page.setViewportSize({...size,height:2400});await page.evaluate(()=>scrollTo(0,0));
  await page.locator('#listing-editor').screenshot({path:path.join(output,name+'-focus.png'),animations:'disabled'});
  await page.setViewportSize(size);
 }
}
async function action(page,label){
 const done=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/dashboard/listings'&&r.request().method()==='POST');
 await page.getByRole('button',{name:label,exact:true}).click();
 const response=await done;expect(response.status()).toBe(200);return response.json();
}
async function published(id){return (await backend('https://placeholder.supabase.co/rest/v1/partner_publications?select=*&id=eq.'+id,{headers:{Authorization:'Bearer fixture-anon'}})).json();}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}if(i===99)throw Error('Local app did not start');await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true,executablePath:process.env.I18N_BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const partner=await account('partner'),admin=await account('admin'),visitor=await account('guest');
 await partner.goto(base+'/partner');await expect(partner.getByRole('button',{name:copy.newListing,exact:true})).toBeVisible();
 const created=[];
 for(const kind of ['car','yacht','stay']){
  await partner.getByRole('button',{name:copy.newListing,exact:true}).click();const editor=partner.locator('#listing-editor');
  await editor.getByLabel(copy.kind,{exact:true}).selectOption(kind);
  const title='DEMO '+({car:'Mercedes GLS',yacht:'Azimut 60',stay:'Villa Miami'})[kind];
  await editor.getByLabel(text('Title'),{exact:true}).fill(title);
  await editor.getByLabel(text('Description & Info'),{exact:true}).fill('Демонстрационное объявление. Просторный салон, обслуживание и отдых в Майами.');
  await editor.getByLabel(copy.location,{exact:true}).fill('Miami Beach');
  await editor.locator('input[type=number]').first().fill(kind==='stay'?'1200':kind==='car'?'350':'600');
  if(kind!=='stay'){
   await editor.getByLabel(copy.brand,{exact:true}).fill(kind==='car'?'Mercedes-Benz':'Azimut');
   await editor.getByLabel(copy.model,{exact:true}).fill(kind==='car'?'GLS':'60');
   if(kind==='car')await editor.getByLabel(copy.bodyType).selectOption('SUVs');
   await editor.getByLabel(copy.year,{exact:true}).fill('2025');
  }
  if(kind==='yacht'){await editor.getByLabel(copy.lengthFt,{exact:true}).fill('60');await editor.getByLabel(copy.guests,{exact:true}).fill('12');}
  if(kind==='stay'){await editor.getByLabel(copy.bedrooms,{exact:true}).fill('4');await editor.getByLabel(copy.bathrooms,{exact:true}).fill('3');await editor.getByLabel(copy.guests,{exact:true}).fill('8');}
  await editor.locator('input[type=email]').fill('private-partner@example.com');await editor.locator('input[type=tel]').fill('+13055550123');
  const saved=await action(partner,copy.saveDraft),id=saved.id;created.push({id,kind,title});
  await partner.reload();await partner.getByRole('button',{name:new RegExp(title)}).click();
  const photo=fs.readFileSync(path.resolve(({car:'public/images/rentals/mercedes-gls-white/cover.jpg',yacht:'public/images/home/worlds/yacht-princess.jpg',stay:'public/images/home/worlds/stay-miami-beach.jpg'})[kind]));
  const uploads=partner.waitForResponse(r=>r.url().includes('/api/dashboard/listings/media?listing=')&&r.request().method()==='POST');
  await partner.locator('input[type=file]').setInputFiles([{name:'cover.jpg',mimeType:'image/jpeg',buffer:photo},{name:'interior.jpg',mimeType:'image/jpeg',buffer:photo}]);
  expect((await uploads).status()).toBe(201);
  await expect(partner.locator('#listing-editor ol li')).toHaveCount(2);
  await expect(partner.getByRole('button',{name:copy.submit,exact:true})).toBeEnabled();
  await partner.getByRole('button',{name:copy.moveUp,exact:true}).nth(1).click();
  if(kind==='car'){
   await partner.getByRole('button',{name:copy.remove,exact:true}).nth(1).click();
   await expect(partner.locator('#listing-editor ol li')).toHaveCount(1);
  }
  if(kind==='car')await snapshot(partner,'partner-editor');
  await partner.getByRole('button',{name:copy.submit,exact:true}).click();
  await expect(partner.getByRole('status').filter({hasText:copy.submitted})).toBeVisible();
  expect(await published(id)).toHaveLength(0);
  await admin.goto(base+'/admin');await admin.getByRole('button',{name:new RegExp(title)}).click();
  await expect(admin.locator('#listing-editor input[type=email]')).toHaveValue('private-partner@example.com');
  if(kind==='car')await snapshot(admin,'administrator-review');
  await action(admin,copy.approve);expect(await published(id)).toHaveLength(1);
  const route=({car:'rentals',yacht:'yachts',stay:'vacation-rentals'})[kind];
  await visitor.goto(base+'/'+route);await expect(visitor.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await visitor.goto(base+'/'+route+'/partner-'+id);await expect(visitor.getByRole('heading',{name:title,exact:true})).toBeVisible();
  expect(await visitor.locator('main').innerText()).not.toContain('private-partner@example.com');
  await expect(visitor.locator('main form')).toBeVisible();
  const image=visitor.locator('main img[src*="/api/listing-media/"]').first();await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  await snapshot(visitor,'public-'+kind);
  results.push({kind,id,status:'PASS',checks:['draft-resume','two-photos-reordered','submit-private','admin-contacts','approval','public-catalogue','detail-gallery','Miami-Elio-enquiry','private-contact-excluded']});
 }
 // Edit and reject a replacement without changing the live approved snapshot.
 const car=created[0];await partner.goto(base+'/partner');await partner.getByRole('button',{name:new RegExp(car.title)}).click();
 await partner.locator('#listing-editor').getByLabel(text('Title'),{exact:true}).fill(car.title+' revised');
 await partner.getByRole('button',{name:copy.submit,exact:true}).click();await expect(partner.getByRole('status').filter({hasText:copy.submitted})).toBeVisible();
 expect((await published(car.id))[0].content.title).toBe(car.title);
 await admin.goto(base+'/admin');await admin.getByRole('button',{name:new RegExp(car.title)}).click();await admin.getByLabel(copy.reviewNote,{exact:true}).fill('Уточните описание и условия аренды.');
 await action(admin,copy.reject);expect((await published(car.id))[0].content.title).toBe(car.title);
 await partner.reload();await partner.getByRole('button',{name:new RegExp(car.title)}).click();await expect(partner.getByText('Уточните описание и условия аренды.',{exact:false})).toBeVisible();
 await partner.getByRole('button',{name:copy.submit,exact:true}).click();await expect(partner.getByRole('status').filter({hasText:copy.submitted})).toBeVisible();
 await admin.goto(base+'/admin');await admin.getByRole('button',{name:new RegExp(car.title)}).click();await action(admin,copy.approve);
 expect((await published(car.id))[0].content.title).toBe(car.title+' revised');
 await partner.reload();await partner.getByRole('button',{name:new RegExp(car.title)}).click();await action(partner,copy.withdraw);expect(await published(car.id)).toHaveLength(0);
 expect((await visitor.goto(base+'/rentals/partner-'+car.id)).status()).toBe(404);
 const mobile=await account('partner',390);await mobile.goto(base+'/partner');await mobile.getByRole('button',{name:new RegExp(created[1].title)}).click();await snapshot(mobile,'partner-mobile');
 const customer=await account('customer');await customer.goto(base+'/admin');await expect(customer).toHaveURL(base+'/profile');await customer.goto(base+'/partner');await expect(customer).toHaveURL(base+'/profile');
 const guest=await account('guest');await guest.goto(base+'/partner');await expect(guest).toHaveURL(base+'/login');
 expect(errors).toEqual([]);results.push({status:'PASS',checks:['published-edit-preserved','rejection-reason','resubmission-approved','withdrawal-404','mobile-no-overflow','customer-denied','guest-login'],jsErrors:errors});
 console.log(JSON.stringify(results,null,2));
}catch(error){results.push({status:'FAIL',error:error.message,jsErrors:errors});if(browser)for(const context of contexts)for(const page of context.pages())await page.screenshot({path:path.join(output,'failure-'+contexts.indexOf(context)+'.png'),fullPage:true}).catch(()=>{});throw error;}
finally{
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
 await browser?.close();server.kill();await new Promise(r=>backendServer.close(r));await db.close();fs.closeSync(log);
}
