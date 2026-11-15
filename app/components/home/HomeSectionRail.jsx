"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HOME_SECTIONS } from '../../../lib/homeData';
import Icon from '../g1/icons';

export default function HomeSectionRail({ copy }) {
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
    if (!scrollable || paused) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(hover: hover)');
    const timer = window.setInterval(() => {
      if (reducedMotion.matches || document.hidden || Date.now() < holdUntil.current ||
          railRef.current.matches(':focus-within') || (hover.matches && railRef.current.matches(':hover'))) return;

      const rail = railRef.current;
      const { top, bottom } = rail.getBoundingClientRect();
      if (bottom <= 0 || top >= window.innerHeight) return;

      const [first, second] = rail.children;
      const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
      const atEnd = Math.abs(rail.scrollLeft) >= rail.scrollWidth - rail.clientWidth - 1;
      rail.scrollTo({ left: atEnd ? 0 : rail.scrollLeft + step, behavior: 'smooth' });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [paused, scrollable]);

  function holdMotion() {
    holdUntil.current = Date.now() + 6000;
  }

  return (
    <nav aria-label={copy.eyebrow} className="g1-home-sections">
      <div ref={railRef} className="g1-home-sections__track" onPointerDown={holdMotion} onPointerUp={holdMotion} onPointerCancel={holdMotion} onWheel={holdMotion}>
        {HOME_SECTIONS.map(({ id, href, image }) => (
          <Link key={id} href={href} prefetch={false} className="g1-home-section">
            <img src={image} alt="" decoding="async" />
            <span>{copy.worldItems[id][0]} <Icon name="arrow" className="g1-flip h-4 w-4" /></span>
          </Link>
        ))}
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
