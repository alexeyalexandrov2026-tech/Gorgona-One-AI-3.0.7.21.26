"use client";

import { useState } from 'react';
import { BRAND_COUNT, FLEET, YACHTS, STAYS, HERO_DEAL, HERO_CAR, carThumb } from '../../../lib/homeData';
import { SUPPORTED_LANGUAGES } from '../../../lib/languages';
import { fill } from '../../../lib/homeCopy';
import { useAskConcierge } from './shared';
import { btn, chipClass } from '../g1/ui';
import Voucher from './Voucher';
import Icon from '../g1/icons';

// Valet tag for a car from our own fleet, hanging off the hero photo.
function ValetTag({ copy }) {
  return (
    <div className="g1-valet" aria-label={HERO_CAR.title}>
      <img src={carThumb(HERO_CAR)} alt="" width="720" height="480" />
      <span className="font-g1mono text-[0.7rem] font-medium tracking-[0.08em] text-g1-soft">{copy.valet.no} 0417</span>
      <span className="font-g1display text-[1.18rem] font-medium leading-[1.1] text-g1-ink">{HERO_CAR.title}</span>
      <dl>
        <dt>{copy.valet.from}</dt>
        <dd className="text-g1-ink">{copy.valet.fromValue}</dd>
        <dt>{copy.valet.to}</dt>
        <dd className="text-g1-ink">{copy.valet.toValue}</dd>
      </dl>
      <span className="ready">{copy.valet.ready}</span>
    </div>
  );
}

export default function HomeHero({ copy, categories, endsLabel }) {
  const ask = useAskConcierge();
  const [query, setQuery] = useState('');
  const stats = [BRAND_COUNT, FLEET.length, YACHTS.length + STAYS.length, SUPPORTED_LANGUAGES.length];

  function submit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    ask(query);
    setQuery('');
  }

  return (
    <section className="pb-[clamp(44px,6vw,90px)] pt-[clamp(28px,5vw,70px)]">
      <div className="grid items-center gap-[clamp(30px,5vw,76px)] lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="grid min-w-0 gap-[clamp(18px,2.4vw,28px)]">
          <p className="font-g1sans text-[0.74rem] font-medium uppercase leading-[1.3] tracking-[0.2em] text-g1-soft">{copy.eyebrow}</p>
          <h1 className="g1-display font-g1display text-[clamp(2.1rem,4.6vw+1rem,5.8rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [overflow-wrap:break-word] [text-wrap:balance]">
            {copy.titleA}<em>{copy.titleEm}</em>{copy.titleB}
          </h1>
          <p className="max-w-[58ch] text-[clamp(1.06rem,0.35vw+1rem,1.22rem)] text-g1-soft [text-wrap:pretty]">
            {fill(copy.lede, { n: BRAND_COUNT })}
          </p>

          <form
            role="search"
            onSubmit={submit}
            className="flex max-w-[640px] items-center gap-2 rounded-full border border-g1-rule bg-g1-card py-1.5 pe-1.5 ps-[18px] shadow-[0_1px_2px_var(--g1-drop),0_14px_34px_-18px_var(--g1-drop)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-g1-accent"
          >
            <Icon name="search" className="h-5 w-5 text-g1-soft" />
            <label htmlFor="g1-hero-q" className="sr-only">{copy.searchLabel}</label>
            <input
              id="g1-hero-q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="send"
              className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[1.05rem] text-g1-ink outline-none placeholder:text-g1-soft"
            />
            <button type="submit" className={`${btn.base} ${btn.primary}`}>{copy.searchGo}</button>
          </form>

          <div className="flex flex-wrap gap-2" aria-label={copy.chipsLabel}>
            {copy.chips.map((chip) => (
              <button key={chip} type="button" className={chipClass} onClick={() => ask(chip)}>
                {chip}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-[22px] gap-y-3.5 border-t border-g1-rule pt-2 sm:grid-cols-4">
            {stats.map((value, i) => (
              <div key={copy.stats[i]} className="grid content-start gap-1 pt-3">
                <b className="font-g1sans text-[2.3rem] font-light leading-none tracking-[-0.02em] tabular-nums text-g1-ink">{value}</b>
                <span className="text-[0.8rem] leading-[1.35] text-g1-soft">{copy.stats[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[400px] w-full sm:min-h-[440px] lg:aspect-[4/5] lg:min-h-0 lg:max-w-[520px] lg:justify-self-end">
          <figure className="absolute inset-y-0 end-0 start-[18%] overflow-hidden rounded-[26px] bg-g1-rule lg:start-[14%]">
            <img
              src="/images/home/hero-tower.jpg"
              alt="Lifeguard tower on Miami Beach"
              width="1600"
              height="2400"
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          </figure>
          <div className="g1-ticket-wrap g1-hero-tag absolute end-[2%] top-[5%] z-[1] origin-top-right scale-[0.86] sm:end-[3%] sm:scale-100">
            <ValetTag copy={copy} />
          </div>
          <div className="g1-hero-voucher absolute bottom-[7%] start-0 z-[2] w-[min(92%,380px)]">
            <Voucher deal={HERO_DEAL} copy={copy} categories={categories} endsLabel={endsLabel(HERO_DEAL)} />
          </div>
        </div>
      </div>
    </section>
  );
}
