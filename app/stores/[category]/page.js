import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories } from '../../../lib/dealsData';
import { getCategoryDeals, isBettingCategory } from '../../../lib/storeDirectory';
import { getDealsCopy } from '../../../lib/dealsCopy';
import { fill } from '../../../lib/homeCopy';
import { getServerTranslation } from '../../../lib/serverLocale';
import { Crumbs, btn, eyebrowClass, sectionY } from '../../components/g1/ui';
import { CategoryChips, DealGrid, categoryLabel, camelize } from '../../components/g1/DealsParts';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const category = categories.find((entry) => entry.slug === params.category);
  if (!category) {
    return { title: 'Category not found | GORGONA ONE' };
  }
  const { t } = getServerTranslation();
  return {
    title: `${categoryLabel(t, category)} ${t.category.dealsAndPromoCodes} | GORGONA ONE`,
    description: t.categoryDescriptions[camelize(category.slug)] || category.description
  };
}

export default function CategoryPage({ params }) {
  const category = categories.find((entry) => entry.slug === params.category);
  if (!category) notFound();

  const { t, locale } = getServerTranslation();
  const copy = getDealsCopy(locale);
  const label = categoryLabel(t, category);
  const deals = getCategoryDeals(category.slug);
  const betting = isBettingCategory(category.slug);

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <Crumbs items={[[t.nav.stores, '/stores'], [label]]} />

      <header className="grid gap-4 pb-8 pt-6">
        <p className={eyebrowClass}>{betting ? t.nav.stores : fill(copy.offers, { n: deals.length })}</p>
        <h1 className="g1-display font-g1display text-[clamp(2.1rem,3vw+1rem,4rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [text-wrap:balance]">
          {label}
        </h1>
        <p className="max-w-[60ch] text-[1.08rem] text-g1-soft">{t.categoryDescriptions[camelize(category.slug)] || category.description}</p>
        <CategoryChips t={t} current={category.slug} label={copy.browse} />
      </header>

      <section className={`border-t border-g1-rule ${sectionY}`}>
        {betting ? (
          <div className="grid max-w-2xl gap-4 rounded-[22px] border border-g1-rule bg-g1-card p-6">
            <h2 className="font-g1display text-[1.6rem] font-medium leading-tight text-g1-ink">{copy.bettingTitle}</h2>
            <p className="text-g1-soft">{copy.bettingText}</p>
            <Link href="/sportsbook" className={`${btn.base} ${btn.primary} w-fit`}>{copy.bettingCta}</Link>
          </div>
        ) : deals.length ? (
          <DealGrid deals={deals} t={t} locale={locale} />
        ) : (
          <p className="text-g1-soft">{copy.empty}</p>
        )}
      </section>
    </main>
  );
}
