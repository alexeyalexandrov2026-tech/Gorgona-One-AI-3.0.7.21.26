import StayContent from './StayContent';
import { pageMetadata } from '../../lib/seo.mjs';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Villas and vacation rentals in Miami',
  description: 'Search villas and vacation homes across Miami, with an AI concierge in your language.',
  path: '/vacation-rentals'
});

export default function VacationRentalsPage() {
  return <StayContent />;
}
