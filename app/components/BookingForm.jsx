"use client";

import { useEffect, useRef, useState } from 'react';
import { isReceipt, submissionKey } from '../../lib/bookingSubmission.mjs';
import { readJournal, writeJournal, clearJournal } from '../../lib/bookingJournal.mjs';
import { useAuth } from './AuthProvider';
import { useSavedText } from './LocalizedText';
import { supabase } from '../../lib/supabase';
import { useLocale } from './LocaleProvider';
import { getWorldsCopy, summarizeRequest } from '../../lib/worldsCopy';
import { btn } from './g1/ui';
import Icon from './g1/icons';

const inputClass =
  'min-h-[46px] w-full min-w-0 rounded-xl border border-g1-rule bg-g1-paper px-3.5 text-[1rem] text-g1-ink outline-none transition placeholder:text-g1-soft focus:border-g1-accent';
const labelClass = 'grid min-w-0 gap-1.5 text-[0.82rem] font-medium text-g1-soft';

const isoDay = (offset) => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return day.toISOString().slice(0, 10);
};

// Request form for a car, a charter, a stay or an experience. Nothing is charged: the
// request goes to the team, who confirm rate, deposit and requirements.
export default function BookingForm({ rentalSlug, rentalTitle, kind = 'car' }) {
  const auth=useAuth(),msg=useSavedText();
  if(auth?.loading)return <div role="status" className="py-5">{msg('Loading...')}</div>;
  return <BookingWorkspace key={[auth?.session?.id||'guest',kind,rentalSlug].join(':')} rentalSlug={rentalSlug} rentalTitle={rentalTitle} kind={kind}/>;
}

