"use client";
import { LocalizedText, useSavedText } from "../LocalizedText";

import { useState } from 'react';
import Link from 'next/link';
import { FLEET, YACHTS, STAYS, HERO_CAR, carThumb } from '../../../lib/homeData';
import { SUPPORTED_LANGUAGES } from '../../../lib/languages';
import { useAskConcierge } from './shared';
import { btn, chipClass } from '../g1/ui';
import Icon from '../g1/icons';

// Every main section of the site, as a rail of pictures across the top of the
// page. On a phone the full menu is otherwise behind the three-line button,
// and sections such as experiences, flights and dining were not on the first
// screen at all. The pictures are cut by scripts/home-section-photos.py.
// tests/content/app-shell.test.mjs checks each one has a page and a picture.
const SECTIONS = [
  { id: 'yachts', href: '/yachts', name: (t) => t.nav.yachts },
  { id: 'villas', href: '/vacation-rentals', name: (t) => t.nav.villas },
  { id: 'cars', href: '/rentals', name: (t) => t.nav.cars },
  { id: 'experiences', href: '/experiences', name: (t) => t.experiences.pill },
  { id: 'events', href: '/events', name: (t) => t.nav.events },
  { id: 'dining', href: '/restaurants-nightlife', name: (t) => t.discovery.restaurants },
  { id: 'flights', href: '/travel/ovago', name: (t) => t.discovery.flights },
  { id: 'travel', href: '/travel', name: (t) => t.nav.travel },
  { id: 'shopping', href: '/stores', name: (t) => t.discovery.shopping }
];

function SectionRail({ t }) {
  return (
    // On a phone it runs to both edges of the screen and scrolls sideways;
    // the cut-off picture at the end is what says there is more. On a wide
    // screen all nine share the row.
    <ul className="g1-rail -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      {SECTIONS.map((section, i) => (
        <li key={section.id}>
          <Link href={section.href} className="g1-rail-card">
            <img
              src={`/images/home/sections/${section.id}.jpg`}
              alt=""
              width="96"
              height="124"
              loading={i < 5 ? 'eager' : 'lazy'}
              decoding="async"
            />
            <span>{section.name(t)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

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

export default function HomeHero({ copy, t }) {
  const msg = useSavedText();
  const ask = useAskConcierge();
  const [query, setQuery] = useState('');
  const stats = [FLEET.length, YACHTS.length + STAYS.length, SUPPORTED_LANGUAGES.length];

  function submit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    ask(query);
    setQuery('');
  }

  return (
    <section className="pb-[clamp(44px,6vw,90px)] pt-[clamp(18px,3vw,40px)]">
      <SectionRail t={t} />
      <div className="mt-[clamp(26px,4vw,56px)] grid items-center gap-[clamp(30px,5vw,76px)] lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="grid min-w-0 grid-cols-1 gap-[clamp(18px,2.4vw,28px)]">
          <h1 className="g1-display min-w-0 font-g1display text-[clamp(2.2rem,4.4vw+1.1rem,5.4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-g1-ink [overflow-wrap:anywhere] [text-wrap:balance]">
            <LocalizedText source="Save on the everyday. {highlight} on the extraordinary." values={{ highlight: <em className="[word-break:keep-all]">{copy.titleEm}</em> }} />
          </h1>
          {/* data-app-hidden (globals.css): inside the iOS app the lede, the
              sample requests and the figures below are left out. Its own
              Concierge and Search tabs already say and do the same, and the
              first screen is calmer with the menu, the headline and the search. */}
          <p data-app-hidden="" className="max-w-[58ch] text-[clamp(1.06rem,0.35vw+1rem,1.22rem)] text-g1-soft [text-wrap:pretty]">
            {copy.lede}
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

          <div data-app-hidden="" className="flex flex-wrap gap-2" aria-label={copy.chipsLabel}>
            {copy.chips.map((chip) => (
              <button key={chip} type="button" className={chipClass} onClick={() => ask(chip)}>
                {chip}
              </button>
            ))}
          </div>

          <div data-app-hidden="" className="grid grid-cols-2 gap-x-[22px] gap-y-3.5 border-t border-g1-rule pt-2 sm:grid-cols-3">
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
              alt={msg("Lifeguard tower on Miami Beach")}
              width="1600"
              height="2400"
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          </figure>
          <div className="g1-ticket-wrap g1-hero-tag absolute end-[2%] top-[5%] z-[1] origin-top-right scale-[0.86] sm:end-[3%] sm:scale-100">
            <ValetTag copy={copy} />
          </div>
        </div>
      </div>
    </section>
  );
}
