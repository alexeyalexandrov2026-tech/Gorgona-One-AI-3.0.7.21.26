// Real voice hook, synthetic browser recognition failures; no microphone or AI.
import assert from 'node:assert/strict';
import http from 'node:http';
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
const entry=`import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {useVoice} from './app/components/ai/useVoice.js';
import {ChatProvider} from './app/components/ai/ChatProvider.jsx';
import {AiConversation} from './app/components/ai/AiConversation.jsx';
window.results=[];window.mode='constructor';window.sessions=[];
window.fetch=async()=>{throw Error('Fixture offline transport; no provider access');};
window.SpeechRecognition=class {
 constructor(){if(window.mode==='constructor')throw Error('Fixture constructor failure');window.sessions.push(this);}
 set lang(value){if(window.mode==='configuration')throw Error('Fixture language failure');this.language=value;}
 start(){if(window.mode==='start')throw Error('Fixture start failure');}
 stop(){this.onend?.();}
};
function Probe(){const voice=useVoice();useEffect(()=>{window.voice=voice;});return <><button id="mic" disabled={!voice.recognitionSupported} onClick={()=>voice.startListening(text=>window.results.push(text))}>Mic</button><output>{voice.error||'ready'}</output></>;}
createRoot(document.getElementById('root')).render(<ChatProvider><Probe/><AiConversation/></ChatProvider>);`;
const compiled=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'navigation-fixture',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
 b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));
 // Router navigation is outside this isolated hook/form check; inspect real hrefs.
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='link'?`import {createElement} from 'react';export default function Link(props){return createElement('a',props);}`:`export const useRouter=()=>({refresh(){}});export const usePathname=()=>'/discovery';`,loader:'js',resolveDir:process.cwd()}));
}}]});
const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/fixture.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?compiled.outputFiles[0].text:'<!doctype html><html><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.I18N_BROWSER_EXECUTABLE?{executablePath:process.env.I18N_BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
 await page.route('**/api/**',()=>{throw Error('Voice fixture must not invoke APIs');});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await expect(page.locator('#mic')).toBeEnabled();
 for(const mode of ['constructor','configuration','start']){
  await page.evaluate(mode=>window.mode=mode,mode);await page.locator('#mic').click();
  assert.deepEqual(errors,[],mode+' failure must not escape the voice boundary');
  await expect(page.locator('output')).toHaveText('unavailable');
  assert.equal(await page.evaluate(()=>window.voice.isListening),false);
  await page.evaluate(()=>{window.sessions.at(-1)?.onresult?.({results:[[{transcript:'Late failed result'}]]});});
  assert.deepEqual(await page.evaluate(()=>window.results),[],'Failed recognition must not deliver a result');
  await page.evaluate(()=>window.mode='success');await page.locator('#mic').click();
  await expect(page.locator('output')).toHaveText('ready');
  assert.equal(await page.evaluate(()=>window.voice.isListening),true);
  await page.evaluate(()=>{window.sessions.at(-1).onresult({results:[[{transcript:'Recovered request'}]]});window.voice.stopListening();});
  assert.deepEqual(await page.evaluate(()=>window.results),['Recovered request']);
  await page.evaluate(()=>window.results=[]);
  console.log('PASS '+mode+' failure is contained; stale result ignored; next dictation recovers');
 }
 await page.evaluate(()=>window.mode='constructor');
 const form=page.locator('form');
 await expect(form.locator('button[aria-pressed]')).toBeEnabled();
 await form.locator('button[aria-pressed]').click();
 await expect(page.getByRole('alert')).toBeVisible();
 await form.locator('input').fill('Rent a yacht');
 await form.locator('button[type="submit"]').click();
 await expect(page.locator('a[href="/yachts"]').first()).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 console.log('PASS real conversation recovers from constructor failure through text and yacht recommendation');
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
