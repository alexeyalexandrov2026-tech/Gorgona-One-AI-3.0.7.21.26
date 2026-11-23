"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useLocale } from '../LocaleProvider';
import { useSavedText } from '../LocalizedText';
import { useAiDock } from '../ai/AiDockProvider';
import { getTripRoomCopy } from '../../../lib/tripRoomCopy.mjs';
import { formatUsdCents } from '../../../lib/legal/termsContent.mjs';

const hairlineBtn =
  'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-white/30 bg-white/[0.04] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[#f4f1ea] transition hover:border-white hover:bg-white/10 disabled:opacity-50';
const solidBtn =
  'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-g1-ink bg-g1-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-g1-paper transition hover:opacity-90 disabled:opacity-50';

function quoteStatusInfo(status, copy) {
  switch (status) {
    case 'paid':
      return { label: copy.statusPaid, cta: copy.ctaOpenPass, tone: 'bg-g1-ink text-g1-paper border-g1-ink' };
    case 'signed':
      return { label: copy.statusSigned, cta: copy.ctaCompletePay, tone: 'bg-white/15 text-[#f4f1ea] border-white/40' };
    case 'expired':
      return { label: copy.statusExpired, cta: null, tone: 'bg-transparent text-villa-ash border-white/20' };
    case 'cancelled':
      return { label: copy.statusCancelled, cta: null, tone: 'bg-transparent text-villa-ash border-white/20' };
    default:
      return { label: copy.statusOpen, cta: copy.ctaSignAndPay, tone: 'bg-white/15 text-[#f4f1ea] border-white/40' };
  }
}

function shortDay(isoDate, locale) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale || 'en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

