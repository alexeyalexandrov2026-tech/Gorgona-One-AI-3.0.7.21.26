// Temporary, staging-only adapter. Inject a fresh gate and deadline when deploying;
// retire it after acceptance. Never deploy this to the production project.
import { dashboardHandlers } from './dashboardHandlers.mjs';
const PROJECT_REF='kaxslgjbrarapeyoifdh';
const QA_NONCE='__QA_NONCE__';
const DEADLINE=Number('__QA_DEADLINE__');
const sha=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});

Deno.serve(async request=>{
  const base=Deno.env.get('SUPABASE_URL')||'';
  if(!/^[a-f0-9]{64}$/.test(QA_NONCE)||!Number.isFinite(DEADLINE)||Date.now()>DEADLINE||new URL(base).hostname!==PROJECT_REF+'.supabase.co')return reply({error:'Unavailable'},503);
  const actual=await sha(request.headers.get('x-dashboard-qa')||''),expected=await sha(QA_NONCE);
  let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=actual[i]^expected[i];
  if(mismatch)return reply({error:'Access denied'},401);
  const env={NEXT_PUBLIC_SUPABASE_URL:base,NEXT_PUBLIC_SUPABASE_ANON_KEY:Deno.env.get('SUPABASE_ANON_KEY'),SUPABASE_SERVICE_ROLE_KEY:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),BOOKING_RATE_SECRET:QA_NONCE};
  const path=request.headers.get('x-dashboard-path')||'';
  if(path==='/__seed'&&request.method==='POST'){
    const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
    const found=await fetch(base+'/auth/v1/admin/users?page=1&per_page=100',{headers});
    if(!found.ok)return reply({error:'Seed lookup failed'},503);
    const users=(await found.json()).users||[],seed={};
    for(const name of ['customer','other','partner','admin']){
      const email='dashboard-qa-'+name+'@example.com';let user=users.find(u=>u.email===email);
      const bytes=await sha(QA_NONCE+':password:'+name),password=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')+'Ab1!';
      if(!user){
        const created=await fetch(base+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({email,password,email_confirm:true,user_metadata:{name:'Dashboard QA '+name,role:name==='partner'?'partner':'admin',company_name:name==='partner'?'Dashboard QA Partner Company':null}})});
        if(!created.ok)return reply({error:'Seed creation failed',status:created.status},503);
        user=await created.json();
      }else{
        const reset=await fetch(base+'/auth/v1/admin/users/'+user.id,{method:'PUT',headers,body:JSON.stringify({password,email_confirm:true})});
        if(!reset.ok)return reply({error:'Seed password setup failed'},503);
      }
      seed[name]=user.id;
    }
    return reply({users:seed});
  }
  if(!path.startsWith('/api/'))return reply({error:'Not found'},404);
  const target=new Request(base+path,{method:request.method,headers:request.headers,...(!['GET','HEAD'].includes(request.method)?{body:await request.arrayBuffer()}:{} )});
  const handlers=dashboardHandlers(env),url=new URL(target.url);
  if(path==='/api/book'&&request.method==='POST')return handlers.book(target);
  if(url.pathname==='/api/dashboard/requests'&&request.method==='GET')return handlers.list(target);
  if(path==='/api/dashboard/partners'&&request.method==='GET')return handlers.partners(target);
  if(path==='/api/dashboard/notifications'&&request.method==='GET')return handlers.notifications(target);
  const match=url.pathname.match(/^\/api\/dashboard\/requests\/([0-9a-f-]+)$/i);
  if(match&&request.method==='GET')return handlers.detail(target,match[1]);
  if(match&&request.method==='POST')return handlers.command(target,match[1]);
  return reply({error:'Not found'},404);
});
