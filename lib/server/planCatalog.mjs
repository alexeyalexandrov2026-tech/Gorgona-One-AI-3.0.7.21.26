// Server-only: the live catalogue in the shape lib/ai/plan.mjs ranks.
// Only items a guest can actually request on the site are offered: villas
// marked booked and unverified venues stay out, and restaurants join a plan
// only where dining requests are enabled.
import { diningCatalogue } from './diningCatalogue.mjs';
import { diningEnabled } from './planHandlers.mjs';
import { buildPlan, planQuery } from '../ai/plan.mjs';
import { syncPlanCatalog } from '../ai/syncPlanCatalog.mjs';
import { primaryAction } from '../dining/gateway.mjs';

const words = (...values) => values.flat().filter(value => typeof value === 'string' && value).join(' ');
const image = value => typeof value === 'string' && (/^https:\/\//.test(value) || /^\/(?!\/)/.test(value)) ? value : undefined;

export async function planCatalog(env = process.env, fetcher = fetch) {
  const catalog = syncPlanCatalog();
  if (!diningEnabled(env)) return catalog;
  const venues = await diningCatalogue(env, fetcher, { strict:true }).catch(() => []);
  if (!venues.length) return catalog;
  catalog.dining = venues.filter(v => v.status === 'verified').map(v => ({
    kind: v.category === 'nightlife' ? 'nightlife' : 'dining', slug: v.slug, title: v.name,
    subtitle: words(v.neighborhood || v.location) || undefined, image: image(v.image),
    price: v.price || undefined, booking: primaryAction(v) || undefined,
    capacity: null, featured: false,
    text: words(v.category, v.cuisine, v.neighborhood, v.description, v.features, v.category === 'nightlife' ? 'nightlife nightclub club bar party' : 'restaurant dinner dining')
  }));
  return catalog;
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
