// Actual concierge triggers, providers and dialogs, isolated from framework routing.
import assert from 'node:assert/strict';
import http from 'node:http';
import {build} from 'esbuild';
import {expect} from '@playwright/test';
import {launchConciergeBrowser} from './browser-engine.mjs';
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import {AIProvider} from './app/components/ai/AIProvider.jsx';
import {ChatProvider} from './app/components/ai/ChatProvider.jsx';
import {AiDockProvider} from './app/components/ai/AiDockProvider.jsx';
import DiscoveryDock from './app/components/ai/DiscoveryDock.jsx';
import {AiSphere} from './app/components/ai/AiSphere.jsx';
import {AiDock} from './app/components/ai/AiDock.jsx';
createRoot(document.getElementById('root')).render(<AIProvider><ChatProvider><AiDockProvider><DiscoveryDock/><AiSphere/><AiDock/></AiDockProvider></ChatProvider></AIProvider>);`;
const compiled=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-framework-routing',setup(b){
 b.onResolve({filter:/^next\/(navigation|link)$/},args=>({path:args.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='next/link'?`import {createElement} from 'react';export default function Link(props){return createElement('a',props);}`:`export const useRouter=()=>({push(){},refresh(){}});export const usePathname=()=>'/discovery';`,loader:'js',resolveDir:process.cwd()}));
}}]});
const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/fixture.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?compiled.outputFiles[0].text:'<!doctype html><html><head><style>[aria-hidden="true"]{display:none}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await launchConciergeBrowser();
 console.log('Browser: '+browser.browserType().name()+' '+browser.version());
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 for(const [trigger,panel] of [[page.locator('button.aidock'),page.locator('.dr__panel')],[page.getByRole('button',{name:'Open the Discovery Room concierge',exact:true}),page.getByRole('dialog',{name:'MIAMI ELIO AI Dock',exact:true})]]){
  await expect(trigger).toBeEnabled();await trigger.click();await expect(panel).toBeVisible();
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.ok(await panel.evaluate(el=>el.contains(document.activeElement)),'Focus must stay inside the open dialog');}
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
  console.log('PASS dialog traps keyboard focus and restores the clicked opener');
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
