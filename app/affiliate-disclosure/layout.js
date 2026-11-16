import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Affiliate Disclosure',
  description: 'How MIAMI ELIO works with partner brands and may earn a commission when you book through our links.',
  path: '/affiliate-disclosure'
});

export default function Layout({ children }) {
  return children;
}
