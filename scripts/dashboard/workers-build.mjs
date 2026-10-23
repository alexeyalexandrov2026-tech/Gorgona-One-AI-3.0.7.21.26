// Workers Builds already provides an isolated Git checkout. This entry does
// not need a developer machine's private config file or hosting credentials.
import fs from 'node:fs';import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {publicConfig,artifactHash} from './staging-release.mjs';
import {STAGING_PROJECT,STAGING_URL} from '../../lib/server/dashboardStaging.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function settings(env,wrangler,gitCommit){
  const c=publicConfig({project_ref:STAGING_PROJECT,url:env.NEXT_PUBLIC_SUPABASE_URL,anonKey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY});
  const commit=env.WORKERS_CI_COMMIT_SHA||gitCommit;
  if(!/^[a-f0-9]{40}$/.test(commit||'')||gitCommit&&gitCommit!==commit)throw Error('Build commit does not match the checkout');
  if(wrangler.name!=='miami-elio-dashboard-staging'||wrangler.main!=='workers/dashboard-staging.mjs'||wrangler.routes||wrangler.route||wrangler.env||wrangler.assets?.run_worker_first!==true||wrangler.vars?.NEXT_PUBLIC_SUPABASE_URL!==STAGING_URL)throw Error('Only the protected staging Worker may use this build');
  return {...c,commit};
}
function git(...args){try{return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}}
function run(args,env){const r=spawnSync(process.execPath,args,{cwd:root,env,stdio:'inherit'});if(r.error||r.status!==0)throw Error('Staging build failed');}
function main(){
  const wrangler=JSON.parse(fs.readFileSync(path.join(root,'wrangler.dashboard-staging.json'),'utf8'));
  const head=git('rev-parse','HEAD'),c=settings(process.env,wrangler,head);
  if(head&&git('status','--porcelain','--untracked-files=no'))throw Error('Tracked source must be committed');
  const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:c.url,NEXT_PUBLIC_SUPABASE_ANON_KEY:c.anonKey,NEXT_PRIVATE_STANDALONE:'true',NEXT_TELEMETRY_DISABLED:'1',GORGONA_AI_ENABLED:'off'};
  for(const name of ['SUPABASE_SERVICE_ROLE_KEY','BOOKING_RATE_SECRET','DASHBOARD_OUTBOX_TOKEN','DASHBOARD_STAGING_ACCESS_SECRET','TELEGRAM_BOT_TOKEN','TELEGRAM_OWNER_CHAT_ID','RESEND_API_KEY','ADMIN_EMAIL','NOTIFICATIONS_FROM_EMAIL','GEMINI_API_KEY','OPENAI_API_KEY'])env[name]='';
  run(['node_modules/next/dist/bin/next','build'],env);
  run(['scripts/i18n/build-worker.mjs','--config','wrangler.dashboard-staging.json'],env);
  const release={commit:c.commit,tree:git('rev-parse','HEAD^{tree}'),projectRef:c.projectRef,clientKeyHash:createHash('sha256').update(c.anonKey).digest('hex'),builtAt:new Date().toISOString(),artifactHash:artifactHash(root)};
  fs.writeFileSync(path.join(root,'.open-next/dashboard-staging-release.json'),JSON.stringify(release,null,2)+'\n');
  console.log('Prepared protected staging release '+c.commit);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch{console.error('Staging build refused. Check the saved commit, staging public configuration and build log.');process.exitCode=1;}
