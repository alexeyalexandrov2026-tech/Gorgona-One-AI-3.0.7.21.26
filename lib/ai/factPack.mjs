// ===========================================================================
// Pre-inference Grounded Fact Pack, Deep Entity Dossier & Page-Aware Resolver.
//
// Builds a compact, verified factual capsule from:
// - Full venue & fleet dossiers (cuisine, features, verified descriptions)
// - Multi-entity comparison extraction (all named venues/cars in a comparison)
// - Semantic luxury vibes & archetypes (lib/ai/semanticVibes.mjs)
// - Deterministic multi-day car budget math (lib/ai/budgetEstimator.mjs)
// - Live TicketNetwork events & real Miami geographic clusters/driving times
// ===========================================================================

import { getEcosystemIndex } from './ecosystemIndex.js';
import { expandMultilingualAliases, searchEcosystem } from './intent.js';
import { displayName, SECTIONS } from '../aiSuggestions.js';
import { conversationNavigation } from './conversation.mjs';
import { extractCuisinePreferences, extractTripProfile, neighborhoodProximity, parseDailyPrice } from './tripProfile.mjs';
import { getVenues } from '../restaurantsNightlifeData.js';
import { getRentals } from '../rentalsData.js';
import { analyzeSemanticIntent, semanticConceptScore, semanticRerankWithEmbeddings } from './semanticSearch.mjs';
import { buildBudgetMath } from './budgetEstimator.mjs';
import { normalizePagePath } from './pagePath.mjs';
export { normalizePagePath };

const SECTION_BY_HREF = new Map(SECTIONS.map((s) => [s.href, s]));

let dossierMaps = null;
function getDossierMaps() {
  if (dossierMaps) return dossierMaps;
  const venuesByHref = new Map();
  for (const v of getVenues()) {
    if (!v?.slug) continue;
    venuesByHref.set(`/restaurants-nightlife/${v.slug}`, {
      cuisine: v.cuisine || undefined,
      features: Array.isArray(v.features) && v.features.length ? v.features.slice(0, 3) : undefined,
      desc: typeof v.description === 'string' && v.description.trim() ? v.description.trim().slice(0, 82) : undefined
    });
  }
  const carsByHref = new Map();
  for (const c of getRentals()) {
    if (!c?.slug) continue;
    carsByHref.set(`/rentals/${c.slug}`, {
      category: c.category || undefined,
      desc: typeof c.description === 'string' && c.description.trim() ? c.description.trim().slice(0, 76) : undefined
    });
  }
  dossierMaps = { venuesByHref, carsByHref };
  return dossierMaps;
}

