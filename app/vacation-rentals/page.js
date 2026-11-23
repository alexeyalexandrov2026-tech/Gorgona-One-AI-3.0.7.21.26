import StayContent from './StayContent';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Villas and vacation rentals in Miami',
  description: 'Search villas and vacation homes across Miami, with an AI concierge in your language.',
  path: '/vacation-rentals'
});

export default function VacationRentalsPage() {
  return (
    <>
      <JsonLd data={sectionJsonLd({ name: 'Villas and vacation rentals in Miami', description: metadata.description, path: '/vacation-rentals' })} />
      <StayContent />
    </>
  );
}
