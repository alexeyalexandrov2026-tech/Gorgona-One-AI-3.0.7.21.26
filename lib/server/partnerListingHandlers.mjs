import {createClient} from '@supabase/supabase-js';
import {database,readBody,requireKey,json,failure,RequestError,cursor} from './dashboardCore.mjs';
import {validateListing,ListingValidationError,inspectPhoto,MAX_PHOTO_BYTES,UUID,MEDIA_PATH} from '../partnerListing.mjs';
const bucket='partner_listing_images';
const states=['draft','pending','approved','rejected','archived'];
function role(user){if(!['partner','admin'].includes(user.role))throw new RequestError(403,'Access denied');}
function safePath(value){if(typeof value!=='string'||!MEDIA_PATH.test(value))throw new RequestError(400,'Invalid media');return value;}
function storage(env,fetcher){
 return createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:fetcher}}).storage.from(bucket);
}
async function photoBody(request){
 const length=request.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_PHOTO_BYTES))throw new RequestError(413,'Photo too large');
 const reader=request.body?.getReader();if(!reader)throw new RequestError(400,'Photo required');
 let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PHOTO_BYTES){await reader.cancel();throw new RequestError(413,'Photo too large');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const result=new Uint8Array(size);let at=0;for(const c of chunks){result.set(c,at);at+=c.length;}return result;
}
const imageHeaders=mime=>({'Content-Type':mime,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'no-store','Content-Disposition':'inline'});
export function partnerListingHandlers(env,fetcher=fetch){
 const guarded=fn=>async(...args)=>{try{return await fn(...args);}catch(error){if(error instanceof ListingValidationError)return json({error:'invalid',field:error.field},400);return failure(error);}};
 const identity=async request=>{const db=database(env,fetcher),user=await db.identity(request);role(user);return {db,user};};
 async function listing(db,user,id){
  if(!UUID.test(id))throw new RequestError(400,'Invalid listing');
  const rows=await db.call('/rest/v1/partner_listings?select=*&id=eq.'+id+(user.role==='admin'?'':'&partner_id=eq.'+user.id),{token:user.token});
  return rows?.[0]||null;
 }
 return {
  list:guarded(async request=>{
   const {db,user}=await identity(request),url=new URL(request.url),scope=url.searchParams.get('scope')||'partner';
   if(!['partner','admin'].includes(scope)||scope==='admin'&&user.role!=='admin')throw new RequestError(403,'Access denied');
   const state=url.searchParams.get('state')||'';if(state&&!states.includes(state))throw new RequestError(400,'Invalid state');
   const after=cursor(url.searchParams.get('cursor'));
   let query='/rest/v1/partner_listings?select=*&order=created_at.desc,id.desc&limit=26'+(scope==='admin'?'':'&partner_id=eq.'+user.id);
   if(state)query+='&review_state=eq.'+state;
   if(after)query+='&or='+encodeURIComponent(`(created_at.lt.${after.at},and(created_at.eq.${after.at},id.lt.${after.id}))`);
   const rows=await db.call(query,{token:user.token});if(!Array.isArray(rows))throw new RequestError(503,'Service unavailable');
   const page=rows.slice(0,25),last=page.at(-1);
   return json({schemaVersion:1,listings:page,nextCursor:rows.length>25?btoa(last.created_at+'|'+last.id):null});
  }),
  detail:guarded(async(request,id)=>{
   const {db,user}=await identity(request),row=await listing(db,user,id);if(!row)throw new RequestError(404,'Not found');
   return json({schemaVersion:1,listing:row});
  }),
  command:guarded(async request=>{
   const {db,user}=await identity(request),key=requireKey(request),body=await readBody(request,32768);
   if(Object.keys(body).some(k=>!['schemaVersion','id','action','version','content','note'].includes(k))||body.schemaVersion!==1||!UUID.test(body.id)||!Number.isSafeInteger(body.version)||body.version<0||!['save','submit','approve','reject','withdraw'].includes(body.action))throw new RequestError(400,'Invalid command');
   if(['approve','reject'].includes(body.action)&&user.role!=='admin')throw new RequestError(403,'Access denied');
   if(body.note!==undefined&&(typeof body.note!=='string'||body.note.length>1000))throw new RequestError(400,'Invalid note');
   let content=null;
   if(body.action==='save'){
    const row=await listing(db,user,body.id);
    content=validateListing(body.content,row?.partner_id||user.id);
   }
   if(body.action==='approve'){
    const row=await listing(db,user,body.id);
    // Replays/stale decisions still reach the transactional receipt/version check.
    if(row?.review_state==='pending'&&row.workflow_version===body.version){
     const candidate=validateListing(row.content,row.partner_id,{complete:true}),store=storage(env,fetcher);
     for(const path of candidate.images){
      const found=await store.exists(path);
      if(found.error||!found.data)throw new RequestError(503,'Review photo unavailable');
     }
    }
   }
   const result=await db.rpc('partner_listing_command',{p_actor:user.id,p_id:body.id,p_key:key,p_action:body.action,p_version:body.version,p_content:content,p_note:body.note||''});
   if(!result?.success||!UUID.test(result.id)||!Number.isSafeInteger(result.version))throw new RequestError(503,'Service unavailable');
   return json({...result,schemaVersion:1});
  }),
  upload:guarded(async request=>{
   const {db,user}=await identity(request),id=new URL(request.url).searchParams.get('listing');
   const row=await listing(db,user,id);
   if(!row?.content||row.partner_id!==user.id)throw new RequestError(403,'Save your own draft first');
   const bytes=await photoBody(request),photo=inspectPhoto(bytes,request.headers.get('content-type')?.split(';')[0]);
   const path=user.id+'/'+crypto.randomUUID()+'.'+photo.extension;
   const store=storage(env,fetcher),saved=await store.upload(path,bytes,{contentType:photo.type,upsert:false,cacheControl:'0'});
   if(saved.error)throw new RequestError(503,'Photo upload failed');
   try{await db.rpc('partner_listing_media_register',{p_actor:user.id,p_id:id,p_path:path,p_mime:photo.type,p_size:photo.size});}
   catch(error){const removed=await store.remove([path]);if(removed.error)console.error('Partner photo rollback requires storage reconciliation');throw error;}
   return json({schemaVersion:1,path,size:photo.size,mime:photo.type},201);
  }),
  privatePhoto:guarded(async request=>{
   const {db,user}=await identity(request),path=safePath(new URL(request.url).searchParams.get('path'));
   const media=await db.rpc('partner_listing_media_access',{p_actor:user.id,p_path:path});
   if(!media?.path)throw new RequestError(404,'Not found');
   const result=await storage(env,fetcher).download(media.path);
   if(result.error||!result.data||result.data.size>MAX_PHOTO_BYTES)throw new RequestError(404,'Not found');
   return new Response(result.data,{headers:imageHeaders(media.mime)});
  }),
  publicPhoto:guarded(async(request,id,version,file)=>{
   if(!UUID.test(id)||!/^\d+$/.test(version)||!/^([0-9a-f-]{36})\.(jpg|png|webp)$/.test(file))throw new RequestError(404,'Not found');
   const cfg=env.NEXT_PUBLIC_SUPABASE_URL&&env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   if(!cfg)throw new RequestError(503,'Service unavailable');
   const response=await fetcher(env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/partner_publications?select=content&id=eq.'+id+'&published_version=eq.'+version,{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY,Authorization:'Bearer '+env.NEXT_PUBLIC_SUPABASE_ANON_KEY},cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new RequestError(503,'Service unavailable');
   const rows=await response.json(),images=rows?.[0]?.content?.images;
   const path=Array.isArray(images)&&images.find(p=>typeof p==='string'&&MEDIA_PATH.test(p)&&p.split('/')[1]===file);
   if(!path)throw new RequestError(404,'Not found');
   if(!env.SUPABASE_SERVICE_ROLE_KEY)throw new RequestError(503,'Service unavailable');
   const result=await storage(env,fetcher).download(path);
   if(result.error||!result.data||result.data.size>MAX_PHOTO_BYTES)throw new RequestError(404,'Not found');
   const mime=({jpg:'image/jpeg',png:'image/png',webp:'image/webp'})[file.split('.').at(-1)];
   return new Response(result.data,{headers:imageHeaders(mime)});
  })
 };
}
