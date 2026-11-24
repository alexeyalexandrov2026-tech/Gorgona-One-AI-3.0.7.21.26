import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'SMS alerts',
  description: 'Opt in to receive booking confirmations, reservation updates, and customer service replies from Miami Elio (AAA Logistics LLC dba Miami Elio) at (833) 946-8811.',
  path: '/sms-alerts'
});

export default function Layout({ children }) {
  return children;
}
