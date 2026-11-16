import { PRIVATE_METADATA } from '../../lib/seo.mjs';

// Account and sign-in screens stay out of search results.
export const metadata = PRIVATE_METADATA;

export default function Layout({ children }) {
  return children;
}
