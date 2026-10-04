// Which offers each deals page lists. The rules were spread across the
// /stores, /stores/[category] and /coupons pages; they live here unchanged
// so the pages stay simple and the rules are tested in one place.
import { allDeals, featuredDeals, getDealsByCategory } from './dealsData.js';

// Kept in lib/dealsData.js (with their /deals/{slug} pages) but not listed
// in the Stores section.
export const HIDDEN_FROM_STORES = ['Beit Yosef Grocery', 'Kosher Market Co.', 'Shalom Bistro', 'Mizrahi Grill', 'Disney+', 'DoorDash', 'Uber Eats'];

// Nike and Adidas are featured in fashion and in sport; /stores shows the
// fashion entries only. /stores/sport keeps its own.
const HIDDEN_DUPLICATE_IDS = ['sport-1', 'sport-2'];

// Coupons lists only these three, which are not in Stores.
export const COUPONS_VISIBLE = ['Disney+', 'DoorDash', 'Uber Eats'];

// Stores-only brand, kept out of lib/dealsData.js so it never reaches
// Coupons, search or the homepage. Pinned first on /stores.
export const ROWE_AND_TAYLOR_DEAL = {
  id: 'rowe-and-taylor-featured',
  name: 'Rowe & Taylor',
  slug: 'rowe-and-taylor',
  category: 'fashion',
  logo: '/images/brands/rowe-and-taylor.svg',
  image: '/images/brands/rowe-and-taylor.svg',
  promoCode: '',
  discount: 'Suits that outperform their price.',
  expirationDate: '2026-12-31',
  affiliateLink: 'https://click.linksynergy.com/fs-bin/click?id=BsBQ7p%2fMcbE&offerid=1949696.3&type=3&subid=0',
  website: 'https://click.linksynergy.com/fs-bin/click?id=BsBQ7p%2fMcbE&offerid=1949696.3&type=3&subid=0',
  featured: true
};

// The partner link when there is a real one, otherwise the brand's own site.
export function dealUrl(deal) {
  return deal.affiliateLink && !deal.affiliateLink.includes('example.com') ? deal.affiliateLink : deal.website;
}

// Light logos drawn for dark backgrounds; their plate is dark.
const DARK_LOGO_SLUGS = new Set([
  'airbnb-travel', 'delta-air-lines-travel', 'disney-entertainment', 'eventbrite-entertainment',
  'hilton-travel', 'live-nation-entertainment', 'marriott-travel', 'spotify-entertainment'
]);
export const hasDarkLogo = (deal) => DARK_LOGO_SLUGS.has(deal.slug);

// Sportsbook offers live on /sportsbook with their legal notice.
export const isBettingCategory = (slug) => slug === 'betting';

export function getStoreDeals() {
  return [
    ROWE_AND_TAYLOR_DEAL,
    ...featuredDeals.filter(
      (deal) => !isBettingCategory(deal.category) && !HIDDEN_FROM_STORES.includes(deal.name) && !HIDDEN_DUPLICATE_IDS.includes(deal.id)
    )
  ];
}

export function getCategoryDeals(slug) {
  if (isBettingCategory(slug)) return [];
  return getDealsByCategory(slug).filter((deal) => !HIDDEN_FROM_STORES.includes(deal.name));
}

export function getCouponDeals() {
  return allDeals.filter((deal) => COUPONS_VISIBLE.includes(deal.name));
}
