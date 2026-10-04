// ===========================================================================
// Gorgona One — canonical inventory repository (server-only).
//
// The data twin of lib/ai/brain.js: every server-side read of world inventory
// (yachts, car rentals, vacation rentals, dining & nightlife) goes through
// this module. Pages and the AI digest consume these getters; they never
// query the database directly.
//
// Source of truth: public.listings in Supabase (seeded by scripts/seed/).
// Reads use the anon key over PostgREST - RLS exposes published rows only.
// Resilience: if Supabase is unreachable or not configured, getters fall
// back to the in-repo seed modules (lib/*Data.js), so every world page keeps
// rendering with correct (if not live-edited) inventory. That fallback is a
// deliberate availability guarantee, not legacy coupling.
//
// Client-side modules (SearchBar, the intent index) intentionally keep
// importing the static seed modules - they are a UI aid, and shipping a DB
// client to the browser for them would be waste. Live data authority is
// exclusively server-side, here.
// ===========================================================================

import { getYachts as seedYachts } from '../yachtsData';
import { getRentals as seedRentals } from '../rentalsData';
import { getVacationRentals as seedVacationRentals } from '../vacationRentalsData';
import { getVenues as seedVenues } from '../restaurantsNightlifeData';
import { getExperiences as seedExperiences } from '../experiencesData';

const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 5_000;

// Per-isolate cache: worlds change rarely; a 60s TTL keeps pages fast and
// database load negligible while still reflecting edits quickly.
const cache = new Map(); // world -> { at, rows }

function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

