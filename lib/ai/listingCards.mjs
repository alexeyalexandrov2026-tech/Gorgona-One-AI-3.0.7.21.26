// Real catalogue rows for a concierge answer. The model never supplies the title,
// the price, or the link: those come from the same index the site search uses.
import {searchEcosystem} from './intent.js';

const SKIP = new Set(['Destination', 'World', 'Category']);

export function listingCards(query, {locale = 'en', limit = 3} = {}) {
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
