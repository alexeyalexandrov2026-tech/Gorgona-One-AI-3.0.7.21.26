"use client";

import { useAI } from './ai/AIProvider';
import { useSavedText } from './LocalizedText';
import Icon from './g1/icons';
import { favourite } from '../../lib/myMiami.mjs';

// The heart that puts a yacht, villa, car or restaurant into "My Miami"
// (the profile page). `overlay` sits on a card's picture; otherwise it is a
// small button under a page's heading. Nothing is drawn for pages that
// cannot be a favourite, or before the saved list has been read from the
// device (so the heart never flips from empty to full on load).
export default function SaveButton({ href, title, image, overlay = false, className = '' }) {
  const msg = useSavedText();
  const { hydrated, isSaved, saveResult, removeSaved } = useAI();
  const item = favourite({ href, title, image });
  if (!item || !hydrated) return null;
  const saved = isSaved(item.id);
  const label = saved ? msg('Remove from My Miami') : msg('Save to My Miami');
  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (saved) removeSaved(item.id);
    else saveResult(item);
  };
  if (overlay) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={`${label}: ${item.title}`}
        title={label}
        data-save={item.id}
        className={`absolute end-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
      >
        <Icon name="heart" className={`h-[22px] w-[22px] ${saved ? 'fill-g1-accent stroke-g1-accent' : ''}`} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      data-save={item.id}
      className={`inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-g1-rule px-4 text-[0.92rem] font-medium text-g1-ink transition hover:border-g1-ink ${className}`}
    >
      <Icon name="heart" className={`h-5 w-5 ${saved ? 'fill-g1-accent stroke-g1-accent' : ''}`} />
      {saved ? msg('Saved to My Miami') : msg('Save to My Miami')}
    </button>
  );
}
