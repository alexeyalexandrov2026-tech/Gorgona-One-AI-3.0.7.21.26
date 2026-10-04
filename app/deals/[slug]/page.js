import { notFound } from 'next/navigation';
import { getDealBySlug } from '../../../lib/dealsData';
import { isBettingCategory } from '../../../lib/storeDirectory';
import { getDealsCopy } from '../../../lib/dealsCopy';
import { getHomeCopy, fill, intlLocale } from '../../../lib/homeCopy';
import { getServerTranslation } from '../../../lib/serverLocale';
import DealTicket from '../../components/g1/DealTicket';
import GamblingNotice from '../../components/GamblingNotice';
import { Crumbs, Specs, eyebrowClass } from '../../components/g1/ui';
import { camelize } from '../../components/g1/DealsParts';

export const dynamic = 'force-dynamic';

export default function DealDetailPage({ params }) {
  const deal = getDealBySlug(params.slug);
  if (!deal) notFound();

  const { t, locale } = getServerTranslation();
  const copy = getDealsCopy(locale);
  const category = t.categories[camelize(deal.category)] || deal.category;
  const ends = deal.expirationDate
    ? new Intl.DateTimeFormat(intlLocale(locale), { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${deal.expirationDate}T12:00:00`))
    : '';

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <Crumbs items={[[t.nav.stores, '/stores'], [category, `/stores/${deal.category}`], [deal.name]]} />

      <div className="grid items-start gap-[clamp(24px,4vw,56px)] py-8 lg:grid-cols-2">
        <div className="grid min-w-0 gap-5">
          <p className={eyebrowClass}>{t.category.dealDetail}</p>
          <h1 className="g1-display font-g1display text-[clamp(2.1rem,3vw+1rem,4rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [text-wrap:balance]">
            {deal.name}
          </h1>
          <p className="max-w-[58ch] text-[1.08rem] text-g1-soft">{fill(copy.dealLede, { offer: deal.discount, name: deal.name })}</p>
          <Specs
            items={[
              [t.category.categoryLabel, category],
              [t.category.discountLabel, deal.discount],
              [t.kosher.promoCode, deal.promoCode || t.category.noCodeNeeded],
              [t.category.expirationLabel, ends]
            ]}
          />
        </div>
        <div className="grid gap-4">
          <DealTicket
            deal={deal}
            copy={getHomeCopy(locale)}
            categories={t.categories}
            endsLabel={ends}
            storeLabel={t.buttons.visitStore}
            mapLabel={t.kosher.viewOnMap}
          />
          {isBettingCategory(deal.category) && <GamblingNotice locale={locale} />}
        </div>
      </div>
    </main>
  );
}
