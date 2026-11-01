'use client';
import {useEffect,useRef,useState} from 'react';
import {getHeadoutPreviewCopy} from '../../../lib/dining/headoutPreviewCopy.mjs';
const input='min-h-[46px] w-full min-w-0 max-w-full rounded-xl border border-villa-obsidian/25 bg-white/70 px-3 text-base text-villa-obsidian';
const button='min-h-[44px] rounded-full border border-villa-obsidian/30 px-5 py-2 text-sm font-medium text-villa-obsidian disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const endpoint='/api/dashboard/dining/headout';

export default function HeadoutPreview({read,locale}){
 const copy=getHeadoutPreviewCopy(locale),operation=useRef(null);
 const [catalogue,setCatalogue]=useState(null),[productId,setProductId]=useState(''),[variantId,setVariantId]=useState(''),[startDate,setStartDate]=useState('');
 const [calendar,setCalendar]=useState(null),[selectedDate,setSelectedDate]=useState(''),[busy,setBusy]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>()=>{operation.current?.abort();operation.current=null;},[]);
 const product=catalogue?.products.find(item=>item.id===productId);
 function invalidate(){operation.current?.abort();operation.current=null;setBusy('');setCalendar(null);setSelectedDate('');setFailed(false);}
 async function perform(action){
  operation.current?.abort();const controller=new AbortController();operation.current=controller;
  setBusy(action);setFailed(false);setCalendar(null);setSelectedDate('');if(action==='catalogue')setCatalogue(null);
  try{
   const query=action==='catalogue'?'':'?'+new URLSearchParams({action:'availability',productId,variantId,startDate});
   const result=await read(endpoint+query,{signal:controller.signal});
   if(operation.current!==controller||controller.signal.aborted)return;
   if(result.environment!=='sandbox'||result.mode!=='REFERRAL'||result.bookingCreationEnabled!==false||result.confirmation!==null)throw Error('Invalid preview');
   if(action==='catalogue'){
    if(!Array.isArray(result.products)||!result.products.length)throw Error('No products');
    const first=result.products[0];setCatalogue(result);setProductId(first.id);setVariantId(first.variants[0]?.id||'');setStartDate(result.today);
   }else{
    if(result.product?.id!==productId||result.variantId!==variantId||result.startDate!==startDate||result.granularity!=='date'||result.slots!==null||!Array.isArray(result.dates))throw Error('Invalid availability');
    setCalendar(result);
   }
  }catch{if(operation.current===controller&&!controller.signal.aborted)setFailed(true);}
  finally{if(operation.current===controller)setBusy('');}
 }
 const selected=calendar?.dates.find(item=>item.date===selectedDate&&['LIMITED','UNLIMITED'].includes(item.availability));
 const labelDate=value=>new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric',calendar:'gregory',timeZone:'America/New_York'}).format(new Date(value+'T12:00:00Z'));
 return <section aria-label={copy.title} className="my-8 grid min-w-0 gap-5 rounded-[22px] border border-villa-obsidian/25 p-4 sm:p-6">
  <div className="grid gap-3"><span className="w-fit rounded-full bg-villa-obsidian px-3 py-1 text-xs text-white">{copy.badge}</span><h3 className="break-words font-display text-2xl">{copy.title}</h3><p className="text-sm leading-relaxed">{copy.notice}</p></div>
  <button type="button" className={button+' w-fit'} disabled={!!busy} onClick={()=>perform('catalogue')}>{copy.load}</button>
  {busy&&<p role="status" className="text-sm">{copy.loading}</p>}
  {failed&&<p role="alert" className="text-sm">{copy.error}</p>}
  {catalogue&&<>
   {!!catalogue.errors?.length&&<p role="status" className="text-sm">{copy.partial}</p>}
   <p className="text-xs text-villa-graphite">{copy.providerContent}</p>
   <form className="grid min-w-0 gap-4 sm:grid-cols-2" onSubmit={event=>{event.preventDefault();perform('availability');}}>
    <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">{copy.experience}<select className={input} value={productId} onChange={event=>{invalidate();const item=catalogue.products.find(item=>item.id===event.target.value);setProductId(item?.id||'');setVariantId(item?.variants[0]?.id||'');}}>{catalogue.products.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="grid min-w-0 gap-2 text-sm">{copy.option}<select required className={input} value={variantId} onChange={event=>{invalidate();setVariantId(event.target.value);}}><option value="">{copy.choose}</option>{product?.variants.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="grid min-w-0 gap-2 text-sm">{copy.startDate}<input required type="date" className={input} min={catalogue.today} max={catalogue.latestStartDate} value={startDate} onChange={event=>{invalidate();setStartDate(event.target.value);}}/></label>
    <button type="submit" className={button+' w-fit sm:col-span-2'} disabled={!!busy||!productId||!variantId||!startDate}>{copy.check}</button>
   </form>
  </>}
  {calendar&&<>
   {!calendar.dates.length?<p role="status" className="text-sm">{copy.noDates}</p>:<fieldset className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3"><legend className="mb-3 text-sm font-medium">{copy.dates}</legend>{calendar.dates.map(item=><label key={item.date} className="flex min-w-0 items-start gap-2 rounded-xl border border-villa-obsidian/25 p-3 text-sm"><input type="radio" name="headout-preview-date" value={item.date} checked={selectedDate===item.date} disabled={item.availability==='CLOSED'} onChange={()=>setSelectedDate(item.date)} className="mt-1 shrink-0"/><span className="grid min-w-0 gap-1 break-words"><span>{labelDate(item.date)}</span><span className="text-xs">{item.availability==='CLOSED'?copy.closed:item.availability==='LIMITED'?copy.limited:copy.available}</span>{item.price&&<span>{copy.from} {new Intl.NumberFormat(locale,{style:'currency',currency:item.price.currency}).format(item.price.amount)}</span>}</span></label>)}</fieldset>}
   <p className="text-xs text-villa-graphite">{copy.testPrice}</p>
   {selected&&<a href={calendar.product.referralUrl} target="_blank" rel="noopener noreferrer" className={button+' w-fit'}>{copy.open}</a>}
   <p className="text-sm leading-relaxed">{copy.handoff}</p>
  </>}
 </section>;
}
