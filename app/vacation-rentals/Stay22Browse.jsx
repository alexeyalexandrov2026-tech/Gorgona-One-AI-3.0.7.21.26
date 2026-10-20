'use client';

import { useState } from 'react';

// Only this page mounts a Stay22 iframe. Do not load Let Me Allez globally:
// that could rewrite existing direct-CJ partner links elsewhere.
const MAP_URL = 'https://www.stay22.com/embed/6ad7137bf9e9fcb545c96a7f';
const LIST_URL = 'https://www.stay22.com/embed/gm?aid=gorgonaone&address=Miami%2C+FL%2C+USA&viewmode=listview&showhotels=false&rentalsapi=vrbo&campaign=gorgona_miami_rentals_list';

export default function Stay22Browse({ labels }) {
  const [view, setView] = useState('list');
  const isList = view === 'list';

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.85rem] text-g1-soft">{labels.location}</p>
        <div role="group" aria-label={labels.modeLabel} className="inline-flex gap-1 rounded-full border border-g1-rule bg-g1-card p-1">
          <button
            type="button"
            aria-pressed={isList}
            onClick={() => setView('list')}
            className={`min-h-[42px] rounded-full px-5 text-[0.9rem] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g1-accent ${isList ? 'bg-g1-ink text-g1-paper' : 'text-g1-ink hover:bg-g1-rule'}`}
          >
            {labels.listTab}
          </button>
          <button
            type="button"
            aria-pressed={!isList}
            onClick={() => setView('map')}
            className={`min-h-[42px] rounded-full px-5 text-[0.9rem] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g1-accent ${!isList ? 'bg-g1-ink text-g1-paper' : 'text-g1-ink hover:bg-g1-rule'}`}
          >
            {labels.mapTab}
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-[26px] border border-g1-rule bg-g1-card">
        <iframe
          key={view}
          id="stay22-widget"
          title={isList ? labels.listTitle : labels.mapTitle}
          src={isList ? LIST_URL : MAP_URL}
          width="100%"
          height={isList ? 740 : 560}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className={`block w-full border-0 ${isList ? 'h-[700px] sm:h-[740px]' : 'h-[500px] sm:h-[560px]'}`}
        />
      </div>
      <p className="max-w-[75ch] text-[0.8rem] leading-relaxed text-g1-soft">
        {labels.scopeNotice}
      </p>
    </div>
  );
}
