import ExperiencesContent from '../experiences/ExperiencesContent';
import { pageMetadata } from '../../lib/seo.mjs';

// Same Headout and Viator catalogue as /experiences, luxury first.
export const metadata = pageMetadata({
  title: 'Exclusive Destinations',
  description: 'Private yachts, cruises, helicopter flights and hand-picked tours from Miami and beyond, booked through Headout and Viator.',
  path: '/exclusive-destinations',
  image: '/images/experiences/miami-coast.webp'
});

export default function ExclusiveDestinationsPage() {
  return <ExperiencesContent exclusive />;
}
