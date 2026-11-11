"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HOME_TICKETS } from '../../../lib/homeTickets';
import { fill } from '../../../lib/homeCopy';
import { savedSource } from '../../../lib/savedCopy';
import { btn } from '../g1/ui';
import Icon from '../g1/icons';

const pad = (value) => String(value).padStart(2, '0');
const GROUP_TAG = { sports: 'Sports', concerts: 'Concerts' };

// Event tickets that take turns, one Events subcategory each. The track is a
// plain scroll-snap row, so without JavaScript the first ticket shows and a
// swipe moves on. With JavaScript, the bar under the active ticket fills in
// six seconds (the CSS animation is the timer) and the next ticket slides in.
// Hover, focus, a touch, a hidden tab, being off screen or the pause button
// stop the bar (keyboard focus only: a mouse click on a bar should not stop
// the show); reduced motion turns the turning off altogether.
export default function TicketCarousel({ copy, locale }) {
  const text = copy.tickets;
  const total = HOME_TICKETS.length;
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const targetRef = useRef(null);
  const touchTimer = useRef(null);
  const [active, setActive] = useState(0);
  const [motion, setMotion] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [touched, setTouched] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [stopped, setStopped] = useState(false);

  const running = motion && !stopped && !hover && !focus && !touched && !hidden && onScreen;

  const geometry = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length < 2) return null;
    const [first, second] = track.children;
    const stride = Math.abs(second.getBoundingClientRect().left - first.getBoundingClientRect().left);
    return { track, stride, rtl: getComputedStyle(track).direction === 'rtl' };
  }, []);

  const go = useCallback((index) => {
    const g = geometry();
    if (!g || !g.stride) return;
    const next = (index + total) % total;
    targetRef.current = next;
    setActive(next);
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    g.track.scrollTo({ left: (g.rtl ? -1 : 1) * next * g.stride, behavior: smooth ? 'smooth' : 'auto' });
  }, [geometry, total]);

  // Reduced motion: no turning at all, and the setting can change live.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotion(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // A background tab and a block scrolled out of view both hold the bar.
  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === 'hidden');
    sync();
    document.addEventListener('visibilitychange', sync);
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      observer.disconnect();
      clearTimeout(touchTimer.current);
    };
  }, []);

  // Follow the track when someone swipes or scrolls it by hand. While a
  // programmatic scroll is on its way, the tickets it passes are ignored.
  const onScroll = useCallback(() => {
    const g = geometry();
    if (!g || !g.stride) return;
    const index = Math.min(total - 1, Math.round(Math.abs(g.track.scrollLeft) / g.stride));
    if (targetRef.current !== null) {
      if (index !== targetRef.current) return;
      targetRef.current = null;
    }
    setActive(index);
  }, [geometry, total]);

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const rtl = geometry()?.rtl;
    const forward = (event.key === 'ArrowRight') !== Boolean(rtl);
    event.preventDefault();
    go(active + (forward ? 1 : -1));
  };

  // A touch holds the bar while the finger is down and a little after.
  const onTouchStart = () => {
    targetRef.current = null;
    clearTimeout(touchTimer.current);
    setTouched(true);
  };
  const onTouchEnd = () => {
    clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => setTouched(false), 5000);
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={text.label}
      className="g1-tkt"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(event) => setFocus(event.target.matches(':focus-visible'))}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false); }}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onWheel={() => { targetRef.current = null; }}
    >
      <div ref={trackRef} className="g1-tkt-track" onScroll={onScroll}>
        {HOME_TICKETS.map((ticket, index) => (
          <div
            key={ticket.id}
            role="group"
            aria-label={fill(text.show, { n: index + 1, total })}
            className="g1-ticket-wrap g1-tkt-slide"
          >
            <article className="g1-ticket g1-tkt-card">
              <div className="g1-tkt-photo">
                <img
                  src={ticket.image}
                  alt=""
                  width="1600"
                  height="1000"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
              <div className="g1-tkt-stub">
                <p className="flex items-center justify-between gap-3">
                  <span className="g1-cat">{savedSource(locale, GROUP_TAG[ticket.group])}</span>
                  <span className="g1-tkt-no" aria-hidden="true">{pad(index + 1)} / {pad(total)}</span>
                </p>
                <h3 className="font-g1display text-[clamp(1.6rem,1.4vw+1.1rem,2.3rem)] font-medium leading-[1.06] tracking-[-0.01em] text-g1-ink [text-wrap:balance]">
                  {savedSource(locale, ticket.label)}
                </h3>
                <p className="text-[1rem] leading-[1.5] text-g1-soft [text-wrap:pretty]">{text.lines[ticket.id]}</p>
                <div className="mt-auto pt-3">
                  <Link href={ticket.href} className={`g1-tkt-cta ${btn.base} ${btn.primary}`}>
                    {text.get} <Icon name="arrow" className="g1-flip h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          </div>
        ))}
      </div>

      <div className="g1-tkt-controls">
        <div className="g1-tkt-bars">
          {HOME_TICKETS.map((ticket, index) => (
            <button
              key={ticket.id}
              type="button"
              className="g1-tkt-bar"
              aria-label={fill(text.show, { n: index + 1, total })}
              aria-current={index === active ? 'true' : undefined}
              data-done={index < active ? '' : undefined}
              onClick={() => go(index)}
            >
              <span
                // A new key restarts the six seconds whenever the ticket changes.
                key={index === active ? `on-${active}` : 'off'}
                className="g1-tkt-fill"
                data-run={index === active && motion ? '' : undefined}
                style={{ animationPlayState: running ? 'running' : 'paused' }}
                onAnimationEnd={index === active ? () => go(active + 1) : undefined}
              />
            </button>
          ))}
        </div>
        {motion && (
          <button
            type="button"
            className="g1-tkt-toggle"
            aria-label={stopped ? text.play : text.pause}
            onClick={() => setStopped((value) => !value)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
              {stopped ? <path d="M8 5.5v13l10.5-6.5L8 5.5Z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
