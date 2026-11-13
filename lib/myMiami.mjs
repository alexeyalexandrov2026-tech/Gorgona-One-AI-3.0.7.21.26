// "My Miami": the guest's favourites. The list itself is kept by
// FavoritesProvider (on this device, or in the account once signed in, and
// shared with the iOS app); its rules are in lib/favoriteRules.mjs. This file
// turns a catalogue link into a favourite and favourites into a plan request.
import { isFavoriteRef } from './favoriteRules.mjs';

// Sections a favourite can come from, and the concierge plan section each
// one feeds (lib/ai/plan.mjs builds plans from yachts, villas, cars and
// restaurants & nightlife).
export const FAVOURITE_KINDS = Object.freeze({
  yachts: 'yacht',
  'vacation-rentals': 'stay',
  rentals: 'car',
  'restaurants-nightlife': 'dining'
});

const parts = (href) => (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') ? href.split(/[?#]/)[0].split('/') : []);

export function favouriteKind(href) {
  const root = parts(href)[1] || '';
  return Object.hasOwn(FAVOURITE_KINDS, root) ? FAVOURITE_KINDS[root] : null;
}

// The stored reference for a catalogue page: { kind, slug }. The card and the
// page of one yacht give the same reference, so they are one favourite. A
// restaurant and a club cannot be told apart by their link, so their cards
// pass `kind` ('dining' or 'nightlife').
export function favouriteRef(href, kind) {
  const [, root, slug, extra] = parts(href);
  const section = Object.hasOwn(FAVOURITE_KINDS, root || '') ? FAVOURITE_KINDS[root] : null;
  if (!section || extra !== undefined) return null;
  const ref = { kind: section === 'dining' && kind === 'nightlife' ? 'nightlife' : section, slug };
  return isFavoriteRef(ref.kind, ref.slug) ? ref : null;
}

// The message that asks the concierge for a plan out of the favourites.
// Each item is named after its section ("Yachts: Sunseeker Predator 74") so
// the plan finds the section by name and the item by its own words.
export function planRequest(items, { template, sections }) {
  const lines = items
    .filter((item) => favouriteKind(item.href))
    .slice(0, 6)
    .map((item) => `${sections[favouriteKind(item.href)] || ''}: ${item.title}`.replace(/^: /, ''));
  return lines.length ? template.replace('{items}', lines.join('; ')) : '';
}
