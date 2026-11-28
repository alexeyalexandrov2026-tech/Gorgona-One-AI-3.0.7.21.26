import PrivateJetsContent from './PrivateJetsContent';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionFaqJsonLd, sectionJsonLd } from '../../lib/seo.mjs';

const title = 'Private Jet Charter Miami — On-Demand Flights | Miami Elio';
const description = 'Book private jet charters to and from Miami (OPF, MIA, FXE). Flexible aircraft options, transparent quotes, and 24/7 ELIO+ Guide coordination.';

// Sets canonical URL, OpenGraph image and Twitter card via pageMetadata.
export const metadata = pageMetadata({
  title: 'Private Jet Charter in Miami',
  fullTitle: title,
  description,
  path: '/private-jets'
});

export default function PrivateJetsPage() {
  return (
    <>
      <JsonLd data={[...sectionJsonLd({ name: 'Private Jet Charter in Miami', description, path: '/private-jets' }), sectionFaqJsonLd('privateJets')]} />
      <PrivateJetsContent />
    </>
  );
}