function sectionOfHref(href) {
  const path = String(href || '');
  if (path === '/') return '/';
  const first = '/' + path.replace(/^\/+/, '').split(/[/?#]/)[0];
  return SECTION_BY_HREF.has(first) ? first : '';
}

function summarizeEntity(item, includeDossier = false) {
  if (!item || typeof item !== 'object') return null;
  const section = sectionOfHref(item.href);
  const price = item.price ? String(item.price).slice(0, 78) : undefined;
  const location = item.neighborhood || (typeof item.subtitle === 'string' ? item.subtitle.slice(0, 70) : undefined);
  const collections = Array.isArray(item.collections) && item.collections.length
    ? item.collections.slice(0, 3)
    : undefined;
  let extra = {};
  if (includeDossier && item.href) {
    const { venuesByHref, carsByHref } = getDossierMaps();
    const vInfo = venuesByHref.get(item.href);
    const cInfo = carsByHref.get(item.href);
    if (vInfo) extra = { ...(vInfo.cuisine ? { cuisine: vInfo.cuisine } : {}), ...(vInfo.features ? { features: vInfo.features } : {}), ...(vInfo.desc ? { desc: vInfo.desc } : {}) };
    else if (cInfo) extra = { ...(cInfo.category ? { category: cInfo.category } : {}), ...(cInfo.desc ? { desc: cInfo.desc } : {}) };
  }
  return {
    title: String(item.title || '').slice(0, 96),
    type: item.type || 'Item',
    ...(section ? { section } : {}),
    ...(price ? { price } : {}),
    ...(location ? { location } : {}),
    ...(Number.isFinite(item.capacity) ? { capacity: item.capacity } : {}),
    ...(collections ? { tags: collections } : {}),
    ...(item.booking?.platform ? { partner: item.booking.platform } : {}),
    ...(item.liveEvent ? { live: true } : {}),
    ...extra
  };
}

/**
 * Find all explicitly mentioned venues or cars in a user message (e.g.
 * "Compare Carbone, Komodo and Papi Steak") so every compared item gets a
 * full dossier in Grounded facts.
 */
export function extractMentionedEntities(textOrMessages, extraEntities = []) {
  const rawText = Array.isArray(textOrMessages)
    ? textOrMessages.filter((m) => m?.role === 'user' && typeof m.content === 'string').map((m) => m.content).join(' ')
    : String(textOrMessages || '');
  const lower = expandMultilingualAliases(rawText);
  if (lower.length < 4) return [];
  const limit = typeof extraEntities === 'number' ? extraEntities : 4;
  const extra = Array.isArray(extraEntities) ? extraEntities : [];
  const pool = [...extra, ...getEcosystemIndex()];
  const matches = [];
  const seen = new Set();
  for (const item of pool) {
    if (!item?.title || !item?.href || (item.type !== 'Restaurant' && item.type !== 'Nightlife' && item.type !== 'Car')) continue;
    const title = item.title.toLowerCase();
    if (title.length < 4) continue;
    // Match full venue name or distinct model name (word-bounded)
    const clean = title.replace(/^the\s+/, '').replace(/\s+miami$/, '').trim();
    if (clean.length < 4) continue;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
    if (re.test(lower) && !seen.has(item.href)) {
      seen.add(item.href);
      matches.push(item);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

/** Resolve the verified catalog entity or section matching the guest's current page. */
export function resolvePageEntity(pagePath, extraEntities = []) {
  const path = normalizePagePath(pagePath);
  if (!path || path === '/') return null;

  const extra = Array.isArray(extraEntities) ? extraEntities : [];
  const all = extra.length ? [...extra, ...getEcosystemIndex()] : getEcosystemIndex();
  const exact = all.find((item) => item?.href === path);
  if (exact) return summarizeEntity(exact, true);

  const section = SECTION_BY_HREF.get(sectionOfHref(path));
  if (section) {
    return {
      title: section.title,
      type: 'Section',
      section: section.href
    };
  }
  return null;
}

const USER_MONEY_RE = /(?:[$€£]\s*(\d{1,3}(?:,\d{3})+|\d{2,6})|(\d{1,3}(?:,\d{3})+|\d{2,6})\s*(?:[$€£]|usd|eur|gbp|dollars?|euros?|доллар\p{L}*|евро|баксов|\/\s*(?:day|день|сутки|night|ночь))|(?:budget|under|below|max|up\s+to|бюджет|до)\s*(?:of\s+)?[$€£]?\s*(\d{1,3}(?:,\d{3})+|\d{2,6}))/giu;

/** Extract numeric amounts from catalog price labels and explicit user budget/currency figures into a Set of integers. */
export function collectAllowedPrices(items = [], messages = []) {
  const allowed = new Set();
  for (const item of items) {
    if (!item?.price) continue;
    const p = parseDailyPrice(item.price);
    if (p) allowed.add(p);
    for (const m of String(item.price).matchAll(/\$?\s*(\d{1,3}(?:,\d{3})+|\d{2,6})/g)) {
      const n = Number(m[1].replace(/,/g, ''));
      if (Number.isFinite(n) && n > 0) allowed.add(n);
    }
  }
  for (const msg of Array.isArray(messages) ? messages : []) {
    if (msg?.role !== 'user' || typeof msg.content !== 'string') continue;
    for (const m of msg.content.matchAll(USER_MONEY_RE)) {
      const raw = m[1] || m[2] || m[3];
      const n = Math.round(Number(String(raw).replace(/,/g, '')));
      if (Number.isFinite(n) && n > 0) allowed.add(n);
    }
  }
  return allowed;
}

const LOGISTICS_TRIGGER = /\b(?:mia|fll|airport|drive|driving|traffic|far|minutes?|time|after|before|schedule|sunset|causeway|stadium|kaseya|hard rock|chase|palm beach|brickell|south beach|wynwood|design district|luggage|suitcases?|compare|vs|versus|better|budget|split)\b|аэропорт|ехать|дорог|пробк|минут|успе|после|до\s+матч|закат|стадион|чемодан|багаж|сравни|лучше|бюджет|распредел|подойд[её]т|помести/iu;

const MIAMI_LOGISTICS_CAPSULE =
  'Miami practical facts: Clusters — Bay/Core (Brickell↔Kaseya Center 8–12m↔Bayside Marina 8m↔Key Biscayne 15m), Art/Lux (Wynwood↔Design District 7m↔Edgewater 10m), Beach/North (South Beach↔Bal Harbour 20m↔Sunny Isles 28m). Airports: MIA↔Brickell 18–30m, MIA↔South Beach 25–40m, FLL↔Brickell 35–55m. Causeway rush hour 17:00–19:30; Brickell↔Hard Rock 30–50m; Miami↔Palm Beach Improv ~75m drive / ~65m Brightline. Supercars: 2 seats + 1–2 carry-ons; luxury SUVs: 4–7 guests + suitcases. Sunset dining: arrive 45–60m early; clubs peak after midnight, upscale dress code.';

const CUISINE_MATCHERS = Object.freeze({
  steakhouse: (v) => /steak/i.test(v.cuisine || '') || /steak/i.test(v.name || ''),
  italian: (v) => /italian/i.test(v.cuisine || ''),
  sushi: (v) => /japanese|sushi/i.test(v.cuisine || ''),
  seafood: (v) => /seafood/i.test(v.cuisine || ''),
  mediterranean: (v) => /mediterranean|aegean|greek|french/i.test(v.cuisine || '')
});

/**
 * When the guest asks for a specific dining cuisine (e.g. steakhouse, Italian)
 * inside a target neighborhood (e.g. Brickell) that has 0 verified venues of
 * that cuisine, find the closest verified venues in adjacent neighborhoods.
 */
export function findCrossNeighborhoodDining(neighborhood, cuisineTags = [], limit = 3) {
  const empty = [];
  empty.note = '';
  if (!neighborhood || !Array.isArray(cuisineTags) || !cuisineTags.length) {
    return empty;
  }
  const activeTag = cuisineTags.find((t) => CUISINE_MATCHERS[t]);
  if (!activeTag) return empty;
  const matcher = CUISINE_MATCHERS[activeTag];
  const verified = getVenues().filter((v) => v?.status === 'verified' && v.slug && matcher(v));
  const inHood = verified.filter((v) => v.neighborhood === neighborhood);
  if (inHood.length > 0) return empty;

  const nearby = verified
    .map((v) => ({ venue: v, prox: neighborhoodProximity(neighborhood, v.neighborhood) }))
    .filter((entry) => entry.prox > 0)
    .sort((a, b) => b.prox - a.prox)
    .slice(0, limit);
  if (!nearby.length) return empty;

  const indexByHref = new Map(getEcosystemIndex().map((e) => [e.href, e]));
  const items = nearby
    .map(({ venue }) => indexByHref.get(`/restaurants-nightlife/${venue.slug}`))
    .filter(Boolean);
  const labelList = nearby.map(({ venue }) => `${venue.name} (${venue.neighborhood})`).join(', ');
  items.note = `Cross-neighborhood dining note: No exact ${activeTag} match inside ${neighborhood}; closest verified ${activeTag} options in adjacent neighborhoods: ${labelList}.`;
  return items;
}

/**
 * Build the compact Grounded Fact Pack passed to Workers AI and the Fact Guard.
 */
export function buildFactPack(input = {}, maybeLocale = 'en') {
  const opts = Array.isArray(input) ? { messages: input, locale: maybeLocale } : (input || {});
  const { messages = [], locale = 'en', extraEntities = [], profile = null, pagePath = '', preRankedMatches = null } = opts;
  const activeProfile = profile || extractTripProfile(messages);
  const userTurns = (Array.isArray(messages) ? messages : [])
    .filter((m) => m?.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content);
  const latestUser = userTurns.at(-1) || '';
  const prevUser = userTurns.length >= 2 ? userTurns.at(-2) : '';
  const pageEntity = resolvePageEntity(pagePath, extraEntities);
  const vibeInfo = analyzeSemanticIntent(latestUser);
  const currMentioned = extractMentionedEntities(latestUser, extraEntities);
  const mentioned = currMentioned.length >= 2 || !prevUser
    ? currMentioned
    : [...currMentioned, ...extractMentionedEntities(prevUser, extraEntities).filter((e) => !currMentioned.some((c) => c.href === e.href))].slice(0, 4);
  const nav = conversationNavigation(messages, { locale });
  const requestedSections = [...new Set([
    ...(nav.cards || []).map((c) => c.href),
    ...(nav.suggestions || []).map((s) => s.href)
  ])].slice(0, 4);
  const topic = requestedSections[0] || pageEntity?.section || '';
  const contextHint = pageEntity && pageEntity.type !== 'Section' ? ` ${pageEntity.title}` : '';
  const query = `${latestUser}${contextHint} ${vibeInfo.searchBoostTerms} ${topic ? displayName(topic, 'en') || '' : ''}`.trim();

  const rawMatches = Array.isArray(preRankedMatches)
    ? preRankedMatches.slice(0, 10)
    : searchEcosystem(query, {
        locale,
        limit: 14,
        extraEntities,
        profile: activeProfile,
        includeOnRequestCars: true
      }).results
        .map((item, idx) => ({ item, score: semanticConceptScore(item, vibeInfo) - idx * 0.4 }))
        .sort((a, b) => b.score - a.score)
        .map((e) => e.item)
        .slice(0, 10);

  const turnCuisines = extractCuisinePreferences(latestUser);
  const effectiveCuisines = turnCuisines.length ? turnCuisines : (activeProfile.dietaryOrCuisine || []);
  const wantsDining = requestedSections.includes('/restaurants-nightlife') || turnCuisines.length > 0 || /ужин|ресторан|dinner|restaurant|стейк|steak|مطعم|عشاء|מסעדה|餐厅|レストラン|레스토랑/iu.test(latestUser);
  const crossDining = wantsDining && activeProfile.neighborhood && currMentioned.length === 0
    ? findCrossNeighborhoodDining(activeProfile.neighborhood, effectiveCuisines)
    : Object.assign([], { note: '' });

  const facts = [];
  const seen = new Set();
  const maxFacts = requestedSections.length >= 2 ? 9 : 8;
  const pushSummary = (summary) => {
    if (!summary || !summary.title || facts.length >= maxFacts) return;
    const key = `${summary.title.toLowerCase()}|${summary.price || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    facts.push(summary);
  };

  if (pageEntity && pageEntity.type !== 'Section') pushSummary(pageEntity);
  // Explicitly compared/mentioned venues & cars ALWAYS get full dossiers first
  for (const item of mentioned) pushSummary(summarizeEntity(item, true));
  for (const item of crossDining) pushSummary(summarizeEntity(item, facts.length < 3));

  // Multi-section balance across all 16 languages: when 2+ sections are requested,
  // ensure each requested section has a representative before filling remaining slots.
  if (requestedSections.length >= 2 && currMentioned.length < 3) {
    for (const secHref of requestedSections) {
      if (facts.length >= maxFacts) break;
      if (facts.some((f) => f.section === secHref)) continue;
      const fromRaw = rawMatches.find((item) => sectionOfHref(item.href) === secHref);
      if (fromRaw) {
        pushSummary(summarizeEntity(fromRaw, facts.length < 3));
        continue;
      }
      const sectionHint = secHref === '/yachts' ? 'yacht boat charter' : (displayName(secHref, 'en') || secHref.slice(1));
      const sectionMatches = searchEcosystem(`${latestUser} ${sectionHint}`, {
        locale,
        limit: 6,
        strict: true,
        extraEntities,
        profile: activeProfile
      }).results.filter((item) => (sectionOfHref(item.href) === secHref || (secHref === '/yachts' && item.experienceSection === 'boats')) && (item.href?.split('/').length >= 3 || item.href?.includes('#') || (item.type === 'Yacht' && item.booking)));
      if (sectionMatches[0]) {
        const summary = summarizeEntity(sectionMatches[0], facts.length < 3);
        if (summary) summary.section = secHref;
        pushSummary(summary);
      }
    }
  }

  for (const item of rawMatches) pushSummary(summarizeEntity(item, facts.length < 3));

  const budgetMath = buildBudgetMath({ text: latestUser, facts, profile: activeProfile });
  const allowedPrices = collectAllowedPrices(facts, messages);
  for (const p of budgetMath.derivedPrices) allowedPrices.add(p);

  const needsLogistics = LOGISTICS_TRIGGER.test(latestUser) || Boolean(activeProfile.neighborhood) || facts.some((f) => f.live);

  return {
    pageEntity,
    facts,
    allowedPrices,
    vibes: vibeInfo.vibes,
    vibeNote: vibeInfo.promptNote,
    budgetNote: budgetMath.budgetNote,
    crossNeighborhoodNote: crossDining.note || '',
    logisticsNote: needsLogistics ? MIAMI_LOGISTICS_CAPSULE : ''
  };
}

/**
 * Async Fact Pack builder that runs Cloudflare Workers AI `@cf/baai/bge-m3`
 * multilingual semantic reranking BEFORE assembling the Fact Pack passed to
 * DeepSeek, bounded to <= 450ms and completely fail-safe.
 */
export async function buildFactPackAsync(input = {}, env = null) {
  const opts = Array.isArray(input) ? { messages: input } : (input || {});
  const { messages = [], locale = 'en', extraEntities = [], profile = null, pagePath = '' } = opts;
  const activeProfile = profile || extractTripProfile(messages);
  const userTurns = (Array.isArray(messages) ? messages : [])
    .filter((m) => m?.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content);
  const latestUser = userTurns.at(-1) || '';
  if (!env?.CONCIERGE_AI || env.SEMANTIC_EMBEDDINGS_ENABLED !== 'true' || latestUser.trim().length < 6) {
    return buildFactPack({ ...opts, profile: activeProfile });
  }
  const pageEntity = resolvePageEntity(pagePath, extraEntities);
  const vibeInfo = analyzeSemanticIntent(latestUser);
  const nav = conversationNavigation(messages, { locale });
  const requestedSections = [...new Set([
    ...(nav.cards || []).map((c) => c.href),
    ...(nav.suggestions || []).map((s) => s.href)
  ])].slice(0, 4);
  const topic = requestedSections[0] || pageEntity?.section || '';
  const contextHint = pageEntity && pageEntity.type !== 'Section' ? ` ${pageEntity.title}` : '';
  const query = `${latestUser}${contextHint} ${vibeInfo.searchBoostTerms} ${topic ? displayName(topic, 'en') || '' : ''}`.trim();

  const lexicalCandidates = searchEcosystem(query, {
    locale,
    limit: 14,
    extraEntities,
    profile: activeProfile,
    includeOnRequestCars: true
  }).results
    .map((item, idx) => ({ item, score: semanticConceptScore(item, vibeInfo) - idx * 0.4 }))
    .sort((a, b) => b.score - a.score)
    .map((e) => e.item);

  const reranked = lexicalCandidates.length >= 2
    ? await semanticRerankWithEmbeddings(latestUser, lexicalCandidates, env)
    : lexicalCandidates;

  return buildFactPack({ ...opts, profile: activeProfile, preRankedMatches: reranked });
}
