"use client";

import { useFavorites } from './FavoritesProvider';
import { useSavedText } from './LocalizedText';
import Icon from './g1/icons';
import { favouriteRef } from '../../lib/myMiami.mjs';

// The heart that puts a yacht, villa, car or restaurant into "My Miami"
// (the profile page). The list is kept by FavoritesProvider: on this device
// before signing in, in the account after, and the same list in the iOS app.
//   overlay - on a card's picture;
//   compact - a round button beside a title (plan cards, the My Miami list);
//   default - a small button under a page's heading.
// Nothing is drawn for pages that cannot be a favourite, or before the list
// has been read (so the heart never flips from empty to full on load).
export default function SaveButton({ href, kind, title, subtitle, image, overlay = false, compact = false, className = '' }) {
  const msg = useSavedText();
  const favorites = useFavorites();
  const ref = favouriteRef(href, kind);
  const name = typeof title === 'string' ? title.trim() : '';
  if (!ref || !name || !favorites.ready) return null;
  const saved = favorites.has(ref.kind, ref.slug);
  const label = saved ? msg('Remove from My Miami') : msg('Save to My Miami');
  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    favorites.set({ ...ref, title: name, subtitle, image }, !saved);
  };
  const common = { type: 'button', onClick: toggle, 'aria-pressed': saved, 'data-save': `${ref.kind}:${ref.slug}` };
  const heart = (size) => <Icon name="heart" className={`${size} ${saved ? 'fill-g1-accent stroke-g1-accent' : ''}`} />;
  if (overlay || compact) {
    return (
      <button
        {...common}
        aria-label={`${label}: ${name}`}
        title={label}
        className={overlay
          ? `absolute end-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`
          : `grid h-11 w-11 shrink-0 place-items-center rounded-full border border-g1-rule text-g1-ink transition hover:border-g1-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      >
        {heart(overlay ? 'h-[22px] w-[22px]' : 'h-5 w-5')}
      </button>
    );
  }
  return (
    <button
      {...common}
      className={`inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-g1-rule px-4 text-[0.92rem] font-medium text-g1-ink transition hover:border-g1-ink ${className}`}
    >
      {heart('h-5 w-5')}
      {saved ? msg('Saved to My Miami') : msg('Save to My Miami')}
    </button>
  );
}
