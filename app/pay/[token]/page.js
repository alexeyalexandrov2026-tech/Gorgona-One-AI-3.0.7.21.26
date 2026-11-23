import PayCheckoutClient from './PayCheckoutClient';

export const dynamic = 'force-dynamic';

export default async function PayTokenPage({ params }) {
  const resolved = await params;
  return <PayCheckoutClient token={resolved?.token || ''} />;
}
