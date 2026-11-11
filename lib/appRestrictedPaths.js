// Sections the iOS app (ios/) does not carry: App Store guideline 5.3 asks for
// a gambling licence from apps that promote real-money betting. The app keeps
// the same list in RoutePolicy.swift and refuses to open these pages;
// tests/content/app-shell.test.mjs keeps the two lists identical.
//
// The site uses it to mark links into these sections with data-app-hidden, so
// inside the app they are not shown at all instead of leading to a refusal.
// In a browser nothing changes.
export const APP_RESTRICTED_PATHS = [
  '/sportsbook',
  '/sports-betting-promos',
  '/betmgm-promos',
  '/caesars-sportsbook-promos',
  '/draftkings-promos',
  '/fanduel-promos',
  '/stores/betting'
];

export function isAppRestricted(href) {
  if (typeof href !== 'string' || !href.startsWith('/')) return false;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return APP_RESTRICTED_PATHS.some((restricted) => path === restricted || path.startsWith(`${restricted}/`));
}
