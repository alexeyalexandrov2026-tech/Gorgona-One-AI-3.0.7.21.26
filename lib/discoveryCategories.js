// Category model for the AI Discovery Sphere (Popular Categories homepage section).
//
// The 19 discovery entry points are grouped into five constellations plus a
// Concierge core so the sphere never shows all labels at once — constellation
// names surface at rest, individual categories reveal on approach / intent.
//
// Every `href` resolves to a route that already exists in `app/` (verified against
// the app directory and `lib/ecosystemData.js`). The `keywords` power the Phase 1
// client-side keyword router in CategoryOrb (typed query -> best matching entry);
// there is no AI backend in Phase 1.

// `color` = base tone (legend dots, light-mode particles); `glow` = the brighter
// emissive tone used by the V2 dark-mode additive glow sprites.
export const CONSTELLATIONS = [
  { id: 'travel', key: 'travel', name: 'World of Travel', color: [198, 160, 94], glow: [255, 224, 150] },
  { id: 'drive', key: 'drive', name: 'Drive & Sail', color: [185, 138, 70], glow: [255, 206, 128] },
  { id: 'style', key: 'style', name: 'Style & Shop', color: [216, 180, 120], glow: [255, 232, 170] },
  { id: 'play', key: 'play', name: 'Play & Win', color: [169, 130, 63], glow: [248, 198, 120] },
  { id: 'taste', key: 'taste', name: 'Table & Taste', color: [203, 168, 103], glow: [255, 220, 150] },
  { id: 'concierge', key: 'concierge', name: 'Concierge', color: [138, 101, 40], glow: [230, 180, 110] }
];

