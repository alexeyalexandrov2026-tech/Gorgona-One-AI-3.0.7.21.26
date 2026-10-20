import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPORTSBOOK_AFFILIATE_PROGRAMS,
  SPORTSBOOK_AFFILIATE_CONFIG,
  getSportsbookAffiliateDestination,
  validateAffiliateDestination
} from '../lib/sportsbookAffiliateRegistry.mjs';

const allowed = (overrides = {}) => ({
  approved: true,
  writtenAgreementOnFile: true,
  legalReviewComplete: true,
  approvedCreative: true,
  approvedStates: ['FL', 'NJ'],
  affiliateUrl: 'https://track.example.com/click?affiliate=approved',
  allowedTrackingHosts: ['track.example.com'],
  ...overrides
});
const context = (overrides = {}) => ({
  state: 'NJ',
  stateVerified: true,
  age21Verified: true,
  ...overrides
});

test('all ten current sportsbook programs are disabled by default', () => {
  assert.equal(Object.keys(SPORTSBOOK_AFFILIATE_PROGRAMS).length, 10);
  for (const slug of Object.keys(SPORTSBOOK_AFFILIATE_PROGRAMS)) {
    assert.equal(SPORTSBOOK_AFFILIATE_CONFIG[slug].approved, false);
    assert.equal(getSportsbookAffiliateDestination(slug, context()), null);
  }
});

test('a fully reviewed and verified approved destination can resolve', () => {
  assert.equal(
    validateAffiliateDestination('draftkings', allowed(), context()),
    'https://track.example.com/click?affiliate=approved'
  );
});

test('unknown brands, absent state verification or age verification fail closed', () => {
  assert.equal(validateAffiliateDestination('unknown', allowed(), context()), null);
  assert.equal(validateAffiliateDestination('draftkings', allowed(), context({ stateVerified: false })), null);
  assert.equal(validateAffiliateDestination('draftkings', allowed(), context({ age21Verified: false })), null);
  assert.equal(validateAffiliateDestination('draftkings', allowed(), context({ state: 'XX' })), null);
  assert.equal(validateAffiliateDestination('draftkings', allowed(), context({ state: 'New Jersey' })), null);
});

test('all approvals and state permissions must be explicit', () => {
  for (const key of ['approved', 'writtenAgreementOnFile', 'legalReviewComplete', 'approvedCreative']) {
    assert.equal(validateAffiliateDestination('draftkings', allowed({ [key]: false }), context()), null);
  }
  assert.equal(validateAffiliateDestination('draftkings', allowed({ approvedStates: [] }), context()), null);
  assert.equal(validateAffiliateDestination('draftkings', allowed({ approvedStates: ['NY'] }), context()), null);
});

test('Florida sportsbook promotion is blocked for all brands except Hard Rock Bet', () => {
  for (const slug of Object.keys(SPORTSBOOK_AFFILIATE_PROGRAMS)) {
    const result = validateAffiliateDestination(slug, allowed(), context({ state: 'FL' }));
    assert.equal(result === null, slug !== 'hard-rock-bet');
  }
});

test('reject insecure, unexpected, malformed or credentialed tracking URLs', () => {
  for (const url of [
    'http://track.example.com/click',
    'https://other.example.com/click',
    'https://track.example.com.evil.test/click',
    'https://user:pass@track.example.com/click',
    'javascript:alert(1)',
    'not a url'
  ]) {
    assert.equal(validateAffiliateDestination('draftkings', allowed({ affiliateUrl: url }), context()), null);
  }
  assert.equal(validateAffiliateDestination('draftkings', allowed({ allowedTrackingHosts: [] }), context()), null);
});
