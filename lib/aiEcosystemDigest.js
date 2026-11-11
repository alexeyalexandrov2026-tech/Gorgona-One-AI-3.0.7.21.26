// Server-only ecosystem digest for the AI concierge.
//
// Compiles a compact, real inventory snapshot (yachts, venues, villas, cars,
// event worlds) into text appended to the concierge system prompt, so the
// model recommends actual MIAMI ELIO listings by name instead of inventing
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
  // Read every world at once: one slow database round trip must not be paid
  // five times over before the guest's question even reaches the model.
  const [yachtRows, venueRows, carRows, villaRows, experienceRows, leagueRows, eventCatRows] = await Promise.all([
    safe(getYachts),
    safe(getVenues),
    safe(getRentals),
    safe(getVacationRentals),
    safe(getExperiences),
    safe(getLeagues),
    safe(getEventCategories)
  ]);

  // Capacity is free text in the inventory ("12", "On request"): only a
  // number reads as a guest count, anything else would mislead the model.
  const yachts = line(yachtRows, (y) => y?.title && `${y.title} (${y.length || ''} ${/\d/.test(String(y.capacity || '')) ? `${y.capacity} guests` : ''}, ${y.location || 'Miami'})`.replace(/\s+/g, ' ').replace(/ ,/g, ','));
  const venues = line(venueRows, (v) => v?.name && `${v.name} (${v.category || 'venue'}, ${v.location || ''})`.replace(/\s+/g, ' '), 10);
  const cars = line(carRows, (r) => r?.title && `${r.title} (${r.location || 'Miami'})`);
  const villas = line(villaRows, (v) => v?.title && `${v.title} (${v.location || ''}${v.bedrooms ? `, ${v.bedrooms} BR` : ''})`.replace(/\s+/g, ' '));
  const experiences = line(experienceRows, (x) => x?.title && `${x.title} (${x.price || ''}${x.duration ? `, ${x.duration}` : ''})`.replace(/\s+/g, ' '), 10);
  const leagues = line(leagueRows, (l) => l?.name || l?.label, 10);
  const eventCats = line(eventCatRows, (c) => c?.label, 10);

  return `

CURRENT MIAMI ELIO INVENTORY (real listings - recommend these by name and point to their section page):
- Yachts (/yachts): ${yachts || 'see /yachts'}
- Dining & Nightlife (/restaurants-nightlife): ${venues || 'see /restaurants-nightlife'}
- Car Rentals (/rentals): ${cars || 'see /rentals'}
- Villas & Stays (/vacation-rentals): ${villas || 'see /vacation-rentals'}
- Miami Experiences (/experiences): ${experiences || 'see /experiences'}
- Events (/events): categories - ${eventCats || 'see /events'}; leagues - ${leagues || ''}

When a guest's request matches inventory above, recommend 1-3 specific listings by name with their section link. For anything time-sensitive (event dates, availability, current prices) do not guess - send the guest to the section page, where it is current.`;
}
