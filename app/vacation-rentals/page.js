import { getVacationRentals } from '../../lib/data/listings';
import StayContent from './StayContent';

export const dynamic = 'force-dynamic';

export default async function VacationRentalsPage() {
  return <StayContent stays={await getVacationRentals({editorial:true})} />;
}
