// Authorized synthetic requests against the existing private staging gate.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {hostedContext,stagingBase} from './hosted-context.mjs';
const {base,headers,identity}=await hostedContext();assert.equal(base,stagingBase);
const output=process.env.CONCIERGE_USAGE_RESULTS;assert.ok(output&&path.isAbsolute(output));
const key=crypto.randomUUID(),body={locale:'en',messages:[{role:'user',content:'Help me choose a yacht'}]};
async function send(value,extra={}){const r=await fetch(base+'/api/chat',{method:'POST',redirect:'error',headers:{...headers,'Content-Type':'application/json',Origin:base,'Idempotency-Key':key,...extra},body:JSON.stringify(value),signal:AbortSignal.timeout(30000)});return {status:r.status,data:await r.json()};}
const results=[];
async function check(name,run){try{await run();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:error.message});}}
await check('same-origin initial request uses the model',async()=>{const r=await send(body);assert.equal(r.status,200);assert.equal(r.data.source,'workers-ai');assert.equal(r.data.configured,true);});
await check('same request ID cannot start inference twice and retains navigation',async()=>{const r=await send(body);assert.equal(r.status,200);assert.equal(r.data.source,'navigation');assert.equal(r.data.configured,false);assert.equal(r.data.error,true);assert.equal(r.data.cards[0]?.href,'/yachts');});
await check('same request ID with changed content is denied',async()=>{const r=await send({...body,locale:'ru'});assert.equal(r.data.source,'navigation');assert.equal(r.data.error,true);});
await check('cross-origin JSON is rejected before admission',async()=>{assert.equal((await send(body,{Origin:'https://untrusted.example'})).status,403);});
await check('cross-origin form-like requests are rejected',async()=>{assert.equal((await send(body,{Origin:'https://untrusted.example','Content-Type':'text/plain'})).status,415);});
const report={base,identity,at:new Date().toISOString(),requestId:key,syntheticOnly:true,bookingCalls:0,results,pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.fail)process.exitCode=1;
