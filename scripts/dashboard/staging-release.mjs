// Build/deploy only the dedicated staging Worker from an immutable Git snapshot.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {STAGING_PROJECT,STAGING_URL} from '../../lib/server/dashboardStaging.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const publicKeyPattern=/^(eyJ[A-Za-z0-9_.-]+|sb_publishable_[A-Za-z0-9_-]+)$/;
const secretNames=['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','BOOKING_RATE_SECRET','DASHBOARD_OUTBOX_TOKEN','DASHBOARD_STAGING_ACCESS_SECRET'];
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
export function publicConfig(c){
  if(c.project_ref!==STAGING_PROJECT||c.url!==STAGING_URL||!publicKeyPattern.test(c.anonKey||''))throw Error('Refusing a non-staging public configuration');
  if(c.anonKey.startsWith('eyJ')){
    let claims;try{claims=JSON.parse(Buffer.from(c.anonKey.split('.')[1],'base64url'));}catch{throw Error('Invalid public key');}
    if(claims.ref!==STAGING_PROJECT||claims.role!=='anon')throw Error('Public key must be the staging anon role');
  }
  return {projectRef:STAGING_PROJECT,url:STAGING_URL,anonKey:c.anonKey};
}
function privateFile(file){
  if(!file||!path.isAbsolute(file))throw Error('An absolute private config path is required');
  const real=fs.realpathSync(file),repository=fs.realpathSync(root);
  if(real===repository||real.startsWith(repository+path.sep))throw Error('Keep private configuration outside the repository');
  if(process.platform!=='win32'&&(fs.statSync(real).mode&0o077))throw Error('Private configuration must be mode 600');
  return JSON.parse(fs.readFileSync(real,'utf8'));
}
function config(){return publicConfig(privateFile(process.env.DASHBOARD_STAGING_CONFIG));}
function run(binary,args,cwd,env=process.env,input){
  const r=spawnSync(binary,args,{cwd,env,input,stdio:input===undefined?'inherit':['pipe','inherit','inherit']});
  if(r.error||r.status!==0)throw Error('Staging command failed: '+path.basename(binary));
}
function tool(dir,name){const p=path.join(dir,'node_modules',...name.split('/'));if(!fs.existsSync(p))throw Error('Missing staging build dependency');return p;}
export function artifactHash(dir){
  const parts=[];
  function walk(relative){
    const absolute=path.join(dir,relative),stat=fs.lstatSync(absolute);
    if(stat.isSymbolicLink())throw Error('Staging artifacts must not contain symlinks');
    if(stat.isDirectory()){for(const name of fs.readdirSync(absolute).sort())walk(path.join(relative,name));}
    else if(relative!==path.join('.open-next','dashboard-staging-release.json'))parts.push(relative+'\0'+hash(fs.readFileSync(absolute)));
  }
  for(const p of ['.open-next','workers/dashboard-staging.mjs','lib/server/dashboardStaging.mjs','wrangler.dashboard-staging.json'])walk(p);
  return hash(parts.join('\n'));
}
function checkedArtifact(){
  const dir=process.env.DASHBOARD_STAGING_BUILD_DIR;
  if(!dir||!path.isAbsolute(dir))throw Error('Set DASHBOARD_STAGING_BUILD_DIR to the reported build directory');
  const release=JSON.parse(fs.readFileSync(path.join(dir,'.open-next/dashboard-staging-release.json'),'utf8'));
  const c=config(),wrangler=JSON.parse(fs.readFileSync(path.join(dir,'wrangler.dashboard-staging.json'),'utf8'));
  if(release.commit!==git('rev-parse','HEAD')||release.tree!==git('rev-parse','HEAD^{tree}')||release.projectRef!==c.projectRef||release.clientKeyHash!==hash(c.anonKey)||release.artifactHash!==artifactHash(dir))throw Error('Staging artifact differs from the current saved source or public configuration');
  if(wrangler.name!=='miami-elio-dashboard-staging'||wrangler.routes||wrangler.route||wrangler.env||wrangler.assets?.run_worker_first!==true)throw Error('Refusing unsafe staging Worker configuration');
  return {dir,release,c};
}
function build(){
  const c=config();if(git('status','--porcelain','--untracked-files=no'))throw Error('Commit tracked source changes before the staging build');
  const commit=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'miami-elio-hosted-staging-'));
  const archive=path.join(dir,'.source.tar');
  run('git',['archive','--format=tar','--output='+archive,commit],root);
  run('tar',['-xf',archive,'-C',dir],root);fs.unlinkSync(archive);
  const modules=process.env.DASHBOARD_STAGING_NODE_MODULES;
  if(modules){
    if(!path.isAbsolute(modules))throw Error('Dependency cache must be an absolute path');
    fs.cpSync(modules,path.join(dir,'node_modules'),{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
  }else run(process.platform==='win32'?'npm.cmd':'npm',['ci'],dir);
  for(const [name,version]of [['next','14.2.35'],['@opennextjs/cloudflare','1.15.1']])if(JSON.parse(fs.readFileSync(tool(dir,name+'/package.json'),'utf8')).version!==version)throw Error('Dependency cache does not match the saved build versions');
  const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:c.url,NEXT_PUBLIC_SUPABASE_ANON_KEY:c.anonKey,NEXT_PRIVATE_STANDALONE:'true',NEXT_TELEMETRY_DISABLED:'1',GORGONA_AI_ENABLED:'off'};
  for(const k of ['SUPABASE_SERVICE_ROLE_KEY','BOOKING_RATE_SECRET','DASHBOARD_OUTBOX_TOKEN','TELEGRAM_BOT_TOKEN','TELEGRAM_OWNER_CHAT_ID','RESEND_API_KEY','ADMIN_EMAIL','NOTIFICATIONS_FROM_EMAIL','GEMINI_API_KEY','OPENAI_API_KEY','DASHBOARD_STAGING_ACCESS_SECRET'])env[k]='';
  console.log('Building isolated staging source '+commit);
  run(process.execPath,[tool(dir,'next/dist/bin/next'),'build'],dir,env);
  run(process.execPath,['scripts/i18n/build-worker.mjs','--config','wrangler.dashboard-staging.json'],dir,env);
  const release={commit,tree,projectRef:c.projectRef,clientKeyHash:hash(c.anonKey),builtAt:new Date().toISOString(),artifactHash:artifactHash(dir)};
  fs.writeFileSync(path.join(dir,'.open-next/dashboard-staging-release.json'),JSON.stringify(release,null,2)+'\n');
  console.log(JSON.stringify({buildDirectory:dir,...release}));
}
async function deploy(){
  const {dir,c}=checkedArtifact(),secrets=privateFile(process.env.DASHBOARD_STAGING_SECRETS);
  if(Object.keys(secrets).some(k=>!secretNames.includes(k))||!secretNames.every(k=>typeof secrets[k]==='string'&&secrets[k].length>=32)||secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY!==c.anonKey)throw Error('Staging secret set is missing, mismatched or contains unrelated credentials');
  if(new Set(['BOOKING_RATE_SECRET','DASHBOARD_OUTBOX_TOKEN','DASHBOARD_STAGING_ACCESS_SECRET'].map(k=>secrets[k])).size!==3)throw Error('Staging signing and access secrets must be distinct');
  const preflight=await fetch(c.url+'/rest/v1/rpc/dashboard_delivery_status',{method:'POST',headers:{apikey:secrets.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+secrets.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_actor:'00000000-0000-4000-8000-000000000000'}),signal:AbortSignal.timeout(15000)});
  if(preflight.status!==200||(await preflight.json()).error!=='forbidden')throw Error('Staging service credential or migration preflight failed');
  const wrangler=tool(dir,'wrangler/bin/wrangler.js'),args=['--config','wrangler.dashboard-staging.json'];
  // The first version fails closed (503) until encrypted runtime secrets exist.
  run(process.execPath,[wrangler,'deploy',...args],dir);
  run(process.execPath,[wrangler,'secret','bulk',...args],dir,process.env,JSON.stringify(secrets));
  console.log('Staging deployed; run probe and hosted browser acceptance on the returned URL.');
}
async function probe(){
  const {release}=checkedArtifact(),secrets=privateFile(process.env.DASHBOARD_STAGING_SECRETS),url=new URL(process.env.DASHBOARD_STAGING_URL||'');
  if(url.protocol!=='https:'||!/^miami-elio-dashboard-staging\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)||url.pathname!=='/'||url.search||url.hash)throw Error('Use only the staging workers.dev URL returned by deployment');
  const options={redirect:'error',signal:AbortSignal.timeout(15000)},anonymous=await fetch(url,options);
  if(anonymous.status!==401)throw Error('Staging access gate failed');
  const headers={Authorization:'Basic '+Buffer.from('preview:'+secrets.DASHBOARD_STAGING_ACCESS_SECRET).toString('base64')};
  const health=await fetch(new URL('/__dashboard_staging/health',url),{...options,headers}),body=await health.json();
  if(health.status!==200||body.commit!==release.commit||body.projectRef!==STAGING_PROJECT)throw Error('Hosted staging release identity mismatch');
  const invalid=await fetch(new URL('/api/book',url),{...options,method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});
  if(invalid.status!==400)throw Error('Hosted booking route did not reject an invalid request');
  console.log('PASS hosted access gate, exact release/project identity and invalid booking rejection');
}
async function main(){
  const action=process.argv[2];
  if(action==='build')build();else if(action==='check'){const {dir,release}=checkedArtifact();console.log(JSON.stringify({buildDirectory:dir,commit:release.commit,artifactHash:release.artifactHash}));}
  else if(action==='deploy')await deploy();else if(action==='probe')await probe();else throw Error('Use build, check, deploy or probe');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Staging operation failed. Verify the private configuration, saved source, build directory and hosting access. No credentials were printed.');process.exitCode=1;});
