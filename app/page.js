import HomePage from './HomePage';
import JsonLd from './components/JsonLd';
import { buildHeroShowcase } from '../lib/heroShowcaseData.js';
import { organizationJsonLd, websiteJsonLd } from '../lib/seo.mjs';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Miami Elio | Official Website — Yachts, Villas, Cars & Events',
  description: 'Official Miami Elio website. Explore partner yacht charters, villas, car rentals, event tickets, experiences and AI concierge services in Miami.',
  alternates: { canonical: 'https://gorgona-one.com/' }
};


export default async function Page() {
  const showcase = await buildHeroShowcase();
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <HomePage showcase={showcase} />
    </>
  );
}
