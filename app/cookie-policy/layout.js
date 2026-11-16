import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Cookie Policy',
  description: 'Which cookies and similar technologies MIAMI ELIO uses, why, and how to manage your choices.',
  path: '/cookie-policy'
});

export default function Layout({ children }) {
  return children;
}
