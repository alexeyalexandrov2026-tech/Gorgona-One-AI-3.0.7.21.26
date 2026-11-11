// Shared by the concierge plan in the browser, the /api/plan server and the
// iOS app (ios/MiamiElio/Concierge/PlanModels.swift mirrors these values).
// Experiences and events are booked on partner sites, so they never join a plan.
export const PLAN_KINDS = ['yacht', 'stay', 'car', 'dining', 'nightlife'];
export const PLAN_LIMITS = { maxItems:6, maxNights:30, candidates:4, sections:4 };
// Section route -> item kind offered for it. Restaurants and nightlife share one section.
export const PLAN_SECTIONS = { '/yachts':'yacht', '/vacation-rentals':'stay', '/rentals':'car', '/restaurants-nightlife':'dining' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isPlanReceipt(data) {
  return data?.success === true && typeof data.planId === 'string' && UUID.test(data.planId)
    && Array.isArray(data.bookingIds) && data.bookingIds.length > 0 && data.bookingIds.every(id => typeof id === 'string' && UUID.test(id));
}
