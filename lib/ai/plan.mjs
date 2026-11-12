// A plan is a set of real catalogue items for two or more sections the guest
// named in one message ("a yacht on Saturday, dinner and a car"). Items are
// picked from the catalogue, never from model text, so a plan cannot contain
// a yacht or a restaurant that does not exist. Pure: the caller supplies the catalogue.
import { matchActionCards } from '../aiSuggestions.js';
import { followup } from './conversation.mjs';
import { PLAN_SECTIONS, PLAN_LIMITS } from '../planRules.mjs';

const STOP = new Set(['the','and','for','with','want','need','find','show','please','looking','some','this','that','from','miami','plan','weekend','day','days','night','nights','also','then','our','your']);
const PARTY = /(?:\bfor\s+(\d{1,2})\b|\b(\d{1,2})\s*(?:people|guests?|pax|persons?|personas|personnes|personen|persone|pessoas|osób|osoby|kişi)\b|(\d{1,2})\s*(?:человек|гостей|гостя|гості|осіб|אורחים|نفر|أشخاص|人|名|명))/iu;
const norm = value => String(value ?? '').normalize('NFKC').toLowerCase();

const ORDER = Object.keys(PLAN_SECTIONS);
/** Sections of a message that can join a plan, in one fixed order: yacht, villa, car, restaurant. */
export function planSections(text, locale) {
  return matchActionCards(String(text || ''), { limit:8, locale }).filter(card => PLAN_SECTIONS[card.href])
    .sort((a, b) => ORDER.indexOf(a.href) - ORDER.indexOf(b.href)).slice(0, PLAN_LIMITS.sections);
}

/**
 * The text a plan is built from: the newest message when it names two or
 * more plan sections, or a short follow-up ("for 6 people") joined to the
 * most recent message that did. Otherwise there is no plan.
 */
export function planQuery(messages) {
  const turns = (Array.isArray(messages) ? messages : []).filter(m => m?.role === 'user' && typeof m.content === 'string');
  const latest = turns.at(-1)?.content || '';
  if (planSections(latest).length >= 2) return latest;
  if (!latest || latest.length > 300 || !followup.test(latest)) return null;
  for (let i = turns.length - 2; i >= 0; i--) if (planSections(turns[i].content).length >= 2) return turns[i].content + ' ' + latest;
  return null;
}

export function partySize(text) {
  const match = String(text || '').match(PARTY);
  const value = match ? Number(match[1] || match[2] || match[3]) : null;
  return value >= 1 && value <= 99 ? value : null;
}

function rank(items, query, guests) {
  const tokens = [...new Set(norm(query).split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 3 && !STOP.has(token)))];
  return items
    .map((item, order) => {
      if (guests && Number.isInteger(item.capacity) && item.capacity < guests) return null;
      const title = norm(item.title), text = norm(item.text);
      let score = 0;
      for (const token of tokens) { if (title.includes(token)) score += 4; if (text.includes(token)) score += 2; }
      if (item.featured) score += 1;
      if (item.image) score += 0.5;
      return { item, score, order };
    })
    .filter(Boolean)
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
  const guests = partySize(query);
  const sections = [];
  for (const section of planSections(query, locale)) {
    const kind = PLAN_SECTIONS[section.href];
    const candidates = rank(Array.isArray(catalog[kind]) ? catalog[kind] : [], query, guests).slice(0, PLAN_LIMITS.candidates);
    if (!candidates.length) continue;
    sections.push({
      href: section.href,
      label: section.label || section.title,
      candidates: candidates.map(item => ({
        kind: item.kind || kind, slug: item.slug, title: item.title,
        ...(item.subtitle ? { subtitle: item.subtitle } : {}), ...(item.image ? { image: item.image } : {}),
        href: section.href + '/' + item.slug
      }))
    });
  }
  return sections.length >= 2 ? { version:1, guests, sections, requestable:Boolean(requestable) } : null;
}
