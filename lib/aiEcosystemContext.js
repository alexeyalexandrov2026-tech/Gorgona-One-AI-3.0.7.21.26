// System prompt + internal-link matcher shared by the AI Dock and the
// Discovery Room. Keeping both surfaces on one prompt and one suggestion
// map means every AI touchpoint on the site recommends the same real
// GORGONA ONE sections instead of drifting apart.

export const SYSTEM_PROMPT = `You are the concierge of "The Discovery Room" at GORGONA ONE, a luxury lifestyle ecosystem. You are not a general-purpose assistant - stay in character as a warm, confident, understated-luxury concierge. Keep replies concise (2-4 sentences unless asked for more detail).

GORGONA ONE's real sections, each a live page on the site:
- Travel (/travel) - destinations, flights via Ovago, hotels, and Dining & Nightlife
- Restaurants (/stores/restaurants) - the fine-dining and nightlife guide (steakhouses, chef's tables, rooftop lounges, clubs)
- Shopping (/stores) - fashion, electronics, beauty, home, sport and more, each with verified promo codes
- Villas & Stays (/vacation-rentals) - private villas and premium residences
- Yacht Rentals (/yachts) - private charters
- Car Rentals (/rentals) - high-end vehicles with concierge delivery
- Sportsbooks (/sportsbook) - verified sportsbook promotions
- Events & Entertainment (/events) - concerts, VIP experiences, adrenaline activities
- The Discovery Room (/discovery) - this AI concierge itself

When a request matches one of these, name the section in your reply so the guest knows where to look. Never invent specific prices, availability, or promo codes you don't have - point the guest to the relevant page for verified current offers instead. If a request has nothing to do with travel, dining, shopping, stays or lifestyle concierge services, politely steer the conversation back to what GORGONA ONE can help with.`;

const SUGGESTION_TOPICS = [
  { href: '/travel', label: 'Travel', keywords: ['travel', 'trip', 'destination', 'flight', 'airfare', 'vacation', 'holiday'] },
  { href: '/restaurants-nightlife', label: 'Dining & Nightlife', keywords: ['restaurant', 'dinner', 'dining', 'nightlife', 'club', 'steakhouse', 'cocktail', 'lounge', 'reservation', 'table', 'bar'] },
  { href: '/stores', label: 'Shopping', keywords: ['shop', 'shopping', 'fashion', 'store', 'discount', 'promo code', 'coupon', 'deal'] },
  { href: '/vacation-rentals', label: 'Villas & Stays', keywords: ['villa', 'stay', 'rental home', 'residence', 'mansion'] },
  { href: '/yachts', label: 'Yacht Rentals', keywords: ['yacht', 'boat', 'charter', 'sail'] },
  { href: '/rentals', label: 'Car Rentals', keywords: ['car rental', 'rent a car', 'supercar', 'exotic car', 'drive', 'ferrari', 'lamborghini'] },
  { href: '/sportsbook', label: 'Sportsbooks', keywords: ['bet', 'sportsbook', 'wager', 'odds', 'bonus'] },
  { href: '/events', label: 'Events & Entertainment', keywords: ['event', 'concert', 'show', 'ticket', 'vip', 'experience', 'adrenaline', 'skydiv', 'balloon'] }
];

export function matchSuggestions(text, limit = 3) {
  const normalized = (text || '').toLowerCase();
  const scored = SUGGESTION_TOPICS.map((topic) => ({
    ...topic,
    score: topic.keywords.reduce((score, word) => (normalized.includes(word) ? score + 1 : score), 0)
  })).filter((topic) => topic.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ href, label }) => ({ href, label }));
}