function BookingWorkspace({rentalSlug,rentalTitle,kind}) {
  const msg=useSavedText();
  const locale = useLocale();
  const copy = getWorldsCopy(locale).form;
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [trip, setTrip] = useState({ from: '', to: '', place: 0, duration: 0, guests: 2 });
  const [today, setToday] = useState('');
  const sending = useRef(false);
  const attempt = useRef(null);
  const pending=useRef(null),mounted=useRef(true);
  const [recovering,setRecovering]=useState(true),[locked,setLocked]=useState(false);
  const scope={kind,slug:rentalSlug};
  const storage=()=>{try{return window.sessionStorage;}catch{return null;}};

  // Dates depend on the visitor's clock, so they are filled in after mount.
  useEffect(() => {
    setToday(isoDay(0));
    setTrip((t) => ({ ...t, from: t.from || isoDay(3), to: t.to || isoDay(kind === 'stay' ? 7 : 6) }));
  }, [kind]);

  // Signed-in visitors get their name and email filled in.
  useEffect(() => {
    let active = true;mounted.current=true;
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if(!active)return;
      const saved=readJournal(storage(),scope,user?.id||null);
      if(saved){
        pending.current=saved;setLocked(true);
        setContact({name:saved.body.name,email:saved.body.email,phone:saved.body.phone});setTrip(saved.trip);
        return send(saved,data?.session);
      }
      if (user) {
        setContact((c) => ({ ...c, name: c.name || user.user_metadata?.name || '', email: c.email || user.email || '' }));
      }
    }).catch(() => {}).finally(()=>{if(active)setRecovering(false);});
    return () => { active = false;mounted.current=false; };
  }, []);

  const setC = (key) => (event) => setContact({ ...contact, [key]: event.target.value });
  const setT = (key, numeric = false) => (event) => setTrip({ ...trip, [key]: numeric ? Number(event.target.value) : event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending.current) return;
    setError('');
    if (!pending.current && (kind === 'car' || kind === 'stay') && trip.to <= trip.from) {
      setError('badDates');
      return;
    }
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if(pending.current){
        if(pending.current.owner!==(sessionData?.session?.user?.id||null))throw new Error('Session changed');
        return await send(pending.current,sessionData?.session);
      }
      const body = { ...contact, dates: summarizeRequest(kind, trip), itemSlug: rentalSlug, itemTitle: rentalTitle, kind };
      attempt.current = submissionKey(attempt.current, JSON.stringify([body, sessionData?.session?.user?.id || null]));
      const entry={version:1,key:attempt.current.key,owner:sessionData?.session?.user?.id||null,createdAt:Date.now(),body,trip};
      pending.current=entry;writeJournal(storage(),scope,entry);setLocked(true);
      await send(entry,sessionData?.session);
    } catch {setError('failed');setStatus('idle');}
  }

  async function send(entry,session) {
    if(sending.current)return;
    sending.current=true;setStatus('sending');setError('');
    try {
      const token=session?.access_token;
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key':entry.key, ...(token ? { Authorization:`Bearer ${token}` } : {}) },
        body: JSON.stringify(entry.body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !isReceipt(data)) {
        if([400,413,429].includes(res.status)){clearJournal(storage(),scope,entry.owner);pending.current=null;if(mounted.current)setLocked(false);}
        throw new Error('failed');
      }
      clearJournal(storage(),scope,entry.owner);pending.current=null;
      if(mounted.current){setLocked(false);setStatus('sent');}
    } catch (err) {
      if(mounted.current){setError('failed');setStatus('idle');}
    } finally {
      sending.current = false;
    }
  }

  const card = 'grid gap-4 rounded-[22px] border border-g1-rule bg-g1-card p-5 sm:p-6';
  if(recovering)return <div className={card} role="status">{pending.current?copy.sending:msg('Loading...')}</div>;

  if (status === 'sent') {
    return (
      <div className={card} role="status">
        <span className="g1-stamp w-fit"><Icon name="check" className="h-3.5 w-3.5" />{copy.sentTitle}</span>
        <p className="text-g1-ink">{copy.sentText}</p>
        <button type="button" onClick={() => { attempt.current = null; setStatus('idle'); }} className="w-fit text-[0.92rem] font-medium text-g1-accent hover:underline">
          {copy.again}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={card} aria-label={copy.title[kind]}>
      <p className="font-g1sans text-[0.74rem] font-medium uppercase tracking-[0.2em] text-g1-soft">{copy.title[kind]}</p>
      <fieldset disabled={locked||status==='sending'} className="contents">
      {kind === 'experience' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            {copy.date}
            <input className={inputClass} type="date" required min={today} value={trip.from} onChange={setT('from')} />
          </label>
          <label className={labelClass}>
            {copy.guests}
            <input className={inputClass} type="number" inputMode="numeric" min="1" max="99" required value={trip.guests} onChange={setT('guests', true)} />
          </label>
        </div>
      ) : kind === 'yacht' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className={`${labelClass} col-span-2 sm:col-span-1`}>
            {copy.date}
            <input className={inputClass} type="date" required min={today} value={trip.from} onChange={setT('from')} />
          </label>
          <label className={labelClass}>
            {copy.duration}
            <select className={inputClass} value={trip.duration} onChange={setT('duration', true)}>
              {copy.durations.map((label, i) => <option key={label} value={i}>{label}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            {copy.guests}
            <input className={inputClass} type="number" inputMode="numeric" min="1" max="99" required value={trip.guests} onChange={setT('guests', true)} />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            {kind === 'stay' ? copy.checkIn : copy.pickup}
            <input className={inputClass} type="date" required min={today} value={trip.from} onChange={setT('from')} />
          </label>
          <label className={labelClass}>
            {kind === 'stay' ? copy.checkOut : copy.return}
            <input className={inputClass} type="date" required min={trip.from || today} value={trip.to} onChange={setT('to')} />
          </label>
          {kind === 'stay' ? (
            <label className={`${labelClass} col-span-2`}>
              {copy.guests}
              <input className={inputClass} type="number" inputMode="numeric" min="1" max="99" required value={trip.guests} onChange={setT('guests', true)} />
            </label>
          ) : (
            <label className={`${labelClass} col-span-2`}>
              {copy.deliveryTo}
              <select className={inputClass} value={trip.place} onChange={setT('place', true)}>
                {copy.places.map((label, i) => <option key={label} value={i}>{label}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="grid gap-3 border-t-2 border-dashed border-g1-rule pt-4 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          {copy.name}
          <input className={inputClass} required autoComplete="name" maxLength={120} value={contact.name} onChange={setC('name')} />
        </label>
        <label className={labelClass}>
          {copy.phone}
          <input className={inputClass} type="tel" required autoComplete="tel" maxLength={40} value={contact.phone} onChange={setC('phone')} />
        </label>
        <label className={labelClass}>
          {copy.email}
          <input className={inputClass} type="email" required autoComplete="email" maxLength={254} value={contact.email} onChange={setC('email')} />
        </label>
      </div>
      </fieldset>
      {error && <p role="alert" className="rounded-xl border border-g1-accent bg-g1-accent-wash px-3 py-2 text-[0.9rem] text-g1-ink">{copy[error] || error}</p>}

      <button type="submit" disabled={status === 'sending'} className={`${btn.base} ${btn.primary} w-full disabled:opacity-60`}>
        {status === 'sending' ? copy.sending : copy.submit}
      </button>
      <p className="text-[0.82rem] leading-normal text-g1-soft">{copy.note}</p>
    </form>
  );
}
