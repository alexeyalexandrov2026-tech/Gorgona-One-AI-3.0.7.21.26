"use client";

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthProvider';
import { useSavedText } from '../LocalizedText';
import { useLocale } from '../LocaleProvider';
import { getWorldsCopy } from '../../../lib/worldsCopy';
import { supabase } from '../../../lib/supabase';
import { submissionKey } from '../../../lib/bookingSubmission.mjs';

const button = 'min-h-[42px] rounded-lg border border-villa-obsidian/25 px-3 py-2 text-sm font-medium text-villa-obsidian transition hover:bg-villa-obsidian/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';
const input = 'min-h-[44px] min-w-0 rounded-lg border border-villa-obsidian/25 bg-white/70 px-3 py-2 text-base text-villa-obsidian focus-visible:outline focus-visible:outline-2';

async function api(userId, path, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data?.session?.user?.id !== userId) throw new Error('Session changed');
  const response = await fetch(path, { ...options, cache:'no-store', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + data.session.access_token, ...options.headers } });
  const result = await response.json().catch(()=>({}));
  if (!response.ok) { const error=new Error('Request failed'); error.status=response.status; throw error; }
  return result;
}

export default function RequestBoard({ scope = 'customer' }) {
  const auth=useAuth(), msg=useSavedText(), locale=useLocale(), copy=getWorldsCopy(locale).form;
  const userId=auth?.session?.id;
  const [filter,setFilter]=useState(''), [after,setAfter]=useState(''), [reload,setReload]=useState(0);
  const [page,setPage]=useState({requests:[],nextCursor:null}), [loading,setLoading]=useState(true), [error,setError]=useState(false);
  const [selected,setSelected]=useState(''), [detail,setDetail]=useState(null), [detailError,setDetailError]=useState(false);
  const [reply,setReply]=useState(''), [partner,setPartner]=useState(''), [partners,setPartners]=useState([]);
  const [busy,setBusy]=useState(false), [actionError,setActionError]=useState('');
  const attempt=useRef(null), inFlight=useRef(false), mounted=useRef(true);
  const labels={ pending:msg('Pending'), reviewing:msg('In review'), responded:msg('Response sent'), closed:msg('Closed') };
  const eventLabels={created:msg('Pending'),review:msg('In review'),respond:msg('Response sent'),close:msg('Closed'),assign:msg('Assign partner')};
  const refresh=()=>{setAfter('');setReload(value=>value+1);};

  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    if(!userId)return;
    const controller=new AbortController();let active=true;
    setLoading(true);setError(false);
    api(userId,'/api/dashboard/requests?'+new URLSearchParams({scope,status:filter,cursor:after}),{signal:controller.signal})
      .then(result=>{if(active)setPage(result);}).catch(()=>{if(active)setError(true);})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;controller.abort();};
  },[userId,scope,filter,after,reload]);
  useEffect(()=>{
    if(!userId||!selected)return;
    const controller=new AbortController();let active=true;
    setDetail(null);setDetailError(false);setActionError('');setReply('');
    api(userId,'/api/dashboard/requests/'+selected+'?scope='+scope,{signal:controller.signal})
      .then(result=>{if(active){setDetail(result);setPartner(result.request.assigned_partner_id||'');}})
      .catch(()=>{if(active)setDetailError(true);});
    return()=>{active=false;controller.abort();};
  },[userId,scope,selected,reload]);
  useEffect(()=>{
    if(!userId||scope!=='admin')return;
    let active=true;
    api(userId,'/api/dashboard/partners').then(result=>{if(active)setPartners(result.partners);}).catch(()=>{if(active)setActionError('failed');});
    return()=>{active=false;};
  },[userId,scope]);

  async function command(action) {
    if(inFlight.current||!detail)return;
    const body={action,version:detail.request.version,...(action==='respond'?{reply}:{}),...(action==='assign'?{partnerId:partner||null}:{})};
    attempt.current=submissionKey(attempt.current,JSON.stringify([selected,body]));
    inFlight.current=true;setBusy(true);setActionError('');
    try {
      await api(userId,'/api/dashboard/requests/'+selected,{method:'POST',headers:{'Idempotency-Key':attempt.current.key},body:JSON.stringify(body)});
      if(mounted.current){attempt.current=null;refresh();}
    } catch(error) {if(mounted.current)setActionError(error.status===409?'conflict':'failed');}
    finally {inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  const date=value=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'America/New_York'}).format(new Date(value));
  if(!userId)return null;
  return <section className="my-10 min-w-0 border-t border-villa-obsidian/20 pt-8" aria-label={msg('Requests')}>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h2 className="font-display text-3xl text-villa-charcoal">{msg('Requests')}</h2>
      <div className="flex min-w-0 flex-wrap gap-2">
        <select aria-label={msg('Status')} className={input} value={filter} onChange={event=>{setFilter(event.target.value);setAfter('');setSelected('');}}>
          <option value="">{msg('All statuses')}</option>
          {Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" className={button} onClick={refresh} disabled={loading}>{msg('Refresh')}</button>
      </div>
    </div>
    {loading?<p role="status" className="py-8 text-villa-graphite">{msg('Loading...')}</p>:error?<p role="alert" className="py-8 text-villa-graphite">{msg('Unable to load requests.')}</p>:!page.requests.length?<p className="py-8 text-villa-graphite">{msg('No requests yet.')}</p>:<>
      <table className="w-full table-fixed text-start text-sm text-villa-graphite">
        <thead><tr className="border-b border-villa-obsidian/20 text-start"><th className="w-2/3 py-3 text-start font-medium">{msg('Requests')}</th><th className="py-3 text-start font-medium">{msg('Status')}</th></tr></thead>
        <tbody>{page.requests.map(row=><tr key={row.id} className="border-b border-villa-obsidian/15 align-top">
          <td className="py-4 pe-4 [overflow-wrap:anywhere]"><button type="button" className="text-start font-medium text-villa-obsidian underline decoration-villa-obsidian/25 underline-offset-4" onClick={()=>setSelected(row.id)} aria-expanded={selected===row.id}>{row.item_title||row.item_slug}</button>
            <p className="mt-1 text-xs text-villa-ash">{row.id.slice(0,8)} · {date(row.created_at)}</p><p className="mt-2 text-sm">{row.dates}</p></td>
          <td className="py-4 [overflow-wrap:anywhere]">{labels[row.status]||msg('Unknown')}</td>
        </tr>)}</tbody>
      </table>
      <div className="mt-4 flex flex-wrap gap-3">{after&&<button type="button" className={button} onClick={()=>setAfter('')}>{msg('Back')}</button>}{page.nextCursor&&<button type="button" className={button} onClick={()=>setAfter(page.nextCursor)}>{msg('Next page')}</button>}</div>
    </>}
    {selected&&<div className="mt-8 min-w-0 border border-villa-obsidian/20 bg-white/40 p-4 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3"><h3 className="font-display text-2xl text-villa-charcoal">{msg('Details')}</h3><button type="button" className={button} disabled={busy} onClick={()=>setSelected('')}>{msg('Back')}</button></div>
      {detailError?<p role="alert">{msg('Unable to load requests.')}</p>:!detail?<p role="status">{msg('Loading...')}</p>:<>
        <h4 className="text-lg font-medium [overflow-wrap:anywhere]">{detail.request.item_title}</h4>
        <p className="mt-2 text-sm [overflow-wrap:anywhere]">{detail.request.dates}</p>
        <p className="mt-3 text-sm">{msg('Status')}: {labels[detail.request.status]||msg('Unknown')}</p>
        {scope!=='customer'&&<div className="my-4 grid gap-2 text-sm [overflow-wrap:anywhere]"><p>{copy.name}: {detail.request.client_name}</p><p>{copy.email}: {detail.request.client_email}</p><p>{copy.phone}: {detail.request.client_phone}</p></div>}
        <h4 className="mb-3 mt-6 font-medium">{msg('History')}</h4>
        <ol className="grid gap-3 border-s border-villa-obsidian/20 ps-4">{detail.events.map(event=><li key={event.id} className="text-sm"><p>{eventLabels[event.event_type]||msg('Unknown')} · {date(event.created_at)}</p>{event.reply&&<p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{event.reply}</p>}</li>)}</ol>
        {scope!=='customer'&&detail.request.status!=='closed'&&<div className="mt-6 grid gap-4 border-t border-villa-obsidian/20 pt-5">
          {scope==='admin'&&<div className="flex min-w-0 flex-wrap gap-2"><select aria-label={msg('Assign partner')} className={`${input} max-w-full flex-1`} value={partner} onChange={event=>setPartner(event.target.value)} disabled={busy}><option value="">{msg('Unassigned')}</option>{partners.map(item=><option key={item.id} value={item.id}>{item.company_name||item.name}</option>)}</select><button type="button" className={button} onClick={()=>command('assign')} disabled={busy||partner===(detail.request.assigned_partner_id||'')}>{msg('Save')}</button></div>}
          <form onSubmit={event=>{event.preventDefault();command('respond');}} className="grid gap-3"><label className="grid gap-2 text-sm">{msg('Response')}<textarea className={`${input} min-h-[110px] w-full resize-y`} required maxLength={2000} value={reply} onChange={event=>setReply(event.target.value)} disabled={busy}/></label><button className={`${button} w-fit`} type="submit" disabled={busy||!reply.trim()}>{msg('Send response')}</button></form>
          {scope==='admin'&&<div className="flex flex-wrap gap-3">{detail.request.status==='pending'&&<button type="button" className={button} onClick={()=>command('review')} disabled={busy}>{msg('Start review')}</button>}<button type="button" className={button} onClick={()=>command('close')} disabled={busy}>{msg('Close request')}</button></div>}
        </div>}
        {actionError&&<p role="alert" className="mt-4 text-sm">{actionError==='conflict'?msg('Changed by another user. Refresh and try again.'):msg('Unable to load requests.')}</p>}
      </>}
    </div>}
  </section>;
}

export function NotificationSummary() {
  const auth=useAuth(), msg=useSavedText(), [data,setData]=useState(null), [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!auth?.session?.id||auth.session.role!=='admin')return;
    let active=true;
    api(auth.session.id,'/api/dashboard/notifications').then(value=>{if(active)setData(value);}).catch(()=>{if(active)setFailed(true);});
    return()=>{active=false;};
  },[auth?.session?.id,auth?.session?.role]);
  return <section className="my-8 border-t border-villa-obsidian/20 pt-6 text-sm"><h2 className="mb-4 font-display text-2xl">{msg('Notifications')}</h2>{failed?<p role="alert">{msg('Unable to load requests.')}</p>:!data?<p role="status">{msg('Loading...')}</p>:<div className="flex flex-wrap gap-x-8 gap-y-3"><p>{msg('Telegram')}: {data.channels.telegram?msg('Configured'):msg('Not configured')}</p><p>{msg('Email')}: {data.channels.email?msg('Configured'):msg('Not configured')}</p><p>{msg('Queued')}: {data.counts.pending+data.counts.leased}</p><p>{msg('Sent')}: {data.counts.sent}</p><p>{msg('Failed')}: {data.counts.failed}</p></div>}</section>;
}
