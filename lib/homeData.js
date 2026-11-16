// What the homepage shows, picked from the site's existing data.
import { getRentals, getRentalBySlug } from './rentalsData.js';
import { getYachts } from './yachtsData.js';
import { getVacationRentals } from './vacationRentalsData.js';

export const HERO_CAR = getRentalBySlug('lamborghini-urus-se');

// Small (720px) cover kept next to each car's full-size cover.
export function carThumb(car) {
  return car.thumbnail || car.image.replace(/cover\.jpg$/, 'cover-s.jpg');
}

export const FLEET = getRentals();
export const YACHTS = getYachts();
export const STAYS = getVacationRentals();

export const HOME_SECTIONS = [
  { id: 'travel', href: '/travel', image: '/images/home/deco-hotel.jpg' },
  { id: 'stays', href: '/vacation-rentals', image: '/images/home/worlds/stay-miami-beach.jpg' },
  { id: 'yachts', href: '/yachts', image: '/images/home/worlds/yacht-princess.jpg' },
  { id: 'cars', href: '/rentals', image: carThumb(FLEET[0]) },
  { id: 'events', href: '/events', image: '/images/home/worlds/events-stage.jpg' },
  { id: 'privateJets', href: '/private-jets', image: '/images/home/worlds/travel-wing.jpg' },
  { id: 'experiences', href: '/experiences', image: '/images/experiences/little-havana.webp' },
  { id: 'adventures', href: '/entertainment/adrenaline-365', image: '/images/adrenaline365/helicopter-tour.png' },
  { id: 'dining', href: '/restaurants-nightlife', image: '/images/dining/komodo.jpg' },
  { id: 'concierge', href: '/discovery' }
];

const featuredFirst = (items) => [...items.filter((i) => i.featured), ...items.filter((i) => !i.featured)];
export const HOME_YACHTS = featuredFirst(YACHTS).slice(0, 2);
export const HOME_STAYS = featuredFirst(STAYS).slice(0, 2);

