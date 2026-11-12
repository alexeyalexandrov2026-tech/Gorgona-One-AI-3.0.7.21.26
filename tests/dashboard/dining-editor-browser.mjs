// Actual React editor + SQL-backed handlers, rendered without HTTP/network dependencies.
// Only next/navigation is replaced: this harness does not test Next navigation or hosting.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {chromium,expect as baseExpect} from '@playwright/test';
import {build} from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import {fixture,ids,rpc} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {diningEditorHandlers} from '../../lib/server/diningEditorHandlers.mjs';
import {diningVenue} from '../../lib/server/diningCatalogue.mjs';
import {getDiningEditorCopy} from '../../lib/dining/editorCopy.mjs';
import {getPartnerListingCopy} from '../../lib/partnerListingCopy.mjs';
import {getVenueBySlug} from '../../lib/restaurantsNightlifeData.js';
import {venueDraft} from '../../lib/dining/editor.mjs';
import {SUPPORTED_LANGUAGES,getLanguageDir} from '../../lib/languages.js';

const root=fileURLToPath(new URL('../../',import.meta.url)),require=createRequire(import.meta.url);
const output=path.resolve(process.env.DINING_EDITOR_QA_OUTPUT||path.join(root,'../outputs/dining-r5-editor-browser'));
fs.mkdirSync(output,{recursive:true});
const expect=baseExpect.configure({timeout:12000});
const env={...fixtureEnv,DINING_EDITOR_ENABLED:'true',DINING_EDITOR_WRITES_ENABLED:'true'};
const db=await fixture(),fetcher=provider(db),handlers=diningEditorHandlers(env,fetcher),results=[];
const tailwindConfig=require('../../tailwind.config.js');
const processed=await postcss([tailwind({...tailwindConfig,content:[path.join(root,'app/**/*.{js,jsx}'),path.join(root,'tests/dashboard/dining-editor-entry.jsx')]})]).process(
 ['globals.css','design-system.css','ai-overlays.css'].map(file=>fs.readFileSync(path.join(root,'app',file),'utf8')).join('\n'),{from:path.join(root,'app/globals.css')});
