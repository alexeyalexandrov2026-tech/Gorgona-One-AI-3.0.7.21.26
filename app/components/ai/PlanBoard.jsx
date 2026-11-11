"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useConciergeChat } from './ChatProvider';
import { useSavedText } from '../LocalizedText';
import { useAuth } from '../AuthProvider';
import { supabase } from '../../../lib/supabase';
import { submissionKey } from '../../../lib/bookingSubmission.mjs';
import { isPlanReceipt } from '../../../lib/planRules.mjs';
import { FavoriteButton } from '../Favorites';

// ===========================================================================
// "Your plan" under a concierge reply: one card per section the guest asked
// for (yacht, villa, car, restaurant), each a real catalogue item the server
// picked (lib/ai/plan.mjs). The guest can show another option or remove a
// card, then send ONE request for everything left (/api/plan). Nothing is
// charged; the team confirms availability and prices first.
// ===========================================================================

const isoDay = (offset) => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return day.toISOString().slice(0, 10);
};
const field = 'min-h-[44px] w-full min-w-0 rounded-lg border border-g1-rule bg-g1-paper px-3 text-base text-g1-ink outline-none transition focus:border-brand-gold';
const label = 'grid min-w-0 gap-1 text-xs font-medium text-g1-soft';
const restaurant = (item) => item.kind === 'dining' || item.kind === 'nightlife';
const withoutAttempt = ({ attempt, ...rest }) => rest;

