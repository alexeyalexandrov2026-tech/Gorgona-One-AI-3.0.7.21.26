// ===========================================================================
// Live Fleet Availability, Pricing & Split-Pay Engine (Zero PII).
//
// Shared by both the Miami Elio MCP Server (Stage 1A) and the ELIO+ Guide
// Action Agent (Stage 1B) to:
//   1. Parse requested rental dates (ISO YYYY-MM-DD) safely.
//   2. Check non-closed car booking date overlaps in Supabase `public.bookings`
//      selecting ONLY `item_slug,dates,status` (strict 450 ms timeout, zero PII).
//   3. Compute verified multi-day totals & Split-Pay shares strictly from
//      catalog daily rates.
//   4. Surface up to 3 closest available same-category/brand alternatives when
//      a specific vehicle already has an active overlapping request/hold.
// ===========================================================================

import { getRentals, getRentalBySlug } from '../rentalsData.js';
import { canonicalRentalLocation, extractCarBrand } from '../sunsetFleet.mjs';
import { parseDailyPrice } from '../ai/tripProfile.mjs';
import { database } from './dashboardCore.mjs';

const AVAILABILITY_TIMEOUT_MS = 450;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SITE_ORIGIN = 'https://gorgona-one.com';

const MONTH_MAP = Object.freeze({
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
});

