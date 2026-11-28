import HomePage from './HomePage';
import JsonLd from './components/JsonLd';
import { buildHeroShowcase } from '../lib/heroShowcaseData.js';
import { DEFAULT_IMAGE, mobileAppJsonLd, organizationJsonLd, sectionFaqJsonLd, websiteJsonLd } from '../lib/seo.mjs';

export const revalidate = 300;

const shareTitle = 'Miami Elio: Yachts, Villas, Exotic Cars, Events & ELIO+ Guide';
const shareDescription = 'Yachts, villas, cars, tickets and ELIO+ Guide in Miami.';

// A page's own openGraph and twitter replace the layout's whole object, so the
// site name, address and share image are repeated here.
export const metadata = {
  title: 'Miami Yachts, Villas, Car Rentals & Events | Miami Elio',
  description: 'Arrange luxury yacht charters, exotic cars, private villas, VIP event tickets and dining in Miami with our 16-language ELIO+ Guide on Miami Elio.',
  alternates: { canonical: 'https://gorgona-one.com/' },
  openGraph: { title: shareTitle, description: shareDescription, url: '/', siteName: 'MIAMI ELIO', images: [DEFAULT_IMAGE], type: 'website' },
  twitter: { card: 'summary_large_image', title: shareTitle, description: shareDescription, images: [DEFAULT_IMAGE.url] }
};


export default async function Page() {
  const showcase = await buildHeroShowcase();
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <JsonLd data={[mobileAppJsonLd(), sectionFaqJsonLd('home')]} />
      <HomePage showcase={showcase} />
    </>
  );
}
