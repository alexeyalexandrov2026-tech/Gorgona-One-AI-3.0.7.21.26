import { ConciergeRoom } from '../components/ai/ConciergeRoom';
import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Discovery Room',
  description: 'The Discovery Room — an AI concierge for travel, dining, yachts, villas, cars, events and verified offers across the MIAMI ELIO ecosystem.',
  path: '/discovery'
});

// The full-page concierge. The Header, Footer, AiDock and ecosystem
// navigation all link here, and /concierge redirects here, so this route
// carries the primary AI experience rather than a placeholder.
export default function DiscoveryPage() {
  return <ConciergeRoom />;
}
