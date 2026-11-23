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
import { searchEcosystem } from './intent.js';
import { displayName, SECTIONS } from '../aiSuggestions.js';
import { conversationNavigation } from './conversation.mjs';
import { extractTripProfile, parseDailyPrice } from './tripProfile.mjs';
import { getVenues } from '../restaurantsNightlifeData.js';
import { getRentals } from '../rentalsData.js';
import { detectSemanticVibes } from './semanticVibes.mjs';
import { buildBudgetMath } from './budgetEstimator.mjs';

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

/** Validate and normalize an internal site pathname (zero query/hash/external URLs). */
export function normalizePagePath(raw) {
  if (typeof raw !== 'string') return '';
  const clean = raw.split(/[?#]/)[0].trim();
  if (!clean || clean.length > 160) return '';
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(clean) || clean.includes('..') || clean.includes('//')) return '';
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
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
export function extractMentionedEntities(text, extraEntities = []) {
  const lower = String(text || '').toLowerCase();
  if (lower.length < 4) return [];
  const pool = [...(Array.isArray(extraEntities) ? extraEntities : []), ...getEcosystemIndex()];
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
      if (matches.length >= 4) break;
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

/**
 * Build the compact Grounded Fact Pack passed to Workers AI and the Fact Guard.
 */
export function buildFactPack({ messages = [], locale = 'en', extraEntities = [], profile = null, pagePath = '' } = {}) {
  const activeProfile = profile || extractTripProfile(messages);
  const latestUser = [...(Array.isArray(messages) ? messages : [])]
    .reverse()
    .find((m) => m?.role === 'user' && typeof m.content === 'string')?.content || '';
  const pageEntity = resolvePageEntity(pagePath, extraEntities);
  const vibeInfo = detectSemanticVibes(latestUser);
  const mentioned = extractMentionedEntities(latestUser, extraEntities);
  const topic = conversationNavigation(messages, { locale }).cards[0]?.href || pageEntity?.section || '';
  const contextHint = pageEntity && pageEntity.type !== 'Section' ? ` ${pageEntity.title}` : '';
  const query = `${latestUser}${contextHint} ${vibeInfo.searchBoostTerms} ${topic ? displayName(topic, 'en') || '' : ''}`.trim();

  const rawMatches = searchEcosystem(query, {
    locale,
    limit: 6,
    extraEntities,
    profile: activeProfile
  }).results;

  const facts = [];
  const seen = new Set();
  const maxFacts = mentioned.length >= 3 ? 4 : 5;
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
  for (const item of rawMatches) pushSummary(summarizeEntity(item, facts.length < 2));

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
    logisticsNote: needsLogistics ? MIAMI_LOGISTICS_CAPSULE : ''
  };
}
