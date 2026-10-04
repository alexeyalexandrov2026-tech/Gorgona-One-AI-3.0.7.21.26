// Where each sportsbook may legally take bets.
//
// State lists change often, so the site does not copy them. Each operator
// links to the source we checked, with the date of that check. Re-check every
// source at least once a month, then update CHECKED_AT. Official operator
// pages are used where one exists; otherwise a sports-betting tracker that
// dates its updates.

export const CHECKED_AT = '2026-10-02';

export const AVAILABILITY_SOURCES = {
  'hard-rock-bet': { name: 'Hard Rock Bet (official)', url: 'https://www.hardrock.bet/sportsbook/' },
  draftkings: { name: 'DraftKings (official)', url: 'https://sportsbook.draftkings.com/is-draftkings-available-nationwide-for-sports' },
  fanduel: { name: 'Sharp Football Analysis', url: 'https://www.sharpfootballanalysis.com/sportsbook/guides/fanduel-legal-states/' },
  betmgm: { name: 'BetMGM on the App Store (official)', url: 'https://apps.apple.com/us/app/id1430875409' },
  caesars: { name: 'Sharp Football Analysis', url: 'https://www.sharpfootballanalysis.com/sportsbook/caesars-sportsbook-legal-states/' },
  fanatics: { name: 'Sharp Football Analysis', url: 'https://www.sharpfootballanalysis.com/sportsbook/fanatics-sportsbook-legal-states/' },
  bet365: { name: 'Sharp Football Analysis', url: 'https://www.sharpfootballanalysis.com/sportsbook/guides/bet365-legal-states/' },
  betrivers: { name: 'Sharp Football Analysis', url: 'https://www.sharpfootballanalysis.com/sportsbook/guides/betrivers-legal-states/' },
  'thescore-bet': { name: 'Sports Betting Dime', url: 'https://www.sportsbettingdime.com/sportsbooks/thescore-bet/legal-states/' },
  'bally-bet': { name: 'Bally Bet (official)', url: 'https://www.ballybet.com/states-where-sports-betting-is-legal' }
};

// Florida: online sports betting runs only through Hard Rock Bet under the
// Seminole Tribe compact. Every other operator here is unavailable there.
export const FLORIDA = {
  onlyOperator: 'hard-rock-bet',
  sources: [
    { name: 'Hard Rock Bet: Florida', url: 'https://www.hardrock.bet/florida/' },
    { name: 'Legal Sports Report: Florida', url: 'https://www.legalsportsreport.com/sports-betting/states/florida/' }
  ]
};

export const HELPLINE = '1-800-GAMBLER';

export function getAvailability(slug) {
  const source = AVAILABILITY_SOURCES[slug];
  if (!source) return null;
  return { source, checkedAt: CHECKED_AT, inFlorida: slug === FLORIDA.onlyOperator };
}
