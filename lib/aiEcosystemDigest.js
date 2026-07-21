// Server-only ecosystem digest for the AI concierge.
//
// Compiles a compact, real inventory snapshot (yachts, venues, villas, cars,
// event worlds) into text appended to the concierge system prompt, so the
// model recommends actual GORGONA ONE listings by name instead of inventing
// generic ones. Imported ONLY by app/api/chat/route.js - never by client
// components, so the full data libraries stay out of the browser bundle.

import { getYachts, getVenues, getRentals, getVacationRentals, getExperiences } from './data/listings';
import { getLeagues, getEventCategories } from './eventsData';

async function safe(fn, fallback = []) {
  try {
    const v = await fn();
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function line(items, format, max = 8) {
  return items.slice(0, max).map(format).filter(Boolean).join('; ');
}

// Rebuilt per request from the repository (which holds its own 60s cache),
// so the concierge always speaks from current inventory. Event taxonomy
// stays static - it is taxonomy, not inventory.
export async function getEcosystemDigest() {

  const yachts = line(await safe(getYachts), (y) => y?.title && `${y.title} (${y.length || ''} ${y.capacity ? `${y.capacity} guests` : ''}, ${y.location || 'Miami'})`.replace(/\s+/g, ' '));
  const venues = line(await safe(getVenues), (v) => v?.name && `${v.name} (${v.category || 'venue'}, ${v.location || ''})`.replace(/\s+/g, ' '), 10);
  const cars = line(await safe(getRentals), (r) => r?.title && `${r.title} (${r.location || 'Miami'})`);
  const villas = line(await safe(getVacationRentals), (v) => v?.title && `${v.title} (${v.location || ''}${v.bedrooms ? `, ${v.bedrooms} BR` : ''})`.replace(/\s+/g, ' '));
  const experiences = line(await safe(getExperiences), (x) => x?.title && `${x.title} (${x.price || ''}${x.duration ? `, ${x.duration}` : ''})`.replace(/\s+/g, ' '), 10);
  const leagues = line(await safe(getLeagues), (l) => l?.name || l?.label, 10);
  const eventCats = line(await safe(getEventCategories), (c) => c?.label, 10);

  return `

CURRENT GORGONA ONE INVENTORY (real listings - recommend these by name and point to their section page):
- Yachts (/yachts): ${yachts || 'see /yachts'}
- Dining & Nightlife (/restaurants-nightlife): ${venues || 'see /restaurants-nightlife'}
- Car Rentals (/rentals): ${cars || 'see /rentals'}
- Villas & Stays (/vacation-rentals): ${villas || 'see /vacation-rentals'}
- Miami Experiences (/experiences): ${experiences || 'see /experiences'}
- Events (/events): categories - ${eventCats || 'see /events'}; leagues - ${leagues || ''}

When a guest's request matches inventory above, recommend 1-3 specific listings by name with their section link. For anything time-sensitive (event dates, availability, current prices) use live web search rather than guessing.`;
}
