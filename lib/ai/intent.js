// Listing search and section navigation share one multilingual intent registry.
import { getEcosystemIndex } from './ecosystemIndex';
import { matchActionCards } from '../aiSuggestions';
import { diningCollectionFor } from '../dining/filters.mjs';
import {
  extractBudget,
  extractNeighborhood,
  neighborhoodProximity,
  partySize
} from './tripProfile.mjs';

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'me', 'i', 'need', 'want', 'find', 'show', 'get', 'to', 'in', 'of', 'my',
  'with', 'best', 'under', 'near', 'please', 'can', 'you', 'looking', 'some', 'any', 'is', 'are', 'at', 'on',
  'this', 'that', 'from', 'в', 'на', 'с', 'со', 'и', 'по', 'для', 'от', 'до', 'из', 'к', 'над', 'под', 'о', 'об',
  'мне', 'нам', 'хочу', 'нужен', 'нужна', 'нужно', 'нужны', 'найди', 'покажи', 'подбери', 'посоветуй'
]);
const CITY_TOKENS = new Set([
  'miami', 'майами', 'маями', 'маямі', 'міамі', 'מיאמי', 'ميامي', 'میامی', '迈阿密', 'マイアミ', '마이애미'
]);
const norm = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е');
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const worlds = {
  '/yachts': 'drive', '/rentals': 'drive', '/private-jets': 'travel', '/travel': 'travel',
  '/vacation-rentals': 'travel', '/restaurants-nightlife': 'taste', '/experiences': 'play', '/events': 'play'
};
const belongs = (href, root) => href === root || href.startsWith(root + '/') || href.startsWith(root + '#');

// A number counts as a price only next to a currency or budget word: "$300",
// "300/day", "under 300", "budget 300". A bare "300" (stars, words, guests)
// must not match "$300/day" in a listing's text.
const BUDGET = /[$€£]\s*\d|\d\s*(?:\/|per\s+)(?:day|night|hour|person)|\b(?:under|below|less than|up to|max(?:imum)?|budget|around)\s*[$€£]?\s*\d|(?:до|бюджет|менее|не дороже)\s*[$€£]?\s*\d|(?:menos de|hasta|presupuesto)\s*[$€£]?\s*\d/iu;

function mergeEntities(baseEntities, extraEntities) {
  if (!Array.isArray(extraEntities) || !extraEntities.length) return baseEntities;
  const overrides = new Map();
  const additions = [];
  for (const entity of extraEntities) {
    if (!entity?.href) continue;
    overrides.set(entity.href, entity);
  }
  const merged = [];
  const seenHrefs = new Set();
  for (const entity of baseEntities) {
    if (overrides.has(entity.href) && !['Destination', 'World', 'Category'].includes(entity.type)) {
      merged.push(overrides.get(entity.href));
      seenHrefs.add(entity.href);
    } else {
      merged.push(entity);
    }
  }
  for (const [href, entity] of overrides.entries()) {
    if (!seenHrefs.has(href)) additions.push(entity);
  }
  return additions.length ? [...merged, ...additions] : merged;
}

/**
 * strict (concierge listing rows): numbers score only with budget context, and
 * a row qualifies only when it is named or sits in a section the guest's own
 * words asked for. The default keeps the site search behaviour unchanged.
 * `extraEntities` merges server-loaded Supabase/live-event records on top of
 * the synchronous index; `profile` applies session-wide guests, budget, and
 * Miami neighborhood proximity without changing any existing caller signature.
 */