async function fetchWorld(world) {
  const cached = cache.get(world);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.rows;

  const cfg = env();
  if (!cfg) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/listings?world=eq.${world}&status=eq.published&order=sort_order.asc,created_at.asc`,
      {
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
        cache: 'no-store',
        signal: controller.signal
      }
    );
    if (!res.ok) {
      console.error('listings repository: PostgREST error', world, res.status);
      return null;
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return null; // empty -> fall back
    cache.set(world, { at: Date.now(), rows });
    return rows;
  } catch (error) {
    console.error('listings repository: fetch failed', world, error?.name || error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Per-world mappers: reconstruct the exact display shapes the pages and
// --- AI digest have always consumed, so the cutover is invisible to the UI.

const toYacht = (r) => ({
  id: r.attrs?.legacy_id || r.slug,
  slug: r.slug,
  title: r.title,
  company: r.subtitle,
  location: r.location,
  capacity: r.attrs?.capacity,
  length: r.attrs?.length,
  price: r.price_text,
  image: r.image_url,
  description: r.description,
  featured: r.featured
});

const toRental = (r) => ({
  id: r.attrs?.legacy_id || r.slug,
  slug: r.slug,
  title: r.title,
  company: r.subtitle,
  category: r.category,
  location: r.location,
  dailyPrice: r.price_text,
  weeklyPrice: r.attrs?.weeklyPrice,
  monthlyPrice: r.attrs?.monthlyPrice,
  securityDeposit: r.attrs?.securityDeposit,
  availability: r.attrs?.availability,
  image: r.image_url,
  description: r.description,
  featured: r.featured
});

const toVacationRental = (r) => ({
  id: r.attrs?.legacy_id || r.slug,
  slug: r.slug,
  title: r.title,
  location: r.location,
  guests: r.attrs?.guests,
  bedrooms: r.attrs?.bedrooms,
  nightlyRate: r.price_text,
  image: r.image_url,
  description: r.description,
  featured: r.featured
});

const toExperience = (r) => ({
  id: r.attrs?.legacy_id || r.slug,
  slug: r.slug,
  title: r.title,
  location: r.location,
  duration: r.attrs?.duration,
  price: r.price_text,
  image: r.image_url,
  description: r.description,
  featured: r.featured
});

const toVenue = (r) => ({
  id: r.attrs?.legacy_id || r.slug,
  slug: r.slug,
  name: r.title,
  category: r.category,
  location: r.location,
  rating: r.attrs?.rating,
  image: r.image_url,
  description: r.description
});

async function world(name, mapper, seed) {
  const rows = await fetchWorld(name);
  return rows ? rows.map(mapper) : seed();
}

// --- Public API (async mirrors of the historical lib/*Data.js getters) ---

export async function getYachts() {
  return world('yachts', toYacht, seedYachts);
}
export async function getFeaturedYachts() {
  return (await getYachts()).filter((x) => x.featured);
}
export async function getYachtBySlug(slug) {
  return (await getYachts()).find((x) => x.slug === slug);
}

export async function getRentals() {
  return world('car-rentals', toRental, seedRentals);
}
export async function getFeaturedRentals() {
  return (await getRentals()).filter((x) => x.featured);
}
export async function getRentalBySlug(slug) {
  return (await getRentals()).find((x) => x.slug === slug);
}

export async function getVacationRentals() {
  return world('vacation-rentals', toVacationRental, seedVacationRentals);
}
export async function getFeaturedVacationRentals() {
  return (await getVacationRentals()).filter((x) => x.featured);
}
export async function getVacationRentalBySlug(slug) {
  return (await getVacationRentals()).find((x) => x.slug === slug);
}

// --- Search ---------------------------------------------------------------

const WORLD_ROUTES = {
  yachts: '/yachts',
  'car-rentals': '/rentals',
  'vacation-rentals': '/vacation-rentals',
  'dining-nightlife': '/restaurants-nightlife',
  experiences: '/experiences'
};

const toSearchResult = (r) => ({
  world: r.world,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  category: r.category,
  location: r.location,
  description: r.description,
  price: r.price_text,
  image: r.image_url,
  featured: r.featured,
  href: `${WORLD_ROUTES[r.world] || ''}/${r.slug}`
});

// Fallback search over the seed modules: same substring semantics the old
// client-side search used, so behavior degrades gracefully, never to zero.
function fallbackSearch(q) {
  const n = q.toLowerCase();
  const hit = (...fields) => fields.filter(Boolean).join(' ').toLowerCase().includes(n);
  const rows = [];
  for (const y of seedYachts()) {
    if (hit(y.title, y.company, y.location, y.description)) {
      rows.push({ world: 'yachts', slug: y.slug, title: y.title, subtitle: y.company, category: null, location: y.location, description: y.description, price_text: y.price, image_url: y.image, featured: y.featured });
    }
  }
  for (const r of seedRentals()) {
    if (hit(r.title, r.company, r.category, r.location, r.description)) {
      rows.push({ world: 'car-rentals', slug: r.slug, title: r.title, subtitle: r.company, category: r.category, location: r.location, description: r.description, price_text: r.dailyPrice, image_url: r.image, featured: r.featured });
    }
  }
  for (const v of seedVacationRentals()) {
    if (hit(v.title, v.location, v.description)) {
      rows.push({ world: 'vacation-rentals', slug: v.slug, title: v.title, subtitle: null, category: null, location: v.location, description: v.description, price_text: v.nightlyRate, image_url: v.image, featured: v.featured });
    }
  }
  for (const v of seedVenues()) {
    if (hit(v.name, v.category, v.location, v.description)) {
      rows.push({ world: 'dining-nightlife', slug: v.slug, title: v.name, subtitle: null, category: v.category, location: v.location, description: v.description, price_text: null, image_url: v.image, featured: false });
    }
  }
  for (const x of seedExperiences()) {
    if (hit(x.title, x.location, x.description)) {
      rows.push({ world: 'experiences', slug: x.slug, title: x.title, subtitle: null, category: null, location: x.location, description: x.description, price_text: x.price, image_url: x.image, featured: x.featured });
    }
  }
  // Title hits first - mirrors the engine's weighted ranking in spirit.
  rows.sort((a, b) => Number(b.title.toLowerCase().includes(n)) - Number(a.title.toLowerCase().includes(n)));
  return rows;
}

/**
 * Authoritative inventory search (Postgres FTS + trigram via the
 * search_listings RPC; seed fallback offline). Returns unified results
 * carrying a ready-to-use `href`.
 */
export async function searchListings(query, { limit = 8, world: worldFilter } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const max = Math.max(1, Math.min(Number(limit) || 8, 20));

  let rows = null;
  const cfg = env();
  if (cfg) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${cfg.url}/rest/v1/rpc/search_listings`, {
        method: 'POST',
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, max_results: worldFilter ? 50 : max }),
        cache: 'no-store',
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) rows = data;
      } else {
        console.error('listings repository: search RPC error', res.status);
      }
    } catch (error) {
      console.error('listings repository: search failed', error?.name || error);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!rows) rows = fallbackSearch(q);
  if (worldFilter) rows = rows.filter((r) => r.world === worldFilter);
  return rows.slice(0, max).map(toSearchResult);
}

export async function getVenues() {
  return world('dining-nightlife', toVenue, seedVenues);
}

export async function getExperiences() {
  return world('experiences', toExperience, seedExperiences);
}
export async function getFeaturedExperiences() {
  return (await getExperiences()).filter((x) => x.featured);
}
export async function getExperienceBySlug(slug) {
  return (await getExperiences()).find((x) => x.slug === slug);
}
export async function getVenuesByCategory(category) {
  const venues = await getVenues();
  if (!category || category === 'all') return venues;
  return venues.filter((v) => v.category === category);
}
export async function getVenueBySlug(slug) {
  return (await getVenues()).find((v) => v.slug === slug);
}