const fontDirectory=process.env.DINING_FONT_CACHE_ROOT?path.resolve(process.env.DINING_FONT_CACHE_ROOT):path.join(root,'../outputs/dining-r5-font-cache');
const fonts=fs.readdirSync(path.join(fontDirectory,'css')).map(file=>fs.readFileSync(path.join(fontDirectory,'css',file),'utf8')).join('\n');
const fontCSS=[...fonts.matchAll(/@font-face\{[^}]+\}/g)].map(match=>match[0]).filter(block=>!block.includes(' Fallback;')).map(block=>block.replace(/url\(([^)]+)\)/g,(_match,relative)=>{
 const clean=relative.replace(/["']/g,''),file=clean.startsWith('/_next/static/')?path.join(fontDirectory,clean.slice('/_next/static/'.length)):path.resolve(fontDirectory,'css',clean);
 if(!file.startsWith(path.join(fontDirectory,'media')+path.sep))throw Error('Unexpected font path');
 return 'url(data:font/woff2;base64,'+fs.readFileSync(file).toString('base64')+')';
})).join('\n');
const bundle=await build({entryPoints:[path.join(root,'tests/dashboard/dining-editor-entry.jsx')],bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{
 name:'qa-navigation-only',setup(build){
  build.onResolve({filter:/^next\/navigation$/},()=>({path:'qa-navigation',namespace:'qa'}));
  build.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:"const router={refresh(){}};export function useRouter(){return router;}export function usePathname(){return '/admin';}",loader:'js'}));
 }
}]});
const code=bundle.outputFiles[0].text;
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fontCSS+'\n'+processed.css+'\n:root{--font-g1-sans:Jost;--font-g1-display:"Bodoni Moda";--font-display:"Inter Tight";--font-inter:Inter;--font-serif:"Playfair Display";}</style></head><body><div id="qa-root"></div><script>'+code.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
const launch={headless:true,executablePath:process.env.I18N_BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'};
if(process.env.I18N_BROWSER_ARGS_FILE)launch.args=JSON.parse(fs.readFileSync(process.env.I18N_BROWSER_ARGS_FILE,'utf8'));
let browser;
const baseline=venueDraft(getVenueBySlug('komodo-miami'));
function request(options={}){return new Request('https://dining-qa.example/api/dashboard/dining/venues/komodo-miami',{method:options.method||'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ids.admin,...options.headers},...(options.body?{body:options.body}:{})});}
async function restore(){
 const current=await rpc(db,'dining_venue_read',{p_actor:ids.admin,p_id:'komodo'});
 if(!current.revision)return;
 const save=await rpc(db,'dining_venue_command',{p_actor:ids.admin,p_id:'komodo',p_slug:'komodo-miami',p_key:randomUUID(),p_fingerprint:'a'.repeat(64),p_action:'save',p_version:current.revision,p_content:baseline});
 if(!save.success)throw Error('Fixture reset failed');
 const publication=await rpc(db,'dining_venue_command',{p_actor:ids.admin,p_id:'komodo',p_slug:'komodo-miami',p_key:randomUUID(),p_fingerprint:'b'.repeat(64),p_action:'publish',p_version:save.revision,p_content:null});
 if(!publication.success)throw Error('Fixture republish failed');
}
async function scenario(locale,viewport,name,task){
 await restore();
 const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],calls=[];
 let dropSave=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.exposeFunction('diningQARead',async(_url,options)=>{
  const response=options.method==='POST'?await handlers.command(request(options),'komodo-miami'):await handlers.read(request(options),'komodo-miami');
  const body=await response.json();calls.push({method:options.method||'GET',status:response.status,action:options.body?JSON.parse(options.body).action:null});
  if(dropSave&&options.method==='POST'&&JSON.parse(options.body).action==='save'&&response.status===200){dropSave=false;return {status:503,body:{error:'Simulated response loss'}};}
  return {status:response.status,body};
 });
 await context.addInitScript(locale=>localStorage.setItem('gorgona-locale',locale),locale);
 await page.route('**/*',route=>route.request().url()==='https://dining-qa.example/'?route.fulfill({status:200,contentType:'text/html',body:html}):route.abort());
 const copy=getDiningEditorCopy(locale),listing=getPartnerListingCopy(locale);
 try{
  await page.goto('https://dining-qa.example/');
  const editor=page.getByRole('region',{name:copy.title,exact:true});await expect(editor).toBeVisible();
  await expect(editor.getByLabel(copy.name,{exact:true})).toHaveValue(baseline.name);
  await expect(editor.getByLabel(copy.website,{exact:true})).toHaveAttribute('dir','ltr');
  await expect(page.locator('html')).toHaveAttribute('dir',getLanguageDir(locale));
  await task({page,editor,copy,listing,drop:()=>{dropSave=true;}});
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({path:path.join(output,name+'.png'),fullPage:true,animations:'disabled'});
  results.push({name,locale,viewport,status:'PASS',errors,calls});
  console.log('PASS '+name);
 }catch(error){results.push({name,locale,viewport,status:'FAIL',error:error.message,errors,calls});await page.screenshot({path:path.join(output,name+'-failed.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));await context.close();}
}
try{
 browser=await chromium.launch(launch);
 await scenario('en',{width:1440,height:1000},'desktop-save-publish',async({editor,copy,listing,drop})=>{
  const draftBefore=await rpc(db,'dining_venue_read',{p_actor:ids.admin,p_id:'komodo'});
  const initialVersion=draftBefore.revision;
  await editor.getByLabel(copy.address,{exact:true}).fill('QA reviewed dining address');drop();
  await editor.getByRole('button',{name:listing.saveDraft,exact:true}).click();
  await expect(editor.getByRole('alert')).toHaveText(listing.error);
  await editor.getByRole('button',{name:listing.saveDraft,exact:true}).click();
  await expect(editor.getByRole('status')).toHaveText(listing.saved);
  expect((await rpc(db,'dining_venue_read',{p_actor:ids.admin,p_id:'komodo'})).revision).toBe(initialVersion+1);
  expect((await diningVenue('komodo-miami',env,fetcher)).address).toBe(baseline.address);
  await expect(editor.getByRole('button',{name:copy.publish,exact:true})).toBeDisabled();
  await editor.getByRole('checkbox',{name:copy.review,exact:true}).check();
  await editor.getByRole('button',{name:copy.publish,exact:true}).click();
  await expect(editor.getByRole('status')).toHaveText(copy.published);
  expect((await diningVenue('komodo-miami',env,fetcher)).address).toBe('QA reviewed dining address');
  await expect(editor.getByLabel(copy.description,{exact:true})).toHaveAttribute('readonly','');
 });
 await scenario('en',{width:390,height:844},'mobile-conflict-withdrawal',async({editor,copy,listing})=>{
  const saved=await rpc(db,'dining_venue_read',{p_actor:ids.admin,p_id:'komodo'});
  await rpc(db,'dining_venue_command',{p_actor:ids.admin,p_id:'komodo',p_slug:'komodo-miami',p_key:randomUUID(),p_fingerprint:'c'.repeat(64),p_action:'save',p_version:saved.revision,p_content:{...baseline,address:'Another administrator draft'}});
  await editor.getByLabel(copy.address,{exact:true}).fill('Stale edit must not overwrite');
  await editor.getByRole('button',{name:listing.saveDraft,exact:true}).click();
  await expect(editor.getByRole('alert')).toHaveText(listing.conflict);
  await expect(editor.getByLabel(copy.address,{exact:true})).toHaveValue('Stale edit must not overwrite');
  await editor.getByRole('button',{name:copy.reload,exact:true}).click();
  await expect(editor.getByLabel(copy.address,{exact:true})).toHaveValue('Another administrator draft');
  await editor.getByRole('combobox',{name:'Status',exact:true}).selectOption('unverified');
  await editor.getByRole('button',{name:listing.saveDraft,exact:true}).click();await expect(editor.getByRole('status')).toHaveText(listing.saved);
  await editor.getByRole('checkbox',{name:copy.review,exact:true}).check();await editor.getByRole('button',{name:copy.publish,exact:true}).click();
  await expect(editor.getByRole('status')).toHaveText(copy.published);
  expect((await diningVenue('komodo-miami',env,fetcher)).status).toBe('unverified');
 });
 for(const {code} of SUPPORTED_LANGUAGES){
  await scenario(code,{width:320,height:844},'locale-'+code+'-320',async({editor,copy})=>{
   await expect(editor.getByLabel(copy.description,{exact:true})).toBeVisible();
   await expect(editor.getByRole('button',{name:copy.publish,exact:true})).toBeDisabled();
   await expect(editor.getByRole('checkbox',{name:copy.review,exact:true})).toBeVisible();
  });
 }
 console.log('PASS 18 editor browser scenarios. SQL fixture only; no HTTP server, provider network, production writes or notifications.');
}finally{await browser?.close();await db.close();}
