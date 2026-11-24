import { permanentRedirect } from 'next/navigation';

// The ELIO+ Guide experience moved to /discovery ("The Discovery Room").
// This route stays as a permanent 308 redirect so any legacy links/bookmarks
// to /concierge transfer cleanly.
export default function ConciergeRedirect() {
  permanentRedirect('/discovery');
}
