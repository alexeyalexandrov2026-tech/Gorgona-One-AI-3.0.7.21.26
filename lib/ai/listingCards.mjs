// Real catalogue rows for a concierge answer. The model never supplies the title,
// the price, or the link: those come from the same index the site search uses.
import {searchEcosystem} from './intent.js';

const SKIP = new Set(['Destination', 'World', 'Category']);
// Words that describe a mood, not a thing to book. "Something fun" matched the
// Orlando park "Fun Spot America" on the word alone; a vague request gets
// advice from the reply, not a random catalogue row.
const VAGUE = new Set(['something', 'anything', 'fun', 'cool', 'nice', 'good', 'great', 'interesting', 'exciting', 'else', 'other', 'idea', 'ideas', 'thing', 'things', 'do', 'what', 'to', 'a', 'an', 'the', 'some', 'me', 'for', 'please', 'i', 'want', 'need', 'today', 'tonight']);

function isVague(query) {
  const tokens = String(query || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.length > 0 && tokens.every(token => VAGUE.has(token));
}

export function listingCards(query, {locale = 'en', limit = 3} = {}) {
  if (isVague(query)) return [];
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 4) : 3;
  const {results} = searchEcosystem(query, {locale, limit: 8});
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
      ...(item.subtitle ? {summary: item.subtitle} : {})
    });
    if (cards.length >= size) break;
  }
  return cards;
}
