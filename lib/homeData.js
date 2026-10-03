// What the homepage shows, picked from the site's existing data.
import { allDeals, getDealBySlug } from './dealsData.js';
import { getRentals, getRentalBySlug } from './rentalsData.js';
import { getYachts } from './yachtsData.js';
import { getVacationRentals } from './vacationRentalsData.js';
import { SPORTSBOOK_DIRECTORY } from './sportsbookDirectory.js';

// Brand offers only: kosher listings are local businesses, and betting
// offers live in the sportsbook section with its legal notice.
const brandDeals = allDeals.filter((deal) => !deal.category.startsWith('kosher') && deal.category !== 'betting');

export const BRAND_COUNT = new Set(brandDeals.map((deal) => deal.name)).size;

// Featured offers, one per brand, in data order.
export function getHomeCodes(limit = 12) {
  const seen = new Set();
  return brandDeals
    .filter((deal) => deal.featured && !seen.has(deal.name) && seen.add(deal.name))
    .slice(0, limit);
}

// The partner link when there is a real one, otherwise the brand's own site.
export function dealUrl(deal) {
  return deal.affiliateLink && !deal.affiliateLink.includes('example.com') ? deal.affiliateLink : deal.website;
}

export const HERO_DEAL = getDealBySlug('nike-fashion');
export const HERO_CAR = getRentalBySlug('lamborghini-urus-se');

// Small (720px) cover kept next to each car's full-size cover.
export function carThumb(car) {
  return car.image.replace(/cover\.jpg$/, 'cover-s.jpg');
}

export const FLEET = getRentals();
export const YACHTS = getYachts();
export const STAYS = getVacationRentals();

const featuredFirst = (items) => [...items.filter((i) => i.featured), ...items.filter((i) => !i.featured)];
export const HOME_YACHTS = featuredFirst(YACHTS).slice(0, 2);
export const HOME_STAYS = featuredFirst(STAYS).slice(0, 2);

// Sportsbook artwork on its own tile; theScore Bet shows its name until
// licensed artwork is added.
const BOOK_LOGOS = {
  'hard-rock-bet': 'hard-rock-bet-betting.svg',
  draftkings: 'draftkings-betting.svg',
  fanduel: 'fanduel-betting.svg',
  betmgm: 'betmgm-betting.svg',
  caesars: 'caesars-sportsbook-betting.svg',
  fanatics: 'fanatics-sportsbook-betting.svg',
  bet365: 'bet365-betting.svg',
  betrivers: 'betrivers-betting.svg',
  'bally-bet': 'bally-bet-betting.svg'
};

// The ten sportsbooks in their fixed order.
export const HOME_BOOKS = SPORTSBOOK_DIRECTORY.map((book) => ({
  name: book.name,
  slug: book.slug,
  logo: BOOK_LOGOS[book.slug] ? `/images/brands/${BOOK_LOGOS[book.slug]}` : null
}));
