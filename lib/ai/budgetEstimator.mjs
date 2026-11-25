// ===========================================================================
// Deterministic Catalog Trip Budget Calculator (Zero Hallucinations).
//
// Computes exact multi-day totals ONLY from verified catalog daily car rates
// so DeepSeek V4.1 Flash can quote accurate multi-day car math and Fact Guard
// can verify every derived total against `allowedPrices`.
// ===========================================================================

import { parseDailyPrice } from './tripProfile.mjs';

const DAYS_RE = /(?<![\p{L}\p{N}])(\d{1,2})\s*(?:days?|nights?|дн(?:я|ей)|день|суток|ноч(?:и|ей)|d[ií]as?|noches?|jours?|tage|giorni|dni|gün)(?![\p{L}\p{N}])/iu;
const BUDGET_ASK_RE = /(?<![\p{L}\p{N}])(?:budget|total|cost|how\s+much|estimate|price|spend|split|worth|бюджет|сколько\s+(?:выйдет|стоит|будет)|смет|итого|посчитай|распредел|цен|presupuesto|cuánto\s+cuesta|combien|wie\s+viel|quanto\s+costa)(?![\p{L}\p{N}])/iu;

/** Extract requested trip duration in days (1..14), from explicit mention or dateRange. */
export function extractTripDays(text, profile = null) {
  const m = String(text || '').match(DAYS_RE);
  if (m) {
    const n = Number(m[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 14) return n;
  }
  if (profile?.dateRange?.from && profile?.dateRange?.to && profile.dateRange.to > profile.dateRange.from) {
    const start = Date.parse(`${profile.dateRange.from}T12:00:00Z`);
    const end = Date.parse(`${profile.dateRange.to}T12:00:00Z`);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      const diff = Math.round((end - start) / 86_400_000) + 1;
      if (diff >= 2 && diff <= 14) return diff;
    }
  }
  if (/(?<![\p{L}\p{N}])(?:weekend|уикенд|выходн\p{L}*|fin\s+de\s+semana)(?![\p{L}\p{N}])/iu.test(String(text || ''))) {
    return 2;
  }
  return null;
}

/**
 * Compute verified multi-day car totals from the current Fact Pack items.
 * Returns derived totals (to whitelist in Fact Guard) and a compact prompt note.
 */
export function buildBudgetMath({ text = '', facts = [], profile = null } = {}) {
  const days = extractTripDays(text, profile);
  const guests = Number.isInteger(profile?.guests) && profile.guests >= 2 && profile.guests <= 12 ? profile.guests : null;
  const asksCost = BUDGET_ASK_RE.test(String(text || '')) || Boolean(profile?.maxDailyBudget);
  const derivedPrices = new Set();
  const lines = [];

  if (facts.some((f) => f?.type === 'Car') && (days >= 2 || asksCost || guests)) {
    const effectiveDays = days || 1;
    for (const item of facts) {
      if (item?.type !== 'Car' || !item.price) continue;
      const daily = parseDailyPrice(item.price);
      if (!daily) continue;
      const total = daily * effectiveDays;
      derivedPrices.add(daily);
      derivedPrices.add(total);
      let line = effectiveDays >= 2
        ? `${item.title} $${daily}/day × ${effectiveDays}d = $${total.toLocaleString('en-US')}`
        : `${item.title} $${daily}/day`;
      if (guests && guests >= 2) {
        const perGuest = Math.ceil(total / guests);
        derivedPrices.add(perGuest);
        line += ` (~$${perGuest.toLocaleString('en-US')}/guest split ${guests} ways)`;
      }
      lines.push(line);
      if (lines.length >= 3) break;
    }
  }

  if (!lines.length) {
    return { days, guests, derivedPrices, budgetNote: '' };
  }

  const label = days >= 2 ? `${days} days` : '1 day';
  return {
    days,
    guests,
    derivedPrices,
    budgetNote: `Verified car math (${label}): ${lines.join('; ')}. Yachts, villas, dining & tickets use live partner pricing — do not invent dollar estimates for them.`
  };
}
