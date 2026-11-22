// ===========================================================================
// Pre-inference Grounded Fact Pack & Page-Aware Context Resolver.
//
// Builds a compact, verified factual capsule from the site's static + dynamic
// catalog, live TicketNetwork events, the guest's current page pathname, and
// real Miami logistics so Workers AI can compare options, reason about timing
// and budgets, and reference exact verified prices/dates without hallucinating.
// ===========================================================================

import { getEcosystemIndex } from './ecosystemIndex.js';
import { searchEcosystem } from './intent.js';
import { displayName, SECTIONS } from '../aiSuggestions.js';
import { conversationNavigation } from './conversation.mjs';
import { extractTripProfile, parseDailyPrice } from './tripProfile.mjs';

const SECTION_BY_HREF = new Map(SECTIONS.map((s) => [s.href, s]));

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

function summarizeEntity(item) {
  if (!item || typeof item !== 'object') return null;
  const section = sectionOfHref(item.href);
  const price = item.price ? String(item.price).slice(0, 78) : undefined;
  const location = item.neighborhood || (typeof item.subtitle === 'string' ? item.subtitle.slice(0, 70) : undefined);
  const collections = Array.isArray(item.collections) && item.collections.length
    ? item.collections.slice(0, 3)
    : undefined;
  return {
    title: String(item.title || '').slice(0, 96),
    type: item.type || 'Item',
    ...(section ? { section } : {}),
    ...(price ? { price } : {}),
    ...(location ? { location } : {}),
    ...(Number.isFinite(item.capacity) ? { capacity: item.capacity } : {}),
    ...(collections ? { tags: collections } : {}),
    ...(item.booking?.platform ? { partner: item.booking.platform } : {}),
    ...(item.liveEvent ? { live: true } : {})
  };
}

/** Resolve the verified catalog entity or section matching the guest's current page. */
export function resolvePageEntity(pagePath, extraEntities = []) {
  const path = normalizePagePath(pagePath);
  if (!path || path === '/') return null;

  const extra = Array.isArray(extraEntities) ? extraEntities : [];
  const all = extra.length ? [...extra, ...getEcosystemIndex()] : getEcosystemIndex();
  const exact = all.find((item) => item?.href === path);
  if (exact) return summarizeEntity(exact);

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

/** Extract numeric amounts from text or catalog price labels into a Set of integers. */
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
    for (const m of msg.content.matchAll(/(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)/g)) {
      const n = Math.round(Number(m[1].replace(/,/g, '')));
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
  const topic = conversationNavigation(messages, { locale }).cards[0]?.href || pageEntity?.section || '';
  const contextHint = pageEntity && pageEntity.type !== 'Section' ? ` ${pageEntity.title}` : '';
  const query = `${latestUser}${contextHint} ${topic ? displayName(topic, 'en') || '' : ''}`.trim();

  const rawMatches = searchEcosystem(query, {
    locale,
    limit: 6,
    extraEntities,
    profile: activeProfile
  }).results;

  const facts = [];
  const seen = new Set();
  if (pageEntity && pageEntity.type !== 'Section') {
    seen.add(pageEntity.title.toLowerCase());
    facts.push(pageEntity);
  }
  for (const item of rawMatches) {
    const summary = summarizeEntity(item);
    if (!summary || !summary.title) continue;
    const key = `${summary.title.toLowerCase()}|${summary.price || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push(summary);
    if (facts.length >= 5) break;
  }

  const allowedPrices = collectAllowedPrices(facts, messages);
  const needsLogistics = LOGISTICS_TRIGGER.test(latestUser) || Boolean(activeProfile.neighborhood) || facts.some((f) => f.live);

  return {
    pageEntity,
    facts,
    allowedPrices,
    logisticsNote: needsLogistics ? MIAMI_LOGISTICS_CAPSULE : ''
  };
}
