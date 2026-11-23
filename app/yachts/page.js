import YachtContent from './YachtContent';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';

const fullTitle = 'Miami Yacht Charters & Luxury Boat Rentals | Miami Elio';
const description = 'Charter luxury yachts in Miami with captain and crew. Compare fleet options, hourly rates, and VIP packages with 24/7 ELIO+ Guide support on Miami Elio.';

export const metadata = pageMetadata({
  title: 'Miami Yacht Charters',
  fullTitle,
  description,
  path: '/yachts'
});

export default function YachtsPage() {
  return (
    <>
      <JsonLd data={sectionJsonLd({ name: 'Miami Yacht Charters', description, path: '/yachts' })} />
      <YachtContent />
    </>
  );
}
