// Stay22 owns the villa and home catalogue. Miami Elio has no stay inventory
// of its own: the sample villas that used to live here were not real homes.
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
