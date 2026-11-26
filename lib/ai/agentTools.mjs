// ===========================================================================
// Wave 1B ELIO+ Transactional Action Agent Tools (Server-only, Zero PII).
//
// Bridges live Supabase fleet calendar availability and verified catalog
// multi-day / Split-Pay pricing directly into /api/chat:
//   1. checkPreInferenceFleetAvailability() — runs inside the existing parallel
//      pre-inference window (0 ms added latency, <= 450 ms hard cap) so Workers
//      AI sees real calendar statuses before drafting its reply.
//   2. enrichListingsWithAgentTools() — attaches live availabilityStatus,
//      verified multi-day estimatedTotal, and Split-Pay perGuest tags to car
//      cards, and floats available vehicles ahead of busy vehicles.
//   3. enrichPlanWithAgentTools() — enriches /rentals candidates inside AiPlan
//      using the same live statuses without redundant DB queries.
// ===========================================================================

import { getRentalBySlug } from '../rentalsData.js';
import { batchCheckCarAvailability, carPriceBreakdown } from '../server/fleetAvailability.mjs';
import { listingCards } from './listingCards.mjs';
import { formatActionEstimate } from './actionAgentCopy.mjs';

export function carSlugFromHref(href) {
  if (typeof href !== 'string') return null;
  const match = href.match(/^\/rentals\/([a-z0-9][a-z0-9-]*)$/);
  return match ? match[1] : null;
}

/**
 * Check live Supabase availability for the top candidate car slugs in parallel
 * with existing pre-inference lookups. Returns a compact zero-PII prompt line
 * (<= 240 chars) and a reusable slug -> status Map.
 */
export async function checkPreInferenceFleetAvailability({
  query = '',
  pagePath = '',
  profile = null,
  localSections = [],
  extraEntities = [],
  env = process.env,
  fetcher = fetch
} = {}) {
  const empty = { checked: false, statuses: new Map(), promptLine: '' };
  if (!profile?.dateRange?.from) return empty;
  const onRentalPage = typeof pagePath === 'string' && pagePath.startsWith('/rentals');
  const wantsCars = onRentalPage || (Array.isArray(localSections) && localSections.includes('/rentals'));
  if (!wantsCars) return empty;

  const slugs = [];
  const seen = new Set();
  const addSlug = (raw) => {
    const clean = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (!clean || seen.has(clean) || slugs.length >= 4) return;
    if (!getRentalBySlug(clean)) return;
    seen.add(clean);
    slugs.push(clean);
  };

  const pageSlug = carSlugFromHref(pagePath);
  if (pageSlug) addSlug(pageSlug);

  if (query && slugs.length < 4) {
    try {
      const candidates = listingCards(query, {
        sections: ['/rentals'],
        limit: 4,
        extraEntities,
        profile
      });
      for (const card of candidates) {
        addSlug(carSlugFromHref(card?.href));
      }
    } catch {
      /* fail-safe */
    }
  }

  if (!slugs.length) return empty;

  const { checked, statuses } = await batchCheckCarAvailability(slugs, profile.dateRange, env, fetcher);
  if (!checked || !statuses.size) return empty;

  const summaryBits = [];
  for (const slug of slugs.slice(0, 3)) {
    const st = statuses.get(slug);
    if (!st) continue;
    const title = getRentalBySlug(slug)?.title || slug;
    summaryBits.push(`${title}=${st}`);
  }
  if (!summaryBits.length) return { checked: true, statuses, promptLine: '' };

  const rangeLabel = profile.dateRange.to && profile.dateRange.to !== profile.dateRange.from
    ? `${profile.dateRange.from}..${profile.dateRange.to}`
    : profile.dateRange.from;

  const promptLine = `Live garage calendar (${rangeLabel}): ${summaryBits.join(', ')}. Share availability honestly and note final lock is confirmed by our team.`.slice(0, 250);
  return { checked: true, statuses, promptLine };
}

function rankStatusWeight(status) {
  if (status === 'available') return 0;
  if (status === 'busy') return 2;
  return 1;
}

/**
 * Enrich car cards with verified live availability badges, multi-day totals,
 * and Split-Pay per-guest figures, then float available cars ahead of busy ones
 * while keeping non-car cards pinned to their original positions.
 */