export function PlanBoard({ onNavigate }) {
  const { plan, updatePlan, clearPlan } = useConciergeChat();
  const msg = useSavedText();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending
  const [error, setError] = useState('');
  const [form, setForm] = useState({ start: '', end: '', guests: 2, time: '20:00', name: '', phone: '', email: '', note: '' });
  const sending = useRef(false), mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Dates depend on the visitor's clock, so they are filled in after mount.
  useEffect(() => { setForm((f) => ({ ...f, start: f.start || isoDay(3), end: f.end || isoDay(5) })); }, []);
  useEffect(() => { if (plan?.guests) setForm((f) => ({ ...f, guests: plan.guests })); }, [plan?.guests]);
  // Signed-in guests get their name and email filled in.
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (active && user) setForm((f) => ({ ...f, name: f.name || user.user_metadata?.name || '', email: f.email || user.email || '' }));
    }).catch(() => {});
    return () => { active = false; };
  }, [open]);

  if (!plan) return null;

  const items = plan.sections.filter((section) => !section.removed).map((section) => section.candidates[section.index]);
  const removed = plan.sections.filter((section) => section.removed);
  const needsTime = items.some(restaurant);
  const locked = status === 'sending' || Boolean(plan.submitted);
  const edit = (index, change) => updatePlan((current) => withoutAttempt({ ...current, sections: current.sections.map((section, i) => (i === index ? change(section) : section)) }));
  const set = (key, numeric = false) => (event) => setForm({ ...form, [key]: numeric ? Number(event.target.value) : event.target.value });

  async function submit(event) {
    event.preventDefault();
    if (sending.current || !items.length) return;
    setError('');
    if (form.end < form.start) { setError('dates'); return; }
    sending.current = true;
    setStatus('sending');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = data?.session;
      const body = {
        name: form.name, email: form.email, phone: form.phone, start: form.start, end: form.end, guests: Number(form.guests), note: form.note,
        items: items.map((item) => ({ kind: item.kind, slug: item.slug })), ...(needsTime ? { time: form.time } : {})
      };
      // The same plan and details reuse one key, so a lost response never
      // creates a second request; the key survives a reload of this tab.
      const serialized = JSON.stringify([body, session?.user?.id || null]);
      const attempt = submissionKey(plan.attempt, serialized);
      const at = plan.attempt?.serialized === serialized ? plan.attempt.at : Date.now();
      updatePlan((current) => ({ ...current, attempt: { key: attempt.key, serialized, at } }));
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key, ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify(body)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !isPlanReceipt(result)) {
        if ([400, 413, 429].includes(response.status)) updatePlan(withoutAttempt);
        throw Object.assign(new Error('failed'), { status: response.status });
      }
      updatePlan((current) => ({ ...withoutAttempt(current), submitted: { planId: result.planId, count: result.bookingIds.length } }));
    } catch (failure) {
      if (mounted.current) setError(failure?.status === 400 ? 'check' : 'failed');
    } finally {
      sending.current = false;
      if (mounted.current) setStatus('idle');
    }
  }

  if (plan.submitted) {
    return (
      <section aria-label={msg('Your plan')} className="rounded-2xl border border-brand-gold/40 bg-g1-card p-4" role="status">
        <p className="text-sm font-semibold text-g1-ink">{msg('Plan request sent')}</p>
        <p className="mt-1 text-xs leading-relaxed text-g1-soft">{msg('Items in the request: {count}. Our team will contact you shortly.', { count: plan.submitted.count })}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {auth?.session?.id && <Link href="/profile" onClick={onNavigate} className="text-xs font-semibold text-brand-gold hover:underline">{msg('See it in your profile')}</Link>}
          <button type="button" onClick={clearPlan} className="text-xs text-g1-soft hover:text-g1-ink">{msg('Start a new plan')}</button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={msg('Your plan')} className="rounded-2xl border border-brand-gold/30 bg-g1-card p-3.5" data-plan>
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-brand-gold/80">{msg('Your plan')}</p>
      <p className="mt-1 text-xs leading-relaxed text-g1-soft">{msg('Real options from our catalogue. Swap or remove any of them, then send one request.')}</p>

      <ul className="mt-3 grid gap-2.5">
        {plan.sections.map((section, index) => {
          if (section.removed) return null;
          const item = section.candidates[section.index];
          return (
            <li key={section.href} className="flex min-w-0 gap-3 rounded-xl border border-g1-rule bg-g1-paper p-2.5">
              {item.image
                ? <img src={item.image} alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                : <span aria-hidden="true" className="h-16 w-16 shrink-0 rounded-lg bg-g1-band" />}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-g1-soft">{section.label}</p>
                <Link href={item.href} onClick={onNavigate} className="mt-0.5 block text-sm font-semibold text-g1-ink [overflow-wrap:anywhere] hover:underline">{item.title}</Link>
                {item.subtitle && <p className="text-xs text-g1-soft [overflow-wrap:anywhere]">{item.subtitle}</p>}
                {!locked && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {section.candidates.length > 1 && (
                      <button type="button" onClick={() => edit(index, (s) => ({ ...s, index: (s.index + 1) % s.candidates.length }))}
                        aria-label={`${msg('Another option')}: ${section.label}`} className="min-h-[28px] text-xs font-medium text-brand-gold hover:underline">
                        {msg('Another option')}
                      </button>
                    )}
                    <button type="button" onClick={() => edit(index, (s) => ({ ...s, removed: true }))}
                      aria-label={`${msg('Remove')}: ${section.label}`} className="min-h-[28px] text-xs text-g1-soft hover:text-g1-ink">
                      {msg('Remove')}
                    </button>
                  </div>
                )}
              </div>
              <FavoriteButton kind={item.kind} slug={item.slug} title={item.title} subtitle={item.subtitle} image={item.image} />
            </li>
          );
        })}
      </ul>

      {removed.length > 0 && !locked && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {plan.sections.map((section, index) => section.removed && (
            <button key={section.href} type="button" onClick={() => edit(index, (s) => ({ ...s, removed: false }))}
              className="rounded-full border border-g1-rule px-3 py-1.5 text-xs text-g1-soft transition hover:border-brand-gold/50 hover:text-g1-ink">
              {msg('Add back: {section}', { section: section.label })}
            </button>
          ))}
        </div>
      )}

      {!items.length && <p className="mt-3 text-xs text-g1-soft">{msg('Add at least one item to the plan.')}</p>}

      {plan.requestable && items.length > 0 && !open && (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-full bg-brand-gold px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110">
          {msg('Send one request for the whole plan')}
        </button>
      )}

      {plan.requestable && items.length > 0 && open && (
        <form onSubmit={submit} className="mt-3 grid gap-3 border-t border-dashed border-g1-rule pt-3" aria-label={msg('Send one request for the whole plan')}>
          <fieldset disabled={status === 'sending'} className="contents">
            <div className="grid grid-cols-2 gap-2.5">
              <label className={label}>{msg('First day')}
                <input className={field} type="date" required min={isoDay(0)} value={form.start} onChange={set('start')} />
              </label>
              <label className={label}>{msg('Last day')}
                <input className={field} type="date" required min={form.start || isoDay(0)} value={form.end} onChange={set('end')} />
              </label>
              <label className={label}>{msg('Guests')}
                <input className={field} type="number" inputMode="numeric" min="1" max="99" required value={form.guests} onChange={set('guests', true)} />
              </label>
              {needsTime && (
                <label className={label}>{msg('Dinner time')}
                  <input className={field} type="time" required value={form.time} onChange={set('time')} />
                </label>
              )}
            </div>
            <label className={label}>{msg('Name')}
              <input className={field} required autoComplete="name" maxLength={120} value={form.name} onChange={set('name')} />
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className={label}>{msg('Phone')}
                <input className={field} type="tel" required autoComplete="tel" maxLength={40} value={form.phone} onChange={set('phone')} />
              </label>
              <label className={label}>{msg('Email')}
                <input className={field} type="email" required autoComplete="email" maxLength={254} value={form.email} onChange={set('email')} />
              </label>
            </div>
            <label className={label}>{msg('Wishes (optional)')}
              <textarea className={`${field} min-h-[72px] resize-y py-2`} maxLength={1000} value={form.note} onChange={set('note')} />
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="rounded-lg border border-brand-gold/40 px-3 py-2 text-xs text-g1-ink">
              {error === 'dates' ? msg('The last day cannot be before the first day.') : error === 'check' ? msg('Please check the dates and contact details.') : msg('The request did not go through. Please try again.')}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={status === 'sending'}
              className="flex-1 rounded-full bg-brand-gold px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110 disabled:opacity-60">
              {status === 'sending' ? msg('Sending…') : msg('Send request')}
            </button>
            <button type="button" disabled={status === 'sending'} onClick={() => { setOpen(false); setError(''); }} className="text-xs text-g1-soft hover:text-g1-ink">
              {msg('Cancel')}
            </button>
          </div>
          <p className="text-[0.7rem] leading-normal text-g1-soft">{msg('Nothing is charged now. Our team confirms availability and prices with you first.')}</p>
        </form>
      )}
    </section>
  );
}