export function searchEcosystem(query, { limit = 6, locale = 'en', strict = false, extraEntities = [], profile = null } = {}) {
  const q = norm(query).trim();
  const numbers = !strict || BUDGET.test(q);
  const tokens = q
    .split(/[^\p{L}\p{N}$]+/gu)
    .filter((token) => token && !STOP.has(token) && (numbers || !/^\$?\p{N}+$/u.test(token)));
  if (!q) return { results: [], world: null, tokens: [] };

  const sections = matchActionCards(q, { limit: 4, locale });
  const requested = partySize(q) || profile?.guests || null;
  const diningCollection = diningCollectionFor(q);
  const targetNeighborhood = extractNeighborhood(q) || profile?.neighborhood || null;
  const queryBudget = extractBudget(q);
  const maxDailyBudget = queryBudget?.maxDaily || profile?.maxDailyBudget || null;
  const cheapest = Boolean(queryBudget?.cheapest || profile?.cheapest);
  const budgetAmounts = new Set([queryBudget?.maxDaily, queryBudget?.minDaily].filter(Boolean).map(String));

  const entities = mergeEntities(getEcosystemIndex(), extraEntities);
  const wantsMiami = tokens.some((token) => CITY_TOKENS.has(token)) || Boolean(targetNeighborhood);
  const searchTokens = tokens.filter((token) => !budgetAmounts.has(token.replace(/^\$/, '')));
  const hasSubjectToken = searchTokens.some((token) => !CITY_TOKENS.has(token));
  const tokenMatchers = searchTokens.map((token) => ({
    cityOnly: hasSubjectToken && CITY_TOKENS.has(token),
    pattern: /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(token)
      ? new RegExp(escape(token), 'u')
      : new RegExp('(?<![\\p{L}\\p{N}])' + escape(token) + '(?![\\p{L}\\p{N}])', 'u')
  }));

  let scored = [];

  for (const entity of entities) {
    const section = sections.findIndex((item) => belongs(entity.href, item.href));
    const named = !['Destination', 'World', 'Category'].includes(entity.type) &&
      [entity.title, ...(entity.aliases || [])].some((value) => {
        const name = norm(value);
        return name.length >= 3 && q.includes(name) && new RegExp('(?<![\\p{L}\\p{N}])' + escape(name) + '(?![\\p{L}\\p{N}])', 'u').test(q);
      });
    // A known listing outranks generic geography such as "Miami". Location
    // keywords must never exclude Komodo Miami or a named yacht model.
    if ((strict || sections.length) && section < 0 && !named) continue;
    if (requested && entity.capacity && entity.capacity < requested) continue;
    if (wantsMiami && entity.type === 'Experience' && entity.region === 'helicopters' && !named) continue;

    const title = norm(entity.title);
    const text = norm(entity.text);
    let score = 0;
    let cityBonus = 0;
    for (const { pattern, cityOnly } of tokenMatchers) {
      if (pattern.test(text)) {
        if (cityOnly) cityBonus += 0.25;
        else score += 2;
      }
      if (pattern.test(title)) {
        if (cityOnly) cityBonus += 0.5;
        else score += 4;
      }
    }
    if (score > 0 || named || !hasSubjectToken) score += cityBonus;

    // Inflected dining collection requests (e.g. "с Мишленом", "романтический")
    // match verified venues belonging to that collection even when an exact
    // declension is absent from raw token strings.
    if (diningCollection && entity.booking && Array.isArray(entity.collections) && entity.collections.includes(diningCollection)) {
      score += 6;
    }

    // Real Miami geographic proximity boost for restaurants & nightlife:
    // exact neighborhood gets +8; adjacent neighborhoods (e.g. Brickell <-> Downtown
    // Miami / Elcielo, Sunny Isles <-> Surfside / Surf Club) get proportional boost.
    if (targetNeighborhood && entity.neighborhood && (entity.type === 'Restaurant' || entity.type === 'Nightlife')) {
      const prox = neighborhoodProximity(targetNeighborhood, entity.neighborhood);
      if (prox > 0) score += prox === 1 ? 8 : prox * 7;
    }

    // Verified live TicketNetwork events rank ahead of static category placeholders
    // when the guest asks about /events.
    if (entity.liveEvent && section >= 0 && belongs(entity.href, '/events')) {
      score += 12;
    }

    if (!score) continue;
    if (named) score += 20;
    if (entity.type !== 'Destination' && entity.type !== 'World') score += 0.5;
    if (entity.type === 'Event' && entity.id?.startsWith('event-cat-')) score += 0.25;
    scored.push({ entity, score, section, named });
  }

  // Strict numeric daily budget filter for Car rentals when matching vehicles fit
  // under the stated cap; falls back gracefully to cheapest matches if cap is unrealistically low.
  if (maxDailyBudget) {
    const carWithinBudget = scored.filter(
      (item) => item.entity.type === 'Car' && Number.isFinite(item.entity.numericPrice) && item.entity.numericPrice <= maxDailyBudget
    );
    if (carWithinBudget.length) {
      scored = scored.filter(
        (item) => item.entity.type !== 'Car' || (Number.isFinite(item.entity.numericPrice) && item.entity.numericPrice <= maxDailyBudget)
      );
      for (const item of scored) {
        if (item.entity.type === 'Car' && Number.isFinite(item.entity.numericPrice)) {
          // Slight tie-breaker preferring vehicles well matched to the budget (or cheapest if requested).
          item.score += cheapest
            ? Math.max(0, 6 - item.entity.numericPrice / 400)
            : (item.entity.numericPrice / maxDailyBudget) * 1.5;
        }
      }
    } else {
      // Unrealistic cap (e.g. "Lamborghini under $100"): keep candidates but sort cheapest first.
      for (const item of scored) {
        if (item.entity.type === 'Car' && Number.isFinite(item.entity.numericPrice)) {
          item.score += Math.max(0, 4 - item.entity.numericPrice / 1000);
        }
      }
    }
  } else if (cheapest) {
    for (const item of scored) {
      if (item.entity.type === 'Car' && Number.isFinite(item.entity.numericPrice)) {
        item.score += Math.max(0, 6 - item.entity.numericPrice / 400);
      }
    }
  }

  scored.sort((a, b) =>
    Number(b.named) - Number(a.named)
    || Number(Boolean(b.entity.liveEvent)) - Number(Boolean(a.entity.liveEvent))
    || a.section - b.section
    || b.score - a.score
  );
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 48) : 6;
  const seen = new Set();
  const ranked = scored
    .filter((item) => {
      if (seen.has(item.entity.href)) return false;
      seen.add(item.entity.href);
      return true;
    })
    .map((item) => item.entity);

  const results = [];
  // Keep a named match ahead of generic geography, then reserve one result
  // for each requested section before filling the remaining listing slots.
  if (scored[0]?.named) results.push(scored[0].entity);
  for (const section of sections) {
    if (results.length >= size) break;
    if (results.some((item) => belongs(item.href, section.href))) continue;
    const entity = ranked.find((item) => belongs(item.href, section.href));
    // An honest category fallback never invents inventory or availability.
    if (!entity && strict) continue;
    results.push(entity || {
      id: 'intent-' + section.href, type: 'Destination', world: worlds[section.href] || 'concierge',
      title: section.title, href: section.href, subtitle: null, capacity: null, text: section.label
    });
  }
  for (const entity of ranked) {
    if (results.length >= size) break;
    if (!results.some((item) => item.href === entity.href)) results.push(entity);
  }
  return { results, world: results[0]?.world || null, tokens };
}
