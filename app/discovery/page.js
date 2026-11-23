import { ConciergeRoom } from '../components/ai/ConciergeRoom';
import JsonLd from '../components/JsonLd';
import { pageMetadata, sectionJsonLd } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'ELIO+ Guide — Discovery Room',
  description:
    'ELIO+ Guide — a 16-language AI guide for luxury yacht charters, exotic cars, villas, private jets, dining and live events in Miami.',
  path: '/discovery'
});

// The full-page concierge. The Header, Footer, AiDock and ecosystem
// navigation all link here, and /concierge redirects here, so this route
// carries the primary AI experience rather than a placeholder.
export default function DiscoveryPage() {
  return (
    <>
      <JsonLd data={sectionJsonLd({ name: 'Discovery Room', description: metadata.description, path: '/discovery' })} />
      <ConciergeRoom />
    </>
  );
}
