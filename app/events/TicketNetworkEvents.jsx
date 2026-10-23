'use client';
import { LocalizedText, useSavedText } from "../components/LocalizedText";

import { useEffect, useId, useRef, useState } from 'react';
import { TICKETNETWORK_AREAS } from '../../lib/ticketnetworkLocation';

const INITIAL_FILTERS = { area: 'miami', from: '', to: '', performer: '', city: '' };
const fieldClass = 'block min-h-[44px] w-full min-w-0 border border-villa-obsidian/30 bg-transparent px-3 py-2 text-sm text-villa-obsidian outline-offset-2 focus:outline-villa-obsidian [color-scheme:light]';
const datePart = (date, options) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);

function EventRow({ event }) {
  const msg = useSavedText();
  const date = new Date(`${event.localDateTime}Z`);
  return (
    <li className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-t border-villa-obsidian/15 py-6 sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:gap-x-6 sm:px-3" data-event-id={event.id}>
      <time lang="en" dir="auto" dateTime={event.localDateTime} className="self-start text-sm text-villa-graphite sm:self-center">
        <span className="block text-xs uppercase tracking-wider">{datePart(date, { weekday: 'short' })}</span>
        <span className="block text-lg text-villa-obsidian">{datePart(date, { month: 'short', day: 'numeric' })}</span>
        <span className="block text-xs">{datePart(date, { year: 'numeric' })}</span>
        <span className="mt-1 block text-xs">{event.localDateTime.endsWith('03:30:00') ? 'Time TBA' : datePart(date, { hour: 'numeric', minute: '2-digit' })}</span>
      </time>
      <div lang="en" dir="auto" className="min-w-0">
        <h4 className="break-words text-base font-medium leading-snug text-villa-obsidian sm:text-lg">{event.name}</h4>
        <p className="mt-2 text-sm text-villa-graphite">{event.venue}<span className="mt-0.5 block">{event.city}{event.state ? `, ${event.state}` : ''}</span></p>
      </div>
      <a href={event.url} target="_blank" rel="noopener noreferrer sponsored" aria-label={msg("View tickets — {event}", { event: event.name })} className="col-start-2 inline-flex min-h-[44px] min-w-[112px] items-center justify-center justify-self-start bg-villa-obsidian px-5 py-3 text-xs font-medium text-white transition-opacity hover:opacity-75 sm:col-start-3 sm:row-start-1 sm:justify-self-end">{msg("View tickets ↗")}</a>
    </li>
  );
}

