import { savedTree } from './savedCopy.js';

export const YATR_REFERRAL_URL = 'https://yatr.co?ref=MIAMI-ELIO-GORGONA-ONE';

export const YATR_COPY = {
  en: {
    title: 'Yacht charters in Miami.',
    description: 'Explore the YATR fleet with photos, charter rates and filters. Choose your yacht and dates in the catalogue below.',
    catalogue: 'YATR yacht catalogue',
    open: 'Open YATR in a new tab',
    help: 'If the catalogue or booking does not open, continue on YATR.',
    disclosure: 'Bookings and payments are handled by YATR. Miami Elio may earn a commission from bookings through this catalogue.'
  }
};

export function getYatrCopy(locale) {
  return savedTree('yatr', YATR_COPY.en, locale);
}
