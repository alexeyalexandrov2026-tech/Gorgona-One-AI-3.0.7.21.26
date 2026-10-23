// Same-tab recovery only. Pending contact data expires on read after 30 minutes
// and is removed as soon as the server confirms a receipt.
const TTL=30*60*1000;
const v4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const journalKey=(scope,owner)=>'miami-booking:v1:'+encodeURIComponent(owner||'guest')+':'+encodeURIComponent(scope.kind)+':'+encodeURIComponent(scope.slug);
export function clearJournal(storage,scope,owner){try{storage?.removeItem(journalKey(scope,owner));}catch{}}
export function readJournal(storage,scope,owner,now=Date.now()){
  try{
    const raw=storage?.getItem(journalKey(scope,owner));if(!raw)return null;
    if(raw.length>16000)throw new Error('Invalid journal');
    const entry=JSON.parse(raw),b=entry.body,t=entry.trip;
    if(entry.version!==1||!v4.test(entry.key)||entry.owner!==(owner||null)||!Number.isFinite(entry.createdAt)||now-entry.createdAt>TTL||now-entry.createdAt< -60000||!b||b.kind!==scope.kind||b.itemSlug!==scope.slug||!t)throw new Error('Invalid journal');
    const fields={name:120,email:254,phone:40,dates:600,itemSlug:120,itemTitle:240};
    const body={kind:b.kind};for(const [field,max]of Object.entries(fields)){if(typeof b[field]!=='string'||!b[field].trim()||b[field].length>max)throw new Error('Invalid journal');body[field]=b[field];}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(t.from)||!/^\d{4}-\d{2}-\d{2}$/.test(t.to)||!['place','duration','guests'].every(k=>Number.isSafeInteger(t[k])&&t[k]>=0&&t[k]<=100))throw new Error('Invalid journal');
    return {version:1,key:entry.key,owner:entry.owner,createdAt:entry.createdAt,body,trip:{from:t.from,to:t.to,place:t.place,duration:t.duration,guests:t.guests}};
  }catch{clearJournal(storage,scope,owner);return null;}
}
export function writeJournal(storage,scope,entry){try{storage?.setItem(journalKey(scope,entry.owner),JSON.stringify(entry));return true;}catch{return false;}}
