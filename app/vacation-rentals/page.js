import { getVacationRentals } from '../../lib/vacationRentalsData';
import StayContent from './StayContent';

export const dynamic = 'force-dynamic';

export default function VacationRentalsPage() {
  return <StayContent stays={getVacationRentals()} />;
}