export function TicketNetworkEvents({ category, group, today }) {
  const msg = useSavedText();
  const id = useId();
  const [draft, setDraft] = useState(INITIAL_FILTERS);
  const [search, setSearch] = useState({ filters: INITIAL_FILTERS, page: 1, revision: 0 });
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const { filters, page, revision } = search;

  useEffect(() => {
    const controller = new AbortController();
    const current = ++sequence.current;
    const timeout = setTimeout(() => controller.abort(), 30000);
    setPhase('loading');
    setError('');
    const params = new URLSearchParams({ category, page: String(page), ...filters });
    fetch(`/api/events/ticketnetwork?${params}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(response.status === 400 ? data.error : 'The event list could not be refreshed. Please try again.');
        if (!Array.isArray(data.events) || data.page !== page) throw new Error('The event list could not be refreshed. Please try again.');
        if (current !== sequence.current) return;
        setResult(previous => {
          if (page === 1 || !previous) return data;
          const known = new Set(previous.events.map(event => event.id));
          return { ...data, events: [...previous.events, ...data.events.filter(event => !known.has(event.id))] };
        });
        setPhase('ready');
      })
      .catch(failure => {
        if (current !== sequence.current) return;
        setError(failure.name === 'AbortError' ? 'The event list is taking longer than usual. Please try again.' : failure.message);
        setPhase('error');
      })
      .finally(() => clearTimeout(timeout));
    return () => { ++sequence.current; controller.abort(); clearTimeout(timeout); };
  }, [category, filters, page, revision]);

  function apply(next) {
    ++sequence.current;
    setDraft(next);
    setResult(null);
    setSearch(previous => ({ filters: next, page: 1, revision: previous.revision + 1 }));
  }
  function updateDraft(field, value) {
    setDraft(previous => ({ ...previous, [field]: value }));
  }
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    apply(Object.fromEntries(Object.keys(INITIAL_FILTERS).map(key => [key, String(form.get(key) || '').trim()])));
  }
  const busy = phase === 'loading';
  const teamLabel = group === 'sports' ? 'Team' : group === 'events' ? 'Team or artist' : 'Artist';

  return (
    <div className="mt-8" data-ticketnetwork-calendar={category}>
      <form onSubmit={submit} className="grid min-w-0 grid-cols-2 gap-4 lg:grid-cols-6">
        <label className="col-span-2 min-w-0 text-xs font-medium text-villa-graphite">{msg("Area")}<select name="area" aria-label={msg("Area")} className={`${fieldClass} mt-2`} value={draft.area} onChange={event => apply({ ...draft, area: event.target.value, city: '' })}>
            {TICKETNETWORK_AREAS.map(area => <option key={area.value} value={area.value}>{msg(area.label)}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-xs font-medium text-villa-graphite">{msg("From date")}<input name="from" className={`${fieldClass} mt-2`} type="date" min={today} value={draft.from} onInput={event => updateDraft('from', event.target.value)} onChange={event => updateDraft('from', event.target.value)} />
        </label>
        <label className="min-w-0 text-xs font-medium text-villa-graphite">{msg("To date")}<input name="to" className={`${fieldClass} mt-2`} type="date" min={draft.from || today} value={draft.to} onInput={event => updateDraft('to', event.target.value)} onChange={event => updateDraft('to', event.target.value)} />
        </label>
        <label className="min-w-0 text-xs font-medium text-villa-graphite">{msg(teamLabel)}
          <input name="performer" className={`${fieldClass} mt-2`} type="search" list={`${id}-performers`} maxLength={100} placeholder={group === 'sports' ? msg("Any team") : group === 'events' ? msg("Any team or artist") : msg("Any artist")} value={draft.performer} onChange={event => updateDraft('performer', event.target.value)} />
          <datalist id={`${id}-performers`}>{result?.performers.map(name => <option key={name} value={name} />)}</datalist>
        </label>
        <label className="min-w-0 text-xs font-medium text-villa-graphite">{msg("City")}<input name="city" className={`${fieldClass} mt-2`} type="search" list={`${id}-cities`} maxLength={100} placeholder={msg("Any city in area")} value={draft.city} onChange={event => updateDraft('city', event.target.value)} />
          <datalist id={`${id}-cities`}>{result?.cities.map(name => <option key={name} value={name} />)}</datalist>
        </label>
        <div className="col-span-2 flex flex-wrap items-center gap-4 lg:col-span-6">
          <button type="submit" className="min-h-[44px] bg-villa-obsidian px-6 py-3 text-xs font-medium text-white transition-opacity hover:opacity-75">{msg("Show events")}</button>
          <button type="button" onClick={() => apply(INITIAL_FILTERS)} className="min-h-[44px] px-2 text-xs text-villa-graphite underline underline-offset-4">{msg("Reset filters")}</button>
          <p className="text-xs text-villa-graphite">{msg("Miami and nearby South Florida cities by default. All times are local to the venue.")}</p>
        </div>
      </form>

      <div className="mt-6" role="status" aria-live="polite" aria-atomic="true">
        {busy ? <p className="py-4 text-sm text-villa-graphite">{page > 1 ? msg("Loading more events…") : msg("Loading upcoming events…")}</p> : null}
        {error ? <p className="py-4 text-sm text-villa-graphite">{msg(error)} {result?.events.length ? msg("Your loaded events are still available below.") : ''}</p> : null}
        {phase === 'ready' && result ? <p className="py-4 text-xs text-villa-graphite">{msg("Upcoming events: {count}", { count: result.total.toLocaleString('en-US') })}{result.stale ? <>{' · '}<LocalizedText source="Saved results from {date}. Check current availability on TicketNetwork." values={{ date: <time lang="en" dir="auto" dateTime={result.updatedAt}>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(result.updatedAt))} ET</time> }} /></> : null}</p> : null}
      </div>
      {phase === 'error' ? <button type="button" onClick={() => setSearch(previous => ({ ...previous, revision: previous.revision + 1 }))} className="mb-6 min-h-[44px] border border-villa-obsidian px-6 py-3 text-sm">{msg("Try again")}</button> : null}
      {result?.events.length ? <ul aria-label={msg("Upcoming events")} aria-busy={busy}>{result.events.map(event => <EventRow key={event.id} event={event} />)}</ul> : null}
      {phase === 'ready' && result?.events.length === 0 ? <p className="border-y border-villa-obsidian/15 py-8 text-sm text-villa-graphite">{msg("No upcoming events match this area and your filters. Try different dates or change Area to All Florida or All cities.")}</p> : null}
      {phase === 'ready' && result?.hasMore ? <button type="button" onClick={() => setSearch(previous => ({ ...previous, page: result.page + 1 }))} className="mt-4 min-h-[48px] w-full border border-villa-obsidian/40 px-6 py-3 text-sm transition-colors hover:bg-villa-obsidian hover:text-white">{msg("Load more events")}</button> : null}
    </div>
  );
}
