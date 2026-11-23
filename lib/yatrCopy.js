import { savedTree } from './savedCopy.js';

export const YATR_REFERRAL_URL = 'https://yatr.co?ref=MIAMI-ELIO-GORGONA-ONE';

export const YATR_COPY = {
  en: {
    title: 'Yacht charters in Miami.',
    description: 'Explore the YATR fleet with photos, charter rates and filters. Choose your yacht and dates in the catalogue below.',
    catalogue: 'YATR yacht catalogue',
    open: 'Open YATR in a new tab',
    help: 'If the catalogue or booking does not open, continue on YATR.',
    disclosure: "Bookings and payments are handled by YATR.",
    shieldEyebrow: 'ELIO+ Shield & Care 24/7',
    shieldTitle: 'Verified charter coordination, direct partner rates.',
    shieldPillar1Title: '100% Fulfillment & Replacement Guarantee',
    shieldPillar1Body: 'Every confirmed charter arranged through Miami Elio carries verified availability and priority vessel replacement if an operator disruption occurs.',
    shieldPillar2Title: '24/7 Live Support After Confirmation',
    shieldPillar2Body: 'A dedicated 24/7 direct phone and chat line unlocks once your reservation is confirmed and stays active through disembarkation.',
    shieldPillar3Title: 'Transparent Direct Partner Rates',
    shieldPillar3Body: 'Published operator rates matched directly with licensed Miami captains and crews, with zero hidden platform markup.',
    shieldAskElio: 'Ask ELIO to match a yacht'
  }
};

export function getYatrCopy(locale) {
  return savedTree('yatr', YATR_COPY.en, locale);
}
