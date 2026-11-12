import {getVenueAudit} from '../restaurantsNightlifeData.js';
import {applyVenuePublication} from '../dining/editor.mjs';

/** Public snapshots only; drafts never enter page rendering or client props. */
export async function diningCatalogue(env=process.env,fetcher=fetch,{strict=false}={}){
 const baseline=getVenueAudit();
 if(env.DINING_EDITOR_ENABLED!=='true')return baseline;
 const base=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 try{
  if(!base||!key)throw Error('Dining catalogue configuration missing');
  const response=await fetcher(base.replace(/\/$/,'')+'/rest/v1/dining_publications?select=id,slug,content,published_version&order=id.asc&limit=100',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('Dining catalogue unavailable');
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.length>=100)throw Error('Invalid catalogue snapshot');
  const records=new Map(baseline.map(venue=>[venue.id,venue])),seen=new Set();
  for(const row of rows){
   const original=records.get(row.id);
   if(!original||row.slug!==original.slug||seen.has(row.id)||!Number.isSafeInteger(row.published_version)||row.published_version<1)throw Error('Invalid catalogue identity');
   records.set(row.id,applyVenuePublication(original,row.content));seen.add(row.id);
  }
  return [...records.values()];
 }catch{
  // Once editorial publishing is enabled, falling back could resurrect a withdrawn venue.
  if(strict)throw Error('Dining catalogue unavailable');
  return [];
 }
}
export async function diningVenue(slug,env=process.env,fetcher=fetch,options){return (await diningCatalogue(env,fetcher,options)).find(venue=>venue.slug===slug);}
