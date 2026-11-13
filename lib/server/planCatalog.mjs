// Server-only: the live catalogue in the shape lib/ai/plan.mjs ranks.
// Only items a guest can actually request on the site are offered: villas
// marked booked and unverified venues stay out, and restaurants join a plan
// only where dining requests are enabled.
import { getYachts, getVacationRentals, getRentals } from '../data/listings.js';
import { diningCatalogue } from './diningCatalogue.mjs';
import { diningEnabled } from './planHandlers.mjs';
import { buildPlan, planQuery } from '../ai/plan.mjs';

const count = value => { const match = String(value ?? '').match(/\d{1,3}/); return match ? Number(match[0]) : null; };
const words = (...values) => values.flat().filter(value => typeof value === 'string' && value).join(' ');
const image = value => typeof value === 'string' && (/^https:\/\//.test(value) || /^\/(?!\/)/.test(value)) ? value : undefined;

export async function planCatalog(env = process.env, fetcher = fetch) {
  const [yachts, stays, cars, venues] = await Promise.all([
    getYachts(), getVacationRentals(), getRentals(),
    diningEnabled(env) ? diningCatalogue(env, fetcher, { strict:true }).catch(() => []) : []
  ]);
  return {
    yacht: yachts.map(y => ({ kind:'yacht', slug:y.slug, title:y.title, subtitle:words(y.length, y.location) || undefined, image:image(y.image),
      capacity:count(y.capacity), featured:!!y.featured, text:words(y.company, y.location, y.description, 'yacht boat charter') })),
    stay: stays.filter(s => s.availability !== 'booked').map(s => ({ kind:'stay', slug:s.slug, title:s.title, subtitle:s.location || undefined, image:image(s.image),
      capacity:count(s.guests), featured:!!s.featured, text:words(s.location, s.description, 'villa stay house') })),
    car: cars.map(c => ({ kind:'car', slug:c.slug, title:c.title, subtitle:words(c.category, c.company) || undefined, image:image(c.thumbnail) || image(c.image),
      capacity:null, featured:!!c.featured, text:words(c.company, c.category, c.description, 'car rental drive') })),
    dining: venues.filter(v => v.status === 'verified').map(v => ({ kind:v.category === 'nightlife' ? 'nightlife' : 'dining', slug:v.slug, title:v.name,
      subtitle:words(v.neighborhood || v.location) || undefined, image:image(v.image), capacity:null, featured:false,
      text:words(v.category, v.cuisine, v.neighborhood, v.description, v.features, v.category === 'nightlife' ? 'nightlife nightclub club bar party' : 'restaurant dinner dining') }))
  };
}

/** Never throws: a chat reply must not fail because the catalogue did. */
export async function conversationPlan(messages, { locale = 'en', env = process.env, fetcher = fetch } = {}) {
  try {
    if (!planQuery(messages)) return null;
    return buildPlan(messages, { catalog:await planCatalog(env, fetcher), locale, requestable:env.PLAN_REQUESTS_ENABLED === 'true' });
  } catch {
    return null;
  }
}
