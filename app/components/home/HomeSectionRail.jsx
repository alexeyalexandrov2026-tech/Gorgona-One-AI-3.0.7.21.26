"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HOME_SECTIONS } from '../../../lib/homeSections.mjs';
import { useLocale } from '../LocaleProvider';
import { getExperienceCopy } from '../../../lib/experienceCopy.mjs';
import { AiSphereArtwork } from '../ai/AiSphere';
import Icon from '../g1/icons';

const RAIL_SPEED_PX_PER_S = 25;

function sectionLabel(copy, id, exclusive) {
  if (id === 'concierge') return copy.railConcierge;
  if (id === 'exclusive') return exclusive;
  return copy.worldItems[id][0];
}

// Also shown on /experiences, so the Exclusive Destinations tile looks the same there.
export function HomeSectionTile({ section, copy, exclusive, hidden = false, className = '' }) {
  const label = sectionLabel(copy, section.id, exclusive);
  return (
    <Link
      href={section.href}
      prefetch={false}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className={`g1-home-section${section.image ? '' : ' g1-home-section--ai'}${className ? ' ' + className : ''}`}
    >
      {section.image
        ? <img src={section.image} alt="" aria-hidden="true" decoding="async" />
        : <span className="g1-home-section-orb" aria-hidden="true"><AiSphereArtwork /></span>}
      <span className="g1-home-section__label">{label} <Icon name="arrow" className="g1-flip h-4 w-4" /></span>
    </Link>
  );
}

export default function HomeSectionRail({ copy }) {
  const locale = useLocale();
  const exclusive = getExperienceCopy(locale).exclusiveTitle;
  const railRef = useRef(null);
  const holdUntil = useRef(0);
  const metricsRef = useRef({ setWidth: 0, isRtl: false, inView: true, hovered: false, focused: false });
  const [scrollable, setScrollable] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const measure = () => {
      const [first, second] = rail.children;
      metricsRef.current.setWidth = second ? Math.abs(second.offsetLeft - first.offsetLeft) * HOME_SECTIONS.length : 0;
      metricsRef.current.isRtl = window.getComputedStyle(rail).direction === 'rtl';
      setScrollable(rail.scrollWidth > rail.clientWidth + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    let io = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(([entry]) => {
        if (entry) metricsRef.current.inView = entry.isIntersecting;
      });
      io.observe(rail);
    }
    measure();
    return () => {
      observer.disconnect();
      io?.disconnect();
    };
  }, [locale]);

  // A slow, continuous drift. Layout geometry (setWidth, RTL direction, and
  // viewport visibility) is cached outside rAF so tick() never triggers a
  // forced synchronous layout reflow.
  useEffect(() => {
    if (!scrollable || paused) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(hover: hover)');
    let frame = 0;
    let last = 0;
    let pos = null;
    const tick = (now) => {
      frame = window.requestAnimationFrame(tick);
      const dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      const rail = railRef.current;
      const m = metricsRef.current;
      if (!rail || !m.inView || !m.setWidth || reducedMotion.matches || document.hidden || Date.now() < holdUntil.current ||
          m.focused || (hover.matches && m.hovered)) { pos = null; return; }
      const currentScroll = rail.scrollLeft;
      const sign = m.isRtl && currentScroll <= 0 ? -1 : 1;
      const actual = currentScroll * sign;
      if (pos === null || Math.abs(actual - pos) > 2) pos = actual;
      pos += RAIL_SPEED_PX_PER_S * dt;
      if (pos >= m.setWidth) pos -= m.setWidth;
      rail.scrollLeft = pos * sign;
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [paused, scrollable]);

  function holdMotion() {
    holdUntil.current = Date.now() + 6000;
  }

  return (
    <nav aria-label={copy.eyebrow} className="g1-home-sections">
      <div
        ref={railRef}
        className="g1-home-sections__track"
        onPointerEnter={() => { metricsRef.current.hovered = true; }}
        onPointerLeave={() => { metricsRef.current.hovered = false; }}
        onFocusCapture={() => { metricsRef.current.focused = true; }}
        onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) metricsRef.current.focused = false; }}
        onPointerDown={holdMotion}
        onPointerUp={holdMotion}
        onPointerCancel={holdMotion}
        onWheel={holdMotion}
      >
        {HOME_SECTIONS.map((section) => <HomeSectionTile key={section.id} section={section} copy={copy} exclusive={exclusive} />)}
        {HOME_SECTIONS.map((section) => <HomeSectionTile key={`${section.id}-loop`} section={section} copy={copy} exclusive={exclusive} hidden />)}
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
