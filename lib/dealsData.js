const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const brandsByCategory = {
  shopping: [
    { name: 'Amazon', domain: 'amazon.com', discount: 'Up to 40% off', promoCode: '', featured: true, logoExt: 'png' },
    { name: 'Target', domain: 'target.com', discount: 'Free shipping', promoCode: 'SAVE10', featured: false },
    { name: 'Best Buy', domain: 'bestbuy.com', discount: 'Limited-time offer', promoCode: '', featured: false },
    { name: 'Newegg', domain: 'newegg.com', discount: 'Flash sale', promoCode: 'TECH15', featured: false },
    { name: 'Macy’s', domain: 'macys.com', discount: 'Seasonal discounts', promoCode: '', featured: false },
    { name: 'Nordstrom', domain: 'nordstrom.com', discount: 'Gift with purchase', promoCode: 'STYLE20', featured: false, logoExt: 'webp' },
    { name: 'Etsy', domain: 'etsy.com', discount: 'Crafted savings', promoCode: 'HANDMADE', featured: false, logoExt: 'webp' },
    { name: 'Kinetix Casual Luxury', domain: 'kxclothing.com', discount: 'New season styles', promoCode: '', featured: true, affiliateLink: 'https://www.awin1.com/cread.php?awinmid=53985&awinaffid=2982101&ued=https%3A%2F%2Fkxclothing.com%2F', website: 'https://kxclothing.com/' }
  ],
  fashion: [
    { name: 'Nike', domain: 'nike.com', discount: '25% off', promoCode: 'NIKE25', featured: true, logoExt: 'png' },
    { name: 'Adidas', domain: 'adidas.com', discount: '20% off', promoCode: 'ADI20', featured: true, logoExt: 'png' },
    { name: 'Zara', domain: 'zara.com', discount: 'Free express shipping', promoCode: '', featured: false },
    { name: 'H&M', domain: 'hm.com', discount: 'Buy 2 save 15%', promoCode: 'HM15', featured: false },
    { name: 'Shein', domain: 'shein.com', discount: 'New customer offer', promoCode: 'SHEIN10', featured: false },
    { name: 'ASOS', domain: 'asos.com', discount: 'Student discount', promoCode: 'ASOS15', featured: false },
    { name: 'Levi’s', domain: 'levi.com', discount: 'Sitewide savings', promoCode: '', featured: false },
    { name: 'Puma', domain: 'puma.com', discount: 'Sport style offers', promoCode: 'PUMA10', featured: false },
    { name: 'Uniqlo', domain: 'uniqlo.com', discount: 'Limited seasonal drop', promoCode: '', featured: false },
    { name: 'Gap', domain: 'gap.com', discount: 'App-only coupons', promoCode: 'GAP10', featured: false }
  ],
  electronics: [
    { name: 'Apple', domain: 'apple.com', discount: 'Trade-in bonus', promoCode: '', featured: true, logoExt: 'png' },
    { name: 'Samsung', domain: 'samsung.com', discount: 'Up to 20% off', promoCode: '', featured: true, logoExt: 'png' },
    { name: 'Dell', domain: 'dell.com', discount: 'Student bundles', promoCode: 'DELL10', featured: false },
    { name: 'Lenovo', domain: 'lenovo.com', discount: 'Premium laptop deals', promoCode: '', featured: false },
    { name: 'HP', domain: 'hp.com', discount: 'Printer savings', promoCode: 'HPPRINT', featured: false },
    { name: 'Sony', domain: 'sony.com', discount: 'Home audio offers', promoCode: '', featured: false },
    { name: 'Logitech', domain: 'logitech.com', discount: 'Accessory bundles', promoCode: 'LOGI15', featured: false },
    { name: 'Bose', domain: 'bose.com', discount: 'Sound bundle deals', promoCode: '', featured: false },
    { name: 'Razer', domain: 'razer.com', discount: 'Gaming gear promo', promoCode: 'RAZER10', featured: false },
    { name: 'Microsoft', domain: 'microsoft.com', discount: 'Surface savings', promoCode: 'MICROSOFT', featured: false }
  ],
  beauty: [
    { name: 'Sephora', domain: 'sephora.com', discount: 'Free sample bundle', promoCode: '', featured: true, logoExt: 'png' },
    { name: 'Ulta Beauty', domain: 'ulta.com', discount: 'Buy 2 get 1 free', promoCode: 'ULTA15', featured: true },
    { name: 'MAC Cosmetics', domain: 'maccosmetics.com', discount: 'VIP beauty bundles', promoCode: '', featured: false },
    { name: 'Clinique', domain: 'clinique.com', discount: 'Skincare starter set', promoCode: 'CLINIQUE', featured: false },
    { name: 'Estée Lauder', domain: 'esteelauder.com', discount: 'Gift with purchase', promoCode: '', featured: false },
    { name: 'L’Oréal', domain: 'loreal.com', discount: 'Color care offers', promoCode: 'LOREAL10', featured: false },
    { name: 'NYX', domain: 'nyxcosmetics.com', discount: 'Makeup bundle deals', promoCode: '', featured: false },
    { name: 'The Ordinary', domain: 'theordinary.com', discount: 'Skincare essentials', promoCode: 'ORDINARY10', featured: false },
    { name: 'Glossier', domain: 'glossier.com', discount: 'Accessorize and save', promoCode: 'GLOSSIER', featured: false },
    { name: 'Bumble and bumble', domain: 'bumbleandbumble.com', discount: 'Styling savings', promoCode: '', featured: false }
  ],
  home: [
    { name: 'IKEA', domain: 'ikea.com', discount: 'Home refresh offers', promoCode: '', featured: true },
    { name: 'Wayfair', domain: 'wayfair.com', discount: 'Free shipping', promoCode: 'WAYFAIR', featured: true },
    { name: 'Home Depot', domain: 'homedepot.com', discount: 'Free delivery', promoCode: '', featured: false },
    { name: 'Lowe’s', domain: 'lowes.com', discount: 'Spring project savings', promoCode: 'LOWES10', featured: false },
    { name: 'Ashley Furniture', domain: 'ashleyfurniture.com', discount: 'Furniture bundle offer', promoCode: '', featured: false },
    { name: 'West Elm', domain: 'westelm.com', discount: 'Home decor discounts', promoCode: 'WESTELM', featured: false },
    { name: 'Crate & Barrel', domain: 'crateandbarrel.com', discount: 'Designer home offers', promoCode: '', featured: false },
    { name: 'Pottery Barn', domain: 'potterybarn.com', discount: 'Holiday decor savings', promoCode: 'POTTERY15', featured: false },
    { name: 'CB2', domain: 'cb2.com', discount: 'Modern home deals', promoCode: '', featured: false },
    { name: 'Allmodern', domain: 'allmodern.com', discount: 'Smart home savings', promoCode: 'MODERN10', featured: false }
  ],
  // Logo files for this category are official Brandfetch-sourced assets
  // (see public/images/brands/*-travel.webp) - Brandfetch serves these as
  // WebP rather than the requested SVG, hence the logoExt override below.
  travel: [
    { name: 'Airbnb', domain: 'airbnb.com', discount: 'Stay longer discounts', promoCode: '', featured: false, logoExt: 'webp' },
    { name: 'Delta Air Lines', domain: 'delta.com', discount: 'Flexible fare offers', promoCode: 'DELTA10', featured: false, logoExt: 'webp' },
    { name: 'United Airlines', domain: 'united.com', discount: 'Seat upgrade offers', promoCode: '', featured: false, logoExt: 'webp' },
    { name: 'Hilton', domain: 'hilton.com', discount: 'Free breakfast', promoCode: 'HILTON', featured: false, logoExt: 'webp' },
    { name: 'Marriott', domain: 'marriott.com', discount: 'Weekend getaway deals', promoCode: '', featured: false, logoExt: 'webp' },
    { name: 'Kayak', domain: 'kayak.com', discount: 'Flight fare alerts', promoCode: '', featured: false, logoExt: 'webp' },
    { name: 'Viator', domain: 'viator.com', discount: 'Tours and attraction deals', promoCode: 'VIATOR', featured: false, logoExt: 'webp' }
  ],
  sport: [
    { name: 'Nike', domain: 'nike.com', discount: 'Athlete essentials', promoCode: 'SPORT25', featured: true, logoExt: 'png' },
    { name: 'Adidas', domain: 'adidas.com', discount: 'Training gear promo', promoCode: 'ADIDAS15', featured: true, logoExt: 'png' },
    { name: 'Dick’s Sporting Goods', domain: 'dickssportinggoods.com', discount: 'Equipment bundles', promoCode: 'DICKS10', featured: false },
    { name: 'Reebok', domain: 'reebok.com', discount: 'Sport style offers', promoCode: 'REEBOK', featured: false },
    { name: 'Under Armour', domain: 'underarmour.com', discount: 'Performance wear deals', promoCode: 'UA15', featured: false },
    { name: 'New Balance', domain: 'newbalance.com', discount: 'Running shoe offers', promoCode: '', featured: false },
    { name: 'Decathlon', domain: 'decathlon.com', discount: 'Outdoor adventure savings', promoCode: 'DECATHLON', featured: false },
    { name: 'Fitbit', domain: 'fitbit.com', discount: 'Wellness device offers', promoCode: '', featured: false },
    { name: 'Peloton', domain: 'onepeloton.com', discount: 'Fitness bundle deal', promoCode: 'PELOTON', featured: false },
    { name: 'Lululemon', domain: 'lululemon.com', discount: 'Activewear member perks', promoCode: '', featured: false }
  ],
  betting: [
    { name: 'Hard Rock Bet', domain: 'hardrockbet.com', discount: 'Local promotions', promoCode: '', featured: true },
    { name: 'Bet365', domain: 'bet365.com', discount: 'Bonus terms vary', promoCode: '', featured: true },
    { name: 'DraftKings', domain: 'draftkings.com', discount: 'Promotions by state', promoCode: '', featured: true },
    { name: 'FanDuel', domain: 'fanduel.com', discount: 'Promos available', promoCode: '', featured: false },
    { name: 'BetMGM', domain: 'betmgm.com', discount: 'Loyalty offers', promoCode: '', featured: false },
    { name: 'Caesars Sportsbook', domain: 'caesars.com', discount: 'Rewards-based promos', promoCode: '', featured: false },
    { name: 'Fanatics Sportsbook', domain: 'fanatics.com', discount: 'New customer offers', promoCode: '', featured: false },
    { name: 'Betrivers', domain: 'betrivers.com', discount: 'Sportsbook offers', promoCode: '', featured: false },
    { name: 'ESPN BET', domain: 'espnbet.com', discount: 'New user promos', promoCode: '', featured: false },
    { name: 'Bally Bet', domain: 'ballybet.com', discount: 'Market-specific offers', promoCode: '', featured: false }
  ],
  // The fast-food coupon lineup that used to live here (Domino's, Pizza Hut,
  // Chipotle, Subway, Taco Bell, Panera Bread, Shake Shack, Olive Garden) has
  // been removed - it didn't match the luxury positioning. The "restaurants"
  // category slug is now rendered directly from
  // lib/restaurantsNightlifeData.js (see app/stores/[category]/page.js),
  // so this key intentionally has no brand list of its own.
  food: [
    { name: 'Uber Eats', domain: 'ubereats.com', discount: 'Free delivery', promoCode: 'EATSFREE', featured: true },
    { name: 'DoorDash', domain: 'doordash.com', discount: 'New customer perk', promoCode: 'DASH10', featured: true },
    { name: 'Instacart', domain: 'instacart.com', discount: 'Savings on groceries', promoCode: 'INSTACART', featured: false },
    { name: 'Whole Foods', domain: 'wholefoodsmarket.com', discount: 'Weekly member deals', promoCode: '', featured: false },
    { name: 'Trader Joe’s', domain: 'traderjoes.com', discount: 'Curated pantry savings', promoCode: '', featured: false },
    { name: 'Kroger', domain: 'kroger.com', discount: 'Digital coupons', promoCode: 'KROGER', featured: false },
    { name: 'Safeway', domain: 'safeway.com', discount: 'Grocery loyalty offers', promoCode: '', featured: false },
    { name: 'HelloFresh', domain: 'hellofresh.com', discount: 'Meal kit savings', promoCode: 'FOOD15', featured: false },
    { name: 'Blue Apron', domain: 'blueapron.com', discount: 'Subscription starter deal', promoCode: '', featured: false }
  ],
  entertainment: [
    { name: 'Disney+', domain: 'disneyplus.com', discount: 'Annual plan savings', promoCode: 'DISNEY', featured: true, logoExt: 'webp' },
    { name: 'Spotify', domain: 'spotify.com', discount: 'Premium student deal', promoCode: 'SPOTIFY', featured: false, logoExt: 'webp' },
    { name: 'AMC Theatres', domain: 'amctheatres.com', discount: 'Movie night promo', promoCode: 'AMC10', featured: false, logoExt: 'webp' },
    { name: 'Cineworld', domain: 'cineworld.com', discount: 'Midweek ticket savings', promoCode: '', featured: false, logoExt: 'webp' },
    { name: 'Eventbrite', domain: 'eventbrite.com', discount: 'Event discovery offers', promoCode: 'EVENT15', featured: false, logoExt: 'webp' },
    { name: 'Live Nation', domain: 'livenation.com', discount: 'Concert pre-sale access', promoCode: 'LIVE10', featured: false, logoExt: 'webp' },
    { name: 'Steam', domain: 'store.steampowered.com', discount: 'Game launch discounts', promoCode: 'STEAM20', featured: false, logoExt: 'webp' },
    { name: 'Epic Games', domain: 'store.epicgames.com', discount: 'Free game rotations', promoCode: '', featured: false, logoExt: 'webp' },
    { name: 'Airbnb Experiences', domain: 'airbnb.com', discount: 'Local experiences savings', promoCode: 'EXPLORE', featured: false, logoExt: 'webp' },
    // Adrenaline 365's own profile page hosts its real deals (each with its
    // supplied affiliate link), so this entry points there instead of the
    // generic /deals/ page and its auto-generated example.com placeholder.
    { name: 'Adrenaline 365', domain: 'adrenaline365.com', discount: 'Adventure experience deals', promoCode: '', featured: false, logoExt: 'png', affiliateLink: '/entertainment/adrenaline-365', website: '/entertainment/adrenaline-365' }
  ],
  'kosher-restaurants': [
    { name: 'Mizrahi Grill', domain: 'mizrahigrill.example', discount: '15% off dinner for four', promoCode: 'KOSHER15', featured: true, city: 'New York', state: 'NY', rating: 4.8, reviewCount: 612, mapQuery: 'Mizrahi Grill, New York, NY' },
    { name: 'Shalom Bistro', domain: 'shalombistro.example', discount: 'Free appetizer with entrée', promoCode: 'SHALOM10', featured: true, city: 'Los Angeles', state: 'CA', rating: 4.6, reviewCount: 389, mapQuery: 'Shalom Bistro, Los Angeles, CA' },
    { name: 'Jerusalem Table', domain: 'jerusalemtable.example', discount: '10% off catering orders', promoCode: 'JTABLE10', featured: false, city: 'Miami', state: 'FL', rating: 4.7, reviewCount: 501, mapQuery: 'Jerusalem Table, Miami, FL' },
    { name: 'Kosher Corner Deli', domain: 'koshercornerdeli.example', discount: 'Buy one sandwich get one 50% off', promoCode: 'DELI50', featured: false, city: 'Chicago', state: 'IL', rating: 4.5, reviewCount: 274, mapQuery: 'Kosher Corner Deli, Chicago, IL' },
    { name: 'Golden Challah Bakery Café', domain: 'goldenchallah.example', discount: 'Free coffee with pastry', promoCode: 'CHALLAH', featured: false, city: 'Boston', state: 'MA', rating: 4.9, reviewCount: 198, mapQuery: 'Golden Challah Bakery Cafe, Boston, MA' },
    { name: 'Sababa Grill House', domain: 'sababagrill.example', discount: '20% off group reservations', promoCode: 'SABABA20', featured: false, city: 'Philadelphia', state: 'PA', rating: 4.4, reviewCount: 156, mapQuery: 'Sababa Grill House, Philadelphia, PA' },
    { name: 'Pardes Kitchen', domain: 'pardeskitchen.example', discount: 'Free delivery on orders over $40', promoCode: 'PARDESFREE', featured: false, city: 'Baltimore', state: 'MD', rating: 4.6, reviewCount: 233, mapQuery: 'Pardes Kitchen, Baltimore, MD' },
    { name: 'Cedar & Fig', domain: 'cedarandfig.example', discount: 'Happy hour appetizer specials', promoCode: 'CEDARFIG', featured: false, city: 'Cleveland', state: 'OH', rating: 4.5, reviewCount: 141, mapQuery: 'Cedar and Fig, Cleveland, OH' }
  ],
  'kosher-stores': [
    { name: 'Kosher Market Co.', domain: 'koshermarketco.example', discount: '10% off weekly grocery order', promoCode: 'KMARKET10', featured: true, city: 'New York', state: 'NY', rating: 4.7, reviewCount: 728, mapQuery: 'Kosher Market Co, New York, NY' },
    { name: 'Beit Yosef Grocery', domain: 'beityosefgrocery.example', discount: 'Free delivery over $75', promoCode: 'BEITFREE', featured: true, city: 'Los Angeles', state: 'CA', rating: 4.6, reviewCount: 412, mapQuery: 'Beit Yosef Grocery, Los Angeles, CA' },
    { name: 'Sunshine Kosher Foods', domain: 'sunshinekosher.example', discount: '15% off Passover essentials', promoCode: 'SUNSHINE15', featured: false, city: 'Miami', state: 'FL', rating: 4.8, reviewCount: 356, mapQuery: 'Sunshine Kosher Foods, Miami, FL' },
    { name: 'Lakeview Kosher Butcher', domain: 'lakeviewkosherbutcher.example', discount: '$10 off orders over $60', promoCode: 'LAKEVIEW10', featured: false, city: 'Chicago', state: 'IL', rating: 4.5, reviewCount: 289, mapQuery: 'Lakeview Kosher Butcher, Chicago, IL' },
    { name: 'New England Kosher Pantry', domain: 'nekosherpantry.example', discount: 'Buy 2 get 1 free on pantry staples', promoCode: 'PANTRY21', featured: false, city: 'Boston', state: 'MA', rating: 4.6, reviewCount: 174, mapQuery: 'New England Kosher Pantry, Boston, MA' },
    { name: 'Liberty Kosher Market', domain: 'libertykoshermarket.example', discount: '20% off first online order', promoCode: 'LIBERTY20', featured: false, city: 'Philadelphia', state: 'PA', rating: 4.4, reviewCount: 132, mapQuery: 'Liberty Kosher Market, Philadelphia, PA' },
    { name: 'Charm City Kosher Grocers', domain: 'charmcitykosher.example', discount: 'Free challah with $50 purchase', promoCode: 'CHARMCITY', featured: false, city: 'Baltimore', state: 'MD', rating: 4.7, reviewCount: 201, mapQuery: 'Charm City Kosher Grocers, Baltimore, MD' },
    { name: 'Heights Kosher Provisions', domain: 'heightskosher.example', discount: '10% off bulk grocery orders', promoCode: 'HEIGHTS10', featured: false, city: 'Cleveland', state: 'OH', rating: 4.5, reviewCount: 118, mapQuery: 'Heights Kosher Provisions, Cleveland, OH' }
  ]
};

