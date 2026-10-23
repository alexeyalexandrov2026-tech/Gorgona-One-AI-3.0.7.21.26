import { savedTree } from './savedCopy.js';

// Copy for the legal and responsible-gambling notice shown wherever the site
// mentions a sportsbook. Languages without a translation fall back to English.

export const TEXT = {
  en: {
    title: 'Bet only where it is legal',
    body: 'Sports betting is legal only in some states, and only with operators licensed there. You must be 21 or older and physically located in a state where the operator is licensed. Offers and availability change, so check the operator’s terms before you sign up.',
    florida: 'In Florida, the only legal online sportsbook is Hard Rock Bet.',
    help: 'Gambling problem? Call',
    whereLegal: 'Where it is legal',
    checked: 'checked',
    sources: 'Sources',
    inFlorida: 'Available in Florida',
    notInFlorida: 'Not available in Florida'
  }
};

export function getGamblingText(locale) {
  return savedTree('gambling', TEXT.en, locale);
}

export function formatCheckedDate(isoDate, locale) {
  try {
    return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(locale || 'en', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
    });
  } catch {
    return isoDate;
  }
}
