"use client";

import { useState } from 'react';
import { fill } from '../../../lib/homeCopy';

// One large photo with calm prev/next controls, photo counter, and compact thumbnail strip.
export default function Gallery({ images, thumbnails, originals, originalLabel, initialIndex = 0, title, copy }) {
  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, images.length - 1)));
  const total = images.length;
  const step = (delta) => setIndex((prev) => (prev + delta + total) % total);

  return (
    <div className="grid min-w-0 gap-3">
      <figure className="relative aspect-[3/2] overflow-hidden rounded-[26px] bg-g1-rule">
        <img
          src={images[index]}
          alt={`${title}, ${fill(copy.photoOf, { n: index + 1, total })}`}
          width="1600"
          height="1067"
          fetchPriority="high"
          className={`h-full w-full ${originals ? 'object-contain' : 'object-cover'}`}
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={fill(copy.showPhoto, { n: ((index - 1 + total) % total) + 1, total })}
              className="tap-44 absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-lg text-white backdrop-blur-md transition hover:border-brand-gold hover:bg-black/75"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={fill(copy.showPhoto, { n: ((index + 1) % total) + 1, total })}
              className="tap-44 absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-lg text-white backdrop-blur-md transition hover:border-brand-gold hover:bg-black/75"
            >
              ›
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 font-g1mono text-[0.7rem] text-white backdrop-blur-md">
              {index + 1} / {total}
            </span>
          </>
        )}
      </figure>
      {total > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 [scrollbar-width:thin]" role="group" aria-label={copy.photos}>
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={fill(copy.showPhoto, { n: i + 1, total })}
              aria-current={i === index}
              className="h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg border-2 border-transparent opacity-65 transition hover:opacity-100 aria-[current=true]:border-g1-accent aria-[current=true]:opacity-100"
            >
              <img src={thumbnails?.[i] || src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {originals?.[index] && <a href={originals[index]} target="_blank" rel="noopener noreferrer" className="w-fit text-sm text-g1-accent underline">{originalLabel}</a>}
    </div>
  );
}