const categoryMeta = [
  { slug: 'shopping', label: 'Shopping', icon: '🛍️', description: 'Everyday essentials and premium retail savings.' },
  { slug: 'fashion', label: 'Fashion', icon: '👗', description: 'Style, apparel, footwear, and fashion retailer discounts.' },
  { slug: 'electronics', label: 'Electronics', icon: '💻', description: 'Devices, accessories, and gaming tech offers.' },
  { slug: 'beauty', label: 'Beauty', icon: '💄', description: 'Skincare, cosmetics, and wellness deals.' },
  { slug: 'home', label: 'Home', icon: '🏡', description: 'Furniture, decor, and home improvement savings.' },
  { slug: 'travel', label: 'Travel', icon: '✈️', description: 'Hotels, flights, car rentals, and vacation offers.' },
  { slug: 'sport', label: 'Sport', icon: '🏅', description: 'Fitness brands, equipment, and athletic wear discounts.' },
  { slug: 'betting', label: 'Betting', icon: '🎯', description: 'Sportsbook promos and betting-related offers.' },
  { slug: 'restaurants', label: 'Restaurants', icon: '🍽️', description: 'Fine dining, chef’s tables, and after-dark venues curated across the world’s top cities.' },
  { slug: 'food', label: 'Food', icon: '🛒', description: 'Food delivery, grocery, and subscription savings.' },
  { slug: 'entertainment', label: 'Entertainment', icon: '🎬', description: 'Streaming, events, cinemas, and gaming deals.' },
  { slug: 'kosher-restaurants', label: 'Kosher Restaurants', icon: '🥙', description: 'Certified kosher dining, catering, and delivery across major US cities.' },
  { slug: 'kosher-stores', label: 'Kosher Stores', icon: '🛒', description: 'Kosher grocers, butchers, and specialty markets across major US cities.' }
];

