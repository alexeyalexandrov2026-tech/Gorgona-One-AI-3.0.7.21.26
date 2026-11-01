// Storage and API navigation are untrusted boundaries, even on the same device.
const roots=new Set(['travel','yachts','rentals','private-jets','restaurants-nightlife','vacation-rentals','experiences','events','sportsbook','discovery']);
const text=(value,max=4000)=>typeof value==='string'&&value.trim()&&value.length<=max?value:null;
export function safeNavigationHref(value){
 if(typeof value!=='string'||value.length>2048||!/^\/(?!\/)/.test(value)||/[\\\u0000-\u0020\u007f]/.test(value))return false;
 let url;try{url=new URL(value,'https://miami-elio.invalid');}catch{return false;}
 return url.origin==='https://miami-elio.invalid'&&roots.has(url.pathname.split('/')[1])&&!/%(?:2f|5c|2e)/i.test(url.pathname)&&!url.pathname.split('/').includes('..');
}
export function navigationItem(value){
 if(!value||typeof value!=='object'||!safeNavigationHref(value.href)||!text(value.title||value.label,2000))return null;
 const result={href:value.href};for(const key of ['id','type','world','title','label','summary','subtitle','cta'])if(text(value[key],2000))result[key]=value[key];
 if(Number.isFinite(value.capacity)&&value.capacity>0)result.capacity=value.capacity;return result;
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
