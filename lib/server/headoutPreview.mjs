import {database,json,failure,RequestError} from './dashboardCore.mjs';
import {createHeadoutReadClient,HeadoutError} from './headoutApi.mjs';
import {STAGING_PROJECT,STAGING_URL} from './dashboardStaging.mjs';
import {HEADOUT_AFFILIATE_CODE} from '../headoutCatalog.mjs';

// Source-backed sandbox candidates, never automatically imported into public inventory.
export const HEADOUT_SANDBOX_PRODUCTS=Object.freeze(['55702','58903','58904']);
const allowed=new Set(HEADOUT_SANDBOX_PRODUCTS),day=86400000,windowDays=7,horizonDays=365;
export function headoutSandboxPreviewEnabled(env){
 return env.APP_ENV==='dashboard-staging'&&env.STAGING_PROJECT_REF===STAGING_PROJECT&&env.NEXT_PUBLIC_SUPABASE_URL===STAGING_URL&&env.HEADOUT_SANDBOX_PREVIEW_ENABLED==='true'&&typeof env.HEADOUT_SANDBOX_API_KEY==='string'&&env.HEADOUT_SANDBOX_API_KEY.length>=20&&env.HEADOUT_SANDBOX_API_KEY.length<=512;
}
function bounds(now){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const timestamp=Date.parse(today+'T12:00:00Z');
 return {today,latestStartDate:new Date(timestamp+(horizonDays-windowDays+1)*day).toISOString().slice(0,10)};
}
function queryOf(request,now){
 const query=new URL(request.url).searchParams,keys=new Set(['action','productId','variantId','startDate']);
 for(const key of query.keys())if(!keys.has(key)||query.getAll(key).length!==1)throw new RequestError(400,'Invalid Headout selection');
 const action=query.get('action')||'catalogue';
 if(action==='catalogue'){
  if([...query.keys()].some(key=>key!=='action'))throw new RequestError(400,'Invalid Headout selection');
  return {action};
 }
 const productId=query.get('productId'),variantId=query.get('variantId'),startDate=query.get('startDate');
 if(action!=='availability'||!allowed.has(productId)||!(/^[1-9][0-9]{0,19}$/).test(variantId||'')||!(/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/).test(startDate||''))throw new RequestError(400,'Invalid Headout selection');
 const timestamp=Date.parse(startDate+'T12:00:00Z'),range=bounds(now);
 if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==startDate||startDate<range.today||startDate>range.latestStartDate)throw new RequestError(400,'Invalid Headout selection');
 return {action,productId,variantId,startDate,endDate:new Date(timestamp+(windowDays-1)*day).toISOString().slice(0,10)};
}

/** Read-only adapter for the existing admin dashboard. No payment or booking ingress. */
export function headoutPreviewHandler(env,fetcher=fetch,clock=()=>new Date()){
 return async request=>{
  try{
   if(!headoutSandboxPreviewEnabled(env))throw new RequestError(404,'Headout preview unavailable');
   if(request.method!=='GET')return json({error:'Method not allowed'},405);
   const actor=await database(env,fetcher).identity(request);
   if(actor.role!=='admin')throw new RequestError(403,'Access denied');
   const query=queryOf(request,clock());
   const client=createHeadoutReadClient({environment:'sandbox',apiKey:env.HEADOUT_SANDBOX_API_KEY,affiliateCode:HEADOUT_AFFILIATE_CODE},fetcher);
   const context=()=>({version:1,provider:'headout',environment:'sandbox',mode:'REFERRAL',bookingCreationEnabled:false,confirmation:null,capturedAt:clock().toISOString(),...bounds(clock())});
   async function product(id){
    const result=await client.getProduct(id,{campaignName:'miami-elio-dining-sandbox'});
    if(result.product.city.code!=='MIAMI')throw new HeadoutError('invalid_provider_response');return result.product;
   }
   if(query.action==='catalogue'){
    const reads=await Promise.allSettled(HEADOUT_SANDBOX_PRODUCTS.map(product)),products=[],errors=[];
    reads.forEach((result,index)=>{
     if(result.status==='fulfilled')products.push(result.value);
     else errors.push({productId:HEADOUT_SANDBOX_PRODUCTS[index],code:result.reason instanceof HeadoutError?result.reason.code:'provider_unavailable'});
    });
    if(!products.length){
     const limited=errors.every(error=>error.code==='provider_rate_limited'),response=json({...context(),error:'headout_unavailable',errors},limited?429:503);
     const retry=Math.max(0,...reads.filter(result=>result.status==='rejected').map(result=>Number(result.reason?.retryAfter)||0));
     if(limited&&retry)response.headers.set('Retry-After',String(retry));return response;
    }
    return json({...context(),status:errors.length?'partial':'available',products,errors});
   }
   const selected=await product(query.productId);
   if(selected.inventorySelectionType!=='NORMAL'||!selected.variants.some(variant=>variant.id===query.variantId))throw new RequestError(400,'Invalid Headout option');
   const availability=await client.listDateAvailability(query.productId,query.variantId,{startDate:query.startDate,endDate:query.endDate});
   return json({...context(),product:selected,variantId:query.variantId,startDate:query.startDate,endDate:query.endDate,granularity:'date',dates:availability.items,slots:null});
  }catch(error){
   if(error instanceof HeadoutError){const response=json({error:error.code},error.status);if(error.retryAfter)response.headers.set('Retry-After',String(error.retryAfter));return response;}
   return failure(error);
  }
 };
}
