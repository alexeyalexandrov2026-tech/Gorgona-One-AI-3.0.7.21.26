// QA-only access to the existing private staging gate, never application auth.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export const stagingBase='https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev';
export async function hostedContext(){
 assert.equal(process.env.CONCIERGE_HOSTED_ACCEPTANCE,'1');
 const base=process.env.CONCIERGE_TEST_BASE||'https://gorgona-one.com';
 assert.ok(['https://gorgona-one.com','http://127.0.0.1:3058','http://localhost:3058',stagingBase].includes(base));
 if(base!==stagingBase)return {base,headers:{},identity:null,cookie:null};
 const expected=process.env.CONCIERGE_STAGING_EXPECTED_COMMIT;assert.match(expected||'',/^[a-f0-9]{40}$/);
 const directory=fs.realpathSync(process.env.CONCIERGE_PRIVATE_DIR||''),root=fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
 assert.ok(path.isAbsolute(directory)&&directory!==root&&!directory.startsWith(root+path.sep));
 const secret=JSON.parse(fs.readFileSync(path.join(directory,'worker-secrets.json'))).DASHBOARD_STAGING_ACCESS_SECRET;assert.ok(typeof secret==='string'&&secret.length>=32);
 const response=await fetch(base+'/__dashboard_staging/health',{headers:{Authorization:'Basic '+Buffer.from('preview:'+secret).toString('base64')},redirect:'error',signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,200);const identity=await response.json();assert.equal(identity.projectRef,'kaxslgjbrarapeyoifdh');assert.equal(identity.commit,expected);
 const cookie=response.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie?.startsWith('__Host-miami-staging='));
 return {base,headers:{Cookie:cookie},identity,cookie};
}
