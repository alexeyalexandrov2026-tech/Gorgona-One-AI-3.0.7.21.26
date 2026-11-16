import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'List your business in Miami',
  description: 'Partner with MIAMI ELIO to reach Miami visitors looking for yachts, cars, villas, dining and experiences.',
  path: '/partner'
});

export default function Layout({ children }) {
  return children;
}
