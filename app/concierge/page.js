import { redirect } from 'next/navigation';

// The AI Concierge experience moved to /discovery ("The Discovery Room").
// This route stays as a redirect so any existing links/bookmarks to
// /concierge keep working.
export default function ConciergeRedirect() {
  redirect('/discovery');
}
