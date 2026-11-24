"use client";

import { useEffect, useRef, useState } from 'react';
import { useSavedText } from '../LocalizedText';
import { useLocale } from '../LocaleProvider';
import { useAskConcierge } from './shared';
import { useConciergeChat } from '../ai/ChatProvider';
import { useVoice } from '../ai/useVoice';
import { voiceInputUnavailable } from '../../../lib/ai/voiceInputCopy.mjs';
import { pickFreshHomeChips } from '../../../lib/homePromptPool.mjs';
import { AiSphereArtwork } from '../ai/AiSphere';
import HomeSectionRail from './HomeSectionRail';
import HeroShowcase from './HeroShowcase';
import { useAutoDriftRail } from './useAutoDriftRail';
import Icon from '../g1/icons';

const ICONS = {
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  yacht: 'M3 17h18l-2.5 4h-13zM12 3v12M12 4l6 10h-6M11 7l-5 7h5',
  villa: 'M3 11l9-7 9 7M5 9.5V21h14V9.5M10 21v-6h4v6',
  car: 'M5 16l1.6-5.2A2 2 0 0 1 8.5 9.4h7a2 2 0 0 1 1.9 1.4L19 16M3.5 16h17v3h-17zM7 19v2M17 19v2',
  jet: 'M21 4 3 11l7 2.5L12.5 21 21 4zM10 13.5l5-4.5',
  dine: 'M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.2 1.6-3 4.5-3 7.5 0 1.4.9 2.5 3 2.5',
  ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM15 7v10',
  peak: 'M2.5 20 9 9l4 6 3-4 5.5 9z',
  mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3'
};

