// Real catalogue rows for a concierge answer. The model never supplies the title,
// the price, or the link: those come from the same index the site search uses.
import {searchEcosystem} from './intent.js';
import {diningFilterFor, diningCollectionFor} from '../dining/filters.mjs';

const SKIP = new Set(['Destination', 'World', 'Category']);
// Words that describe a mood, not a thing to book. "Something fun" matched the
// Orlando park "Fun Spot America" on the word alone; a vague request gets
// advice from the reply, not a random catalogue row.
const VAGUE = new Set(['something', 'anything', 'fun', 'cool', 'nice', 'good', 'great', 'interesting', 'exciting', 'else', 'other', 'idea', 'ideas', 'thing', 'things', 'do', 'what', 'to', 'a', 'an', 'the', 'some', 'me', 'for', 'please', 'i', 'want', 'need', 'today', 'tonight']);

function isVague(query) {
  const tokens = String(query || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.length > 0 && tokens.every(token => VAGUE.has(token));
}

const belongs = (href, root) => href === root || href.startsWith(root + '/');

/**
 * Catalogue rows for the guest's words. Strict search: a row must be named or
 * sit in a section the guest asked for, and a bare number never matches a
 * price. With `sections`, only rows inside those sections are kept.
 */
export function listingCards(query, {locale = 'en', limit = 3, sections = null} = {}) {
  if (isVague(query)) return [];
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 4) : 3;
  const {results: found} = searchEcosystem(query, {locale, limit: 8, strict: true});
  const inSections = Array.isArray(sections) ? found.filter(item => sections.some(root => belongs(item?.href || '', root))) : found;
  // "Michelin", "romantic", "cheap": venue rows must come from that collection,
  // so a name that merely contains "Restaurant" is not offered as a Michelin pick.
  const collection = diningCollectionFor(query);
  const results = collection ? inSections.filter(item => !item?.booking || (item.collections || []).includes(collection)) : inSections;
  const cards = [];
  const seen = new Set();
  for (const item of results) {
    if (!item?.href || SKIP.has(item.type) || item.href.split('/').length < 3) continue;
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    cards.push({
      href: item.href,
      title: item.title,
      label: item.type,
      ...(item.image ? {image: item.image} : {}),
      ...(item.price ? {price: String(item.price)} : {}),
      ...(item.subtitle ? {summary: item.subtitle} : {}),
      // Restaurants and nightlife: the venue's own booking page (or Maps) and the
      // directory filter that matches the guest's words. The chat never books.
      ...(item.booking ? {booking: {...item.booking}, more: diningFilterFor(query)} : {})
    });
    if (cards.length >= size) break;
  }
  return cards;
}

// Actions that recommend something bookable; everything else (handoff,
// clarify, unsupported, itineraries, facts) gets no catalogue rows.
const LISTING_ACTIONS = new Set(['recommend', 'consult']);

/**
 * Listing rows for a resolved turn: only for a recommend or consult action,
 * and only from the sections the final answer shows.
 */
export function gatedListings(query, {locale = 'en', action, sections = []} = {}) {
  if (!LISTING_ACTIONS.has(action) || !Array.isArray(sections) || !sections.length) return [];
  return listingCards(query, {locale, sections});
}