export async function enrichListingsWithAgentTools(
  listings = [],
  { profile = null, locale = 'en', preStatuses = null, env = process.env, fetcher = fetch } = {}
) {
  if (!Array.isArray(listings) || !listings.length) return listings;

  const carEntries = listings.map((card, index) => ({
    card,
    index,
    slug: carSlugFromHref(card?.href)
  }));
  const carSlugs = [...new Set(carEntries.map((e) => e.slug).filter(Boolean))];
  if (!carSlugs.length) return listings;

  const hasDateRange = Boolean(profile?.dateRange?.from);
  const statuses = new Map(preStatuses instanceof Map ? preStatuses : []);

  if (hasDateRange) {
    const missing = carSlugs.filter((slug) => !statuses.has(slug));
    if (missing.length) {
      const batch = await batchCheckCarAvailability(missing, profile.dateRange, env, fetcher);
      if (batch.checked) {
        for (const [slug, st] of batch.statuses.entries()) {
          statuses.set(slug, st);
        }
      }
    }
  }

  const enriched = carEntries.map(({ card, index, slug }) => {
    if (!slug) return { card, index, slug: null };
    const car = getRentalBySlug(slug) || { dailyPrice: card.price };
    const avail = statuses.get(slug);
    let estimatedTotal = null;
    let perGuest = null;

    if (hasDateRange) {
      const pricing = carPriceBreakdown(car, {
        from: profile.dateRange.from,
        to: profile.dateRange.to,
        guests: profile.guests
      });
      const formatted = formatActionEstimate({
        days: pricing.days,
        estimatedTotalUsd: pricing.estimatedTotalUsd,
        perGuestUsd: pricing.perGuestUsd,
        splitWays: pricing.splitWays,
        locale
      });
      estimatedTotal = formatted.estimatedTotal;
      perGuest = formatted.perGuest;
    }

    const nextCard = {
      ...card,
      ...(avail === 'available' || avail === 'busy' ? { availabilityStatus: avail } : {}),
      ...(estimatedTotal ? { estimatedTotal } : {}),
      ...(perGuest ? { perGuest } : {})
    };
    return { card: nextCard, index, slug };
  });

  // Stable re-ranking ONLY across car slots so available vehicles surface before
  // busy ones without disturbing dining/yacht/event card ordering.
  const carSlotIndices = [];
  const carItems = [];
  for (const entry of enriched) {
    if (entry.slug) {
      carSlotIndices.push(entry.index);
      carItems.push(entry);
    }
  }

  if (carItems.length >= 2 && carItems.some((e) => e.card.availabilityStatus === 'busy')) {
    carItems.sort((a, b) => {
      const diff = rankStatusWeight(a.card.availabilityStatus) - rankStatusWeight(b.card.availabilityStatus);
      return diff !== 0 ? diff : a.index - b.index;
    });
    const output = enriched.map((e) => e.card);
    carSlotIndices.forEach((slotIdx, i) => {
      output[slotIdx] = carItems[i].card;
    });
    return output;
  }

  return enriched.map((e) => e.card);
}

/**
 * Enrich car candidates inside an AiPlan using the same live statuses and
 * multi-day estimates. Never adds a DB query if `preStatuses` already covers them.
 */
export async function enrichPlanWithAgentTools(
  plan,
  { profile = null, locale = 'en', preStatuses = null, env = process.env, fetcher = fetch } = {}
) {
  if (!plan?.sections?.length) return plan;
  const hasCarSection = plan.sections.some((s) => s?.href === '/rentals' && Array.isArray(s.candidates) && s.candidates.length);
  if (!hasCarSection) return plan;

  const nextSections = await Promise.all(
    plan.sections.map(async (section) => {
      if (section?.href !== '/rentals' || !Array.isArray(section.candidates) || !section.candidates.length) {
        return section;
      }
      const candidates = await enrichListingsWithAgentTools(section.candidates, {
        profile,
        locale,
        preStatuses,
        env,
        fetcher
      });
      return { ...section, candidates };
    })
  );
  return { ...plan, sections: nextSections };
}
