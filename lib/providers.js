// Affiliate architecture preparation for ticket providers. No affiliate
// program has been signed up for yet, so this currently resolves to the
// provider's plain website - once real affiliate IDs exist (e.g. a
// Ticketmaster or StubHub partner account), set the matching env var below
// and buildAffiliateUrl will start appending it automatically. No other
// code needs to change.

const AFFILIATE_ENV_VARS = {
  ticketmaster: 'TICKETMASTER_AFFILIATE_ID',
  stubhub: 'STUBHUB_AFFILIATE_ID',
  seatgeek: 'SEATGEEK_AFFILIATE_ID',
  'vivid-seats': 'VIVIDSEATS_AFFILIATE_ID',
  tickpick: 'TICKPICK_AFFILIATE_ID',
  gametime: 'GAMETIME_AFFILIATE_ID',
  eventbrite: 'EVENTBRITE_AFFILIATE_ID',
  axs: 'AXS_AFFILIATE_ID'
};

export function buildAffiliateUrl(provider, event) {
  const envVar = AFFILIATE_ENV_VARS[provider.slug];
  const affiliateId = envVar ? process.env[envVar] : null;

  if (!affiliateId) {
    return provider.website;
  }

  const url = new URL(provider.website);
  url.searchParams.set('aff', affiliateId);
  if (event?.slug) {
    url.searchParams.set('ref', event.slug);
  }
  return url.toString();
}
