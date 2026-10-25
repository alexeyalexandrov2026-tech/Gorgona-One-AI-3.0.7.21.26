import {validateListing,UUID} from '../partnerListing.mjs';
const kinds={yachts:'yacht','car-rentals':'car','vacation-rentals':'stay'};
/** Convert only a verified public snapshot to the existing inventory row shape. */
export function partnerInventoryRow(row){
 if(!row||!UUID.test(row.id)||row.slug!=='partner-'+row.id||!Number.isSafeInteger(row.published_version)||row.published_version<1||typeof row.company!=='string'||Array.from(row.company).length>200||!row.content||Object.hasOwn(row.content,'contact')||row.kind!==row.content.kind)throw Error('Invalid partner publication');
 const owner=row.content.images?.[0]?.split('/')[0];
 const c=validateListing({...row.content,contact:{name:'',email:'',phone:''}},owner,{complete:true,requireContact:false});
 const gallery=c.images.map(p=>'/api/listing-media/'+row.id+'/'+row.published_version+'/'+p.split('/')[1]);
 const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:c.currency,maximumFractionDigits:2}).format(c.priceCents/100);
 return {world:({car:'car-rentals',yacht:'yachts',stay:'vacation-rentals'})[c.kind],slug:row.slug,title:c.title,subtitle:row.company,category:c.kind==='car'?c.specs.bodyType:null,location:c.location,description:c.description,price_text:c.kind==='yacht'?amount+' / h':amount,image_url:gallery[0],featured:false,
  attrs:{legacy_id:'partner-'+row.id,gallery,partner:true,specs:c.specs,length:c.kind==='yacht'?c.specs.lengthFt+' ft':undefined,capacity:c.specs.guests,guests:c.specs.guests,bedrooms:c.specs.bedrooms,availability:'Enquire',weeklyPrice:'On request'}};
}
/** Public-only reader. Failure preserves the existing editorial inventory. No stale partner cache. */
export async function partnerInventory(world,env=process.env,fetcher=fetch){
 const kind=kinds[world],base=env.NEXT_PUBLIC_SUPABASE_URL||env.SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_ANON_KEY||env.SUPABASE_ANON_KEY;
 if(!kind||!base||!key)return [];
 const rows=[];
 try{
  // Bounded pages avoid PostgREST's default row cap. The UI does not reorder
  // existing editorial inventory; new partner items append in stable id order.
  for(let offset=0;offset<5000;offset+=200){
   const response=await fetcher(base.replace(/\/$/,'')+'/rest/v1/partner_publications?select=*&kind=eq.'+kind+'&order=id.asc&limit=200&offset='+offset,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw Error('Unavailable');
   const page=await response.json();if(!Array.isArray(page))throw Error('Invalid response');
   for(const row of page){try{rows.push(partnerInventoryRow(row));}catch{console.error('Invalid partner publication excluded from catalogue.');}}
   if(page.length<200)return rows;
  }
  throw Error('Catalogue capacity requires pagination');
 }catch{console.error('Partner catalogue unavailable; existing editorial inventory retained.');return [];}
}
