import { savedTree, savedSource } from './savedCopy.js';

// English source is retained. The versioned catalog supplies all
// supported languages; ordinary page reads never call a translation service.
export const HOME_COPY = {
  en: {
    eyebrow: 'Travel · Stays · Yachts · Cars · Events',
    titleA: 'Save on the everyday. ',
    titleEm: 'Splurge',
    titleB: ' on the extraordinary.',
    lede: 'Yachts, villas, cars and tickets in Miami. One search and one concierge, in your language.',
    stats: ['cars in our own fleet', 'yachts and villas', 'languages on the site'],
    searchLabel: 'Search or ask the concierge',
    searchPlaceholder: 'A brand, a yacht, a villa… or ask anything',
    searchGo: 'Ask',
    chipsLabel: 'Popular requests',
    chips: ['Yacht on Saturday', 'Rolls-Royce for 3 days', 'Heat tickets', 'Villa in Miami Beach', 'Table for four'],
    valet: { no: 'VALET · NO.', from: 'From', to: 'To', fromValue: 'Sunny Isles', toValue: 'South Beach', ready: 'Ready at 2:30 PM' },
    codes: 'Codes and offers',
    codesSub: 'Offers from brands you already shop. Show a code and it is copied for you.',
    showCode: 'Show code',
    copied: 'Copied',
    copyFailed: 'Select and copy',
    getDeal: 'Get deal',
    goTo: 'Go to {name}',
    withCode: 'Code',
    noCode: 'No code needed',
    ends: 'Ends {date}',
    season: 'Miami season',
    seasonSub: 'The weeks that sell out first. Plan them before everyone else does.',
    plan: 'Plan this week',
    inDays: 'In {n} days',
    tomorrow: 'Tomorrow',
    onNow: 'On now',
    organizer: 'Organizer’s site',
    seasonAsk: '{name}, {dates}. Help me plan it: a car, a place to stay, dinner and tickets.',
    seasonEmpty: 'Next season’s dates are on their way.',
    line: 'The A1A Line',
    lineSub: 'Eleven stops from Palm Beach to Key West. Pick one to see what is there.',
    airport: 'Airport',
    cruisePort: 'Cruise port',
    inland: 'Inland',
    askStop: 'Plan a day in {name}',
    askStopPrompt: 'What can I book in {name}? Cars, yachts, stays, tables and tickets.',
    worlds: 'Eight worlds. One account.',
    worldsSub: 'Every world shares one search, one saved list and one concierge.',
    worldItems: {
      deals: ['Stores', 'Brands and offers, all in one place'],
      travel: ['Travel', 'Flight codes, hotels and fare tools'],
      stays: ['Stays', 'Villas and residences in Miami'],
      yachts: ['Yachts', 'Crewed charters from Miami marinas'],
      cars: ['Cars', 'Our own fleet, delivered to your door'],
      events: ['Events', 'Tickets, tables and experiences'],
      sportsbooks: ['Sportsbooks', 'Welcome offers from ten operators'],
      concierge: ['Concierge', 'Plans everything in one conversation']
    },
    counts: {
      brands: 'Brands: {n}', flights: 'Flights · hotels', homes: 'Homes: {n}', charters: 'Charters: {n}',
      cars: 'Cars: {n}', tickets: 'Tickets · nightlife', operators: 'Operators: {n}', ai: 'AI + our team'
    },
    fleet: 'Our own fleet',
    fleetSub: 'Our cars are based in Sunny Isles Beach and delivered across Miami. Fleet size: {n}.',
    ratesOnRequest: 'Rates on request',
    delivered: 'Delivered across Miami',
    water: 'On the water',
    stays: 'Stays',
    seeAll: 'See all',
    conciergeEyebrow: 'Concierge',
    concierge: 'Ask in your language.',
    conciergeSub: 'Plans, codes and booking requests in one conversation. A person from our team confirms every booking.',
    open: 'Open the concierge',
    exampleLanguage: 'Example language',
    books: 'Sportsbook offers',
    booksSub: 'Ten operators, one place to compare welcome offers.',
    partnersEyebrow: 'Partners',
    partners: 'Put your brand inside Miami Elio.',
    partnersSub: 'List offers, charters, stays, cars, tables or tickets. Reach guests who are ready to book, in their language.',
    becomePartner: 'Become a partner',
    partnerSignIn: 'Partner sign in'
  }
};

const INTL_LOCALES = { en: 'en-US', ru: 'ru-RU', es: 'es-US', pt: 'pt-BR', he: 'he-IL' };

export function getHomeCopy(locale) {
  return savedTree('home', HOME_COPY.en, locale);
}

// Locale for dates and numbers; site languages without home copy keep their own.
export function intlLocale(locale) {
  return INTL_LOCALES[locale] || locale || 'en-US';
}

// Text for the localized line of a data record ({en, ru, ...}).
export function pickLang(map, locale) {
  return (map && (map[locale] || savedSource(locale, map.en))) || '';
}

export function fill(template, vars) {
  return Object.entries(vars).reduce((text, [key, value]) => text.split(`{${key}}`).join(String(value)), template);
}
