import { permanentRedirect } from 'next/navigation';

// Old index entries and bookmarks all lead to the live YATR widget.
export default function RetiredYachtPage() {
  permanentRedirect('/yachts');
}