function LineIcon({ name, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomeHero({ copy, showcase = [] }) {
  const msg = useSavedText();
  const locale = useLocale();
  const ask = useAskConcierge();
  const { hydrated, isLoading } = useConciergeChat();
  const voice = useVoice();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const [showcaseHold, setShowcaseHold] = useState(true);
  const [horizon, setHorizon] = useState(false);
  const [clock, setClock] = useState('');
  const [suggChips, setSuggChips] = useState(() => (copy.chips || []).slice(0, 4));
  const [suggSwapping, setSuggSwapping] = useState(false);
  const suggInteractingRef = useRef(false);
  const introRef = useRef(null);
  const glassRef = useRef(null);
  const prompts = copy.prompts || [];
  const busy = !hydrated || isLoading;
  const showGhost = !query && !focused && !reduceMotion && prompts.length > 0;

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 600px)');
    const apply = () => {
      setReduceMotion(motion.matches);
      setCompactViewport(compact.matches);
    };
    apply();
    motion.addEventListener('change', apply);
    compact.addEventListener('change', apply);
    return () => {
      motion.removeEventListener('change', apply);
      compact.removeEventListener('change', apply);
    };
  }, []);

  // Generate fresh, varied Miami suggestions on every visit and gently rotate
  // them over time (8 rolling chips on mobile, 4 crisp single-row chips on desktop).
  useEffect(() => {
    const targetCount = compactViewport ? 8 : 4;
    setSuggChips(pickFreshHomeChips(locale, targetCount));

    const refreshMs = compactViewport ? 28000 : 14000;
    let swapTimer = 0;
    const interval = window.setInterval(() => {
      if (document.hidden || suggInteractingRef.current || reduceMotion) return;
      if (compactViewport) {
        setSuggChips((prev) => pickFreshHomeChips(locale, targetCount, { exclude: prev.slice(0, 4) }));
        return;
      }
      setSuggSwapping(true);
      swapTimer = window.setTimeout(() => {
        setSuggChips((prev) => pickFreshHomeChips(locale, targetCount, { exclude: prev }));
        setSuggSwapping(false);
      }, 240);
    }, refreshMs);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(swapTimer);
    };
  }, [locale, compactViewport, reduceMotion]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try { seen = sessionStorage.getItem('elio-horizon') === '1'; } catch { /* keep the concierge usable */ }
    if (reduce || seen) {
      const timer = window.setTimeout(() => setShowcaseHold(false), 280);
      return () => window.clearTimeout(timer);
    }
    try { sessionStorage.setItem('elio-horizon', '1'); } catch { /* play anyway; the tab may block storage */ }
    setHorizon(true);
    const done = window.setTimeout(() => {
      setHorizon(false);
      setShowcaseHold(false);
    }, 1800);
    return () => window.clearTimeout(done);
  }, []);

  useEffect(() => {
    if (!horizon) return undefined;
    const measure = () => {
      const intro = introRef.current;
      const glass = glassRef.current;
      const stack = intro?.querySelector('.g1-horizon-stack');
      if (!intro || !glass || !stack) return;
      const brand = stack.getBoundingClientRect();
      const box = glass.getBoundingClientRect();
      const center = brand.top + brand.height / 2;
      intro.style.setProperty('--gy', `${box.top - center}px`);
      intro.style.setProperty('--bh', `${brand.height}px`);
      intro.style.setProperty('--sx', (box.width / Math.max(brand.width, 1)).toFixed(3));
    };
    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [horizon]);

  useEffect(() => {
    if (!showGhost) return undefined;
    const text = prompts[promptIndex] || '';
    if (typed < text.length) {
      const timer = window.setTimeout(() => setTyped((count) => count + 1), 42);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setTyped(0);
      setPromptIndex((index) => (index + 1) % prompts.length);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [showGhost, prompts, promptIndex, typed]);

  useEffect(() => {
    const format = () => new Intl.DateTimeFormat(locale || 'en', {
      hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York'
    }).format(new Date());
    const apply = () => setClock(format());
    apply();
    const timer = window.setInterval(apply, 30000);
    return () => window.clearInterval(timer);
  }, [locale]);

  function submit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    if (ask(query)) setQuery('');
  }

  function speak() {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    voice.startListening(
      (text) => {
        setQuery(text);
      },
      (interim) => {
        setQuery(interim);
      }
    );
  }

  const suggRail = useAutoDriftRail({
    speedPxPerSec: 26,
    enabled: true,
    depsKey: `${locale}:${compactViewport ? 'm' : 'd'}:${suggChips.join('|')}`
  });

  const picksRail = useAutoDriftRail({
    speedPxPerSec: 22,
    enabled: true,
    depsKey: `${locale}:picks`
  });

  const picks = [
    ['yachts', 'yacht', copy.worldItems.yachts[0], copy.chips[0]],
    ['villas', 'villa', copy.picks.villas, copy.chips[3]],
    ['cars', 'car', copy.worldItems.cars[0], copy.chips[1]],
    ['jets', 'jet', copy.picks.jets, copy.picksAsk.jets],
    ['dining', 'dine', copy.picks.dining, copy.chips[4]],
    ['events', 'ticket', copy.worldItems.events[0], copy.chips[2]],
    ['adventures', 'peak', copy.picks.adventures, copy.picksAsk.adventures]
  ];

  return (
    <section className="pb-[clamp(32px,5vw,76px)] pt-[clamp(16px,3vw,36px)]">
      <HomeSectionRail copy={copy} />
      <div className="g1-home-app-hero">
        {/* The Android WebView exposes this heading when the web hero is hidden. */}
        <div role="heading" aria-level={1}>
          <a href="miamielio://concierge" className="g1-home-concierge-link">
            <span className="g1-home-concierge-orb" aria-hidden="true"><AiSphereArtwork /></span>
            <span>{msg('ELIO+ Guide')}</span>
            <span className="g1-home-concierge-action">{copy.open} <Icon name="arrow" className="g1-flip h-4 w-4" /></span>
          </a>
        </div>
      </div>
      <div className={`g1-home-web-hero g1-stage${horizon ? ' is-horizon' : ''}`}>
        <img
          className="g1-stage__bg"
          src="/images/home/hero-tower.webp"
          alt=""
          aria-hidden="true"
          width="1400"
          height="2100"
          fetchPriority="high"
        />
        <h1 className="sr-only">{copy.titleA}{copy.titleEm}{copy.titleB}</h1>
        <p className="sr-only">{copy.lede}</p>
        <div className="g1-horizon" ref={introRef} aria-hidden="true">
          <div className="g1-horizon-stack">
            <div className="g1-horizon-clip">
              <div className="g1-horizon-brand">Elio</div>
            </div>
          </div>
        </div>
        <HeroShowcase items={showcase} copy={copy} hold={showcaseHold} />
        <div className="g1-hero-dock">
          <div
            ref={suggRail.railRef}
            className={`g1-hero-sugg${suggRail.looping ? ' is-looping' : ''}${suggSwapping ? ' is-swapping' : ''}`}
            aria-label={copy.chipsLabel}
            {...suggRail.railHandlers}
            onPointerEnter={(event) => {
              suggInteractingRef.current = true;
              suggRail.railHandlers.onPointerEnter(event);
            }}
            onPointerLeave={(event) => {
              suggInteractingRef.current = false;
              suggRail.railHandlers.onPointerLeave(event);
            }}
            onFocusCapture={(event) => {
              suggInteractingRef.current = true;
              suggRail.railHandlers.onFocusCapture(event);
            }}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) suggInteractingRef.current = false;
              suggRail.railHandlers.onBlurCapture(event);
            }}
          >
            <div ref={suggRail.primaryRef} className="g1-rail-set">
              {suggChips.map((chip, index) => (
                <button key={chip} type="button" disabled={busy} style={{ '--k': index }} onClick={() => ask(chip)}>
                  <LineIcon name="spark" className="h-3.5 w-3.5" />
                  {chip}
                </button>
              ))}
            </div>
            {suggRail.looping && (
              <div ref={suggRail.cloneRef} className="g1-rail-set" aria-hidden="true">
                {suggChips.map((chip, index) => (
                  <button key={`${chip}-loop`} type="button" tabIndex={-1} disabled={busy} style={{ '--k': index }} onClick={() => ask(chip)}>
                    <LineIcon name="spark" className="h-3.5 w-3.5" />
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form id="g1-hero-glass" ref={glassRef} role="search" onSubmit={submit} className="g1-hero-glass">
            <div className="g1-hero-head">
              <span className="g1-hero-orb" aria-hidden="true"><AiSphereArtwork /></span>
              <span>{msg('ELIO+ Guide')}</span>
              <span className="g1-hero-live"><i />{copy.live}</span>
            </div>
            <div className="g1-hero-grow">
              <div className="g1-hero-field">
                {showGhost && (
                  <span className="g1-hero-ph" aria-hidden="true">
                    {(prompts[promptIndex] || '').slice(0, typed)}
                    <i />
                  </span>
                )}
                <label htmlFor="g1-hero-q" className="sr-only">{copy.searchLabel}</label>
                <input
                  id="g1-hero-q"
                  maxLength={4000}
                  disabled={busy}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={showGhost ? '' : (prompts[0] || copy.searchPlaceholder)}
                  autoComplete="off"
                  enterKeyHint="send"
                  className={showGhost ? 'is-ghost' : undefined}
                />
              </div>
              {voice.recognitionSupported && (
                <button
                  type="button"
                  className={`g1-hero-mic${voice.isListening ? ' is-on' : ''}`}
                  aria-pressed={voice.isListening}
                  aria-label={voice.isListening ? copy.micStop : copy.mic}
                  onClick={speak}
                >
                  <LineIcon name="mic" className="h-5 w-5" />
                </button>
              )}
              <button type="submit" disabled={busy || !query.trim()} className="g1-hero-ask">
                {copy.searchGo} <Icon name="arrow" className="g1-flip h-4 w-4" />
              </button>
            </div>
            <div
              ref={picksRail.railRef}
              className={`g1-hero-picks${picksRail.looping ? ' is-looping' : ''}`}
              {...picksRail.railHandlers}
            >
              <div ref={picksRail.primaryRef} className="g1-rail-set">
                {picks.map(([id, icon, label, prompt]) => (
                  <button key={id} type="button" disabled={busy} onClick={() => ask(prompt)}>
                    <LineIcon name={icon} />
                    {label}
                  </button>
                ))}
              </div>
              {picksRail.looping && (
                <div ref={picksRail.cloneRef} className="g1-rail-set" aria-hidden="true">
                  {picks.map(([id, icon, label, prompt]) => (
                    <button key={`${id}-loop`} type="button" tabIndex={-1} disabled={busy} onClick={() => ask(prompt)}>
                      <LineIcon name={icon} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {voice.error && <p role="alert" className="g1-hero-voice">{voiceInputUnavailable(locale)}</p>}
          </form>
        </div>
        <p className="g1-hero-wx"><span className="g1-hero-wx__dot" aria-hidden="true" />{copy.beach}{clock ? ` · ${clock}` : ''}</p>
      </div>
    </section>
  );
}
