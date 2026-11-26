"use client";

import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';
import { useLocale } from '../components/LocaleProvider';
import { useSavedText } from '../components/LocalizedText';
import { useAiDock } from '../components/ai/AiDockProvider';
import LiveTripRoom from '../components/dashboard/LiveTripRoom';
import MyMiami from '../components/MyMiami';
import PaymentTrustStrip from '../components/PaymentTrustStrip';
import { getTripRoomCopy } from '../../lib/tripRoomCopy.mjs';

export default function TripRoomPage() {
  const auth = useAuth();
  const locale = useLocale();
  const msg = useSavedText();
  const { open: openAiDock } = useAiDock();
  const copy = getTripRoomCopy(locale);

  if (auth?.loading) {
    return (
      <main className="flex-1 theme-villa full-bleed bg-villa-parchment p-10 text-villa-obsidian" role="status">
        {msg('Loading...')}
      </main>
    );
  }

  if (!auth?.session) {
    return (
      <main className="flex-1 theme-villa full-bleed bg-villa-parchment pb-20 pt-16 text-villa-obsidian">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 border-t border-villa-obsidian/20 pt-8">
            <p className="font-fira text-[0.66rem] font-medium uppercase tracking-[0.22em] text-villa-ash">
              {copy.signInEyebrow}
            </p>
            <h1 className="font-display text-4xl font-medium leading-[1.02] text-villa-charcoal sm:text-6xl">
              {copy.signInTitle}
            </h1>
            <p className="max-w-[58ch] text-base leading-relaxed text-villa-graphite">
              {copy.signInBody}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href="/login?next=/trip"
                className="inline-flex min-h-[44px] items-center rounded-full border border-g1-ink bg-g1-ink px-6 text-xs font-semibold uppercase tracking-[0.16em] text-g1-paper transition hover:opacity-90"
              >
                {copy.signInCta}
              </Link>
              <button
                type="button"
                onClick={openAiDock}
                className="inline-flex min-h-[44px] items-center rounded-full border border-villa-obsidian/35 bg-white/[0.06] px-5 text-xs font-medium uppercase tracking-[0.16em] text-villa-obsidian transition hover:border-villa-obsidian"
              >
                {copy.askElio}
              </button>
              <Link
                href="/rentals"
                className="inline-flex min-h-[44px] items-center rounded-full border border-villa-obsidian/25 px-5 text-xs font-medium uppercase tracking-[0.16em] text-villa-obsidian transition hover:border-villa-obsidian"
              >
                {copy.browseCars}
              </Link>
              <Link
                href="/yachts"
                className="inline-flex min-h-[44px] items-center rounded-full border border-villa-obsidian/25 px-5 text-xs font-medium uppercase tracking-[0.16em] text-villa-obsidian transition hover:border-villa-obsidian"
              >
                {copy.browseYachts}
              </Link>
            </div>

            {/* Guest preview of what unlocks inside Live Trip Room (zero extra auth barrier to understand value). */}
            <div data-trip-room-preview="true" className="mt-4 grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-villa-obsidian/15 bg-white/[0.05] p-5">
                <p className="font-fira text-[0.62rem] uppercase tracking-[0.18em] text-villa-ash">01 · {copy.statusOpen}</p>
                <h2 className="mt-2 font-display text-xl text-villa-charcoal">{copy.quotesHeading}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-villa-graphite">{copy.quotesSub}</p>
              </article>
              <article className="rounded-2xl border border-villa-obsidian/15 bg-white/[0.05] p-5">
                <p className="font-fira text-[0.62rem] uppercase tracking-[0.18em] text-villa-ash">02 · {copy.statPlans}</p>
                <h2 className="mt-2 font-display text-xl text-villa-charcoal">{copy.plansHeading}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-villa-graphite">{copy.plansSub}</p>
              </article>
              <article className="rounded-2xl border border-villa-obsidian/15 bg-white/[0.05] p-5">
                <p className="font-fira text-[0.62rem] uppercase tracking-[0.18em] text-villa-ash">03 · {copy.statusPaid}</p>
                <h2 className="mt-2 font-display text-xl text-villa-charcoal">{copy.shieldActiveTitle}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-villa-graphite">{copy.shieldActiveBody}</p>
              </article>
            </div>

            <PaymentTrustStrip variant="booking" locale={locale} className="mt-2 max-w-2xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 theme-villa full-bleed bg-villa-parchment pb-20 pt-14 text-villa-obsidian">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-villa-obsidian/20 pb-4 font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
          <span>{copy.eyebrow}</span>
          <span>{auth.session.name} ({auth.session.email})</span>
        </div>
        <h1 className="mt-8 font-display text-4xl font-medium leading-[0.98] text-villa-charcoal sm:text-6xl">
          {copy.title}
        </h1>
        <LiveTripRoom key={auth.session.id} userId={auth.session.id} standalone />
        <MyMiami />
      </div>
    </main>
  );
}
