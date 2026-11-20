import ExperiencesContent from '../experiences/ExperiencesContent';
import { pageMetadata, withBrand } from '../../lib/seo.mjs';

// Same Headout and Viator catalogue as /experiences, luxury first.
export const metadata = pageMetadata({
  title: 'Exclusive Luxury Destinations & VIP Travel',
  fullTitle: withBrand('Exclusive Luxury Destinations & VIP Travel'),
  description: 'Explore curated luxury destinations, private getaways and bespoke itineraries from the Miami Elio concierge. Plan and book your next trip seamlessly.',
  path: '/exclusive-destinations',
  image: '/images/experiences/miami-coast.webp'
});

export default function ExclusiveDestinationsPage() {
  return <ExperiencesContent exclusive />;
}
