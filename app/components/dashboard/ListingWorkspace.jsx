'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../AuthProvider';
import {useLocale} from '../LocaleProvider';
import {useSavedText} from '../LocalizedText';
import {supabase} from '../../../lib/supabase';
import {draftListing,validateListing,MAX_PHOTOS,MAX_PHOTO_BYTES,CAR_TYPES,PROPERTY_TYPES,CURRENCIES} from '../../../lib/partnerListing.mjs';
import {getPartnerListingCopy} from '../../../lib/partnerListingCopy.mjs';
import {getWorldsCopy} from '../../../lib/worldsCopy';
import {getTranslation} from '../../../lib/i18n';
import {ListingCard} from '../g1/ui';
const control='min-h-[44px] w-full min-w-0 rounded-lg border border-villa-obsidian/25 bg-white px-3 py-2 text-base text-villa-obsidian focus-visible:outline focus-visible:outline-2';
const button='inline-flex min-h-[44px] items-center justify-center rounded-lg border border-villa-obsidian/30 px-4 py-2 text-sm text-villa-obsidian hover:bg-villa-obsidian/5 focus-visible:outline focus-visible:outline-2 disabled:opacity-50';
async function authHeaders(userId){
 const {data,error}=await supabase.auth.getSession();
 if(error||data?.session?.user?.id!==userId)throw Error('Session changed');
 return {Authorization:'Bearer '+data.session.access_token};
}
async function api(userId,url,options={}){
 const response=await fetch(url,{...options,cache:'no-store',headers:{...await authHeaders(userId),'Content-Type':'application/json',...options.headers}});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){const error=new Error('Listing request failed');error.status=response.status;error.field=body.field;throw error;}
 return body;
}
function usePhoto(path,userId){
 const [url,setUrl]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{
  setUrl('');setFailed(false);if(!path)return;
  const controller=new AbortController();let current='',active=true;
  (async()=>{const response=await fetch('/api/dashboard/listings/media?path='+encodeURIComponent(path),{headers:await authHeaders(userId),signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('Photo unavailable');const blob=await response.blob();if(active){current=URL.createObjectURL(blob);setUrl(current);}})().catch(()=>{if(active)setFailed(true);});
  return()=>{active=false;controller.abort();if(current)URL.revokeObjectURL(current);};
 },[path,userId]);
 return {url,failed};
}
function PrivatePhoto({path,userId,alt}){
 const {url,failed}=usePhoto(path,userId),msg=useSavedText();
 return url?<img src={url} alt={alt} className="aspect-[3/2] w-full rounded-lg object-cover"/>:<div className="grid aspect-[3/2] place-items-center rounded-lg bg-villa-obsidian/10" role={failed?'alert':'img'} aria-label={alt}>{failed?msg('Try again'):null}</div>;
}
function ListingEditor({initial,user,admin,onChanged}){
 const locale=useLocale(),copy=getPartnerListingCopy(locale),msg=useSavedText(),formCopy=getWorldsCopy(locale).form,t=getTranslation(locale);
 const [record,setRecord]=useState(initial||{id:crypto.randomUUID(),workflow_version:0,review_state:'draft',published_version:null});
 const [content,setContent]=useState(()=>{
  if(initial?.content)return structuredClone(initial.content);
  const c=draftListing();Object.assign(c,{title:initial?.title||'',description:initial?.description||'',priceCents:initial?.price?Math.round(Number(initial.price)*100):null,currency:CURRENCIES.includes(initial?.currency)?initial.currency:'USD'});
  c.contact={name:user.company_name||user.name||'',email:user.email||'',phone:user.metadata?.phone||''};return c;
 });
 const [busy,setBusy]=useState(false),[error,setError]=useState(null),[notice,setNotice]=useState(''),[note,setNote]=useState('');
 const pending=useRef(null),mounted=useRef(true),files=useRef(null),locking=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const owner=initial?.partner_id||user.id,{url:cover}=usePhoto(content.images[0],user.id);
 const edit=(key,value)=>{setError(null);setNotice('');setContent(c=>({...c,[key]:value}));};
 const spec=(key,value)=>edit('specs',{...content.specs,[key]:value});
 const contact=(key,value)=>edit('contact',{...content.contact,[key]:value});
 const version=useRef(record.workflow_version);
 async function send(action,c=content){
  const body={schemaVersion:1,id:record.id,action,version:version.current,...(action==='save'?{content:validateListing(c,owner)}:{}),...(action==='reject'?{note}:{})};
  // A network-uncertain command is retried byte-for-byte before any new edit.
  if(pending.current)throw Error('Retry the pending command');
  const key=crypto.randomUUID();pending.current={key,body};
  return transmit();
 }
 async function transmit(){
  const attempt=pending.current;
  try{
   const result=await api(user.id,'/api/dashboard/listings',{method:'POST',headers:{'Idempotency-Key':attempt.key},body:JSON.stringify(attempt.body)});
   version.current=result.version;pending.current=null;
   const latest=await api(user.id,'/api/dashboard/listings/'+record.id).catch(()=>null);
   if(mounted.current){setRecord(latest?.listing||{...record,workflow_version:result.version,review_state:result.state});setNotice(result.state==='pending'?copy.submitted:copy.saved);}
   onChanged();return result;
  }catch(e){if(e.status&&e.status<500)pending.current=null;throw e;}
 }
 async function perform(task){
  if(locking.current)return;locking.current=true;setBusy(true);setError(null);setNotice('');
  try{await task();}catch(e){if(mounted.current)setError({status:e.status,field:e.field,message:e.status===409?copy.conflict:e.field?copy.incomplete:copy.error});}
  finally{locking.current=false;if(mounted.current)setBusy(false);}
 }
 async function submit(){
  validateListing(content,owner,{complete:true});
  const saved=await send('save');
  if(saved)await send('submit');
 }
 async function upload(selected){
  const list=Array.from(selected||[]);if(!list.length)return;
  if(content.images.length+list.length>MAX_PHOTOS)throw Error('Photo limit');
  for(const file of list){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>MAX_PHOTO_BYTES)throw Error('Invalid photo');
   const bitmap=await createImageBitmap(file);const valid=bitmap.width<=8192&&bitmap.height<=8192&&bitmap.width*bitmap.height<=24000000;bitmap.close();if(!valid)throw Error('Photo dimensions');
  }
  await send('save');let next={...content,images:[...content.images]},uploadError;
  try{for(const file of list){
   const response=await fetch('/api/dashboard/listings/media?listing='+record.id,{method:'POST',headers:{...await authHeaders(user.id),'Content-Type':file.type},body:file});
   const result=await response.json();if(!response.ok){const e=new Error('Photo upload failed');e.status=response.status;throw e;}
   next={...next,images:[...next.images,result.path]};if(mounted.current)setContent(next);
  }}catch(e){uploadError=e;}
  if(next.images.length!==content.images.length)await send('save',next);
  if(files.current)files.current.value='';if(uploadError)throw uploadError;
 }
 const move=(index)=>{const images=[...content.images];[images[index-1],images[index]]=[images[index],images[index-1]];edit('images',images);};
 const kindLabel=copy[content.kind];
 const amount=content.priceCents?new Intl.NumberFormat(locale,{style:'currency',currency:content.currency}).format(content.priceCents/100):'—';
 const readonly=admin;
 const field=(key,label,options={})=><label key={key} className="grid min-w-0 gap-2 text-sm">{label}<input className={control} value={content[key]??''} maxLength={key==='title'?140:160} disabled={readonly||busy||!!pending.current} onChange={e=>edit(key,e.target.value)} {...options}/></label>;
 const stateLabel=({draft:copy.draft,archived:copy.archived,pending:msg('Pending'),approved:msg('Approved'),rejected:msg('Rejected')})[record.review_state];
 return <div id="listing-editor" className="min-w-0 rounded-2xl border border-villa-obsidian/20 bg-white/40 p-4 sm:p-6">
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><h3 className="font-display text-2xl">{initial?.title||copy.newListing}</h3><span className="rounded-full border border-villa-obsidian/20 px-3 py-1 text-sm">{stateLabel} · {record.workflow_version}</span></div>
  {record.published_version?<p className="mb-4 text-sm">{copy.live}: {record.published_version} · <a className="underline" target="_blank" rel="noreferrer" href={({'car':'/rentals/','yacht':'/yachts/','stay':'/vacation-rentals/'})[record.published_kind||content.kind]+'partner-'+record.id}>{msg('Details')}</a></p>:<p className="mb-4 text-sm text-villa-graphite">{copy.notPublished}</p>}
  {record.published_version&&record.review_state!=='approved'&&<p className="mb-4 text-sm">{copy.pendingChanges}</p>}
  {initial?.created_at&&!initial.content&&<p className="mb-4 text-sm">{copy.legacy}</p>}
  {record.review_note&&<p className="mb-5 rounded-lg border border-villa-obsidian/20 p-3 text-sm"><strong>{copy.reviewNote}: </strong>{record.review_note}</p>}
  <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,1fr)]">
   <div className="grid min-w-0 gap-5">
    <label className="grid gap-2 text-sm">{copy.kind}<select aria-label={copy.kind} className={control} value={content.kind} disabled={readonly||busy||!!pending.current} onChange={e=>{const next=draftListing(e.target.value);setContent({...content,kind:next.kind,specs:next.specs,priceUnit:next.priceUnit});}}>{['car','yacht','stay'].map(k=><option key={k} value={k}>{copy[k]}</option>)}</select></label>
    {field('title',msg('Title'))}
    <label className="grid gap-2 text-sm">{msg('Description & Info')}<textarea className={control+' min-h-[130px]'} value={content.description} maxLength={5000} disabled={readonly||busy||!!pending.current} onChange={e=>edit('description',e.target.value)}/></label>
    {field('location',copy.location)}
    <div className="grid grid-cols-2 gap-4">
     <label className="grid gap-2 text-sm">{msg('Price')} · {({car:t.rentals.daily,yacht:t.yachts.price+' / h',stay:t.vacationRentals.nightlyRate})[content.kind]}<input className={control} type="number" min="0.01" max="1000000" step="0.01" value={content.priceCents===null?'':content.priceCents/100} disabled={readonly||busy||!!pending.current} onChange={e=>edit('priceCents',e.target.value===''?null:Math.round(Number(e.target.value)*100))}/></label>
     <label className="grid gap-2 text-sm">{msg('Currency')}<select className={control} value={content.currency} disabled={readonly||busy||!!pending.current} onChange={e=>edit('currency',e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></label>
    </div>
    <div className="grid grid-cols-2 gap-4">{Object.entries(content.specs).map(([key,value])=><label key={key} className="grid min-w-0 gap-2 text-sm">{copy[key]}
     {['bodyType','propertyType'].includes(key)?<select className={control} value={value} disabled={readonly||busy||!!pending.current} onChange={e=>spec(key,e.target.value)}>{(key==='bodyType'?CAR_TYPES:PROPERTY_TYPES).map(v=><option key={v} value={v}>{copy[v]||getWorldsCopy(locale).categories[v]||v}</option>)}</select>:
      <input className={control} type={['brand','model'].includes(key)?'text':'number'} maxLength={80} min={key==='year'?1900:key==='bedrooms'?0:1} max={key==='year'?new Date().getUTCFullYear()+1:key==='lengthFt'?500:100} step={['lengthFt','bathrooms'].includes(key)?'0.5':'1'} value={value??''} disabled={readonly||busy||!!pending.current} onChange={e=>spec(key,['brand','model'].includes(key)?e.target.value:e.target.value===''?null:Number(e.target.value))}/>}
    </label>)}</div>
    <fieldset className="grid gap-4 border-t border-villa-obsidian/20 pt-5"><legend className="text-sm">{copy.privateContacts}</legend>{[['name',formCopy.name],['email',formCopy.email],['phone',formCopy.phone]].map(([key,label])=><label key={key} className="grid gap-2 text-sm">{label}<input className={control} type={key==='email'?'email':key==='phone'?'tel':'text'} value={content.contact[key]} maxLength={key==='email'?254:key==='phone'?40:120} disabled={readonly||busy||!!pending.current} onChange={e=>contact(key,e.target.value)}/></label>)}</fieldset>
   </div>
   <div className="grid min-w-0 gap-6">
    <section className="rounded-2xl bg-g1-paper p-4 text-g1-ink" aria-label={copy.preview}><h4 className="mb-4 font-display text-xl">{copy.preview}</h4>{cover?<ListingCard href="#listing-editor" img={cover} title={content.title||copy.newListing} alt={content.title||kindLabel} meta={kindLabel+' · '+content.location} note={content.description} rate={amount}/>:<div className="grid aspect-[3/2] place-items-center rounded-2xl border border-dashed border-villa-obsidian/30 text-sm">{copy.addPhotos}</div>}</section>
    <section><p className="mb-4 text-sm">{copy.photoHelp}</p>
     <ol className="grid grid-cols-2 gap-3">{content.images.map((path,index)=><li key={path} className="min-w-0 rounded-lg border border-villa-obsidian/20 p-2"><PrivatePhoto path={path} userId={user.id} alt={content.title+' · '+(index+1)}/><p className="my-2 text-xs">{index===0?copy.cover:index+1}</p>{!readonly&&<div className="grid gap-2"><button type="button" className={button} disabled={busy||!!pending.current||index===0} onClick={()=>move(index)}>{copy.moveUp}</button><button type="button" className={button} disabled={busy||!!pending.current} onClick={()=>edit('images',content.images.filter((_,i)=>i!==index))}>{copy.remove}</button></div>}</li>)}</ol>
     {!readonly&&<label className="mt-4 block text-sm">{copy.addPhotos}<input ref={files} className="mt-2 block w-full text-sm" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy||!!pending.current||content.images.length>=MAX_PHOTOS} onChange={e=>{const selected=e.target.files;perform(()=>upload(selected));}}/></label>}
    </section>
   </div>
  </div>
  <div className="mt-7 grid gap-4 border-t border-villa-obsidian/20 pt-6">
   {error&&<p role="alert" className="text-sm">{error.message}{error.field?' · '+(copy[error.field.split('.').at(-1)]||error.field):''}</p>}
   {notice&&<p role="status" className="text-sm">{notice}</p>}
   {pending.current&&!busy?<button type="button" className={button} onClick={()=>perform(transmit)}>{msg('Try again')}</button>:
    admin?<>{record.review_state==='pending'&&<><label className="grid gap-2 text-sm">{copy.reviewNote}<textarea className={control} maxLength={1000} value={note} disabled={busy} onChange={e=>setNote(e.target.value)}/></label><div className="flex flex-wrap gap-3"><button type="button" className={button+' bg-villa-obsidian !text-villa-parchment'} disabled={busy} onClick={()=>perform(()=>send('approve'))}>{copy.approve}</button><button type="button" className={button} disabled={busy||!note.trim()} onClick={()=>perform(()=>send('reject'))}>{copy.reject}</button></div></>}{record.published_version&&<button type="button" className={button} disabled={busy} onClick={()=>perform(()=>send('withdraw'))}>{copy.withdraw}</button>}</>:
     <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={busy} onClick={()=>perform(()=>send('save'))}>{copy.saveDraft}</button><button type="button" className={button+' bg-villa-obsidian !text-villa-parchment'} disabled={busy} onClick={()=>perform(submit)}>{copy.submit}</button>{record.published_version&&<button type="button" className={button} disabled={busy} onClick={()=>perform(()=>send('withdraw'))}>{copy.withdraw}</button>}</div>}
  </div>
 </div>;
}
export default function ListingWorkspace({scope='partner'}){
 const {session:user}=useAuth(),locale=useLocale(),copy=getPartnerListingCopy(locale),msg=useSavedText();
 const [rows,setRows]=useState([]),[next,setNext]=useState(null),[after,setAfter]=useState(''),[state,setState]=useState(scope==='admin'?'pending':''),[loading,setLoading]=useState(true),[error,setError]=useState(false),[reload,setReload]=useState(0),[active,setActive]=useState(null),[editor,setEditor]=useState(0);
 useEffect(()=>{
  let current=true;const controller=new AbortController();setLoading(true);setError(false);
  api(user.id,'/api/dashboard/listings?'+new URLSearchParams({scope,state,cursor:after}),{signal:controller.signal}).then(data=>{if(current){setRows(data.listings);setNext(data.nextCursor);}}).catch(()=>{if(current)setError(true);}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;controller.abort();};
 },[user.id,scope,state,after,reload]);
 const open=row=>{setActive(row);setEditor(value=>value+1);};
 async function refresh(){setReload(v=>v+1);if(active?.created_at){try{const data=await api(user.id,'/api/dashboard/listings/'+active.id);open(data.listing);}catch{setError(true);}}}
 return <section className="my-10 border-t border-villa-obsidian/20 pt-8" aria-label={scope==='admin'?copy.queue:copy.listings}>
  <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="font-display text-3xl">{scope==='admin'?copy.queue:copy.listings}</h2><div className="flex flex-wrap gap-3"><select className={control+' !w-auto'} value={state} aria-label={msg('Status')} onChange={e=>{setState(e.target.value);setAfter('');}}><option value="">{msg('All statuses')}</option>{['draft','pending','approved','rejected','archived'].map(s=><option key={s} value={s}>{({draft:copy.draft,pending:msg('Pending'),approved:msg('Approved'),rejected:msg('Rejected'),archived:copy.archived})[s]}</option>)}</select><button type="button" className={button} onClick={refresh}>{msg('Refresh')}</button>{scope==='partner'&&<button type="button" className={button} onClick={()=>open({id:crypto.randomUUID(),workflow_version:0,review_state:'draft',published_version:null})}>{copy.newListing}</button>}</div></div>
  {loading?<p role="status">{msg('Loading...')}</p>:error?<p role="alert">{msg('Unable to load requests.')}</p>:!rows.length?<p className="mb-6">{msg('No requests yet.')}</p>:<div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(row=><button type="button" key={row.id} onClick={()=>open(row)} className="min-w-0 rounded-lg border border-villa-obsidian/20 p-4 text-start hover:bg-white/60"><span className="block font-medium [overflow-wrap:anywhere]">{row.title||copy.newListing}</span><span className="mt-2 block text-sm text-villa-graphite">{row.content?copy[row.content.kind]:copy.legacy} · {({draft:copy.draft,pending:msg('Pending'),approved:msg('Approved'),rejected:msg('Rejected'),archived:copy.archived})[row.review_state]}</span></button>)}</div>}
  <div className="mb-5 flex gap-3">{after&&<button type="button" className={button} onClick={()=>setAfter('')}>{msg('Back')}</button>}{next&&<button type="button" className={button} onClick={()=>setAfter(next)}>{msg('Next page')}</button>}</div>
  {active&&<ListingEditor key={editor} initial={active} user={user} admin={scope==='admin'} onChanged={()=>setReload(v=>v+1)}/>}
 </section>;
}
