import {database,digest,failure,json,readBody,requireKey,RequestError} from './dashboardCore.mjs';
import {getVenueBySlug} from '../restaurantsNightlifeData.js';
import {validateVenueDraft,venueDraft} from '../dining/editor.mjs';

export function diningEditorHandlers(env,fetcher=fetch){
 async function context(request,slug){
  const db=database(env,fetcher),actor=await db.identity(request);
  if(actor.role!=='admin')throw new RequestError(403,'Access denied');
  if(env.DINING_EDITOR_ENABLED!=='true')throw new RequestError(503,'Venue editing is not enabled');
  const venue=getVenueBySlug(slug);
  if(!venue)throw new RequestError(404,'Not found');
  return {db,actor,venue};
 }
 return {
  async read(request,slug){
   try{
    const {db,actor,venue}=await context(request,slug);
    const result=await db.rpc('dining_venue_read',{p_actor:actor.id,p_id:venue.id});
    return json({venue:{id:venue.id,slug:venue.slug,category:venue.category,photo:venue.photo||null},revision:result.revision||0,publishedVersion:result.publishedVersion||null,draft:result.draft||venueDraft(venue),published:result.published||null,events:result.events||[]});
   }catch(error){return failure(error);}
  },
  async command(request,slug){
   try{
    const {db,actor,venue}=await context(request,slug);
    if(env.DINING_EDITOR_WRITES_ENABLED!=='true')throw new RequestError(503,'Venue editing is paused');
    const key=requireKey(request),body=await readBody(request,65536);
    if(!['save','publish'].includes(body.action)||!Number.isSafeInteger(body.version)||body.version<0||Object.keys(body).some(key=>!['action','version','draft'].includes(key)))throw new RequestError(400,'Invalid command');
    let content=null;
    if(body.action==='save'){
     try{content=validateVenueDraft(body.draft,venue);}catch{throw new RequestError(400,'Invalid venue draft');}
    }else{
     if(Object.hasOwn(body,'draft'))throw new RequestError(400,'Save the draft before publishing');
     const current=await db.rpc('dining_venue_read',{p_actor:actor.id,p_id:venue.id});
     // Old keys still reach the transactional replay check after a later edit.
     if(current.revision===body.version){try{validateVenueDraft(current.draft,venue,{publish:true});}catch{throw new RequestError(400,'Incomplete venue publication');}}
    }
    const fingerprint=await digest(JSON.stringify([actor.id,venue.id,body.action,body.version,content]));
    return json(await db.rpc('dining_venue_command',{p_actor:actor.id,p_id:venue.id,p_slug:venue.slug,p_key:key,p_fingerprint:fingerprint,p_action:body.action,p_version:body.version,p_content:content}));
   }catch(error){return failure(error);}
  }
 };
}
