// A plan is a set of real catalogue items for two or more sections the guest
// named in one message ("a yacht on Saturday, dinner and a car"). Items are
// picked from the catalogue, never from model text, so a plan cannot contain
// a yacht or a restaurant that does not exist. Pure: the caller supplies the catalogue.
import { matchActionCards } from '../aiSuggestions.js';
import { followup } from './conversation.mjs';
import { PLAN_SECTIONS, PLAN_LIMITS } from '../planRules.mjs';
import {
  extractTripProfile,
  neighborhoodProximity,
  parseDailyPrice,
  parseNumberWord,
  partySize
} from './tripProfile.mjs';
import { analyzeSemanticIntent, semanticConceptScore } from './semanticSearch.mjs';
import { extractTripDays } from './budgetEstimator.mjs';

export { parseNumberWord, partySize };

const STOP = new Set(['the','and','for','with','want','need','find','show','please','looking','some','this','that','from','miami','plan','weekend','day','days','night','nights','also','then','our','your']);
const norm = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е');
const SPLIT_OR_PACKAGE_RE = /\bsplit[\s-]?pay\b|\bsplit\b|раздел\p{L}*\s+оплат|пополам|на\s+человека|per\s+person|per\s+guest|сколько\s+(?:выйдет|стоит)|estimate|total\s+(?:cost|price)|уикенд|выходн|weekend/iu;

const ORDER = Object.keys(PLAN_SECTIONS);
/** Sections of a message that can join a plan, in one fixed order: yacht, villa, car, restaurant. */
export function planSections(text, locale) {
  return matchActionCards(String(text || ''), { limit: 8, locale }).filter(card => PLAN_SECTIONS[card.href])
    .sort((a, b) => ORDER.indexOf(a.href) - ORDER.indexOf(b.href)).slice(0, PLAN_LIMITS.sections);
}

function isSingleCarPackageQuery(text, profile) {
  const secs = planSections(text);
  if (secs.length !== 1 || secs[0].href !== '/rentals') return false;
  const days = extractTripDays(text, profile);
  const guests = partySize(text) || profile?.guests || null;
  return Boolean((days && days >= 2) || (guests && guests >= 2) || SPLIT_OR_PACKAGE_RE.test(text));
}

/**
 * The text a plan is built from: the newest message when it names two or
 * more plan sections, a single-car multi-day/group Split-Pay package inquiry,
 * or a short follow-up ("for 6 people") joined to the most recent message that did.
 */
export function planQuery(messages) {
  const turns = (Array.isArray(messages) ? messages : []).filter(m => m?.role === 'user' && typeof m.content === 'string');
  const latest = turns.at(-1)?.content || '';
  if (planSections(latest).length >= 2) return latest;
  const profile = extractTripProfile(messages);
  if (isSingleCarPackageQuery(latest, profile)) return latest;
  if (!latest || latest.length > 300 || !followup.test(latest)) return null;
  for (let i = turns.length - 2; i >= 0; i--) {
    if (planSections(turns[i].content).length >= 2) return turns[i].content + ' ' + latest;
    if (isSingleCarPackageQuery(turns[i].content + ' ' + latest, profile)) return turns[i].content + ' ' + latest;
  }
  return null;
}

function rank(items, query, { guests = null, neighborhood = null, maxDailyBudget = null, cheapest = false, kind = '', semanticIntent = null } = {}) {
  const tokens = [...new Set(norm(query).split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 3 && !STOP.has(token)))];
  let pool = items.filter((item) => !(guests && Number.isInteger(item.capacity) && item.capacity < guests));

  // Apply numeric daily budget ceiling on cars when matching options exist within budget.
  if (kind === 'car' && maxDailyBudget) {
    const withinBudget = pool.filter((item) => {
      const p = parseDailyPrice(item.price);
      return p !== null && p <= maxDailyBudget;
    });
    if (withinBudget.length) pool = withinBudget;
  }

  return pool
    .map((item, order) => {
      const title = norm(item.title), text = norm(item.text);
      let score = 0;
      for (const token of tokens) { if (title.includes(token)) score += 4; if (text.includes(token)) score += 2; }
      if (semanticIntent) score += semanticConceptScore(item, semanticIntent);
      if (neighborhood && (kind === 'dining' || kind === 'nightlife')) {
        const candidateHood = item.neighborhood || (typeof item.subtitle === 'string' ? item.subtitle.replace(/,\s*FL$/i, '').trim() : '');
        const prox = neighborhoodProximity(neighborhood, candidateHood);
        if (prox > 0) score += prox === 1 ? 8 : prox * 6;
      }
      if (kind === 'car' && (cheapest || maxDailyBudget)) {
        const p = parseDailyPrice(item.price);
        if (p !== null) {
          score += cheapest ? Math.max(0, 6 - p / 500) : (maxDailyBudget && p <= maxDailyBudget ? 2 : 0);
        }
      }
      if (item.featured) score += 1;
      if (item.image) score += 0.5;
      return { item, score, order };
    })
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(entry => entry.item);
}

/**
 * @param {Array<{role:string,content:string}>} messages
 * @param {{catalog:Record<string,Array<object>>, locale?:string, requestable?:boolean}} options
 *   catalog keys: yacht, stay, car, dining (restaurants and nightlife, already
 *   limited to items that can be requested on the site).
 */
export function buildPlan(messages, { catalog, locale = 'en', requestable = false } = {}) {
  const query = planQuery(messages);
  if (!query || !catalog) return null;
  const profile = extractTripProfile(messages);
  const semanticIntent = analyzeSemanticIntent(query);
  const guests = partySize(query) || profile.guests;
  const sections = [];
  for (const section of planSections(query, locale)) {
    const kind = PLAN_SECTIONS[section.href];
    const candidates = rank(Array.isArray(catalog[kind]) ? catalog[kind] : [], query, {
      guests,
      neighborhood: profile.neighborhood,
      maxDailyBudget: profile.maxDailyBudget,
      cheapest: profile.cheapest,
      kind,
      semanticIntent
    }).slice(0, PLAN_LIMITS.candidates);
    if (!candidates.length) continue;
    sections.push({
      href: section.href,
      label: section.label || section.title,
      candidates: candidates.map(item => ({
        kind: item.kind || kind, slug: item.slug, title: item.title,
        ...(item.subtitle ? { subtitle: item.subtitle } : {}), ...(item.image ? { image: item.image } : {}),
        ...(item.price ? { price: item.price } : {}),
        ...(item.booking ? { booking: { ...item.booking } } : {}),
        href: section.href + '/' + item.slug
      }))
    });
  }
  const isSingleCar = sections.length === 1 && sections[0].href === '/rentals' && isSingleCarPackageQuery(query, profile);
  if (sections.length < 2 && !isSingleCar) return null;
  return {
    version: 1,
    guests,
    sections,
    requestable: Boolean(requestable),
    ...(isSingleCar ? { singleCarPackage: true } : {})
  };
}
