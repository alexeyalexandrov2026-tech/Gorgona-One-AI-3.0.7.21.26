import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workerBuildArgs,checkBuildDependencyVersions} from '../../scripts/i18n/build-worker.mjs';

test('packaging explicitly selects the Wrangler configuration used for deployment',()=>{
 const base=workerBuildArgs([]),staging=workerBuildArgs(['--config','wrangler.dashboard-staging.json']);
 assert.equal(base[base.indexOf('--config')+1],'wrangler.jsonc');
 assert.equal(staging[staging.indexOf('--config')+1],'wrangler.dashboard-staging.json');
 assert.ok(staging.includes('--skipNextBuild'));
 for(const args of [['--config'],['--config','../wrangler.jsonc'],['--env','production'],['--config','wrangler.dashboard-staging.json','--config','wrangler.jsonc']])assert.throws(()=>workerBuildArgs(args),/configuration/);
});

test('packaging refuses dependencies inherited from a different checkout',()=>{
 const expected={next:'15.5.28',react:'19.0.9','react-dom':'19.0.9','@opennextjs/cloudflare':'1.20.13'};
 assert.doesNotThrow(()=>checkBuildDependencyVersions(expected,{...expected}));
 for(const name of Object.keys(expected))assert.throws(()=>checkBuildDependencyVersions(expected,{...expected,[name]:'0.0.0'}),/dependency mismatch/);
 assert.throws(()=>checkBuildDependencyVersions(expected,{}),/Run npm ci/);
});
