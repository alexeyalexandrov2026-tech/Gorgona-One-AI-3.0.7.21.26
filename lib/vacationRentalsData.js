// Vacation Rentals marketplace data. Static for now (mirrors the pattern
// used by lib/rentalsData.js and lib/yachtsData.js).

const vacationRentals = [];

export function getVacationRentals() {
  return vacationRentals;
}

export function getFeaturedVacationRentals() {
  return vacationRentals.filter((item) => item.featured);
}

export function getVacationRentalBySlug(slug) {
  return vacationRentals.find((item) => item.slug === slug);
}
