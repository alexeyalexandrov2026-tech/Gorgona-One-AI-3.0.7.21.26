/** Server-only, nontransactional Headout Affiliate API v2 client.
 * Contract verified against official Headout docs on 2026-10-31.
 * Sandbox results must never be published as production inventory.
 */
/** @typedef {'sandbox'|'production'} HeadoutEnvironment */
/** @typedef {{environment:HeadoutEnvironment,apiKey:string,affiliateCode:string}} HeadoutConfig */
/** @typedef {{code:string,name:string}} HeadoutCity */
/** @typedef {{id:string,name:string,city:HeadoutCity,category:string|null,subcategory:string|null,referralUrl:string,mode:'REFERRAL',inventorySelectionType:'NORMAL'|'SEATMAP'|'SVG'|'COMBO',variants:Array<{id:string,name:string}>}} HeadoutProduct */
/** @typedef {{date:string,availability:'LIMITED'|'UNLIMITED'|'CLOSED',price:{currency:string,amount:number}|null}} HeadoutDateAvailability */
/** @template T @typedef {{version:1,provider:'headout',apiVersion:2,environment:HeadoutEnvironment,capturedAt:string,items:T[],nextOffset:number|null}} HeadoutPage */

export class HeadoutError extends Error {
 constructor(code,status=502,retryAfter){super(code);this.code=code;this.status=status;this.retryAfter=retryAfter;}
}
const origins={sandbox:'https://www.sandbox-headout.com',production:'https://www.headout.com'};
const languages=new Set(['EN','ES','FR','IT','DE','PT','NL','PL','KO','JA','ZH_HANS','ZH_HANT','AR','DA','RO','RU','SV','TR']);
const invalid=()=>{throw new HeadoutError('invalid_provider_response');};
function text(value){if(typeof value!=='string'||!value.trim()||value.length>2000)invalid();return value;}
function id(value){const string=String(value);if(!(typeof value==='string'||typeof value==='number'&&Number.isSafeInteger(value))||!/^[1-9][0-9]{0,19}$/.test(string))throw new HeadoutError('invalid_identifier',400);return string;}
function providerId(value){try{return id(value);}catch{invalid();}}
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function offset(value){if(!Number.isSafeInteger(value)||value<0||value>1000000)throw new HeadoutError('invalid_offset',400);return value;}
function date(value){
 if(typeof value!=='string'||!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(value))throw new HeadoutError('invalid_date',400);
 const time=Date.parse(value+'T12:00:00Z');if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new HeadoutError('invalid_date',400);return time;
}
function currency(value){if(typeof value!=='string'||!/^[A-Z]{3}$/.test(value))throw new HeadoutError('invalid_currency',400);return value;}
function productOptions({languageCode='EN',currencyCode='USD',campaignName='miami-elio-dining'}={}){
 if(!languages.has(languageCode)||typeof campaignName!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(campaignName))throw new HeadoutError('invalid_product_query',400);
 currency(currencyCode);return {languageCode,currencyCode,campaignName};
}
function city(value){if(!object(value)||typeof value.code!=='string'||!/^[A-Z0-9_]{1,80}$/.test(value.code))invalid();return {code:value.code,name:text(value.name)};}
async function readJson(response){
 const maximum=2000000;
 if(!response.headers.get('content-type')?.toLowerCase().includes('application/json')||Number(response.headers.get('content-length'))>maximum||!response.body){await response.body?.cancel().catch(()=>{});invalid();}
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maximum){await reader.cancel().catch(()=>{});invalid();}chunks.push(value);}
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
 try{const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!object(result))invalid();return result;}catch{invalid();}
}

