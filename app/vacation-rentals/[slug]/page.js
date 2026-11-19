import { permanentRedirect } from 'next/navigation';

// Old index entries and bookmarks of the retired sample villas all lead to
// the live Stay22 search on the stays page.
export default function RetiredStayPage() {
  permanentRedirect('/vacation-rentals');
}
