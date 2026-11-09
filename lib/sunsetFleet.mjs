import summaries from './sunsetFleetSummary.json' with { type: 'json' };

/** Captured public supplier records. No runtime supplier API or checkout. */
export const SUNSET_FLEET = summaries;
export const SUNSET_SUPPLIER = 'Sunset Exotics';

export function sunsetRentalBySlug(slug) {
  return summaries.find(car => car.slug === slug);
}

export const RENTALS_PAGE_SIZE = 24;
/** Stable server pagination; filters operate on the complete catalogue first. */
export function rentalPage(cars, { type, location, page } = {}) {
  const filtered = cars.filter(car => (!type || car.category === type) && (!location || car.location === location));
  const totalPages = Math.max(1, Math.ceil(filtered.length / RENTALS_PAGE_SIZE));
  const requested = /^[1-9][0-9]{0,5}$/.test(String(page)) ? Number(page) : 1;
  const current = Math.min(requested, totalPages);
  return { cars: filtered.slice((current - 1) * RENTALS_PAGE_SIZE, current * RENTALS_PAGE_SIZE),
    current, totalPages, total: filtered.length };
}
