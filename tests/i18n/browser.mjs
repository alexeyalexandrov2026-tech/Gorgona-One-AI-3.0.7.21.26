import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import '../../lib/savedServerCatalog.js';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { savedMessage, savedSource } from '../../lib/savedCopy.js';
import { getTranslation } from '../../lib/i18n.js';

const baseURL = process.env.I18N_BASE_URL || 'http://127.0.0.1:3024';
const output = process.env.I18N_QA_OUTPUT || '/tmp/miami-elio-i18n-qa';
fs.mkdirSync(output,{recursive:true});
let server;
if (!process.env.I18N_BASE_URL) {
  const log = fs.openSync(path.join(output,'server.log'),'a');
  server = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3024'],{stdio:['ignore',log,log]});
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
  await page.locator('header button[aria-haspopup="listbox"]').click();
  await page.getByRole('option').filter({has:page.getByText(language.nativeLabel,{exact:true})}).click();
  await expect(page.locator('html')).toHaveAttribute('lang',locale);
  await expect(page.locator('html')).toHaveAttribute('dir',language.dir);
}
async function noOverflow(page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(extra).toBeLessThanOrEqual(2);
}
async function scenario(name,viewport,task) {
  if (selectedCases.length && !selectedCases.includes(name)) return;
  // A fresh process per case also supports constrained single-process Chromium.
  const browser = await chromium.launch(launch);
  const context = await browser.newContext({viewport});
  const page = await context.newPage();
  const errors = [], translationRequests = [], supplierNavigations = [];
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
    results.push({name,status:'passed',viewport,durationMs:Date.now()-started,jsErrors:errors,translationRequests,supplierNavigations});
    console.log(`PASS ${name}`);
  } catch (error) {
    await page.screenshot({path:path.join(output,name+'-failure.png'),fullPage:true}).catch(()=>{});
    results.push({name,status:'failed',viewport,durationMs:Date.now()-started,error:error.message,jsErrors:errors,translationRequests,supplierNavigations});
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
  for (const locale of ['ru','de','he','ar','fa','ja','ko','zh']) {
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
  await page.route('**/api/book',async route => { submitted=route.request().postDataJSON(); await route.fulfill({json:{ok:true}}); });
  await page.goto(baseURL+'/rentals/lamborghini-urus-se',{waitUntil:'domcontentloaded'});
  const form = page.locator('main form');
  await expect(form.locator('input[type="date"]').first()).not.toHaveValue('');
  await form.locator('input[autocomplete="name"]').fill('I18N QA Customer');
  await form.locator('input[type="tel"]').fill('+13055550123');
  await form.locator('input[type="email"]').fill('i18n-qa@example.com');
  await form.locator('select').selectOption('4');
  const before = await form.locator('input, select').evaluateAll(nodes=>nodes.map(node=>node.value));
  await choose(page,'ru');
  await expect(page.locator('main')).toContainText(getTranslation('ru').rentals.location);
  expect(await form.locator('input, select').evaluateAll(nodes=>nodes.map(node=>node.value))).toEqual(before);
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('main')).toContainText(savedMessage('ru','worlds.form.sentTitle'));
  expect(submitted).toMatchObject({name:'I18N QA Customer',phone:'+13055550123',email:'i18n-qa@example.com',itemSlug:'lamborghini-urus-se'});
  expect(submitted.dates).toContain('Delivery: MIA airport');
  expect(submitted.itemTitle).toBeTruthy();
});
server?.kill('SIGTERM');
console.log(JSON.stringify(results.map(({name,status})=>({name,status}))));
