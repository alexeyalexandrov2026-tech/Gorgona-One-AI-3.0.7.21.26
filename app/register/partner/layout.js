import { pageMetadata } from '../../../lib/seo.mjs';

export const metadata = {
  ...pageMetadata({
    title: 'Become a Partner in Miami',
    description: 'Apply to list your Miami exotic car fleet, yacht charters, luxury villas, or dining venues on Miami Elio.',
    path: '/register/partner'
  }),
  robots: { index: true, follow: true }
};

export default function PartnerRegisterLayout({ children }) {
  return children;
}
