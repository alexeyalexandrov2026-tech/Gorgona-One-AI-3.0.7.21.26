import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workerBuildArgs} from '../../scripts/i18n/build-worker.mjs';

test('packaging explicitly selects the Wrangler configuration used for deployment',()=>{
 const base=workerBuildArgs([]),staging=workerBuildArgs(['--config','wrangler.dashboard-staging.json']);
 assert.equal(base[base.indexOf('--config')+1],'wrangler.jsonc');
 assert.equal(staging[staging.indexOf('--config')+1],'wrangler.dashboard-staging.json');
 assert.ok(staging.includes('--skipNextBuild'));
 for(const args of [['--config'],['--config','../wrangler.jsonc'],['--env','production'],['--config','wrangler.dashboard-staging.json','--config','wrangler.jsonc']])assert.throws(()=>workerBuildArgs(args),/configuration/);
});