export function isValidIsoDate(raw) {
  if (typeof raw !== 'string' || !ISO_DATE_RE.test(raw.trim())) return false;
  const s = raw.trim();
  const ms = Date.parse(`${s}T12:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s;
}

/**
 * Parse a date range from structured `bookings.dates` text, supporting:
 * - "2026-12-05 -> 2026-12-08", "2026-12-05 to 2026-12-08", "2026-12-05 - 2026-12-08"
 * - "Dec 5 – Dec 8, 2026" / "Nov 1 - Nov 3, 2026"
 * - Single ISO date "2026-12-05"
 */
export function parseBookingDateRange(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  const isoMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (isoMatches && isoMatches.length >= 1) {
    const valid = isoMatches.filter(isValidIsoDate);
    if (valid.length >= 2) {
      const [a, b] = valid[0] <= valid[1] ? [valid[0], valid[1]] : [valid[1], valid[0]];
      return { from: a, to: b };
    }
    if (valid.length === 1) {
      return { from: valid[0], to: valid[0] };
    }
  }

  const named = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\s*(?:–|—|-|to)\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(\d{1,2}),?\s*(\d{4})\b/i
  );
  if (named) {
    const m1 = MONTH_MAP[named[1].toLowerCase()];
    const d1 = Number(named[2]);
    const m2 = named[3] ? MONTH_MAP[named[3].toLowerCase()] : m1;
    const d2 = Number(named[4]);
    const year = Number(named[5]);
    if (m1 && m2 && d1 >= 1 && d1 <= 31 && d2 >= 1 && d2 <= 31 && year >= 2024 && year <= 2035) {
      const from = `${year}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
      const toYear = m2 < m1 ? year + 1 : year;
      const to = `${toYear}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
      if (isValidIsoDate(from) && isValidIsoDate(to)) return { from, to };
    }
  }

  return null;
}

export function rangesOverlap(a, b) {
  if (!a?.from || !a?.to || !b?.from || !b?.to) return false;
  return a.from <= b.to && b.from <= a.to;
}

export function computeRentalDays(from, to) {
  if (!isValidIsoDate(from)) return 1;
  if (!isValidIsoDate(to) || to <= from) return 1;
  const start = Date.parse(`${from}T12:00:00Z`);
  const end = Date.parse(`${to}T12:00:00Z`);
  const diff = Math.round((end - start) / 86_400_000);
  // Standard car rental billing: difference in days (min 1, max 30).
  return Math.max(1, Math.min(30, diff));
}

export function carPriceBreakdown(car, { from = null, to = null, days = null, guests = null } = {}) {
  const dailyRateUsd = parseDailyPrice(car?.dailyPrice);
  const effectiveDays = Number.isInteger(days) && days >= 1 && days <= 30
    ? days
    : computeRentalDays(from, to);
  const estimatedTotalUsd = dailyRateUsd ? dailyRateUsd * effectiveDays : null;
  const splitWays = Number.isInteger(guests) && guests >= 2 && guests <= 12 ? guests : null;
  const perGuestUsd = estimatedTotalUsd && splitWays ? Math.ceil(estimatedTotalUsd / splitWays) : null;
  return {
    dailyRateUsd,
    dailyPriceFormatted: car?.dailyPrice || null,
    weeklyPriceFormatted: car?.weeklyPrice || null,
    days: effectiveDays,
    estimatedTotalUsd,
    splitWays,
    perGuestUsd,
    currency: 'USD',
    depositNote: 'Security deposit, insurance verification, and optional MIA/FLL/hotel delivery are confirmed by the Miami Elio team before payment.'
  };
}

/**
 * Fetch active non-closed car booking date windows for one or more vehicle slugs.
 * Strictly zero-PII: selects only `item_slug,dates,status`. Bounded to 450 ms.
 */
export async function fetchActiveCarBookings(slugs = [], env = process.env, fetcher = fetch) {
  const cleanSlugs = [...new Set(
    (Array.isArray(slugs) ? slugs : [slugs])
      .map((s) => String(s || '').trim().toLowerCase())
      .filter((s) => /^[a-z0-9-]{2,120}$/.test(s))
  )].slice(0, 12);

  if (!cleanSlugs.length) return { checked: false, rows: [] };
  if (!env?.NEXT_PUBLIC_SUPABASE_URL || !env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env?.SUPABASE_SERVICE_ROLE_KEY) {
    return { checked: false, rows: [] };
  }

  const task = (async () => {
    try {
      const db = database(env, fetcher, { timeoutMs: AVAILABILITY_TIMEOUT_MS });
      const filter = cleanSlugs.length === 1
        ? `item_slug=eq.${encodeURIComponent(cleanSlugs[0])}`
        : `item_slug=in.(${cleanSlugs.map((s) => encodeURIComponent(s)).join(',')})`;
      const rows = await db.call(
        `/rest/v1/bookings?select=item_slug,dates,status&kind=eq.car&status=neq.closed&${filter}&order=created_at.desc&limit=60`,
        { service: true }
      );
      return Array.isArray(rows) ? { checked: true, rows } : { checked: false, rows: [] };
    } catch {
      return { checked: false, rows: [] };
    }
  })();

  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ checked: false, rows: [] }), AVAILABILITY_TIMEOUT_MS);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function findAlternativeCars(car, { excludeSlugs = [], limit = 3 } = {}) {
  const blocked = new Set([car?.slug, ...excludeSlugs].filter(Boolean));
  const targetBrand = car ? extractCarBrand(car) : '';
  const targetRate = parseDailyPrice(car?.dailyPrice) || 0;
  const all = getRentals().filter((c) => c?.slug && !blocked.has(c.slug));

  return all
    .map((candidate) => {
      let score = 0;
      if (candidate.category === car?.category) score += 4;
      if (targetBrand && extractCarBrand(candidate) === targetBrand) score += 3;
      const rate = parseDailyPrice(candidate.dailyPrice) || 0;
      if (targetRate && rate) {
        const diffRatio = Math.abs(rate - targetRate) / targetRate;
        if (diffRatio <= 0.2) score += 3;
        else if (diffRatio <= 0.4) score += 1;
      }
      if (candidate.featured) score += 1;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => ({
      slug: candidate.slug,
      title: candidate.title,
      brand: extractCarBrand(candidate),
      category: candidate.category,
      location: canonicalRentalLocation(candidate.location),
      dailyPrice: candidate.dailyPrice,
      url: `${SITE_ORIGIN}/rentals/${candidate.slug}`
    }));
}

/**
 * Check live availability and compute verified pricing for a specific vehicle slug.
 */
export async function checkCarAvailability(
  { slug, from = null, to = null, days = null, guests = null } = {},
  env = process.env,
  fetcher = fetch
) {
  const cleanSlug = String(slug || '').trim().toLowerCase();
  const car = getRentalBySlug(cleanSlug);
  if (!car) {
    return { found: false, error: 'car_not_found', slug: cleanSlug };
  }

  const validFrom = isValidIsoDate(from) ? from.trim() : null;
  const validTo = isValidIsoDate(to) && (!validFrom || to.trim() >= validFrom) ? to.trim() : validFrom;
  const pricing = carPriceBreakdown(car, { from: validFrom, to: validTo, days, guests });

  let status = 'confirm_with_team';
  let liveCalendarChecked = false;
  let conflictsCount = 0;
  let alternatives = [];

  if (validFrom && validTo) {
    const requestedRange = { from: validFrom, to: validTo };
    const { checked, rows } = await fetchActiveCarBookings([car.slug], env, fetcher);
    liveCalendarChecked = checked;
    if (checked) {
      const overlaps = rows.filter((row) => {
        const parsed = parseBookingDateRange(row?.dates);
        return parsed && rangesOverlap(requestedRange, parsed);
      });
      conflictsCount = overlaps.length;
      if (conflictsCount > 0) {
        status = 'busy';
        alternatives = findAlternativeCars(car, { limit: 3 });
      } else {
        status = 'available';
      }
    }
  }

  return {
    found: true,
    vehicle: {
      slug: car.slug,
      title: car.title,
      brand: extractCarBrand(car),
      category: car.category,
      location: canonicalRentalLocation(car.location),
      specs: car.specs || null,
      image: car.image || null,
      url: `${SITE_ORIGIN}/rentals/${car.slug}`
    },
    requestedDates: validFrom ? { from: validFrom, to: validTo } : null,
    availability: {
      status,
      liveCalendarChecked,
      conflictsCount,
      note: status === 'available'
        ? 'No conflicting active holds found on our calendar for these dates. Final confirmation is locked once your request is reviewed.'
        : status === 'busy'
          ? 'This vehicle already has an active request or hold overlapping your dates. Consider the closest available alternatives below or ask our team.'
          : 'Provide ISO dates (YYYY-MM-DD) or submit a quick request so our Miami team can confirm live garage availability.'
    },
    pricing,
    ...(alternatives.length ? { alternatives } : {})
  };
}

/**
 * Batch-check availability for a list of car slugs on a requested date range
 * (used by ELIO+ Action Agent in /api/chat — single Supabase query, <= 450 ms).
 */
export async function batchCheckCarAvailability(slugs = [], dateRange = null, env = process.env, fetcher = fetch) {
  const result = new Map();
  if (!dateRange?.from || !isValidIsoDate(dateRange.from)) return { checked: false, statuses: result };
  const range = {
    from: dateRange.from,
    to: dateRange.to && isValidIsoDate(dateRange.to) && dateRange.to >= dateRange.from ? dateRange.to : dateRange.from
  };
  const { checked, rows } = await fetchActiveCarBookings(slugs, env, fetcher);
  if (!checked) return { checked: false, statuses: result };

  const bySlug = new Map();
  for (const row of rows) {
    const key = String(row?.item_slug || '').trim().toLowerCase();
    if (!key) continue;
    if (!bySlug.has(key)) bySlug.set(key, []);
    bySlug.get(key).push(row);
  }

  for (const rawSlug of slugs) {
    const key = String(rawSlug || '').trim().toLowerCase();
    if (!key) continue;
    const carRows = bySlug.get(key) || [];
    const hasConflict = carRows.some((r) => {
      const parsed = parseBookingDateRange(r?.dates);
      return parsed && rangesOverlap(range, parsed);
    });
    result.set(key, hasConflict ? 'busy' : 'available');
  }

  return { checked: true, statuses: result };
}
