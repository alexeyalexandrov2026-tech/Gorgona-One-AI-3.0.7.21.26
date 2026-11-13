// Shared by the favourites store in the browser, /api/favorites and the iOS
// app (ios/MiamiElioKit/Sources/MiamiElioKit/Favorites.swift mirrors these).
import { safeNavigationHref, safeImage } from './ai/session.mjs';

export const FAVORITE_KINDS = ['yacht', 'stay', 'car', 'dining', 'nightlife'];
export const FAVORITE_ROOTS = { yacht:'/yachts', stay:'/vacation-rentals', car:'/rentals', dining:'/restaurants-nightlife', nightlife:'/restaurants-nightlife' };
export const FAVORITE_LIMIT = 200;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

export const isFavoriteRef = (kind, slug) => FAVORITE_KINDS.includes(kind) && typeof slug === 'string' && SLUG.test(slug);
export const favoriteKey = (kind, slug) => kind + ':' + slug;
export const favoriteHref = (kind, slug) => FAVORITE_ROOTS[kind] + '/' + slug;

/** A favourite kept on this device (no account): bounded, routed inside its own section. */
export function favoriteItem(value) {
  if (!value || typeof value !== 'object' || !isFavoriteRef(value.kind, value.slug)) return null;
  const title = typeof value.title === 'string' ? value.title.trim().slice(0, 240) : '';
  if (!title) return null;
  const href = favoriteHref(value.kind, value.slug);
  if (!safeNavigationHref(href)) return null;
  const item = { kind:value.kind, slug:value.slug, title, href };
  if (typeof value.subtitle === 'string' && value.subtitle.trim()) item.subtitle = value.subtitle.trim().slice(0, 300);
  if (safeImage(value.image)) item.image = value.image;
  return item;
}

export function favoriteList(value, max = FAVORITE_LIMIT) {
  const seen = new Set();
  return (Array.isArray(value) ? value : []).map(favoriteItem).filter(item => {
    if (!item || seen.has(favoriteKey(item.kind, item.slug))) return false;
    seen.add(favoriteKey(item.kind, item.slug));
    return true;
  }).slice(0, max);
}