const AMAZON_AFFILIATE_URL = 'https://www.amazon.com?&linkCode=ll2&tag=gorgonaone-20&linkId=22d538165da984949d93c8bcf53f89dc&language=en_US&ref_=as_li_ss_tl';

const buildDeals = () => {
  const deals = [];
  Object.entries(brandsByCategory).forEach(([category, brands]) => {
    brands.forEach((brand, index) => {
      const slug = slugify(`${brand.name}-${category}`);
      const logoExt = brand.logoExt || 'svg';
      const isAmazon = brand.domain === 'amazon.com';
      deals.push({
        id: `${category}-${index + 1}`,
        name: brand.name,
        slug,
        category,
        logo: `/images/brands/${slug}.${logoExt}`,
        image: `/images/brands/${slug}.${logoExt}`,
        promoCode: brand.promoCode || '',
        discount: brand.discount,
        expirationDate: '2026-12-31',
        affiliateLink: isAmazon ? AMAZON_AFFILIATE_URL : (brand.affiliateLink || `https://www.example.com/affiliate/${slug}`),
        website: isAmazon ? AMAZON_AFFILIATE_URL : (brand.website || `https://${brand.domain}`),
        featured: brand.featured,
        city: brand.city,
        state: brand.state,
        rating: brand.rating,
        reviewCount: brand.reviewCount,
        mapQuery: brand.mapQuery
      });
    });
  });
  return deals;
};

export const categories = categoryMeta;
export const allDeals = buildDeals();
export const featuredDeals = allDeals.filter((deal) => deal.featured);

export function getDealsByCategory(categorySlug) {
  return allDeals.filter((deal) => deal.category === categorySlug);
}

export function getDealBySlug(slug) {
  return allDeals.find((deal) => deal.slug === slug);
}

function camelizeSlug(slug) {
  return slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Deal descriptions are generated from a translated template at render time
// (brand/city/state are never translated - only the surrounding sentence
// is) instead of being baked into the data in English, so every deal built
// from brandsByCategory is fully localized without per-brand translation.
export function getDealDescription(deal, t) {
  if (deal.city) {
    return t.category.kosherDescriptionTemplate
      .replace('{name}', deal.name)
      .replace('{city}', deal.city)
      .replace('{state}', deal.state);
  }
  const categoryLabel = t.categories[camelizeSlug(deal.category)] || deal.category;
  return t.category.dealDescriptionTemplate.replace('{name}', deal.name).replace('{category}', categoryLabel);
}
