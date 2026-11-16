"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HOME_SECTIONS } from '../../../lib/homeData';
import { useLocale } from '../LocaleProvider';
import { getExperienceCopy } from '../../../lib/experienceCopy.mjs';
import { AiSphereArtwork } from '../ai/AiSphere';
import Icon from '../g1/icons';

const RAIL_INTERVAL_MS = 2500;

function sectionLabel(copy, id, exclusive) {
  if (id === 'concierge') return copy.railConcierge;
  if (id === 'exclusive') return exclusive;
  return copy.worldItems[id][0];
}

function Tile({ section, copy, exclusive, hidden = false }) {
  const label = sectionLabel(copy, section.id, exclusive);
  return (
    <Link
      href={section.href}
      prefetch={false}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className={`g1-home-section${section.image ? '' : ' g1-home-section--ai'}`}
    >
      {section.image
        ? <img src={section.image} alt="" decoding="async" />
        : <span className="g1-home-section-orb" aria-hidden="true"><AiSphereArtwork /></span>}
      <span className="g1-home-section__label">{label} <Icon name="arrow" className="g1-flip h-4 w-4" /></span>
    </Link>
  );
}

export default function HomeSectionRail({ copy }) {
  const exclusive = getExperienceCopy(useLocale()).exclusiveTitle;
  const railRef = useRef(null);
  const holdUntil = useRef(0);
  const [scrollable, setScrollable] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    const measure = () => setScrollable(rail.scrollWidth > rail.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!scrollable || paused) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(hover: hover)');
    const timer = window.setInterval(() => {
      const rail = railRef.current;
      if (!rail || reducedMotion.matches || document.hidden || Date.now() < holdUntil.current ||
          rail.matches(':focus-within') || (hover.matches && rail.matches(':hover'))) return;
      const box = rail.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= window.innerHeight) return;
      const [first, second] = rail.children;
      if (!second) return;
      const step = Math.abs(second.offsetLeft - first.offsetLeft);
      if (!step) return;
      const setWidth = step * HOME_SECTIONS.length;
      const rtl = getComputedStyle(rail).direction === 'rtl';
      const progress = rtl && rail.scrollLeft < 0 ? -rail.scrollLeft : rail.scrollLeft;
      if (progress >= setWidth - 1) {
        rail.scrollLeft += rtl && rail.scrollLeft < 0 ? setWidth : -setWidth;
      }
      rail.scrollBy({ left: rtl ? -step : step, behavior: 'smooth' });
    }, RAIL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, scrollable]);

  function holdMotion() {
    holdUntil.current = Date.now() + 6000;
  }

  return (
    <nav aria-label={copy.eyebrow} className="g1-home-sections">
      <div ref={railRef} className="g1-home-sections__track" onPointerDown={holdMotion} onPointerUp={holdMotion} onPointerCancel={holdMotion} onWheel={holdMotion}>
        {HOME_SECTIONS.map((section) => <Tile key={section.id} section={section} copy={copy} exclusive={exclusive} />)}
        {HOME_SECTIONS.map((section) => <Tile key={`${section.id}-loop`} section={section} copy={copy} exclusive={exclusive} hidden />)}
      </div>
      {scrollable && (
        <button type="button" className="g1-tkt-toggle g1-home-sections__pause" aria-label={paused ? copy.tickets.play : copy.tickets.pause} onClick={() => setPaused(!paused)}>
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-4 w-4">
            {paused ? <path d="M5 3v10l8-5Z" /> : <path d="M4 3h3v10H4zm5 0h3v10H9z" />}
          </svg>
        </button>
      )}
    </nav>
  );
}
