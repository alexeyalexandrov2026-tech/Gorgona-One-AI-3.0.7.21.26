'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../AuthProvider';
import {useLocale} from '../LocaleProvider';
import {supabase} from '../../../lib/supabase';
import {getDiningCopy} from '../../../lib/dining/copy.mjs';
import {fill} from '../../../lib/homeCopy';
import {getWorldsCopy} from '../../../lib/worldsCopy';
import {isReceipt,submissionKey} from '../../../lib/bookingSubmission.mjs';
import {readJournal,writeJournal,clearJournal} from '../../../lib/bookingJournal.mjs';
import {btn} from '../g1/ui';

const field='min-h-[46px] w-full min-w-0 rounded-xl border border-g1-rule bg-g1-paper px-3 text-base text-g1-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
export default function DiningBooking(props) {
 const auth=useAuth(),locale=useLocale();
 if(auth?.loading)return <p role="status">{getWorldsCopy(locale).form.sending}</p>;
 return <BookingWorkspace key={(auth?.session?.id||'guest')+':'+props.venue.slug} {...props} owner={auth?.session?.id||null} loading={auth?.loading}/>;
}
function BookingWorkspace({venue,channels,enabled,owner,loading}) {
 const locale=useLocale(),copy=getDiningCopy(locale),form=getWorldsCopy(locale).form;
 const [selection,setSelection]=useState({version:1,date:'',time:'19:00',guests:2,option:'table',note:''});
 const [contact,setContact]=useState({name:'',email:'',phone:''});
 const [state,setState]=useState('idle'),[receipt,setReceipt]=useState(null);
 const attempt=useRef(null),flight=useRef(false);
 const pending=useRef(null),mounted=useRef(true);
 const [locked,setLocked]=useState(false);
 const scope={kind:venue.category==='nightlife'?'nightlife':'dining',slug:venue.slug};
 const storage=()=>{try{return window.sessionStorage;}catch{return null;}};
 useEffect(()=>{
  mounted.current=true;
  const saved=readJournal(storage(),scope,owner);
  if(saved){pending.current=saved;setLocked(true);setContact({name:saved.body.name,email:saved.body.email,phone:saved.body.phone});setSelection(saved.body.hospitality);}
  return()=>{mounted.current=false;};
 },[]);
 const set=(key,value)=>setSelection(current=>({...current,[key]:value}));
 async function submit(event) {
  event.preventDefault();if(flight.current||loading)return;
  flight.current=true;setState('sending');
  try {
   const {data,error}=await supabase.auth.getSession();
   if(error||(data?.session?.user?.id||null)!==owner)throw Error('Session changed');
   if(!pending.current){
    const body={...contact,kind:scope.kind,itemSlug:venue.slug,itemTitle:venue.name,dates:selection.date,hospitality:selection};
    attempt.current=submissionKey(attempt.current,JSON.stringify(body));
    pending.current={version:1,key:attempt.current.key,owner,createdAt:Date.now(),body,trip:{from:selection.date,to:selection.date,place:0,duration:0,guests:selection.guests}};
    writeJournal(storage(),scope,pending.current);setLocked(true);
   }
   const response=await fetch('/api/book',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':pending.current.key,
    ...(data?.session?.access_token?{Authorization:'Bearer '+data.session.access_token}:{})},body:JSON.stringify(pending.current.body)});
   const result=await response.json();
   if(!response.ok||!isReceipt(result)){
    if([400,413,429].includes(response.status)){clearJournal(storage(),scope,owner);pending.current=null;if(mounted.current)setLocked(false);}
    throw Error('Unavailable');
   }
   clearJournal(storage(),scope,owner);pending.current=null;
   if(mounted.current){setLocked(false);setReceipt(result.bookingId);setState('sent');}
  } catch {if(mounted.current)setState('error');} finally {flight.current=false;}
 }
 return <section aria-label={copy.channels} className="grid min-w-0 gap-6 rounded-[22px] border border-g1-rule bg-g1-card p-5 sm:p-6">
  <div><h2 className="font-g1display text-2xl">{copy.channels}</h2><p className="mt-3 text-sm leading-relaxed text-g1-soft">{copy.handoff}</p></div>
  <div className="grid gap-2">
   {channels.map(channel=>(
    <a key={channel.provider+channel.externalId} className={`${btn.base} ${btn.ghost} justify-start text-start`} href={channel.href} target="_blank" rel="noopener noreferrer">
     {channel.provider==='venue'?copy.venueWebsite:fill(copy.providerWebsite,{provider:channel.name})}
    </a>
   ))}
  </div>
  {enabled&&(state==='sent'?<div role="status" className="grid gap-3 border-t border-g1-rule pt-5"><p>{copy.pending}</p><p className="break-all font-mono text-sm">{receipt}</p></div>:<form onSubmit={submit} className="grid gap-4 border-t border-g1-rule pt-5">
   <h3 className="font-g1display text-xl">{copy.request}</h3>
   <fieldset disabled={locked||state==='sending'||loading} className="grid min-w-0 gap-4">
    <div className="grid gap-3 min-[480px]:grid-cols-2"><label className="grid min-w-0 gap-2 text-sm">{form.date}<input type="date" required className={field} value={selection.date} onChange={e=>set('date',e.target.value)}/></label><label className="grid min-w-0 gap-2 text-sm">{copy.time}<input type="time" required className={field} value={selection.time} onChange={e=>set('time',e.target.value)}/></label></div>
    <div className="grid gap-3 min-[480px]:grid-cols-2"><label className="grid min-w-0 gap-2 text-sm">{form.guests}<input type="number" min="1" max="99" required className={field} value={selection.guests} onChange={e=>set('guests',Number(e.target.value))}/></label><label className="grid min-w-0 gap-2 text-sm">{copy.style}<select className={field} value={selection.option} onChange={e=>set('option',e.target.value)}><option value="table">{copy.table}</option>{venue.features.includes('vip')&&<option value="vip">{copy.vip}</option>}{venue.features.includes('private')&&<option value="private">{copy.private}</option>}{venue.category==='nightlife'&&<option value="guestlist">{copy.guestlist}</option>}</select></label></div>
    {['name','email','phone'].map(key=><label key={key} className="grid gap-2 text-sm">{form[key]}<input className={field} type={key==='phone'?'tel':key==='email'?'email':'text'} autoComplete={key==='phone'?'tel':key} required maxLength={key==='name'?120:key==='email'?254:40} value={contact[key]} onChange={e=>setContact(current=>({...current,[key]:e.target.value}))}/></label>)}
    <label className="grid gap-2 text-sm">{copy.notes}<textarea className={field+' min-h-[90px] py-3'} maxLength={1000} value={selection.note} onChange={e=>set('note',e.target.value)}/></label>
   </fieldset>
   <button type="submit" disabled={state==='sending'||loading} className={`${btn.base} ${btn.primary}`}>{state==='sending'?form.sending:copy.request}</button>
   {state==='error'&&<p role="alert" className="text-sm">{copy.uncertainty}</p>}
  </form>)}
 </section>;
}
