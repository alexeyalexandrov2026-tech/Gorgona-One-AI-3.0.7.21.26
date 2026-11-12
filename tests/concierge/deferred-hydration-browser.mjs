// Actual providers + delayed Suspense hydration. Router/auth transports are fixtures.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import Module from 'node:module';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {build} from 'esbuild';
import {launchConciergeBrowser} from './browser-engine.mjs';
const root=process.cwd(),fixtures=[
 {name:'discovery',file:'ai/AIProvider.jsx',provider:'AIProvider',hook:'useAI',value:'useAI().history[0]?.query',storage:'localStorage',key:'gorgona-ai-session',seed:JSON.stringify({history:[{id:'qa',query:'SAVED'}]})},
 {name:'chat',file:'ai/ChatProvider.jsx',provider:'ChatProvider',hook:'useConciergeChat',value:'useConciergeChat().messages[0]?.content',storage:'sessionStorage',key:'gorgona-concierge-thread',seed:JSON.stringify({messages:[{role:'user',content:'SAVED'}]})},
 {name:'theme',file:'ThemeProvider.jsx',provider:'ThemeProvider',hook:'useAITheme',value:'useAITheme().theme==="light"?"SAVED":null',storage:'localStorage',key:'gorgona-ai-theme',seed:'light'},
 {name:'configured-theme',file:'ThemeProvider.jsx',provider:'ThemeProvider',hook:'useAITheme',props:'defaultTheme="light"',value:'useAITheme().theme==="dark"?"SAVED":null',storage:'localStorage',key:'gorgona-ai-theme',seed:'dark'},
 {name:'locale',file:'LocaleProvider.jsx',provider:'LocaleProvider',hook:'useLocale,useLocaleController',value:'[useLocale(),useLocaleController().locale].every(value=>value==="ru")?"SAVED":null',storage:'localStorage',key:'gorgona-locale',seed:'ru'},
 {name:'auth',file:'AuthProvider.jsx',provider:'AuthProvider',hook:'useAuth',value:'useAuth().session?.id',storage:'localStorage',key:'qa-auth',seed:'SAVED'}
];
const selected=process.argv.slice(2);assert.ok(selected.every(n=>fixtures.some(f=>f.name===n)));
const browser=await launchConciergeBrowser();let passed=0;
try{
 for(const f of fixtures.filter(f=>!selected.length||selected.includes(f.name))){
  const plugin={name:'isolated-transports',setup(b){
   b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
   if(f.name==='auth')b.onResolve({filter:/^\.\.\/\.\.\/lib\/(auth|supabase)$/},args=>({path:args.path.endsWith('/auth')?'auth':'supabase',namespace:'fixture'}));
   b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='auth'?`export async function getSession(){return localStorage.getItem('qa-auth')?{id:'SAVED',role:'user'}:null;}export async function signOut(){}`:args.path==='supabase'?`export const supabase={auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}}};`:`const router={refresh(){},push(){}};export const useRouter=()=>router;export const usePathname=()=>'/discovery';`,loader:'js',resolveDir:root}));
  }};
  const entry=`import React,{Suspense,lazy}from'react';import{${f.provider} as Provider,${f.hook}}from'./app/components/${f.file}';
function useValue(){return (${f.value})||'EMPTY';}function Probe(){const value=useValue();return value==='EMPTY'?<p id="probe">EMPTY</p>:<ul id="probe"><li>{value}</li></ul>;}function Outer(){const value=useValue();return <output id="outer" data-value={value}/>;}
const View=typeof window==='undefined'?Probe:lazy(()=>new Promise(resolve=>window.releaseProbe=()=>resolve({default:Probe})));export function App(){return <Provider ${f.props||''}><Outer/><Suspense fallback={null}><View/></Suspense></Provider>;}`;
  const options={stdin:{contents:entry,resolveDir:root,loader:'jsx'},bundle:true,write:false,jsx:'automatic',logLevel:'silent',plugins:[plugin]};
  const node=await build({...options,platform:'node',format:'cjs',packages:'external'}),filename=path.join(root,'__hydration-fixture.cjs'),mod=new Module(filename);
  mod.filename=filename;mod.paths=Module._nodeModulePaths(root);mod._compile(node.outputFiles[0].text,filename);
  const html=renderToString(React.createElement(mod.exports.App));
  const client=await build({...options,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"'},stdin:{...options.stdin,contents:entry+`;import{hydrateRoot}from'react-dom/client';window.recoveries=[];hydrateRoot(document.getElementById('root'),<App/>,{onRecoverableError:e=>recoveries.push(e.message)});`}});
  const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/fixture.js'?'application/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?client.outputFiles[0].text:'<!doctype html><html><body><div id="root">'+html+'</div><script src="/fixture.js"></script></body></html>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{for(const seeded of [false,true]){
   const context=await browser.newContext(),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(({seeded,storage,key,seed})=>{window.apiAttempts=0;window.fetch=()=>{window.apiAttempts++;throw Error('No API/model calls');};if(seeded)window[storage].setItem(key,seed);},{...f,seeded});
   await page.goto('http://127.0.0.1:'+server.address().port);
   await page.waitForFunction(()=>typeof releaseProbe==='function');
   if(seeded)await page.waitForFunction(()=>document.querySelector('#outer')?.dataset.value==='SAVED');
   await page.evaluate(()=>releaseProbe());
   await page.waitForFunction(expected=>document.querySelector('#probe')?.textContent===expected,seeded?'SAVED':'EMPTY');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>recoveries),[],f.name+' hydration mismatch');assert.equal(await page.evaluate(()=>apiAttempts),0);
   passed++;console.log(JSON.stringify({provider:f.name,seeded,status:'PASS',engine:browser.browserType().name()}));await context.close();
  }}finally{await new Promise(resolve=>server.close(resolve));}
 }
 console.log(JSON.stringify({passed,failed:0}));
}finally{await browser.close();}
