"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../components/LocaleProvider';
import { getTravelHubCopy } from '../../lib/travelHubCopy.mjs';
import AskButton from '../components/g1/AskButton';

const OVAGO_LINKS = Object.freeze({
  business: 'https://www.kqzyfj.com/click-101825540-15832128',
  best: 'https://www.tkqlhce.com/click-101825540-15820959',
  lastMinute: 'https://www.dpbolvw.net/click-101825540-15821121'
});

const HOTEL_DISTRICTS = Object.freeze([
  { label: 'South Beach', address: 'South Beach, Miami Beach, FL' },
  { label: 'Brickell', address: 'Brickell, Miami, FL' },
  { label: 'Sunny Isles', address: 'Sunny Isles Beach, FL' },
  { label: 'Bal Harbour', address: 'Bal Harbour, FL' },
  { label: 'Coral Gables', address: 'Coral Gables, FL' }
]);

function stay22HotelUrl(address) {
  const params = new URLSearchParams({
    aid: 'gorgonaone',
    campaign: 'miamielio_travel_hotels',
    address
  });
  return `https://www.stay22.com/allez/roam?${params.toString()}`;
}

function ArrowIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function TravelHubClient() {
  const locale = useLocale();
  const copy = getTravelHubCopy(locale);
  const [activeTab, setActiveTab] = useState('all'); // all | flights | hotels | villas

  const tabs = [
    ['all', copy.tabAll],
    ['flights', copy.tabFlights],
    ['hotels', copy.tabHotels],
    ['villas', copy.tabVillas]
  ];

  const showFlights = activeTab === 'all' || activeTab === 'flights';
  const showHotels = activeTab === 'all' || activeTab === 'hotels';
  const showVillas = activeTab === 'all' || activeTab === 'villas';

  return (
    <main className="flex-1 theme-travel">
      {/* Editorial Hero — bespoke twilight penthouse terrace overlooking Miami Beach */}
      <section className="lux-hero full-bleed -mt-[60px] flex min-h-[72svh] items-end bg-[#011c26] sm:min-h-[78svh]">
        <div className="lux-hero__bg">
          <img
            src="/images/travel/hero-miami-dusk.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="lux-kenburns h-[112%] w-full object-cover opacity-90"
          />
        </div>
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(180deg,rgba(1,24,34,0.55)_0%,rgba(1,24,34,0.22)_38%,rgba(1,19,27,0.68)_74%,rgba(1,14,20,0.96)_100%)]" />
        <div className="absolute inset-0 z-[-1] bg-[linear-gradient(82deg,rgba(1,18,26,0.82)_0%,rgba(1,18,26,0.44)_44%,rgba(1,18,26,0)_74%)]" />
        <div className="lux-grain" />
        <div className="lux-hero__grain" />

        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
          <p className="lux-eyebrow">{copy.eyebrow}</p>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl italic leading-[0.96] text-white sm:text-6xl lg:text-7xl">
            {copy.titleLine1}{' '}
            <br />
            <span className="text-[#f0d37a]">{copy.titleHighlight}</span>
          </h1>
          <p className="lux-lede mt-6 max-w-2xl text-base text-[#e7edf0]/90 sm:text-lg">
            {copy.lede}
          </p>

          {/* Direct pillar pills + ELIO planner CTA */}
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <a href="#travel-flights" onClick={() => setActiveTab('flights')} className="lux-btn">
              {copy.tabFlights}
              <ArrowIcon className="h-4 w-4" />
            </a>
            <a href="#travel-hotels" onClick={() => setActiveTab('hotels')} className="lux-btn-ghost">
              {copy.tabHotels}
            </a>
            <a href="#travel-villas" onClick={() => setActiveTab('villas')} className="lux-btn-ghost">
              {copy.tabVillas}
            </a>
            <AskButton
              variant="ghost"
              prompt={copy.askElioPrompt}
              className="rounded-full border border-[#d4af37]/45 bg-[#d4af37]/12 px-5 py-3 text-sm font-semibold text-[#f0d37a] transition hover:bg-[#d4af37] hover:text-black"
            >
              {copy.askElio}
            </AskButton>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <section className="py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/12 pb-6">
          <div role="tablist" aria-label={copy.eyebrow} className="flex flex-wrap gap-2">
            {tabs.map(([id, label]) => {
              const selected = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-travel-tab={id}
                  onClick={() => setActiveTab(id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    selected
                      ? 'border-[#d4af37] bg-[#d4af37] text-[#05080b]'
                      : 'border-white/15 bg-white/[0.04] text-zinc-200 hover:border-[#d4af37]/50 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-400">{copy.partnerNote}</p>
        </div>

        <div className="mt-10 grid gap-8">
          {/* PILLAR 1: FLIGHTS & PRIVATE AVIATION */}
          {showFlights && (
            <article
              id="travel-flights"
              className="grid overflow-hidden rounded-[28px] border border-[#d4af37]/25 bg-[linear-gradient(145deg,rgba(2,31,42,0.88),rgba(1,16,23,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.45)] lg:grid-cols-[1.08fr_1fr]"
            >
              <div className="relative min-h-[260px] overflow-hidden sm:min-h-[340px]">
                <img
                  src="/images/travel/flights-first-class.webp"
                  alt={copy.flightsTitle}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#01141c]/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#01161f]/65" />
              </div>
              <div className="flex flex-col justify-between gap-6 p-7 sm:p-10">
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[#f0d37a]">
                    {copy.flightsTag}
                  </p>
                  <h2 className="mt-3 font-serif text-3xl italic text-white sm:text-4xl">
                    {copy.flightsTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200/85 sm:text-base">
                    {copy.flightsCopy}
                  </p>

                  {/* Direct Ovago fare links */}
                  <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
                    <a
                      href={OVAGO_LINKS.business}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      className="group flex items-center justify-between rounded-2xl border border-[#d4af37]/35 bg-[#d4af37]/10 px-4 py-3 text-xs font-semibold text-[#f5de92] transition hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black"
                    >
                      <span>{copy.ovagoBusiness}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                    <a
                      href={OVAGO_LINKS.best}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      className="group flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-zinc-100 transition hover:border-[#d4af37]/60 hover:text-[#f0d37a]"
                    >
                      <span>{copy.ovagoBest}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                    <a
                      href={OVAGO_LINKS.lastMinute}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      className="group flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-zinc-100 transition hover:border-[#d4af37]/60 hover:text-[#f0d37a]"
                    >
                      <span>{copy.ovagoLastMin}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                  <Link href="/travel/ovago" className="lux-btn text-sm">
                    {copy.ovagoAll}
                    <ArrowIcon className="h-4 w-4" />
                  </Link>
                  <Link href="/private-jets" className="lux-btn-ghost text-sm">
                    {copy.privateJets}
                  </Link>
                  <AskButton
                    variant="ghost"
                    prompt={copy.askFlightsPrompt}
                    className="rounded-full border border-white/15 px-4 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-[#d4af37] hover:text-[#f0d37a]"
                  >
                    {copy.askFlights}
                  </AskButton>
                </div>
              </div>
            </article>
          )}

          {/* PILLAR 2: 5-STAR HOTELS & RESORTS */}
          {showHotels && (
            <article
              id="travel-hotels"
              className="grid overflow-hidden rounded-[28px] border border-[#d4af37]/25 bg-[linear-gradient(145deg,rgba(2,31,42,0.88),rgba(1,16,23,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.45)] lg:grid-cols-[1fr_1.08fr]"
            >
              <div className="order-2 flex flex-col justify-between gap-6 p-7 sm:p-10 lg:order-1">
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[#f0d37a]">
                    {copy.hotelsTag}
                  </p>
                  <h2 className="mt-3 font-serif text-3xl italic text-white sm:text-4xl">
                    {copy.hotelsTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200/85 sm:text-base">
                    {copy.hotelsCopy}
                  </p>

                  {/* Curated Miami hotel districts via Stay22 */}
                  <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-teal-200/75">
                    {copy.hotelsByDistrict}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {HOTEL_DISTRICTS.map((d) => (
                      <a
                        key={d.label}
                        href={stay22HotelUrl(d.address)}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-100 transition hover:border-[#d4af37] hover:bg-[#d4af37]/15 hover:text-[#f0d37a]"
                      >
                        <span>{d.label}</span>
                        <span aria-hidden="true" className="text-[10px] opacity-70">↗</span>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                  <Link href="/vacation-rentals" className="lux-btn text-sm">
                    {copy.hotelsAllCta}
                    <ArrowIcon className="h-4 w-4" />
                  </Link>
                  <AskButton
                    variant="ghost"
                    prompt={copy.askHotelsPrompt}
                    className="rounded-full border border-white/15 px-4 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-[#d4af37] hover:text-[#f0d37a]"
                  >
                    {copy.askHotels}
                  </AskButton>
                </div>
              </div>
              <div className="relative order-1 min-h-[260px] overflow-hidden sm:min-h-[340px] lg:order-2">
                <img
                  src="/images/travel/hotels-ocean-resort.webp"
                  alt={copy.hotelsTitle}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#01141c]/80 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:to-[#01161f]/65" />
              </div>
            </article>
          )}

          {/* PILLAR 3: PRIVATE VILLAS & WATERFRONT RESIDENCES */}
          {showVillas && (
            <article
              id="travel-villas"
              className="grid overflow-hidden rounded-[28px] border border-[#d4af37]/25 bg-[linear-gradient(145deg,rgba(2,31,42,0.88),rgba(1,16,23,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.45)] lg:grid-cols-[1.08fr_1fr]"
            >
              <div className="relative min-h-[260px] overflow-hidden sm:min-h-[340px]">
                <img
                  src="/images/travel/villas-penthouse-terrace.webp"
                  alt={copy.villasTitle}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#01141c]/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#01161f]/65" />
              </div>
              <div className="flex flex-col justify-between gap-6 p-7 sm:p-10">
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[#f0d37a]">
                    {copy.villasTag}
                  </p>
                  <h2 className="mt-3 font-serif text-3xl italic text-white sm:text-4xl">
                    {copy.villasTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200/85 sm:text-base">
                    {copy.villasCopy}
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-200">
                    <li className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5">{copy.villasFeature1}</li>
                    <li className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5">{copy.villasFeature2}</li>
                    <li className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5">{copy.villasFeature3}</li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                  <Link href="/vacation-rentals" className="lux-btn text-sm">
                    {copy.villasAllCta}
                    <ArrowIcon className="h-4 w-4" />
                  </Link>
                  <AskButton
                    variant="ghost"
                    prompt={copy.askVillasPrompt}
                    className="rounded-full border border-white/15 px-4 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-[#d4af37] hover:text-[#f0d37a]"
                  >
                    {copy.askVillas}
                  </AskButton>
                </div>
              </div>
            </article>
          )}
        </div>
      </section>

      {/* Clean companion worlds bar */}
      <section className="border-t border-white/10 py-12">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[#f0d37a]">
          {copy.moreHeading}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['/exclusive-destinations', copy.linkExclusive],
            ['/restaurants-nightlife', copy.linkDining],
            ['/yachts', copy.linkYachts],
            ['/rentals', copy.linkCars]
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 text-sm font-medium text-white transition hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 hover:text-[#f0d37a]"
            >
              <span>{label}</span>
              <ArrowIcon className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-1 group-hover:text-[#f0d37a]" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
