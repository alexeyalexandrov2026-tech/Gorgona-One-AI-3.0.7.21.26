import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import load from './load.cjs';

test('local provider deadlines include held response bodies and oversized JSON is rejected',async()=>{
 const keys=['GORGONA_AI_ENABLED','GORGONA_AI_URL','GORGONA_AI_PATH','GORGONA_AI_PROTOCOL','GORGONA_AI_TIMEOUT_MS'],saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 let mode='held',closed=false;
 const server=http.createServer((req,res)=>{
  if(req.url==='/ping'){res.end('{}');return;}
  res.on('close',()=>closed=true);res.writeHead(200,{'Content-Type':'application/json'});
  if(mode==='held'){res.write('{"response":');return;}
  res.end(JSON.stringify({response:'fixture',padding:'x'.repeat(512*1024)}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  await(await fetch(base+'/ping')).text();
  Object.assign(process.env,{GORGONA_AI_ENABLED:'true',GORGONA_AI_URL:base,GORGONA_AI_PATH:'/chat',GORGONA_AI_PROTOCOL:'gorgona',GORGONA_AI_TIMEOUT_MS:'100'});
  const brain=load('lib/ai/localBrain.js');
  let guard;const timeout=new Promise(resolve=>{guard=setTimeout(()=>resolve('deadline-missed'),1500);});
  const held=await Promise.race([brain.askLocalBrain({messages:[{role:'user',content:'QA'}]}),timeout]);clearTimeout(guard);
  assert.notEqual(held,'deadline-missed','Headers must not end the response-body deadline');assert.equal(held.ok,false);
  await new Promise(resolve=>setTimeout(resolve,20));assert.equal(closed,true,'Aborted provider connection must close');
  mode='oversized';process.env.GORGONA_AI_TIMEOUT_MS='1000';brain.resetLocalBrain();
  const large=await brain.askLocalBrain({messages:[{role:'user',content:'QA'}]});assert.equal(large.ok,false);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));for(const key of keys)if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
