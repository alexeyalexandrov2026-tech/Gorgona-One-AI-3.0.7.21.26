import { getVacationRentals } from '../../lib/data/listings';
import StayContent from './StayContent';
import { pageMetadata } from '../../lib/seo.mjs';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Villas and vacation rentals in Miami',
  description: 'Private villas and residences in Miami, with photos, rates and an AI concierge in your language.',
  path: '/vacation-rentals'
});

export default async function VacationRentalsPage() {
  return <StayContent stays={await getVacationRentals({editorial:true})} />;
}
