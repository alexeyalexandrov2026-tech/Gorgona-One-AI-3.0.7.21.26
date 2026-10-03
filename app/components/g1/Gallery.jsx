"use client";

import { useState } from 'react';
import { fill } from '../../../lib/homeCopy';

// One large photo with a strip of thumbnails that switch it.
export default function Gallery({ images, title, copy }) {
  const [index, setIndex] = useState(0);
  const total = images.length;

  return (
    <div className="grid min-w-0 gap-3">
      <figure className="aspect-[3/2] overflow-hidden rounded-[26px] bg-g1-rule">
        <img
          src={images[index]}
          alt={`${title}, ${fill(copy.photoOf, { n: index + 1, total })}`}
          width="1600"
          height="1067"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      </figure>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]" role="group" aria-label={copy.photos}>
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={fill(copy.showPhoto, { n: i + 1, total })}
              aria-current={i === index}
              className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-transparent opacity-70 transition hover:opacity-100 aria-[current=true]:border-g1-accent aria-[current=true]:opacity-100"
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
