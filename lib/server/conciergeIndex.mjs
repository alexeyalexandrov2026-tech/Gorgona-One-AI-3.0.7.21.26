// ===========================================================================
// Server-only dynamic enrichment layer for Miami Elio AI Concierge.
//
// Reads live published partner vehicles (Supabase `partner_publications`, plus
// published `public.listings` additions for enabled worlds) and, when enabled,
// live published dining edits (`dining_publications`), converting them into
// the exact normalized entity shape produced by `lib/ai/ecosystemIndex.js`.
//
// Design guarantees:
// - 60-second per-isolate TTL cache (matches lib/data/listings.js)
// - Hard timeout <= 1200 ms so it never slows down /api/chat
// - Fail-safe: missing config, errors or timeouts always return []
// - Respects YATR & Stay22 exclusivity: only `car-rentals` is enabled until
//   explicitly expanded in ENABLED_PARTNER_WORLDS.
// ===========================================================================

import { partnerInventory } from './partnerInventory.mjs';
import { diningCatalogue } from './diningCatalogue.mjs';
import { makeCarEntity, makeVenueEntity } from '../ai/ecosystemIndex.js';

export const CACHE_TTL_MS = 60_000;
export const FETCH_TIMEOUT_MS = 1_200;

// Explicit extension point: add 'yachts' or 'vacation-rentals' here if
// partner-portal inventory is opened for those worlds in the future.
export const ENABLED_PARTNER_WORLDS = Object.freeze(['car-rentals']);

const cache = new Map(); // key -> { at: number, entities: Array<object> }
const inflight = new Map(); // key -> Promise<Array<object>>

function configOf(env) {
  if (!env || typeof env !== 'object') return null;
  const base = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  if (!base || !key) return null;
  return {
    base,
    key,
    diningEditor: env.DINING_EDITOR_ENABLED === 'true',
    cacheKey: `${base}|${env.DINING_EDITOR_ENABLED === 'true' ? '1' : '0'}`
  };
}

function boundedFetcher(fetcher, timeoutMs = FETCH_TIMEOUT_MS) {
  return (url, init = {}) => {
    const timerSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([init.signal, timerSignal])
      : timerSignal;
    return fetcher(url, { ...init, signal });
  };
}

function partnerRowToEntity(row) {
  if (!row || typeof row !== 'object') return null;
  if (row.world === 'car-rentals') {
    const specs = row.attrs?.specs;
    const specAlias = specs?.brand && specs?.model ? `${specs.brand} ${specs.model}`.trim() : null;
    return makeCarEntity({
      id: row.attrs?.legacy_id || row.slug,
      slug: row.slug,
      title: row.title,
      company: row.subtitle,
      supplier: row.subtitle,
      category: row.category || 'Sports',
      location: row.location || 'Miami, FL',
      dailyPrice: row.price_text || 'On request',
      image: row.image_url,
      description: row.description,
      capacity: row.attrs?.capacity,
      aliases: specAlias ? [specAlias] : []
    });
  }
  return null;
}

async function fetchPublishedListings(world, cfg, runFetch) {
  try {
    const res = await runFetch(
      `${cfg.base}/rest/v1/listings?world=eq.${world}&status=eq.published&order=sort_order.asc,created_at.asc&limit=500`,
      {
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
        cache: 'no-store'
      }
    );
    if (!res?.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => partnerRowToEntity({ ...row, world })).filter(Boolean);
  } catch {
    return [];
  }
}

async function loadDynamicEntities(env, cfg, fetcher) {
  const runFetch = boundedFetcher(fetcher, FETCH_TIMEOUT_MS);
  const tasks = [];

  for (const world of ENABLED_PARTNER_WORLDS) {
    tasks.push(
      partnerInventory(world, env, runFetch)
        .then((rows) => rows.map(partnerRowToEntity).filter(Boolean))
        .catch(() => [])
    );
    // Also pick up new published rows in public.listings when explicit server
    // credentials are configured (same contract as lib/data/listings.js).
    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
      tasks.push(fetchPublishedListings(world, cfg, runFetch));
    }
  }

  if (cfg.diningEditor) {
    tasks.push(
      diningCatalogue(env, runFetch)
        .then((venues) => venues
          .filter((venue) => venue && venue.status === 'verified')
          .map(makeVenueEntity))
        .catch(() => [])
    );
  }

  let timer;
  try {
    const deadline = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), FETCH_TIMEOUT_MS + 50);
    });
    const settled = await Promise.race([Promise.all(tasks), deadline]);
    if (!Array.isArray(settled)) return [];
    const byHref = new Map();
    for (const batch of settled) {
      for (const entity of batch) {
        if (entity?.href) byHref.set(entity.href, entity);
      }
    }
    return [...byHref.values()];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Synchronous warm-cache read (never triggers network I/O). */
export function peekDynamicEntities(env = process.env) {
  const cfg = configOf(env);
  if (!cfg) return [];
  const entry = cache.get(cfg.cacheKey);
  return entry && Date.now() - entry.at < CACHE_TTL_MS ? entry.entities : [];
}

/**
 * Fetches cached dynamic entities from Supabase (60s TTL, <= 1200ms timeout).
 * Always resolves to an Array; never throws.
 */
export async function getDynamicEntities(env = process.env, fetcher = fetch) {
  const cfg = configOf(env);
  if (!cfg) return [];

  const cached = cache.get(cfg.cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.entities;

  const useSharedInflight = fetcher === fetch;
  if (useSharedInflight && inflight.has(cfg.cacheKey)) return inflight.get(cfg.cacheKey);

  const pending = loadDynamicEntities(env, cfg, fetcher)
    .then((entities) => {
      cache.set(cfg.cacheKey, { at: Date.now(), entities });
      return entities;
    })
    .catch(() => [])
    .finally(() => {
      if (useSharedInflight) inflight.delete(cfg.cacheKey);
    });

  if (useSharedInflight) inflight.set(cfg.cacheKey, pending);
  return pending;
}

/** Clears the per-isolate dynamic entity cache (used in tests). */
export function clearDynamicEntitiesCache() {
  cache.clear();
  inflight.clear();
}
