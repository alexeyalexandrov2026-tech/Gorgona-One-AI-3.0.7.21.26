'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../components/LocaleProvider';
import { useAuth } from '../components/AuthProvider';
import { getPrivateJetsCopy, getPrivateJetsPageCopy } from '../../lib/privateJetsCopy.mjs';
import {
  PEREJETS,
  PRIVATE_JETS,
  PRIVATE_JET_ROUTES,
  PRIVATE_JET_WIDGET_DOCUMENT
} from '../../lib/privateJets.mjs';
import { isReceipt, submissionKey } from '../../lib/bookingSubmission.mjs';
import { getConsentCopy } from '../../lib/legal/consentCopy.mjs';
import { TERMS_VERSION } from '../../lib/legal/termsContent.mjs';
import { seoHeading } from '../../lib/seo.mjs';
import { supabase } from '../../lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PrivateJetsContent() {
  const locale = useLocale();
  const auth = useAuth();
  const copy = getPrivateJetsCopy(locale);
  const ui = getPrivateJetsPageCopy(locale);
  const consent = getConsentCopy(locale);

  const fromRef = useRef(null);
  const keyRef = useRef(null);

  const [from, setFrom] = useState('Miami');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('2');
  const [name, setName] = useState(auth?.session?.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(auth?.session?.email || '');
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);

  function handleRouteChip(route) {
    setFrom(route.from);
    setTo(route.to);
    setSelectedRoute(route);
    setError('');
    setReceipt(null);
    if (fromRef.current) {
      fromRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanFrom = from.trim();
    const cleanTo = to.trim();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPax = Math.max(1, Math.min(20, Number(passengers) || 2));

    if (!cleanFrom || !cleanTo || !cleanName || !cleanPhone || !EMAIL_RE.test(cleanEmail)) {
      setError(ui.errRequired);
      return;
    }
    if (!termsAccepted) {
      setError(consent.consentRequired);
      return;
    }

    const routeLabel = `${cleanFrom} → ${cleanTo}`;
    const payload = {
      kind: 'experience',
      itemSlug: selectedRoute ? `private-jet-${selectedRoute.id}` : 'private-jet-charter',
      itemTitle: `Private Jet: ${routeLabel}`.slice(0, 240),
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      dates: `Private Jet · ${routeLabel} · ${date || 'Flexible date'} · ${cleanPax} pax`.slice(0, 600),
      termsAccepted: true,
      termsVersion: TERMS_VERSION
    };

    const serialized = JSON.stringify(payload);
    keyRef.current = submissionKey(keyRef.current, serialized);

    setSubmitting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Idempotency-Key': keyRef.current.key
      };
      if (supabase) {
        const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
        if (data?.session?.access_token) {
          headers.Authorization = `Bearer ${data.session.access_token}`;
        }
      }
      const res = await fetch('/api/book', {
        method: 'POST',
        headers,
        body: serialized
      });
      const data = await res.json().catch(() => null);
      if (res.ok && isReceipt(data)) {
        setReceipt(data);
        keyRef.current = null;
      } else {
        setError(ui.errSubmit);
      }
    } catch {
      setError(ui.errSubmit);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-w-0 flex-1 pb-16 pt-2 font-g1sans text-g1-ink sm:pt-4">
      {/* Stage 1: Compact above-the-fold hero + live glass charter quote form (v3 layout) */}
      <section className="grid items-start gap-6 py-4 md:grid-cols-[1fr_1.06fr] md:items-center md:gap-12 md:py-8">
        <div className="min-w-0">
          <p className="font-g1mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-g1-soft">
            {ui.eyebrow}
          </p>
          <h1 className="mt-2.5 font-g1display text-[clamp(2.2rem,4.4vw,3.85rem)] font-medium leading-[1.02] tracking-[-0.015em] text-g1-ink [text-wrap:balance]">
            {seoHeading(locale,'privateJets',ui.headline)}
          </h1>
          <p className="mt-4 max-w-[38ch] text-[1.05rem] leading-relaxed text-g1-soft">
            {ui.lede}
          </p>

          {/* Subtle cabin seat pills — no prices, seats only */}
          <div className="mt-6 flex flex-wrap gap-2">
            {ui.cabins.map((cabin) => (
              <span
                key={cabin}
                className="inline-flex items-center rounded-full border border-white/15 bg-[#0b1921]/55 px-3.5 py-1.5 font-g1mono text-[0.68rem] tracking-[0.06em] text-g1-soft backdrop-blur-md"
              >
                {cabin}
              </span>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className={`grid gap-3 rounded-[22px] border p-5 shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl transition-colors sm:p-6 ${
            selectedRoute
              ? 'border-[#4cc9a6]/55 bg-[#0d1d26]/70'
              : 'border-white/15 bg-[#0d1d26]/60'
          }`}
        >
          {selectedRoute && !receipt && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#4cc9a6]/30 bg-[#4cc9a6]/10 px-3 py-2 text-xs text-[#6ee7c6]">
              <span>
                {selectedRoute.from} → {selectedRoute.to} {ui.prefilled} ({selectedRoute.flightTime})
              </span>
              <a
                href={selectedRoute.href}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="font-medium text-g1-ink underline decoration-white/30 underline-offset-4 transition hover:text-g1-accent"
              >
                {ui.viewOnPerejets} ↗
              </a>
            </div>
          )}

          {receipt ? (
            <div className="grid gap-3 py-4">
              <p className="font-g1mono text-[0.68rem] uppercase tracking-[0.2em] text-[#4cc9a6]">
                {ui.eyebrow}
              </p>
              <h2 className="font-g1display text-2xl font-medium text-g1-ink">{ui.sentTitle}</h2>
              <p className="text-sm leading-relaxed text-g1-soft">{ui.sentBody}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 px-5 text-sm font-medium text-g1-ink transition hover:border-white/50"
                >
                  {ui.sendAnother}
                </button>
                <a
                  href={selectedRoute ? selectedRoute.href : PEREJETS.href}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-g1-ink px-5 text-sm font-medium text-g1-paper transition hover:opacity-90"
                >
                  {ui.perejetsCta} ↗
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="grid gap-1">
                  <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.14em] text-g1-soft">
                    {ui.fromLabel}
                  </span>
                  <input
                    ref={fromRef}
                    type="text"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder={ui.fromPlaceholder}
                    className="w-full rounded-xl border border-g1-rule bg-[#071219]/75 px-3 py-2.5 text-[0.95rem] text-g1-ink outline-none transition placeholder:text-[#6d7c84] focus:border-g1-soft"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.14em] text-g1-soft">
                    {ui.toLabel}
                  </span>
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder={ui.toPlaceholder}
                    className="w-full rounded-xl border border-g1-rule bg-[#071219]/75 px-3 py-2.5 text-[0.95rem] text-g1-ink outline-none transition placeholder:text-[#6d7c84] focus:border-g1-soft"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="grid gap-1">
                  <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.14em] text-g1-soft">
                    {ui.dateLabel}
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-g1-rule bg-[#071219]/75 px-3 py-2.5 text-[0.95rem] text-g1-ink outline-none transition focus:border-g1-soft"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.14em] text-g1-soft">
                    {ui.passengersLabel}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    className="w-full rounded-xl border border-g1-rule bg-[#071219]/75 px-3 py-2.5 text-[0.95rem] text-g1-ink outline-none transition focus:border-g1-soft"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.14em] text-g1-soft">
                    {ui.nameLabel}
                  </span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={ui.namePlaceholder}
                    className="w-full rounded-xl border border-g1-rule bg-[#071219]/75 px-3 py-2.5 text-[0.95rem] text-g1-ink outline-none transition placeholder:text-[#6d7c84] focus:border-g1-soft"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.14em] text-g1-soft">
                    {ui.phoneLabel}
                  </span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={ui.phonePlaceholder}
                    className="w-full rounded-xl border border-g1-rule bg-[#071219]/75 px-3 py-2.5 text-[0.95rem] text-g1-ink outline-none transition placeholder:text-[#6d7c84] focus:border-g1-soft"
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="font-g1mono text-[0.62rem] uppercase tracking-[0.14em] text-g1-soft">
                  {ui.emailLabel}
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={ui.emailPlaceholder}
                  className="w-full rounded-xl border border-g1-rule bg-[#071219]/75 px-3 py-2.5 text-[0.95rem] text-g1-ink outline-none transition placeholder:text-[#6d7c84] focus:border-g1-soft"
                />
              </label>

              <label className="flex items-start gap-2 pt-0.5 text-[0.74rem] leading-snug text-g1-soft">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#d4af37]"
                />
                <span>
                  {consent.consentPrefix}{' '}
                  <Link href="/terms" className="text-g1-ink underline decoration-white/30 underline-offset-2 hover:text-g1-accent">
                    {consent.termsLink}
                  </Link>{' '}
                  {consent.consentAnd}{' '}
                  <Link href="/privacy" className="text-g1-ink underline decoration-white/30 underline-offset-2 hover:text-g1-accent">
                    {consent.privacyLink}
                  </Link>{' '}
                  {consent.consentSuffix}
                </span>
              </label>

              {error && (
                <p role="alert" className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </p>
              )}

              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-g1-ink px-6 text-[0.98rem] font-medium text-g1-paper transition hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? ui.sendingCta : ui.sendCta}
                </button>
                <p className="text-[0.8rem] leading-snug text-g1-soft">
                  {ui.orCheckYourself}{' '}
                  <a
                    href={PEREJETS.href}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    className="text-g1-ink underline decoration-g1-rule underline-offset-4 transition hover:text-g1-accent"
                  >
                    {PEREJETS.name}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                  {' · '}
                  <a
                    href={PRIVATE_JETS.href}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    className="text-g1-ink underline decoration-g1-rule underline-offset-4 transition hover:text-g1-accent"
                  >
                    {PRIVATE_JETS.name}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </p>
              </div>
            </>
          )}
        </form>
      </section>

      {/* Stage 2: 5 Popular PereJets Routes with one-way guide prices */}
      <section aria-labelledby="jet-routes-heading" className="mt-6 md:mt-8">
        <p id="jet-routes-heading" className="mb-3 font-g1mono text-[0.64rem] uppercase tracking-[0.18em] text-g1-soft">
          {ui.routesHeading}
        </p>
        <div className="flex flex-wrap gap-2.5 lg:grid lg:grid-cols-5">
          {PRIVATE_JET_ROUTES.map((route) => {
            const active = selectedRoute?.id === route.id;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => handleRouteChip(route)}
                className={`group flex flex-1 basis-[190px] flex-col items-start rounded-full border px-4 py-2.5 text-left transition lg:basis-auto lg:items-center lg:text-center ${
                  active
                    ? 'border-[#4cc9a6]/65 bg-[#0e2630]/85'
                    : 'border-white/15 bg-[#0c1b24]/55 hover:border-white/40 hover:bg-[#10232e]/80'
                }`}
              >
                <span className="font-g1display text-[0.95rem] font-medium leading-tight text-g1-ink whitespace-nowrap">
                  {route.from} → {route.to}
                </span>
                <span className="mt-0.5 text-[0.74rem] text-g1-soft whitespace-nowrap">
                  {ui.fromPrice} {route.priceUsd} · {route.flightTime}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3.5 text-[0.78rem] leading-relaxed text-g1-soft">
          {copy.disclosure}
        </p>
      </section>

      {/* Stage 3: Dual Licensed Partners (PereJets + PrivateJetFinder) — zero white box on load */}
      <section aria-labelledby="jet-partners-heading" className="mt-10 border-t border-g1-rule pt-8">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-g1mono text-[0.64rem] uppercase tracking-[0.2em] text-g1-accent">
              {ui.partnersHeading}
            </p>
            <p className="mt-1 text-sm text-g1-soft">{ui.partnersSub}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {/* Partner 1: PereJets */}
          <article className="flex flex-col justify-between gap-5 rounded-[22px] border border-white/15 bg-[#0c1b24]/60 p-6 backdrop-blur-xl transition hover:border-white/30">
            <div>
              <p className="font-g1mono text-[0.64rem] uppercase tracking-[0.18em] text-[#d4af37]">
                {ui.perejetsEyebrow}
              </p>
              <h2 className="mt-2 font-g1display text-2xl font-medium text-g1-ink">{PEREJETS.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-g1-soft">{ui.perejetsDesc}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={PEREJETS.href}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-g1-ink px-5 text-sm font-medium text-g1-paper transition hover:opacity-90"
              >
                {ui.perejetsCta}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>

          {/* Partner 2: PrivateJetFinder (clean link + optional on-click live calculator) */}
          <article className="flex flex-col justify-between gap-5 rounded-[22px] border border-white/15 bg-[#0c1b24]/60 p-6 backdrop-blur-xl transition hover:border-white/30">
            <div>
              <p className="font-g1mono text-[0.64rem] uppercase tracking-[0.18em] text-[#d4af37]">
                {ui.pjfEyebrow}
              </p>
              <h2 className="mt-2 font-g1display text-2xl font-medium text-g1-ink">{PRIVATE_JETS.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-g1-soft">{ui.pjfDesc}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={PRIVATE_JETS.href}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-g1-ink px-5 text-sm font-medium text-g1-paper transition hover:opacity-90"
              >
                {ui.pjfCta}
                <span aria-hidden="true">↗</span>
              </a>
              <button
                type="button"
                onClick={() => setShowCalculator((open) => !open)}
                aria-expanded={showCalculator}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 text-sm font-medium text-g1-ink transition hover:border-white/45 hover:bg-white/10"
              >
                {showCalculator ? ui.pjfCalcHide : ui.pjfCalcShow}
                <span aria-hidden="true" className="text-xs">
                  {showCalculator ? '▴' : '▾'}
                </span>
              </button>
            </div>
          </article>
        </div>

        {/* Isolated PrivateJetFinder widget — mounts ONLY when the guest clicks the calculator button */}
        {showCalculator && (
          <div className="mt-5 overflow-hidden rounded-[26px] border border-[#d4af37]/25 bg-[linear-gradient(180deg,rgba(1,33,44,0.88),rgba(1,16,24,0.94))] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <p className="mb-3 px-2 text-xs text-g1-soft">{copy.language}</p>
            <iframe
              title={`${copy.search} · PrivateJetFinder`}
              srcDoc={PRIVATE_JET_WIDGET_DOCUMENT}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              className="block h-[760px] w-full rounded-[18px] border border-white/10 bg-white [color-scheme:light] sm:h-[620px] lg:h-[560px]"
            />
          </div>
        )}
      </section>
    </main>
  );
}
