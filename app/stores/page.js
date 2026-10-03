import { categories } from '../../lib/dealsData';
import { getStoreDeals } from '../../lib/storeDirectory';
import { BRAND_COUNT } from '../../lib/homeData';
import { getDealsCopy } from '../../lib/dealsCopy';
import { fill } from '../../lib/homeCopy';
import { getServerTranslation } from '../../lib/serverLocale';
import { WorldHero, SectionHead, sectionY } from '../components/g1/ui';
import { CategoryChips, DealGrid } from '../components/g1/DealsParts';

export const dynamic = 'force-dynamic';

export default function StoresPage() {
  const { t, locale } = getServerTranslation();
  const copy = getDealsCopy(locale);
  const deals = getStoreDeals();

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <WorldHero
        eyebrow={fill(copy.storesEyebrow, { n: BRAND_COUNT, c: categories.length })}
        title={copy.storesTitle}
        lede={copy.storesLede}
        img="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80"
        alt=""
      >
        <CategoryChips t={t} label={copy.browse} />
      </WorldHero>

      <section className={`border-t border-g1-rule ${sectionY}`}>
        <SectionHead title={copy.featured} sub={fill(copy.offers, { n: deals.length })} />
        <DealGrid deals={deals} t={t} locale={locale} />
      </section>
    </main>
  );
}