export default function LiveTripRoom({ userId, standalone = false }) {
  const locale = useLocale();
  const msg = useSavedText();
  const copy = getTripRoomCopy(locale);
  const { open: openAiDock } = useAiDock();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || sessionData?.session?.user?.id !== userId) {
        setError(true);
        return;
      }
      const res = await fetch('/api/dashboard/trip-room', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userId) return null;

  const statusLabels = {
    pending: msg('Pending'),
    reviewing: msg('In review'),
    responded: msg('Response sent'),
    closed: msg('Closed')
  };

  return (
    <section
      id="trip-room"
      aria-labelledby="live-trip-room-heading"
      data-live-trip-room
      className="my-10 grid gap-7 border-t border-villa-obsidian/20 pt-8"
    >
      {/* Editorial header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <p className="font-fira text-[0.66rem] font-medium uppercase tracking-[0.22em] text-villa-ash">
            {copy.eyebrow}
          </p>
          <h2 id="live-trip-room-heading" className="font-display text-3xl text-villa-charcoal sm:text-4xl">
            {copy.title}
          </h2>
          <p className="max-w-[62ch] text-sm leading-relaxed text-villa-graphite">{copy.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={openAiDock} className={solidBtn}>
            {copy.askElio}
          </button>
          {data?.chatContacts?.telegram && (
            <a href={data.chatContacts.telegram} target="_blank" rel="noopener noreferrer" className={hairlineBtn}>
              {copy.chatTelegram}
            </a>
          )}
          {data?.chatContacts?.whatsapp && (
            <a href={data.chatContacts.whatsapp} target="_blank" rel="noopener noreferrer" className={hairlineBtn}>
              {copy.chatWhatsApp}
            </a>
          )}
          {!standalone ? (
            <Link href="/trip" className={hairlineBtn}>
              {copy.openFullRoom}
            </Link>
          ) : (
            <Link href="/profile" className={hairlineBtn}>
              {copy.backToProfile}
            </Link>
          )}
          <button type="button" onClick={load} disabled={loading} className={hairlineBtn}>
            {copy.refresh}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <p role="status" className="py-6 text-sm text-villa-graphite">{copy.loading}</p>
      ) : error || !data ? (
        <p role="alert" className="py-6 text-sm text-villa-graphite">{copy.error}</p>
      ) : (
        <>
          {/* Summary metrics strip */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="grid gap-1 rounded-xl border border-white/15 bg-white/[0.06] p-4">
              <dt className="font-fira text-[0.62rem] uppercase tracking-[0.18em] text-villa-ash">{copy.statActive}</dt>
              <dd className="font-display text-3xl text-villa-charcoal">{data.summary.activeRequests}</dd>
            </div>
            <div className="grid gap-1 rounded-xl border border-white/15 bg-white/[0.06] p-4">
              <dt className="font-fira text-[0.62rem] uppercase tracking-[0.18em] text-villa-ash">{copy.statAction}</dt>
              <dd className="font-display text-3xl text-villa-charcoal">{data.summary.awaitingAction}</dd>
            </div>
            <div className="grid gap-1 rounded-xl border border-white/15 bg-white/[0.06] p-4">
              <dt className="font-fira text-[0.62rem] uppercase tracking-[0.18em] text-villa-ash">{copy.statConfirmed}</dt>
              <dd className="font-display text-3xl text-villa-charcoal">{data.summary.confirmedPasses}</dd>
            </div>
            <div className="grid gap-1 rounded-xl border border-white/15 bg-white/[0.06] p-4">
              <dt className="font-fira text-[0.62rem] uppercase tracking-[0.18em] text-villa-ash">{copy.statPlans}</dt>
              <dd className="font-display text-3xl text-villa-charcoal">{data.summary.totalPlans}</dd>
            </div>
          </dl>

          {/* Unlocked 24/7 Direct Line — rendered EXCLUSIVELY when at least one paid pass exists */}
          {data.confirmedSupport?.active && (
            <div
              data-confirmed-support-unlocked
              className="grid gap-3 rounded-2xl border border-white/30 bg-white/[0.10] p-5 sm:flex sm:items-center sm:justify-between"
            >
              <div className="grid gap-1">
                <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.2em] text-villa-obsidian">
                  {copy.shieldActiveEyebrow}
                </p>
                <h3 className="font-display text-2xl text-villa-charcoal">{copy.shieldActiveTitle}</h3>
                <p className="max-w-[60ch] text-sm text-villa-graphite">
                  {data.confirmedSupport.phoneHref ? copy.shieldActiveBody : copy.directLinePending}
                </p>
                {data.confirmedSupport.phoneDisplay && (
                  <p className="mt-1 font-fira text-base font-medium text-villa-obsidian">
                    {data.confirmedSupport.phoneDisplay}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {data.confirmedSupport.phoneHref && (
                  <a href={data.confirmedSupport.phoneHref} className={solidBtn}>
                    {copy.directLineCta}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Verified Quotes & Confirmed Passes */}
          <div className="grid gap-4 border-t border-villa-obsidian/15 pt-6">
            <div className="grid gap-1">
              <h3 className="font-display text-2xl text-villa-charcoal">{copy.quotesHeading}</h3>
              <p className="text-sm text-villa-graphite">{copy.quotesSub}</p>
            </div>
            {data.quotes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/20 bg-white/[0.04] p-5 text-sm text-villa-graphite">
                {copy.quotesEmpty}
              </p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {data.quotes.map((quote) => {
                  const meta = quoteStatusInfo(quote.status, copy);
                  return (
                    <li
                      key={quote.id}
                      className="grid content-between gap-4 rounded-xl border border-white/15 bg-white/[0.06] p-5"
                    >
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-fira text-[0.68rem] uppercase tracking-[0.16em] text-villa-ash">
                            {quote.referenceCode}
                          </span>
                          <span className={`border px-2.5 py-0.5 font-fira text-[0.62rem] uppercase tracking-[0.14em] ${meta.tone}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <h4 className="font-display text-xl text-villa-charcoal [overflow-wrap:anywhere]">
                            {quote.itemTitle}
                          </h4>
                          <span className="shrink-0 font-display text-xl font-medium text-villa-obsidian">
                            {formatUsdCents(quote.amountCents)}
                          </span>
                        </div>
                        <p className="text-xs text-villa-graphite">
                          {copy.supplierLabel}: {quote.supplierName}
                        </p>
                        <p className="text-xs text-villa-ash">
                          {copy.datesLabel}: {quote.serviceDates}
                        </p>
                      </div>
                      {meta.cta && (
                        <div>
                          <Link
                            href={`/pay/${quote.publicToken}`}
                            className={quote.status === 'paid' ? hairlineBtn : solidBtn}
                          >
                            {meta.cta}
                          </Link>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Live Itinerary & Multi-Stop Plans */}
          <div className="grid gap-4 border-t border-villa-obsidian/15 pt-6">
            <div className="grid gap-1">
              <h3 className="font-display text-2xl text-villa-charcoal">{copy.plansHeading}</h3>
              <p className="text-sm text-villa-graphite">{copy.plansSub}</p>
            </div>
            {data.plans.length > 0 ? (
              <div className="grid gap-4">
                {data.plans.map((plan) => (
                  <article key={plan.id} className="grid gap-3 rounded-xl border border-white/15 bg-white/[0.06] p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-villa-obsidian/15 pb-3">
                      <p className="font-display text-xl text-villa-charcoal">
                        {plan.startDate} — {plan.endDate}
                      </p>
                      <span className="font-fira text-[0.68rem] uppercase tracking-[0.16em] text-villa-ash">
                        {plan.guests} {copy.guestsLabel}
                      </span>
                    </div>
                    {plan.note && (
                      <p className="whitespace-pre-wrap text-sm text-villa-graphite [overflow-wrap:anywhere]">
                        {plan.note}
                      </p>
                    )}
                    <ol className="grid gap-2.5">
                      {plan.items.map((item, idx) => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="flex min-w-0 items-baseline gap-2.5">
                            <span className="font-fira text-[0.66rem] text-villa-ash">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            {item.href ? (
                              <Link href={item.href} className="font-medium text-villa-obsidian underline decoration-villa-obsidian/25 underline-offset-4 hover:decoration-villa-obsidian">
                                {item.itemTitle}
                              </Link>
                            ) : (
                              <span className="font-medium text-villa-obsidian">{item.itemTitle}</span>
                            )}
                          </div>
                          <span className="font-fira text-[0.64rem] uppercase tracking-[0.14em] text-villa-ash">
                            {statusLabels[item.status] || item.status}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 rounded-xl border border-white/15 bg-white/[0.05] p-5">
                <div className="grid gap-1">
                  <p className="font-medium text-villa-obsidian">{copy.plansEmptyTitle}</p>
                  <p className="max-w-[60ch] text-sm text-villa-graphite">{copy.plansEmptyBody}</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Link href="/yachts" className={hairlineBtn}>{copy.browseYachts}</Link>
                  <Link href="/rentals" className={hairlineBtn}>{copy.browseCars}</Link>
                  <Link href="/restaurants-nightlife" className={hairlineBtn}>{copy.browseDining}</Link>
                  <Link href="/experiences" className={hairlineBtn}>{copy.browseExperiences}</Link>
                </div>
              </div>
            )}
          </div>

          {/* Live NOAA Miami 5-Day Conditions */}
          {Array.isArray(data.weather) && data.weather.length > 0 && (
            <div className="grid gap-4 border-t border-villa-obsidian/15 pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-2xl text-villa-charcoal">{copy.weatherHeading}</h3>
                <span className="font-fira text-[0.64rem] uppercase tracking-[0.16em] text-villa-ash">
                  {copy.weatherSource}
                </span>
              </div>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {data.weather.map((day) => (
                  <li key={day.date} className="grid gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] p-4 text-sm">
                    <p className="font-fira text-[0.66rem] uppercase tracking-[0.14em] text-villa-ash">
                      {shortDay(day.date, locale)}
                    </p>
                    <p className="font-display text-2xl text-villa-charcoal">
                      {`${day.tempF}°F · ${day.tempC}°C`}
                    </p>
                    <p className="text-xs text-villa-graphite">{day.shortForecast}</p>
                    <p className="font-fira text-[0.64rem] text-villa-ash">
                      {day.rainChance !== null ? `${copy.rainChance}: ${day.rainChance}%` : ''}
                      {day.rainChance !== null && day.wind ? ' · ' : ''}
                      {day.wind ? `${copy.windLabel}: ${day.wind}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}
