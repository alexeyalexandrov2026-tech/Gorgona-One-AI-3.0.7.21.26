// ===========================================================================
// Dynamic ecosystem index for Miami Elio AI.
//
// Aggregates synchronous, current MIAMI ELIO inventory from the existing providers
// (yachts, stays, experiences, venues, cars and ecosystem
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
import { getRentals } from '../rentalsData';
import { ecosystem } from '../ecosystemData';
import { discoveryCategories } from '../discoveryCategories';
import { SECTIONS } from '../aiSuggestions';

// Ecosystem-world id -> constellation world.
const ECO_WORLD = {
  travel: 'travel', experiences: 'style', villas: 'travel', yachts: 'drive',
  cars: 'drive', sportsbooks: 'play', events: 'play', concierge: 'concierge'
};

const norm = (s) => (s == null ? '' : String(s)).toLowerCase();

// Every caller does `for (const x of safe(getter))`, so this MUST return
// something iterable - the try/catch alone was not enough. `getAllEvents` is
// async (it queries Supabase), so it handed back a Promise, `for...of` threw
// "is not a function or its return value is not iterable", and because the
// throw happened outside this try/catch it aborted build() entirely: the
// index came back empty and every homepage search failed, not just events.
// The index is a synchronous, client-side structure, so an async source
// simply cannot take part in it; it is skipped rather than allowed to take
// the whole thing down. (Event intents still route through the concierge's
// /events navigation card, which does not depend on this index.)
const safe = (fn) => {
  try {
    const value = fn();
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

function makeEntity({ id, type, world, title, subtitle, href, capacity, tags, aliases=[] }) {
  const text = [title, subtitle, type, world,...aliases,...(tags || [])].map(norm).filter(Boolean).join(' ');
  return { id, type, world, title, subtitle, href, capacity: capacity || null, aliases, text };
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
      aliases:[vn.id.replace(/-/g,' ')],
      href: `/restaurants-nightlife/${vn.slug}`,
      tags: [vn.category,...(nightlife?['nightlife','nightclub','club','bar','bottle service','guest list']:['dining','restaurant','food','eat']),vn.location,vn.neighborhood,vn.cuisine,vn.description,...(vn.features||[])]
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

  // Live events are asynchronous and belong to /events. Do not call their
  // getter from this synchronous client index or index retired brand routes.
  for(const section of SECTIONS){
    out.push(makeEntity({id:'section-'+section.href.slice(1),type:'Destination',world:section.href==='/private-jets'?'travel':ECO_WORLD[section.href.slice(1)]||'concierge',title:section.label,href:section.href,tags:[section.label]}));
  }

  // --- Ecosystem worlds (top-level destinations) ---
  for (const w of safe(() => ecosystem)) {
    out.push(makeEntity({
      id: `world-${w.id}`, type: 'World', world: ECO_WORLD[w.id] || 'concierge',
      title: w.label, subtitle: w.tagline, href: w.href==='/concierge'?'/discovery':w.href,
      tags: [w.id, w.description, w.tagline]
    }));
  }

  // --- Canonical entry points (keeps all 19 discovery destinations reachable
  //     even when a query has no matching listing). Supplementary, not the
  //     discovery source. ---
  for (const c of safe(() => discoveryCategories)) {
    out.push(makeEntity({
      id: `dest-${c.label}-${c.href}`, type: 'Destination', world: c.cluster,
      title: c.label, subtitle: null, href: c.href==='/concierge'?'/discovery':c.href,
      tags: c.keywords
    }));
  }

  return out;
}

let cache = null;
export function getEcosystemIndex() {
  if (!cache) {
    // A malformed data source must degrade discovery, never throw into the
    // caller's render or leave an uncaught rejection in the console.
    try {
      cache = build();
    } catch {
      cache = [];
    }
  }
  return cache;
}
