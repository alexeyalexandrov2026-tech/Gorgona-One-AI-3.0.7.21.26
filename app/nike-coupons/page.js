
import { LocalizedText } from "../components/LocalizedText";
import { pageMetadata } from '../../lib/seo.mjs';

export const metadata = pageMetadata({
  title: 'Nike coupons and premium athlete essentials',
  description: 'Explore verified Nike offers, seasonal drops, and premium apparel discounts.',
  path: '/nike-coupons'
});
export default function NikeCouponsPage() {
  return (
    <main className="flex-1 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold"><LocalizedText source="SEO Page" /></p>
        <h1 className="mt-2 text-3xl font-semibold text-white"><LocalizedText source="Nike coupons and premium athlete essentials" /></h1>
        <p className="mt-4 text-zinc-400"><LocalizedText source="Explore verified Nike offers, seasonal drops, and premium apparel discounts." /></p>
      </div>
    </main>
  );
}
