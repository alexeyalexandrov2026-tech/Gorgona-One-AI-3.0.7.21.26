import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Terms of Service',
  description: 'The terms that apply when you use MIAMI ELIO to browse and book yachts, cars, villas, events and experiences in Miami.',
  path: '/terms'
});

export default function Layout({ children }) {
  return children;
}
