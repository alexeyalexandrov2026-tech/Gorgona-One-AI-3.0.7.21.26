"use client";
import { LocalizedText, useSavedText } from "../LocalizedText";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HERO_CAR, carThumb } from '../../../lib/homeData';
import { useAskConcierge } from './shared';
import {useConciergeChat} from '../ai/ChatProvider';
import { getPrivateJetsCopy } from '../../../lib/privateJetsCopy.mjs';
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
  // Two different things: tickets on scheduled flights (Ovago) and a whole
  // aircraft on charter (PrivateJetFinder).
  { id: 'flights', href: '/travel/ovago', name: (t) => t.discovery.flights },
  { id: 'jets', href: '/private-jets', name: (t, locale) => getPrivateJetsCopy(locale).nav },
  { id: 'travel', href: '/travel', name: (t) => t.nav.travel }
];

// How fast the rail drifts by itself, in CSS pixels a second: about four
// seconds for one picture to pass.
const RAIL_SPEED = 26;
// How long the rail waits after the guest lets go before it moves again.
const RAIL_REST_MS = 2500;

function SectionRail({ t, locale }) {
  const railRef = useRef(null);

  // The rail drifts sideways by itself, without end: the nine sections are
  // followed by a second copy of themselves, and when the first copy has
  // gone past, the position steps back by exactly its width - the same
  // pictures are under the eye, so nothing is seen to jump.
  //
  // It stays an ordinary scrolling row. A finger, a mouse wheel or the
  // keyboard takes over at once; the drift resumes from wherever the guest
  // left it. Whole pixels go into the scroll position and the fraction into
  // a transform (--g1-rail-nudge), because Safari only scrolls by whole
  // pixels and a slow drift in one-pixel steps looks like a stutter.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = 0;
    let position = 0;
    let moving = false;
    let restUntil = 0;
    let touching = false;
    let hovered = false;
    let focused = false;
    let onScreen = true;

    // The distance from a section to its own copy; 0 when the copies are
    // not laid out (a wide screen shows all nine at once, see the CSS).
    const loopWidth = () => {
      const first = rail.children[0];
      const copy = rail.children[SECTIONS.length];
      return first && copy && copy.offsetParent ? Math.abs(copy.offsetLeft - first.offsetLeft) : 0;
    };
    const settle = () => {
      if (!moving) return;
      moving = false;
      rail.removeAttribute('data-auto');
      rail.style.removeProperty('--g1-rail-nudge');
    };
    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      const elapsed = Math.min(now - last, 100) / 1000;
      last = now;
      const width = loopWidth();
      if (!width || still.matches || touching || hovered || focused || !onScreen || now < restUntil) {
        settle();
        return;
      }
      if (!moving) {
        // Take up from where the guest (or the last run) left the rail.
        moving = true;
        position = Math.abs(rail.scrollLeft) % width;
        rail.setAttribute('data-auto', '');
      }
      position = (position + RAIL_SPEED * elapsed) % width;
      // Read every frame: the page turns right-to-left only once the
      // guest's language has loaded, after this effect has started. There
      // the row scrolls towards negative positions.
      const direction = getComputedStyle(rail).direction === 'rtl' ? -1 : 1;
      const whole = Math.floor(position);
      rail.scrollLeft = direction * whole;
      rail.style.setProperty('--g1-rail-nudge', `${direction * (whole - position)}px`);
    };

    const rest = () => { restUntil = performance.now() + RAIL_REST_MS; };
    const onTouchStart = () => { touching = true; };
    const onTouchEnd = () => { touching = false; rest(); };
    // A flick keeps the row gliding after the finger has left it.
    const onScroll = () => { if (!moving) rest(); };
    const onEnter = (event) => { if (event.pointerType === 'mouse') hovered = true; };
    const onLeave = () => { hovered = false; };
    const onFocusIn = () => { focused = true; };
    const onFocusOut = () => { focused = false; rest(); };

    rail.addEventListener('touchstart', onTouchStart, { passive: true });
    rail.addEventListener('touchend', onTouchEnd, { passive: true });
    rail.addEventListener('touchcancel', onTouchEnd, { passive: true });
    rail.addEventListener('wheel', rest, { passive: true });
    rail.addEventListener('scroll', onScroll, { passive: true });
    rail.addEventListener('pointerenter', onEnter);
    rail.addEventListener('pointerleave', onLeave);
    rail.addEventListener('focusin', onFocusIn);
    rail.addEventListener('focusout', onFocusOut);
    const watcher = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
    watcher.observe(rail);
    frame = requestAnimationFrame((now) => { last = now; tick(now); });

    return () => {
      cancelAnimationFrame(frame);
      watcher.disconnect();
      settle();
      rail.removeEventListener('touchstart', onTouchStart);
      rail.removeEventListener('touchend', onTouchEnd);
      rail.removeEventListener('touchcancel', onTouchEnd);
      rail.removeEventListener('wheel', rest);
      rail.removeEventListener('scroll', onScroll);
      rail.removeEventListener('pointerenter', onEnter);
      rail.removeEventListener('pointerleave', onLeave);
      rail.removeEventListener('focusin', onFocusIn);
      rail.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const card = (section, i, copy) => (
    // The second copy only keeps the drift endless: screen readers and the
    // Tab key meet each section once.
    <li key={`${section.id}${copy ? '-copy' : ''}`} data-copy={copy ? '' : undefined} aria-hidden={copy ? 'true' : undefined}>
      <Link href={section.href} className="g1-rail-card" tabIndex={copy ? -1 : undefined}>
        <img
          src={`/images/home/sections/${section.id}.jpg`}
          alt=""
          width="96"
          height="124"
          loading={!copy && i < 5 ? 'eager' : 'lazy'}
          decoding="async"
        />
        <span>{section.name(t, locale)}</span>
      </Link>
    </li>
  );

  return (
    // On a phone it runs to both edges of the screen, drifts by itself and
    // can be scrolled sideways. On a wide screen all nine share the row and
    // stand still.
    <ul ref={railRef} className="g1-rail -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      {SECTIONS.map((section, i) => card(section, i, false))}
      {SECTIONS.map((section, i) => card(section, i, true))}
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

export default function HomeHero({ copy, t, locale }) {
  const msg = useSavedText();
  const ask = useAskConcierge();
  const {hydrated,isLoading}=useConciergeChat();
  const [query, setQuery] = useState('');

  function submit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    if(ask(query))setQuery('');
  }

  return (
    <section className="pb-[clamp(44px,6vw,90px)] pt-[clamp(18px,3vw,40px)]">
      <SectionRail t={t} locale={locale} />
      <div className="mt-[clamp(26px,4vw,56px)] grid items-center gap-[clamp(30px,5vw,76px)] lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="grid min-w-0 grid-cols-1 gap-[clamp(18px,2.4vw,28px)]">
          <h1 className="g1-display min-w-0 font-g1display text-[clamp(2.2rem,4.4vw+1.1rem,5.4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-g1-ink [overflow-wrap:anywhere] [text-wrap:balance]">
            <LocalizedText source="Save on the everyday. {highlight} on the extraordinary." values={{ highlight: <em className="[word-break:keep-all]">{copy.titleEm}</em> }} />
          </h1>
          {/* data-app-hidden (globals.css): inside the iOS app the lede and the
              sample requests below are left out. Its own
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
              maxLength={4000}
              disabled={!hydrated||isLoading}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="send"
              className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[1.05rem] text-g1-ink outline-none placeholder:text-g1-soft"
            />
            <button type="submit" disabled={!hydrated||isLoading||!query.trim()} className={`${btn.base} ${btn.primary}`}>{copy.searchGo}</button>
          </form>

          <div data-app-hidden="" className="flex flex-wrap gap-2" aria-label={copy.chipsLabel}>
            {copy.chips.map((chip) => (
              <button key={chip} type="button" disabled={!hydrated||isLoading} className={chipClass} onClick={() => ask(chip)}>
                {chip}
              </button>
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
