import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {settings} from '../../scripts/dashboard/workers-build.mjs';
import {STAGING_PROJECT,STAGING_URL} from '../../lib/server/dashboardStaging.mjs';
const wrangler=JSON.parse(fs.readFileSync(new URL('../../wrangler.dashboard-staging.json',import.meta.url)));
const commit='a'.repeat(40),anon='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({ref:STAGING_PROJECT,role:'anon'})).toString('base64url')+'.fixture';
const env={NEXT_PUBLIC_SUPABASE_URL:STAGING_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,WORKERS_CI_COMMIT_SHA:commit};
test('managed Workers build pins the exact checkout and client project',()=>{
 assert.equal(settings(env,wrangler,commit).commit,commit);
 assert.equal(settings(env,wrangler,null).projectRef,STAGING_PROJECT);
 assert.throws(()=>settings({...env,WORKERS_CI_COMMIT_SHA:'b'.repeat(40)},wrangler,commit));
 assert.throws(()=>settings({...env,NEXT_PUBLIC_SUPABASE_URL:'https://ctszqhhvalyqxhbfqifx.supabase.co'},wrangler,commit));
 assert.throws(()=>settings({...env,WORKERS_CI_COMMIT_SHA:''},wrangler,null));
});
test('managed build cannot use the production Worker or a bypassed asset gate',()=>{
 for(const change of [{name:'gorgonaoneai3072126'},{routes:['gorgona-one.com/*']},{main:'.open-next/worker.js'},{assets:{...wrangler.assets,run_worker_first:false}},{env:{production:{}}}])assert.throws(()=>settings(env,{...wrangler,...change},commit));
});
