import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How MIAMI ELIO collects, uses and protects your personal information when you browse, book or chat with ELIO+ Guide.',
  path: '/privacy'
});

export default function Layout({ children }) {
  return children;
}
