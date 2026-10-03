"use client";

import { useEffect, useState } from 'react';
import { SEASON, upcomingSeason, daysUntil, formatSeasonRange, seasonStub } from '../../../lib/seasonData';
import { fill, intlLocale, pickLang } from '../../../lib/homeCopy';
import { useAskConcierge, btn } from './shared';
import Icon from './icons';

function statusLabel(days, copy) {
  if (days <= 0) return copy.onNow;
  if (days === 1) return copy.tomorrow;
  return fill(copy.inDays, { n: days });
}

// The season as date-stub tickets. The server renders every event; once the
// page runs in the browser, past events drop off and countdowns appear.
export default function SeasonShelf({ copy, locale }) {
  const ask = useAskConcierge();
  const [today, setToday] = useState(null);
  const intl = intlLocale(locale);

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setToday(now);
  }, []);

  const events = today ? upcomingSeason(today) : SEASON;
  if (!events.length) return <p className="text-[0.82rem] text-g1-soft">{copy.seasonEmpty}</p>;

  return (
    <div className="g1-shelf" tabIndex={0} aria-label={copy.season}>
      {events.map((event) => {
        const stub = seasonStub(event, intl);
        const range = formatSeasonRange(event, intl);
        return (
          <div key={event.id} className="g1-ticket-wrap">
            <article className="g1-ticket g1-season" style={{ '--x': '84px' }} suppressHydrationWarning aria-label={`${event.name}, ${range}`}>
              <div className="g1-date" aria-hidden="true">
                <span className="mo" suppressHydrationWarning>{stub.month}</span>
                <span className="dd tabular-nums text-g1-ink">{stub.day}</span>
                <span className="yr">{stub.year}</span>
              </div>
              <div className="g1-vbody">
                <p className="text-[0.92rem] font-medium text-g1-soft">{event.where}</p>
                <h3 className="font-g1display text-[1.32rem] font-medium leading-[1.12] text-g1-ink [text-wrap:balance]">{event.name}</h3>
                <p className="text-[0.9rem] leading-[1.45] text-g1-soft">{pickLang(event.tip, locale)}</p>
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.8rem] text-g1-soft">
                  <span className="tabular-nums" suppressHydrationWarning>{range}</span>
                  {today && <span className="g1-stamp">{statusLabel(daysUntil(event, today), copy)}</span>}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    className={`${btn.base} ${btn.primary} ${btn.sm}`}
                    onClick={() => ask(fill(copy.seasonAsk, { name: event.name, dates: range }))}
                  >
                    {copy.plan}
                  </button>
                  {event.source && (
                    <a
                      href={event.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[0.82rem] text-g1-soft underline decoration-g1-rule underline-offset-2 hover:text-g1-ink"
                    >
                      {copy.organizer} <Icon name="out" className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}