/** @param {HeadoutConfig} config @param {typeof fetch} fetcher */
export function createHeadoutReadClient(config,fetcher=fetch){
 if(!config||!Object.hasOwn(origins,config.environment)||typeof config.apiKey!=='string'||config.apiKey.length<20||config.apiKey.length>512||/\s|[\u0000-\u001f\u007f]/.test(config.apiKey)||typeof config.affiliateCode!=='string'||!/^[A-Za-z0-9]{1,40}$/.test(config.affiliateCode))throw new HeadoutError('invalid_headout_configuration',503);
 const {environment,apiKey,affiliateCode}=config;
 const origin=origins[environment];
 const context=()=>({version:1,provider:'headout',apiVersion:2,environment,capturedAt:new Date().toISOString()});
 async function read(path,query){
  const url=new URL(origin+path);url.search=new URLSearchParams(query).toString();
  try{
   // Workers supports manual/follow, not redirect:error. Reject all 3xx below.
   const response=await fetcher(url,{method:'GET',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json','Content-Type':'application/json; charset=UTF-8','Headout-Auth':apiKey}});
   if(!response.ok){
    const retry=response.headers.get('retry-after');const seconds=/^[0-9]{1,5}$/.test(retry||'')?Number(retry):undefined;
    await response.body?.cancel().catch(()=>{});
    throw new HeadoutError(response.status===429?'provider_rate_limited':[401,403].includes(response.status)?'provider_not_authorized':'provider_unavailable',response.status===429?429:502,seconds);
   }
   return await readJson(response);
  }catch(error){
   if(error instanceof HeadoutError)throw error;
   throw new HeadoutError(['TimeoutError','AbortError'].includes(error?.name)?'provider_timeout':'provider_unavailable',error?.name==='TimeoutError'?504:502);
  }
 }
 function page(result,key,current,project){
  if(!Array.isArray(result[key])||result[key].length>100||!(result.nextOffset===null||Number.isSafeInteger(result.nextOffset)&&result.nextOffset>current&&result.nextOffset<=1000000))invalid();
  if(!result[key].length&&result.nextOffset!==null)invalid();
  return {...context(),items:result[key].map(project),nextOffset:result.nextOffset};
 }
 function product(value){
  if(!object(value)||!['NORMAL','SEATMAP','SVG','COMBO'].includes(value.inventorySelectionType)||!Array.isArray(value.variants))invalid();
  let url;try{url=new URL(value.canonicalUrl);}catch{invalid();}
  const codes=url.searchParams.getAll('affiliate_code');
  if(url.origin!==origin||url.username||url.password||url.hash||codes.length!==1||codes[0]!==affiliateCode)throw new HeadoutError('invalid_affiliate_attribution');
  return {id:providerId(value.id),name:text(value.name),city:city(value.city),category:value.primaryCategory?text(value.primaryCategory.name):null,subcategory:value.primarySubCategory?text(value.primarySubCategory.name):null,referralUrl:url.href,mode:'REFERRAL',inventorySelectionType:value.inventorySelectionType,variants:value.variants.map(v=>{if(!object(v))invalid();return {id:providerId(v.id),name:text(v.name)};})};
 }
 return Object.freeze({
  /** @returns {Promise<HeadoutPage<HeadoutCity>>} */
  async listCities({offset:current=0}={}){offset(current);return page(await read('/api/public/v2/cities/',{offset:String(current),limit:'20'}),'cities',current,city);},
  /** @returns {Promise<HeadoutPage<HeadoutProduct>>} */
  async listProducts(cityCode,{offset:current=0,languageCode='EN',currencyCode='USD',campaignName='miami-elio-dining'}={}){
   if(typeof cityCode!=='string'||!/^[A-Z0-9_]{1,80}$/.test(cityCode))throw new HeadoutError('invalid_product_query',400);
   offset(current);const query=productOptions({languageCode,currencyCode,campaignName});
   return page(await read('/api/public/v2/products/',{cityCode,offset:String(current),limit:'20',...query}),'products',current,product);
  },
  /** @returns {Promise<{version:1,provider:'headout',apiVersion:2,environment:HeadoutEnvironment,capturedAt:string,product:HeadoutProduct}>} */
  async getProduct(productId,options={}){
   const requestedId=id(productId),query=productOptions(options),result=await read('/api/public/v2/products/'+requestedId+'/',query);
   const projected=product(result);if(projected.id!==requestedId)invalid();return {...context(),product:projected};
  },
  /** Date-level data only: no slot, guest allocation, payment or confirmation. */
  async listDateAvailability(productId,variantId,{startDate,endDate,currencyCode='USD'}){
   id(productId);id(variantId);currency(currencyCode);const start=date(startDate),end=date(endDate);
   if(end<start||end-start>89*86400000)throw new HeadoutError('invalid_date_range',400);
   const result=await read('/api/public/v2/products/'+productId+'/variants/'+variantId+'/availabilities/',{startDate,endDate,currencyCode});
   if(providerId(result.productId)!==String(productId)||providerId(result.variantId)!==String(variantId)||result.currencyCode!==currencyCode||!Array.isArray(result.availabilities)||result.availabilities.length>90)invalid();
   const dates=new Set();
   const items=result.availabilities.map(value=>{
    if(!object(value))invalid();let time;try{time=date(value.date);}catch{invalid();}if(time<start||time>end||dates.has(value.date)||!['LIMITED','UNLIMITED','CLOSED'].includes(value.availability))invalid();dates.add(value.date);
    let price=null;
    if(value.pricing){if(value.pricing.currency!==currencyCode||typeof value.pricing.headoutSellingPrice!=='number'||!Number.isFinite(value.pricing.headoutSellingPrice)||value.pricing.headoutSellingPrice<0)invalid();price={currency:currencyCode,amount:value.pricing.headoutSellingPrice};}
    return {date:value.date,availability:value.availability,price};
   });
   return {...context(),productId:String(productId),variantId:String(variantId),granularity:'date',items,slots:null,confirmation:null};
  }
 });
}
