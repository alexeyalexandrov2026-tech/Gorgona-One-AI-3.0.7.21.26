import YachtContent from './YachtContent';

export const metadata = {
  title: 'Miami Yacht Charters & Luxury Boat Rentals | Miami Elio',
  description: 'Charter luxury yachts in Miami with captain and crew. Compare fleet options, hourly rates, and VIP packages with instant concierge support on Miami Elio.'
};

export const dynamic='force-dynamic';
export default function YachtsPage(){
 return <YachtContent/>;
}
