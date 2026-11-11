import { getVacationRentals } from '../../lib/data/listings';
import StayContent from './StayContent';
import { getServerLocale } from '../../lib/serverLocale';
import { getWorldsCopy } from '../../lib/worldsCopy';
import { pageMetadata } from '../../lib/seo.mjs';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const copy = getWorldsCopy(await getServerLocale());
  return pageMetadata({ title: copy.stays.title, description: copy.stays.lede, path: '/vacation-rentals' });
}

export default async function VacationRentalsPage() {
  return <StayContent stays={await getVacationRentals({editorial:true})} />;
}
