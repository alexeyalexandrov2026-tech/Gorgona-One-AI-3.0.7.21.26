"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { SHOWCASE_INTERVAL_MS } from '../../lib/heroShowcase';
import { getTranslation } from '../../lib/i18nClient';

// The first screen of a listing page: one large photo per section, turning on
// its own, so a visitor sees the range before scrolling. Each slide jumps to
// its card further down the same page.
export default function ExperienceShowcase({ slides, titles, locale, cta, label }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef(null);
  const count = slides.length;
  const t = getTranslation(locale).events;
  const go = useCallback((step) => setIndex((i) => (i + step + count) % count), [count]);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(motion.matches);
    apply();
    motion.addEventListener('change', apply);
    return () => motion.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (paused || reduced || count < 2) return undefined;
    const id = setInterval(() => { if (!document.hidden) go(1); }, SHOWCASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, reduced, count, go]);

  if (!count) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className="relative mt-2 h-[clamp(200px,28vw,300px)] overflow-hidden rounded-3xl border border-g1-rule"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => { touchX.current = event.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(event) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const delta = event.changedTouches[0].clientX - start;
        if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
      }}
    >
      {slides.map((slide, i) => {
        const active = i === index;
        const title = locale === 'ru' && slide.item.titleRu ? slide.item.titleRu : slide.item.title;
        return (
          <a
            key={slide.item.id}
            href={'#experience-' + slide.item.id}
            aria-hidden={!active}
            tabIndex={active ? 0 : -1}
            className={`absolute inset-0 block transition-opacity duration-700 motion-reduce:transition-none ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <img
              src={slide.image}
              alt={slide.item.imageAlt || slide.item.title}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              decoding="async"
              width="960"
              height="720"
              className="h-full w-full object-cover"
            />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent rtl:bg-gradient-to-l" />
            <span className="absolute bottom-7 start-6 end-24 flex max-w-xl flex-col items-start text-white sm:start-8">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-g1-accent">{titles[slide.section]}</span>
              <span className="mt-2 font-g1display text-[clamp(1.6rem,3.6vw,2.6rem)] leading-[1.05]">{title}</span>
              {slide.item.location && <span className="mt-1 text-sm text-white/85">{slide.item.location}</span>}
              <span className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">{cta}</span>
            </span>
          </a>
        );
      })}
      {count > 1 && (
        <>
          <div className="absolute end-4 top-4 z-10 flex gap-2">
            <button type="button" onClick={() => go(-1)} aria-label={t.previous} className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/50 text-white hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-g1-accent"><span aria-hidden="true" className="rtl:rotate-180">‹</span></button>
            <button type="button" onClick={() => go(1)} aria-label={t.next} className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/50 text-white hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-g1-accent"><span aria-hidden="true" className="rtl:rotate-180">›</span></button>
          </div>
          <div className="absolute bottom-6 end-5 z-10 flex gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.item.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={titles[slide.section]}
                aria-current={i === index}
                className={`h-2.5 w-2.5 rounded-full transition ${i === index ? 'bg-g1-accent' : 'bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
