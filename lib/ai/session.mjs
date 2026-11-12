// Storage and API navigation are untrusted boundaries, even on the same device.
const roots=new Set(['travel','yachts','rentals','private-jets','restaurants-nightlife','vacation-rentals','experiences','events','discovery']);
const text=(value,max=4000)=>typeof value==='string'&&value.trim()&&value.length<=max?value:null;
export function safeNavigationHref(value){
 if(typeof value!=='string'||value.length>2048||!/^\/(?!\/)/.test(value)||/[\\\u0000-\u0020\u007f]/.test(value))return false;
 let url;try{url=new URL(value,'https://miami-elio.invalid');}catch{return false;}
 return url.origin==='https://miami-elio.invalid'&&roots.has(url.pathname.split('/')[1])&&!/%(?:2f|5c|2e)/i.test(url.pathname)&&!url.pathname.split('/').includes('..');
}
export function navigationItem(value){
 if(!value||typeof value!=='object'||!safeNavigationHref(value.href)||!text(value.title||value.label,2000))return null;
 const result={href:value.href};for(const key of ['id','type','world','title','label','summary','subtitle','cta'])if(text(value[key],2000))result[key]=value[key];
 if(Number.isFinite(value.capacity)&&value.capacity>0)result.capacity=value.capacity;
 if(safeImage(value.image))result.image=value.image;return result;
}
const items=(value,max)=>Array.isArray(value)?value.map(navigationItem).filter(Boolean).slice(0,max):[];
export function chatSnapshot(value){
 const data=value&&typeof value==='object'?value:{};
 return {messages:Array.isArray(data.messages)?data.messages.filter(m=>m&&['user','assistant'].includes(m.role)&&text(m.content)).slice(-40).map(m=>({role:m.role,content:m.content})):[],cards:items(data.cards,4),suggestions:items(data.suggestions,8),sessionId:text(data.sessionId,120)};
}
export function discoverySnapshot(value){
 const data=value&&typeof value==='object'?value:{};
 return {saved:items(data.saved,60).filter(item=>item.id),history:Array.isArray(data.history)?data.history.filter(h=>h&&text(h.id,200)&&text(h.query)).slice(0,30).map(h=>({id:h.id,query:h.query,at:Number.isFinite(h.at)?h.at:0,world:text(h.world,80),lang:text(h.lang,8),results:items(h.results,6)})):[]};
}

// A concierge plan: catalogue items the server picked plus what the guest
// changed on this device (shown option, removed sections, a pending request).
const PLAN_KIND=new Set(['yacht','stay','car','dining','nightlife']),PLAN_ROOT=new Set(['/yachts','/vacation-rentals','/rentals','/restaurants-nightlife']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,V4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function safeImage(value){
 if(typeof value!=='string'||value.length>2048||/[\s\\"'<>]/.test(value))return false;
 if(/^\/(?!\/)/.test(value))return !value.split('/').includes('..');
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function planCandidate(value){
 if(!value||typeof value!=='object'||!PLAN_KIND.has(value.kind)||typeof value.slug!=='string'||value.slug.length>120||!/^[a-z0-9][a-z0-9-]*$/.test(value.slug)||!text(value.title,240)||!safeNavigationHref(value.href))return null;
 const result={kind:value.kind,slug:value.slug,title:value.title,href:value.href};
 if(text(value.subtitle,300))result.subtitle=value.subtitle;
 if(safeImage(value.image))result.image=value.image;
 return result;
}
export function planSnapshot(value,now=Date.now()){
 if(!value||typeof value!=='object'||value.version!==1||!Array.isArray(value.sections))return null;
 const sections=value.sections.slice(0,4).map(section=>{
  if(!section||!PLAN_ROOT.has(section.href)||!text(section.label,120))return null;
  const candidates=Array.isArray(section.candidates)?section.candidates.map(planCandidate).filter(item=>item&&item.href.startsWith(section.href+'/')).slice(0,4):[];
  if(!candidates.length)return null;
  return {href:section.href,label:section.label,candidates,index:Number.isInteger(section.index)&&section.index>=0&&section.index<candidates.length?section.index:0,removed:section.removed===true};
 }).filter(Boolean);
 if(sections.length<2)return null;
 const result={version:1,guests:Number.isInteger(value.guests)&&value.guests>=1&&value.guests<=99?value.guests:null,sections,requestable:value.requestable===true};
 const attempt=value.attempt;
 // Same-tab retry key only; it expires like the single-item request journal.
 if(attempt&&V4.test(attempt.key)&&typeof attempt.serialized==='string'&&attempt.serialized.length<=16000&&Number.isFinite(attempt.at)&&now-attempt.at<=30*60*1000&&now-attempt.at>=-60000)result.attempt={key:attempt.key,serialized:attempt.serialized,at:attempt.at};
 const sent=value.submitted;
 if(sent&&UUID.test(sent.planId)&&Number.isInteger(sent.count)&&sent.count>=1&&sent.count<=6)result.submitted={planId:sent.planId,count:sent.count};
 return result;
}
