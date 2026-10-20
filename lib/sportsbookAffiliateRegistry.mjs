/**
 * Sportsbook affiliate activation registry.
 *
 * Fail closed: an inquiry, a public affiliate form, or an operator homepage
 * is NEVER an approved tracked offer. Do not populate a URL until the
 * publisher agreement, state approvals and creative have been verified.
 *
 * This is a staging-only policy layer; it does not determine a visitor's
 * jurisdiction or age. Callers must verify both independently before use.
 * No public sportsbook page currently calls this module to redirect users.
 */
export const SPORTSBOOK_AFFILIATE_PROGRAMS = Object.freeze({
  'hard-rock-bet': 'Hard Rock Bet',
  draftkings: 'DraftKings Sportsbook',
  fanduel: 'FanDuel Sportsbook',
  betmgm: 'BetMGM Sportsbook',
  caesars: 'Caesars Sportsbook',
  fanatics: 'Fanatics Sportsbook',
  bet365: 'bet365 Sportsbook',
  betrivers: 'BetRivers Sportsbook',
  'thescore-bet': 'theScore Bet',
  'bally-bet': 'Bally Bet'
});

export const SPORTSBOOK_AFFILIATE_CONFIG = Object.freeze(
  Object.fromEntries(
    Object.keys(SPORTSBOOK_AFFILIATE_PROGRAMS).map((slug) => [
      slug,
      Object.freeze({
        approved: false,
        writtenAgreementOnFile: false,
        legalReviewComplete: false,
        approvedCreative: false,
        approvedStates: Object.freeze([]),
        affiliateUrl: null,
        allowedTrackingHosts: Object.freeze([])
      })
    ])
  )
);

/**
 * Return a tracked affiliate destination only when all prerequisites are met.
 * This is a secondary defense, not a substitute for jurisdiction/age checks
 * performed by a compliant, verified geo/age flow.
 *
 * @param {string} slug - one of the ten sportsbook slugs
 * @param {{state: string, stateVerified: boolean, age21Verified: boolean}} context
 * @returns {string|null} approved URL or null
 */
export function getSportsbookAffiliateDestination(slug, context) {
  return validateAffiliateDestination(
    slug,
    SPORTSBOOK_AFFILIATE_CONFIG[slug],
    context
  );
}

// Exported separately to test the policy against simulated approved entries.
// Never pass untrusted client-provided configs into this function.
export function validateAffiliateDestination(slug, config, context) {
  if (!Object.prototype.hasOwnProperty.call(SPORTSBOOK_AFFILIATE_PROGRAMS, slug)) return null;
  if (!config || !context) return null;
  if (
    config.approved !== true ||
    config.writtenAgreementOnFile !== true ||
    config.legalReviewComplete !== true ||
    config.approvedCreative !== true ||
    context.stateVerified !== true ||
    context.age21Verified !== true
  ) return null;

  const state = typeof context.state === 'string' ? context.state.toUpperCase() : '';
  if (!/^[A-Z]{2}$/.test(state)) return null;
  if (!Array.isArray(config.approvedStates) || !config.approvedStates.includes(state)) return null;

  // Current Florida sportsbook availability: Hard Rock Bet only. This
  // additional gate applies even if an incorrect approval list contains FL.
  if (state === 'FL' && slug !== 'hard-rock-bet') return null;

  if (typeof config.affiliateUrl !== 'string' || !Array.isArray(config.allowedTrackingHosts)) return null;
  let url;
  try {
    url = new URL(config.affiliateUrl);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    url.username || url.password ||
    !config.allowedTrackingHosts.includes(url.hostname.toLowerCase())
  ) return null;
  return url.href;
}
