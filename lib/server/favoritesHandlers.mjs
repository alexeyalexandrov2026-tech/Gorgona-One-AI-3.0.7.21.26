// Account favourites ("My Miami"). Only kind + slug are stored; every item
// is checked against the live catalogue before it is saved and again when the
// list is read, so a name, photo or link the browser invents never comes back.
import { database, readBody, json, failure, RequestError } from './dashboardCore.mjs';
import { diningCatalogue } from './diningCatalogue.mjs';
import { getYachts, getVacationRentals, getRentals } from '../data/listings.js';
import { favoriteItem, favoriteKey, isFavoriteRef } from '../favoriteRules.mjs';

export async function favoriteCatalog(env = process.env, fetcher = fetch) {
  const [yachts, stays, cars, venues] = await Promise.all([
    getYachts(), getVacationRentals(), getRentals(), diningCatalogue(env, fetcher).catch(() => [])
  ]);
  const items = new Map();
  const put = (kind, slug, title, subtitle, image) => {
    const item = favoriteItem({ kind, slug, title, subtitle, image });
    if (item) items.set(favoriteKey(kind, slug), item);
  };
  for (const y of yachts) put('yacht', y.slug, y.title, y.location, y.image);
  for (const s of stays) put('stay', s.slug, s.title, s.location, s.image);
  for (const c of cars) put('car', c.slug, c.title, c.category, c.thumbnail || c.image);
  for (const v of venues) put(v.category === 'nightlife' ? 'nightlife' : 'dining', v.slug, v.name, v.neighborhood || v.location, v.photo?.src || v.image);
  return items;
}

export function favoritesHandlers(env, fetcher = fetch, catalog = favoriteCatalog) {
  const guarded = fn => async (...args) => { try { return await fn(...args); } catch (error) { return failure(error); } };
  const enabled = () => { if (env.MY_MIAMI_ENABLED !== 'true') throw new RequestError(503, 'My Miami is not enabled'); };
  async function list(db, user, items) {
    const rows = await db.call('/rest/v1/favorites?select=kind,slug,created_at&user_id=eq.' + user.id + '&order=created_at.desc&limit=200', { token:user.token });
    if (!Array.isArray(rows)) throw new RequestError(503, 'Service unavailable');
    const known = items || await catalog(env, fetcher);
    // An item withdrawn from the catalogue simply drops out of the list.
    return rows.map(row => known.get(favoriteKey(row.kind, row.slug))).filter(Boolean);
  }
  return {
    list: guarded(async request => {
      enabled();
      const db = database(env, fetcher), user = await db.identity(request);
      return json({ favorites:await list(db, user) });
    }),
    change: guarded(async request => {
      enabled();
      const body = await readBody(request, 16384);
      if (!Array.isArray(body.changes) || !body.changes.length || body.changes.length > 100) throw new RequestError(400, 'Invalid request');
      const changes = body.changes.map(change => {
        if (!change || typeof change !== 'object' || !isFavoriteRef(change.kind, change.slug) || typeof change.on !== 'boolean') throw new RequestError(400, 'Invalid request');
        return { kind:change.kind, slug:change.slug, on:change.on };
      });
      const db = database(env, fetcher), user = await db.identity(request);
      const items = await catalog(env, fetcher);
      if (changes.some(change => change.on && !items.has(favoriteKey(change.kind, change.slug)))) throw new RequestError(400, 'Invalid item');
      await db.rpc('favorites_change', { p_user:user.id, p_changes:changes });
      return json({ favorites:await list(db, user, items) });
    })
  };
}
