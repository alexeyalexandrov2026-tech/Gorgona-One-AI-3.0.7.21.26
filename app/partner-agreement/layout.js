import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Partner Agreement',
  description: 'The agreement for businesses that list yachts, cars, villas, venues or experiences on MIAMI ELIO.',
  path: '/partner-agreement'
});

export default function Layout({ children }) {
  return children;
}
