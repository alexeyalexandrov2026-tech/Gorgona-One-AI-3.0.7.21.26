import YachtContent from './YachtContent';
import JsonLd from '../components/JsonLd';
import { sectionJsonLd } from '../../lib/seo.mjs';

export const metadata = {
  title: 'Miami Yacht Charters & Luxury Boat Rentals | Miami Elio',
  description: 'Charter luxury yachts in Miami with captain and crew. Compare fleet options, hourly rates, and VIP packages with instant concierge support on Miami Elio.'
};

export default function YachtsPage(){
 return (
  <>
   <JsonLd data={sectionJsonLd({ name: 'Miami Yacht Charters', description: metadata.description, path: '/yachts' })} />
   <YachtContent/>
  </>
 );
}
