"use client";

import { useState } from 'react';
import { COUNTIES, HOME_STOPS, getStop, stopCode } from '../../../lib/a1aLine';
import { fill, pickLang } from '../../../lib/homeCopy';
import { useAskConcierge, btn } from './shared';
import Icon from './icons';

const HOME = HOME_STOPS.map(getStop);

// The coast as one line. Picking a stop opens its pass below the line;
// Sunny Isles is open first because the fleet starts there.
export default function A1ALine({ copy, locale }) {
  const ask = useAskConcierge();
  const [selectedId, setSelectedId] = useState('sunny-isles');
  const stop = getStop(selectedId);
  const county = COUNTIES[stop.county];

  return (
    <div className="grid gap-5">
      <div className="g1-line" role="group" aria-label={copy.line} tabIndex={0}>
        {HOME.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`g1-stop g1-c-${s.county}`}
            aria-pressed={s.id === selectedId}
            aria-controls="a1a-pass"
            onClick={() => setSelectedId(s.id)}
          >
            <span className="dot" aria-hidden="true" />
            <span className="nm">{s.name}</span>
            <span className="cd">{COUNTIES[s.county].code} · {s.air.split(' · ')[0]}</span>
          </button>
        ))}
      </div>

      <section
        id="a1a-pass"
        aria-live="polite"
        className={`g1-pass g1-c-${stop.county} grid gap-4 rounded-[26px] border border-g1-rule bg-g1-card py-6 pe-6 ps-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end`}
      >
        <div className="grid min-w-0 gap-3">
          <p className="flex flex-wrap gap-x-3.5 gap-y-1.5 font-g1mono text-[0.7rem] uppercase tracking-[0.14em] text-g1-soft">
            <span>{stopCode(stop)}</span>
            <span>{county.name}</span>
            {stop.spur && <span>{copy.inland}</span>}
          </p>
          <h3 className="font-g1display text-[clamp(1.9rem,2vw+1.1rem,3rem)] font-medium leading-none text-g1-ink">{stop.name}</h3>
          <p className="max-w-[60ch] text-g1-soft">{pickLang(stop.line, locale)}</p>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t-2 border-dashed border-g1-rule pt-3 text-[0.95rem]">
            <div>
              <dt className="font-g1mono text-[0.64rem] uppercase tracking-[0.12em] text-g1-soft">{copy.airport}</dt>
              <dd className="mt-1 font-medium text-g1-ink">{stop.air}</dd>
            </div>
            {stop.port && (
              <div>
                <dt className="font-g1mono text-[0.64rem] uppercase tracking-[0.12em] text-g1-soft">{copy.cruisePort}</dt>
                <dd className="mt-1 font-medium text-g1-ink">{stop.port}</dd>
              </div>
            )}
          </dl>
        </div>
        <button
          type="button"
          className={`${btn.base} ${btn.primary} justify-self-start`}
          onClick={() => ask(fill(copy.askStopPrompt, { name: stop.name }))}
        >
          <Icon name="pin" className="h-4 w-4" />
          {fill(copy.askStop, { name: stop.name })}
        </button>
      </section>
    </div>
  );
}
