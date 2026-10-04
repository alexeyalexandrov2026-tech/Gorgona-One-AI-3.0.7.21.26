// ===========================================================================
// Reservation request validation for /api/book.
//
// Pure and framework-free so it can be unit tested with node:test. The limits
// mirror the CHECK constraints in database/02_security_hardening.sql, so a
// request that passes here is never rejected by the database for its shape.
// ===========================================================================

export const BOOKING_LIMITS = {
  name: 200,
  email: 254,
  phone: 50,
  dates: 200,
  itemSlug: 200,
  itemTitle: 300
};

// Same rule as isValidEmail() in lib/auth.js.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Listing slugs across lib/*Data.js are lowercase words joined by hyphens.
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

const FIELD_LABELS = {
  name: 'name',
  email: 'email',
  phone: 'phone number',
  dates: 'dates',
  itemSlug: 'listing',
  itemTitle: 'listing'
};

// Returns the trimmed string, '' for a missing value, or null when the value
// has the wrong type or is longer than allowed.
function clean(value, max) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
}

/**
 * @returns {{ ok: true, value: Record<keyof BOOKING_LIMITS, string> } | { ok: false, error: string }}
 */
export function validateBooking(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Invalid request body.' };
  }

  const value = {};
  for (const [key, max] of Object.entries(BOOKING_LIMITS)) {
    const cleaned = clean(body[key], max);
    if (cleaned === null) return { ok: false, error: `Please check the ${FIELD_LABELS[key]} you entered.` };
    value[key] = cleaned;
  }

  if (!value.name || !value.email || !value.dates) {
    return { ok: false, error: 'Missing required fields' };
  }
  if (!EMAIL_RE.test(value.email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (value.itemSlug && !SLUG_RE.test(value.itemSlug)) {
    return { ok: false, error: 'Please check the listing you entered.' };
  }

  return { ok: true, value };
}

// BookingForm renders a visually hidden "website" field that people never
// see. Simple form-filling bots complete every input, so a value there marks
// the request as automated.
export function isHoneypotTripped(body) {
  return typeof body?.website === 'string' && body.website.trim() !== '';
}