export const discoveryCategories = [
  // World of Travel
  { key: 'travel', label: 'Travel', href: '/travel', cluster: 'travel', keywords: ['travel', 'trip', 'vacation', 'holiday', 'getaway', 'journey', 'путешествие', 'поездка', 'отдых', 'каникулы', 'viaje', 'viajes', 'vacaciones', 'voyage', 'vacances', 'נסיעות', 'חופשה'] },
  { key: 'flights', label: 'Flights', href: '/travel', cluster: 'travel', keywords: ['flight', 'flights', 'fly', 'airline', 'airfare', 'plane', 'билет', 'билеты', 'авиабилет', 'рейс', 'перелет', 'самолет', 'vuelo', 'vuelos', 'billete', 'avión', 'vol', 'vols', 'billet', 'avion', 'טיסה', 'טיסות', 'כרטיס'] },
  { key: 'hotels', label: 'Hotels', href: '/vacation-rentals', cluster: 'travel', keywords: ['hotel', 'hotels', 'stay', 'resort', 'suite', 'room', 'miami beach', 'отель', 'гостиница', 'жилье', 'проживание', 'вилла', 'hotel', 'hoteles', 'alojamiento', 'villa', 'hôtel', 'hébergement', 'מלון', 'מלונות', 'וילה'] },
  { key: 'carRentals', label: 'Car Rentals', href: '/rentals', cluster: 'travel', keywords: ['car rental', 'rent a car', 'rental', 'hire car', 'машина', 'авто', 'аренда', 'coche', 'auto', 'alquiler', 'voiture', 'location', 'רכב', 'מכונית', 'השכרה'] },

  // Drive & Sail
  { key: 'cars', label: 'Cars', href: '/rentals', cluster: 'drive', keywords: ['car', 'cars', 'lamborghini', 'ferrari', 'supercar', 'exotic', 'drive', 'porsche', 'rolls royce', 'машина', 'машину', 'авто', 'аренда', 'coche', 'auto', 'alquiler', 'voiture', 'location', 'רכב', 'מכונית'] },
  { key: 'yachts', label: 'Yachts', href: '/yachts', cluster: 'drive', keywords: ['yacht', 'yachts', 'boat', 'charter', 'sail', 'marine', 'catamaran', 'яхта', 'катер', 'лодка', 'аренда яхт', 'yate', 'barco', 'alquiler de yates', 'yacht', 'bateau', 'location de yacht', 'יאכטה', 'סירה'] },

  // Style & Shop
  { key: 'shopping', label: 'Shopping', href: '/stores', cluster: 'style', keywords: ['shopping', 'shop', 'stores', 'buy', 'retail', 'шопинг', 'магазины', 'покупки', 'compras', 'tienda', 'shopping', 'boutique', 'achats', 'קניות', 'חנות'] },
  { key: 'fashion', label: 'Fashion', href: '/stores/fashion', cluster: 'style', keywords: ['fashion', 'clothes', 'clothing', 'apparel', 'style', 'designer', 'wear', 'мода', 'одежда', 'стиль', 'moda', 'ropa', 'estilo', 'mode', 'vêtements', 'אופנה', 'בגדים'] },
  { key: 'beauty', label: 'Beauty', href: '/stores/beauty', cluster: 'style', keywords: ['beauty', 'skincare', 'cosmetics', 'makeup', 'wellness', 'spa', 'красота', 'косметика', 'уход', 'belleza', 'cosméticos', 'beauté', 'cosmétiques', 'יופי', 'קוסמטיקה'] },
  { key: 'electronics', label: 'Electronics', href: '/stores/electronics', cluster: 'style', keywords: ['electronics', 'tech', 'gadget', 'phone', 'laptop', 'device', 'gaming', 'электроника', 'техника', 'гаджеты', 'electrónica', 'tecnología', 'électronique', 'technologie', 'אלקטרוניקה', 'טכנולוגיה'] },

  // Play & Win
  { key: 'entertainment', label: 'Entertainment', href: '/entertainment', cluster: 'play', keywords: ['entertainment', 'streaming', 'movie', 'cinema', 'music', 'show', 'развлечения', 'кино', 'музыка', 'entretenimiento', 'cine', 'música', 'divertissement', 'cinéma', 'musique', 'בידור', 'קולנוע', 'מוזיקה'] },
  { key: 'events', label: 'Events', href: '/events', cluster: 'play', keywords: ['event', 'events', 'nightlife', 'concert', 'party', 'vip', 'club', 'событие', 'мероприятие', 'билет', 'вечеринка', 'клуб', 'evento', 'eventos', 'fiesta', 'club', 'événement', 'fête', 'אירוע', 'מסיבה'] },
  { key: 'sports', label: 'Sports', href: '/stores/sport', cluster: 'play', keywords: ['sport', 'sports', 'fitness', 'gym', 'athletic', 'workout', 'спорт', 'фитнес', 'тренировка', 'deporte', 'deportes', 'fitness', 'sport', 'ספורט', 'כושר'] },
  { key: 'sportsbooks', label: 'Sportsbooks', href: '/sportsbook', cluster: 'play', keywords: ['sportsbook', 'sportsbooks', 'betting', 'bet', 'bonus', 'odds', 'wager', 'ставки', 'букмекер', 'бонус', 'apuesta', 'apuestas', 'bono', 'paris', 'bonus', 'הימורים', 'בונוס'] },

  // Table & Taste
  { key: 'food', label: 'Food', href: '/stores/food', cluster: 'taste', keywords: ['food', 'grocery', 'delivery', 'meal', 'snack', 'еда', 'продукты', 'доставка', 'comida', 'entrega', 'nourriture', 'livraison', 'אוכל', 'משלוח'] },
  { key: 'restaurants', label: 'Restaurants', href: '/stores/restaurants', cluster: 'taste', keywords: ['restaurant', 'restaurants', 'dining', 'dinner', 'eat', 'cafe', 'cuisine', 'ресторан', 'кафе', 'ужин', 'рестораны', 'restaurante', 'restaurantes', 'cena', 'restaurant', 'dîner', 'מסעדה', 'מסעדות'] },

  // Concierge core
  { key: 'concierge', label: 'Concierge', href: '/concierge', cluster: 'concierge', keywords: ['concierge', 'assistant', 'help', 'recommend', 'ai', 'plan', 'book', 'консьерж', 'помощь', 'ии', 'conserje', 'ayuda', 'ia', 'concierge', 'aide', 'קונסיירז', 'עזרה'] },
  { key: 'promoCodes', label: 'Promo Codes', href: '/coupons', cluster: 'concierge', keywords: ['promo', 'promo code', 'code', 'coupon', 'voucher', 'discount code', 'промокод', 'код', 'купон', 'código', 'cupón', 'code promo', 'קוד קופון', 'קופון'] },
  { key: 'deals', label: 'Deals', href: '/deals', cluster: 'concierge', keywords: ['deal', 'deals', 'discount', 'offer', 'sale', 'savings', 'cheap', 'скидка', 'скидки', 'акция', 'предложение', 'descuento', 'oferta', 'réduction', 'offre', 'הנחה', 'מבצע'] }
];

// The four rotating example prompts shown as the Concierge placeholder.
export const EXAMPLE_PROMPTS = [
  'Find me a Lamborghini in Miami',
  'Show yacht rentals under $5,000',
  'Best sportsbook bonuses tonight',
  'Luxury hotels in Miami Beach'
];

// Phase 1 keyword router: score each category by how well the free-text query
// matches its keywords/label, return the best matches (highest score first).
// Purely client-side — no network, no AI service.
export function matchCategories(query, limit = 4) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = discoveryCategories.map((cat) => {
    let score = 0;
    const label = cat.label.toLowerCase();
    if (label === q) score += 12;
    else if (q.includes(label) || label.includes(q)) score += 6;

    for (const kw of cat.keywords) {
      if (q.includes(kw)) score += kw.includes(' ') ? 5 : 3;
      else if (tokens.some((tok) => tok === kw)) score += 3;
      else if (tokens.some((tok) => tok.length > 3 && kw.startsWith(tok))) score += 1;
    }
    return { cat, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.cat);
}
