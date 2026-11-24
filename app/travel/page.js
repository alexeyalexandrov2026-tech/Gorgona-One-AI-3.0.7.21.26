import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';
import TravelHubClient from './TravelHubClient';

export const metadata = pageMetadata({
  title: 'Travel, Flights, Hotels & Villas',
  fullTitle: 'Travel, Flights, Hotels & Villas | Miami Elio Travel',
  description: 'Book business-class flights with Ovago, private jets, 5-star Miami oceanfront hotels, and luxury waterfront villas in one Miami Elio travel hub.',
  path: '/travel',
  image: '/images/travel/hero-miami-dusk.webp'
});

export default function TravelLandingPage() {
  return (
    <>
      <JsonLd data={sectionJsonLd({ name: 'Travel, Flights, Hotels & Villas', description: metadata.description, path: '/travel' })} />
      <TravelHubClient />
    </>
  );
}
