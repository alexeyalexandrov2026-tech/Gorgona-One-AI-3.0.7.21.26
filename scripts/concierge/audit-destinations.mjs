// Read each Discovery destination covered by hosted concierge acceptance.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import load from '../../tests/concierge/load.cjs';
import {isConciergeAcceptanceDestination} from '../../tests/concierge/scenarios.mjs';
assert.equal(process.env.CONCIERGE_HOSTED_ACCEPTANCE,'1');
const base=process.env.CONCIERGE_TEST_BASE||'https://gorgona-one.com',output=process.env.CONCIERGE_RESULTS;
assert.ok(['https://gorgona-one.com','http://127.0.0.1:3058'].includes(base));assert.ok(output&&path.isAbsolute(output));
const {getEcosystemIndex}=load('lib/ai/ecosystemIndex.js');
const queue=[...new Set(getEcosystemIndex().map(entity=>entity.href).filter(isConciergeAcceptanceDestination))],results=[];
async function worker(){for(;;){const route=queue.shift();if(!route)return;try{assert.match(route,/^\/(?!\/)/);const response=await fetch(base+route,{redirect:'follow',signal:AbortSignal.timeout(30000)});await response.body?.cancel();assert.equal(response.status,200);assert.equal(new URL(response.url).origin,new URL(base).origin);results.push({route,status:'PASS',httpStatus:response.status,finalUrl:response.url});}catch(error){results.push({route,status:'FAIL',error:error.message});}}}
await Promise.all([worker(),worker(),worker()]);
const report={base,at:new Date().toISOString(),readOnly:true,results,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({base,checks:results.length,pass:report.pass,fail:report.fail,failures:results.filter(r=>r.status==='FAIL')}));if(report.fail)process.exitCode=1;
