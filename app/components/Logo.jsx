'use client';

import { getLogoPath, FALLBACK_LOGO } from '../../lib/logos';

// Reusable logo renderer for stores, brands, coupons, sportsbooks, and
// partners. Resolves `slug` to a file in public/logos via lib/logos, and
// falls back to the existing brand placeholder if the file is missing or
// fails to load, so a missing logo never breaks page rendering.
export function Logo({ slug, alt, className, src }) {
  const resolvedSrc = src || getLogoPath(slug);

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={(event) => {
        if (event.currentTarget.src.endsWith(FALLBACK_LOGO)) {
          return;
        }
        event.currentTarget.src = FALLBACK_LOGO;
        event.currentTarget.onerror = null;
      }}
    />
  );
}
