// "My Miami": the guest's favourites. They are kept on this device, in the
// same store as the Discovery Room's saved results (AIProvider), so a heart
// on a yacht card and a pin in the Discovery Room are the same list.

// Sections a favourite can come from, and the concierge plan section each
// one feeds (lib/ai/plan.mjs builds plans from yachts, villas, cars and
// restaurants & nightlife).
export const FAVOURITE_KINDS = Object.freeze({
  yachts: 'yacht',
  'vacation-rentals': 'stay',
  rentals: 'car',
  'restaurants-nightlife': 'dining'
});

export function favouriteKind(href) {
  const root = typeof href === 'string' ? href.split(/[?#]/)[0].split('/')[1] : '';
  return Object.hasOwn(FAVOURITE_KINDS, root) ? FAVOURITE_KINDS[root] : null;
}

// One id per page, so the same yacht saved from its card and from its own
// page is one favourite.
export function favouriteId(href) {
  return 'fav:' + String(href).split(/[?#]/)[0];
}

export function favourite({ href, title, image }) {
  const kind = favouriteKind(href);
  if (!kind || typeof title !== 'string' || !title.trim()) return null;
  return { id: favouriteId(href), type: kind, href, title: title.trim(), ...(image ? { image } : {}) };
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
