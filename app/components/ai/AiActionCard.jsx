"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../LocaleProvider';
import { useAuth } from '../AuthProvider';
import SaveButton from '../SaveButton';
import { getTranslation } from '../../../lib/i18nClient';
import { getDiningHandoffCopy } from '../../../lib/dining/copy.mjs';
import { PROVIDERS } from '../../../lib/dining/gateway.mjs';
import { buildStay22ReferralUrl, parseDailyPrice } from '../../../lib/ai/tripProfile.mjs';
import { enrichPartnerBookingUrl, getStage2Copy } from '../../../lib/ai/stage2Core.mjs';
import { formatActionEstimate, getActionAgentCopy } from '../../../lib/ai/actionAgentCopy.mjs';
import { buildDayTimeline, buildPlanIcs, getTimelineCopy } from '../../../lib/ai/dayTimeline.mjs';
import { buildPackagePlanNote, computePackageSummary, formatUsd, getPackageCopy } from '../../../lib/ai/packageCalculator.mjs';
import { extractTripDays } from '../../../lib/ai/budgetEstimator.mjs';
import { isReceipt, submissionKey } from '../../../lib/bookingSubmission.mjs';
import { isPlanReceipt } from '../../../lib/planRules.mjs';
import { getConsentCopy } from '../../../lib/legal/consentCopy.mjs';
import { TERMS_VERSION } from '../../../lib/legal/termsContent.mjs';
import { supabase } from '../../../lib/supabase';
import { isMiamiElioApp } from '../AnalyticsBeacon';

const PARTNER_PLATFORMS = Object.freeze({
  ticketnetwork: 'TicketNetwork',
  viator: 'Viator',
  headout: 'Headout',
  ovago: 'Ovago',
  yatr: 'YATR',
  stay22: 'Stay22',
  privatejetfinder: 'PrivateJetFinder'
});

const SECTION_PARTNER_BOOKING = Object.freeze({
  '/yachts': { kind: 'book', platform: 'yatr', href: 'https://yatr.co?ref=MIAMI-ELIO-GORGONA-ONE' },
  '/private-jets': { kind: 'book', platform: 'privatejetfinder', href: 'https://www.privatejetfinder.com/?tk=716179668192' },
  '/vacation-rentals': { kind: 'book', platform: 'stay22', href: buildStay22ReferralUrl() }
});

export function buildSectionPartnerBooking(href, profile = null) {
  const base = SECTION_PARTNER_BOOKING[href];
  if (!base) return null;
  return { ...base, href: enrichPartnerBookingUrl(base, profile) };
}

function isoDayOffset(offset) {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return day.toISOString().slice(0, 10);
}

function carSlugFromHref(href) {
  if (typeof href !== 'string') return null;
  const match = href.match(/^\/rentals\/([a-z0-9][a-z0-9-]*)$/);
  return match ? match[1] : null;
}

function favoriteKindForCard(card) {
  if (card?.kind === 'nightlife' || card?.type === 'Nightlife') return 'nightlife';
  if (card?.kind === 'dining' || card?.type === 'Restaurant') return 'dining';
  if (card?.kind === 'car' || card?.type === 'Car' || String(card?.href || '').startsWith('/rentals/')) return 'car';
  return undefined;
}

const compactInputClass =
  'w-full min-w-0 rounded-xl border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-brand-gold';

// ===========================================================================
// Navigation frame rendered under a concierge reply.
// ===========================================================================

export function AiActionCard({ card, onNavigate }) {
  const t = getTranslation(useLocale());
  if (!card?.href) return null;

  return (
    <Link
      href={card.href}
      onClick={onNavigate}
      aria-label={`${card.title || card.label} — ${card.cta || t.ai.open}`}
      className="group block rounded-2xl border border-brand-gold/25 bg-gradient-to-br from-brand-gold/[0.09] to-white/[0.02] p-4 transition hover:border-brand-gold/70 hover:from-brand-gold/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {card.label && (
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-brand-gold/80">{card.label}</p>
      )}

      <p className="mt-1.5 text-sm font-semibold text-white">{card.title || card.label}</p>

      {card.summary && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{card.summary}</p>}

      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-black transition group-hover:brightness-110">
        {card.cta || t.ai.open}
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
          &rarr;
        </span>
      </span>
    </Link>
  );
}

