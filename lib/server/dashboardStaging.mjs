// This gate belongs only to the separate QA Worker, never the production app.
export const STAGING_PROJECT='kaxslgjbrarapeyoifdh';
export const STAGING_URL='https://'+STAGING_PROJECT+'.supabase.co';
const cookieName='__Host-miami-staging',duration=4*60*60;
const encoder=new TextEncoder();
const hex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
async function signature(secret,value){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
}
function equal(a,b){if(a.length!==b.length)return false;let delta=0;for(let i=0;i<a.length;i++)delta|=a.charCodeAt(i)^b.charCodeAt(i);return delta===0;}
function response(body,status,headers={}){return new Response(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive',...headers}});}
async function authorized(request,secret,now){
  const cookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(cookie){
    const [at,mac,...extra]=cookie.split('.'),age=now-Number(at);
    if(!extra.length&&/^\d+$/.test(at)&&age>=0&&age<=duration&&/^[a-f0-9]{64}$/.test(mac||'')&&equal(mac,await signature(secret,'staging:'+at)))return {allowed:true};
  }
  const header=request.headers.get('authorization');
  if(!header?.startsWith('Basic '))return {allowed:false};
  let credentials;try{credentials=atob(header.slice(6));}catch{return {allowed:false};}
  if(!equal(await sha(credentials),await sha('preview:'+secret)))return {allowed:false};
  return {allowed:true,cookie:cookieName+'='+now+'.'+await signature(secret,'staging:'+now)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+duration};
}
export function stagingWorker(app,release,clock=()=>Date.now()){
  return {async fetch(request,env,ctx){
    const url=new URL(request.url);
    // Refuse mixed build/runtime projects and missing secrets before app code runs.
    if(env.APP_ENV!=='dashboard-staging'||env.STAGING_PROJECT_REF!==STAGING_PROJECT||env.NEXT_PUBLIC_SUPABASE_URL!==STAGING_URL||release.projectRef!==STAGING_PROJECT||!/^[a-f0-9]{40}$/.test(release.commit||'')||!env.NEXT_PUBLIC_SUPABASE_ANON_KEY||release.clientKeyHash!==await sha(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)||!env.SUPABASE_SERVICE_ROLE_KEY||!['BOOKING_RATE_SECRET','DASHBOARD_OUTBOX_TOKEN','DASHBOARD_STAGING_ACCESS_SECRET'].every(k=>typeof env[k]==='string'&&env[k].length>=32)||env.TELEGRAM_BOT_TOKEN||env.RESEND_API_KEY)return response('Staging unavailable',503);
    if(url.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(url.hostname))return response('HTTPS required',426);
    const access=await authorized(request,env.DASHBOARD_STAGING_ACCESS_SECRET,Math.floor(clock()/1000));
    if(!access.allowed)return response('Staging sign-in required',401,{'WWW-Authenticate':'Basic realm="Miami Elio staging", charset="UTF-8"'});
    // Basic belongs to the preview gate; the app verifies its own Bearer identity.
    if(/^Basic(?:\s|$)/i.test(request.headers.get('authorization')||'')){
      const appHeaders=new Headers(request.headers);appHeaders.delete('authorization');
      request=new Request(request,{headers:appHeaders});
    }
    let result;
    if(url.pathname==='/__dashboard_staging/health'){
      result=response(JSON.stringify({environment:'dashboard-staging',projectRef:STAGING_PROJECT,commit:release.commit}),200,{'Content-Type':'application/json'});
    }else if(url.pathname==='/robots.txt')result=response('User-agent: *\nDisallow: /\n',200,{'Content-Type':'text/plain'});
    else if(url.pathname==='/api/internal/notifications')result=response('Delivery disabled in staging',503);
    else if(['GET','HEAD'].includes(request.method)&&env.ASSETS){
      const asset=await env.ASSETS.fetch(request);
      result=asset.status===404?await app.fetch(request,env,ctx):asset;
    }else result=await app.fetch(request,env,ctx);
    const headers=new Headers(result.headers);headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
    headers.set('Cache-Control','no-store');headers.set('Referrer-Policy','no-referrer');headers.set('X-Content-Type-Options','nosniff');
    if(access.cookie)headers.append('Set-Cookie',access.cookie);
    return new Response(result.body,{status:result.status,statusText:result.statusText,headers});
  }};
}
