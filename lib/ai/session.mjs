// Storage and API navigation are untrusted boundaries, even on the same device.
const roots=new Set(['travel','yachts','rentals','private-jets','restaurants-nightlife','vacation-rentals','experiences','events','discovery','entertainment']);
const text=(value,max=4000)=>typeof value==='string'&&value.trim()&&value.length<=max?value:null;
export function safeNavigationHref(value){
 if(typeof value!=='string'||value.length>2048||!/^\/(?!\/)/.test(value)||/[\\\u0000-\u0020\u007f]/.test(value))return false;
 let url;try{url=new URL(value,'https://miami-elio.invalid');}catch{return false;}
 return url.origin==='https://miami-elio.invalid'&&roots.has(url.pathname.split('/')[1])&&!/%(?:2f|5c|2e)/i.test(url.pathname)&&!url.pathname.split('/').includes('..');
}
export function safeImage(value) {
 if (typeof value !== 'string' || value.length > 2048 || /[\s\\"'<>]/.test(value)) return false;
 if (/^\/(?!\/)/.test(value)) return !value.split('/').includes('..');
 try {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
 } catch { return false; }
}
// A venue's own booking page or its Google Maps link: https only, no credentials.
export function safeBooking(value){
 if(!value||typeof value!=='object'||!['book','maps'].includes(value.kind)||typeof value.href!=='string'||value.href.length>2048)return null;
 let url;try{url=new URL(value.href);}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
 const result={kind:value.kind,href:url.href};
 if(value.kind==='book'&&typeof value.platform==='string'&&/^[a-z]{2,20}$/.test(value.platform))result.platform=value.platform;
 return result;
}
export function navigationItem(value){
 if(!value||typeof value!=='object'||!safeNavigationHref(value.href)||!text(value.title||value.label,2000))return null;
 const result={href:value.href};for(const key of ['id','type','world','title','label','summary','subtitle','cta','kind','slug'])if(text(value[key],2000))result[key]=value[key];
 if(text(value.price,80))result.price=value.price;
 if(safeImage(value.image))result.image=value.image;
 if(Number.isFinite(value.capacity)&&value.capacity>0)result.capacity=value.capacity;
 const booking=safeBooking(value.booking);if(booking)result.booking=booking;
 if(safeNavigationHref(value.more))result.more=value.more;
 return result;
}
function safePlan(value){
 if(!value||value.version!==1||!Array.isArray(value.sections))return null;
 const sections=value.sections.slice(0,4).map(section=>{
  if(!section||!safeNavigationHref(section.href))return null;
  const candidates=(Array.isArray(section.candidates)?section.candidates:[]).slice(0,4).map(navigationItem).filter(item=>item&&text(item.title,300));
  if(!candidates.length)return null;
  return {href:section.href,label:text(section.label,200)||section.href,candidates};
 }).filter(Boolean);
 if(sections.length<2)return null;
 const guests=Number.isInteger(value.guests)&&value.guests>0&&value.guests<100?value.guests:null;
 return {version:1,guests,sections,requestable:value.requestable===true};
}
const items=(value,max)=>Array.isArray(value)?value.map(navigationItem).filter(Boolean).slice(0,max):[];
export function chatSnapshot(value){
 const data=value&&typeof value==='object'?value:{};
 // Display marks travel with assistant turns only and are never sent upstream
 // (chatPayload drops them): handoff shows the live-manager link, degraded the
 // offline badge, and a degraded turn is left out of the model history.
 return {messages:Array.isArray(data.messages)?data.messages.filter(m=>m&&['user','assistant'].includes(m.role)&&text(m.content)).slice(-40).map(m=>({role:m.role,content:m.content,...(m.role==='assistant'&&m.handoff===true?{handoff:true}:{}),...(m.role==='assistant'&&m.degraded===true?{degraded:true}:{})})):[],cards:items(data.cards,4),suggestions:items(data.suggestions,8),listings:items(data.listings,4),plan:safePlan(data.plan),sessionId:text(data.sessionId,120)};
}
export function discoverySnapshot(value){
 const data=value&&typeof value==='object'?value:{};
 return {saved:items(data.saved,60).filter(item=>item.id),history:Array.isArray(data.history)?data.history.filter(h=>h&&text(h.id,200)&&text(h.query)).slice(0,30).map(h=>({id:h.id,query:h.query,at:Number.isFinite(h.at)?h.at:0,world:text(h.world,80),lang:text(h.lang,8),results:items(h.results,6)})):[]};
}
/**
 * True when an /api/chat answer did not come from a working engine: a failed
 * or unreadable response, or one the server labels error / not configured.
 * Such a turn is shown with the offline badge and kept out of model history,
 * the same rule as the Android app (ConciergeViewModel drops degraded turns).
 */
export function isDegradedResponse(ok,data){
 return !(ok&&data&&typeof data.reply==='string'&&data.reply.trim()&&data.error!==true&&data.configured!==false);
}
