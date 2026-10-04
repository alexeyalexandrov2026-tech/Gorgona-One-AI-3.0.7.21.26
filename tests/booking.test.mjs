import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING_LIMITS, isHoneypotTripped, validateBooking } from '../lib/booking.js';
import { getYachts } from '../lib/yachtsData.js';
import { getRentals } from '../lib/rentalsData.js';
import { getVacationRentals } from '../lib/vacationRentalsData.js';
import { getExperiences } from '../lib/experiencesData.js';

const valid = {
  name: '  Ada Guest ',
  email: 'ada@example.com',
  phone: '+1 305 555 0100',
  dates: 'Oct 12 - Oct 15',
  itemSlug: 'lamborghini-urus-se',
  itemTitle: 'Lamborghini Urus SE'
};

test('accepts a complete request and trims fields', () => {
  const result = validateBooking(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value.name, 'Ada Guest');
  assert.equal(result.value.itemSlug, 'lamborghini-urus-se');
});

test('phone and listing are optional', () => {
  const result = validateBooking({ name: 'Ada', email: 'ada@example.com', dates: 'Oct 1' });
  assert.equal(result.ok, true);
  assert.equal(result.value.phone, '');
});

test('rejects missing required fields', () => {
  for (const field of ['name', 'email', 'dates']) {
    const result = validateBooking({ ...valid, [field]: '   ' });
    assert.equal(result.ok, false, field);
  }
});

test('rejects malformed emails', () => {
  for (const email of ['ada', 'ada@', '@example.com', 'ada@example', 'a da@example.com']) {
    assert.equal(validateBooking({ ...valid, email }).ok, false, email);
  }
});

test('rejects values longer than the database allows', () => {
  for (const [field, max] of Object.entries(BOOKING_LIMITS)) {
    const value = field === 'email' ? `${'a'.repeat(max)}@example.com` : 'a'.repeat(max + 1);
    assert.equal(validateBooking({ ...valid, [field]: value }).ok, false, field);
  }
});

test('rejects non-string values and non-object bodies', () => {
  assert.equal(validateBooking({ ...valid, name: { first: 'Ada' } }).ok, false);
  assert.equal(validateBooking({ ...valid, dates: 12 }).ok, false);
  assert.equal(validateBooking(null).ok, false);
  assert.equal(validateBooking([valid]).ok, false);
});

test('rejects listing slugs that are not slugs', () => {
  for (const itemSlug of ['<script>', 'Urus SE', '../admin', '-leading-dash']) {
    assert.equal(validateBooking({ ...valid, itemSlug }).ok, false, itemSlug);
  }
});

test('every bookable listing slug passes validation', () => {
  const listings = [...getYachts(), ...getRentals(), ...getVacationRentals(), ...getExperiences()];
  assert.ok(listings.length > 0);
  for (const item of listings) {
    const result = validateBooking({ ...valid, itemSlug: item.slug, itemTitle: item.title });
    assert.equal(result.ok, true, `${item.slug}: ${result.error}`);
  }
});

test('the honeypot field marks automated submissions', () => {
  assert.equal(isHoneypotTripped({ ...valid, website: 'http://spam.example' }), true);
  assert.equal(isHoneypotTripped({ ...valid, website: '   ' }), false);
  assert.equal(isHoneypotTripped(valid), false);
});
