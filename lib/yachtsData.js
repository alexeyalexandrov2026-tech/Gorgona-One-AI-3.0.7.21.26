// Yacht Rentals marketplace data. Static for now (mirrors the pattern used
// by lib/rentalsData.js) - see database/schema.sql for the table shapes
// this is designed to migrate to once a real Admin Dashboard/Supabase-backed
// CRUD exists.

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
