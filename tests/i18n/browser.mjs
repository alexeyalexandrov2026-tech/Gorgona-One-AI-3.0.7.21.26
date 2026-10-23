import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { build } from 'esbuild';
import '../../lib/savedServerCatalog.js';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { SAVED_MESSAGES, savedMessage, savedSource } from '../../lib/savedCopy.js';
import { getTranslation } from '../../lib/i18n.js';
import { appFiles, messageId } from '../../scripts/i18n/catalogue.mjs';
import { getRentals } from '../../lib/rentalsData.js';
import { getYachts } from '../../lib/yachtsData.js';
import { getVacationRentals } from '../../lib/vacationRentalsData.js';
import { getExperiences } from '../../lib/experiencesData.js';
import { getVenues } from '../../lib/restaurantsNightlifeData.js';
import { allDeals, categories } from '../../lib/dealsData.js';

const baseURL = process.env.I18N_BASE_URL || 'http://127.0.0.1:3024';
const output = process.env.I18N_QA_OUTPUT || '/tmp/miami-elio-i18n-qa';
fs.mkdirSync(output,{recursive:true});
let server;
if (!process.env.I18N_BASE_URL) {
  const log = fs.openSync(path.join(output,'server.log'),'a');
  server = spawn(process.execPath,['--require',path.resolve('tests/i18n/server-fixtures.cjs'),'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3024'],{stdio:['ignore',log,log]});
  process.on('exit',()=>server.kill('SIGTERM'));
  let ready=false;
  for (let attempt=0;attempt<80;attempt++) {
    try { if ((await fetch(baseURL,{signal:AbortSignal.timeout(1000)})).ok) {ready=true;break;} } catch {}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  if (!ready) throw new Error('The isolated Next.js server did not become ready.');
}
const launch = {headless:true};
if (process.env.I18N_BROWSER_EXECUTABLE) launch.executablePath = process.env.I18N_BROWSER_EXECUTABLE;
if (process.env.I18N_BROWSER_ARGS_FILE) launch.args = JSON.parse(fs.readFileSync(process.env.I18N_BROWSER_ARGS_FILE,'utf8'));
const results = [];
const locales = SUPPORTED_LANGUAGES.map(language => language.code);
const selectedCases = process.argv.slice(2);
const proofDoc = '<!doctype html><html lang="en" dir="ltr"><meta name="viewport" content="width=device-width"><body><label>Supplier fixture state<input id="widget-state" value="initial"></label><p>Deterministic supplier document for identity/state testing only.</p></body></html>';

async function choose(page,locale) {
  const language = SUPPORTED_LANGUAGES.find(item => item.code === locale);
  const button=page.locator('header button[aria-haspopup="listbox"]');
  // A full route navigation first restores the saved locale during hydration.
  // Open only when closed; a pre-hydration click can otherwise be discarded.
  await expect(async()=>{
    if(await button.getAttribute('aria-expanded')!=='true')await button.click();
    await expect(page.getByRole('listbox')).toBeVisible({timeout:800});
  }).toPass({timeout:20000});
  await page.getByRole('option').filter({has:page.getByText(language.nativeLabel,{exact:true})}).click();
  // The selected saved bundle loads asynchronously; wait for the controller's
  // rendered selection before validating the document attributes.
  await expect(button).toHaveAttribute('aria-label',savedSource(locale,'Language: {language}',{language:language.nativeLabel}),{timeout:15000});
  await expect(page.locator('html')).toHaveAttribute('lang',locale,{timeout:15000});
  await expect(page.locator('html')).toHaveAttribute('dir',language.dir,{timeout:15000});
  await page.evaluate(()=>document.fonts.ready).catch(async()=>{await page.waitForLoadState('domcontentloaded');});
  await expect(page.locator('header button[aria-haspopup="listbox"]')).toHaveAttribute('aria-label',savedSource(locale,'Language: {language}',{language:language.nativeLabel}));
}
async function noOverflow(page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if(extra>2) console.log('OVERFLOW '+JSON.stringify(await page.evaluate(()=>({lang:document.documentElement.lang,width:innerWidth,items:[...document.querySelectorAll('body *')].filter(n=>!n.closest('svg')).map(n=>({tag:n.tagName,cls:String(n.className).slice(0,100),text:n.textContent?.slice(0,60),left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:n.getBoundingClientRect().width})).filter(n=>n.right>innerWidth+2||n.left< -2).slice(0,14)}))));
  expect(extra).toBeLessThanOrEqual(2);
}
async function scenario(name,viewport,task) {
  if (selectedCases.length && !selectedCases.includes(name)) return;
  // A fresh process per case also supports constrained single-process Chromium.
  const browser = await chromium.launch(launch);
  const context = await browser.newContext({viewport});
  const page = await context.newPage();
  const errors = [], translationRequests = [], supplierNavigations = [], consoleErrors = [];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('pageerror',error => errors.push(error.message));
  page.on('request',request => {
    if (/generaltranslation|api\.lingo|weglot|crowdin/i.test(request.url())) translationRequests.push(request.url());
  });
  page.on('framenavigated',frame => { if (/^https:\/\/(yatr\.co|www\.stay22\.com)/.test(frame.url())) supplierNavigations.push(frame.url()); });
  await page.route(url => ['yatr.co','www.stay22.com'].includes(url.hostname),route => route.fulfill({contentType:'text/html',body:proofDoc}));
  const started = Date.now();
  try {
    await task(page,{supplierNavigations,context});
    expect(errors).toEqual([]);
    expect(translationRequests).toEqual([]);
    expect(consoleErrors.filter(message=>/hydration|Minified React|uncaught|application error|Failed to load admin data/i.test(message))).toEqual([]);
    results.push({name,status:'passed',viewport,durationMs:Date.now()-started,jsErrors:errors,consoleErrors,translationRequests,supplierNavigations});
    console.log(`PASS ${name}`);
  } catch (error) {
    await page.screenshot({path:path.join(output,name+'-failure.png'),fullPage:true}).catch(()=>{});
    results.push({name,status:'failed',viewport,durationMs:Date.now()-started,error:error.message,jsErrors:errors,consoleErrors,translationRequests,supplierNavigations});
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await context.close().catch(()=>{});
    await browser.close().catch(()=>{});
    fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({baseURL,results},null,2));
  }
}

