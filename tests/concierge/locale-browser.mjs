// Deterministic delayed-language regression, using the real providers/hooks.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {build} from 'esbuild';
import {expect} from '@playwright/test';
import {launchConciergeBrowser} from './browser-engine.mjs';
const root=process.cwd();
const entry=`import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {LocaleProvider,useLocale} from './app/components/LocaleProvider.jsx';
import {ChatProvider,useConciergeChat} from './app/components/ai/ChatProvider.jsx';
import {useVoice} from './app/components/ai/useVoice.js';
function Probe(){const voice=useVoice(),chat=useConciergeChat(),locale=useLocale();useEffect(()=>{window.probe={voice,chat,locale};});return <button id="mic" disabled={!voice.recognitionSupported} onClick={()=>voice.startListening(()=>{})}>Microphone</button>;}
localStorage.setItem('gorgona-locale','ru');
window.recognitions=[];window.fetches=[];
window.SpeechRecognition=class{start(){window.recognitions.push(this.lang);}stop(){}};
window.fetch=async (...args)=>{window.fetches.push(args);return new Response(JSON.stringify({reply:'Fixture',error:true}),{headers:{'content-type':'application/json'}});};
createRoot(document.getElementById('root')).render(<LocaleProvider><ChatProvider><Probe/></ChatProvider></LocaleProvider>);`;
const compiled=await build({stdin:{contents:entry,resolveDir:root,loader:'jsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-navigation-and-delayed-catalogue',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
 b.onResolve({filter:/savedCopy(?:\.js)?$/},args=>args.namespace==='fixture'?undefined:{path:'catalogue',namespace:'fixture'});
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',resolveDir:root,contents:args.path==='navigation'?`const router={refresh(){}};export const useRouter=()=>router;export const usePathname=()=>'/discovery';`:`export * from ${JSON.stringify(path.join(root,'lib/savedCopy.js'))};import {loadSavedLocale as load} from ${JSON.stringify(path.join(root,'lib/savedCopy.js'))};export async function loadSavedLocale(code){await new Promise(resolve=>window.releaseCatalogue=resolve);return load(code);}`}));
}}]});
const script=compiled.outputFiles[0].text;
const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/fixture.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?script:'<!doctype html><html lang="en"><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await launchConciergeBrowser();
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await expect.poll(()=>page.evaluate(()=>!!window.releaseCatalogue&&!!window.probe)).toBe(true).catch(error=>{console.error(JSON.stringify(errors));throw error;});
 await page.evaluate(()=>{window.probe.voice.startListening(()=>{});return window.probe.chat.send('Нужна яхта');});
 assert.deepEqual(await page.evaluate(()=>window.recognitions),[],'Voice must wait for the saved language');
 assert.deepEqual(await page.evaluate(()=>window.fetches),[],'Chat must wait for the saved language');
 await expect(page.locator('#mic')).toBeDisabled();
 await page.evaluate(()=>window.releaseCatalogue());
 await expect.poll(()=>page.evaluate(()=>window.probe.locale)).toBe('ru');
 await expect(page.locator('#mic')).toBeEnabled();await page.locator('#mic').click();
 assert.deepEqual(await page.evaluate(()=>window.recognitions),['ru-RU']);
 await page.evaluate(()=>window.probe.chat.send('Нужна яхта'));
 assert.equal(await page.evaluate(()=>JSON.parse(window.fetches[0][1].body).locale),'ru');
 assert.deepEqual(errors,[]);
 console.log('PASS delayed saved-language restoration blocks early voice/chat and uses ru-RU/ru after completion');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
