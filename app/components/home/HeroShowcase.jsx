"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../LocaleProvider';
import { savedListing } from '../../../lib/savedCopy';
import { fill } from '../../../lib/homeCopy';
import { SHOWCASE_INTERVAL_MS, nextShowcaseStep } from '../../../lib/heroShowcase';
import Icon from '../g1/icons';

function addRow(rows, label, value, aside) {
  if (!value || value === aside) return;
  rows.push([label, value]);
}

function present(item, copy, locale) {
  const s = copy.showcase;
  const title = item.cat === 'jet'
    ? copy.worldItems.privateJets[0]
    : item.cat === 'event'
      ? (copy.tickets.lines[item.lineId] || item.kicker || item.title)
      : savedListing(locale, item, 'title');
  const eyebrow = { car: s.car, yacht: s.yacht, stay: s.stay, jet: s.jet, event: s.tickets }[item.cat];
  const aside = item.cat === 'car' ? (item.company || s.fleet)
    : item.cat === 'yacht' ? (item.length || item.company)
      : item.cat === 'stay' ? (item.bedrooms ? fill(s.bedrooms, { n: item.bedrooms }) : '')
        : item.cat === 'jet' ? s.anyRoute
          : (item.kicker || '');
  const cta = item.cat === 'car'
    ? (item.price ? (/\bday\b/i.test(item.price) ? item.price : fill(s.perDay, { price: item.price })) : copy.ratesOnRequest)
    : item.cat === 'yacht' ? s.charter
      : item.cat === 'stay' ? s.nightly
        : item.cat === 'jet' ? s.flights
          : copy.tickets.get;
  const details = [];
  if (item.cat === 'car') {
    addRow(details, s.class, item.category, aside);
    addRow(details, s.where, item.location, aside);
  } else if (item.cat === 'yacht') {
    addRow(details, s.length, item.length, aside);
    addRow(details, s.marina, item.location, aside);
  } else if (item.cat === 'stay') {
    addRow(details, s.area, item.location, aside);
  } else if (item.cat === 'jet') {
    addRow(details, copy.valet.from, s.opf, aside);
    addRow(details, s.partner, s.jetPartner, aside);
  } else {
    addRow(details, s.where, s.miami, aside);
    addRow(details, s.calendar, s.live, aside);
  }
  return { title, eyebrow, aside, cta, details };
}

export default function HeroShowcase({ items = [], copy, hold = false }) {
  const locale = useLocale();
  const [step, setStep] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stateRef = useRef(null);
  const pausedRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(motion.matches);
    apply();
    motion.addEventListener('change', apply);
    return () => motion.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (hold || !items.length || startedRef.current) return undefined;
    startedRef.current = true;
    const narrow = window.matchMedia('(max-width: 1100px)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const first = still
      ? { item: items[0], corner: 'tr', enter: 'rise', exit: 'outFade', rot: '4deg', state: { lastCat: items[0].cat, lastCorner: 'tr', lastEnter: 'rise', used: new Set([items[0].href]) } }
      : nextShowcaseStep(items, { lastCat: '', lastCorner: '', lastEnter: '', used: new Set() }, Math.random, narrow);
    if (!first) return undefined;
    stateRef.current = first.state;
    setStep(first);
    return undefined;
  }, [hold, items]);

  useEffect(() => {
    if (hold || reduced || !step || leaving) return undefined;
    let stopped = false;
    let timer = 0;
    const tick = () => {
      if (stopped) return;
      if (pausedRef.current || document.hidden) {
        timer = window.setTimeout(tick, 300);
        return;
      }
      setLeaving(true);
    };
    timer = window.setTimeout(tick, SHOWCASE_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [hold, reduced, step, leaving]);

  function setPaused(next) {
    pausedRef.current = next;
  }

  function onAnimationEnd(event) {
    if (event.target !== event.currentTarget || !leaving || !stateRef.current) return;
    const narrow = window.matchMedia('(max-width: 1100px)').matches;
    const next = nextShowcaseStep(items, stateRef.current, Math.random, narrow);
    if (!next) return;
    stateRef.current = next.state;
    setLeaving(false);
    setStep(next);
  }

  if (hold || !step || !copy) return null;
  const view = present(step.item, copy, locale);
  return (
    <Link
      key={`${step.item.href}-${step.corner}-${step.enter}`}
      href={step.item.href}
      prefetch={false}
      className={`g1-sc g1-sc--${step.corner}${leaving ? ' is-out' : ' is-in'}${reduced ? ' is-still' : ''}`}
      style={{ '--rot': step.rot, '--enter': `g1-sc-${step.enter}`, '--exit': `g1-sc-${step.exit}`, '--dur': `${SHOWCASE_INTERVAL_MS}ms` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onAnimationEnd={onAnimationEnd}
    >
      <img src={step.item.image} alt="" width="720" height="480" />
      <span className="g1-sc__eb">{view.eyebrow} {view.aside ? <b>{view.aside}</b> : null}</span>
      <span className="g1-sc__title">{view.title}</span>
      {view.details.length > 0 && (
        <dl>
          {view.details.map(([label, value]) => (
            <span key={label} className="contents">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </span>
          ))}
        </dl>
      )}
      <span className="g1-sc__cta">{view.cta} <Icon name="arrow" className="g1-flip h-3.5 w-3.5" /></span>
      <span className="g1-sc__bar" aria-hidden="true"><i /></span>
    </Link>
  );
}
