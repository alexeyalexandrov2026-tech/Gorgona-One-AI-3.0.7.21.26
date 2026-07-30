import { ConciergeRoom } from '../components/ai/ConciergeRoom';

export const metadata = {
  title: 'Discovery Room | GORGONA ONE',
  description:
    'The Discovery Room — an AI concierge for travel, dining, yachts, villas, cars, events and verified offers across the GORGONA ONE ecosystem.'
};

// The full-page concierge. The Header, Footer, AiDock and ecosystem
// navigation all link here, and /concierge redirects here, so this route
// carries the primary AI experience rather than a placeholder.
export default function DiscoveryPage() {
  return <ConciergeRoom />;
}
