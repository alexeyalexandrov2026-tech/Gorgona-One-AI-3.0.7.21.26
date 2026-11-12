'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {useSavedText} from '../LocalizedText';
import {getDiningEditorCopy} from '../../../lib/dining/editorCopy.mjs';
import {getDiningCopy,getDiningStyles} from '../../../lib/dining/copy.mjs';
import {getPartnerListingCopy} from '../../../lib/partnerListingCopy.mjs';
import {submissionKey} from '../../../lib/bookingSubmission.mjs';
import {PROVIDERS} from '../../../lib/dining/gateway.mjs';

const field='min-h-[44px] w-full min-w-0 rounded-lg border border-villa-obsidian/25 bg-white/70 px-3 py-2 text-base';
const button='min-h-[44px] rounded-lg border border-villa-obsidian/25 px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 disabled:opacity-50';
export default function VenueEditor({slug,locale,read,onPublished}){
 const copy=getDiningEditorCopy(locale),dining=getDiningCopy(locale),listing=getPartnerListingCopy(locale),msg=useSavedText();
 const descriptionId=useId();
 const [snapshot,setSnapshot]=useState(null),[draft,setDraft]=useState(null),[state,setState]=useState('loading'),[reviewed,setReviewed]=useState(false);
 const flight=useRef(false),attempt=useRef(null),mounted=useRef(true);
 const path='/api/dashboard/dining/venues/'+encodeURIComponent(slug);
 async function load(){
  const result=await read(path);
  if(mounted.current){setSnapshot(result);setDraft(result.draft);setReviewed(false);}
 }
 useEffect(()=>{
  mounted.current=true;
  load().then(()=>{if(mounted.current)setState('idle');}).catch(()=>{if(mounted.current)setState('error');});
  return()=>{mounted.current=false;};
 },[]);
 const dirty=!!snapshot&&JSON.stringify(draft)!==JSON.stringify(snapshot.draft),busy=state==='busy'||state==='loading';
 function set(key,value){setDraft(current=>({...current,[key]:value}));setReviewed(false);setState('idle');}
 async function reload(){if(flight.current)return;flight.current=true;setState('busy');try{await load();if(mounted.current)setState('idle');}catch{if(mounted.current)setState('error');}finally{flight.current=false;}}
 async function command(action){
  if(flight.current||!snapshot||action==='publish'&&(!reviewed||dirty))return;
  flight.current=true;setState('busy');
  const body={action,version:snapshot.revision,...(action==='save'?{draft}:{})};
  attempt.current=submissionKey(attempt.current,JSON.stringify(body));
  try{
   await read(path,{method:'POST',headers:{'Idempotency-Key':attempt.current.key},body:JSON.stringify(body)});
   await load();
   if(mounted.current){setState(action==='save'?'saved':'published');if(action==='publish')onPublished();}
  }catch(error){if(mounted.current)setState(error.status===409?'conflict':'error');}finally{flight.current=false;}
 }
 const styles=getDiningStyles(locale);
 return <section aria-label={copy.title} className="my-5 min-w-0 rounded-xl border border-villa-obsidian/25 bg-white/40 p-4 [color-scheme:light] sm:p-6">
  <h3 className="font-display text-2xl">{copy.title}</h3><p className="my-3 text-sm">{copy.notice}</p>
  {['error','conflict'].includes(state)&&<p role="alert" className="my-3 text-sm">{state==='conflict'?listing.conflict:listing.error}</p>}
  {state==='loading'&&<p role="status">{msg('Loading...')}</p>}
  <button type="button" className={button} disabled={busy} onClick={reload}>{copy.reload}</button>
  {snapshot&&draft&&<form className="mt-5 grid min-w-0 gap-5" onSubmit={event=>{event.preventDefault();command('save');}}>
   <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
    {['name','address','neighborhood','cuisine','website','verifiedOn'].map(key=><label className="grid min-w-0 gap-2 text-sm" key={key}>{({name:copy.name,address:copy.address,neighborhood:dining.neighborhood,cuisine:dining.cuisine,website:copy.website,verifiedOn:copy.verification})[key]}<input dir={key==='website'||key==='verifiedOn'?'ltr':'auto'} className={field} type={key==='website'?'url':key==='verifiedOn'?'date':'text'} required={key==='name'} maxLength={key==='name'?160:key==='address'?300:key==='website'?2000:100} value={draft[key]} onChange={event=>set(key,event.target.value)}/></label>)}
    <div className="grid min-w-0 gap-2 text-sm sm:col-span-2"><label htmlFor={descriptionId}>{copy.description}</label><textarea id={descriptionId} aria-describedby={descriptionId+'-help'} className={field+' min-h-[100px]'} readOnly value={draft.description}/><p id={descriptionId+'-help'} className="text-xs">{copy.descriptionNotice}</p></div>
    <label className="grid min-w-0 gap-2 text-sm">{msg('Status')}<select className={field} value={draft.status} onChange={event=>set('status',event.target.value)}><option value="verified">{copy.visible}</option><option value="unverified">{copy.held}</option></select></label>
    <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">{copy.sources}<textarea dir="ltr" className={field+' min-h-[90px]'} value={draft.sources.join('\n')} onChange={event=>set('sources',event.target.value.split('\n'))}/></label>
    <div className="flex min-w-0 flex-wrap gap-4 sm:col-span-2">{Object.entries({...styles,vip:dining.vip,private:dining.private}).map(([feature,label])=><label className="flex min-h-[44px] items-center gap-2 text-sm" key={feature}><input type="checkbox" checked={draft.features.includes(feature)} onChange={event=>set('features',event.target.checked?[...draft.features,feature]:draft.features.filter(value=>value!==feature))}/>{label}</label>)}</div>
    <div className="grid min-w-0 gap-4 sm:col-span-2">{draft.channels.map((channel,index)=><fieldset key={index} className="grid min-w-0 gap-3 rounded-lg border border-villa-obsidian/20 p-3 sm:grid-cols-2"><legend className="px-1 text-sm">{copy.channel} {index+1}</legend>
     <label className="grid min-w-0 gap-2 text-sm">{copy.channel}<select className={field} value={channel.provider} onChange={event=>set('channels',draft.channels.map((value,i)=>i===index?{...value,provider:event.target.value}:value))}>{PROVIDERS.map(provider=><option key={provider.id} value={provider.id}>{provider.id==='venue'?copy.website:provider.name}</option>)}</select></label>
     {['externalId','href','evidence'].map(key=><label key={key} className="grid min-w-0 gap-2 text-sm">{key==='externalId'?copy.identifier:key==='href'?copy.link:copy.evidence}<input dir="ltr" className={field} type={key==='externalId'?'text':'url'} required maxLength={key==='externalId'?160:2000} value={channel[key]} onChange={event=>set('channels',draft.channels.map((value,i)=>i===index?{...value,[key]:event.target.value}:value))}/></label>)}
     <button type="button" className={button} onClick={()=>set('channels',draft.channels.filter((_,i)=>i!==index))}>{listing.remove}</button>
    </fieldset>)}<button type="button" disabled={draft.channels.length>=8} className={button} onClick={()=>set('channels',[...draft.channels,{provider:'venue',externalId:slug.replace(/-miami$/,''),href:draft.website,evidence:draft.website}])}>{copy.add}</button></div>
   </fieldset>
   <div aria-label={copy.preview} className="grid min-w-0 gap-2 border-y border-villa-obsidian/20 py-4 text-sm"><p className="font-medium">{copy.preview}</p><p className="break-words font-display text-2xl">{draft.name}</p><p className="break-words">{draft.description}</p><p className="break-words">{draft.address}</p><p>{draft.status==='verified'?copy.visible:copy.held}</p>{draft.channels.map((channel,index)=><p className="break-all" key={index}>{channel.provider==='venue'?copy.website:PROVIDERS.find(provider=>provider.id===channel.provider)?.name}: {channel.href}</p>)}</div>
   <div className="flex flex-wrap gap-3"><button type="submit" className={button} disabled={busy||!dirty&&snapshot.revision>0}>{listing.saveDraft}</button><button type="button" className={button} disabled={busy||dirty||!reviewed||!snapshot.revision||snapshot.publishedVersion===snapshot.revision} onClick={()=>command('publish')}>{copy.publish}</button></div>
   <label className="flex min-h-[44px] items-start gap-3 text-sm"><input className="mt-1" type="checkbox" disabled={busy||dirty||!snapshot.revision} checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/>{copy.review}</label>
   {state==='saved'&&<p role="status">{listing.saved}</p>}{state==='published'&&<p role="status">{copy.published}</p>}
   {snapshot.events.length>0&&<details><summary className="min-h-[44px] cursor-pointer text-sm">{copy.history}</summary><ol className="grid gap-2 text-sm">{snapshot.events.map(event=><li key={event.id}>{event.action==='save'?listing.saveDraft:copy.published} · {event.revision} · <time dateTime={event.created_at}>{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}).format(new Date(event.created_at))}</time></li>)}</ol></details>}
  </form>}
 </section>;
}
