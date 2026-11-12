// Addresses the iOS app (ios/) refuses to open: App Store guideline 5.3 asks
// for a gambling licence from apps that promote real-money betting. The app
// keeps the same list in RoutePolicy.swift; tests/content/app-shell.test.mjs
// keeps the two lists identical.
//
// The site no longer has a sportsbook section - these addresses redirect to
// the home page (next.config.js) - so the list is a guard: if such a link
// ever appears again, the site marks it data-app-hidden and the concierge
// leaves it out of what it offers inside the app.
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
