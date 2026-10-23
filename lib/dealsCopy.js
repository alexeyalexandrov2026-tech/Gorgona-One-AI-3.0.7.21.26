import { savedTree } from './savedCopy.js';

// English source for owned offers UI; all target copy lives in i18n/locales.
export const DEALS_COPY = {
  en: {
    requestTable: 'Request a table',
    tablePrompt: 'Please request a table at {name}. Date, time and group size: ',
    storesEyebrow: 'Deals · Brands: {n} · Categories: {c}',
    storesTitle: 'Codes and offers from brands you already shop.',
    storesLede: 'Fashion, beauty, tech, home, travel and more. Show a code and it is copied for you; offers without a code open the store directly.',
    browse: 'Browse by category',
    featured: 'Featured stores',
    offers: 'Offers: {n}',
    empty: 'No offers in this category yet.',
    bettingTitle: 'Sportsbook offers have their own section.',
    bettingText: 'Welcome offers from ten operators, with the legal notice and where each one is licensed.',
    bettingCta: 'Open sportsbooks',
    couponsEyebrow: 'Coupons',
    couponsTitle: 'Delivery and streaming codes.',
    couponsLede: 'Uber Eats, DoorDash and Disney+, and a search across every brand, yacht and villa on Miami Elio.',
    dealLede: '{offer} at {name}.'
  }
};

export function getDealsCopy(locale) {
  return savedTree('deals', DEALS_COPY.en, locale);
}
