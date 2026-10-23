import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {publicConfig,artifactHash} from '../../scripts/dashboard/staging-release.mjs';
import {STAGING_PROJECT,STAGING_URL} from '../../lib/server/dashboardStaging.mjs';
const key=claims=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.test';
test('staging release rejects production URLs, mismatched JWT projects and privileged client keys',()=>{
 const c={project_ref:STAGING_PROJECT,url:STAGING_URL,anonKey:key({ref:STAGING_PROJECT,role:'anon'})};
 assert.equal(publicConfig(c).projectRef,STAGING_PROJECT);
 for(const changed of [{url:'https://ctszqhhvalyqxhbfqifx.supabase.co'},{project_ref:'ctszqhhvalyqxhbfqifx'},{anonKey:key({ref:'ctszqhhvalyqxhbfqifx',role:'anon'})},{anonKey:key({ref:STAGING_PROJECT,role:'service_role'})},{anonKey:'placeholder'}])assert.throws(()=>publicConfig({...c,...changed}));
});
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stage-artifact-test-'));
 for(const name of ['.open-next/worker.js','workers/dashboard-staging.mjs','lib/server/dashboardStaging.mjs','wrangler.dashboard-staging.json']){const p=path.join(dir,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'saved '+name);}
 return dir;
}
test('artifact integrity detects changed bundles and wrapper code but excludes its own receipt',()=>{
 const dir=fixture();try{
  const initial=artifactHash(dir);fs.writeFileSync(path.join(dir,'.open-next/dashboard-staging-release.json'),'receipt');assert.equal(artifactHash(dir),initial);
  fs.appendFileSync(path.join(dir,'.open-next/worker.js'),' changed');assert.notEqual(artifactHash(dir),initial);
  const bundle=artifactHash(dir);fs.appendFileSync(path.join(dir,'workers/dashboard-staging.mjs'),' changed');assert.notEqual(artifactHash(dir),bundle);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('artifact integrity rejects links that could pull files from outside the saved build',()=>{
 const dir=fixture();try{fs.symlinkSync(path.join(dir,'wrangler.dashboard-staging.json'),path.join(dir,'.open-next/unsafe-link'));assert.throws(()=>artifactHash(dir),/symlinks/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
