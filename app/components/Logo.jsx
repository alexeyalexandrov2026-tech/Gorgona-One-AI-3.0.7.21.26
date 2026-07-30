'use client';

import { getLogoPath, FALLBACK_LOGO } from '../../lib/logos';

function applyFallback(img) {
  if (!img || img.dataset.logoFallback === 'done') return;
  img.dataset.logoFallback = 'done';
  img.src = FALLBACK_LOGO;
}

// Reusable logo renderer for stores, brands, coupons, sportsbooks, leagues and
// partners. Resolves `slug` to a file via lib/logos, and falls back to the
// existing brand placeholder if the file is missing, so a gap never renders as
// a broken image.
//
// The fallback needs both hooks below. These images are server-rendered, so a
// missing file fires its `error` event before React hydrates and attaches
// onError - that event is lost, which is why missing logos used to show the
// browser's broken-image glyph instead of the placeholder. The ref catches
// that case on mount by inspecting the already-settled image; onError covers
// anything that fails afterwards.
export function Logo({ slug, alt, className, src }) {
  const resolvedSrc = src || getLogoPath(slug);

  return (
    <img
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) applyFallback(img);
      }}
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={(event) => applyFallback(event.currentTarget)}
    />
  );
}
