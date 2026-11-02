// Actual locale provider; measure refresh calls, never invoke a backend.
import assert from 'node:assert/strict';
import http from 'node:http';
import {build} from 'esbuild';
import {expect} from '@playwright/test';
import {launchConciergeBrowser} from './browser-engine.mjs';
const entry=`import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{LocaleProvider,useLocaleController}from'./app/components/LocaleProvider.jsx';function Probe(){const c=useLocaleController();useEffect(()=>{window.localeController=c;});return <output data-ready={String(c.ready)}>{c.locale}</output>;}createRoot(document.getElementById('root')).render(<LocaleProvider><Probe/></LocaleProvider>);`;
const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,jsx:'automatic',platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'router-refresh-probe',setup(b){b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`const router={refresh(){window.refreshCount=(window.refreshCount||0)+1;}};export const useRouter=()=>router;export const usePathname=()=>location.pathname;`,loader:'js'}));}}]});
const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/fixture.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?bundle.outputFiles[0].text:'<!doctype html><html><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,browser=await launchConciergeBrowser();
try{
 for(const c of [{cookie:'ru',stored:'ru',path:'/discovery',expected:0},{cookie:'en',stored:'ru',path:'/discovery',expected:1},{cookie:'en',stored:'en',path:'/discovery',expected:0},{cookie:'en',stored:'ru',path:'/yachts',expected:0}]){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await context.addCookies([{name:'gorgona-locale',value:c.cookie,url:base}]);
  await context.addInitScript(stored=>{localStorage.setItem('gorgona-locale',stored);window.refreshCount=0;window.fetch=()=>{throw Error('No backend calls');};},c.stored);
  await page.goto(base+c.path);await expect(page.locator('output')).toHaveAttribute('data-ready','true');await expect(page.locator('output')).toHaveText(c.stored);
  assert.equal(await page.evaluate(()=>refreshCount),c.expected,'Restoring a matching server cookie must not refresh its document');
  await page.evaluate(()=>localeController.setLocale('de'));await expect(page.locator('output')).toHaveText('de');
  assert.equal(await page.evaluate(()=>refreshCount),c.expected+(c.path==='/yachts'?0:1),'Explicit selections still refresh eligible server text');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({...c,status:'PASS'}));await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
