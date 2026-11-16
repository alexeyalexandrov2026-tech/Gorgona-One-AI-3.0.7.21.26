import HomePage from './HomePage';
import { buildHeroShowcase } from '../lib/heroShowcaseData.js';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const showcase = await buildHeroShowcase();
  return <HomePage showcase={showcase} />;
}
