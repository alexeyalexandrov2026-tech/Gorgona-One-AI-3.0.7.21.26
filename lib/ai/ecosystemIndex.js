// ===========================================================================
// Dynamic ecosystem index for Gorgona One AI.
//
// Aggregates the ENTIRE GORGONA ONE catalog from the existing data providers
// (yachts, stays, experiences, venues, events, cars, deals/stores, ecosystem
// worlds) into one normalized, searchable index. This is intentionally NOT a
// hardcoded category list — entities are discovered from the live data sources,
// so new listings, partners and routes become discoverable as the data grows
// with no change to the AI logic. When a real backend/model is introduced it can
// index the same normalized shape.
//
// Each entity carries a `world` (constellation id) used ONLY to drive the visual
// highlight in the sphere — discovery itself is by matching text, not by world.
// ===========================================================================

import { getYachts } from '../yachtsData';
import { getVacationRentals } from '../vacationRentalsData';
import { getExperiences } from '../experiencesData';
import { getVenues } from '../restaurantsNightlifeData';
import { getAllEvents } from '../eventsData';
import { getRentals } from '../rentalsData';
import { allDeals, categories as storeCategories } from '../dealsData';
import { ecosystem } from '../ecosystemData';
import { discoveryCategories } from '../discoveryCategories';

// Store-category slug -> constellation world (display grouping only).
const STORE_WORLD = {
  shopping: 'style', fashion: 'style', electronics: 'style', beauty: 'style', home: 'style',
  travel: 'travel', sport: 'play', betting: 'play', entertainment: 'play',
  restaurants: 'taste', food: 'taste', 'kosher-restaurants': 'taste', 'kosher-stores': 'taste'
};
// Ecosystem-world id -> constellation world.
const ECO_WORLD = {
  travel: 'travel', shopping: 'style', villas: 'travel', yachts: 'drive',
  cars: 'drive', sportsbooks: 'play', events: 'play', concierge: 'concierge'
};

const norm = (s) => (s == null ? '' : String(s)).toLowerCase();
const safe = (fn) => {
  try {
    return fn() || [];
  } catch {
    return [];
  }
};

function makeEntity({ id, type, world, title, subtitle, href, capacity, tags }) {
  const text = [title, subtitle, type, world, ...(tags || [])].map(norm).filter(Boolean).join(' ');
  return { id, type, world, title, subtitle, href, capacity: capacity || null, text };
}

function build() {
  const out = [];

  // --- Yachts (Drive & Sail) ---
  for (const y of safe(getYachts)) {
    out.push(makeEntity({
      id: `yacht-${y.slug || y.id}`, type: 'Yacht', world: 'drive',
      title: y.title, subtitle: [y.length, y.capacity && `up to ${y.capacity} guests`, y.location].filter(Boolean).join(' · '),
      href: `/yachts/${y.slug}`, capacity: y.capacity,
      tags: ['yacht', 'boat', 'charter', 'sail', 'marine', y.company, y.location]
    }));
  }

  // --- Vacation rentals / stays (Travel) ---
  for (const v of safe(getVacationRentals)) {
    out.push(makeEntity({
      id: `stay-${v.slug || v.id}`, type: 'Stay', world: 'travel',
      title: v.title, subtitle: [v.bedrooms && `${v.bedrooms} BR`, v.guests && `sleeps ${v.guests}`, v.location].filter(Boolean).join(' · '),
      href: `/vacation-rentals/${v.slug}`, capacity: v.guests,
      tags: ['villa', 'hotel', 'stay', 'rental', 'home', 'accommodation', v.location]
    }));
  }

  // --- Experiences (Play & Win) ---
  for (const e of safe(getExperiences)) {
    out.push(makeEntity({
      id: `exp-${e.slug || e.id}`, type: 'Experience', world: 'play',
      title: e.title, subtitle: [e.duration, e.location].filter(Boolean).join(' · '),
      href: `/experiences/${e.slug}`,
      tags: ['experience', 'tour', 'activity', 'adventure', 'things to do', e.location]
    }));
  }

  // --- Venues: restaurants & nightlife (Table & Taste / Play) ---
  for (const vn of safe(getVenues)) {
    const nightlife = vn.category === 'nightlife';
    out.push(makeEntity({
      id: `venue-${vn.slug || vn.id}`, type: nightlife ? 'Nightlife' : 'Restaurant',
      world: nightlife ? 'play' : 'taste',
      title: vn.name, subtitle: vn.location,
      href: `/restaurants-nightlife/${vn.slug}`,
      tags: [vn.category, 'dining', 'restaurant', 'food', 'eat', 'nightlife', 'bar', 'club', vn.location]
    }));
  }

  // --- Cars (Drive & Sail) ---
  for (const c of safe(getRentals)) {
    out.push(makeEntity({
      id: `car-${c.slug || c.id}`, type: 'Car', world: 'drive',
      title: c.title, subtitle: [c.category, c.location, c.dailyPrice && `${c.dailyPrice}/day`].filter(Boolean).join(' · '),
      href: `/rentals/${c.slug}`,
      tags: ['car', 'rental', 'drive', 'vehicle', 'exotic', 'supercar', c.category, c.company, c.location]
    }));
  }

  // --- Events (Play & Win) ---
  for (const ev of safe(getAllEvents)) {
    out.push(makeEntity({
      id: `event-${ev.slug || ev.id}`, type: 'Event', world: 'play',
      title: ev.name, subtitle: [ev.venue, ev.city, ev.date].filter(Boolean).join(' · '),
      href: `/events/${ev.slug}`,
      tags: [ev.category, ev.league, 'event', 'tickets', 'sports', 'concert', 'show', ev.city, ev.venue]
    }));
  }

  // --- Deals / stores (per brand) ---
  for (const d of safe(() => allDeals)) {
    out.push(makeEntity({
      id: `deal-${d.slug}`, type: 'Store', world: STORE_WORLD[d.category] || 'style',
      title: d.name, subtitle: [d.discount, d.category].filter(Boolean).join(' · '),
      href: `/brands/${d.slug}`,
      tags: [d.category, 'deal', 'promo', 'coupon', 'shopping', 'store', 'brand', d.name]
    }));
  }

  // --- Store categories (Style / Taste / etc.) ---
  for (const cat of safe(() => storeCategories)) {
    out.push(makeEntity({
      id: `store-cat-${cat.slug}`, type: 'Category', world: STORE_WORLD[cat.slug] || 'style',
      title: cat.label, subtitle: cat.description, href: `/stores/${cat.slug}`,
      tags: [cat.slug, 'category', 'shopping', 'deals']
    }));
  }

  // --- Ecosystem worlds (top-level destinations) ---
  for (const w of safe(() => ecosystem)) {
    out.push(makeEntity({
      id: `world-${w.id}`, type: 'World', world: ECO_WORLD[w.id] || 'concierge',
      title: w.label, subtitle: w.tagline, href: w.href,
      tags: [w.id, w.description, w.tagline]
    }));
  }

  // --- Canonical entry points (keeps all 19 discovery destinations reachable
  //     even when a query has no matching listing). Supplementary, not the
  //     discovery source. ---
  for (const c of safe(() => discoveryCategories)) {
    out.push(makeEntity({
      id: `dest-${c.label}-${c.href}`, type: 'Destination', world: c.cluster,
      title: c.label, subtitle: null, href: c.href,
      tags: c.keywords
    }));
  }

  return out;
}

let cache = null;
export function getEcosystemIndex() {
  if (!cache) cache = build();
  return cache;
}
