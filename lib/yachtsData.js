// YATR owns the yacht catalogue. Miami Elio has no individual yacht inventory.
const yachts = [];

export function getYachts() {
  return yachts;
}

export function getFeaturedYachts() {
  return yachts.filter((item) => item.featured);
}

export function getYachtBySlug(slug) {
  return yachts.find((item) => item.slug === slug);
}
