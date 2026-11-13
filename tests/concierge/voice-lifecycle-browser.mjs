// Real chat and voice hooks with controlled recognition and chat transport.
import assert from 'node:assert/strict';
import http from 'node:http';
import {build} from 'esbuild';
import {expect} from '@playwright/test';
import {launchConciergeBrowser} from './browser-engine.mjs';
const reply='Take a short cruise on Biscayne Bay.';
const entry=`import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useVoice} from './app/components/ai/useVoice.js';
import {ChatProvider,useConciergeChat} from './app/components/ai/ChatProvider.jsx';
import {AiConversation} from './app/components/ai/AiConversation.jsx';
window.results=[];window.mode='constructor';window.sessions=[];
window.fetch=async()=>{
 const response=()=>Response.json({reply:${JSON.stringify(reply)},configured:true});
 if(window.mode==='reply')return response();
 if(window.mode==='pending')return new Promise(resolve=>{window.completeReply=()=>resolve(response());});
 throw Error('Fixture offline transport; no provider access');
};
window.SpeechRecognition=class {
 constructor(){if(window.mode==='constructor')throw Error('Fixture constructor failure');window.sessions.push(this);}
 set lang(value){if(window.mode==='configuration')throw Error('Fixture language failure');this.language=value;}
 start(){if(window.mode==='start')throw Error('Fixture start failure');}
 stop(){this.onend?.();}
};
function Probe(){const voice=useVoice();useEffect(()=>{window.voice=voice;});return <><button id="mic" disabled={!voice.recognitionSupported} onClick={()=>voice.startListening(text=>window.results.push(text))}>Mic</button><output>{voice.error||'ready'}</output></>;}
function ChatFixture(){
 const {reset}=useConciergeChat();
 const [primaryActive,setPrimaryActive]=useState(true);
 return <>
  <button onClick={reset}>Reset thread</button>
  <button onClick={()=>setPrimaryActive(value=>!value)}>Switch active chat</button>
  <section aria-label="Primary chat"><AiConversation active={primaryActive}/></section>
  <section aria-label="Secondary chat"><AiConversation active={!primaryActive}/></section>
 </>;
}
createRoot(document.getElementById('root')).render(<ChatProvider><Probe/><ChatFixture/></ChatProvider>);`;
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
 browser=await launchConciergeBrowser();
 console.log('Browser: '+browser.browserType().name()+' '+browser.version());
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
 const primary=page.getByRole('region',{name:'Primary chat',exact:true});
 const secondary=page.getByRole('region',{name:'Secondary chat',exact:true});
 const form=primary.locator('form');
 await expect(form.locator('button[aria-pressed]')).toBeEnabled();
 await form.locator('button[aria-pressed]').click();
 await expect(page.getByRole('alert')).toBeVisible();
 await form.locator('input').fill('Rent a yacht');
 await form.locator('button[type="submit"]').click();
 await expect(primary.locator('a[href="/yachts"]')).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 console.log('PASS real conversation recovers from constructor failure through text and yacht recommendation');
 const announcement=primary.getByRole('status'),secondaryAnnouncement=secondary.getByRole('status');
 await expect(announcement).toHaveText('The concierge is temporarily unavailable. Please try again shortly.');
 await expect(secondaryAnnouncement).toBeEmpty();
 await page.reload();
 await expect(primary.locator('a[href="/yachts"]')).toBeVisible();
 await expect(announcement).toBeEmpty();
 await page.evaluate(()=>window.mode='reply');
 const primaryInput=form.getByRole('textbox');
 await primaryInput.fill('Help me choose a yacht outing.');
 await primaryInput.press('Enter');
 await expect(announcement).toHaveText(reply);
 await expect(primaryInput).toBeFocused();
 await expect(primaryInput).toBeEditable();
 await expect(announcement.locator('span')).toHaveAttribute('lang','en');
 await expect(secondary.getByText(reply,{exact:true})).toBeVisible();
 await expect(secondaryAnnouncement).toBeEmpty();

 const switchChat=page.getByRole('button',{name:'Switch active chat',exact:true});
 await switchChat.click();
 await expect(announcement).toBeEmpty();
 await expect(secondaryAnnouncement).toBeEmpty();
 await page.evaluate(()=>window.mode='pending');
 const secondaryInput=secondary.getByRole('textbox');
 await secondaryInput.fill('What would you pick for a short outing?');
 await secondaryInput.press('Enter');
 await expect(secondary.locator('[aria-busy="true"]')).toHaveCount(1);
 await expect(secondaryInput).toBeFocused();
 await expect(secondaryInput).not.toBeEditable();
 await expect(secondaryAnnouncement).toBeEmpty();
 await switchChat.click();
 await page.evaluate(()=>window.completeReply());
 await expect(announcement).toHaveText(reply);
 await expect(secondaryAnnouncement).toBeEmpty();

 await page.getByRole('button',{name:'Reset thread',exact:true}).click();
 await expect(announcement).toBeEmpty();
 await expect(secondaryAnnouncement).toBeEmpty();
 console.log('PASS reply announcements cover transport failure, history restoration, in-flight switching and reset');
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
