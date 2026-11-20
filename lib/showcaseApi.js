// Public JSON feed of the home-page showcase, for clients that cannot use the
// server-rendered hero (the Android app). The cards come from
// buildHeroShowcase() in lib/heroShowcaseData.js; this module only keeps a
// fixed set of their fields and turns every image into an absolute https URL.
// Pure: it reads no cookies, headers or user data, so the answer is the same
// for everyone and can be cached publicly.

import { SHOWCASE_INTERVAL_MS } from './heroShowcase.js';

const CACHE = 'public, s-maxage=600, stale-while-revalidate=3600';
// buildHeroShowcase logs its own failure and answers [], so an empty list means
// "try again soon". It must not stay at the edge for ten minutes.
const RETRY_CACHE = 'public, s-maxage=60';

const CATEGORIES = new Set(['car', 'yacht', 'stay', 'jet', 'event']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const count = (value) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

// Fields after cat, href, title and image, in output order. A value that is
// missing, null or blank is left out of the item.
const OPTIONAL = [
  ['price', text],
  ['company', text],
  ['length', text],
  ['location', text],
  ['bedrooms', count],
  ['category', text],
  ['kicker', text],
  ['lineId', text]
];

// Origin that site-relative images are resolved against. Behind the worker a
// request can arrive as http://, so every host except a local one gets https.
// Only the origin is used: credentials and the path of the request never leak.
function imageOrigin(requestUrl) {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname)) url.protocol = 'https:';
    return url.origin;
  } catch {
    return null;
  }
}

function resolveImage(src, origin) {
  const value = text(src);
  if (!value) return null;
  try {
    if (/^https:\/\//i.test(value)) {
      const url = new URL(value);
      return url.hostname && !url.username && !url.password ? url.href : null;
    }
    // http://, data:, protocol-relative and every other path are dropped.
    if (!origin || !value.startsWith('/images/')) return null;
    const url = new URL(value, origin);
    // `..` or an encoded dot segment would walk out of /images/ once resolved.
    return url.pathname.startsWith('/images/') ? url.href : null;
  } catch {
    return null;
  }
}

export function showcaseImageUrl(src, requestUrl) {
  return resolveImage(src, imageOrigin(requestUrl));
}

// Cards in, API items out. A card without a known category, link, title or
// usable image is dropped; anything outside the documented fields is ignored.
export function showcaseApiItems(cards, requestUrl) {
  if (!Array.isArray(cards)) return [];
  const origin = imageOrigin(requestUrl);
  const items = [];
  for (const card of cards) {
    const href = text(card?.href);
    const title = text(card?.title);
    const image = resolveImage(card?.image, origin);
    if (!CATEGORIES.has(card?.cat) || !href || !title || !image) continue;
    const item = { cat: card.cat, href, title, image };
    for (const [key, clean] of OPTIONAL) {
      const value = clean(card[key]);
      if (value !== null) item[key] = value;
    }
    items.push(item);
  }
  return items;
}

// `loadCards` is buildHeroShowcase. The catch covers anything it lets through:
// the feed still answers, with an empty list and the short cache.
export async function showcaseApiResult(loadCards, requestUrl) {
  let items = [];
  try {
    items = showcaseApiItems(await loadCards(), requestUrl);
  } catch (error) {
    console.error('showcase api', error);
  }
  return {
    body: { intervalMs: SHOWCASE_INTERVAL_MS, items },
    cacheControl: items.length ? CACHE : RETRY_CACHE
  };
}
