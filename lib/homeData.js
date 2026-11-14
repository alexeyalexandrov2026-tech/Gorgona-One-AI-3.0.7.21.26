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

const featuredFirst = (items) => [...items.filter((i) => i.featured), ...items.filter((i) => !i.featured)];
export const HOME_YACHTS = featuredFirst(YACHTS).slice(0, 2);
export const HOME_STAYS = featuredFirst(STAYS).slice(0, 2);