function ListingLink({ card, onNavigate, selected = false }) {
  const agentCopy = getActionAgentCopy(useLocale());
  const name = card.title || card.label;
  const favKind = favoriteKindForCard(card);
  const estimateLine = [card.estimatedTotal, card.perGuest].filter(Boolean).join(' · ');
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-2xl border p-3 transition ${
      selected
        ? 'border-brand-gold/75 bg-gradient-to-br from-brand-gold/[0.16] to-white/[0.04]'
        : 'border-brand-gold/25 bg-gradient-to-br from-brand-gold/[0.09] to-white/[0.02] hover:border-brand-gold/60'
    }`}>
      <Link
        href={card.href}
        onClick={onNavigate}
        aria-label={[name, card.price].filter(Boolean).join(' — ')}
        className="group flex min-w-0 flex-1 items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {card.image ? (
          <img src={card.image} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />
        ) : null}
        <span className="min-w-0 flex-1">
          {card.label ? <span className="block font-mono text-[0.58rem] uppercase tracking-[0.28em] text-brand-gold/80">{card.label}</span> : null}
          <span className="mt-1 block truncate text-sm font-semibold text-white">{name}</span>
          {card.price ? <span className="mt-1 block text-xs text-brand-gold">{card.price}</span> : null}
          {estimateLine ? (
            <span data-card-estimate="true" className="mt-0.5 block truncate text-[11px] text-zinc-300">
              {estimateLine}
            </span>
          ) : null}
          {card.availabilityStatus === 'available' ? (
            <span data-availability="available" className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {agentCopy.availableDates}
            </span>
          ) : card.availabilityStatus === 'busy' ? (
            <span data-availability="busy" className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/12 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {agentCopy.busyDates}
            </span>
          ) : null}
        </span>
        <span aria-hidden="true" className="shrink-0 text-brand-gold transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
      </Link>
      <SaveButton
        compact
        href={card.href}
        kind={favKind}
        title={name}
        subtitle={card.subtitle || card.price || undefined}
        image={card.image || undefined}
        className="!h-8 !w-8 !border-white/15 bg-black/35 !text-zinc-200 hover:!border-brand-gold"
      />
    </div>
  );
}

// Restaurants, nightlife and partner bookings: enriched with TripProfile dates/guests.
function VenueActions({ card, copy, onNavigate, profile = null }) {
  if (!card.booking) return null;
  const bookingPlatform = card.booking.kind === 'book' ? card.booking.platform : 'maps';
  const platform = card.booking.kind === 'book' && card.booking.platform !== 'venue'
    ? (PROVIDERS.find((provider) => provider.id === card.booking.platform)?.name || PARTNER_PLATFORMS[card.booking.platform] || null)
    : null;
  const label = card.booking.kind === 'maps' ? copy.openMaps : platform ? copy.bookOn.replace('{platform}', platform) : copy.bookOnSite;
  const href = enrichPartnerBookingUrl(card.booking, profile) || card.booking.href;
  const trackReferralClick = () => {
    if (isMiamiElioApp(navigator.userAgent, document.documentElement.dataset.app)) return;
    try {
      fetch(`/api/chat?referral=${encodeURIComponent(bookingPlatform)}`, { method: 'GET', keepalive: true }).catch(() => {});
    } catch {}
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs">
      <a href={href} target="_blank" rel="noopener noreferrer" data-booking={bookingPlatform} onClick={trackReferralClick}
        className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-brand-gold px-3 font-semibold text-black hover:brightness-110">
        {label}<span aria-hidden="true">↗</span><span className="sr-only">({copy.newTab})</span>
      </a>
      {card.more ? <Link href={card.more} onClick={onNavigate} className="text-brand-gold/90 underline underline-offset-4">{copy.similar}</Link> : null}
    </div>
  );
}

// Inline car booking request right inside the chat without leaving the page.
function InlineCarQuickRequest({ card, profile = null, onNavigate }) {
  const locale = useLocale();
  const auth = useAuth();
  const s2 = getStage2Copy(locale);
  const agentCopy = getActionAgentCopy(locale);
  const legal = getConsentCopy(locale);
  const slug = carSlugFromHref(card?.href);
  const splitGuests = Number.isInteger(profile?.guests) && profile.guests >= 2 ? Math.min(12, profile.guests) : null;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [dates, setDates] = useState({ from: '', to: '' });
  const [delivery, setDelivery] = useState('');
  const [splitPay, setSplitPay] = useState(Boolean(splitGuests));
  const [accepted, setAccepted] = useState(false);
  const attempt = useRef(null);

  useEffect(() => {
    if (!open) return;
    const defaultFrom = profile?.dateRange?.from || isoDayOffset(3);
    const defaultTo = (profile?.dateRange?.to && profile.dateRange.to > defaultFrom)
      ? profile.dateRange.to
      : isoDayOffset(6);
    setDates((prev) => ({ from: prev.from || defaultFrom, to: prev.to || defaultTo }));
    if (profile?.airport) {
      setDelivery((prev) => prev || profile.airport);
    }
    if (auth?.session) {
      setContact((prev) => ({
        ...prev,
        name: prev.name || auth.session.name || '',
        email: prev.email || auth.session.email || ''
      }));
    }
  }, [open, profile?.dateRange?.from, profile?.dateRange?.to, profile?.airport, auth?.session?.name, auth?.session?.email]);

  if (!slug) return null;

  const dailyRate = parseDailyPrice(card?.price);
  const formDays = dates.from && dates.to && dates.to > dates.from
    ? Math.max(1, Math.min(30, Math.round((Date.parse(`${dates.to}T12:00:00Z`) - Date.parse(`${dates.from}T12:00:00Z`)) / 86_400_000)))
    : 0;
  const liveEstimate = dailyRate && formDays >= 1
    ? formatActionEstimate({
        days: formDays,
        estimatedTotalUsd: dailyRate * formDays,
        perGuestUsd: splitGuests && splitPay ? Math.ceil((dailyRate * formDays) / splitGuests) : null,
        splitWays: splitGuests && splitPay ? splitGuests : null,
        locale
      })
    : { estimatedTotal: null, perGuest: null };
  const liveEstimateText = [liveEstimate.estimatedTotal, liveEstimate.perGuest].filter(Boolean).join(' · ');

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === 'sending') return;
    setError('');
    if (!dates.from || !dates.to || dates.to <= dates.from) {
      setError(s2.errorBadDates);
      return;
    }
    if (!accepted) {
      setError(s2.errorConsent);
      return;
    }
    setStatus('sending');
    try {
      let token = null;
      let userId = auth?.session?.id || null;
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || null;
        if (data?.session?.user?.id) userId = data.session.user.id;
      } catch {}
      const dateParts = [`${dates.from} → ${dates.to}`];
      const cleanDelivery = delivery.trim().slice(0, 120);
      if (cleanDelivery) dateParts.push(`Delivery: ${cleanDelivery}`);
      if (splitPay && splitGuests) dateParts.push(`Split-Pay (${splitGuests})`);
      const body = {
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        dates: dateParts.join(' · ').slice(0, 600),
        itemSlug: slug,
        itemTitle: card.title || slug,
        kind: 'car',
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        attribution: {
          utmSource: 'elio_guide',
          utmMedium: 'ai_chat',
          utmCampaign: 'inline_car_request'
        }
      };
      attempt.current = submissionKey(attempt.current, JSON.stringify([body, userId]));
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': attempt.current.key,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !isReceipt(data)) throw new Error('failed');
      setStatus('sent');
    } catch {
      setError(s2.errorFailed);
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 text-xs text-emerald-100">
        <p className="font-semibold text-emerald-200">{s2.requestSentTitle}</p>
        <p className="mt-0.5 text-emerald-100/80">{s2.requestSentBody}</p>
        <Link href="/trip" onClick={onNavigate} className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-gold underline underline-offset-4">
          {s2.openTripRoom} <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-1">
      {!open ? (
        <button
          type="button"
          data-inline-car-request={slug}
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-brand-gold/45 bg-brand-gold/12 px-3 py-1 text-[11px] font-semibold text-brand-gold transition hover:border-brand-gold hover:bg-brand-gold hover:text-black"
        >
          {s2.quickRequest}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-1 grid gap-2 rounded-2xl border border-brand-gold/30 bg-black/45 p-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
              <span>{s2.fromLabel}</span>
              <input type="date" required min={isoDayOffset(0)} value={dates.from} onChange={(e) => setDates({ ...dates, from: e.target.value })} className={compactInputClass} />
            </label>
            <label className="grid gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
              <span>{s2.toLabel}</span>
              <input type="date" required min={dates.from || isoDayOffset(0)} value={dates.to} onChange={(e) => setDates({ ...dates, to: e.target.value })} className={compactInputClass} />
            </label>
          </div>
          {liveEstimateText ? (
            <p data-inline-estimate="true" className="rounded-lg border border-brand-gold/25 bg-brand-gold/[0.08] px-2.5 py-1 text-[11px] font-medium text-brand-gold">
              {liveEstimateText}
            </p>
          ) : null}
          <input type="text" required maxLength={120} placeholder={s2.namePlaceholder} aria-label={s2.namePlaceholder} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={compactInputClass} />
          <div className="grid grid-cols-2 gap-2">
            <input type="email" required maxLength={254} placeholder={s2.emailPlaceholder} aria-label={s2.emailPlaceholder} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={compactInputClass} />
            <input type="tel" required maxLength={40} placeholder={s2.phonePlaceholder} aria-label={s2.phonePlaceholder} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={compactInputClass} />
          </div>
          <input type="text" maxLength={120} placeholder={agentCopy.deliveryPlaceholder} aria-label={agentCopy.deliveryPlaceholder} value={delivery} onChange={(e) => setDelivery(e.target.value)} className={compactInputClass} />
          {splitGuests ? (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-200">
              <input type="checkbox" checked={splitPay} onChange={(e) => setSplitPay(e.target.checked)} className="accent-brand-gold" />
              <span>{agentCopy.splitPayOption.replace('{n}', String(splitGuests))}</span>
            </label>
          ) : null}
          <label className="flex items-start gap-2 text-[11px] leading-snug text-zinc-300">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 accent-brand-gold" />
            <span>
              {legal.consentPrefix}{' '}
              <Link href="/terms" onClick={onNavigate} className="text-brand-gold underline">{legal.termsLink}</Link>{' '}
              {legal.consentAnd}{' '}
              <Link href="/privacy" onClick={onNavigate} className="text-brand-gold underline">{legal.privacyLink}</Link>{' '}
              {legal.consentSuffix}
            </span>
          </label>
          {error && <p role="alert" className="text-[11px] text-rose-300">{error}</p>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={status === 'sending'} className="rounded-full bg-brand-gold px-3.5 py-1.5 text-[11px] font-semibold text-black transition hover:brightness-110 disabled:opacity-60">
              {status === 'sending' ? s2.sending : s2.submitRequest}
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(''); }} className="px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200">
              {s2.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Catalogue rows: photo, stored price, title, Save ♥, inline quick-request for cars, and partner links. */
export function AiListingCards({ listings, onNavigate, profile = null, className = '', rail = false }) {
  const copy = getDiningHandoffCopy(useLocale());
  if (!listings?.length) return null;
  const horizontal = rail && listings.length > 1;
  return (
    <div className={horizontal ? `min-w-0 pt-1 ${className}` : `grid min-w-0 gap-2.5 pt-1 ${className}`}>
      <div className={horizontal ? 'elio-rail-scroll flex min-w-0 snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1' : 'grid gap-2.5'}>
        {listings.map((card) => (
          <div key={card.booking?.href || card.href} className={horizontal ? 'grid w-[84%] shrink-0 snap-start gap-1.5 sm:w-[88%]' : 'grid gap-1.5'}>
            <ListingLink card={card} onNavigate={onNavigate} />
            <VenueActions card={card} copy={copy} onNavigate={onNavigate} profile={profile} />
            {!card.booking && carSlugFromHref(card.href) ? (
              <InlineCarQuickRequest card={card} profile={profile} onNavigate={onNavigate} />
            ) : null}
          </div>
        ))}
      </div>
      {listings.some((card) => card.booking && !PARTNER_PLATFORMS[card.booking.platform]) ? <p className="mt-1 px-1 text-[0.7rem] leading-snug text-zinc-400">{copy.chatNote}</p> : null}
    </div>
  );
}

/** A multi-item plan with interactive Miami Day Timeline (.ics + Rain Plan B) + POST /api/plan bridge to Live Trip Room. */
export function AiPlan({ plan, onNavigate, onQuickPrompt = null, profile = null }) {
  const locale = useLocale();
  const auth = useAuth();
  const copy = getDiningHandoffCopy(locale);
  const s2 = getStage2Copy(locale);
  const legal = getConsentCopy(locale);
  const tlCopy = getTimelineCopy(locale);
  const pkgCopy = getPackageCopy(locale);
  const timelineStops = buildDayTimeline(plan, profile, locale);
  const initialDays = extractTripDays('', profile) || 2;
  const initialSplit = Number.isInteger(profile?.guests) && profile.guests >= 1
    ? Math.min(12, profile.guests)
    : (Number.isInteger(plan?.guests) && plan.guests >= 1 ? Math.min(12, plan.guests) : 2);
  const [pkgDays, setPkgDays] = useState(initialDays);
  const [splitWays, setSplitWays] = useState(initialSplit);
  const [requestSplitPay, setRequestSplitPay] = useState(initialSplit >= 2);
  const [accepted, setAccepted] = useState(false);
  const [selectedBySection, setSelectedBySection] = useState(() => {
    const init = {};
    for (const section of plan?.sections || []) {
      const first = section?.candidates?.[0];
      if (first?.kind && first?.slug) init[section.href] = `${first.kind}:${first.slug}`;
    }
    return init;
  });
  const [openForm, setOpenForm] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', start: '', end: '', guests: initialSplit, time: '20:00', note: '' });
  const attempt = useRef(null);

  useEffect(() => {
    const next = {};
    for (const section of plan?.sections || []) {
      const first = section?.candidates?.[0];
      if (first?.kind && first?.slug) next[section.href] = `${first.kind}:${first.slug}`;
    }
    setSelectedBySection(next);
  }, [plan]);

  useEffect(() => {
    if (!openForm) return;
    const defaultStart = profile?.dateRange?.from || isoDayOffset(3);
    const startMs = Date.parse(`${defaultStart}T12:00:00Z`);
    const computedEnd = Number.isFinite(startMs)
      ? new Date(startMs + Math.max(1, pkgDays - 1) * 86_400_000).toISOString().slice(0, 10)
      : isoDayOffset(3 + Math.max(1, pkgDays - 1));
    const defaultEnd = (profile?.dateRange?.to && profile.dateRange.to >= defaultStart)
      ? profile.dateRange.to
      : computedEnd;
    setForm((prev) => ({
      ...prev,
      start: prev.start || defaultStart,
      end: prev.end || defaultEnd,
      guests: splitWays || prev.guests || 2,
      name: prev.name || auth?.session?.name || '',
      email: prev.email || auth?.session?.email || ''
    }));
  }, [openForm, profile?.dateRange?.from, profile?.dateRange?.to, pkgDays, splitWays, auth?.session?.name, auth?.session?.email]);

  if (!plan?.sections?.length) return null;

  const selectedItems = [];
  for (const section of plan.sections) {
    const chosenKey = selectedBySection[section.href];
    const match = (section.candidates || []).find((c) => `${c.kind}:${c.slug}` === chosenKey);
    if (match?.kind && match?.slug) {
      selectedItems.push({ kind: match.kind, slug: match.slug, title: match.title, price: match.price });
    }
  }
  const pkgSummary = computePackageSummary(selectedItems, { days: pkgDays, splitWays });
  const hasDining = selectedItems.some((item) => item.kind === 'dining' || item.kind === 'nightlife');
  const canSubmitPlan = plan.requestable !== false && selectedItems.length > 0;

  function toggleCandidate(sectionHref, candidate) {
    const key = `${candidate.kind}:${candidate.slug}`;
    setSelectedBySection((prev) => ({
      ...prev,
      [sectionHref]: prev[sectionHref] === key ? '' : key
    }));
  }

  async function handlePlanSubmit(event) {
    event.preventDefault();
    if (status === 'sending' || !selectedItems.length) return;
    setError('');
    if (!form.start || !form.end || form.end < form.start) {
      setError(s2.errorBadDates);
      return;
    }
    if (!accepted) {
      setError(s2.errorConsent);
      return;
    }
    setStatus('sending');
    try {
      let token = null;
      let userId = auth?.session?.id || null;
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || null;
        if (data?.session?.user?.id) userId = data.session.user.id;
      } catch {}
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        start: form.start,
        end: form.end,
        guests: Math.max(1, Math.min(99, Number(form.guests) || 2)),
        ...(hasDining ? { time: form.time || '20:00' } : {}),
        note: buildPackagePlanNote(pkgSummary, { userNote: form.note, requestSplitPay }),
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        items: selectedItems.map(({ kind, slug }) => ({ kind, slug })),
        attribution: {
          utmSource: 'elio_guide',
          utmMedium: 'ai_chat',
          utmCampaign: 'elio_trip_plan'
        }
      };
      attempt.current = submissionKey(attempt.current, JSON.stringify([payload, userId]));
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': attempt.current.key,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !isPlanReceipt(data)) throw new Error('failed');
      setReceipt(data);
      setStatus('sent');
    } catch {
      setError(s2.errorFailed);
      setStatus('idle');
    }
  }

  function handleDownloadIcs() {
    try {
      const ics = buildPlanIcs(plan, profile, locale);
      if (!ics) return;
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'miami-elio-itinerary.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {}
  }

  return (
    <div className="grid min-w-0 gap-3 pt-1" data-ai-plan="true">
      {plan.sections.map((section) => (
        <div key={section.href} className="min-w-0">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-brand-gold/80">{section.label}</p>
          <div className="mt-2 grid min-w-0 gap-2">
            {section.candidates.slice(0, 2).map((card) => {
              const key = `${card.kind}:${card.slug}`;
              const isSelected = selectedBySection[section.href] === key;
              return (
                <div key={card.booking?.href || card.href} className="grid min-w-0 gap-1.5">
                  <ListingLink card={card} onNavigate={onNavigate} selected={isSelected && canSubmitPlan} />
                  <div className="flex flex-wrap items-center gap-2 px-1">
                    {plan.requestable !== false && card.kind && card.slug && (
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        data-plan-select={key}
                        onClick={() => toggleCandidate(section.href, card)}
                        className={`inline-flex min-h-[28px] items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                          isSelected
                            ? 'border-brand-gold bg-brand-gold/20 text-brand-gold'
                            : 'border-white/15 bg-white/[0.03] text-zinc-300 hover:border-brand-gold/50 hover:text-white'
                        }`}
                      >
                        <span aria-hidden="true">{isSelected ? '✓' : '+'}</span>
                        <span>{isSelected ? s2.selectedItem : s2.addToPlan}</span>
                      </button>
                    )}
                    <VenueActions card={card} copy={copy} onNavigate={onNavigate} profile={profile} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {pkgSummary.itemCount > 0 && status !== 'sent' && (
        <div
          data-package-estimator="true"
          className="min-w-0 overflow-hidden rounded-2xl border border-brand-gold/30 bg-gradient-to-br from-brand-gold/[0.11] via-black/45 to-white/[0.03] p-3 text-xs sm:p-3.5"
        >
          <button
            type="button"
            data-pkg-toggle="true"
            aria-expanded={estimatorOpen}
            onClick={() => setEstimatorOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-gold">{pkgCopy.heading}</span>
              {pkgSummary.verifiedCarTotal > 0 && (
                <span data-pkg-verified-total="true" className="font-semibold text-white">
                  {formatUsd(pkgSummary.verifiedCarTotal)}
                </span>
              )}
              {pkgSummary.perPersonVerified && splitWays >= 2 && (
                <span data-pkg-per-person="true" className="text-[11px] font-semibold text-brand-gold">
                  · {formatUsd(pkgSummary.perPersonVerified)}/{pkgCopy.guestsUnit}
                </span>
              )}
            </div>
            <span aria-hidden="true" className="shrink-0 text-xs text-brand-gold">
              {estimatorOpen ? '▴' : '▾'}
            </span>
          </button>

          {estimatorOpen && (
            <div className="mt-2.5 grid min-w-0 gap-2.5 border-t border-white/10 pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[11px] text-zinc-200">
                  <span className="text-zinc-400">{pkgCopy.daysLabel}</span>
                  <button
                    type="button"
                    data-pkg-days-dec="true"
                    onClick={() => setPkgDays((d) => Math.max(1, d - 1))}
                    className="px-1 text-brand-gold hover:text-white"
                    aria-label="-"
                  >−</button>
                  <span data-pkg-days-val="true" className="min-w-[16px] text-center font-semibold text-white">{pkgDays}</span>
                  <button
                    type="button"
                    data-pkg-days-inc="true"
                    onClick={() => setPkgDays((d) => Math.min(14, d + 1))}
                    className="px-1 text-brand-gold hover:text-white"
                    aria-label="+"
                  >+</button>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[11px] text-zinc-200">
                  <span className="text-zinc-400">{pkgCopy.splitLabel}</span>
                  <button
                    type="button"
                    data-pkg-split-dec="true"
                    onClick={() => setSplitWays((s) => { const n = Math.max(1, s - 1); if (n < 2) setRequestSplitPay(false); return n; })}
                    className="px-1 text-brand-gold hover:text-white"
                    aria-label="-"
                  >−</button>
                  <span data-pkg-split-val="true" className="min-w-[16px] text-center font-semibold text-white">{splitWays}</span>
                  <button
                    type="button"
                    data-pkg-split-inc="true"
                    onClick={() => setSplitWays((s) => { const n = Math.min(12, s + 1); if (n >= 2) setRequestSplitPay(true); return n; })}
                    className="px-1 text-brand-gold hover:text-white"
                    aria-label="+"
                  >+</button>
                </div>
              </div>

              {pkgSummary.partnerQuotedCount > 0 && (
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-[11px]">
                  <span className="text-zinc-400">{pkgCopy.partnerItems} ({pkgSummary.partnerQuotedCount})</span>
                  <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] text-zinc-200">
                    {pkgCopy.partnerQuoteTag}
                  </span>
                </div>
              )}

              {splitWays >= 2 && (
                <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-zinc-200">
                  <input
                    type="checkbox"
                    checked={requestSplitPay}
                    onChange={(e) => setRequestSplitPay(e.target.checked)}
                    className="mt-0.5 shrink-0 accent-brand-gold"
                  />
                  <span>{pkgCopy.splitToggle.replace('{n}', String(splitWays))}</span>
                </label>
              )}
              {pkgSummary.hasSecurityDepositNote && (
                <p className="text-[10px] leading-relaxed text-zinc-400">{pkgCopy.depositNote}</p>
              )}
            </div>
          )}
        </div>
      )}

      {timelineStops.length > 0 && (
        <div data-miami-timeline="true" className="min-w-0 rounded-2xl border border-white/12 bg-black/30 px-3 py-2">
          <button
            type="button"
            data-timeline-toggle="true"
            aria-expanded={timelineOpen}
            onClick={() => setTimelineOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand-gold/90">
              {tlCopy.heading} ({timelineStops.length})
            </span>
            <span aria-hidden="true" className="text-xs text-zinc-400">{timelineOpen ? '▴' : '▾'}</span>
          </button>
          {timelineOpen && (
            <div className="mt-2.5 border-t border-white/10 pt-2.5">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  data-export-ics="true"
                  onClick={handleDownloadIcs}
                  className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-gold transition hover:bg-brand-gold hover:text-black"
                >
                  {tlCopy.exportIcs}
                </button>
                {typeof onQuickPrompt === 'function' && (
                  <button
                    type="button"
                    data-rain-plan-b="true"
                    onClick={() => onQuickPrompt(tlCopy.rainPrompt)}
                    className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-zinc-200 transition hover:border-brand-gold/60 hover:text-brand-gold"
                  >
                    {tlCopy.rainPlanB}
                  </button>
                )}
              </div>
              <ol className="space-y-2 border-l border-brand-gold/30 pl-3">
                {timelineStops.map((stop) => (
                  <li key={stop.id} className="text-xs">
                    {stop.driveHint && (
                      <p className="mb-1 text-[10px] text-zinc-400">{stop.driveHint}</p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] font-semibold text-brand-gold">{stop.time}</span>
                      <span className="truncate font-medium text-white">{stop.title}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {status === 'sent' && receipt ? (
        <div role="status" className="min-w-0 rounded-2xl border border-emerald-400/40 bg-emerald-500/12 p-3.5 text-xs text-emerald-100">
          <p className="font-semibold text-emerald-200">{s2.planSentTitle}</p>
          <p className="mt-1 text-emerald-100/85">{s2.planSentBody.replace('{n}', String(receipt.bookingIds.length))}</p>
          <Link
            href="/trip"
            onClick={onNavigate}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3.5 py-1.5 text-[11px] font-semibold text-black transition hover:brightness-110"
          >
            {s2.openTripRoom} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      ) : canSubmitPlan ? (
        <div className="min-w-0">
          {!openForm ? (
            <button
              type="button"
              data-plan-submit-open="true"
              onClick={() => setOpenForm(true)}
              className="w-full whitespace-normal rounded-full bg-brand-gold px-4 py-2.5 text-center text-xs font-semibold leading-snug text-black shadow-[0_8px_24px_rgba(212,175,55,0.28)] transition hover:brightness-110"
            >
              {pkgCopy.submitPackage.replace('{n}', String(selectedItems.length))}
            </button>
          ) : (
            <form onSubmit={handlePlanSubmit} className="grid gap-2.5 rounded-2xl border border-brand-gold/35 bg-black/50 p-3.5 text-xs">
              <p className="font-semibold text-brand-gold">{s2.sendPlanCount.replace('{n}', String(selectedItems.length))}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                  <span>{s2.fromLabel}</span>
                  <input type="date" required min={isoDayOffset(0)} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={compactInputClass} />
                </label>
                <label className="grid gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                  <span>{s2.toLabel}</span>
                  <input type="date" required min={form.start || isoDayOffset(0)} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={compactInputClass} />
                </label>
              </div>
              <div className={hasDining ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}>
                <label className="grid gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                  <span>{s2.guestsLabel}</span>
                  <input type="number" min="1" max="99" required value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })} className={compactInputClass} />
                </label>
                {hasDining && (
                  <label className="grid gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                    <span>{s2.timeLabel}</span>
                    <input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={compactInputClass} />
                  </label>
                )}
              </div>
              <input type="text" required maxLength={120} placeholder={s2.namePlaceholder} aria-label={s2.namePlaceholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={compactInputClass} />
              <div className="grid grid-cols-2 gap-2">
                <input type="email" required maxLength={254} placeholder={s2.emailPlaceholder} aria-label={s2.emailPlaceholder} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={compactInputClass} />
                <input type="tel" required maxLength={40} placeholder={s2.phonePlaceholder} aria-label={s2.phonePlaceholder} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={compactInputClass} />
              </div>
              <input type="text" maxLength={500} placeholder={s2.notePlaceholder} aria-label={s2.notePlaceholder} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={compactInputClass} />
              <label className="flex items-start gap-2 text-[11px] leading-snug text-zinc-300">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 accent-brand-gold" />
                <span>
                  {legal.consentPrefix}{' '}
                  <Link href="/terms" onClick={onNavigate} className="text-brand-gold underline">{legal.termsLink}</Link>{' '}
                  {legal.consentAnd}{' '}
                  <Link href="/privacy" onClick={onNavigate} className="text-brand-gold underline">{legal.privacyLink}</Link>{' '}
                  {legal.consentSuffix}
                </span>
              </label>
              {error && <p role="alert" className="text-[11px] text-rose-300">{error}</p>}
              <div className="flex items-center gap-2">
                <button type="submit" disabled={status === 'sending'} className="rounded-full bg-brand-gold px-4 py-2 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-60">
                  {status === 'sending' ? s2.sending : s2.submitPlan}
                </button>
                <button type="button" onClick={() => { setOpenForm(false); setError(''); }} className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200">
                  {s2.cancel}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** The frames under one reply. Renders nothing when there is no match. */
export function AiActionCards({ cards, onNavigate, profile = null, className = '' }) {
  const copy = getDiningHandoffCopy(useLocale());
  if (!cards?.length) return null;

  return (
    <div className={`grid gap-2.5 pt-1 ${className}`}>
      {cards.map((card) => {
        const partnerBooking = card.booking || buildSectionPartnerBooking(card.href, profile);
        return (
          <div key={card.href} className="grid gap-1.5">
            <AiActionCard card={card} onNavigate={onNavigate} />
            {partnerBooking ? <VenueActions card={{ ...card, booking: partnerBooking }} copy={copy} onNavigate={onNavigate} profile={profile} /> : null}
          </div>
        );
      })}
    </div>
  );
}
