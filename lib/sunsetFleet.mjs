import summaries from './sunsetFleetSummary.json' with { type: 'json' };
import { dailyPriceNumber } from './seo.mjs';

/** Captured public supplier records. No runtime supplier API or checkout. */
export const SUNSET_FLEET = summaries;
export const SUNSET_SUPPLIER = 'Sunset Exotics';

export function sunsetRentalBySlug(slug) {
  return summaries.find(car => car.slug === slug);
}

const BRAND_RULES = [
  [/^(?:mercedes[\s-]?benz|mercedes[\s-]?maybach|mercedes)\b/i, 'Mercedes-Benz'],
  [/^rolls(?:[\s-]?royce)?\b/i, 'Rolls-Royce'],
  [/^range\s+rover\b/i, 'Range Rover'],
  [/^aston\s+martin\b/i, 'Aston Martin'],
  [/^(?:chevrolet|chevy)\b/i, 'Chevrolet'],
  [/^lamborghini\b/i, 'Lamborghini'],
  [/^ferrari\b/i, 'Ferrari'],
  [/^porsche\b/i, 'Porsche'],
  [/^mclaren\b/i, 'McLaren'],
  [/^bentley\b/i, 'Bentley'],
  [/^cadillac\b/i, 'Cadillac'],
  [/^maserati\b/i, 'Maserati'],
  [/^bugatti\b/i, 'Bugatti'],
  [/^brabus\b/i, 'Brabus'],
  [/^bmw\b/i, 'BMW'],
  [/^audi\b/i, 'Audi'],
  [/^tesla\b/i, 'Tesla'],
  [/^rivian\b/i, 'Rivian'],
  [/^lucid\b/i, 'Lucid'],
  [/^acura\b/i, 'Acura'],
  [/^nissan\b/i, 'Nissan'],
  [/^ford\b/i, 'Ford'],
  [/^gmc\b/i, 'GMC'],
  [/^vinfast\b/i, 'VinFast']
];

export function extractCarBrand(car) {
  const title = String(car?.title || '').replace(/^\s*20\d{2}\s+/, '').trim();
  if (!title) return '';
  for (const [pattern, brand] of BRAND_RULES) {
    if (pattern.test(title)) return brand;
  }
  return title.split(/\s+/)[0] || '';
}

export function rentalBrands(cars) {
  const counts = new Map();
  for (const car of cars) {
    const brand = extractCarBrand(car);
    if (!brand) continue;
    counts.set(brand, (counts.get(brand) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const RENTALS_PAGE_SIZE = 24;
/** Stable server pagination; filters operate on the complete catalogue first. */
export function rentalPage(cars, { type, location, brand, q, sort, page } = {}) {
  const query = typeof q === 'string' ? q.trim().slice(0, 80).toLowerCase() : '';
  let filtered = cars.filter(car =>
    (!type || car.category === type) &&
    (!location || car.location === location) &&
    (!brand || extractCarBrand(car) === brand) &&
    (!query || `${car.title || ''} ${car.category || ''} ${car.location || ''} ${car.supplier || ''}`.toLowerCase().includes(query))
  );
  if (sort === 'price-asc' || sort === 'price-desc') {
    const dir = sort === 'price-asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      const pa = dailyPriceNumber(a.dailyPrice);
      const pb = dailyPriceNumber(b.dailyPrice);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return (pa - pb) * dir;
    });
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / RENTALS_PAGE_SIZE));
  const requested = /^[1-9][0-9]{0,5}$/.test(String(page)) ? Number(page) : 1;
  const current = Math.min(requested, totalPages);
  return { cars: filtered.slice((current - 1) * RENTALS_PAGE_SIZE, current * RENTALS_PAGE_SIZE),
    current, totalPages, total: filtered.length };
}
