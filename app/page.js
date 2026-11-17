import HomePage from './HomePage';
import JsonLd from './components/JsonLd';
import { buildHeroShowcase } from '../lib/heroShowcaseData.js';
import { organizationJsonLd, websiteJsonLd } from '../lib/seo.mjs';

export const metadata = {
  title: 'Miami Elio | Miami Travel & AI Concierge',
  description: 'Explore yacht charters, villa stays, car rentals, events and experiences in Miami. Plan your trip with the Miami Elio AI concierge.'
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  const showcase = await buildHeroShowcase();
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <HomePage showcase={showcase} />
    </>
  );
}
