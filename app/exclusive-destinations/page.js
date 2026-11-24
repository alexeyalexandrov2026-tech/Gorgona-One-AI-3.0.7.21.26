import ExperiencesContent from '../experiences/ExperiencesContent';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd, withBrand } from '../../lib/seo.mjs';

// Same Headout and Viator catalogue as /experiences, luxury first.
export const metadata = pageMetadata({
  title: 'Exclusive Luxury Destinations & VIP Travel',
  fullTitle: withBrand('Exclusive Luxury Destinations & VIP Travel'),
  description: 'Explore curated luxury destinations, private getaways and bespoke itineraries with the Miami Elio ELIO+ Guide. Plan and book your next trip seamlessly.',
  path: '/exclusive-destinations',
  image: '/images/experiences/miami-coast.webp'
});

export default function ExclusiveDestinationsPage() {
  return (
    <>
      <JsonLd data={sectionJsonLd({ name: 'Exclusive Luxury Destinations & VIP Travel', description: metadata.description, path: '/exclusive-destinations' })} />
      <ExperiencesContent exclusive />
    </>
  );
}