await scenario('home-desktop',{width:1440,height:1000},async page => {
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  for (const locale of locales) {
    await choose(page,locale);
    const heading = savedMessage(locale,'ui.e50dfd503195d9af',{highlight:savedMessage(locale,'home.titleEm')});
    await expect(page.locator('main h1')).toHaveText(heading);
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await noOverflow(page);
  }
  await choose(page,'ja');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('lang','ja');
  await expect(page.locator('header nav').getByRole('link',{name:getTranslation('ja').nav.travel,exact:true})).toBeVisible();
  await page.screenshot({path:path.join(output,'home-ja-desktop.png'),fullPage:false});
});

await scenario('home-mobile',{width:390,height:844},async page => {
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  for (const locale of locales) {
    await choose(page,locale);
    await expect(page.locator('main h1')).toHaveText(savedMessage(locale,'ui.e50dfd503195d9af',{highlight:savedMessage(locale,'home.titleEm')}));
    await noOverflow(page);
  }
  await choose(page,'ar');
  await page.screenshot({path:path.join(output,'home-ar-mobile.png'),fullPage:false});
});

for (const [name,route,headingKey,ids] of [
  ['yatr','/yachts','yatr.title',['yatr-catalogue']],
  ['stay22','/vacation-rentals','worlds.stays.title',['stay22-map','stay22-list']]
]) await scenario(name,{width:390,height:844},async (page,{supplierNavigations}) => {
  await page.goto(baseURL+route,{waitUntil:'domcontentloaded'});
  const nodes=[];
  for (const id of ids) {
    const iframe = page.locator('#'+id);
    await iframe.scrollIntoViewIfNeeded();
    const state = page.frameLocator('#'+id).locator('#widget-state');
    await expect(state).toBeVisible();
    await state.fill(id+'-preserved');
    nodes.push({id,handle:await iframe.elementHandle(),attrs:await iframe.evaluate(node=>({src:node.getAttribute('src'),allow:node.getAttribute('allow'),loading:node.getAttribute('loading'),height:node.getAttribute('height'),width:node.getAttribute('width'),style:node.getAttribute('style')}))});
  }
  const before = supplierNavigations.length;
  for (const locale of locales) {
    await page.evaluate(()=>scrollTo(0,0));
    await choose(page,locale);
    await expect(page.locator('main h1')).toHaveText(savedMessage(locale,headingKey));
    for (const {id,handle,attrs} of nodes) {
      expect(await handle.evaluate(node=>node===document.getElementById(node.id))).toBe(true);
      expect(await page.locator('#'+id).evaluate(node=>({src:node.getAttribute('src'),allow:node.getAttribute('allow'),loading:node.getAttribute('loading'),height:node.getAttribute('height'),width:node.getAttribute('width'),style:node.getAttribute('style')}))).toEqual(attrs);
      await expect(page.frameLocator('#'+id).locator('#widget-state')).toHaveValue(id+'-preserved');
    }
    expect(supplierNavigations.length).toBe(before);
    await noOverflow(page);
  }
  await page.screenshot({path:path.join(output,name+'-mobile.png'),fullPage:false});
});

