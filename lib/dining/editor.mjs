import {channelsFor,safeDestination} from './gateway.mjs';

export const EDITABLE_FIELDS=Object.freeze(['name','address','neighborhood','cuisine','description','website','verifiedOn','status','features','sources','channels']);
const features=['fine-dining','private','club','vip','rooftop','lounge','outdoor','casual','waterfront','beach-club','live-music'];
const forbidden=/[\u0000-\u001f\u007f]/;
function text(value,max,optional=false,multiline=false){
 if(typeof value!=='string'||value.length>max||(multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/:forbidden).test(value)||(!optional&&!value.trim()))throw Error('Invalid venue field');
 return value.trim();
}
function https(value){
 const url=new URL(text(value,2000));
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!url.hostname.includes('.')||/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname))throw Error('Invalid venue URL');
 return url.href;
}
export function venueDraft(venue){
 return {name:venue.name,address:venue.address||'',neighborhood:venue.neighborhood||'',cuisine:venue.cuisine||'',description:venue.description||'',website:venue.website||'',verifiedOn:venue.verifiedOn||'',status:venue.status,features:[...venue.features],sources:[...venue.sources],channels:venue.channels.map(({provider,externalId,href,evidence})=>({provider,externalId,href,evidence}))};
}
/** Only editorial fields may change. Identity, photography rights and API capability stay in code. */
export function validateVenueDraft(input,baseline,{publish=false}={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!EDITABLE_FIELDS.includes(key))||EDITABLE_FIELDS.some(key=>!Object.hasOwn(input,key)))throw Error('Invalid venue draft');
 const result={name:text(input.name,160),address:text(input.address,300,true),neighborhood:text(input.neighborhood,100,true),cuisine:text(input.cuisine,100,true),description:text(input.description,1500,true,true),website:input.website?https(input.website):'',verifiedOn:text(input.verifiedOn,10,true),status:input.status};
 if(!['verified','unverified'].includes(result.status))throw Error('Invalid venue status');
 if(result.verifiedOn&&(!/^20\d{2}-\d{2}-\d{2}$/.test(result.verifiedOn)||!Number.isFinite(Date.parse(result.verifiedOn+'T12:00:00Z'))||new Date(result.verifiedOn+'T12:00:00Z').toISOString().slice(0,10)!==result.verifiedOn||result.verifiedOn>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())))throw Error('Invalid verification date');
 if(!Array.isArray(input.features)||input.features.length>features.length||input.features.some(value=>!features.includes(value))||new Set(input.features).size!==input.features.length)throw Error('Invalid venue features');
 result.features=[...input.features];
 if(!Array.isArray(input.sources)||input.sources.length>8)throw Error('Invalid venue sources');
 if(input.sources.some(value=>typeof value!=='string'))throw Error('Invalid venue source');
 result.sources=input.sources.filter(value=>value.trim()).map(https);
 if(new Set(result.sources).size!==result.sources.length)throw Error('Duplicate venue source');
 if(!Array.isArray(input.channels)||input.channels.length>8)throw Error('Invalid venue channels');
 result.channels=input.channels.map(channel=>{
  if(!channel||typeof channel!=='object'||Object.keys(channel).sort().join(',')!=='evidence,externalId,href,provider')throw Error('Invalid venue channel');
  const normalized={provider:text(channel.provider,30),externalId:text(channel.externalId,160),href:https(channel.href),evidence:https(channel.evidence)};
  // Validate even held drafts: publication cannot turn an unsafe destination into a live link.
  channelsFor({...baseline,...result,status:'verified',channels:[normalized]});
  return normalized;
 });
 if(new Set(result.channels.map(channel=>channel.provider+':'+channel.externalId)).size!==result.channels.length||new Set(result.channels.map(channel=>channel.href)).size!==result.channels.length)throw Error('Duplicate venue channel');
 if(publish&&result.status==='verified'&&(!result.website||!result.address||!result.neighborhood||!result.description||!result.verifiedOn||!result.sources.length||!baseline.photo||!result.channels.length))throw Error('Incomplete venue publication');
 if(publish&&result.status==='verified'&&result.description!==baseline.description)throw Error('Description requires reviewed translations before publication');
 if(result.channels.some(channel=>channel.provider==='venue'&&safeDestination(channel.href,[new URL(result.website).hostname])!==channel.href))throw Error('Invalid official venue channel');
 return result;
}
export function applyVenuePublication(baseline,content){
 const draft=validateVenueDraft(content,baseline,{publish:true});
 return {...baseline,...draft,cuisine:draft.cuisine||null,location:draft.neighborhood+', FL'};
}
