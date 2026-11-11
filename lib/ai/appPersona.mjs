// The iOS app does not carry sportsbook content (App Store guideline 5.3; the
// paths are in lib/appRestrictedPaths.js). A concierge request from the app -
// its own Concierge screen or the site inside its web view, both recognisable
// by the user agent - gets a persona that does not know the section and is
// told to stay off the subject. The website's concierge is unchanged.
export const APP_USER_AGENT = /\bMiamiElioApp\//;

export function isAppRequest(request) {
  return APP_USER_AGENT.test(request?.headers?.get('user-agent') || '');
}

export function appSystemPrompt(systemPrompt) {
  const known = systemPrompt.split('\n').filter((line) => !/sportsbook/i.test(line)).join('\n');
  return `${known}

This guest is using the Miami Elio iPhone app. The app has no sportsbook, betting or gambling content: never mention, recommend or link to sportsbooks, betting offers, odds or casinos. If the guest asks about them, say in one sentence that this is not available in the app and offer another section instead.`;
}