await scenario('booking-state',{width:1440,height:1000},async page => {
  let submitted;
  await page.route('**/api/book',async route => { submitted=route.request().postDataJSON(); await route.fulfill({json:{success:true,bookingId:'55555555-5555-4555-8555-555555555555',replayed:false}}); });
  await page.goto(baseURL+'/rentals/lamborghini-urus-se',{waitUntil:'domcontentloaded'});
  const form = page.locator('main form');
  await expect(form.locator('input[type="date"]').first()).not.toHaveValue('');
  await form.locator('input[autocomplete="name"]').fill('I18N QA Customer');
  await form.locator('input[type="tel"]').fill('+13055550123');
  await form.locator('input[type="email"]').fill('i18n-qa@example.com');
  await form.locator('select').selectOption('4');
  const before = await form.locator('input, select').evaluateAll(nodes=>nodes.map(node=>node.value));
  for(const locale of locales){
    await choose(page,locale);
    await expect(page.locator('main')).toContainText(getTranslation(locale).rentals.location);
    expect(await form.locator('input, select').evaluateAll(nodes=>nodes.map(node=>node.value))).toEqual(before);
  }
  await choose(page,'ru');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('main')).toContainText(savedMessage('ru','worlds.form.sentTitle'));
  expect(submitted).toMatchObject({name:'I18N QA Customer',phone:'+13055550123',email:'i18n-qa@example.com',itemSlug:'lamborghini-urus-se'});
  expect(submitted.dates).toContain('Delivery: MIA airport');
  expect(submitted.itemTitle).toBeTruthy();
});
// Provider records deliberately collide with owned message text.
const eventFixture={id:'i18n-event',name:'Show code',venue:'Photos',city:'Miami',state:'FL',localDateTime:'2027-01-15T19:30:00',url:'https://www.ticketnetwork.com/event/i18n-fixture'};
async function mockCalendar(page,onRequest=()=>{}) {
  await page.route('**/api/events/ticketnetwork?*',route=>{onRequest(route.request());return route.fulfill({json:{events:[eventFixture],total:1,page:Number(new URL(route.request().url()).searchParams.get('page')),hasMore:false,performers:['Show code'],cities:['Miami'],updatedAt:'2026-10-22T12:00:00Z',stale:false}});});
}
await scenario('event-records-and-filters',{width:390,height:844},async page=>{
  const requests=[];await mockCalendar(page,r=>requests.push(r.url()));
  await page.goto(baseURL+'/events/category/nba',{waitUntil:'domcontentloaded'});
  const row=page.locator('[data-event-id="i18n-event"]');await expect(row).toBeVisible();
  const calendar=page.locator('[data-ticketnetwork-calendar]').first();
  await calendar.locator('input[name="performer"]').fill('Show code');
  await calendar.locator('input[name="city"]').fill('Miami');
  const count=requests.length;
  for(const locale of locales){await page.evaluate(()=>scrollTo(0,0));await choose(page,locale);await expect(row.locator('h4')).toHaveText('Show code');await expect(row.locator('p')).toContainText('Photos');await expect(row.locator('a')).toHaveAttribute('href',eventFixture.url);await expect(calendar.locator('input[name="performer"]')).toHaveValue('Show code');await expect(calendar.locator('input[name="city"]')).toHaveValue('Miami');expect(requests.length).toBe(count);await noOverflow(page);}
});
await scenario('auth-error',{width:390,height:844},async page=>{
  await page.route(url=>url.hostname.endsWith('.supabase.co'),route=>route.fulfill({status:400,json:{code:'invalid_credentials',error_code:'invalid_credentials',msg:'private upstream diagnostic'}}));
  await page.goto(baseURL+'/login',{waitUntil:'domcontentloaded'});
  await choose(page,'en');
  const form=page.locator('main form');await form.locator('input[type="email"]').fill('i18n-qa@example.com');await form.locator('input[type="password"]').fill('Test-fixture-only-123');await form.locator('button[type="submit"]').click();
  await expect(page.locator('main')).toContainText(savedMessage('en','authError.credentials'));
  for(const locale of locales){await choose(page,locale);await expect(page.locator('main')).toContainText(savedMessage(locale,'authError.credentials'));await expect(page.locator('main')).not.toContainText('private upstream diagnostic');await noOverflow(page);}
});
async function mockRole(context,role){
  const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'i18n-qa@example.com',app_metadata:{provider:'email'},user_metadata:{name:'I18N QA Customer',role,company_name:'QA Fixture Company',metadata:{}},created_at:'2026-01-01T00:00:00Z'};
  const exp=Math.floor(Date.now()/1000)+7200;
  const jwt=[{alg:'HS256',typ:'JWT'},{aud:'authenticated',role:'authenticated',sub:user.id,exp},'fixture-only'].map(p=>Buffer.from(typeof p==='string'?p:JSON.stringify(p)).toString('base64url')).join('.');
  const host=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://placeholder.supabase.co').hostname;
  await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+host.split('.')[0]+'-auth-token',session:{access_token:jwt,refresh_token:'fixture-only',expires_in:7200,expires_at:exp,token_type:'bearer',user}});
  await context.route(url=>url.hostname.endsWith('.supabase.co'),route=>{
    if(!['GET','HEAD'].includes(route.request().method()))return route.fulfill({status:400,json:{error:'Unexpected fixture mutation blocked'}});
    const url=new URL(route.request().url());
    const json=url.pathname.includes('/auth/')?user:url.pathname.includes('partner_listings')?[{id:'fixture-listing',partner_id:user.id,title:'Show code',description:'A partner-authored fixture remains unchanged.',price:199,currency:'USD',status:'pending',images:[],profiles:{name:user.user_metadata.name,email:user.email,company_name:'QA Fixture Company'}}]:[{id:user.id,name:user.user_metadata.name,email:user.email,role,company_name:'QA Fixture Company'}];
    return route.fulfill({json:route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json') && Array.isArray(json) ? json[0] : json,headers:{'content-range':'0-0/1'}});
  });
}
for(const[role,route,title]of [['admin','/admin','Admin{break}Console'],['partner','/partner','Partner{break}Desk'],['user','/profile','Concierge{break}Desk']])await scenario('role-'+role,{width:390,height:844},async(page,{context})=>{
  await mockRole(context,role);await page.goto(baseURL+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('main h1')).toHaveText(title.replace('{break}',''));
  let input;
  if(role==='admin'){await page.getByRole('button',{name:'✏️ Edit before approval',exact:true}).click();input=page.locator('main input').first();await input.fill('I18N QA edited draft');}
  if(role==='partner'){input=page.locator('main form input').first();await input.fill('I18N QA service draft');}
  for(const locale of locales){await page.evaluate(()=>scrollTo(0,0));await choose(page,locale);await expect(page.locator('main h1')).toHaveText(savedSource(locale,title).replace('{break}',''));if(input)await expect(input).toHaveValue(role==='admin'?'I18N QA edited draft':'I18N QA service draft');await noOverflow(page);}
});
await scenario('chat-state',{width:390,height:844},async page=>{
  const calls=[];await page.route('**/api/chat',route=>{calls.push(route.request().postDataJSON());return route.fulfill({json:{reply:'Fixture answer stays in its original language.',sessionId:'i18n-fixture-session',cards:[],suggestions:[]}});});
  await page.goto(baseURL+'/discovery',{waitUntil:'domcontentloaded'});const form=page.locator('main form').last();const input=form.locator('input');await input.fill('Show code is my private message.');await form.locator('button[type="submit"]').click();await expect(page.locator('main')).toContainText('Fixture answer stays in its original language.');await input.fill('Unsent draft 123');
  for(const locale of locales){await page.evaluate(()=>scrollTo(0,0));await choose(page,locale);await expect(page.locator('main')).toContainText('Show code is my private message.');await expect(page.locator('main')).toContainText('Fixture answer stays in its original language.');await expect(input).toHaveValue('Unsent draft 123');expect(calls.length).toBe(1);await noOverflow(page);}
});
await scenario('not-found',{width:390,height:844},async page=>{
  const response=await page.goto(baseURL+'/i18n-this-page-does-not-exist',{waitUntil:'domcontentloaded'});expect(response.status()).toBe(404);
  for(const locale of locales){await choose(page,locale);await expect(page.locator('body')).toContainText(savedSource(locale,'This page could not be found.'));await noOverflow(page);}
});
await scenario('global-error-cold',{width:390,height:844},async page=>{
  // Render the actual root boundary in a fresh document. Its client bundle
  // must restore the language without LocaleProvider or a preloaded catalog.
  const fixture=await build({
    stdin:{
      contents:"import React from 'react';import {createRoot} from 'react-dom/client';import GlobalError from './app/global-error.js';localStorage.setItem('gorgona-locale',new URL(location.href).searchParams.get('locale'));createRoot(document).render(React.createElement(GlobalError,{error:new Error('Fixture only'),reset:()=>{document.body.dataset.recovered='true'}}));",
      resolveDir:process.cwd(),sourcefile:'root-boundary-fixture.jsx',loader:'jsx'
    },
    bundle:true,platform:'browser',format:'iife',write:false,jsx:'automatic',
    loader:{'.js':'jsx'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'
  });
  await page.route(baseURL+'/__i18n-root-error*',route=>route.fulfill({
    contentType:new URL(route.request().url()).pathname.endsWith('.js')?'application/javascript':'text/html',
    body:new URL(route.request().url()).pathname.endsWith('.js')?fixture.outputFiles[0].text:'<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body><script src="/__i18n-root-error.js"></script></body></html>'
  }));
  for(const locale of locales){
    await page.goto(baseURL+'/__i18n-root-error?locale='+locale,{waitUntil:'domcontentloaded'});
    await expect(page.locator('h2')).toHaveText(savedSource(locale,'Critical Error'));
    await expect(page.locator('p')).toHaveText(savedSource(locale,'A critical system error occurred. We have logged the issue and are working on it.'));
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('html')).toHaveAttribute('dir',SUPPORTED_LANGUAGES.find(item=>item.code===locale).dir);
    await page.getByRole('button',{name:savedSource(locale,'Try again'),exact:true}).click();
    await expect(page.locator('body')).toHaveAttribute('data-recovered','true');
  }
});
await scenario('document-locale-reconciliation',{width:390,height:844},async page=>{
  await page.goto(baseURL+'/draftkings-promos',{waitUntil:'domcontentloaded'});
  for(const locale of locales){
    await choose(page,locale);
    // A late root-attribute reconciliation must not roll back a selection
    // when it happens without another LocaleProvider render.
    await page.evaluate(()=>{
      document.documentElement.lang='stale';
      document.documentElement.dir='rtl';
    });
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('html')).toHaveAttribute('dir',SUPPORTED_LANGUAGES.find(item=>item.code===locale).dir);
    expect(await page.evaluate(()=>localStorage.getItem('gorgona-locale'))).toBe(locale);
  }
});
for (const [name, viewport] of [
  ['route-matrix', {width:1440,height:1000}],
  ['route-matrix-mobile', {width:390,height:844}]
]) await scenario(name,viewport,async(page,{context})=>{
  await mockRole(context,'admin');await mockCalendar(page);
  // Each full route load starts with matching server and client English state.
  // Locale persistence is exercised separately without this fixture reset.
  await context.addInitScript(()=>{
    const selected=document.cookie.match(/(?:^|; )gorgona-locale=([^;]*)/)?.[1]||'en';
    localStorage.setItem('gorgona-locale',decodeURIComponent(selected));
  });
  const samples={'/rentals/[slug]':'/rentals/'+getRentals()[0].slug,'/yachts/[slug]':'/yachts/'+getYachts()[0].slug,'/vacation-rentals/[slug]':'/vacation-rentals/'+getVacationRentals()[0].slug,'/experiences/[slug]':'/experiences/'+getExperiences()[0].slug,'/restaurants-nightlife/[slug]':'/restaurants-nightlife/'+getVenues()[0].slug,'/deals/[slug]':'/deals/'+allDeals[0].slug,'/stores/[category]':'/stores/'+categories[0].slug,'/sportsbook/[slug]':'/sportsbook/hard-rock-bet','/events/category/[category]':'/events/category/nba','/events/league/[league]':'/events/league/nba','/events/[slug]':'/events/i18n-no-published-event'};
  const matrix=[], failures=[];
  const normalize=text=>text.replace(/\s+/g,' ').trim();
  const prose=Object.values(SAVED_MESSAGES.en).filter(text=>
    !/\{[A-Za-z][A-Za-z0-9_]*\}/.test(text) && (text.match(/\b[A-Za-z]{2,}\b/g)||[]).length>=5);
  for(const file of appFiles().filter(f=>f.endsWith('/page.js'))){
    const template=file.slice(3,-8)||'/';
    if(process.env.I18N_ROUTE_TEMPLATE && !process.env.I18N_ROUTE_TEMPLATE.split(',').includes(template))continue;
    const route=samples[template]||template;
    console.log('CHECK '+template);
    let completedLocales=0;
    try {
    await context.addCookies([{name:'gorgona-locale',value:'en',url:baseURL}]);
    const response=await page.goto(baseURL+route,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{window.__i18nInitialRoot=document.documentElement;});
    const status=response.status();
    if(template==='/concierge'){
      // This existing route deliberately redirects; validate its destination.
      expect([200,307]).toContain(status);
      await page.waitForURL(baseURL+'/discovery');
    }else expect(status).toBe(template==='/events/[slug]'?404:200);
    const content=await page.locator('main').count()?page.locator('main'):page.locator('body');
    const english=normalize(await content.innerText());
    const ownedProse=[...new Set(prose.filter(text=>english.includes(normalize(text))))];
    for(const locale of locales){
      await choose(page,locale);
      const mustTranslate=ownedProse.filter(text=>savedSource(locale,text)!==text);
      await expect.poll(async()=>{
        const rendered=normalize(await content.innerText());
        return mustTranslate.filter(text=>rendered.includes(normalize(text)));
      },{timeout:10000,message:`Owned English prose remains on ${template} in ${locale}`}).toEqual([]);
      expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(50);
      await expect(page.locator('nextjs-portal')).toHaveCount(0);
      await noOverflow(page);
      await expect(page.locator('html')).toHaveAttribute('lang',locale);
      await expect(page.locator('html')).toHaveAttribute('dir',SUPPORTED_LANGUAGES.find(item=>item.code===locale).dir);
      completedLocales++;
    }
    matrix.push({template,route,status,outcome:'passed',locales:completedLocales,ownedProse:ownedProse.length,finalURL:page.url()});
    console.log('ROUTE '+template);
    } catch(error) {
      const documentState=await page.evaluate(()=>({
        sameRoot:window.__i18nInitialRoot===document.documentElement,
        lang:document.documentElement.lang,dir:document.documentElement.dir,
        stored:localStorage.getItem('gorgona-locale'),
        selected:document.querySelector('header button[aria-haspopup="listbox"]')?.getAttribute('aria-label'),
        cookie:document.cookie.match(/(?:^|; )gorgona-locale=([^;]*)/)?.[1]
      })).catch(()=>null);
      failures.push({template,error:error.message,documentState});
      matrix.push({template,route,outcome:'failed',locales:completedLocales,error:error.message,documentState,finalURL:page.url()});
      await page.screenshot({path:path.join(output,name+'-'+template.replace(/[^a-z0-9]+/gi,'-')+'-failure.png'),fullPage:true}).catch(()=>{});
      console.error('ROUTE FAIL '+template+': '+error.message+' '+JSON.stringify(documentState));
    } finally {
      fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(matrix,null,2));
    }
  }
  expect(matrix.length).toBeGreaterThan(0);
  expect(failures,'Every selected route must pass all locale checks').toEqual([]);
});
server?.kill('SIGTERM');
console.log(JSON.stringify(results.map(({name,status})=>({name,status}))));
