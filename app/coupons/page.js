import { getCouponDeals } from '../../lib/storeDirectory';
import { getDealsCopy } from '../../lib/dealsCopy';
import { getServerTranslation } from '../../lib/serverLocale';
import { SearchBar } from '../components/SearchBar';
import { eyebrowClass, sectionY } from '../components/g1/ui';
import { DealGrid } from '../components/g1/DealsParts';

export const dynamic = 'force-dynamic';

// Stores is the main directory, so Coupons lists only the three brands that
// are not there (lib/storeDirectory.js), plus search across everything.
export default function CouponsPage() {
  const { t, locale } = getServerTranslation();
  const copy = getDealsCopy(locale);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <header className="grid gap-4 pb-8 pt-[clamp(24px,4vw,56px)]">
        <p className={eyebrowClass}>{copy.couponsEyebrow}</p>
        <h1 className="g1-display font-g1display text-[clamp(2.1rem,3vw+1rem,4rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [text-wrap:balance]">
          {copy.couponsTitle}
        </h1>
        <p className="max-w-[60ch] text-[1.08rem] text-g1-soft">{copy.couponsLede}</p>
      </header>

      <SearchBar />

      <section className={sectionY}>
        <DealGrid deals={getCouponDeals()} t={t} locale={locale} />
      </section>
    </main>
  );
}
