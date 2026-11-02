// Explicitly opt-in real-model QA: existing authenticated staging, synthetic data only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hostedContext,stagingBase} from './hosted-context.mjs';
import {cases} from '../../tests/concierge/scenarios.mjs';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
const {base,headers,identity}=await hostedContext();assert.equal(base,stagingBase);
const output=process.env.CONCIERGE_LIVE_AI_RESULTS;assert.ok(output&&path.isAbsolute(output));
const scripts={ru:/[А-Яа-яЁё]/u,uk:/[А-Яа-яІіЇїЄє]/u,he:/[\u0590-\u05ff]/u,ar:/[\u0600-\u06ff]/u,fa:/[\u0600-\u06ff]/u,zh:/[\u3400-\u9fff]/u,ja:/[\u3040-\u30ff\u3400-\u9fff]/u,ko:/[\uac00-\ud7af]/u};
const results=[];
async function chat(locale,messages){
 const start=Date.now(),response=await fetch(base+'/api/chat',{method:'POST',redirect:'error',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({locale,messages}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();assert.equal(response.status,200);assert.equal(data.source,'workers-ai','Real cloud inference required');assert.equal(data.configured,true);assert.notEqual(data.error,true);assert.ok(typeof data.reply==='string'&&data.reply.trim()&&data.reply.length<=4000);assert.doesNotMatch(data.reply,/<\/?think\b/i);
 if(scripts[locale])assert.match(data.reply,scripts[locale],'Selected language script');
 return {data,ms:Date.now()-start};
}
for(const {code:locale} of SUPPORTED_LANGUAGES){
 const scenario=cases.find(c=>c.locale===locale);assert.ok(scenario);
 try{const {data,ms}=await chat(locale,[{role:'user',content:scenario.query}]);assert.equal(data.cards[0]?.href,scenario.expected);results.push({name:'language-'+locale,status:'PASS',locale,ms,source:data.source,query:scenario.query,reply:data.reply,destination:data.cards[0].href});}
 catch(error){results.push({name:'language-'+locale,status:'FAIL',locale,error:error.message});}
}
try{
 const first=[{role:'user',content:'Help me choose a yacht in Miami.'}],a=await chat('en',first);
 const second=[...first,{role:'assistant',content:a.data.reply},{role:'user',content:'For 8 guests tomorrow'}],b=await chat('en',second);
 assert.equal(b.data.cards[0]?.href,'/yachts');results.push({name:'real-multiturn-yacht',status:'PASS',reply:b.data.reply,source:b.data.source});
}catch(error){results.push({name:'real-multiturn-yacht',status:'FAIL',error:error.message});}
const report={base,identity,at:new Date().toISOString(),syntheticOnly:true,realModelRequired:true,reservationsCreated:0,results,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:results.length,pass:report.pass,fail:report.fail,failures:results.filter(r=>r.status==='FAIL')}));if(report.fail)process.exitCode=1;
