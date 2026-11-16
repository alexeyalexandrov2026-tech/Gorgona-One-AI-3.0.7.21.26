import {database,digest,requireKey} from './dashboardCore.mjs';

// Reuse the project's service-only RPC and HMAC boundary. The database clock,
// locks and policy own admission; no per-isolate counter pretends to be global.
export function createUsageGate(env,request,input,fetcher=fetch){
 let held=null;
 const authorize=async ({inputBytes,outputTokens})=>{
  try{
   if(!Number.isInteger(inputBytes)||inputBytes<1||inputBytes>24000||!Number.isInteger(outputTokens)||outputTokens<1||outputTokens>384)return false;
   const secret=env.BOOKING_RATE_SECRET,ip=request?.headers.get('cf-connecting-ip');
   // This identity is supplied by Cloudflare ingress, never by the request body
   // or X-Forwarded-For. Missing ingress identity must not bypass the limiter.
   if(typeof secret!=='string'||secret.length<32||!ip||!/^[a-f0-9:.]{3,64}$/i.test(ip))return false;
   const key=request.headers.has('idempotency-key')?requireKey(request):crypto.randomUUID();
   const day=new Date().toISOString().slice(0,10);
   const client=await digest('concierge-ai:client:v1:'+day+':'+ip,secret);
   const fingerprint=await digest('concierge-ai:request:v1:'+JSON.stringify({locale:input.locale,messages:input.messages}),secret);
   const result=await database(env,fetcher).rpc('concierge_ai_reserve',{p_key:key,p_client:client,p_fingerprint:fingerprint,p_input_bytes:inputBytes,p_output_tokens:outputTokens});
   if(result?.allowed===true){held={key,client};return true;}
   return false;
  }catch{return false;}
 };
 // A model timeout or a bad JSON body must not spend the daily cap.
 authorize.release=async()=>{
  if(!held)return false;
  try{
   const result=await database(env,fetcher).rpc('concierge_ai_release',{p_key:held.key,p_client:held.client});
   if(result?.released===true){held=null;return true;}
   return false;
  }catch{return false;}
 };
 return authorize;
}
